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
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

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
      if (!r.ok) setNote({ bad_client_id: 'That Client ID does not look right: it ends .apps.googleusercontent.com, no spaces.', bad_client_secret: 'That secret does not look right: copy the whole thing, no spaces.' }[j.error] || `Did not work: ${j.error || r.status}`)
      else if (action === 'gmail_app_save') { setClientId(''); setClientSecret(''); setNote('Saved. Now press Connect Gmail.') }
      else if (action === 'gmail_app_forget') setNote('Cleared. Paste the Client ID and secret again when you have them.')
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
            <p className="mt-1 muted">Client {g.app?.idTail ? `${g.app.idTail} ` : ''}is in{g.app?.source === 'saved' ? ', saved from this panel' : ''}. Connect your own Workspace mailbox: Google asks once, you choose the card, and delivery emails land on it with no forwarding rule.</p>
            <a href="/api/gmail/oauth/start" className="btn accent-fill mt-2.5 !min-h-[44px] !px-4 !text-[14px]">Connect Gmail</a>
            {g.app?.source === 'saved' && <button type="button" disabled={busy} onClick={() => { if (confirm('Clear the saved Google client? You can paste it again.')) act('gmail_app_forget') }} className="mt-2 block text-[13px] underline muted">Wrong client? Clear it and paste again</button>}
          </>
        ) : (
          <>
            {/* Three steps with a link each, then two boxes. No Vercel, no
                redeploy, no file path: those were asked for and did not
                happen. The Google project itself can only be made by the
                owner, signed in to their Workspace. */}
            <p className="mt-1 muted">Your own Workspace inbox feeds a card, with no forwarding rule. Three steps, in Chrome signed in as your Workspace account, then paste two things here.</p>
            <ol className="mt-2 space-y-1.5 muted">
              <li><span className="font-semibold">1. </span><a className="underline" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer">Create a project</a> called TurnUp inbox in your organisation, then <a className="underline" href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer">enable the Gmail API</a>.</li>
              <li><span className="font-semibold">2. </span><a className="underline" href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noreferrer">Set up the consent screen</a>: audience <b>Internal</b>, and add the scope <code className="font-mono text-[12px]">gmail.readonly</code>. If only External is offered, stop: the account is not in a Workspace.</li>
              <li><span className="font-semibold">3. </span><a className="underline" href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noreferrer">Create an OAuth client</a>: Web application, with this redirect URI, then paste its Client ID and secret below.</li>
            </ol>
            <p className="mt-1.5 flex flex-wrap items-center gap-2"><code className="font-mono break-all text-[13px]">{g.redirectUri}</code><Copy value={g.redirectUri} label="Copy" /></p>
            <div className="mt-2.5 grid gap-2">
              <input className="field" inputMode="text" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Client ID (ends .apps.googleusercontent.com)" value={clientId} onChange={(e) => setClientId(e.target.value)} />
              <input className="field" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Client secret" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
              <button type="button" disabled={busy || !clientId.trim() || !clientSecret.trim()} onClick={() => act('gmail_app_save', { clientId, clientSecret })} className="btn accent-fill !min-h-[44px] !px-4 !text-[14px]">{busy === 'gmail_app_save' ? 'Saving…' : 'Save'}</button>
            </div>
            <p className="mt-1.5 text-[12px] muted">The secret is sealed before it is stored and never shown again. Nothing is read until you press Connect and approve it with Google.</p>
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
