import Link from 'next/link'
import Mark from '@/components/Mark'
import Waitlist from './Waitlist'
import { STAGE_ORDER, stageOf } from '@/lib/trade-status'
import { TickIcon, ChevronIcon } from '@/components/icons'
import Device from '@/components/Device'
import WalletHero from '@/components/WalletHero'
import PassCard from '@/components/PassCard'
import WalletStory from '@/components/WalletStory'
import Shot, { ShotStrip } from '@/components/Shot'
import { byGroup } from '@/lib/posters'
import FrameStrip from '@/components/FrameStrip'
import { PHASES } from '@/lib/roadmap'

/**
 * The front door — the only page here a stranger is meant to find.
 *
 * It replaced a page that said "open the link you were sent", which was the
 * right page for a customer who had mistyped a tracking link and the wrong one
 * for everybody else. That line is still here, at the bottom, where the person
 * who needs it will find it and nobody else has to read past it.
 *
 * Pictures first, few words. The page before this one explained every row of
 * the product in a paragraph with a whole phone beside it, and the owner's
 * verdict was that it was a lot of writing and overwhelming. So each thing the
 * app does is now the part of the screen that does it (public/home/crops/,
 * cut by scripts/capture-home-crops.mjs) under a label of a few words, and
 * the wallet card — the premise of the product — gets a section of drawings
 * rather than one picture and two sentences.
 *
 * INDEXABLE, and the only page here that is. Every other route carries
 * `robots: { index: false }` — a tracking link must never reach a search
 * index, and neither must the dashboard.
 *
 * Still no lookup form: the code is the only thing standing in front of a
 * customer's name and home address, and a search box is an invitation to
 * guess at other people's.
 */
export const metadata = {
  title: 'TurnUp — one card in their wallet, not a pile of emails',
  description:
    'Booked in, on my way, on site, done — on one card in your customer\'s wallet, or the same page from a text. '
    + 'Nothing to download, nothing to log in to. Works alongside ServiceM8.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'TurnUp — one card in their wallet, not a pile of emails',
    description: 'The status bar the trades never got. One card per job, in the wallet they already carry.',
    type: 'website',
  },
}

/* The job the pictures show. Same invented job as /demo and the diary, so a
   visitor who taps "See what they see" lands on the page they just looked at. */
const DEMO = {
  stage: 'ON_MY_WAY', jobRef: '2718', customerName: 'Sarah Whitfield',
  jobAddress: 'Church Lane, Burbage SN8', arrivingAt: '2026-10-01T07:00:00.000Z',
}

const H2 = ({ children }) => <h2 className="text-[26px] font-bold tracking-[-0.02em]">{children}</h2>
const Lede = ({ children }) => <p className="mt-2 text-[17px] leading-snug muted">{children}</p>

/* What the customer can do: each row of their page, opened. */
const CUSTOMER = [
  ['row-presence', 'Will someone be in?', 'Two taps. A wasted trip saved.'],
  ['row-window',   'When suits you?',     'Agree the hours, or counter them.'],
  ['row-door',     'Help them find you',  'Door, dog, pin. Kept private.', true],
  ['row-who',      'Who to expect',       'Name, face, van.'],
  ['row-notify',   'A buzz when they set off', 'Straight to their phone.'],
  ['row-job',      'The job',             'Day, address, Open in Maps.', true],
  ['row-terms',    'Before the visit',    'Terms agreed in one tap.', true],
  ['row-history',  'What has happened',   'Every stage, with the time.'],
]

/* What the trade taps: the parts of the dashboard that do the work. */
const TRADE = [
  ['trade-stage-buttons', 'Tap the stage',            'One-handed, next to the van.'],
  ['trade-send',          'Send it in one tap',       'Text, WhatsApp, or copy.'],
  ['trade-fields',        'A job is five fields',     'Thirty seconds. Their link exists.', true],
  ['trade-navigate-note', 'Navigate, and their note', 'Which door, the dog, where to park.'],
  ['trade-faceid',        'Face ID in',               'No password to forget.'],
  ['trade-plate',         'Your van, from the plate', 'Make and colour fill themselves in.'],
]

/* Everything live, from the same file the in-app roadmap reads, so this
   cannot drift from what is actually shipped. */
const LIVE = PHASES.flatMap((ph) => ph.items).filter((it) => it.state === 'live')

export default function Home() {
  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-2xl px-5 pb-16 pt-safe">

        {/* --- who this is ------------------------------------------------ */}
        <header className="flex items-center justify-between pt-5">
          <span className="flex items-center gap-2.5">
            <Mark className="h-8 w-auto" id="top" />
            <span className="text-[21px] font-bold tracking-[-0.02em]">TurnUp</span>
          </span>
          <Link href="/dashboard" className="inline-flex min-h-[44px] items-center text-[15px] font-medium"
                style={{ color: 'var(--tint)' }}>
            Sign in
          </Link>
        </header>

        {/* --- the promise, in the customer's words ------------------------ */}
        <section className="mt-12">
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
            One card in their wallet. Not a pile of emails.
          </h1>
          <p className="mt-5 text-[19px] leading-snug muted">
            Booked in, on my way, on site, done. On the card they already carry. Sits alongside ServiceM8 and the tools you already use.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#list" className="btn btn-filled !px-6">Get on the list</a>
            <Link href="/demo" className="btn btn-grey !px-6">
              See what they see <ChevronIcon size={16} />
            </Link>
          </div>
        </section>

        {/* --- what it looks like ------------------------------------------ */}
        {/* The card first and largest: it is the premise, and the owner's call
            (12 Oct 2026) was that it is the thing to show. The phone is the
            same job from a text, which is what is live today. */}
        <section className="mt-12 grid items-start gap-8 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <figure className="mx-auto w-full max-w-[400px]" style={{ '--tint': '#5856d6' }}>
            <WalletHero tracker={DEMO} tradeName="Sam Hale Plumbing" />
            <figcaption className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[14px] leading-snug muted">
              <span>The job, as a card in their wallet.</span>
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                    style={{ color: 'var(--tint)', borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)', background: 'color-mix(in srgb, var(--tint) 10%, transparent)' }}>
                Built · awaiting Apple
              </span>
            </figcaption>
          </figure>
          <figure className="mx-auto">
            <Device screen="/home/customer-on-my-way.webp" width={220} tilt={12} priority className="mx-auto"
                    alt="The page your customer opens from the text: Hello Sarah, On my way, set off at 08:00, between 09:00 and 11:00" />
            <figcaption className="mt-4 text-center text-[14px] leading-snug muted">
              The same job from a text. Live today.
            </figcaption>
          </figure>
        </section>

        {/* --- the card ---------------------------------------------------- */}
        <section className="mt-14">
          <H2>The card in their wallet</H2>
          <Lede>A boarding pass, for the plumber.</Lede>
          <div className="mt-6"><WalletStory /></div>
        </section>

        {/* --- the thing it is actually for --------------------------------
            Two panels, not two paragraphs: the text message everyone has had,
            and the card that replaces it. */}
        <section className="mt-14 grid gap-4 sm:grid-cols-2 sm:items-stretch">
          <div className="glass r-outer flex flex-col p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide muted">Now</p>
            {/* the inbox a booking turns into: drawn, nobody's brand */}
            <ul className="mt-4 divide-y divide-black/[.06] rounded-xl bg-black/[.04] text-[13px] dark:divide-white/10 dark:bg-white/[.06]">
              {[['Your booking is confirmed', 'Mon'], ['Reminder: your appointment tomorrow', 'Wed'], ['Someone will be with you between 8 and 6', 'Thu'], ['Your engineer is on the way', 'Thu'], ['How did we do? Rate your visit', 'Thu']].map(([subj, day]) => (
                <li key={subj} className="flex items-baseline gap-2 px-3 py-2">
                  <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: 'var(--mts-accent)' }} />
                  <span className="min-w-0 flex-1 truncate font-medium">{subj}</span>
                  <span className="shrink-0 text-[12px] muted">{day}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-5 text-[15px] font-semibold">Five emails. Still a day written off.</p>
          </div>
          <div className="glass r-outer flex flex-col p-5" style={{ '--tint': '#5856d6' }}>
            <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tint)' }}>With TurnUp</p>
            <div className="relative mt-4 overflow-hidden rounded-xl bg-[#0b0c10] px-6 py-6">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0"
                   style={{ background: 'radial-gradient(60% 50% at 50% 45%, color-mix(in srgb, var(--tint) 36%, transparent), transparent 72%)' }} />
              <div className="relative mx-auto max-w-[260px]" style={{ perspective: '1000px' }}>
                <div style={{ transform: 'rotateX(8deg) rotateY(-14deg) rotateZ(2deg)', filter: 'drop-shadow(0 26px 26px rgba(0,0,0,.65)) drop-shadow(0 6px 8px rgba(0,0,0,.45))' }}>
                  <PassCard tracker={DEMO} tradeName="Sam Hale Plumbing" />
                </div>
              </div>
            </div>
            <p className="mt-auto pt-5 text-[15px] font-semibold">One card. It moves. Nothing to ask.</p>
          </div>
        </section>

        {/* --- the five stages, in their real colours ---------------------- */}
        <section className="mt-14">
          <H2>Four words. One colour each.</H2>
          <Lede>Read without reading, the second time.</Lede>
          <ShotStrip>
            {[...STAGE_ORDER, 'PAUSED'].map((s) => {
              const st = stageOf(s)
              return (
                /* the word above the picture, not below: the cards are different
                   heights and a label under each would sit at five different levels */
                <div key={s} className={`tone-${st.tone} w-[256px] shrink-0 snap-center sm:w-[232px]`}>
                  <span className="mb-2.5 inline-flex items-center rounded-full px-3 py-1 text-[14px] font-semibold"
                        style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>
                    {st.label}
                  </span>
                  <Shot name={`stage-${s.toLowerCase().replace(/_/g, '-')}`} label=""
                        alt={`The status card at ${st.label}: ${st.customerLine}`} />
                </div>
              )
            })}
          </ShotStrip>
        </section>

        {/* --- the customer's side ---------------------------------------- */}
        <section className="mt-14" style={{ '--tint': '#5856d6' }}>
          <H2>What the customer can do</H2>
          <Lede>Each row, one tap. Nothing to install.</Lede>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {CUSTOMER.map(([name, label, note, fade]) => (
              <Shot key={name} name={name} label={label} note={note} fade={fade} />
            ))}
          </div>
        </section>

        {/* --- the trade's side ------------------------------------------- */}
        <section className="mt-14">
          <H2>What you tap</H2>
          <Lede>Five buttons on a phone, next to the van.</Lede>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {TRADE.map(([name, label, note, fade]) => (
              <Shot key={name} name={name} label={label} note={note} fade={fade} />
            ))}
          </div>
        </section>

        {/* --- everything it does today ------------------------------------------
            The complete list, from the same file the in-app roadmap reads, so
            this cannot drift from what is actually live. Names only. */}
        <section className="mt-14">
          <H2>Everything it does today</H2>
          <Lede>Live now, on every job. Nothing here is a promise.</Lede>
          <Link href="/with-servicem8" className="glass r-outer mt-4 flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold leading-tight">Using it with ServiceM8</span>
              <span className="mt-0.5 block text-[14px] leading-snug muted">One line in your booking text.</span>
            </span>
            <span className="shrink-0 text-[15px] font-medium" style={{ color: 'var(--tint)' }}>Read →</span>
          </Link>
          {/* Folded: the full list is a screen and a half of chips on a phone,
              and a visitor wants the count, not the inventory. <details> so it
              opens without JavaScript. */}
          <details className="group mt-4">
            <summary className="glass r-outer flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-[16px] font-semibold">{LIVE.length} things, live on every job</span>
              <span className="shrink-0 text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
                <span className="group-open:hidden">Show the list</span>
                <span className="hidden group-open:inline">Fold it</span>
              </span>
            </summary>
            <ul className="mt-4 flex flex-wrap gap-2">
              {LIVE.map((it) => (
                <li key={it.key} className="glass r-inner flex items-center gap-2 px-3 py-2 text-[14px] font-medium leading-tight">
                  <span className="shrink-0" style={{ color: 'var(--tint)' }}><TickIcon size={15} /></span>
                  {it.name}
                </li>
              ))}
            </ul>
          </details>
        </section>

        {/* --- either end ------------------------------------------------------ */}
        <section className="mt-14">
          <H2>Either end, any job</H2>
          <Lede>Today you send the link. Tomorrow you wait in. <span className="font-semibold" style={{ color: 'var(--tint)' }}>Next.</span></Lede>
          <FrameStrip frames={byGroup('either')} />
        </section>

        {/* --- where it is going --------------------------------------------------- */}
        <section className="mt-14">
          <H2>Where it is going</H2>
          <Lede>Not built yet, and marked so. You vote on the order, in the app.</Lede>
          <FrameStrip frames={byGroup('next')} />
        </section>

        {/* --- the part that is a promise about what it will NOT do -------- */}
        <section className="mt-14">
          <H2>What it will never do</H2>
          <ul className="mt-5 grid gap-3">
            {[
              ['It never invents a time.', 'No countdown. No “with you in 20 minutes”.'],
              ['It never shows a time you have not agreed.', 'Two people agree a window, or it is not shown.'],
              ['It never puts their details on a forwarded link.', 'Which door, the dog, who is in: between you and them.'],
              ['It never shows a button that does nothing.', 'A row is there because it works. No “tap to change” that cannot.'],
            ].map(([title, body]) => (
              <li key={title} className="glass r-outer flex items-start gap-4 p-5">
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--tint)' }}><TickIcon size={20} /></span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold">{title}</span>
                  <span className="mt-1 block text-[15px] leading-snug muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* --- the ask ----------------------------------------------------- */}
        <section id="list" className="mt-12 scroll-mt-6">
          <Waitlist />
        </section>

        {/* --- the page this page replaced --------------------------------- */}
        <section className="glass r-outer mt-10 p-5 text-center">
          <p className="text-[16px] font-semibold">Looking for your own job?</p>
          <p className="mt-1.5 text-[15px] leading-snug muted">
            Open the link you were texted. Lost it? Ask whoever booked the job.
          </p>
        </section>

        <footer className="mt-12 text-center">
          <Mark className="mx-auto h-6 w-auto opacity-60" id="foot" />
          <p className="mt-2 text-[13px]" style={{ color: 'var(--label-3)' }}>
            TurnUp — live job tracking for trades · <Link href="/with-servicem8" className="underline">With ServiceM8</Link> · <Link href="/privacy" className="underline">Privacy</Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
