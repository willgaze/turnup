import Link from 'next/link'
import Mark from '@/components/Mark'
import { STAGE_ORDER, stageOf } from '@/lib/trade-status'
import { TickIcon, ChevronIcon } from '@/components/icons'
import Device from '@/components/Device'
import HomeVideo from '@/components/HomeVideo'
import WalletHero from '@/components/WalletHero'
import Shot, { ShotStrip } from '@/components/Shot'
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

/* What the customer can do: four of the rows of their page, opened. The
   whole day, in order, is /for-trades (the 19 Oct review: eight rows and
   six buttons here were five screens of a phone). */
const CUSTOMER = [
  ['row-presence', 'Will someone be in?', 'Two taps. A wasted trip saved.'],
  ['row-window',   'When suits you?',     'Agree the hours, or counter them.'],
  ['row-who',      'Who to expect',       'Name, face, van.'],
  ['row-notify',   'A buzz when they set off', 'Straight to their phone.'],
]

/* What the trade taps: the two buttons that do most of the work. */
const TRADE = [
  ['trade-stage-buttons', 'Tap the stage',            'One-handed, next to the van.'],
  ['trade-send',          'Send it in one tap',       'Text, WhatsApp, or copy.'],
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
        {/* The phone first: it is the job from a text, and the thing the
            headline above it describes. The card is the premise and the
            owner's call (12 Oct 2026) was to show it; it sits second (the
            19 Oct review put the link first while the card was unbuilt).
            Since 25 Oct 2026 the card is live and moves itself, and the
            caption says so. Whether it leads again is the owner's call. */}
        <section className="mt-12 grid items-start gap-8 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* The phone plays the job going round (v1.78.0): thirteen silent
              seconds of the real customer page, Booked in to Job done, from
              scripts/record-social.mjs. A stranger gets it from this before
              reading a word; the still it replaced showed one stage. */}
          <figure className="mx-auto">
            <Device width={220} tilt={12} priority className="mx-auto"
                    alt="The page your customer opens from the text, going round the job: Booked in, then On my way, then On site, then Job done"
                    media={<HomeVideo alt="What your customer sees, as the job moves: Booked in with the agreed hours, On my way with who to expect and when they set off, On site, then Job done" />} />
            <figcaption className="mt-4 text-center text-[14px] leading-snug muted">
              What your customer sees. One link, no app.
              <span className="block">The job from a text. Live today.</span>
            </figcaption>
          </figure>
          <figure className="mx-auto w-full max-w-[320px] sm:max-w-[400px]" style={{ '--tint': '#5856d6' }}>
            <WalletHero tracker={DEMO} tradeName="Sam Hale Plumbing" />
            <figcaption className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[14px] leading-snug muted">
              <Link href="/next" className="font-medium" style={{ color: 'var(--tint)' }}>The same job, as a card in their wallet →</Link>
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                    style={{ color: 'var(--tint)', borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)', background: 'color-mix(in srgb, var(--tint) 10%, transparent)' }}>
                In Apple Wallet
              </span>
            </figcaption>
          </figure>
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
          <Link href="/for-trades" className="glass r-outer mt-6 flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold leading-tight">One job, start to finish</span>
              <span className="mt-0.5 block text-[14px] leading-snug muted">Every row and every button, in the order a day happens.</span>
            </span>
            <span className="shrink-0" style={{ color: 'var(--tint)' }}><ChevronIcon size={18} /></span>
          </Link>
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
          <Link href="/next" className="glass r-outer mt-4 flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold leading-tight">Where it is going</span>
              <span className="mt-0.5 block text-[14px] leading-snug muted">The wallet card, what comes after, and what it will never do.</span>
            </span>
            <span className="shrink-0 text-[15px] font-medium" style={{ color: 'var(--tint)' }}>Read →</span>
          </Link>
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
              <Link href="/join?as=home" className="glass r-outer flex items-center justify-between gap-3 px-4 py-4">
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold leading-tight">Make your card</span>
                  <span className="mt-0.5 block text-[15px] leading-snug muted">Name it, forward one email, done.</span>
                </span>
                <span className="shrink-0" style={{ color: 'var(--tint)' }}><ChevronIcon size={18} /></span>
              </Link>
            </div>
          </div>
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
