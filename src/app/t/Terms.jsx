'use client'

import { useState } from 'react'
import { useTrade } from '@/components/TradeProvider'
import { termsParagraphs } from '@/lib/terms'
import { dayAndTime } from '@/lib/when'
import { TickIcon } from '@/components/icons'

/**
 * Before the visit: three short paragraphs and one tap.
 *
 * What is shown is what gets recorded. Before the tap the words come from the
 * trade's current terms; after it, from the snapshot stored at the tap, so a
 * fee changed since the booking does not rewrite what this customer agreed.
 * The button is the express request the Consumer Contracts Regulations want
 * before work starts inside the 14 days, in words a person would use.
 */

export default function Terms({ status, terms, onAgreed }) {
  const fallback = useTrade().name.split(' ')[0]
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const agreed = Boolean(status.termsAgreedAt)
  const shown = agreed && status.termsAgreed ? status.termsAgreed : terms
  const first = shown?.first || terms?.first || fallback
  const paras = termsParagraphs(shown, first)

  const agree = async () => {
    setBusy(true); setFailed(false)
    try {
      const r = await fetch(`/api/status/${status.code}/terms`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.termsAgreedAt) onAgreed?.({ termsAgreedAt: d.termsAgreedAt, termsAgreed: d.termsAgreed || null })
      else setFailed(true)
    } catch { setFailed(true) } finally { setBusy(false) }
  }

  return (
    <div>
      <p className="text-[14px] leading-snug muted">
        {agreed
          ? `You read and agreed these at ${dayAndTime(status.termsAgreedAt)}. ${first} holds the same copy.`
          : `Three things worth knowing before ${first} comes, and one tap to say you have read them.`}
      </p>
      <dl className="mt-4 space-y-4">
        {paras.map((p) => (
          <div key={p.key}>
            <dt className="text-[15px] font-semibold">{p.head}</dt>
            <dd className="mt-1 text-[15px] leading-snug muted">{p.body}</dd>
          </div>
        ))}
      </dl>
      {agreed ? (
        <p className="r-inner mt-5 flex items-center gap-2.5 px-4 py-3 text-[15px] font-semibold"
           style={{ background: 'color-mix(in srgb, var(--tint) 11%, transparent)', color: 'var(--tint)' }}>
          <TickIcon size={18} /> Agreed · go ahead
        </p>
      ) : (
        <>
          <button type="button" onClick={agree} disabled={busy} className="btn btn-filled mt-5 w-full">
            {busy ? 'Saving…' : 'Got it, go ahead'}
          </button>
          <p className="mt-2.5 text-center text-[13px] muted">
            {failed ? 'That did not save. Try again in a moment, or just tell them when they ring.' : 'Recorded with the time, so neither of you has to remember.'}
          </p>
        </>
      )}
    </div>
  )
}
