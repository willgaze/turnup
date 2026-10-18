import Link from 'next/link'
import SiteShell from '@/components/SiteShell'
import Shot from '@/components/Shot'
import { ChevronIcon, TickIcon, MessageIcon, HouseIcon, VanIcon, PeopleIcon } from '@/components/icons'

/**
 * The household card, explained to the household.
 *
 * Until this page the homepage spoke only to trades, and the half of the
 * product with a market in it (CLAUDE.md, "The household card") had no page
 * a person living somewhere could be sent to. What it says is bounded by what
 * the card does today: it fills from forwarded email, it puts people before
 * parcels, it repeats what the sender said and names them, and the forwarding
 * address never appears on the card. Reading an inbox is shown as not done,
 * because it is not (Google's restricted-scope audit).
 */
export const metadata = {
  title: 'For your home | TurnUp',
  description: 'The plumber, the sofa, four parcels. Everything coming to your door, on one card.',
  robots: { index: true, follow: true },
}

/* Drawn, not captured: an email in, a row out. Invented sender and words. */
function EmailToRow() {
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)]">
      <div className="glass r-outer p-4">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>You forward</p>
        <div className="r-inner mt-2 p-3 text-[14px]" style={{ background: 'rgb(var(--glass-line) / .07)' }}>
          <p className="font-semibold">Your sofa is on its way</p>
          <p className="mt-1 leading-snug muted">Our two-person team will deliver on Tuesday between 12:00 and 16:00.</p>
        </div>
      </div>
      <span aria-hidden="true" className="mx-auto rotate-90 sm:rotate-0" style={{ color: 'var(--tint)' }}><ChevronIcon size={24} /></span>
      <div className="glass r-outer p-4 tone-booked">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>It lands</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><VanIcon size={18} /></span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tint)' }}>Booked in</span>
            <span className="block text-[16px] font-semibold leading-tight">Your sofa</span>
            <span className="mt-0.5 block text-[14px] font-semibold" style={{ color: 'var(--tint)' }}>Hartley Home said Tuesday, 12:00–16:00</span>
          </span>
        </div>
      </div>
    </div>
  )
}

const RULES = [
  ['People first', 'Who you have to be in for comes before the parcels.', PeopleIcon],
  ['Who said it, always', '“Evri said today.” Never a time it worked out itself.', MessageIcon],
  ['Your plumber, live', 'A trade on TurnUp shows On my way, on the same card.', HouseIcon],
]

export default function ForHomes() {
  return (
    <SiteShell id="homes">
      <section className="mt-12">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--tint)' }}>For your home</p>
        <h1 className="mt-1 text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          Everything coming to your door. One card.
        </h1>
        <p className="mt-5 text-[19px] leading-snug muted">The plumber, the sofa, four parcels. In the order you have to be in for them.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/join?as=home" className="btn btn-filled !px-6">Make your card</Link>
        </div>
        <p className="mt-4 inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-semibold"
           style={{ color: 'var(--tint)', borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)' }}>
          Make one now · forwarding is being switched on
        </p>
      </section>

      <section className="mt-12">
        <Shot name="house-card" label="Your card" note="One link. Everyone who lives there can open it." fade className="mx-auto max-w-[380px]" />
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">It fills itself</h2>
        <p className="mt-2 text-[17px] leading-snug muted">Forward the email. Nothing to type.</p>
        <div className="mt-6"><EmailToRow /></div>
        <p className="mt-4 text-[15px] leading-snug muted">
          Set a mail rule once, and delivery emails go there on their own.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">How it reads</h2>
        <ul className="mt-5 grid gap-3">
          {RULES.map(([head, sub, Icon]) => (
            <li key={head} className="glass r-outer flex items-start gap-3.5 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}><Icon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold leading-tight">{head}</span>
                <span className="mt-1 block text-[15px] leading-snug muted">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">When your plumber uses it too</h2>
        <p className="mt-2 text-[17px] leading-snug muted">The row moves as they tap.</p>
        <Shot name="stage-on-my-way" label="On my way" note="Set off at 08:00. A record, not a promise." className="mt-6 max-w-[360px]" />
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">What it never does</h2>
        <ul className="mt-5 grid gap-3">
          {[
            ['It never reads your inbox.', 'You forward what you want. Nothing else is seen.'],
            ['It never puts your door on the card.', 'The card can be shared. Your way in is not on it.'],
            ['It never shows its own guess.', 'Every time on it is somebody’s word, with their name.'],
          ].map(([head, sub]) => (
            <li key={head} className="glass r-outer flex items-start gap-4 p-5">
              <span className="mt-0.5 shrink-0" style={{ color: 'var(--tint)' }}><TickIcon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold">{head}</span>
                <span className="mt-1 block text-[15px] leading-snug muted">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass r-outer mt-10 p-6 text-center">
        <p className="text-[21px] font-semibold">Make one for your home</p>
        <p className="mt-1.5 text-[16px] leading-snug muted">It builds as you go, then it is a link for everyone at home.</p>
        <Link href="/join?as=home" className="btn btn-filled mt-5 w-full sm:w-auto sm:!px-8">Make your card</Link>
      </section>
    </SiteShell>
  )
}
