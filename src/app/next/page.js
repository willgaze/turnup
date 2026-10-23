import Link from 'next/link'
import SiteShell from '@/components/SiteShell'
import WalletStory from '@/components/WalletStory'
import FrameStrip from '@/components/FrameStrip'
import { byGroup } from '@/lib/posters'
import { TickIcon } from '@/components/icons'

/**
 * What is coming, and what will never come.
 *
 * Until v1.72.2 all of this sat on the homepage, which was 18 screens tall on
 * a phone (the 19 Oct review, docs/review/2026-10-19.md). The homepage now
 * shows what works today and links here; this page carries the premise — the
 * card in their wallet — and every poster that is a drawing rather than a
 * capture, marked so, plus the four things the product refuses to do.
 *
 * Nothing on this page is live unless its badge says so. Keep it that way:
 * a drawing beside a real capture, with no mark between them, is a claim.
 */
export const metadata = {
  title: 'Where it is going | TurnUp',
  description: 'The card in their wallet, what comes after it, and the four things TurnUp will never do. Nothing here is live unless it says so.',
  robots: { index: true, follow: true },
}

const H2 = ({ children }) => <h2 className="text-[26px] font-bold tracking-[-0.02em]">{children}</h2>
const Lede = ({ children }) => <p className="mt-2 text-[17px] leading-snug muted">{children}</p>

const NEVER = [
  ['It never invents a time.', 'No countdown. No “with you in 20 minutes”.'],
  ['It never shows a time you have not agreed.', 'Two people agree a window, or it is not shown.'],
  ['It never puts their details on a forwarded link.', 'Which door, the dog, who is in: between you and them.'],
  ['It never shows a button that does nothing.', 'A row is there because it works. No “tap to change” that cannot.'],
]

export default function Next() {
  return (
    <SiteShell id="next">
      <section className="mt-12">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--tint)' }}>Next</p>
        <h1 className="mt-1 text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          Where it is going.
        </h1>
        <p className="mt-5 text-[19px] leading-snug muted">
          Today the link comes by text. Next it is a card in their wallet. Everything on this page is marked built, next, or never.
        </p>
      </section>

      {/* --- the card ---------------------------------------------------- */}
      <section className="mt-14" style={{ '--tint': '#5856d6' }}>
        <H2>The card in their wallet</H2>
        <Lede>A boarding pass, for the plumber. Built; in wallets once Apple signs it.</Lede>
        <div className="mt-6"><WalletStory /></div>
      </section>

      {/* --- either end ------------------------------------------------------ */}
      <section className="mt-14">
        <H2>Either end, any job</H2>
        <Lede>Today you send the link. Tomorrow you wait in. <span className="font-semibold" style={{ color: 'var(--tint)' }}>Next.</span></Lede>
        <FrameStrip frames={byGroup('either')} />
      </section>

      {/* --- after that ------------------------------------------------------ */}
      <section className="mt-14">
        <H2>After that</H2>
        <Lede>Not built yet, and marked so. You vote on the order, in the app.</Lede>
        <FrameStrip frames={byGroup('next')} />
      </section>

      {/* --- the part that is a promise about what it will NOT do -------- */}
      <section className="mt-14">
        <H2>What it will never do</H2>
        <ul className="mt-5 grid gap-3">
          {NEVER.map(([title, body]) => (
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
      <section className="glass r-outer mt-12 p-6">
        <p className="text-[21px] font-semibold">Want it?</p>
        <p className="mt-1.5 text-[16px] leading-snug muted">
          It runs for one plumbing firm while it is made properly. Get on the list and watch your card build as you go.
        </p>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Link href="/join?as=trade" className="btn btn-filled">I am a trade</Link>
          <Link href="/join?as=home" className="btn btn-tinted">It is for my home</Link>
        </div>
      </section>
    </SiteShell>
  )
}
