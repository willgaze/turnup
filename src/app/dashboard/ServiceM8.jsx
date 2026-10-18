'use client'
import { useCallback, useEffect, useState } from 'react'
import { ChevronIcon, TickIcon } from '@/components/icons'
import Shot from '@/components/Shot'
import { Sm8Buttons } from '../with-servicem8/Sm8Mocks'

/**
 * The ServiceM8 panel: is it connected, is it listening, what has it done.
 *
 * Honest about the three states. No key: say exactly what to do. Key but no
 * webhooks: it still works by pull-on-read, say that too, and offer the
 * button. Listening: show the last few things it did, so "did it fire?" is
 * a glance rather than a support ticket.
 */
export default function ServiceM8({ onChanged }) {
  const [open, setOpen] = useState(false)
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(null)
  const [note, setNote] = useState(null)
  const [testTo, setTestTo] = useState('')
  const [emailNote, setEmailNote] = useState(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/dashboard/servicem8')
    if (r.ok) setS(await r.json())
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (action, attempt = 0) => {
    setBusy(action); if (!attempt) setNote(null)
    try {
      const r = await fetch('/api/dashboard/servicem8', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const j = await r.json().catch(() => ({}))
      if (r.status === 202 && j.activating) {
        // ServiceM8 switches webhooks on for an account the first time anyone
        // asks, and says "try again in a few moments". So we do — every 20
        // seconds for up to five minutes, while this stays open.
        if (attempt < 15) {
          setNote(`ServiceM8 is switching webhooks on for your account. Trying again in 20 seconds… (${attempt + 1}/15)`)
          setTimeout(() => act(action, attempt + 1), 20_000)
          return
        }
        return setNote('ServiceM8 is still switching webhooks on. Leave it a few minutes and press Start listening again.')
      }
      if (!r.ok) setNote(j.error === 'sm8_key_rejected' ? 'ServiceM8 rejected the key. Check SM8_API_KEY in Vercel.' : `Did not work: ${j.error || r.status}`)
      else if (action === 'sync') setNote(`Checked ${j.results.length} linked job${j.results.length === 1 ? '' : 's'}: ${j.results.filter((x) => String(x.outcome).startsWith('moved')).length} moved.`)
      else if (action === 'subscribe') setNote(j.results.every((x) => x.ok) ? 'Listening. ServiceM8 will ring this page when a job moves.' : `Some subscriptions failed: ${j.results.filter((x) => !x.ok).map((x) => `${x.event} (${x.error})`).join(', ')}`)
      else setNote('Stopped listening.')
      await load(); onChanged?.()
    } finally { setBusy(null) }
  }

  const live = s?.configured && (s?.subscriptions?.length || 0) > 0
  const sub = !s ? '…' : !s.configured ? 'Not connected — needs an API key' : live ? `Listening · ${s.linked ?? 0} job${s.linked === 1 ? '' : 's'} linked` : 'Connected · checks when a page is opened'

  return (
    <section className="glass mt-8 overflow-hidden r-outer">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[66px] w-full items-center gap-3 px-6 py-4 text-left">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${live ? 'tone-done' : s?.configured ? 'tone-booked' : 'tone-paused'}`}
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>
          <TickIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-semibold">ServiceM8</span>
          <span className="block text-[14px] muted">{sub}</span>
        </span>
        <ChevronIcon size={18} style={{ color: 'var(--label-3)' }} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && s && (
        <div className="px-6 pb-6">
          {!s.configured ? (
            <div className="r-inner px-4 py-3.5 text-[14px]" style={{ background: 'color-mix(in srgb, var(--stage-paused) 13%, transparent)' }}>
              <p className="font-semibold">Connect it: one setting in Vercel.</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li>In ServiceM8: <b>Settings → API Keys → Create</b>. Copy the key.</li>
                <li>Open <a className="underline" href="https://vercel.com/willgazes-projects/turnup/settings/environment-variables" target="_blank" rel="noreferrer">Vercel → turnup → Environment Variables</a>. Press <b>Add</b>: Key <code className="font-mono">SM8_API_KEY</code>, Value the key, Environment <b>Production</b>. Save.</li>
                <li>Open <a className="underline" href="https://vercel.com/willgazes-projects/turnup/deployments" target="_blank" rel="noreferrer">Deployments</a> → <b>⋯</b> on the top one → <b>Redeploy</b>. About a minute.</li>
                <li>Come back here and press <b>Start listening</b>.</li>
              </ol>
              <p className="mt-2 muted">That is all. The webhook secret is derived, and the tables are created on deploy. Until the key is in, this panel does nothing and nothing else is affected.</p>
            </div>
          ) : (
            <>
              {/* Check In in ServiceM8, On site on their card: the pair the
                  whole connector comes down to. The rest is on /with-servicem8. */}
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <div className="max-w-[340px]">
                  <Sm8Buttons kind="checkin" />
                  <p className="mt-2 px-0.5 text-[14px] font-semibold leading-tight">You tap Check In</p>
                </div>
                <Shot name="sm8-customer-onsite" label="They see On site" fade className="max-w-[340px]" />
              </div>
              <p className="mt-3 text-[14px] muted">Complete Job is <b>Job done</b>; Check Out early is <b>Paused</b>. Setting off stays your tap. <a className="underline" href="/with-servicem8" target="_blank" rel="noreferrer">Every step, in pictures</a>.</p>
              {s.tablesMissing && (
                <p className="r-inner mt-3 px-4 py-3 text-[14px]" style={{ background: 'color-mix(in srgb, var(--stage-paused) 13%, transparent)' }}>
                  The log tables are not in the database yet. Run <code className="font-mono">npx prisma db push</code> against production (the connect script does this).
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {live ? (
                  <button type="button" onClick={() => act('unsubscribe')} disabled={busy} className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">Stop listening</button>
                ) : (
                  <button type="button" onClick={() => act('subscribe')} disabled={busy || !s.hasToken} className="btn accent-fill !min-h-[44px] !px-4 !text-[14px]">{busy === 'subscribe' ? '…' : 'Start listening'}</button>
                )}
                <button type="button" onClick={() => act('sync')} disabled={busy} className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">{busy === 'sync' ? '…' : 'Check all linked jobs now'}</button>
              </div>
              {/* Follow every booking: the card at once, the link ten minutes
                  later through ServiceM8 unless ServiceM8 already texted it. */}
              <div className="r-inner mt-4 px-4 py-3.5 text-[14px]" style={{ background: s.autoFollow ? 'color-mix(in srgb, var(--stage-done) 12%, transparent)' : 'rgb(var(--glass-line) / 0.07)' }}>
                <p className="font-semibold">Follow every booking {s.autoFollow ? '· on' : '· off'}</p>
                <p className="mt-1 muted">Every ServiceM8 booking gets its card at once, and the link texted ten minutes later through ServiceM8 (one SMS credit) unless ServiceM8 already sent it. Once per job, ever.</p>
                <button type="button" disabled={busy} onClick={async () => { setBusy('follow'); try { await fetch('/api/dashboard/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoFollow: !s.autoFollow }) }); await load() } finally { setBusy(null) } }}
                        className={`btn mt-2.5 !min-h-[42px] !px-4 !text-[14px] ${s.autoFollow ? 'btn-grey' : 'accent-fill'}`}>
                  {busy === 'follow' ? '…' : s.autoFollow ? 'Switch off' : 'Switch on'}
                </button>
              </div>

              {/* The non-push fallback: an email through ServiceM8 when no
                  notification reached the customer (src/lib/customer-email.js). */}
              <div className="r-inner mt-4 px-4 py-3.5 text-[14px]" style={{ background: s.emailFallback ? 'color-mix(in srgb, var(--stage-done) 12%, transparent)' : 'rgb(var(--glass-line) / 0.07)' }}>
                <p className="font-semibold">Email when notifications are off {s.emailFallback ? '· on' : '· off'}</p>
                <p className="mt-1 muted">A customer without notifications switched on gets an email instead, from your ServiceM8 address, to the email on the ServiceM8 job: when you set off, if a window is missed, and the day-before ask. Once each per job, never a time, and it shows in the job diary. Not SMS, so no credits.</p>
                <button type="button" disabled={busy} onClick={async () => { setBusy('email'); try { await fetch('/api/dashboard/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailFallback: !s.emailFallback }) }); await load() } finally { setBusy(null) } }}
                        className={`btn mt-2.5 !min-h-[42px] !px-4 !text-[14px] ${s.emailFallback ? 'btn-grey' : 'accent-fill'}`}>
                  {busy === 'email' ? '…' : s.emailFallback ? 'Switch off' : 'Switch on'}
                </button>
                <form className="mt-3 flex flex-wrap gap-2" onSubmit={async (ev) => {
                  ev.preventDefault(); setBusy('email_test'); setEmailNote(null)
                  try {
                    const r = await fetch('/api/dashboard/servicem8', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'email_test', to: testTo }) })
                    const j = await r.json().catch(() => ({}))
                    setEmailNote(r.ok ? `Sent to ${j.to}. It is the set-off email, as a customer would get it. Nothing in your inbox in a few minutes? Check spam, then ServiceM8’s email settings.` : j.error === 'bad_email' ? 'That does not look like an email address.' : `Did not send: ${j.error || r.status}`)
                  } finally { setBusy(null) }
                }}>
                  <input type="email" inputMode="email" autoComplete="email" required value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.co.uk"
                         className="min-h-[42px] flex-1 min-w-[180px] rounded-xl px-3 text-[14px]" style={{ background: 'rgb(var(--glass-line) / 0.10)' }} aria-label="Send a test email to" />
                  <button type="submit" disabled={busy} className="btn btn-grey !min-h-[42px] !px-4 !text-[14px]">{busy === 'email_test' ? '…' : 'Send me a test'}</button>
                </form>
                {emailNote && <p className="mt-2 text-[13px]">{emailNote}</p>}
                {s.customerEmails?.length > 0 && (
                  <ul className="mt-2.5 grid gap-1 text-[13px]">
                    {s.customerEmails.map((e, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="muted tabular-nums whitespace-nowrap">{new Date(e.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="whitespace-nowrap">{{ ON_MY_WAY: 'Set off', MISSED: 'Window missed', DAY_BEFORE: 'Day before' }[e.kind] || e.kind}</span>
                        <span className={e.outcome === 'sent' ? 'font-semibold' : 'muted'}>{e.outcome === 'sent' ? 'emailed' : e.outcome === 'no_email' ? 'no email on the job' : e.outcome}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* The add-on half: the diary. The key cannot write there; an
                  authorised add-on can. Three states, each with its next step. */}
              <div className="r-inner mt-4 px-4 py-3.5 text-[14px]" style={{ background: 'rgb(var(--glass-line) / 0.07)' }}>
                <p className="font-semibold">As an add-on: TurnUp writes to the job diary</p>
                {s.oauth?.connected ? (
                  <>
                    <p className="mt-1 muted">Connected{s.oauth.vendorName ? ` to ${s.oauth.vendorName}` : ''} since {new Date(s.oauth.connectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Every stage, the terms tap, no one home and the customer’s replies go into the job diary as a line from TurnUp.</p>
                    <button type="button" onClick={() => act('oauth_disconnect')} disabled={busy} className="btn btn-grey mt-2.5 !min-h-[40px] !px-4 !text-[13px]">Disconnect the add-on</button>
                  </>
                ) : s.oauth?.configured ? (
                  <>
                    <p className="mt-1 muted">The app details are in. One more step: authorise it on your ServiceM8 account.</p>
                    <a href="/api/servicem8/oauth/start" className="btn accent-fill mt-2.5 !min-h-[44px] !px-4 !text-[14px]">Connect ServiceM8 as an add-on</a>
                  </>
                ) : (
                  <>
                    <p className="mt-1 muted">Needs a free ServiceM8 developer account and two settings in Vercel (<code className="font-mono">SM8_APP_ID</code>, <code className="font-mono">SM8_APP_SECRET</code>). The steps are in <code className="font-mono">docs/servicem8-add-on.md</code>. Return URL for the app: <code className="font-mono break-all">{s.oauth?.redirectUri}</code></p>
                  </>
                )}
              </div>
              {!s.hasToken && <p className="mt-2 text-[13px] muted">No SM8_WEBHOOK_TOKEN set, so webhooks cannot be received. Pull-on-read still works.</p>}
              {s.subscriptionsError && <p className="mt-2 text-[13px] muted">Could not list subscriptions: {s.subscriptionsError}</p>}
              {note && <p className="mt-3 text-[14px]">{note}</p>}
              {s.recent?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[13px] font-semibold muted">Lately</p>
                  <ul className="mt-1.5 grid gap-1 text-[13px]">
                    {s.recent.map((e) => (
                      <li key={e.id} className="flex items-baseline gap-2">
                        <span className="muted tabular-nums">{new Date(e.receivedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-mono">{e.event}</span>
                        <span className={String(e.outcome).startsWith('moved') ? 'font-semibold' : 'muted'}>{e.outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
