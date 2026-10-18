'use client'

import { useEffect, useState } from 'react'
import { timeOnly } from '@/lib/when'
import { TRADE_NAME } from '@/lib/trade'
import { BellIcon } from '@/components/icons'

/**
 * "Are you still coming?"
 *
 * Shown only when a time the trade gave has arrived and the card has not
 * moved: the window has started and it still says Booked in, or the window
 * has ended and nobody is On site. One button. It buzzes the trade's phone,
 * and the answer — On my way, or "about 30 minutes late" — appears here with
 * the time it was given. Nothing on this page invents a time; it only
 * notices that one has passed.
 */
const first = TRADE_NAME.split(' ')[0]

export default function StillComing({ status, onAsked }) {
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  // Every hook above the first `return null`. This one sat below them until
  // v1.66.0, so the render that crossed the window's start called one hook
  // more than the render before it, React threw #310, and the customer's
  // page went to "Application error" at the one moment it exists for.
  const [choosing, setChoosing] = useState(false)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  // Real hours only: a day with no hours is not a window, and "the window
  // started at 00:00" is a time nobody gave. publicWindow() already withholds
  // hours the customer proposed and the trade has not agreed.
  const start = status.window?.start || null
  if (!start || status.stage === 'DONE') return null
  const end = status.window?.end || null
  const startPassed = now >= new Date(start).getTime()
  const endPassed = end && now >= new Date(end).getTime()
  const due = (status.stage === 'BOOKED' && startPassed) || (status.stage === 'ON_MY_WAY' && endPassed)
  const open = status.askedAt && !status.askAnsweredAt
  const late = status.lateMinutes && status.lateAt
  const missed = status.missedAt && !['ON_SITE', 'PAUSED'].includes(status.stage)
  if (!due && !open && !late && !missed) return null

  const askAgainOk = !open && (!status.askedAt || now - new Date(status.askedAt).getTime() > 10 * 60_000)

  const choose = async (choice) => {
    setChoosing(true)
    try {
      const r = await fetch(`/api/status/${status.code}/missed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice }) })
      const d = await r.json().catch(() => ({}))
      if (r.ok) onAsked?.({ missedChoice: d.missedChoice, missedChoiceAt: d.missedChoiceAt })
    } finally { setChoosing(false) }
  }

  const askNow = async () => {
    setBusy(true)
    try {
      const r = await fetch(`/api/status/${status.code}/ask`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (r.ok) onAsked?.({ askedAt: d.askedAt, askAnsweredAt: null })
    } finally { setBusy(false) }
  }

  return (
    <section className="glass r-outer mt-3 p-4" style={{ '--tint': '#ff9500' }}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><BellIcon size={19} /></span>
        <div className="min-w-0 flex-1">
          {missed ? (
            <>
              <p className="text-[16px] font-semibold">Sorry — the window ended at {timeOnly(end || start)} and {first} has not arrived</p>
              {late && new Date(status.lateAt) > new Date(status.missedAt)
                ? <p className="mt-0.5 text-[14px] muted">{first} says about {status.lateMinutes} minutes late, said at {timeOnly(status.lateAt)}.</p>
                : <p className="mt-0.5 text-[14px] muted">That is on us, not you. What would suit you? {first}’s phone gets your answer straight away.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {[['WAIT', 'I’ll wait'], ['LATER', 'Later today'], ['REBOOK', 'Another day']].map(([k, label]) => (
                  <button key={k} type="button" onClick={() => choose(k)} disabled={choosing}
                          className={`btn !min-h-[44px] !px-4 !text-[15px] ${status.missedChoice === k ? 'text-white' : 'btn-grey'}`}
                          style={status.missedChoice === k ? { background: 'var(--tint)' } : undefined}>
                    {label}
                  </button>
                ))}
              </div>
              {status.missedChoice && <p className="mt-2 text-[13px] muted">Sent at {timeOnly(status.missedChoiceAt)}. {status.missedChoice === 'WAIT' ? `${first} knows you are waiting.` : `${first} will offer a new window here.`}</p>}
            </>
          ) : late ? (
            <>
              <p className="text-[16px] font-semibold">{first} says: running about {status.lateMinutes} minutes late</p>
              <p className="mt-0.5 text-[14px] muted">Said at {timeOnly(status.lateAt)}. Sorry about that.</p>
            </>
          ) : open ? (
            <>
              <p className="text-[16px] font-semibold">You asked at {timeOnly(status.askedAt)}</p>
              <p className="mt-0.5 text-[14px] muted">{first}’s phone has buzzed. The answer shows here the moment it is given.</p>
            </>
          ) : (
            <>
              <p className="text-[16px] font-semibold">{status.stage === 'BOOKED' ? `The window started at ${timeOnly(start)}` : `The window ended at ${timeOnly(end)}`} and nothing has moved yet</p>
              <p className="mt-0.5 text-[14px] muted">Ask, and {first}’s phone buzzes. You get an answer here, not a guess.</p>
            </>
          )}
          {!missed && askAgainOk && (
            <button type="button" onClick={askNow} disabled={busy}
                    className="btn mt-3 !min-h-[44px] !px-4 !text-[15px] text-white disabled:opacity-60" style={{ background: 'var(--tint)' }}>
              {busy ? 'Asking…' : late ? 'Ask again: still coming?' : 'Are you still coming?'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
