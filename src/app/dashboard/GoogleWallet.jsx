'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The Android half of the wallet card: three values, pasted on the phone.
 *
 * They are NOT Vercel settings. Three rounds of "set these environment
 * variables" were asked for and never happened (CLAUDE.md rule 5), so this is
 * a paste from the Mac into a phone, sealed into a row, the way the ServiceM8
 * and Gmail panels already work.
 *
 * **Saving ends in a demonstration, not a claim.** The save makes the pass
 * class at Google, which is the first thing that uses all three values
 * together — so "saved" here means they actually work, not that they were
 * written down. That is the same rule as "Send a test to this phone".
 *
 * It never shows the key back, and never the whole issuer id.
 */
export default function GoogleWallet() {
  const [s, setS] = useState(null)
  const [form, setForm] = useState({ issuerId: '', serviceAccount: '', privateKey: '' })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(
    () => fetch('/api/dashboard/google-wallet', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => setS(null)),
    [],
  )
  useEffect(() => { load() }, [load])

  async function save() {
    setBusy(true); setNote('')
    try {
      const r = await fetch('/api/dashboard/google-wallet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setNote(j.says || 'That did not save.'); return }
      // The key is never kept in the page after it has gone.
      setForm({ issuerId: '', serviceAccount: '', privateKey: '' })
      setNote(j.classReady === false
        ? 'Saved, but Google would not make the pass class. The usual cause is the service account not being invited to the issuer account as a Developer.'
        : 'Saved, and Google accepted them: the pass class is there.')
      setS(j)
    } finally { setBusy(false) }
  }

  async function forget() {
    setBusy(true)
    try {
      await fetch('/api/dashboard/google-wallet', { method: 'DELETE' })
      setNote('Forgotten. Android customers get the link again.')
      await load()
    } finally { setBusy(false) }
  }

  if (!s) return null

  return (
    <section id="panel-googlewallet" className="glass r-outer mt-4 scroll-mt-4 p-5">
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">The card on Android</h2>
      <p className="mt-1 text-[14px] muted">
        Apple Wallet works. This is the same card for Android, and it needs three things from
        Google that only you can make.
      </p>

      {s.configured ? (
        <div className="r-inner mt-4 px-4 py-3.5 text-[14px]"
             style={{ background: 'color-mix(in srgb, var(--stage-done) 12%, transparent)' }}>
          <p className="font-semibold">Set up · issuer ending {s.issuerTail}</p>
          <p className="mt-1 muted">{s.serviceAccount}</p>
          <p className="mt-1 muted">
            {s.from === 'env'
              ? 'From the settings on the server, which win over anything pasted here.'
              : 'Android customers now see Save to Google Wallet on their page.'}
          </p>
          {s.from !== 'env' && (
            <button type="button" onClick={forget} disabled={busy}
                    className="mt-3 min-h-[42px] rounded-xl px-4 text-[14px] font-semibold"
                    style={{ background: 'rgb(var(--glass-line) / 0.12)' }}>
              Forget these
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mt-3 text-[14px] muted">
            The steps to get them are one paste into Cowork on the Mac:{' '}
            <a className="underline" target="_blank" rel="noreferrer"
               href="https://github.com/willgaze/turnup/blob/main/docs/cowork-google-wallet.md">
              docs/cowork-google-wallet.md
            </a>. It leaves the three values in a file; they come here.
          </p>

          <label className="mt-4 block">
            <span className="text-[13px] muted">Issuer ID — the long number from the Google Wallet console</span>
            <input value={form.issuerId} inputMode="numeric" autoComplete="off"
                   onChange={(e) => setForm({ ...form, issuerId: e.target.value })}
                   className="mt-1 block min-h-[42px] w-full rounded-xl px-3 text-[14px]"
                   style={{ background: 'rgb(var(--glass-line) / 0.10)' }} />
          </label>

          <label className="mt-3 block">
            <span className="text-[13px] muted">Service account — ends .iam.gserviceaccount.com</span>
            <input value={form.serviceAccount} autoComplete="off" spellCheck={false}
                   onChange={(e) => setForm({ ...form, serviceAccount: e.target.value })}
                   className="mt-1 block min-h-[42px] w-full rounded-xl px-3 text-[14px]"
                   style={{ background: 'rgb(var(--glass-line) / 0.10)' }} />
          </label>

          <label className="mt-3 block">
            <span className="text-[13px] muted">
              Private key — the private_key from the JSON file, starting -----BEGIN
            </span>
            <textarea value={form.privateKey} rows={3} autoComplete="off" spellCheck={false}
                      onChange={(e) => setForm({ ...form, privateKey: e.target.value })}
                      className="mt-1 block w-full rounded-xl px-3 py-2 font-mono text-[12px]"
                      style={{ background: 'rgb(var(--glass-line) / 0.10)' }} />
          </label>

          <p className="mt-2 text-[13px] muted">
            The key is sealed before it is stored, never shown again, and never reaches a browser.
          </p>

          <button type="button" onClick={save}
                  disabled={busy || !form.issuerId || !form.serviceAccount || !form.privateKey}
                  className="mt-3 min-h-[44px] w-full rounded-xl px-4 text-[15px] font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}>
            {busy ? 'Checking with Google…' : 'Save and check'}
          </button>
        </>
      )}

      {note && <p className="mt-3 text-[13px]">{note}</p>}
    </section>
  )
}
