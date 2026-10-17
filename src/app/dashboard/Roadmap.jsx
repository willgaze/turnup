'use client'
import Image from 'next/image'
import { CompassIcon, TickIcon, ChevronIcon } from '@/components/icons'
import crops from '@/lib/home-crops.json'

import { useCallback, useEffect, useState } from 'react'
import { PHASES, STATE } from '@/lib/roadmap'

const TONE = {
  done:   'bg-stage-done/12 text-stage-done',
  onsite: 'bg-stage-onsite/12 text-stage-onsite',
  booked: 'bg-black/[.06] muted dark:bg-white/[.08]',
}

/**
 * Each item shows the screen it is about, where one exists: a homepage frame
 * (public/home/frame-*.webp, the same files the front page swipes through)
 * or a crop (public/home/crops/, the same files the setup panels show). A
 * frame for an idea is a drawing badged so on the homepage; here the state
 * chip beside it says the same. Nothing is photographed that does not exist.
 */
const PICTURE = {
  // live
  'status-link': { frame: 'c-open' }, 'one-tap-text': { frame: 't-send' }, passkey: { frame: 't-login' },
  'window-agree': { frame: 'c-window' }, window: { frame: 'c-window' }, presence: { frame: 'c-presence' },
  'access-notes': { frame: 'c-door' }, 'one-tap-pin': { frame: 'c-door' }, navigate: { crop: 'trade-navigate-note' },
  'brand-logo': { crop: 'trade-plate' }, 'who-to-expect': { frame: 'c-who' }, calendar: { frame: 'c-notify' },
  push: { frame: 'c-notify' }, review: { crop: 'row-after' }, terms: { crop: 'row-terms' },
  'sm8-follow': { crop: 'sm8-dashboard-card' }, 'sm8-week': { crop: 'sm8-panel-head' },
  // ready and ideas
  'wallet-pass': { frame: 't-wallet' }, dvla: { frame: 't-van' }, 'google-wallet': { frame: 'n-android' },
  'sm8-sync': { frame: 'n-sm8' }, 'auto-stage': { frame: 'n-sm8' }, 'sm8-addon': { frame: 'n-sm8' },
  'running-late': { frame: 't-pause' }, photos: { frame: 'n-photos' }, 'review-ask': { frame: 'n-photos' },
  'whatsapp-auto': { frame: 'c-text' }, whatsapp: { frame: 'c-text' }, 'live-location': { frame: 'n-live' },
  'branded-card': { frame: 't-wallet' }, 'deposit-to-book': { frame: 'n-pay' }, payments: { frame: 'n-pay' },
  escrow: { frame: 'n-pay' }, 'two-roles': { frame: 'e-swap' }, 'customer-invite': { frame: 'e-swap' },
  'pickup-dropoff': { frame: 'n-pickup' }, couriers: { frame: 'n-pickup' }, household: { frame: 'e-house' },
  'big-jobs': { frame: 'n-stages' }, 'process-templates': { frame: 'n-stages' }, 'home-record': { frame: 'n-record' },
  'job-management': { frame: 'n-manage' }, quoting: { frame: 'n-manage' }, carplay: { frame: 'n-carplay' },
}

function Thumb({ item }) {
  const p = PICTURE[item.key]
  if (!p) {
    return <span className="grid h-[72px] w-[44px] shrink-0 place-items-center rounded-[10px]" style={{ background: 'rgb(var(--glass-line) / 0.08)', color: 'var(--label-3)' }}><CompassIcon size={16} /></span>
  }
  if (p.frame) {
    return <Image src={`/home/frame-${p.frame}.webp`} alt="" width={1242} height={2688} sizes="44px" className="h-auto w-[44px] shrink-0 rounded-[10px] shadow-sm" />
  }
  const size = crops[p.crop]
  if (!size) return null
  return <Image src={`/home/crops/${p.crop}.webp`} alt="" width={size.w} height={size.h} sizes="72px" className="h-auto w-[72px] shrink-0 rounded-[10px] shadow-sm ring-1 ring-black/[.06]" />
}

/**
 * Everything this could be, with a way to say which bits are actually wanted.
 *
 * The honesty rule from the customer-facing copy applies here too: nothing
 * claims to work when it does not. 'Live' works today, 'Ready' is built and
 * waiting on a certificate or a key, 'Not built' is exactly that.
 *
 * Shut by default, and inside it the words are too: a row is a picture, a
 * name and a chip; tap the name for the sentence and what it needs. The
 * live list is folded behind its count, because the panel exists for the
 * things that are not built yet.
 */
export default function Roadmap() {
  const [open, setOpen] = useState(false)
  const [showLive, setShowLive] = useState(false)
  const [reading, setReading] = useState(null)
  const [interest, setInterest] = useState({})
  const [noteFor, setNoteFor] = useState(null)
  const [noteText, setNoteText] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/dashboard/roadmap')
    if (r.ok) setInterest((await r.json()).interest || {})
  }, [])
  useEffect(() => { if (open) load() }, [open, load])

  const save = async (key, wanted, note) => {
    setInterest((i) => ({ ...i, [key]: { ...i[key], wanted, note } }))
    await fetch('/api/dashboard/roadmap', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, wanted, note }),
    })
  }

  const wantedCount = Object.values(interest).filter((i) => i?.wanted).length

  return (
    <section className="glass mt-4 r-outer">
      <button type="button" onClick={() => setOpen((o) => !o)}
              className="flex min-h-[64px] w-full items-center gap-4 px-6 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center r-inner"
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 13%, transparent)' }}>
          <CompassIcon size={21} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">What this could become</span>
          <span className="block text-[14px] muted">
            {wantedCount ? `${wantedCount} marked as wanted` : 'Mark the ones you would actually use'}
          </span>
        </span>
        <ChevronIcon size={18} style={{ color: 'var(--label-3)' }}
                     className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t hairline">
          {PHASES.map((phase) => {
            const live = phase.items.every((it) => it.state === 'live') || phase.id === 'now'
            const folded = live && !showLive
            return (
              <div key={phase.id} className="border-b hairline px-6 py-5 last:border-0">
                <h3 className="text-[17px] font-semibold">{phase.title}</h3>
                <p className="mt-0.5 text-[14px] muted">{phase.blurb}</p>

                {folded ? (
                  /* The live things, as a row of their screens and a count. The
                     list is one tap away; the pictures say most of it. */
                  <div className="mt-3">
                    <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {phase.items.filter((it) => PICTURE[it.key]?.frame).slice(0, 8).map((it) => (
                        <Image key={it.key} src={`/home/frame-${PICTURE[it.key].frame}.webp`} alt={it.name} width={1242} height={2688} sizes="64px"
                               className="h-auto w-[64px] shrink-0 rounded-[10px] shadow-sm" />
                      ))}
                    </div>
                    <button type="button" onClick={() => setShowLive(true)} className="btn btn-grey mt-3 !min-h-[40px] !px-4 !text-[14px]">
                      {phase.items.length} things live. Show the list
                    </button>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {phase.items.map((item) => {
                      const st = STATE[item.state]
                      const mine = interest[item.key]
                      const isLive = item.state === 'live'
                      const isOpen = reading === item.key
                      return (
                        <li key={item.key} className="rounded-2xl bg-black/[.03] p-3 dark:bg-white/[.04]">
                          <button type="button" onClick={() => setReading(isOpen ? null : item.key)} aria-expanded={isOpen}
                                  className="flex w-full items-center gap-3 text-left">
                            <Thumb item={item} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold leading-snug">{item.name}</span>
                              {isOpen && <span className="mt-1 block text-[14px] leading-snug muted">{item.what}</span>}
                              {isOpen && item.needs && <span className="mt-1 block text-[13px] text-stage-paused">Needs: {item.needs}</span>}
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${TONE[st.tone]}`}>
                              {st.label}
                            </span>
                          </button>

                          {!isLive && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <button type="button"
                                      onClick={() => save(item.key, !mine?.wanted, mine?.note)}
                                      className="inline-flex min-h-[36px] items-center gap-1.5 r-inner px-3 text-[13px] font-semibold transition-colors"
                                      style={mine?.wanted
                                        ? { background: 'var(--stage-done)', color: '#fff' }
                                        : { background: 'rgb(var(--glass-line) / 0.1)' }}>
                                {mine?.wanted ? <><TickIcon size={14} /> Want this</> : 'Would use this'}
                              </button>
                              <button type="button"
                                      onClick={() => { setNoteFor(noteFor === item.key ? null : item.key); setNoteText(mine?.note || '') }}
                                      className="min-h-[36px] px-2 text-[13px] muted">
                                {mine?.note ? 'Edit note' : 'Add a note'}
                              </button>
                            </div>
                          )}

                          {mine?.note && noteFor !== item.key && (
                            <p className="mt-2 text-[14px] italic muted">“{mine.note}”</p>
                          )}

                          {noteFor === item.key && (
                            <div className="mt-2.5">
                              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} maxLength={300}
                                        placeholder="Only worth it if it also…"
                                        className="surface w-full r-inner border px-3 py-2 text-[15px] hairline" />
                              <button type="button"
                                      onClick={() => { save(item.key, mine?.wanted ?? true, noteText); setNoteFor(null) }}
                                      className="mt-2 min-h-[40px] r-inner accent-fill px-4 text-[14px] font-semibold">
                                Save note
                              </button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                    {live && (
                      <li><button type="button" onClick={() => setShowLive(false)} className="min-h-[36px] px-1 text-[13px] muted">Fold the live list</button></li>
                    )}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
