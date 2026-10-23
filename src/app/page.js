import Link from 'next/link'
import Mark from '@/components/Mark'
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
import { SiteNav, SiteFooter } from '@/components/SiteShell'

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
 * INDEXABLE, with the other pages that explain the product (/for-trades,
 * /for-homes, /join, /with-servicem8, /privacy; see sitemap.js). Every route
 * that holds anybody's details carries
 * `robots: { index: false }` — a tracking link must never reach a search
 * index, and neither must the dashboard.
 *
 * Still no lookup form: the code is the only thing standing in front of a
 * customer's name and home address, and a search box is an invitation to
 * guess at other people's.
 */
export const metadata = {
  title: 'TurnUp — tap “On my way”, and they stop ringing',
  description:
    'One link per job, sent by text. Booked in, on my way, on site, done — your customer sees the stage and you tap one button. '
    + 'Nothing to download, nothing to log in to. Works alongside ServiceM8.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'TurnUp — tap “On my way”, and they stop ringing',
    description: 'The status bar the trades never got. One link per job, and the customer can see you have set off.',
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
  ['trade-fields',        'A job is five fields',     'Name, number, what, where, when. Their link exists.', true],
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
          <SiteNav />
        </header>

        {/* --- the promise, in the customer's words ------------------------ */}
        <section className="mt-12">
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
            Tap “On my way”. They stop ringing.
          </h1>
          <p className="mt-5 text-[19px] leading-snug muted">
            One link per job, sent by text. Booked in, on my way, on site, done: they see the stage, you tap one button. Works alongside ServiceM8.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/join" className="btn btn-filled !px-6">Get on the list</Link>
            <Link href="/demo" className="btn btn-grey !px-6">
              See what they see <ChevronIcon size={16} />
            </Link>
          </div>
        </section>

        {/* --- what it looks like ------------------------------------------ */}
        {/* The phone first: it is the job from a text, which is what is live
            today, and the thing the headline above it describes. The card is
            the premise and the owner's call (12 Oct 2026) was to show it; it
            stays here, second, under a caption that says it is next (the
            19 Oct review: the first thing a stranger read was the one thing
            not built). */}
        <section className="mt-12 grid items-start gap-8 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <figure className="mx-auto">
            <Device screen="/home/customer-on-my-way.webp" width={220} tilt={12} priority className="mx-auto"
                    alt="The page your customer opens from the text: Hello Sarah, On my way, set off at 08:00, between 09:00 and 11:00" />
            <figcaption className="mt-4 text-center text-[14px] leading-snug muted">
              The job from a text. Live today.
            </figcaption>
          </figure>
          <figure className="mx-auto w-full max-w-[400px]" style={{ '--tint': '#5856d6' }}>
            <WalletHero tracker={DEMO} tradeName="Sam Hale Plumbing" />
            <figcaption className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[14px] leading-snug muted">
              <span>Next: the same job, as a card in their wallet.</span>
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                    style={{ color: 'var(--tint)', borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)', background: 'color-mix(in srgb, var(--tint) 10%, transparent)' }}>
                Built · awaiting Apple
              </span>
            </figcaption>
          </figure>
        </section>

        {/* --- the card ---------------------------------------------------- */}
        <section className="mt-14">
          <H2>The card in their wallet: next</H2>
          <Lede>A boarding pass, for the plumber. Built; in wallets once Apple signs it.</Lede>
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
          <Lede>Live now. Nothing here is a promise.</Lede>
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
              <span className="text-[16px] font-semibold">{LIVE.length} things, live today</span>
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

        {/* --- the other half: the household card ----------------------------
            Built and running at one house, and until v1.62.0 not mentioned on
            the front page at all. */}
        <section className="mt-14">
          <H2>And for the house</H2>
          <Lede>The plumber, the sofa, four parcels. One card.</Lede>
          <div className="mt-6 grid items-start gap-6 sm:grid-cols-2">
            <Shot name="house-card" label="Everything coming to the door" note="Fills itself from forwarded emails." fade />
            <div className="grid gap-3">
              <Link href="/for-homes" className="glass r-outer flex items-center justify-between gap-3 px-4 py-4">
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-tight">How the home card works</span>
                  <span className="mt-0.5 block text-[15px] leading-snug muted">People first. Who said it, always.</span>
                </span>
                <span className="shrink-0" style={{ color: 'var(--tint)' }}><ChevronIcon size={18} /></span>
              </Link>
              <Link href="/for-trades" className="glass r-outer flex items-center justify-between gap-3 px-4 py-4">
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-tight">One job, start to finish</span>
                  <span className="mt-0.5 block text-[15px] leading-snug muted">What you tap, what they see.</span>
                </span>
                <span className="shrink-0" style={{ color: 'var(--tint)' }}><ChevronIcon size={18} /></span>
              </Link>
            </div>
          </div>
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
        {/* Two doors into /join, where the card builds as they sign up. The
            old three-field form was here; #list still lands on this. */}
        <section id="list" className="glass r-outer mt-12 scroll-mt-6 p-6">
          <p className="text-[21px] font-semibold">Want it?</p>
          <p className="mt-1.5 text-[16px] leading-snug muted">
            It runs for one plumbing firm while it is made properly. Get on the list and watch your card build as you go.
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Link href="/join?as=trade" className="btn btn-filled">I am a trade</Link>
            <Link href="/join?as=home" className="btn btn-tinted">It is for my home</Link>
          </div>
        </section>

        {/* --- the page this page replaced --------------------------------- */}
        <section className="glass r-outer mt-10 p-5 text-center">
          <p className="text-[16px] font-semibold">Looking for your own job?</p>
          <p className="mt-1.5 text-[15px] leading-snug muted">
            Open the link you were texted. Lost it? Ask whoever booked the job.
          </p>
        </section>

        <SiteFooter id="foot" />
      </main>
    </div>
  )
}
