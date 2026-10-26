'use client'

import { useEffect, useRef, useState } from 'react'
import { queueFetch } from './offline-queue'
import { HouseIcon } from '@/components/icons'

/**
 * Customer not home, in one tap — then a few more while you stand there.
 *
 * Tap "No one home" and the clock starts: the phone's time, a location fix
 * if the browser allows one, and a running wait. Log what you try as you try
 * it — knocked, called, texted — take a photo of the door if you want the
 * evidence, and when you leave, tap once more. The card goes to Paused with
 * a plain note, the customer's page says sorry we missed you with the facts
 * and three replies, and their phone buzzes. Nothing is taken from here; a
 * charge is only stated if they agreed one before the day.
 *
 * The photo is shrunk in the browser to about a thousand pixels wide before
 * it is sent, so a 4 MB phone photo becomes a hundred kilobytes of evidence.
 */
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

async function shrink(file, max = 1024, quality = 0.72) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', quality)
}

export default function NoAccess({ tracker, onDone, children }) {
  const [open, setOpen] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [fix, setFix] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [photo, setPhoto] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  useEffect(() => { if (!startedAt) return; const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t) }, [startedAt])

  const start = () => {
    const at = new Date().toISOString()
    setStartedAt(at); setOpen(true); setErr('')
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (p) => setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => setFix({ denied: true }), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 })
  }
  const tried = (kind) => setAttempts((a) => [...a, { kind, at: new Date().toISOString() }])
  const onPhoto = async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await shrink(f)) }

  const leave = async () => {
    setBusy(true); setErr('')
    try {
      const r = await queueFetch(`/api/dashboard/trackers/${tracker.id}/no-access`, { method: 'POST',
        body: { startedAt, deviceStartedAt: startedAt, attempts, photo, lat: fix?.lat, lng: fix?.lng, accuracy: fix?.accuracy } })
      // No signal at the door is the normal case for this button. The record
      // is saved on the phone with the time you left and goes when signal
      // comes back; the card says so until it has.
      if (!r.queued && !r.ok) throw new Error(r.status === 413 ? 'That photo is too large. Try again without it.' : 'That did not save. Try again.')
      setOpen(false); setStartedAt(null); setAttempts([]); setPhoto(null); setFix(null)
      onDone?.()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const last = tracker.noAccess?.[0]
  const waited = startedAt ? Math.max(0, Math.round((now - new Date(startedAt)) / 60_000)) : 0
  const REPLY = { HERE: 'is there now', LATER: 'would like it later today — set new hours below', REBOOK: 'would like another day — set new hours for that day below' }

  if (!open) {
    return (
      <div className="mt-3.5">
        {last && tracker.stage === 'PAUSED' && (
          <div className="mb-2 rounded-2xl px-4 py-3 text-[14px]" style={{ background: 'color-mix(in srgb, #ff9500 12%, transparent)' }}>
            <p className="font-semibold">No one home at {hhmm(last.startedAt)}{last.leftAt ? `, left ${hhmm(last.leftAt)}` : ''}</p>
            <p className="mt-0.5 muted">{(last.attempts || []).length ? (last.attempts || []).map((a) => `${a.kind.toLowerCase()} ${hhmm(a.at)}`).join(' · ') : 'nothing logged'}{last.photoAt ? ' · door photo' : ''}{last.lat ? ` · fix ±${Math.round(last.accuracy || 0)} m` : ' · no fix'}</p>
            {last.photoAt && <a href={`/api/dashboard/no-access/${last.id}/photo`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[13px] underline">Open the door photo</a>}
            {last.reply && <p className="mt-1 font-semibold">{(tracker.customerName || 'The customer').split(' ')[0]} {REPLY[last.reply]} · {hhmm(last.replyAt)}</p>}
          </div>
        )}
        {/* Both of these are a record of something that happened rather than
            a step in the job, and both are one tap from the row for the same
            reason: a record you have to go and find is a record nobody keeps.
            They share a line so the open page does not grow by one more
            button's height per job. */}
        <div className="flex flex-wrap gap-2">
          {['ON_MY_WAY', 'ON_SITE', 'BOOKED'].includes(tracker.stage) && (
            <button type="button" onClick={start} className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]"><HouseIcon size={16} /> No one home</button>
          )}
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3.5 rounded-2xl px-4 py-3.5" style={{ background: 'color-mix(in srgb, #ff9500 12%, transparent)' }}>
      <p className="text-[15px] font-semibold">At the door since {hhmm(startedAt)} · {waited} min</p>
      <p className="mt-0.5 text-[13px] muted">{fix?.lat ? `Location fixed to about ${Math.round(fix.accuracy)} m` : fix?.denied ? 'No location — the time still counts' : 'Getting a location fix…'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[['KNOCKED', 'Knocked'], ['CALLED', 'Called'], ['TEXTED', 'Texted']].map(([k, label]) => {
          const n = attempts.filter((a) => a.kind === k).length
          return <button key={k} type="button" onClick={() => tried(k)} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">{label}{n ? ` · ${n}` : ''}</button>
        })}
        <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">{photo ? 'Door photo added' : 'Photo of the door'}</button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
      </div>
      {attempts.length > 0 && <p className="mt-2 text-[12px] muted">{attempts.map((a) => `${a.kind.toLowerCase()} ${hhmm(a.at)}`).join(' · ')}</p>}
      {err && <p className="mt-2 text-[13px] text-red-600">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={leave} disabled={busy} className="btn accent-fill !min-h-[44px] !px-4 !text-[14px]">{busy ? '…' : 'Leave and tell them'}</button>
        <button type="button" onClick={() => { setOpen(false); setStartedAt(null); setAttempts([]); setPhoto(null) }} disabled={busy} className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">They answered</button>
      </div>
      <p className="mt-2 text-[12px] muted">Leaving sets the card to Paused with a plain note. Their page says sorry we missed you, with what you tried and when, and asks what suits. {tracker.termsAgreedAt && tracker.termsAgreed?.fee ? `They agreed a £${tracker.termsAgreed.fee} short-notice charge when they booked, so the note says so. Nothing is taken from here; that is yours to raise, with this record.` : 'Nothing is charged.'}</p>
    </div>
  )
}
