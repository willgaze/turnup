'use client'

import { useCallback, useEffect, useState } from 'react'
import { HouseIcon, CopyIcon, PlusIcon, LinkOffIcon } from '@/components/icons'
import Shot from '@/components/Shot'

/**
 * Household cards: one door, everything coming to it.
 *
 * A job link answers "where is my plumber". A household card answers "what is
 * happening at my house this week" — the plumber, the sofa, four parcels, in
 * one list, because that is how the person living there already thinks about
 * it. The trade makes the card and sends the link; the household forwards
 * their own delivery emails to the address and fills it themselves.
 *
 * TWO SECRETS, AND THEY DO DIFFERENT JOBS. Mixing them up is the thing to
 * avoid, so the panel labels both:
 *
 *   the link   — read. Goes to the customer. Shows what is coming.
 *   the inbox  — write. Goes into a mail rule. Puts things on the card.
 *
 * Both live here because here is behind a password. Neither is ever on the
 * card itself, so a card link that gets forwarded around a family group chat
 * can never become a way to post onto somebody's door.
 */
export default function Doors() {
  const [state, setState] = useState('loading')
  const [places, setPlaces] = useState([])
  const [configured, setConfigured] = useState(false)
  const [host, setHost] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
  // Which of the trade's jobs are on each card, keyed by card code.
  const [onCard, setOnCard] = useState({})
  const [jobs, setJobs] = useState([])

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/places', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'failed')
      const list = d.places || []
      setPlaces(list); setConfigured(Boolean(d.configured)); setHost(d.host || '')
      setState('ready')

      // The open jobs, so a card can be given one without typing a code.
      try {
        const t = await fetch('/api/dashboard/trackers', { cache: 'no-store' })
        const td = await t.json()
        setJobs((td.trackers || []).filter((j) => j.isActive !== false && j.stage !== 'DONE'))
      } catch { /* a card still works without the picker */ }

      const pairs = await Promise.all(list.map(async (p) => {
        try {
          const r = await fetch(`/api/dashboard/places/jobs?code=${p.code}`, { cache: 'no-store' })
          const j = await r.json()
          return [p.code, j.codes || []]
        } catch { return [p.code, []] }
      }))
      setOnCard(Object.fromEntries(pairs))
    } catch { setState('error') }
  }, [])
  useEffect(() => { load() }, [load])

  const make = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/dashboard/places', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      if (r.ok) { setLabel(''); await load() }
    } finally { setBusy(false) }
  }

  const revoke = async (code) => {
    setBusy(true)
    try {
      await fetch('/api/dashboard/places', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      await load()
    } finally { setBusy(false) }
  }

  const addJob = async (code, trackerCode) => {
    if (!trackerCode) return
    setBusy(true)
    try {
      await fetch('/api/dashboard/places/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, trackerCode }),
      })
      await load()
    } finally { setBusy(false) }
  }

  const removeJob = async (code, trackerCode) => {
    setBusy(true)
    try {
      await fetch('/api/dashboard/places/jobs', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, trackerCode }),
      })
      await load()
    } finally { setBusy(false) }
  }

  const copy = async (text, tag) => {
    try { await navigator.clipboard.writeText(text); setCopied(tag); setTimeout(() => setCopied(''), 1800) } catch { /* no clipboard */ }
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin

  return (
    <section id="panel-doors" className="glass mt-8 scroll-mt-4 overflow-hidden r-outer">
      <div className="flex items-center gap-3 px-6 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>
          <HouseIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-semibold">Household cards</span>
          <span className="block text-[14px] muted">
            {state === 'ready'
              ? `${places.length} card${places.length === 1 ? '' : 's'}`
              : state === 'error' ? 'Could not read them' : '…'}
          </span>
        </span>
      </div>

      <div className="px-6 pb-5 text-[15px] leading-snug muted">
        {/* The card itself, cut from a capture of a seeded one. Your visit
            and the household's own parcels on one list. */}
        <Shot name="house-card" label="One door, everything coming to it" note="Your visit, the sofa, the parcels. They forward the emails; the card fills itself." fade className="max-w-[360px]" />

        {/* The address is the whole promise, so it is not offered until it can
            work. A row that hands out an address nothing is listening on is
            the push row that opened onto an empty drawer. */}
        {state === 'ready' && !configured && (
          <p className="mt-2 text-[14px]">
            <b>Forwarding is not switched on yet.</b> Cards still work for your own jobs —
            the forwarding addresses below start receiving once <code>{host}</code> is pointed
            at a mail provider and <code>INBOUND_EMAIL_TOKEN</code> is set.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80}
            placeholder="14 Church Lane" aria-label="What to call this door"
            className="field min-h-[44px] flex-1" style={{ minWidth: '12rem' }}
          />
          <button type="button" onClick={make} disabled={busy}
                  className="btn accent-fill !min-h-[44px] !px-4 !text-[14px]">
            <PlusIcon size={15} /> {busy ? '…' : 'New card'}
          </button>
        </div>

        {places.length > 0 && (
          <ul className="mt-4 grid gap-2.5">
            {places.map((p) => (
              <li key={p.code} className="r-inner p-3.5" style={{ background: 'color-mix(in srgb, var(--mts-accent) 6%, transparent)' }}>
                <p className="text-[16px] font-semibold" style={{ color: 'var(--label-1)' }}>
                  {p.label || 'A door'}
                </p>
                <p className="text-[13px] muted">
                  {p.arrivals} thing{p.arrivals === 1 ? '' : 's'} on it
                </p>

                {/* Your own jobs on their card. Added by hand on purpose: two
                    flats share a postcode, and a card is a link anyone can
                    forward, so a guessed address match would put somebody's
                    booking in front of a stranger. */}
                <p className="mt-2.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>
                  Your jobs on this card
                </p>
                {(onCard[p.code] || []).length === 0 && (
                  <p className="text-[14px] muted">None yet</p>
                )}
                {(onCard[p.code] || []).map((jc) => {
                  const job = jobs.find((j) => j.code === jc)
                  return (
                    <span key={jc} className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[15px]" style={{ color: 'var(--label-1)' }}>
                        {job?.jobSummary || job?.customerName || jc}
                      </span>
                      <button type="button" onClick={() => removeJob(p.code, jc)} disabled={busy}
                              className="text-[13px] underline" style={{ color: 'var(--label-3)' }}>
                        Take off
                      </button>
                    </span>
                  )
                })}
                {jobs.filter((j) => !(onCard[p.code] || []).includes(j.code)).length > 0 && (
                  <select
                    aria-label="Add one of your jobs to this card"
                    className="field mt-2 min-h-[44px] !text-[15px]" value=""
                    onChange={(e) => addJob(p.code, e.target.value)} disabled={busy}
                  >
                    <option value="">Add one of your jobs…</option>
                    {jobs.filter((j) => !(onCard[p.code] || []).includes(j.code)).map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.jobSummary || 'A job'}{j.customerName ? ` — ${j.customerName}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-[12px]">It follows every stage you tap, including Paused and why.</p>

                <p className="mt-3.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>
                  Send them this
                </p>
                <p className="break-all font-mono text-[13px]" style={{ color: 'var(--label-1)' }}>
                  {origin}/h/{p.code}
                </p>

                <p className="mt-2.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>
                  They forward delivery emails here
                </p>
                <p className="break-all font-mono text-[13px]" style={{ color: 'var(--label-1)' }}>{p.inbox}</p>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => copy(`${origin}/h/${p.code}`, `link-${p.code}`)}
                          className="btn btn-grey !min-h-[38px] !px-3 !text-[13px]">
                    <CopyIcon size={14} /> {copied === `link-${p.code}` ? 'Copied' : 'Copy link'}
                  </button>
                  <button type="button" onClick={() => copy(p.inbox, `inbox-${p.code}`)}
                          className="btn btn-grey !min-h-[38px] !px-3 !text-[13px]">
                    <CopyIcon size={14} /> {copied === `inbox-${p.code}` ? 'Copied' : 'Copy address'}
                  </button>
                  <a href={`/h/${p.code}`} target="_blank" rel="noreferrer"
                     className="btn btn-grey !min-h-[38px] !px-3 !text-[13px]">Open</a>
                  <button type="button" onClick={() => revoke(p.code)} disabled={busy}
                          className="btn btn-grey !min-h-[38px] !px-3 !text-[13px]">
                    <LinkOffIcon size={14} /> Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[12px]">The link shows only what someone said was coming. The forwarding address is never on it.</p>
      </div>
    </section>
  )
}
