'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PassCard from '@/components/PassCard'
import TileMap from '@/components/TileMap'
import {
  TickIcon, ChevronIcon, VanIcon, HouseIcon, PeopleIcon, CalendarIcon, MessageIcon,
  PinIcon, CompassIcon, PlusIcon,
} from '@/components/icons'

/**
 * Getting on the list, as a card that fills itself in.
 *
 * The homepage form asked three questions and handed back a sentence. This asks
 * the same few things one at a time, and every answer is visibly filed: it
 * lands on a card above (the card a customer would see, or the household's own
 * card) and the step folds into a row with a tick and an Edit. So the person
 * signing up watches the product happen to their own details, which explains
 * it better than any paragraph on the homepage did.
 *
 * Three rules hold it to the rest of this codebase:
 *
 *  - **Email first, and that is the sign-up.** Step one puts them on the list
 *    (the same /api/waitlist upsert). Everything after is optional and has a
 *    Skip. A seven-step form that only saves at the end is a form most people
 *    leave at step four with nothing saved.
 *  - **Only what the list needs leaves the phone**: name, email, trade (or
 *    "Household") and the outward half of the postcode, so a first area can be
 *    picked. The pin, the photos, the people who live there and the work
 *    address stay in this browser's storage. A waiting list is not a reason to
 *    hold a photo of somebody's front door beside their address, and the
 *    household's names belong to people who have not agreed to anything yet.
 *    /privacy says exactly this; if the two ever disagree, this file is right
 *    and that page is the defect.
 *  - **No step offers what does not exist.** Gmail reading needs Google's
 *    yearly paid security audit, so it is shown as not yet, with the reason.
 *    The calendar is a feed they would subscribe to, not access to theirs.
 *    Forwarding is the real way in and says when it switches on.
 */

const KEY = 'turnup-join-v1'
const EMPTY = {
  as: null, name: '', email: '', business: '', trade: '', postcode: '', outcode: '',
  line1: '', lat: null, lng: null, accuracy: null, photo: null, house: null,
  jobs: '', jobsOther: '', coming: [], people: [], work: null, workName: '', workPostcode: '',
  filed: {}, listed: false, card: null,
}

const STEPS = {
  trade: [
    { id: 'you',      title: 'You',                 must: true },
    { id: 'business', title: 'Your business' },
    { id: 'base',     title: 'Where the van starts' },
    { id: 'face',     title: 'Your face' },
    { id: 'jobs',     title: 'Where your jobs live' },
  ],
  home: [
    { id: 'you',      title: 'You',                 must: true },
    { id: 'home',     title: 'Your home' },
    { id: 'pictures', title: 'Pictures' },
    { id: 'coming',   title: 'How things reach it' },
    { id: 'people',   title: 'Who else is home' },
    { id: 'work',     title: 'A work address' },
  ],
}

const COMING = [
  { id: 'forward',  icon: MessageIcon,  head: 'Forward delivery emails', sub: 'Your own address. Live when your place opens.' },
  { id: 'calendar', icon: CalendarIcon, head: 'Arrivals in my calendar', sub: 'A calendar you subscribe to. Nothing reads yours.' },
  { id: 'gmail',    icon: CompassIcon,  head: 'Let it read my Gmail',    sub: 'Not yet. Google makes apps pass a paid security audit first. Forwarding does the same job.' },
]

const JOBS = [['servicem8', 'ServiceM8'], ['other', 'Another job app'], ['paper', 'Phone and a diary']]

const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const first = (n) => (n || '').trim().split(/\s+/)[0]

/* A picture becomes a small square (or 4:3) JPEG on the phone, so the card
   shows a picture, never a file name, and nothing large is kept. */
async function shrink(file, w, h) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const scale = Math.max(w / img.width, h / img.height)
    const sw = w / scale, sh = h / scale
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h)
    return c.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* postcodes.io: free, open data, no key, and it returns a centre for a
   postcode rather than a house. The house is the pin, placed by the person
   who lives there. */
async function lookupPostcode(pc) {
  const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc.trim())}`)
  if (!r.ok) return null
  const { result } = await r.json()
  return result ? { postcode: result.postcode, outcode: result.outcode, lat: result.latitude, lng: result.longitude } : null
}
async function postcodeAt(lat, lng) {
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1`)
    const { result } = await r.json()
    return result?.[0] ? { postcode: result[0].postcode, outcode: result[0].outcode } : null
  } catch { return null }
}

/* --- small pieces -------------------------------------------------------- */

const Skel = ({ w = 96, h = 12 }) => <span className="skel align-middle" style={{ width: w, height: h }} />

/** A value on the card: a grey bar until it is filled, then the value, once. */
const Fill = ({ v, w, className = '' }) =>
  v ? <span key={v} className={`filed-in ${className}`}>{v}</span> : <Skel w={w} />

function Thumb({ src, round, w = 56, h = 56, label }) {
  return src ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img key={src.slice(-24)} src={src} alt={label} width={w} height={h}
         className={`filed-in shrink-0 object-cover ${round ? 'rounded-full' : 'r-inner'}`} style={{ width: w, height: h }} />
  ) : (
    <span className={`shrink-0 ${round ? 'rounded-full' : 'r-inner'}`} aria-hidden="true"
          style={{ width: w, height: h, background: 'color-mix(in srgb, currentColor 9%, transparent)' }} />
  )
}

function Field({ label, hint, ...props }) {
  return (
    <label className="block text-[14px] font-medium muted">
      {label}{hint && <span className="font-normal"> {hint}</span>}
      <input {...props} className="field mt-1.5" />
    </label>
  )
}

function PhotoPick({ label, value, onPick, round, w, h }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-4">
      <Thumb src={value} round={round} w={round ? 72 : 96} h={72} label={label} />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{label}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-tinted !min-h-[40px] !px-4 !text-[14px]" onClick={() => ref.current?.click()}>
            {busy ? 'Reading…' : value ? 'Change' : 'Add a photo'}
          </button>
          {value && <button type="button" className="btn btn-grey !min-h-[40px] !px-4 !text-[14px]" onClick={() => onPick(null)}>Remove</button>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
             onChange={async (e) => {
               const f = e.target.files?.[0]
               e.target.value = ''
               if (!f) return
               setBusy(true)
               try { onPick(await shrink(f, w, h)) } catch { /* not an image we can read */ } finally { setBusy(false) }
             }} />
    </div>
  )
}

/* --- the two cards ------------------------------------------------------- */

function TradeCard({ d }) {
  const name = first(d.name)
  return (
    <div className="tone-onway">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>What your customer sees</p>
      <div key={d.business || 'none'} className="filed-in">
        <PassCard tradeName={d.business || 'Your business'}
                  tracker={{ stage: 'ON_MY_WAY', jobRef: '2718', customerName: 'Your customer', jobAddress: d.outcode ? `Their street, ${d.outcode}` : 'Their street', arrivingAt: '2026-10-01T07:00:00.000Z' }} />
      </div>
      <div className="glass r-outer mt-3 flex items-center gap-3 p-3.5">
        <Thumb src={d.photo} round w={48} h={48} label="Your photo" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight"><Fill v={name && `${name} is on the way`} w={130} /></p>
          <p className="mt-1 text-[13px] muted"><Fill v={d.trade || (d.business && 'Your van')} w={80} /></p>
        </div>
        <span style={{ color: 'var(--tint)' }}><VanIcon size={20} /></span>
      </div>
      {d.jobs && (
        <p key={d.jobs} className="filed-in mt-3 text-center text-[13px] muted">
          {d.jobs === 'servicem8' ? 'Booked in ServiceM8. The card follows the job.' : 'You tap the stage. The card follows.'}
        </p>
      )}
    </div>
  )
}

const EXAMPLE = [
  { kind: 'person', title: 'Your plumber', line: 'On the way. Set off at 08:00', tone: 'tone-onway' },
  { kind: 'thing',  title: 'A parcel',     line: 'Evri said today',              tone: 'tone-booked' },
]

function HomeCard({ d }) {
  const living = [first(d.name), ...d.people.map((p) => first(p.name))].filter(Boolean)
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
        Your card
        {d.card && <span className="filed-in rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: 'var(--stage-done, #34c759)' }}>Live</span>}
      </p>
      <div className="glass r-outer overflow-hidden">
        <div className="p-4">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--tint)' }}>
            {/* Once live, the name the card really carries; before, the street, which stays on this phone. */}
            <Fill v={d.card?.label || (d.line1 ? `${d.line1}${d.outcode ? `, ${d.outcode}` : ''}` : (d.name && `${first(d.name)}’s home`))} w={140} />
          </p>
          <p className="mt-0.5 text-[24px] font-bold leading-tight tracking-[-0.02em]">1 person coming, 1 thing arriving</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2 px-4">
          {d.lat != null ? (
            <TileMap key={`${d.lat.toFixed(5)},${d.lng.toFixed(5)}`} lat={d.lat} lng={d.lng} zoom={17} height={96} interactive={false} className="filed-in" />
          ) : (
            <span className="r-inner grid h-[96px] place-items-center muted" style={{ background: 'color-mix(in srgb, currentColor 7%, transparent)' }}><PinIcon size={20} /></span>
          )}
          <Thumb src={d.house} w={96} h={96} label="Your house" />
        </div>

        <ul className="mt-3 grid gap-2 px-4">
          {EXAMPLE.map((r) => (
            <li key={r.title} className={`${r.tone} r-inner flex items-center gap-3 p-2.5`}
                style={{ background: 'color-mix(in srgb, var(--tint) 8%, transparent)' }}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>
                {r.kind === 'person' ? <HouseIcon size={16} /> : <VanIcon size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-tight">{r.title}</span>
                <span className="block text-[13px]" style={{ color: 'var(--tint)' }}>{r.line}</span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>Example</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t px-4 py-3" style={{ borderColor: 'rgb(var(--glass-line) / .12)' }}>
          <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>Who is home</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {living.length ? living.map((n, i) => {
              const takes = i === 0 || d.people[i - 1]?.takes
              return (
                <span key={`${n}-${i}`} className="filed-in inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium"
                      style={{ background: 'color-mix(in srgb, var(--tint) 12%, transparent)' }}>
                  {n}{takes && <span style={{ color: 'var(--tint)' }}><TickIcon size={12} /></span>}
                </span>
              )
            }) : <><Skel w={54} h={24} /><Skel w={44} h={24} /></>}
          </div>
          {d.coming.includes('forward') && (
            <p key="fw" className="filed-in mt-2.5 text-[13px] muted">Forward to your own address, given when your place opens.</p>
          )}
          {d.work && d.workName && (
            <p key={d.workName} className="filed-in mt-1.5 text-[13px] muted">Also watching: {d.workName}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* --- the steps ----------------------------------------------------------- */

function summary(id, d) {
  switch (id) {
    case 'you':      return [d.name, d.email].filter(Boolean).join(' · ')
    case 'business': return [d.business, d.trade].filter(Boolean).join(' · ') || 'Skipped'
    case 'base':
    case 'home':     return [d.line1, d.postcode].filter(Boolean).join(', ') || 'Skipped'
    case 'face':     return d.photo ? 'Photo added' : 'Skipped'
    case 'pictures': return [d.photo && 'You', d.house && 'The house'].filter(Boolean).join(' and ') || 'Skipped'
    case 'jobs':     return JOBS.find(([k]) => k === d.jobs)?.[1] || 'Skipped'
    case 'coming':   return d.coming.map((c) => COMING.find((x) => x.id === c)?.head).filter(Boolean).join(', ') || 'Skipped'
    case 'people':   return d.people.length ? d.people.map((p) => first(p.name)).join(', ') : 'Just me'
    case 'work':     return d.work ? (d.workName || 'Yes') : 'No'
    default:         return ''
  }
}

function FiledRow({ step, d, onEdit, n }) {
  const thumb = step.id === 'face' || (step.id === 'pictures' && !d.house) ? d.photo : step.id === 'pictures' ? d.house : null
  return (
    <li className="filed-in glass r-outer flex items-center gap-3 p-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: 'var(--tint)' }}>
        <TickIcon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--label-3)' }}>{n}. {step.title}</span>
        <span className="block truncate text-[16px] font-medium">{summary(step.id, d)}</span>
        {step.id === 'you' && d.listed && (
          <span className="mt-0.5 block text-[13px] font-semibold" style={{ color: 'var(--tint)' }}>You are on the list</span>
        )}
      </span>
      {thumb && <Thumb src={thumb} round={step.id === 'face' || !d.house} w={40} h={40} label="" />}
      <button type="button" onClick={onEdit} className="btn btn-grey !min-h-[36px] !px-3.5 !text-[14px]">Edit</button>
    </li>
  )
}

function MapStep({ d, set, label, needLine }) {
  const [pc, setPc] = useState(d.postcode)
  const [state, setState] = useState(null) // null | 'looking' | 'notfound' | 'locating' | 'denied'
  const find = async () => {
    if (!POSTCODE.test(pc.trim())) { setState('notfound'); return }
    setState('looking')
    try {
      const hit = await lookupPostcode(pc)
      if (!hit) { setState('notfound'); return }
      set({ ...hit, accuracy: null })
      setPc(hit.postcode)
      setState(null)
    } catch { setState('notfound') }
  }
  const here = () => {
    if (!navigator.geolocation) { setState('denied'); return }
    setState('locating')
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude: lat, longitude: lng, accuracy } = p.coords
      const near = await postcodeAt(lat, lng)
      set({ lat, lng, accuracy: Math.round(accuracy), ...(near || {}) })
      if (near) setPc(near.postcode)
      setState(null)
    }, () => setState('denied'), { enableHighAccuracy: true, timeout: 15000 })
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label={label} value={pc} autoComplete="postal-code" autoCapitalize="characters" placeholder="SN8 4AB"
                 onChange={(e) => setPc(e.target.value.toUpperCase())}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find() } }} />
        </div>
        <button type="button" onClick={find} className="btn btn-tinted !min-h-[48px] shrink-0 !px-4">
          {state === 'looking' ? 'Finding…' : 'Find'}
        </button>
      </div>
      <button type="button" onClick={here} className="inline-flex items-center gap-1.5 self-start text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
        <PinIcon size={16} /> {state === 'locating' ? 'Finding you…' : 'Use where I am now'}
      </button>
      {state === 'notfound' && <p className="text-[14px]" style={{ color: '#ff3b30' }}>That postcode did not come up. Check it, or use where you are now.</p>}
      {state === 'denied' && <p className="text-[14px] muted">The phone did not share a location. Type the postcode instead.</p>}

      {d.lat != null && (
        <>
          <TileMap lat={d.lat} lng={d.lng} zoom={17} height={250} onMove={({ lat, lng }) => set({ lat, lng })} />
          <p className="text-[14px] muted">
            Drag the map until the pin is on {needLine ? 'your front door' : 'where you set off from'}.
            {d.accuracy > 60 && ` The phone was only sure to about ${d.accuracy} m, so check it.`}
          </p>
          {/* Google's own Street View, in Google's own tab. Showing their
              imagery on this page beside an OpenStreetMap map is against
              their terms, and it cannot be kept, so it is a link to look,
              not a picture to save. */}
          <a href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${d.lat.toFixed(6)},${d.lng.toFixed(6)}`}
             target="_blank" rel="noreferrer" className="self-start text-[15px] font-medium underline" style={{ color: 'var(--tint)' }}>
            Check the pin on Street View
          </a>
        </>
      )}
      {needLine && (
        <Field label="House name or number, and street" value={d.line1} autoComplete="address-line1" maxLength={80}
               placeholder="14 Church Lane" onChange={(e) => set({ line1: e.target.value })} />
      )}
    </div>
  )
}

function StepBody({ id, d, set }) {
  switch (id) {
    case 'you':
      return (
        <div className="grid gap-3">
          <Field label="Your name" value={d.name} autoComplete="name" maxLength={60} placeholder={d.as === 'trade' ? 'Sam Hale' : 'Sarah Whitfield'}
                 onChange={(e) => set({ name: e.target.value })} />
          <Field label="Email" type="email" inputMode="email" autoComplete="email" maxLength={200} value={d.email}
                 placeholder={d.as === 'trade' ? 'you@yourfirm.co.uk' : 'you@example.com'} onChange={(e) => set({ email: e.target.value })} />
        </div>
      )
    case 'business':
      return (
        <div className="grid gap-3">
          <Field label="Business name" value={d.business} autoComplete="organization" maxLength={60} placeholder="Sam Hale Plumbing"
                 onChange={(e) => set({ business: e.target.value })} />
          <Field label="Your trade" value={d.trade} maxLength={60} placeholder="Plumber" onChange={(e) => set({ trade: e.target.value })} />
        </div>
      )
    case 'base':
      return <MapStep d={d} set={set} label="Postcode you work from" />
    case 'home':
      return <MapStep d={d} set={set} label="Your postcode" needLine />
    case 'face':
      return (
        <div className="grid gap-2">
          <PhotoPick label="Your face" value={d.photo} onPick={(photo) => set({ photo })} round w={320} h={320} />
          <p className="text-[14px] muted">Your customer sees it from On my way, so they know who is at the door.</p>
        </div>
      )
    case 'pictures':
      return (
        <div className="grid gap-4">
          <PhotoPick label="You" value={d.photo} onPick={(photo) => set({ photo })} round w={320} h={320} />
          <PhotoPick label="The front of the house" value={d.house} onPick={(house) => set({ house })} w={480} h={480} />
          <p className="text-[14px] muted">For whoever is coming, so they find the right door. Never on a link anyone else can open.</p>
        </div>
      )
    case 'jobs':
      return (
        <div className="grid gap-2">
          {JOBS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => set({ jobs: k })} aria-pressed={d.jobs === k}
                    className="glass r-outer flex items-center justify-between p-3.5 text-left text-[16px] font-medium"
                    style={d.jobs === k ? { boxShadow: 'inset 0 0 0 2px var(--tint)' } : undefined}>
              {label}{d.jobs === k && <span style={{ color: 'var(--tint)' }}><TickIcon size={18} /></span>}
            </button>
          ))}
          {d.jobs === 'servicem8' && (
            <Link href="/with-servicem8" className="mt-1 text-[15px] font-medium underline" style={{ color: 'var(--tint)' }}>
              How it works with ServiceM8
            </Link>
          )}
        </div>
      )
    case 'coming':
      return (
        <div className="grid gap-2">
          {COMING.map(({ id: k, icon: Icon, head, sub }) => {
            const on = d.coming.includes(k)
            return (
              <button key={k} type="button" aria-pressed={on}
                      onClick={() => set({ coming: on ? d.coming.filter((x) => x !== k) : [...d.coming, k] })}
                      className="glass r-outer flex items-start gap-3 p-3.5 text-left"
                      style={on ? { boxShadow: 'inset 0 0 0 2px var(--tint)' } : undefined}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><Icon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-tight">{head}</span>
                  <span className="mt-0.5 block text-[14px] leading-snug muted">{sub}</span>
                </span>
                {on && <span style={{ color: 'var(--tint)' }}><TickIcon size={18} /></span>}
              </button>
            )
          })}
          <p className="text-[14px] muted">Pick what you would use. It tells me what to build first.</p>
        </div>
      )
    case 'people':
      return <People d={d} set={set} />
    case 'work':
      return (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {[[true, 'Yes'], [false, 'No']].map(([v, label]) => (
              <button key={label} type="button" onClick={() => set({ work: v })} aria-pressed={d.work === v}
                      className="glass r-outer p-3.5 text-[16px] font-medium"
                      style={d.work === v ? { boxShadow: 'inset 0 0 0 2px var(--tint)' } : undefined}>{label}</button>
            ))}
          </div>
          {d.work && (
            <>
              <Field label="Business name" value={d.workName} maxLength={60} placeholder="Where you work" onChange={(e) => set({ workName: e.target.value })} />
              <Field label="Its postcode" value={d.workPostcode} maxLength={10} autoCapitalize="characters" placeholder="SN8 1AA"
                     onChange={(e) => set({ workPostcode: e.target.value.toUpperCase() })} />
            </>
          )}
        </div>
      )
    default:
      return null
  }
}

function People({ d, set }) {
  const [name, setName] = useState('')
  const [takes, setTakes] = useState(true)
  const add = () => {
    if (!name.trim()) return
    set({ people: [...d.people, { name: name.trim().slice(0, 40), takes }] })
    setName('')
  }
  return (
    <div className="grid gap-3">
      {d.people.length > 0 && (
        <ul className="grid gap-2">
          {d.people.map((p, i) => (
            <li key={`${p.name}-${i}`} className="glass r-outer flex items-center gap-3 p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: 'var(--tint)' }}>{p.name[0]?.toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium">{p.name}</span>
                <span className="block text-[13px] muted">{p.takes ? 'Can take a parcel' : 'Sees the card'}</span>
              </span>
              <button type="button" className="text-[14px] font-medium muted" onClick={() => set({ people: d.people.filter((_, j) => j !== i) })}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Their name" value={name} maxLength={40} placeholder="Tom" onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        </div>
        <button type="button" onClick={add} className="btn btn-tinted !min-h-[48px] shrink-0 !px-4" aria-label="Add this person"><PlusIcon size={18} /> Add</button>
      </div>
      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={takes} onChange={(e) => setTakes(e.target.checked)} className="h-5 w-5" style={{ accentColor: 'var(--tint)' }} />
        Can take a parcel or let someone in
      </label>
      <p className="text-[14px] muted">Kept on this phone. When it is live, each person gets their own link and says yes themselves.</p>
    </div>
  )
}

/* --- making the home card real (v1.63.0) -------------------------------- */

/**
 * The end of the home path: the card on this phone becomes a real /h/ link.
 *
 * Only the name the household picks for it goes to the server; the card is a
 * link that gets shared, so it never carries the street, the pin, the photos
 * or who lives there. The forwarding address comes back once and is kept on
 * this phone, and is shown only when the letterbox is actually receiving.
 */
function GoLive({ d, set, onRestart }) {
  const [label, setLabel] = useState(d.card?.label || (d.name ? `${first(d.name)}’s home` : 'Our home'))
  const [state, setState] = useState(null) // null | 'making' | error text
  const [receiving, setReceiving] = useState(null)
  const [copied, setCopied] = useState(null)
  const url = d.card ? `${typeof window !== 'undefined' ? window.location.origin : 'https://www.getturnup.com'}/h/${d.card.code}` : null

  useEffect(() => {
    if (!d.card) return
    fetch('/api/places').then((r) => r.json()).then((b) => setReceiving(Boolean(b.receiving))).catch(() => setReceiving(false))
  }, [d.card])

  const make = async () => {
    setState('making')
    try {
      const r = await fetch('/api/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) })
      const b = await r.json().catch(() => ({}))
      if (!r.ok || !b.code) {
        setState(b.error === 'too_many' ? 'That is a few cards now. Give it an hour.' : 'That did not work. Try again in a moment.')
        return
      }
      set({ card: { code: b.code, label: b.label, inbox: b.inbox } })
      setState(null)
    } catch {
      setState('That did not work. Check the signal and try again.')
    }
  }
  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what) } catch { setCopied(null) }
  }
  const share = async () => {
    try { await navigator.share({ title: d.card.label || 'Our home', url }) } catch { copy(url, 'link') }
  }

  if (!d.card) {
    return (
      <div className="glass r-outer filed-in mt-4 p-5">
        <p className="text-[20px] font-semibold">Make it live</p>
        <p className="mt-1 text-[16px] leading-snug muted">Your card becomes a link for everyone at home. Only its name goes on it.</p>
        <div className="mt-4">
          <Field label="Name on the card" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
        </div>
        {state && state !== 'making' && (
          <p className="r-inner mt-3 p-3 text-[14px]" style={{ background: 'color-mix(in srgb, #ff3b30 12%, transparent)', color: '#ff3b30' }}>{state}</p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={make} disabled={state === 'making' || !label.trim()} className="btn btn-filled disabled:opacity-40">
            {state === 'making' ? 'Making it…' : 'Make my card live'}
          </button>
          <button type="button" onClick={onRestart} className="btn btn-grey">Start again</button>
        </div>
        {d.listed && <p className="mt-3 text-center text-[13px]" style={{ color: 'var(--label-3)' }}>You are on the list either way.</p>}
      </div>
    )
  }

  return (
    <div className="glass r-outer filed-in mt-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: 'var(--tint)' }}><TickIcon size={22} /></span>
        <span className="min-w-0">
          <span className="block text-[20px] font-semibold leading-tight">Your card is live</span>
          <span className="block truncate text-[15px] muted">{d.card.label || 'Your home'}</span>
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={url} className="btn btn-filled">Open your card</a>
        <button type="button" onClick={share} className="btn btn-tinted">{copied === 'link' ? 'Link copied' : 'Share with who lives there'}</button>
      </div>

      <div className="r-inner mt-4 p-4" style={{ background: 'rgb(var(--glass-line) / .07)' }}>
        <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>Forward delivery emails to</p>
        {receiving ? (
          <>
            <p className="mt-1 break-all font-mono text-[15px] font-semibold">{d.card.inbox}</p>
            <button type="button" onClick={() => copy(d.card.inbox, 'inbox')} className="btn btn-grey mt-2 !min-h-[40px] !px-4 !text-[14px]">
              {copied === 'inbox' ? 'Copied' : 'Copy the address'}
            </button>
            <p className="mt-2 text-[14px] leading-snug muted">Keep it to yourself. It is the one way onto your card. The card link is the one to share.</p>
            {/* The quick proof is one email forwarded by hand. Doing it
                automatically, Gmail first sends a code to this address, and
                the card shows it (src/lib/gmail-confirm.js). */}
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-[15px] font-semibold [&::-webkit-details-marker]:hidden" style={{ color: 'var(--tint)' }}>
                Make Gmail send them on its own
              </summary>
              <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-[14px] leading-snug">
                <li>Try one first: forward any delivery email to the address above. It shows on your card.</li>
                <li>On a computer, Gmail → Settings → See all settings → Forwarding and POP/IMAP → Add a forwarding address. Paste the address.</li>
                <li>Gmail sends a code to your card. Open your card and tap Confirm in Gmail.</li>
                <li>Then Filters → Create a filter, From: the delivery firms you use, and choose Forward it to this address.</li>
              </ol>
            </details>
          </>
        ) : (
          <p className="mt-1 text-[15px] leading-snug muted">
            {receiving === null ? 'Checking…' : 'Not switched on yet. Your own address appears here, on this phone, when it is.'}
          </p>
        )}
      </div>

      <p className="mt-3 text-[13px] leading-snug" style={{ color: 'var(--label-3)' }}>
        Saved on this phone. Start again forgets it here, so keep the link first.
      </p>
      <button type="button" onClick={onRestart} className="mt-2 text-[14px] font-medium muted underline">Start again</button>
    </div>
  )
}

/* --- the page ------------------------------------------------------------ */

export default function Join() {
  const [d, setD] = useState(EMPTY)
  const [ready, setReady] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const stepRef = useRef(null)

  // Restore a half-finished card, then remember every change. Storage can be
  // missing (private tabs, blocked site data), so every touch is wrapped and
  // the page works without it.
  useEffect(() => {
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { /* none */ }
    const as = new URLSearchParams(window.location.search).get('as')
    setD({ ...EMPTY, ...(saved || {}), ...(!saved?.as && (as === 'trade' || as === 'home') ? { as } : {}) })
    setReady(true)
  }, [])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* full or blocked */ }
  }, [d, ready])

  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const steps = d.as ? STEPS[d.as] : []
  const current = editing || steps.find((s) => !d.filed[s.id])?.id || null
  const done = steps.length > 0 && steps.every((s) => d.filed[s.id])
  const at = Math.max(0, steps.findIndex((s) => s.id === current))

  // Only these leave the phone. The upsert never blanks a field it was not
  // sent, so a later step adds to the row without retyping the first.
  const post = (x) => fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: x.email.trim(), name: x.name.trim() || undefined,
      trade: x.as === 'home' ? 'Household' : (x.trade.trim() || undefined),
      town: x.outcode || undefined,
    }),
  })

  const file = async (id, skip = false) => {
    setError(null)
    if (id === 'you') {
      if (!EMAIL.test(d.email.trim())) { setError('That email does not look right. Check it over.'); return }
      setSending(true)
      try {
        const r = await post(d)
        if (!r.ok) {
          const b = await r.json().catch(() => ({}))
          setError(b.error === 'too_many' ? 'That is a few tries now. Give it an hour.' : 'That did not save. Try again in a moment.')
          return
        }
        set({ listed: true })
      } catch {
        setError('That did not save. Check the signal and try again.')
        return
      } finally {
        setSending(false)
      }
    } else if (!skip && d.listed && ['business', 'base', 'home'].includes(id)) {
      post(d).catch(() => {}) // a better row is a bonus, never a blocker
    }
    if (skip) {
      if (id === 'face') set({ photo: null })
      if (id === 'pictures') set({ photo: null, house: null })
    }
    setD((x) => ({ ...x, filed: { ...x.filed, [id]: true } }))
    setEditing(null)
    requestAnimationFrame(() => stepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  const canGo = (id) => {
    if (id === 'you') return d.name.trim() && d.email.trim()
    if (id === 'home') return d.lat != null && d.line1.trim()
    if (id === 'base') return d.lat != null
    if (id === 'work') return d.work === false || (d.work && d.workName.trim())
    return true
  }

  const restart = () => {
    try { localStorage.removeItem(KEY) } catch { /* fine */ }
    setD(EMPTY); setEditing(null); setError(null)
  }

  if (!ready) return <div className="min-h-[60vh]" />

  /* --- who is this for ---------------------------------------------------- */
  if (!d.as) {
    return (
      <div className="grid gap-3">
        <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]">Get on the list</h1>
        <p className="text-[17px] leading-snug muted">Pick one. Your card builds as you go.</p>
        {[
          ['trade', VanIcon, 'I am a trade', 'Show my customers where I am'],
          ['home', HouseIcon, 'It is for my home', 'Everything coming to my door, on one card'],
        ].map(([as, Icon, head, sub]) => (
          <button key={as} type="button" onClick={() => set({ as })}
                  className="glass r-outer mt-1 flex items-center gap-4 p-5 text-left">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><Icon size={24} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[19px] font-semibold">{head}</span>
              <span className="mt-0.5 block text-[15px] leading-snug muted">{sub}</span>
            </span>
            <ChevronIcon size={18} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {/* The card. On a phone it sits above the steps; on a wide screen it
          stays in view beside them. */}
      <div className="min-w-0 lg:sticky lg:top-6 lg:order-2">
        {d.as === 'trade' ? <TradeCard d={d} /> : <HomeCard d={d} />}
      </div>

      <div className="min-w-0 lg:order-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold">
            {done ? 'All filed' : `Step ${at + 1} of ${steps.length}`}
          </p>
          <button type="button" onClick={() => set({ as: d.as === 'trade' ? 'home' : 'trade', filed: { you: d.filed.you } })}
                  className="text-[14px] font-medium" style={{ color: 'var(--tint)' }}>
            {d.as === 'trade' ? 'It is for my home instead' : 'I am a trade instead'}
          </button>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {steps.map((s) => (
            <span key={s.id} className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: d.filed[s.id] ? 'var(--tint)' : s.id === current ? 'color-mix(in srgb, var(--tint) 45%, transparent)' : 'rgb(var(--glass-line) / .14)' }} />
          ))}
        </div>

        <ol className="mt-5 grid gap-2.5">
          {steps.map((s, i) => {
            if (s.id === current) {
              return (
                <li key={s.id} ref={stepRef} className="glass r-outer scroll-mt-4 p-5">
                  <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tint)' }}>{i + 1}. {s.title}</p>
                  <div className="mt-3"><StepBody id={s.id} d={d} set={set} /></div>
                  {error && (
                    <p className="r-inner mt-3 p-3 text-[14px]" style={{ background: 'color-mix(in srgb, #ff3b30 12%, transparent)', color: '#ff3b30' }}>{error}</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button type="button" disabled={!canGo(s.id) || sending} onClick={() => file(s.id)}
                            className="btn btn-filled flex-1 disabled:opacity-40">
                      {sending ? 'Saving…' : s.id === 'you' && !d.listed ? 'Put me on the list' : 'Save and carry on'}
                    </button>
                    {!s.must && !editing && (
                      <button type="button" onClick={() => file(s.id, true)} className="btn btn-grey">Skip</button>
                    )}
                  </div>
                  {s.id === 'you' && (
                    <p className="mt-3 text-[13px]" style={{ color: 'var(--label-3)' }}>
                      One email when there is a place for you. Not a newsletter.
                    </p>
                  )}
                </li>
              )
            }
            if (d.filed[s.id]) return <FiledRow key={s.id} step={s} d={d} n={i + 1} onEdit={() => { setError(null); setEditing(s.id) }} />
            return (
              <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5 opacity-55">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[14px] font-semibold" style={{ borderColor: 'rgb(var(--glass-line) / .25)' }}>{i + 1}</span>
                <span className="text-[16px] font-medium">{s.title}</span>
              </li>
            )
          })}
        </ol>

        {done && d.as === 'home' && <GoLive d={d} set={set} onRestart={restart} />}

        {done && d.as === 'trade' && (
          <div className="glass r-outer filed-in mt-4 p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: 'var(--tint)' }}><TickIcon size={24} /></span>
            <p className="mt-3 text-[20px] font-semibold">You are on the list</p>
            <p className="mt-1.5 text-[16px] leading-snug muted">
              Your card is saved on this phone. When your place opens, it goes live from here.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/demo" className="btn btn-tinted">See a live job</Link>
              <button type="button" onClick={restart} className="btn btn-grey">Start again</button>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-start gap-2.5 text-[13px] leading-snug" style={{ color: 'var(--label-3)' }}>
          <span className="mt-0.5 shrink-0"><PeopleIcon size={16} /></span>
          <p>
            Sent to me: your name, email, {d.as === 'trade' ? 'trade' : 'that it is for a home'} and the first half of your postcode{d.as === 'home' ? ', and the name on your card if you make it live' : ''}.
            Everything else stays on this phone. <Link href="/privacy" className="underline">Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
