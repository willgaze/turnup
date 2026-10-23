'use client'
import PassCard, { Sliver } from '@/components/PassCard'
import Device from '@/components/Device'
import Mark from '@/components/Mark'
import { TickIcon, WalletIcon, PhoneIcon, BellIcon } from '@/components/icons'
import { STAGE_ORDER, stageOf } from '@/lib/trade-status'

/**
 * The card in their wallet, explained in pictures.
 *
 * The wallet pass is the premise of the product, and the homepage used to give
 * it one picture and two sentences. The owner's second note on it: a visitor
 * has to see first that it IS a card — the thing you double-click your phone
 * for at the airport and there it is — and the drawings need shape, not flat
 * bands. So: three phones in a row (the lock screen, the wallet opening with
 * the card in the stack, the card tapped open), then the card pulled apart in
 * three dimensions with each layer numbered, the same card at four stages
 * standing up on dark tiles, and its back. All drawn from the same PassCard
 * the real pass is built from, so nothing here can drift from it.
 *
 * Honesty: the pass has been in a real wallet since 23 Oct 2026, so the
 * strip says so. What it does not do yet is move on its own: the card shows
 * the stage at the moment it was added, and updating itself in Wallet waits
 * on the pass web service. Nothing below says otherwise.
 */
const TRADE = 'Sam Hale Plumbing'
const DEMO = {
  stage: 'ON_MY_WAY', jobRef: '2718', customerName: 'Sarah Whitfield',
  jobAddress: 'Church Lane, Burbage SN8', arrivingAt: '2026-10-01T07:00:00.000Z',
}
// Neighbours bright enough to read on a black wallet screen; still nobody's brand.
const CARDS = [
  { name: 'Coffee',  sub: '12 stamps', bg: '#f3e4cf', fg: '#3b2a16' },
  { name: 'Rail',    sub: 'Season',    bg: '#1e5c8f', fg: '#e3eef8' },
  { name: 'Gym',     sub: 'Member',    bg: '#f2f2f4', fg: '#1d1d1f' },
  { name: 'Library', sub: 'Card',      bg: '#2f7a46', fg: '#e7f2ea' },
]
const NAVY = '#1f3b57', DEEP = '#16304a', LBL = '#9db6cd', AMBER = '#f0a202'

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold tracking-wide"
        style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 10%, transparent)',
                 borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)' }}>
    {children}
  </span>
)
const H3 = ({ children }) => <h3 className="text-[20px] font-bold tracking-[-0.02em]">{children}</h3>

/* A dark tile with a pool of the tint behind whatever stands on it: the same
   floor WalletHero uses, so every drawing in this section sits on one surface. */
const Tile = ({ children, className = '', pad = 'p-5' }) => (
  <div className={`relative overflow-hidden rounded-[26px] bg-[#0b0c10] ${pad} ${className}`}>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0"
         style={{ background: 'radial-gradient(60% 50% at 50% 45%, color-mix(in srgb, var(--tint, #5856d6) 36%, transparent), transparent 72%)' }} />
    <div className="relative">{children}</div>
  </div>
)

/* --- 1. the lock screen, the wallet, the card ------------------------------ */
function LockScreen() {
  return (
    <div className="flex min-h-full flex-col px-4 pt-[52px] text-white"
         style={{ background: 'linear-gradient(180deg, #2b2a7a 0%, #5856d6 55%, #8e8cf0 100%)' }}>
      <p className="mt-6 text-center text-[17px] font-medium opacity-90">Thursday 1 October</p>
      <p className="-mt-1 text-center text-[82px] font-semibold leading-none tracking-[-0.03em]">09:41</p>
      <div className="mt-8 rounded-[22px] bg-white/85 px-3.5 py-3 text-[#15161a] shadow-lg backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white shadow-sm"><Mark className="h-5 w-auto" id="lock" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">On the way</span><span className="text-[12px] text-[#5f6672]">now</span></span>
            <span className="block text-[14px] leading-snug">{TRADE} has set off and is heading to you.</span>
          </span>
        </div>
      </div>
      <div className="mt-auto flex justify-between px-4 pb-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-black/25"><PhoneIcon size={20} /></span>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-black/25"><WalletIcon size={20} /></span>
      </div>
    </div>
  )
}

/* Apple Wallet, drawn: the bank card at the top, the passes stacked beneath,
   the TurnUp card among them. `popped` is the same screen a moment later,
   with the card tapped and lifted out. */
function WalletScreen({ popped = false }) {
  return (
    <div className="min-h-full bg-black px-4 pt-[62px] text-white">
      <div className="flex items-baseline justify-between">
        <p className="text-[30px] font-bold tracking-[-0.02em]">Wallet</p>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-[18px] leading-none">+</span>
      </div>
      <div className={`mt-3 rounded-[16px] p-4 ${popped ? 'h-[70px] opacity-40' : 'h-[150px]'}`}
           style={{ background: 'linear-gradient(135deg, #3a3a40 0%, #141418 100%)' }}>
        <div className="flex items-center justify-between"><span className="text-[13px] font-semibold opacity-80">Bank</span><span className="h-5 w-8 rounded-[4px] bg-white/25" /></div>
        {!popped && <p className="mt-[76px] text-[13px] tracking-[0.2em] opacity-60">•••• 4821</p>}
      </div>
      {popped ? (
        <div className="mt-4">
          <div className="scale-[.94] opacity-35 blur-[1.5px]">
            <Sliver card={CARDS[0]} />
            <Sliver card={CARDS[1]} className="-mt-[22px]" />
          </div>
          <div className="relative z-10 -mt-[26px] drop-shadow-[0_26px_50px_rgba(0,0,0,.7)]">
            <PassCard tracker={DEMO} tradeName={TRADE} big />
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Sliver card={CARDS[0]} />
          <Sliver card={CARDS[1]} className="-mt-[22px]" />
          {/* the card's top edge showing in the stack, as a pass does */}
          <div className="relative z-10 -mt-[22px] h-[70px] overflow-hidden rounded-[20px] drop-shadow-[0_-4px_14px_rgba(0,0,0,.5)]">
            <PassCard tracker={DEMO} tradeName={TRADE} />
          </div>
          <Sliver card={CARDS[2]} className="relative -mt-[18px]" />
          <Sliver card={CARDS[3]} className="relative -mt-[22px]" />
        </div>
      )}
    </div>
  )
}

function Journey() {
  const steps = [
    ['Double-click.', 'The side button, like at the airport.', -12, <LockScreen key="a" />, true],
    ['Their wallet opens.', 'There it is, with their other cards.', 0, <WalletScreen key="b" />, false],
    ['Tap it.', 'The job, right there.', 12, <WalletScreen key="c" popped />, false],
  ]
  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
      {steps.map(([head, sub, deg, screen, button], i) => (
        <figure key={head} className="w-[236px] shrink-0 snap-center sm:w-auto">
          <div className="relative mx-auto w-[200px] py-4">
            <Device width={200} tilt={deg} alt={head}>{screen}</Device>
            {button && (
              /* the side button, and what to do with it */
              <span className="absolute right-[-6px] top-[27%] flex items-center gap-1.5">
                <span className="h-9 w-[3px] rounded-full" style={{ background: 'var(--tint)' }} />
                <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow" style={{ background: 'var(--tint)' }}>×2</span>
              </span>
            )}
          </div>
          <figcaption className="mt-2 text-center">
            <span className="flex items-center justify-center gap-2 text-[15px] font-semibold leading-tight">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: 'var(--tint)' }}>{i + 1}</span>{head}
            </span>
            <span className="mt-1 block text-[13px] leading-snug muted">{sub}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/* --- 2. the card, pulled apart in three dimensions -------------------------- */
const Tiny = ({ children }) => <p className="text-[9px] tracking-widest" style={{ color: LBL }}>{children}</p>
const Band = ({ dark, children }) => (
  <div className="rounded-[14px] px-4 py-3 text-white" style={{ background: dark ? DEEP : NAVY }}>{children}</div>
)
const Pin = ({ n }) => (
  <span className="absolute -left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[13px] font-bold text-white ring-2 ring-[#0b0c10]"
        style={{ background: 'var(--tint)' }}>{n}</span>
)
const LEGEND = [
  'Who is coming. Which job.',
  'What is happening now. A record, never a promise.',
  'Whose job, and where.',
  'How far along. Four dots, one lit.',
  'Scan or tap: the full page opens.',
]
function Anatomy() {
  const step = STAGE_ORDER.indexOf('ON_MY_WAY')
  const bands = [
    <Band key="a"><div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: AMBER, color: NAVY }}><TickIcon size={14} /></span>
        <span className="text-[12px] font-bold uppercase tracking-wide">{TRADE}</span>
      </span>
      <span className="text-right"><Tiny>JOB</Tiny><span className="text-[13px] font-bold">#2718</span></span>
    </div></Band>,
    <Band key="b" dark><Tiny>STATUS</Tiny><p className="mt-1 text-[26px] font-bold leading-none">On my way</p><p className="mt-1.5 text-[12px]" style={{ color: '#c9d9e7' }}>Set off at 08:00</p></Band>,
    <Band key="c"><div className="grid grid-cols-2 gap-3 text-[12px]">
      <span><Tiny>CUSTOMER</Tiny><span className="font-semibold">Sarah Whitfield</span></span>
      <span><Tiny>WHERE</Tiny><span>Church Lane, Burbage</span></span>
    </div></Band>,
    <Band key="d"><div className="flex items-center">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className={`flex items-center ${i ? 'flex-1' : ''}`}>
          {i > 0 && <div className="h-[3px] flex-1" style={{ background: i <= step ? AMBER : '#33506b' }} />}
          <div className="h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: i <= step ? AMBER : '#33506b' }} />
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex justify-between text-[9px]" style={{ color: LBL }}>
      {STAGE_ORDER.map((s, i) => <span key={s} className={i === step ? 'font-bold text-white' : ''}>{stageOf(s).label}</span>)}
    </div></Band>,
    <Band key="e"><div className="flex justify-center"><QR /></div></Band>,
  ]
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
      <Tile pad="px-8 py-9 sm:px-10">
        {/* the layers stand off one another: each a step closer to the reader,
            the whole stack turned the way a card is held */}
        <div className="mx-auto max-w-[300px]" style={{ perspective: '1100px' }}>
          <div className="grid gap-3" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(22deg) rotateY(-16deg) rotateZ(4deg)' }}>
            {bands.map((b, i) => (
              <div key={i} className="relative"
                   style={{ transform: `translateZ(${i * 22}px) translateX(${i * 6}px)`,
                            filter: 'drop-shadow(0 18px 18px rgba(0,0,0,.55)) drop-shadow(0 4px 6px rgba(0,0,0,.4))' }}>
                {b}<Pin n={i + 1} />
              </div>
            ))}
          </div>
        </div>
      </Tile>
      <ol className="grid gap-2.5">
        {LEGEND.map((t, i) => (
          <li key={t} className="flex items-start gap-2.5">
            <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: 'var(--tint)' }}>{i + 1}</span>
            <span className="text-[15px] font-semibold leading-snug">{t}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* A QR-shaped block. The real pass carries a QR of the tracking link (see
   buildPassJson); this is the shape of one, not a working code — a working
   one would be a tracking link on a marketing page. */
function QR({ size = 64 }) {
  const cells = [
    '1111111010011111111', '1000001001010000001', '1011101100010111001', '1011101010110111001', '1011101001010111001',
    '1000001011010000001', '1111111010101111111', '0000000110100000000', '1101011011010110110', '0110100101101001011',
    '1001110010110110101', '0000000011010011010', '1111111000101101001', '1000001101011010110', '1011101010110011101',
    '1011101101010101010', '1011101001011011011', '1000001110100101100', '1111111011010110111',
  ]
  const n = cells.length, c = size / n
  return (
    <span className="inline-block rounded-md bg-white p-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {cells.flatMap((row, y) => [...row].map((v, x) => v === '1'
          ? <rect key={`${x}-${y}`} x={x * c} y={y * c} width={c + 0.2} height={c + 0.2} fill="#000" /> : null))}
      </svg>
    </span>
  )
}

/* --- 3. four stages, one card, standing up ---------------------------------- */
function Stages() {
  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STAGE_ORDER.map((s) => {
        const st = stageOf(s)
        return (
          <figure key={s} className={`tone-${st.tone} w-[210px] shrink-0 snap-center`}>
            <Tile pad="p-0">
              {/* a fixed-height stage with the full-size card centred in it, then
                  scaled and turned; the tile's overflow clips what the turn pushes out */}
              <div className="flex h-[330px] items-center justify-center" style={{ perspective: '1000px' }}>
                <div className="w-[300px] shrink-0" style={{ transform: 'scale(.62) rotateX(10deg) rotateY(-18deg) rotateZ(2deg)',
                                                     filter: 'drop-shadow(0 34px 34px rgba(0,0,0,.7)) drop-shadow(0 8px 10px rgba(0,0,0,.5))' }}>
                  <div className="relative overflow-hidden rounded-[22px]">
                    <PassCard tracker={{ ...DEMO, stage: s }} tradeName={TRADE} />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px]"
                         style={{ background: 'linear-gradient(118deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.07) 28%, rgba(255,255,255,0) 46%, rgba(0,0,0,.14) 100%)' }} />
                  </div>
                </div>
              </div>
            </Tile>
            <figcaption className="mt-2.5 flex items-center justify-center gap-2 text-[14px] font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--tint)' }} />{st.label}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

/* --- 4. the back ------------------------------------------------------------ */
/* backFields in buildPassJson, in the same order. */
function PassBack() {
  const rows = [
    ['Job', 'Unvented cylinder swap'],
    ['Latest', 'Cylinder is on the van — picked it up from the merchant first thing.'],
    ['Set off', '08:00'],
    ['Call', '07700 900123'],
    ['Full status', 'getturnup.com/t/K7M4PQRT'],
    ['About', `${TRADE} updates this card as the job moves. It shows what has happened, not what time anyone will arrive.`],
  ]
  return (
    <div className="overflow-hidden rounded-[22px] text-white" style={{ background: NAVY }}>
      <div className="flex items-center justify-between px-5 pt-4 text-[12px]" style={{ color: LBL }}>
        <span className="font-semibold uppercase tracking-wide">Back of the card</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white">Done</span>
      </div>
      <dl className="mt-2 divide-y divide-white/10 px-5 pb-4">
        {rows.map(([k, v]) => (
          <div key={k} className="py-2.5">
            <dt className="text-[9px] tracking-widest" style={{ color: LBL }}>{k.toUpperCase()}</dt>
            <dd className="mt-0.5 text-[13px] leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* --- 5. like the cards they already have ---------------------------------- */
const LIKE = [
  ['One per job', 'like a ticket', <TickIcon key="t" size={20} />],
  ['Beside their bank card', 'where they already look', <WalletIcon key="w" size={20} />],
  ['Will change as the job moves', 'once its update service is built: next', <BellIcon key="b" size={20} />],
  ['Scan it', 'the page opens', <PhoneIcon key="p" size={20} />],
]

export default function WalletStory() {
  return (
    <div className="grid gap-10" style={{ '--tint': '#5856d6' }}>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <H3>Where it lives</H3>
          <Badge>In Apple Wallet since 23 Oct 2026</Badge>
        </div>
        <p className="mt-1 text-[15px] muted">Add to Apple Wallet is on every job page. The buzz on the lock screen is live too.</p>
        <div className="mt-4"><Journey /></div>
      </div>

      <div>
        <H3>What is on it</H3>
        <div className="mt-4"><Anatomy /></div>
      </div>

      <div>
        <H3>It will move with the job</H3>
        <p className="mt-1 text-[15px] muted">Same card. The dot will move once its update service is built. Today the card shows the stage when it was added, and the page does the moving.</p>
        <div className="mt-4"><Stages /></div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
        <figure>
          <H3>Flip it</H3>
          <Tile className="mt-4" pad="px-8 py-8">
            <div className="mx-auto max-w-[280px]" style={{ perspective: '1000px' }}>
              <div style={{ transform: 'rotateX(8deg) rotateY(14deg) rotateZ(-2deg)', filter: 'drop-shadow(0 30px 30px rgba(0,0,0,.7)) drop-shadow(0 6px 8px rgba(0,0,0,.5))' }}>
                <PassBack />
              </div>
            </div>
          </Tile>
          <figcaption className="mt-3 text-center text-[14px] muted">The detail, on the back. Like a ticket.</figcaption>
        </figure>
        <div>
          <H3>Why a card</H3>
          <ul className="mt-4 grid gap-2.5">
            {LIKE.map(([head, sub, icon]) => (
              <li key={head} className="glass r-outer flex items-start gap-3 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                      style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>{icon}</span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight">{head}</span>
                  <span className="block text-[13px] leading-snug muted">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] leading-snug muted">The card is built. It goes in wallets when Apple signs it. Android next.</p>
        </div>
      </div>
    </div>
  )
}
