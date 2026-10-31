'use client'

import { useEffect, useState } from 'react'
import { PRESENCE, PRESENCE_ORDER, presenceOf, presenceIsFresh, presenceAgeLabel } from '@/lib/presence'
import { PresenceIcon } from '@/components/icons'
import { readOwn, writeOwn } from './own-answers'
import { useStatusFetch } from './status-fetch'

/**
 * The customer answering the one question that costs a wasted visit.
 *
 * Front and centre, not buried with the access notes, because it is worth
 * something only if it is answered before someone sets off — and it goes
 * stale in hours, so it asks again rather than showing Tuesday's answer on
 * Thursday.
 */
export default function Presence({ status, own, onSaved }) {
  const statusFetch = useStatusFetch()
  const [saving, setSaving] = useState(null)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  // What this device answered. The server no longer says — the answer is not
  // public, because "nobody is in" travels with a forwarded link. See
  // ./own-answers.js. On anyone else's phone these are simply empty, which is
  // the point.
  useEffect(() => { setNote(readOwn(status.code).presenceNote || '') }, [status.code])

  const current = presenceOf(own?.presence)
  const fresh = presenceIsFresh(status.presenceAt)

  const send = async (presence, presenceNote = note) => {
    setSaving(presence)
    try {
      const r = await statusFetch(`/api/status/${status.code}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Only the answer. The route leaves every field it is not sent
        // alone, so this cannot wipe what they told the trade about the gate.
        body: JSON.stringify({ presence, presenceNote }),
      })
      if (r.ok) {
        const { presenceAt } = await r.json()
        onSaved?.({ presenceAt }, writeOwn(status.code, { presence, presenceNote }))
        setShowNote(false)
      }
    } finally { setSaving(null) }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5">
        {PRESENCE_ORDER.map((k) => {
          const p = PRESENCE[k]
          const on = current?.key === k && fresh
          return (
            // Each answer wears its own tone once chosen, so a glance says
            // which one is set without reading it.
            <button key={k} type="button" onClick={() => send(k)} disabled={saving === k}
                    aria-pressed={on}
                    className={`tone-${p.tone} r-inner flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-3 text-[15px] font-semibold transition-colors disabled:opacity-60`}
                    style={on
                      ? { background: 'color-mix(in srgb, var(--tint) 14%, transparent)',
                          color: 'var(--tint)',
                          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--tint) 30%, transparent)' }
                      : { background: 'rgb(var(--glass-line) / 0.08)' }}>
              <PresenceIcon presence={k} size={21} />
              <span className="block leading-tight">{p.label}</span>
            </button>
          )
        })}
      </div>

      {current && fresh && (
        <p className="mt-3 text-[14px] muted">Told them {presenceAgeLabel(status.presenceAt)}.</p>
      )}
      {current && !fresh && (
        <p className="mt-3 text-[14px] muted">
          You said “{current.short}” {presenceAgeLabel(status.presenceAt)} — tap again if that has changed.
        </p>
      )}

      {!showNote ? (
        <button type="button" onClick={() => setShowNote(true)}
                className="mt-4 min-h-[44px] text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
          {note ? `“${note}” — change` : 'Add a detail'}
        </button>
      ) : (
        <div className="mt-4">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} autoFocus
                 placeholder="Bottom of the garden — ring twice"
                 className="field" />
          <button type="button" onClick={() => send(current?.key || 'IN', note)}
                  className="btn btn-filled mt-2.5 w-full">
            Send it
          </button>
        </div>
      )}
    </div>
  )
}
