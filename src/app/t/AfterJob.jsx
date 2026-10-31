'use client'

import { useState } from 'react'
import { useTrade } from '@/components/TradeProvider'
import { TickIcon, MessageIcon } from '@/components/icons'
import { timeOnly } from '@/lib/when'
import { useStatusFetch } from './status-fetch'

/**
 * After Job done: how did it go? Two doors, both always open: a Google review,
 * or a note to the trade. Nobody is steered by how happy they seem; a
 * one-person firm's reviews are worth having only if they are real.
 */

export default function AfterJob({ status, reviewUrl, onSaved }) {
  // The trade the page says is coming, which on /demo is an invented one
  // and must never fall back to the environment's name.
  const first = useTrade().name.split(' ')[0]
  const statusFetch = useStatusFetch()
  const [note, setNote] = useState('')
  const [writing, setWriting] = useState(false)
  const [busy, setBusy] = useState(false)
  if (status.stage !== 'DONE') return null
  const post = async (payload) => {
    setBusy(true)
    try {
      const r = await statusFetch(`/api/status/${status.code}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await r.json().catch(() => ({}))
      if (r.ok) onSaved?.(d)
      return r.ok
    } finally { setBusy(false) }
  }
  const tappedGoogle = () => { post({ action: 'google' }) } // the link opens regardless; this just records it
  const sendNote = async () => { if (note.trim() && await post({ action: 'feedback', text: note.trim() })) { setNote(''); setWriting(false) } }
  return (
    <section className="glass r-outer mt-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><TickIcon size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold">How did it go?</p>
          <p className="mt-0.5 text-[14px] leading-snug muted">
            {reviewUrl ? `A review helps ${first} most. A note reaches ${first} alone.` : `A note reaches ${first} alone. Nobody else reads it.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noreferrer noopener" onClick={tappedGoogle}
                 className="btn !min-h-[44px] !px-4 !text-[15px] text-white" style={{ background: 'var(--tint)' }}>
                {status.reviewClickedAt ? 'Leave a Google review again' : 'Leave a Google review'}
              </a>
            )}
            <button type="button" onClick={() => setWriting((w) => !w)} className="btn btn-grey !min-h-[44px] !px-4 !text-[15px]"><MessageIcon size={16} /> Tell {first} something</button>
          </div>
          {status.reviewClickedAt && <p className="mt-2 text-[13px] muted">Thank you. It means a great deal to a one-person firm.</p>}
          {writing && (
            <div className="mt-3">
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 600))} rows={3} placeholder={`Anything at all — ${first} reads every one.`}
                        className="field w-full !mt-0" />
              <button type="button" onClick={sendNote} disabled={busy || !note.trim()} className="btn btn-tinted mt-2 !min-h-[44px] !px-4 !text-[15px]">{busy ? 'Sending…' : `Send to ${first}`}</button>
            </div>
          )}
          {status.feedbackAt && !writing && <p className="mt-2 text-[13px] muted">Your note reached {first} at {timeOnly(status.feedbackAt)}.</p>}
        </div>
      </div>
    </section>
  )
}
