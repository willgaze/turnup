'use client'

import { useState } from 'react'
import { useTrade } from '@/components/TradeProvider'
import { HouseIcon } from '@/components/icons'
import { useStatusFetch } from './status-fetch'

/**
 * "Sorry we missed you." The facts of the visit — at the door at 10:04,
 * knocked and called, waited until 10:14 — and three replies. No blame; the
 * charge only if the customer agreed one before the day, and then the figure
 * they agreed; and the photo stays with the trade — this page only says one
 * was taken.
 */
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const WORDS = { KNOCKED: 'knocked', CALLED: 'called', TEXTED: 'texted' }

export default function MissedYou({ status, onReplied }) {
  // The trade the page says is coming, which on /demo is an invented one
  // and must never fall back to the environment's name.
  const first = useTrade().name.split(' ')[0]
  const statusFetch = useStatusFetch()
  const n = status.noAccess
  const [busy, setBusy] = useState(false)
  if (!n || status.stage !== 'PAUSED') return null
  const kinds = [...new Set((n.attempts || []).map((a) => WORDS[a.kind]).filter(Boolean))]
  const tried = kinds.length ? kinds.join(kinds.length === 2 ? ' and ' : ', ').replace(/, ([^,]*)$/, ' and $1') : 'tried the door'
  const reply = async (choice) => {
    setBusy(true)
    try {
      const r = await statusFetch(`/api/status/${status.code}/no-access`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice }) })
      const d = await r.json().catch(() => ({}))
      if (r.ok) onReplied?.({ noAccess: { ...n, reply: d.reply, replyAt: d.replyAt } })
    } finally { setBusy(false) }
  }
  return (
    <section className="glass r-outer mt-3 p-4" style={{ '--tint': '#ff9500' }}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><HouseIcon size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">Sorry we missed you</p>
          <p className="mt-0.5 text-[14px] leading-snug muted">
            {first} was at the door at {hhmm(n.at)}, {tried}{n.leftAt ? `, and waited until ${hhmm(n.leftAt)}` : ''}. No one answered{n.photoTaken ? ' — a photo of the door was taken for the record' : ''}. {n.fee ? `As agreed when you booked, a visit with no one in and no notice is £${n.fee}. Say if something happened.` : 'Nothing is charged.'} When suits you?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[['HERE', 'I’m here now'], ['LATER', 'Later today'], ['REBOOK', 'Another day']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => reply(k)} disabled={busy}
                      className={`btn !min-h-[44px] !px-4 !text-[15px] ${n.reply === k ? 'text-white' : 'btn-grey'}`}
                      style={n.reply === k ? { background: 'var(--tint)' } : undefined}>{label}</button>
            ))}
          </div>
          {n.reply && <p className="mt-2 text-[13px] muted">Sent at {hhmm(n.replyAt)}. {n.reply === 'HERE' ? `${first}’s phone has buzzed.` : `${first} will offer a new window here.`}</p>}
        </div>
      </div>
    </section>
  )
}
