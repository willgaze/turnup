'use client'

import { useEffect, useState } from 'react'
import { windowHours, windowRevisionLine } from '@/lib/window'
import { timeOnly } from '@/lib/when'
import { ClockIcon, TickIcon } from '@/components/icons'
import { readOwn, writeOwn } from './own-answers'
import { useStatusFetch } from './status-fetch'

/**
 * The customer's half of agreeing a window.
 *
 * A window has always been a two-way arrangement pretending to be a broadcast.
 * The trade says "between 9 and 11", the customer is on a call until half
 * eleven, and the first either of them hears about it is a missed doorbell.
 * Two taps settle it.
 *
 * Either end can open the conversation: a customer with a day booked and no
 * hours agreed can ask for some, rather than waiting to be told.
 *
 * What they ask for is theirs. It goes to the trade and to this device, never
 * onto the page — "I'm free between 2 and 4" says when a house is occupied,
 * and the link gets forwarded. So while the customer's own offer is on the
 * table the page says it is waiting, and only this phone can say what for.
 */

// A sensible span for "come between". Anything wider is not a window.
const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

export default function Window({ status, onSaved }) {
  const statusFetch = useStatusFetch()
  const win = status.window || {}
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('12:00')
  const [note, setNote] = useState('')
  const [mine, setMine] = useState(null)

  // What this device last asked for. The server will not say, on purpose.
  useEffect(() => {
    const own = readOwn(status.code)
    setMine(own.window || null)
    if (own.window?.start) setStart(own.window.start)
    if (own.window?.end) setEnd(own.window.end)
  }, [status.code])

  const send = async (action, payload = {}) => {
    setBusy(action)
    setError(null)
    try {
      const r = await statusFetch(`/api/status/${status.code}/window`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(
          body.error === 'end_before_start' ? 'The end needs to be after the start.'
            : body.error === 'window_too_long' ? 'That is most of a day — pick a narrower window.'
            : body.error === 'nothing_proposed' ? 'That time is no longer on the table. Pull down to refresh.'
            : 'That did not send. Try again in a moment.',
        )
      }
      const fresh = await r.json()
      const remembered = action === 'counter'
        ? writeOwn(status.code, { window: { start: payload.start, end: payload.end, note: payload.note } })
        : readOwn(status.code)
      setMine(remembered.window || null)
      setOpen(false)
      // Mirror exactly what the server will say on the next poll. Agreeing
      // keeps the trade's hours, because they are now agreed. Countering
      // CLEARS them: the offer on the table is the customer's now, and the
      // page is not allowed to show it — so leaving the old hours up would
      // read "Between 09:00 and 11:00 — waiting for them" when 09:00 is the
      // very thing they just turned down.
      onSaved?.({
        window: action === 'agree'
          ? { ...win, state: 'AGREED', at: fresh.at }
          : { state: 'PROPOSED', by: 'CUSTOMER', start: null, end: null, at: fresh.at },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const theirs = win.state === 'PROPOSED' && win.by === 'TRADE'
  const waiting = win.state === 'PROPOSED' && win.by === 'CUSTOMER'
  const agreed = win.state === 'AGREED'
  const hours = windowHours(win)

  const form = (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="block text-[13px] muted">
          From
          <select value={start} onChange={(e) => setStart(e.target.value)} className="field mt-1.5">
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label className="block text-[13px] muted">
          Until
          <select value={end} onChange={(e) => setEnd(e.target.value)} className="field mt-1.5">
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
             placeholder="On a call until 11" className="field mt-2.5" />
      <button type="button" disabled={busy === 'counter'}
              onClick={() => send('counter', { start, end, note })}
              className="btn btn-filled mt-2.5 w-full">
        {busy === 'counter' ? 'Sending…' : 'Send this to them'}
      </button>
    </div>
  )

  return (
    <div>
      {/* They have put a time forward. */}
      {theirs && (
        <>
          <p className="text-[17px] font-semibold">{hours}</p>
          <p className="mt-1 text-[15px] leading-snug muted">
            Does that suit? If not, say what does — they would rather know now than knock on an empty house.
          </p>
          {!open && (
            <div className="mt-4 grid gap-2.5">
              <button type="button" disabled={busy === 'agree'} onClick={() => send('agree')}
                      className="btn btn-filled w-full">
                <TickIcon size={18} /> {busy === 'agree' ? 'One moment…' : 'That suits'}
              </button>
              <button type="button" onClick={() => setOpen(true)} className="btn btn-grey w-full">
                Suggest another time
              </button>
            </div>
          )}
          {open && form}
        </>
      )}

      {/* The customer has asked for something and it is with the trade. */}
      {waiting && (
        <>
          <p className="text-[17px] font-semibold">
            {mine?.start ? `You asked for ${mine.start}–${mine.end || 'later'}` : 'You asked for a different time'}
          </p>
          {mine?.note && <p className="mt-1 text-[15px] muted">“{mine.note}”</p>}
          <p className="mt-2 text-[15px] leading-snug muted">
            They have it. Nothing is agreed until they come back to you, so the day stands as booked for now.
          </p>
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="btn btn-grey mt-4 w-full">
              Change what I asked for
            </button>
          ) : form}
        </>
      )}

      {/* Both of them said yes. */}
      {agreed && (
        <>
          <p className="text-[17px] font-semibold">{hours || 'Agreed'}</p>
          <p className="mt-1 text-[15px] leading-snug muted">
            Agreed between you. It is still a window rather than a promise — traffic is traffic — but they are
            planning around it.
          </p>
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="btn btn-grey mt-4 w-full">
              Something has changed
            </button>
          ) : form}
        </>
      )}

      {/* Nothing discussed yet, but there is a day. Either end can start. */}
      {!win.state && (
        <>
          <p className="text-[15px] leading-snug muted">
            No hours are set — they will come at some point on the day. If a part of the day is difficult, say so
            now and they will work round it if they can.
          </p>
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className="btn btn-tinted mt-4 w-full">
              <ClockIcon size={18} /> Ask for a time
            </button>
          ) : form}
        </>
      )}

      {/* A revised promise is shown as revised, and the original is kept.
          The customer is never told the new hours were always the hours. */}
      {windowRevisionLine(win, 'CUSTOMER') && (
        <p className="mt-3 text-[14px] font-medium" style={{ color: 'var(--stage-paused)' }}>
          {windowRevisionLine(win, 'CUSTOMER')}
        </p>
      )}

      {win.at && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--label-3)' }}>
          Last change {timeOnly(win.at)}.
        </p>
      )}

      {error && (
        <p className="r-inner mt-3 p-3 text-[14px]"
           style={{ background: 'color-mix(in srgb, #ff3b30 12%, transparent)', color: '#ff3b30' }}>
          {error}
        </p>
      )}
    </div>
  )
}
