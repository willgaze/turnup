'use client'

import { useCallback, useEffect, useState } from 'react'
import { CopyIcon, TickIcon } from '@/components/icons'

/**
 * Where a household card's rows come from, beyond forwarding.
 *
 *   1. A connected Gmail inbox (stage 1 of docs/research/inbox-connect.md):
 *      the owner's own Workspace mailbox, read every five minutes for
 *      delivery-shaped mail, filed onto one card. Needs the Google project
 *      only the owner can make; the panel says so until it exists.
 *   2. Tracking by number (Ship24): once a row has a courier's reference, the
 *      courier's scans move it. Needs an API key and a webhook URL pasted
 *      into Ship24's dashboard.
 *
 * Both say plainly what they need, with the exact value to paste, and both
 * end in a demonstration (a Check now, a tracked count) rather than a claim.
 */
function Copy({ value, label }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]"
            onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000) } catch { /* on screen to select */ } }}>
      {done ? <TickIcon size={14} /> : <CopyIcon size={14} />} {done ? 'Copied' : label}
    </button>
  )
}

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : null)

export default function Sources() {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(null)
  const [note, setNote] = useState(null)

  const load = useCallback(() => fetch('/api/dashboard/sources', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => setS(null)), [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('gmail')
    if (q === 'connected') setNote('Gmail connected. Choose which card it feeds, then press Check now.')
    else if (q) setNote(`Google said: ${q}`)
  }, [])

  const act = async (action, extra = {}) => {
    setBusy(action); setNote(null)
    try {
      const r = await fetch('/api/dashboard/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setNote(`Did not work: ${j.error || r.status}`)
      else if (action === 'gmail_poll') setNote(j.error ? `Gmail: ${j.error}` : j.why === 'no_card_chosen' ? 'Choose a card first.' : `Checked ${j.checked ?? 0} email${j.checked === 1 ? '' : 's'}: ${j.filed ?? 0} on the card, ${j.dropped ?? 0} not a delivery.`)
      else if (action === 'gmail_disconnect') setNote('Disconnected, and the permission revoked at Google.')
      await load()
    } finally { setBusy(null) }
  }

  if (!s) return null
  const g = s.gmail, t = s.tracking
  return (
    <section className="glass r-outer mt-4 p-5">
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">Where the card hears from</h2>
      <p className="mt-1 text-[14px] muted">Forwarding works today. These two mean nobody has to forward anything.</p>

      {/* 1. Gmail */}
      <div className="r-inner mt-4 px-4 py-3.5 text-[14px]" style={{ background: g.connected ? 'color-mix(in srgb, var(--stage-done) 12%, transparent)' : 'rgb(var(--glass-line) / 0.07)' }}>
        <p className="font-semibold">Read my own inbox (Gmail) {g.connected ? '· connected' : g.configured ? '· ready to connect' : '· needs the Google project'}</p>
        {g.connected ? (
          <>
            <p className="mt-1 muted">{g.email || 'Your mailbox'}, connected {when(g.connectedAt)}. Every five minutes it reads delivery-shaped mail that arrived since the last look and files it on the card below. Nothing else is read, and no email is stored.</p>
            <label className="mt-2.5 block">
              <span className="text-[13px] muted">Which card it feeds</span>
              <select value={g.placeCode || ''} disabled={busy} onChange={(e) => act('gmail_place', { placeCode: e.target.value })}
                      className="mt-1 block min-h-[42px] w-full rounded-xl px-3 text-[14px]" style={{ background: 'rgb(var(--glass-line) / 0.10)' }}>
                <option value="">Choose a card</option>
                {s.places.map((p) => <option key={p.code} value={p.code}>{p.label || p.code} ({p.code})</option>)}
              </select>
            </label>
            <p className="mt-2 text-[13px] muted">{g.lastCheckedAt ? `Last looked ${when(g.lastCheckedAt)}: ${g.lastOutcome || ''}` : 'Not looked yet.'}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button type="button" disabled={busy || !g.placeCode} onClick={() => act('gmail_poll')} className="btn accent-fill !min-h-[42px] !px-4 !text-[14px]">{busy === 'gmail_poll' ? '…' : 'Check now'}</button>
              <button type="button" disabled={busy} onClick={() => { if (confirm('Disconnect Gmail? The permission is revoked at Google and nothing more is read.')) act('gmail_disconnect') }} className="btn btn-grey !min-h-[42px] !px-4 !text-[14px]">Disconnect</button>
            </div>
          </>
        ) : g.configured ? (
          <>
            <p className="mt-1 muted">The Google settings are in. Connect your own Workspace mailbox: Google asks once, you choose the card, and delivery emails land on it with no forwarding rule.</p>
            <a href="/api/gmail/oauth/start" className="btn accent-fill mt-2.5 !min-h-[44px] !px-4 !text-[14px]">Connect Gmail</a>
          </>
        ) : (
          <>
            <p className="mt-1 muted">Needs a Google Cloud project in your Workspace (an Internal app, which Google does not review) and two settings in Vercel: <code className="font-mono">GOOGLE_CLIENT_ID</code> and <code className="font-mono">GOOGLE_CLIENT_SECRET</code>. The steps are in <code className="font-mono">docs/connect-gmail.md</code>, as one Cowork paste. The redirect URI the client needs:</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-2"><code className="font-mono break-all text-[13px]">{g.redirectUri}</code><Copy value={g.redirectUri} label="Copy" /></p>
          </>
        )}
      </div>

      {/* 2. Tracking by number */}
      <div className="r-inner mt-3 px-4 py-3.5 text-[14px]" style={{ background: t.configured ? 'color-mix(in srgb, var(--stage-done) 12%, transparent)' : 'rgb(var(--glass-line) / 0.07)' }}>
        <p className="font-semibold">Track parcels by their number (Ship24) {t.configured ? '· on' : '· needs a key'}</p>
        {t.configured ? (
          <>
            <p className="mt-1 muted">{t.tracked} parcel{t.tracked === 1 ? '' : 's'} being tracked{t.trackable ? `, ${t.trackable} waiting for the next sweep` : ''}. One email with the courier’s number is enough; from then on the courier’s own scans move the row, in their words.</p>
            {t.webhookUrl && <p className="mt-2 text-[13px] muted">Webhook URL for Ship24’s dashboard (Integrations, Webhooks): <code className="font-mono break-all">{t.webhookUrl}</code> <Copy value={t.webhookUrl} label="Copy" /></p>}
          </>
        ) : (
          <>
            <p className="mt-1 muted">Needs a Ship24 account (free for ten parcels a month) and <code className="font-mono">SHIP24_API_KEY</code> in Vercel, then this URL pasted into Ship24’s webhook settings. The steps are in <code className="font-mono">docs/tracking-by-number.md</code>.</p>
            {t.webhookUrl && <p className="mt-1.5 flex flex-wrap items-center gap-2"><code className="font-mono break-all text-[13px]">{t.webhookUrl}</code><Copy value={t.webhookUrl} label="Copy" /></p>}
          </>
        )}
      </div>
      {note && <p className="mt-3 text-[14px]">{note}</p>}
    </section>
  )
}
