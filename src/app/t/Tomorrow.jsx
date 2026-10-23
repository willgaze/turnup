'use client'

import { useEffect, useState } from 'react'
import { useTrade } from '@/components/TradeProvider'
import { CalendarIcon } from '@/components/icons'
import { windowHours } from '@/lib/window'
import { dayOnly, timeOnly } from '@/lib/when'
import { dayWord } from '@/lib/nudge-words'
import { writeOwn } from './own-answers'

/**
 * The day before: "Tomorrow, between 10 and 12. Still fine?" and three
 * replies. Shown from the moment the afternoon-before ask went
 * (presenceAskedAt, src/lib/day-before.js) until the window starts; after
 * that "Are you still coming?" takes over. Still fine and someone else also
 * answer "will someone be in?", so one tap does both jobs. A reply is a message to
 * the trade, not a change to the booking: "Need to move it" asks, and the
 * new hours are agreed under When suits you? like any other window.
 */
const REPLIES = [['OK', 'Still fine'], ['SOMEONE_ELSE', 'Someone else will be in'], ['MOVE', 'Need to move it']]

export default function Tomorrow({ status, onReplied }) {
  const first = useTrade().name.split(' ')[0]
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const start = status.window?.start || status.scheduledFor
  if (!status.presenceAskedAt || status.stage !== 'BOOKED' || !start || now >= new Date(start).getTime()) return null
  const when = dayWord(start, new Date(now))
  // Only an AGREED window is stated as a fact. A proposal still on the table
  // is for When suits you? below, not for this card to read out.
  const win = status.window || {}
  const hours = win.state === 'AGREED' ? windowHours(win) : null
  const reply = async (choice) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/status/${status.code}/reminder`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice }) })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        // The presence answer this tap implied is remembered on this device,
        // like any answer from the Will someone be in? row.
        const presence = choice === 'OK' ? 'IN' : choice === 'SOMEONE_ELSE' ? 'SOMEONE_ELSE' : null
        const mine = presence ? writeOwn(status.code, { presence }) : null
        onReplied?.({ reminderReply: d.reminderReply, reminderReplyAt: d.reminderReplyAt, ...(presence ? { presenceAt: d.reminderReplyAt } : {}) }, mine)
      }
    } finally { setBusy(false) }
  }
  const sent = status.reminderReply
  return (
    <section className="glass r-outer mt-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><CalendarIcon size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">
            {first} is coming {when}{when.startsWith('on ') ? `, ${dayOnly(start)}` : ''}
          </p>
          <p className="mt-0.5 text-[14px] leading-snug muted">
            {hours ? `${hours}, as agreed. ` : ''}Still fine? One tap tells {first}, and saves a wasted trip either way.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REPLIES.map(([k, label]) => (
              <button key={k} type="button" onClick={() => reply(k)} disabled={busy}
                      className={`btn !min-h-[44px] !px-4 !text-[15px] ${sent === k ? 'text-white' : 'btn-grey'}`}
                      style={sent === k ? { background: 'var(--tint)' } : undefined}>{label}</button>
            ))}
          </div>
          {sent && (
            <p className="mt-2 text-[13px] muted">
              Sent at {timeOnly(status.reminderReplyAt)}.{' '}
              {sent === 'OK' ? `${first} knows.` : sent === 'SOMEONE_ELSE' ? `${first} will look out for them. Add their name under Help them find you if it helps.` : `${first}’s phone has buzzed. Say what suits under When suits you? and the new hours get agreed there.`}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
