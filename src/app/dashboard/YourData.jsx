'use client'

import { useState } from 'react'
import { KeyIcon, ChevronIcon, TickIcon } from '@/components/icons'
import { TRADE_NAME } from '@/lib/trade'
import { confirmMatches, EXPORT_HOLDS, EXPORT_LEAVES_OUT, DELETE_REMOVES, DELETE_KEEPS } from '@/lib/your-data'

/**
 * Your data: download everything, or delete the account.
 *
 * The lists come from src/lib/your-data.js, the same ones /privacy and
 * /processor print, so the panel cannot promise more than the code does. The
 * delete is guarded by the business name, typed, and the route checks it
 * again rather than trusting this screen. It ends with counts from the
 * server: a demonstration, not a sentence (CLAUDE.md, push setup).
 */
export default function YourData() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')
  const ready = confirmMatches(typed, TRADE_NAME)

  const del = async () => {
    if (!ready || busy) return
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/dashboard/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: typed }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setError(j.fix || 'Could not delete. Nothing was removed that you can see; try again in a moment.')
      else { setDone(j); setTyped('') }
    } catch {
      setError('Could not reach the server. Check your signal and try again.')
    } finally { setBusy(false) }
  }

  return (
    <section className="glass r-outer mt-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className="flex min-h-[64px] w-full items-center gap-4 px-6 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center r-inner"
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 13%, transparent)' }}>
          <KeyIcon size={21} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Your data</span>
          <span className="block text-[14px] muted">Download everything, or delete the account</span>
        </span>
        <ChevronIcon size={18} style={{ color: 'var(--label-3)' }}
                     className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="space-y-6 border-t hairline px-6 py-6">
          <div>
            <h3 className="text-[15px] font-semibold">Download everything</h3>
            <p className="mt-0.5 text-[14px] muted">One JSON file, now. Keep it before you delete anything.</p>
            <a href="/api/dashboard/data" download className="btn accent-fill mt-3 w-full">Download as JSON</a>
            <details className="mt-3 text-[14px]">
              <summary className="cursor-pointer muted">What is in it</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">{EXPORT_HOLDS.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="mt-3 muted">Left out on purpose, because they are keys, not information:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 muted">{EXPORT_LEAVES_OUT.map((x) => <li key={x}>{x}</li>)}</ul>
            </details>
          </div>

          <div className="border-t hairline pt-6">
            <h3 className="text-[15px] font-semibold" style={{ color: '#ff3b30' }}>Delete account</h3>
            <p className="mt-0.5 text-[14px] muted">Cannot be undone. Happens straight away.</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="r-inner px-4 py-3" style={{ background: 'color-mix(in srgb, #ff3b30 8%, transparent)' }}>
                <p className="text-[13px] font-semibold uppercase tracking-wide">Goes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-snug">{DELETE_REMOVES.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div className="r-inner px-4 py-3" style={{ background: 'rgb(var(--glass-line) / 0.07)' }}>
                <p className="text-[13px] font-semibold uppercase tracking-wide">Stays</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] leading-snug muted">{DELETE_KEEPS.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-[14px]">Type <strong>{TRADE_NAME}</strong> to confirm</span>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="off"
                     spellCheck={false} className="field mt-1.5" placeholder={TRADE_NAME} />
            </label>
            <button type="button" onClick={del} disabled={!ready || busy}
                    className={`btn mt-3 w-full ${ready ? 'btn-danger' : 'btn-grey'}`} aria-disabled={!ready || busy}>
              {busy ? 'Deleting…' : 'Delete account for good'}
            </button>
            {error && <p className="mt-2 text-[14px]" style={{ color: '#ff3b30' }}>{error}</p>}
            {done && (
              <p className="mt-3 flex items-start gap-2 text-[14px] text-stage-done">
                <TickIcon size={18} className="mt-0.5 shrink-0" />
                <span>Deleted: {done.jobs} job{done.jobs === 1 ? '' : 's'}, {done.phones} phone{done.phones === 1 ? '' : 's'}, {done.cardRows} household row{done.cardRows === 1 ? '' : 's'}{done.profile ? ', your profile' : ''}{done.servicem8 ? ', the ServiceM8 link' : ''}. Every link is off.</span>
              </p>
            )}
          </div>

          <p className="text-[13px] muted">
            How long things are kept without you doing anything, and who else touches them: <a href="/privacy" style={{ color: 'var(--tint)' }}>privacy</a>, <a href="/processor" style={{ color: 'var(--tint)' }}>data processing terms</a>, <a href="/terms-for-trades" style={{ color: 'var(--tint)' }}>trade terms</a>.
          </p>
        </div>
      )}
    </section>
  )
}
