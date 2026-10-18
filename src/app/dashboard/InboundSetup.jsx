'use client'

import { useCallback, useEffect, useState } from 'react'
import { HouseIcon, CopyIcon, TickIcon } from '@/components/icons'

/**
 * Switching the letterbox on.
 *
 * THIS PANEL HAS BEEN CUT DOWN ONCE AND THE REASON MATTERS. It used to be four
 * steps: make a password, set it in Vercel and redeploy, move the DNS, and
 * deploy a Worker with wrangler. Two of those needed a laptop. Told to do it,
 * the owner asked again for the whole thing to be set up for him — the same
 * signal as the push script being run zero times out of four. The ask was the
 * problem, so two steps were deleted rather than re-explained:
 *
 *   - the password is written to a row by the button below, so there is no
 *     Vercel visit and no redeploy;
 *   - the Worker is handed over as finished code with the address and the
 *     password already in it, to paste into Cloudflare's own editor.
 *
 * What is left is a Cloudflare account and a nameserver change. Nothing can
 * remove those: they are an account somebody has to own and a domain somebody
 * has to prove they control.
 */
function Copy({ value, label, wide }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000) }
        catch { /* older browsers: the value is on screen to select */ }
      }}
      className={`btn ${wide ? 'accent-fill' : 'btn-grey'} !min-h-[44px] !px-4 !text-[14px]`}
    >
      {done ? <TickIcon size={15} /> : <CopyIcon size={15} />} {done ? 'Copied' : label}
    </button>
  )
}

/**
 * One line of the checklist.
 *
 * Three states and not two: **unknown is not the same as no.** A lookup that
 * could not be made must never draw a cross beside a step somebody has
 * actually done — that sends them back to undo work that was right.
 */
function Step({ done, children, note }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] shrink-0"
            style={{ color: done === true ? 'var(--stage-done)' : 'var(--label-3)' }}>
        {done === true
          ? <TickIcon size={16} />
          : <span className="block h-4 w-4 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px currentColor' }} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px]" style={{ color: done === true ? 'var(--label-1)' : 'var(--label-2)' }}>
          {children}
        </span>
        {note && <span className="block text-[13px]" style={{ color: 'var(--label-3)' }}>{note}</span>}
      </span>
    </li>
  )
}

export default function InboundSetup() {
  const [state, setState] = useState('checking')
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [progress, setProgress] = useState(null)

  const read = useCallback(async (withProgress) => {
    try {
      const r = await fetch(`/api/dashboard/inbound${withProgress ? '?progress=1' : ''}`, { cache: 'no-store' })
      const d = await r.json()
      setInfo(d)
      setState(d.configured ? 'on' : 'off')
      if (withProgress) setProgress({ dns: d.dns, seen: d.seen })
    } catch { setState('off') }
  }, [])

  useEffect(() => { read(false) }, [read])

  // Once it is switched on, keep asking where it has got to. A DNS change and
  // a first email both land while somebody is looking at this page, and the
  // whole point is that they see it happen rather than being told it should
  // have happened.
  useEffect(() => {
    if (state !== 'on') return undefined
    read(true)
    const t = setInterval(() => read(true), 20000)
    return () => clearInterval(t)
  }, [state, read])

  const switchOn = async () => {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/dashboard/inbound', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'failed')
      setInfo(d); setState('on')
    } catch (e) { setErr(e.message || 'That did not take. Try again in a moment.') }
    finally { setBusy(false) }
  }

  if (state === 'checking') return null

  const bare = (info?.host || 'in.getturnup.com').replace(/^[^.]+\./, '')
  const sub = (info?.host || 'in.getturnup.com').split('.')[0]

  return (
    <section id="panel-inbound" className="glass mt-8 scroll-mt-4 overflow-hidden r-outer">
      <div className="flex items-center gap-3 px-6 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>
          <HouseIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-semibold">Turn on forwarding</span>
          <span className="block text-[14px] muted">
            {state === 'on' ? 'Switched on here — two things left, both in Cloudflare' : 'So forwarded emails can land on a household card'}
          </span>
        </span>
      </div>

      <div className="px-6 pb-6 text-[15px] leading-snug muted">
        {state === 'off' && (
          <>
            <p>
              Two steps, both in a browser. Press this first and the rest appears.
            </p>
            {err && <p className="mt-2 text-[14px] text-red-600">{err}</p>}
            <button type="button" onClick={switchOn} disabled={busy}
                    className="btn accent-fill mt-3 !min-h-[46px] !px-5 !text-[15px]">
              {busy ? '…' : 'Switch it on'}
            </button>
            <p className="mt-2 text-[13px]">
              Nothing to set in Vercel and nothing to redeploy. This writes the password itself.
            </p>
          </>
        )}

        {state === 'on' && info?.worker && (
          <>
            {progress && (
              <div className="r-inner mb-4 p-3.5" style={{ background: 'color-mix(in srgb, var(--mts-accent) 6%, transparent)' }}>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>
                  Where it has got to
                </p>
                <ul className="mt-2 grid gap-2">
                  <Step done>Switched on here</Step>
                  <Step done={progress.dns?.onCloudflare}
                        note={progress.dns?.onCloudflare === false
                          ? `Still on ${(progress.dns.nameservers || []).join(', ') || 'the old nameservers'} \u2014 the Hostinger half of step 1`
                          : progress.dns?.onCloudflare === null ? 'Could not check just now' : null}>
                    The domain is on Cloudflare
                  </Step>
                  <Step done={progress.dns?.mailRouted}
                        note={progress.dns?.mailRouted === false ? 'No mail records on the subdomain yet \u2014 step 2' : null}>
                    Mail for {info.host} points at Cloudflare
                  </Step>
                  <Step done={Boolean(progress.seen?.at)}
                        note={progress.seen?.at
                          ? `${progress.seen.count} so far, last one ${progress.seen.result}`
                          : 'Nothing has reached it yet'}>
                    Something has arrived
                  </Step>
                </ul>
                <p className="mt-2.5 text-[12px]">Checks itself every 20 seconds.</p>
              </div>
            )}

            <p>
              <b>Done on this side.</b> Two things left, both inside Cloudflare, both in a browser.
              Do them on a quiet evening — step 1 moves the website&apos;s DNS and is the only
              part with any risk in it.
            </p>

            <ol className="mt-5 grid gap-5">
              <li>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>
                  1 — Point the domain at Cloudflare
                </p>
                <p className="mt-1">
                  Sign up at <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer">Cloudflare</a>,
                  add <b>{bare}</b>, take the <b>Free</b> plan. It copies your existing records across —
                  <b> check the website records are in that list before going on.</b>
                </p>
                <p className="mt-1.5">
                  Then <a href="https://hpanel.hostinger.com/" target="_blank" rel="noreferrer">Hostinger</a> →
                  Domains → {bare} → <b>Change nameservers</b>, and paste the two Cloudflare gives you.
                </p>
                <p className="mt-1.5 text-[13px]">
                  <b>You will see:</b> Cloudflare says <b>Active</b>, usually within 15 minutes,
                  and the tick above appears on its own.
                  Check <a href={`https://www.${bare}`} target="_blank" rel="noreferrer">the website</a> still loads.
                </p>
                {/* Clicking through two consoles is a Cowork job, not a step
                    list — standing rule 3. The whole prompt is in the repo so
                    it can be pasted in one go rather than followed tap by tap. */}
                <p className="mt-1.5 text-[13px]">
                  Rather paste one job into Cowork on the Mac than tap through it?
                  It is written out in <span className="font-mono">docs/cowork-nameservers.md</span>.
                </p>
              </li>

              <li>
                <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>
                  2 — The letterbox and the Worker
                </p>
                <p className="mt-1">
                  In Cloudflare on <b>{bare}</b>: <b>Compute</b> → <b>Email Service</b> → <b>Email Routing</b>.
                  Then <b>Settings</b>: add the subdomain <b>{sub}</b>, and switch on <b>Subaddressing</b>.
                  That keeps your own email at <span className="font-mono">{bare}</span> untouched, now and later.
                </p>
                <p className="mt-2">
                  Next, <b>Workers &amp; Pages</b> → <b>Create</b> → <b>Start with Hello World</b> →
                  <b> Deploy</b> → <b>Edit code</b>. Select everything in the editor, paste this over it,
                  and press <b>Deploy</b>. Name it <b>turnup-inbound</b>.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Copy value={info.worker} label="Copy the Worker" wide />
                </div>
                {/* Not a catch-all: Cloudflare's catch-all works on the apex
                    only. One rule for cards@ on the subdomain, with
                    subaddressing on, takes every cards+<key>@ (v1.63.0). */}
                <p className="mt-2.5">
                  Last, back in <b>Email Routing</b>: <b>Routing Rules</b> → <b>Create routing rule</b> →
                  Email pattern <b>cards</b> @ <b>{info.host}</b> → Action <b>Send to a Worker</b> →
                  <b> turnup-inbound</b> → <b>Save</b>.
                </p>
                <p className="mt-1.5 text-[13px]">
                  <b>You will see:</b> the rule for <span className="font-mono">cards@{info.host}</span> showing as <b>Active</b>.
                </p>
              </li>
            </ol>

            <p className="mt-5 text-[13px]">
              <b>How you will know it all worked:</b> forward any delivery email to a card&apos;s
              address and the thing turns up on the card within a few seconds. If nothing appears,
              Cloudflare → Email Routing → <b>Activity log</b> shows every message and what happened
              to it.
            </p>
            <p className="mt-3 text-[12px]">
              The code above has the address and the password in it, which is why there is nothing
              else to copy. Keep it to yourself the way you would a key — anyone with it could
              post rows onto your cards.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
