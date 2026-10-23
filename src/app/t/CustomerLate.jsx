'use client'

import { useState } from 'react'
import { useTrade } from '@/components/TradeProvider'
import { writeOwn } from './own-answers'
import { timeOnly } from '@/lib/when'

/**
 * The customer running late themselves. Three buttons and a way back. The
 * trade's phone buzzes with "expect them from about 10:20"; the minutes stay
 * on this device and with the trade, never on a forwarded link.
 */
const CHOICES = [15, 30, 60]

export default function CustomerLate({ status, own, onSaved }) {
  const first = useTrade().name.split(' ')[0]
  const [busy, setBusy] = useState(null)
  const said = own?.customerLateMinutes || null
  const send = async (minutes) => {
    setBusy(minutes ?? 0)
    try {
      const r = await fetch(`/api/status/${status.code}/customer-late`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ minutes }) })
      const d = await r.json().catch(() => ({}))
      if (r.ok) onSaved?.({ customerLateAt: d.customerLateAt }, writeOwn(status.code, { customerLateMinutes: minutes }))
    } finally { setBusy(null) }
  }
  return (
    <div>
      <p className="text-[14px] leading-snug muted">
        Stuck in traffic, held up at work? Say roughly how long and {first}’s phone buzzes straight away, so nobody stands on a doorstep.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHOICES.map((m) => (
          <button key={m} type="button" onClick={() => send(m)} disabled={busy !== null}
                  className={`btn !min-h-[44px] !px-4 !text-[15px] ${said === m ? 'text-white' : 'btn-grey'}`}
                  style={said === m ? { background: 'var(--tint)' } : undefined}>About {m} min</button>
        ))}
        {said && (
          <button type="button" onClick={() => send(null)} disabled={busy !== null} className="btn btn-tinted !min-h-[44px] !px-4 !text-[15px]">I’m there now</button>
        )}
      </div>
      {status.customerLateAt && said && <p className="mt-2 text-[13px] muted">Sent at {timeOnly(status.customerLateAt)}. {first} knows.</p>}
    </div>
  )
}
