import { NextResponse, after } from 'next/server'
import { runningLate, answeredByStage, stopAskReminders } from '@/lib/nudge'
import { pausedBack, pauseStampFor } from '@/lib/pause'
import { diaryFor } from '@/lib/sm8-oauth'
import { STAGES } from '@/lib/trade-status'
import { readTap, hhmmLondon } from '@/lib/tap'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { isValidStage } from '@/lib/trade-status'
import { dbReason } from '@/lib/db-errors'
import { cleanText } from '@/lib/clean-text'
import { notifyStage } from '@/lib/push'
import { pushPassUpdate } from '@/lib/pass-service'
import { syncTrackerToCards } from '@/lib/arrivals'
import { proposeWindow, agreeWindow, clearWindow, revisionFor, dayMoveFor, windowHours, lastShown } from '@/lib/window'
import { dayOnly } from '@/lib/when'
import { normaliseW3w, normaliseMapPin, normalisePhotoUrl } from '@/lib/places'

export const dynamic = 'force-dynamic'

// What the one-tap stage buttons hit, so it does the least possible work.
export async function PATCH(request, { params }) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  const { id } = await params
  try {
    const body = await request.json()
    const data = {}
    const current = await prisma.tradeStatus.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    // "About 30 minutes late": the trade's own estimate, written to the card
    // with the time it was said, pushed to the customer, and it answers an
    // open "are you still coming?". Null clears it.
    if (body.lateMinutes !== undefined) {
      const updated = await runningLate(current, body.lateMinutes === null ? null : Number(body.lateMinutes))
      return NextResponse.json({ tracker: updated })
    }

    // "Stop reminders": the trade has seen the question and is handling it
    // some other way. It quiets the buzzing and changes nothing the customer
    // can see — no stage, no note on their page, no claim that anyone has set
    // off. Deliberately its own verb rather than a stage tap, because the
    // only way to silence this used to be to move the card.
    if (body.stopAsk === true) {
      const updated = await stopAskReminders(current)
      return NextResponse.json({ tracker: updated })
    }

    // "Back in about an hour": the trade's own estimate of their return while
    // Paused, written with the time, pushed, on the record. Null clears it.
    if (body.pauseBack !== undefined) {
      const r = await pausedBack(current, body.pauseBack === null ? null : String(body.pauseBack))
      if (r.error) return NextResponse.json({ error: r.error }, { status: r.status })
      return NextResponse.json({ tracker: r.tracker })
    }

    if (body.stage !== undefined) {
      if (!isValidStage(body.stage)) return NextResponse.json({ error: 'bad_stage' }, { status: 400 })
      data.stage = body.stage
      Object.assign(data, answeredByStage(current))
      Object.assign(data, pauseStampFor(current, body.stage))
      // Setting off is the moment worth stamping: the one the customer is
      // waiting on, and a record of what happened rather than a promise.
      //
      // Only ever stamped on the way INTO On my way, and only cleared by going
      // back to Booked in. This used to read `: null` for every other stage,
      // which wiped the time the moment he arrived — so "Set off at 14:20"
      // vanished from the customer's page at exactly the point it became the
      // interesting part of the record.
      if (body.stage === 'ON_MY_WAY') data.arrivingAt = new Date()
      else if (body.stage === 'BOOKED') data.arrivingAt = null
    }

    for (const f of ['jobRef', 'customerName', 'customerPhone', 'jobAddress', 'jobSummary', 'stageNote']) {
      if (body[f] !== undefined) data[f] = cleanText(body[f])
    }
    // Finding the door. Photos are set from here, by the trade, on the first
    // visit — a URL for now, a camera button once there is somewhere to put
    // the file. The customer's public route deliberately cannot set these.
    if (body.housePhoto !== undefined) data.housePhoto = normalisePhotoUrl(body.housePhoto)
    if (body.doorPhoto !== undefined) data.doorPhoto = normalisePhotoUrl(body.doorPhoto)
    if (body.mapPin !== undefined) data.mapPin = normaliseMapPin(body.mapPin)
    if (body.what3words !== undefined) data.what3words = normaliseW3w(body.what3words)

    // A window is an arrangement now, not a field. Setting one is a PROPOSAL
    // the customer can agree to or counter; "windowAgree" takes their counter.
    // See the state machine in src/lib/window.js.
    //
    // A revised promise is shown as revised, with the original kept: every
    // write that publishes hours from the trade's side goes through
    // revisionFor(), and a change of published hours leaves a line in the
    // record. The customer's own counter does not come through here.
    const extraEvents = []
    const hoursNote = (from, to) => `Hours changed from ${windowHours(from) ? windowHours(from).toLowerCase() : 'none'} to ${windowHours(to) ? windowHours(to).toLowerCase() : 'none'}.`
    const standing = lastShown(current)
    const onTable = { start: current.windowStart, end: current.windowEnd }
    const revise = (next, by) => {
      const r = revisionFor(current, next, { by })
      Object.assign(data, r)
      if (r.windowRevisedAt) extraEvents.push({ stage: current.stage, note: hoursNote(standing, next) })
    }
    if (body.windowAgree) {
      if (current.windowState !== 'PROPOSED') return NextResponse.json({ error: 'nothing_proposed' }, { status: 409 })
      Object.assign(data, agreeWindow({ by: 'TRADE' }))
      // Agreeing the customer's counter publishes their hours; the change is
      // at their request and the line says so.
      revise(onTable, current.windowBy === 'CUSTOMER' ? 'CUSTOMER' : 'TRADE')
    } else if (body.windowClear) {
      Object.assign(data, clearWindow())
      revise({ start: null, end: null }, 'TRADE')
    } else if (body.windowStart !== undefined || body.windowEnd !== undefined) {
      const at = {}
      for (const f of ['windowStart', 'windowEnd']) {
        if (body[f] !== undefined) {
          const when = body[f] ? new Date(body[f]) : null
          if (when && Number.isNaN(when.getTime())) {
            return NextResponse.json({ error: 'bad_window' }, { status: 400 })
          }
          at[f] = when
        }
      }
      // Clearing the start clears the arrangement: there is nothing on the
      // table to agree to, and leaving a dangling end time would say there is.
      if (body.windowStart !== undefined && !at.windowStart) {
        Object.assign(data, clearWindow())
        revise({ start: null, end: null }, 'TRADE')
      } else {
        // Narrowing one end of a window that already exists keeps the other.
        const current = await prisma.tradeStatus.findUnique({
          where: { id },
          select: { windowStart: true, windowEnd: true },
        })
        const start = at.windowStart !== undefined ? at.windowStart : current?.windowStart ?? null
        const end = at.windowEnd !== undefined ? at.windowEnd : current?.windowEnd ?? null
        if (start && end && end <= start) {
          return NextResponse.json({ error: 'window_backwards' }, { status: 400 })
        }
        // Proposing again reopens it: a window the customer already agreed to
        // and the trade then moved is not still agreed.
        Object.assign(data, proposeWindow({ start, end, by: 'TRADE', note: null }))
        revise({ start, end }, 'TRADE')
      }
    }

    if (body.position !== undefined) {
      const n = Number(body.position)
      data.position = body.position === null || Number.isNaN(n) ? null : Math.max(1, Math.round(n))
    }

    if (body.scheduledFor !== undefined) {
      const when = body.scheduledFor ? new Date(body.scheduledFor) : null
      if (when && Number.isNaN(when.getTime())) {
        return NextResponse.json({ error: 'bad_scheduled_date' }, { status: 400 })
      }
      data.scheduledFor = when
      // The day moved: keep the day first booked and say so in the record.
      const moved = dayMoveFor(current, when)
      if (moved.scheduledMovedAt) {
        Object.assign(data, moved)
        extraEvents.push({ stage: current.stage, note: `Moved from ${dayOnly(current.scheduledFor)} to ${dayOnly(when)}.` })
      }
    }

    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
    }
    // A tap that was queued on the phone and sent later carries its own time.
    // The event keeps both clocks; "set off at" becomes the tap's time, which
    // is the true one, and the customer is told it arrived late.
    const tap = readTap(body)
    if (tap.tapId) {
      const seen = await prisma.tradeStatusEvent.findFirst({ where: { tapId: tap.tapId } }).catch(() => null)
      if (seen) return NextResponse.json({ tracker: current, duplicate: true })
    }
    if (data.stage) {
      data.events = { create: {
        stage: data.stage, note: data.stageNote ?? cleanText(body.stageNote),
        deviceAt: tap.deviceAt, offline: tap.offline, lat: tap.lat, lng: tap.lng, accuracy: tap.accuracy, fixValidated: tap.fixValidated, tapId: tap.tapId,
      } }
      if (data.stage === 'ON_MY_WAY' && tap.deviceAt) data.arrivingAt = tap.deviceAt
    }
    if (extraEvents.length) {
      data.events = { create: data.events ? [data.events.create, ...extraEvents] : extraEvents }
    }

    const tracker = await prisma.tradeStatus.update({ where: { id }, data })

    // A line in the ServiceM8 job diary for what the trade just did, when the
    // add-on is connected. Not awaited: the diary is a record, not a gate.
    if (data.stage && data.stage !== current.stage) {
      diaryFor(tracker, `${STAGES[data.stage]?.label || data.stage}${data.stageNote ? ` - ${data.stageNote}` : ''}${tap.offline && tap.deviceAt ? ` (tapped ${hhmmLondon(tap.deviceAt)} with no signal, sent ${hhmmLondon(new Date())})` : ''}`).catch(() => {})
    }

    // Tell any device watching this job that it moved.
    //
    // Deliberately not awaited, and deliberately swallowed. This runs on the
    // tap of a stage button on a driveway: the trade is waiting on this
    // response, and it must not be held up by a round trip to Apple's push
    // service — nor fail because that service is having a bad afternoon.
    // notifyStage() never throws, but the catch is here anyway, because the
    // thing that must survive is the stage change.
    //
    // after() rather than a bare promise: since v1.65.0 a set-off with no push
    // that lands goes on to fetch the customer's email from ServiceM8 and send
    // one, which is two more round trips than a serverless function is
    // promised once its response has gone. after() keeps it alive for them.
    if (data.stage) {
      after(() => notifyStage(tracker, data.stage).catch((error) =>
        console.error('push: notify failed after stage change:', error?.message),
      ))
    }

    // Any Apple Wallet holding this job's pass is told it changed, and asks
    // the web service for the new one (v1.70.2). On every save, not only a
    // stage change, because the back of the pass carries the note and the
    // set-off time. pushPassUpdate() never throws; a job nobody added to
    // Wallet costs one indexed query.
    after(() => pushPassUpdate(tracker.code))

    // Any household card carrying this job moves with it. Un-awaited and
    // swallowed for the same reason as the push above: the household card is a
    // nicety, the stage change on a driveway is not. A job on no card at all —
    // which is the normal case — costs one indexed query that updates nothing.
    syncTrackerToCards(tracker).catch((error) =>
      console.error('household card sync failed:', error?.message),
    )

    return NextResponse.json({ tracker })
  } catch (error) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    console.error('tracker update failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}

// Revoking a link deactivates it; the job history stays.
export async function DELETE(request, { params }) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  const { id } = await params
  try {
    await prisma.tradeStatus.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    console.error('tracker revoke failed:', error)
    return NextResponse.json({ error: dbReason(error) }, { status: 503 })
  }
}
