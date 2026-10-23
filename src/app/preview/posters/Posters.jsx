'use client'
import Device from '@/components/Device'
import WalletHero from '@/components/WalletHero'
import { CabPhoto } from '@/components/CarDisplay'
import { FRAMES } from '@/lib/posters'
import { TickIcon, PinIcon, HouseIcon, VanIcon as TruckIcon, EyeIcon as CameraIcon, StageIcon } from '@/components/icons'

/**
 * App Store-style artwork, drawn from the real screens.
 *
 * Each frame is a 621×1344 CSS canvas captured at 2× for 1242×2688, the 6.5"
 * App Store size. Big line, quiet line, then the device running off the bottom
 * — the grammar every store listing uses, because it is read at thumbnail size
 * on a phone in a queue.
 *
 * Live frames show a capture from public/home/. Frames for things not built
 * yet show a drawing (the mocks below) and carry a NEXT badge, so a visitor can
 * never mistake an idea for a feature. Recapture; never retouch.
 */
const DEMO = {
  stage: 'ON_MY_WAY', jobRef: '2718', customerName: 'Sarah Whitfield',
  jobAddress: 'Church Lane, Burbage SN8', arrivingAt: '2026-10-01T07:00:00.000Z',
}

const BADGE = { ready: 'Built · not yet signed', next: 'Next' }

/* How much of the cab photograph a poster shows. Wider than the canvas, so
 * the screen is big enough to read, shifted right so the glass sits
 * left-of-centre with the binnacle and the rim of the wheel on the right —
 * the driver's own view, not a brochure's. The overflow is clipped by the
 * wrapper below; the top fifth of the photo is masked so it rises out of the
 * poster's colour instead of meeting it on a line. */
const CAB_FIT = { van: { width: 1000, shift: '5.6em' }, car: { width: 1060, shift: '4.7em' } }

export function Poster({ p, scale = 1 }) {
  const badge = BADGE[p.state]
  return (
    <div className="relative overflow-hidden text-white"
         style={{ width: 621 * scale, height: 1344 * scale, fontSize: 16 * scale, '--tint': p.tint,
                  background: `radial-gradient(90% 60% at 50% 100%, ${p.deep} 0%, transparent 70%), linear-gradient(170deg, ${p.tint} 0%, ${p.deep} 100%)` }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-25"
           style={{ background: 'radial-gradient(45% 30% at 85% 10%, #fff, transparent 70%)' }} />
      {badge && (
        <span className="absolute right-[2.4em] top-[2.4em] rounded-full border border-white/50 bg-black/20 px-[1em] py-[0.4em] text-[0.95em] font-semibold tracking-wide backdrop-blur">
          {badge}
        </span>
      )}
      <div className="relative px-[3em] pt-[4.2em]">
        <p className="whitespace-pre-line text-[3.05em] font-bold leading-[1.02] tracking-[-0.035em]">{p.head}</p>
        <p className="mt-[1.1em] max-w-[17em] text-[1.22em] leading-snug text-white/82">{p.sub}</p>
      </div>
      <div className={`absolute inset-x-0 flex justify-center ${p.wallet ? 'inset-y-0 items-start pt-[17em]' : p.car ? 'inset-y-0 items-end overflow-hidden' : 'bottom-0'}`}>
        {p.car ? (
          <div className="relative shrink-0" style={{ transform: `translateX(${CAB_FIT[p.car.vehicle].shift})` }}>
            <CabPhoto vehicle={p.car.vehicle} ui={p.car.ui} width={CAB_FIT[p.car.vehicle].width * scale} fadeTop={0.22} />
          </div>
        ) : p.wallet ? (
          <div className="w-[36em] scale-[1.18]"><WalletHero tracker={DEMO} tradeName="Sam Hale Plumbing" className="!rounded-[2.4em] !bg-transparent" /></div>
        ) : (
          <div className="translate-y-[6%]">
            <Device screen={p.screen} alt={p.alt} width={430 * scale} tilt priority>
              {p.mock && <Mock kind={p.mock} />}
            </Device>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Mocks: the screens that do not exist yet, drawn in the app's own language */
/* so they look like what they would be, and nothing more.                   */

const Row = ({ icon, title, sub, tint, on }) => (
  <div className={`flex items-center gap-3 rounded-[18px] px-4 py-3.5 ${on ? 'bg-white shadow-sm' : 'bg-white/70'}`}>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: tint || 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>{icon}</span>
    <span className="min-w-0"><span className="block text-[15px] font-semibold text-[#15161a]">{title}</span>{sub && <span className="block text-[13px] text-[#5f6672]">{sub}</span>}</span>
  </div>
)
const Screen = ({ children, title, eyebrow }) => (
  <div className="min-h-full bg-[#eef0f3] px-4 pb-6 pt-[52px] text-[#15161a]">
    {eyebrow && <p className="text-[13px] font-semibold" style={{ color: 'var(--tint)' }}>{eyebrow}</p>}
    {title && <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">{title}</h1>}
    <div className="mt-4 grid gap-2.5">{children}</div>
  </div>
)

function Mock({ kind }) {
  if (kind === 'sms') return (
    <div className="min-h-full bg-white pt-[52px] text-[#15161a]">
      <div className="border-b border-black/10 pb-3 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#8e8e93] text-[16px] font-semibold text-white">SH</div>
        <p className="mt-1 text-[12px]">Sam Hale Plumbing ›</p>
      </div>
      <div className="px-4 pt-6">
        <p className="mb-2 text-center text-[11px] text-[#8e8e93]">Text Message · Today 07:48</p>
        <div className="ml-auto max-w-[82%] rounded-[20px] rounded-br-[6px] bg-[#34c759] px-4 py-2.5 text-[15px] leading-snug text-white">
          Hi Sarah, it’s Sam. Here’s your link for Thursday — you’ll see when I set off, when I arrive and when I’m done: getturnup.com/t/K7M4PQRT
        </div>
        <div className="ml-auto mt-2 max-w-[82%] overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-sm">
          <div className="h-[92px] bg-gradient-to-br from-[#5856d6] to-[#2b2a7a] px-4 pt-4 text-white">
            <p className="text-[11px] opacity-80">TurnUp</p>
            <p className="text-[18px] font-bold">Unvented cylinder swap</p>
            <p className="text-[12px] opacity-80">Thursday · Booked in</p>
          </div>
          <p className="px-4 py-2 text-[12px] text-[#8e8e93]">getturnup.com</p>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-[14px] text-[#8e8e93]">Text Message<span className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-[#34c759] text-white">↑</span></div>
      </div>
    </div>
  )
  if (kind === 'swap') return (
    <Screen eyebrow="This job" title="Which end are you?">
      <div className="flex gap-1.5 rounded-2xl bg-black/[.06] p-1">
        <span className="flex-1 rounded-xl bg-white py-2.5 text-center text-[14px] font-semibold shadow-sm">I’m on my way</span>
        <span className="flex-1 py-2.5 text-center text-[14px] font-semibold text-[#5f6672]">I’m waiting in</span>
      </div>
      <Row icon={<TruckIcon size={19} />} title="Thursday · Mum’s" sub="You’re taking the cot over" on />
      <Row icon={<HouseIcon size={19} />} title="Friday · Home" sub="Sofa delivery · you’re waiting in" />
      <Row icon={<HouseIcon size={19} />} title="Saturday · Home" sub="Electrician · you’re waiting in" />
      <p className="px-1 pt-2 text-[13px] text-[#5f6672]">One person moves, one waits. Either of you can be either. Send a link, or ask for one.</p>
    </Screen>
  )
  if (kind === 'household') return (
    <Screen eyebrow="14 Church Lane" title="Who can answer the door?">
      {[['Sarah', 'Home until 2'], ['Tom', 'Working from home'], ['Nan', 'In, hard of hearing — knock loudly']].map(([n, s], i) => (
        <Row key={n} icon={<span className="text-[14px] font-bold">{n[0]}</span>} title={n} sub={s} on={i === 1} />
      ))}
      <p className="px-1 pt-2 text-[13px] text-[#5f6672]">The address answers, not one phone. Whoever is in, is in.</p>
    </Screen>
  )
  if (kind === 'sm8') return (
    <Screen eyebrow="Connected" title="ServiceM8 → TurnUp">
      {[['Checked in', 'On site', 'onsite'], ['Checked out', 'Job done', 'done'], ['Job started', 'On my way', 'onway']].map(([a, b, t]) => (
        <div key={a} className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 shadow-sm">
          <span className="text-[14px] text-[#5f6672]">{a}</span>
          <span className="text-[#5f6672]">→</span>
          <span className={`tone-${t} flex items-center gap-1.5 text-[15px] font-semibold`} style={{ color: 'var(--tint)' }}><StageIcon tone={t} size={16} />{b}</span>
          <TickIcon size={16} className="ml-auto text-[#34c759]" />
        </div>
      ))}
      <p className="px-1 pt-2 text-[13px] text-[#5f6672]">You tap nothing. The card moves when the job does.</p>
    </Screen>
  )
  if (kind === 'live') return (
    <div className="relative min-h-full bg-[#e6ebe3] pt-[52px]">
      <svg viewBox="0 0 390 520" className="block w-full">
        <rect width="390" height="520" fill="#e6ebe3" />
        {[[0, 120, 390, 150], [0, 300, 390, 330], [130, 0, 160, 520], [260, 0, 285, 520]].map(([x1, y1, x2, y2], i) => (
          <rect key={i} x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="#fff" />))}
        <path d="M 40 470 C 120 420, 140 330, 200 300 S 300 200, 340 110" fill="none" stroke="#5856d6" strokeWidth="7" strokeLinecap="round" opacity=".9" />
        <circle cx="340" cy="110" r="14" fill="#fff" stroke="#34c759" strokeWidth="5" />
        <circle cx="200" cy="300" r="18" fill="#5856d6" stroke="#fff" strokeWidth="5" />
      </svg>
      <div className="absolute inset-x-4 bottom-5 rounded-[18px] bg-white px-4 py-3.5 shadow-lg">
        <p className="text-[12px] font-semibold text-[#5856d6]">On my way</p>
        <p className="text-[16px] font-semibold text-[#15161a]">Sam is on the A338</p>
        <p className="text-[13px] text-[#5f6672]">Shared only while on the way. Stops the moment he arrives.</p>
      </div>
    </div>
  )
  if (kind === 'android') return (
    <div className="min-h-full bg-[#f1f3f4] px-4 pt-[52px]">
      <p className="text-[22px] font-medium text-[#1f1f1f]">Wallet</p>
      <div className="mt-4 overflow-hidden rounded-[22px] bg-[#1f3b57] text-white shadow-xl">
        <div className="flex items-center justify-between px-5 pt-4 text-[12px] font-bold uppercase tracking-wide"><span>Sam Hale Plumbing</span><span className="opacity-70">#2718</span></div>
        <div className="mt-3 bg-[#16304a] px-5 py-5"><p className="text-[9px] tracking-widest text-[#9db6cd]">STATUS</p><p className="mt-1 text-[30px] font-bold leading-none">On my way</p><p className="mt-2 text-[13px] text-[#c9d9e7]">Set off at 08:00</p></div>
        <div className="px-5 py-4 text-[13px]"><p className="text-[9px] tracking-widest text-[#9db6cd]">WHERE</p><p>Church Lane, Burbage SN8</p></div>
      </div>
      <div className="mt-3 h-[70px] rounded-[22px] bg-[#d7e3f4]" />
      <div className="-mt-9 ml-3 h-[70px] rounded-[22px] bg-[#c8e6c9]" />
    </div>
  )
  if (kind === 'stages') return (
    <Screen eyebrow="RIBA Plan of Work" title="Stage 3 of 7">
      {[['0', 'Strategic definition', true], ['1', 'Preparation and briefing', true], ['2', 'Concept design', true], ['3', 'Spatial coordination', 'now'], ['4', 'Technical design'], ['5', 'Manufacturing and construction'], ['6', 'Handover']].map(([n, t, s]) => (
        <div key={n} className={`flex items-center gap-3 rounded-[18px] px-4 py-3 ${s === 'now' ? 'bg-white shadow-sm' : 'bg-white/60'}`}>
          <span className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold ${s ? 'bg-[#007aff] text-white' : 'bg-black/10 text-[#5f6672]'}`}>{n}</span>
          <span className={`text-[15px] ${s === 'now' ? 'font-semibold' : ''}`}>{t}</span>
          {s === 'now' && <span className="ml-auto text-[12px] font-semibold text-[#007aff]">Now</span>}
        </div>
      ))}
    </Screen>
  )
  if (kind === 'photos') return (
    <Screen eyebrow="Job done" title="Here’s how it went">
      <div className="grid grid-cols-2 gap-2">
        {['#c9d6e2', '#b8c8d8', '#d8dde3', '#aebfd0'].map((c, i) => <div key={i} className="aspect-[4/3] rounded-2xl" style={{ background: `linear-gradient(135deg, ${c}, #eef0f3)` }} />)}
      </div>
      <Row icon={<CameraIcon size={19} />} title="4 photos from Sam" sub="New cylinder, the pipework, the cupboard tidy" on />
      <div className="rounded-[18px] bg-white px-4 py-4 shadow-sm"><p className="text-[15px] font-semibold">Happy with it?</p><p className="mt-1 text-[13px] text-[#5f6672]">A review takes a minute and means a lot to a one-person firm.</p><span className="mt-3 inline-block rounded-full bg-[#ff9500] px-4 py-2 text-[14px] font-semibold text-white">Leave a review</span></div>
    </Screen>
  )
  if (kind === 'record') return (
    <Screen eyebrow="14 Church Lane" title="What has been done here">
      {[['Unvented cylinder, 210 L', 'Sam Hale Plumbing · Oct 2026', 'G3 certificate · 25-year shell warranty · 6 photos', true],
        ['Consumer unit', 'R. Patel Electrical · Mar 2025', 'EICR · Part P notified'],
        ['Boiler service', 'Hale & Sons Heating · Feb 2026', 'Next due Feb 2027'],
        ['Roof repair, rear valley', 'Downs Roofing · Aug 2024', '4 photos']].map(([t, w, d, on]) => (
        <div key={t} className={`rounded-[18px] px-4 py-3.5 ${on ? 'bg-white shadow-sm' : 'bg-white/70'}`}>
          <p className="text-[15px] font-semibold">{t}</p><p className="text-[13px] text-[#5f6672]">{w}</p><p className="mt-0.5 text-[12px]" style={{ color: 'var(--tint)' }}>{d}</p>
        </div>
      ))}
      <p className="px-1 pt-1 text-[13px] text-[#5f6672]">Stays with the house. The next trade reads it before they arrive.</p>
    </Screen>
  )
  if (kind === 'manage') return (
    <Screen eyebrow="Job 2718 · Sarah Whitfield" title="Quote to invoice">
      {[['Quote', '£1,840 · accepted 12 Sep', true], ['Booked', 'Thursday 1 October, 9–11', true], ['Done', '1 October, 13:40 · 6 photos', true], ['Invoice', '£1,840 · paid 2 October', true], ['Next service', 'Cylinder check · October 2027', false]].map(([t, d, done]) => (
        <div key={t} className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-3.5 shadow-sm">
          <span className={`grid h-7 w-7 place-items-center rounded-full ${done ? 'bg-[#34c759] text-white' : 'border-2 border-[#5f6672]/40'}`}>{done ? <TickIcon size={14} /> : null}</span>
          <span className="min-w-0"><span className="block text-[15px] font-semibold">{t}</span><span className="block text-[13px] text-[#5f6672]">{d}</span></span>
        </div>
      ))}
    </Screen>
  )
  if (kind === 'pay') return (
    <Screen eyebrow="Job done · 14 Church Lane" title="Your bill">
      <div className="rounded-[18px] bg-white px-4 py-4 shadow-sm">
        <div className="flex items-baseline justify-between"><p className="text-[15px] font-semibold">Unvented cylinder swap</p><p className="text-[22px] font-bold tracking-[-0.02em]">£1,840</p></div>
        {[['Labour, one day', '£695'], ['Megaflo Eco 210 L', '£986'], ['Fittings and sundries', '£159']].map(([t, v]) => (
          <div key={t} className="mt-2 flex justify-between border-t border-black/5 pt-2 text-[13px] text-[#5f6672]"><span>{t}</span><span>{v}</span></div>
        ))}
        <p className="mt-2 text-[12px] text-[#5f6672]">Includes VAT · as quoted on 12 September</p>
      </div>
      <span className="flex items-center justify-center gap-2 rounded-full bg-black px-4 py-3.5 text-[16px] font-semibold text-white"><span className="text-[18px]"></span>Pay £1,840</span>
      <span className="flex items-center justify-center rounded-full bg-white px-4 py-3.5 text-[15px] font-semibold shadow-sm" style={{ color: 'var(--tint)' }}>Pay by card</span>
      <Row icon={<TickIcon size={19} />} title="Receipt kept with the job" sub="12-month workmanship guarantee · 25 years on the cylinder" on />
    </Screen>
  )
  if (kind === 'pickup') return (
    <Screen eyebrow="Thursday" title="Two ends, one journey">
      <Row icon={<PinIcon size={19} />} title="Pick up · 14 Church Lane" sub="Sarah is in until 2 — side gate" on />
      <div className="mx-5 h-8 border-l-2 border-dashed border-[#5f6672]/40" />
      <Row icon={<HouseIcon size={19} />} title="Drop off · Mill Road, Pewsey" sub="Will someone be in? Asked, not yet answered" />
      <p className="px-1 pt-2 text-[13px] text-[#5f6672]">A removal, a return, a courier. Each end gets its own answer.</p>
    </Screen>
  )
  return null
}

export default function Posters({ n, key: k }) {
  const list = n ? FRAMES.filter((p, i) => String(i + 1) === String(n) || p.key === n) : FRAMES
  return (
    <div className="flex flex-wrap gap-6 bg-black p-0">
      {list.map((p) => <Poster key={p.key} p={p} />)}
    </div>
  )
}
