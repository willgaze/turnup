import Link from 'next/link'
import Mark from '@/components/Mark'
import { CANONICAL_HOST } from '@/lib/trade'

export const metadata = {
  title: 'Privacy — TurnUp',
  description: 'What TurnUp holds, who can read it, and how long it is kept. Written from what the code actually does.',
  robots: { index: true },
}

/**
 * Required before TurnUp can be listed in the ServiceM8 add-on store: their
 * store requirements take a link to the developer's own privacy policy, and a
 * listing without one cannot be submitted.
 *
 * It is written from what the code does, not from a template, because this is
 * the same product that refuses to state a time it has not been told. Every
 * claim below is checkable in the repository, and the headings name the file:
 * if a claim here and the code disagree, the code is right and this page is a
 * defect. `src/lib/clean-text.js`, `publicShape()` in `src/lib/trade-status.js`
 * and `scripts/check-public-shape.mjs` are the three that matter most.
 *
 * Deliberately NOT a cookie banner: TurnUp sets one cookie, the operator's own
 * sign-in, and no analytics or advertising script runs on any page.
 */

const UPDATED = '17 October 2026'

const H2 = ({ children }) => (
  <h2 className="mt-11 text-[24px] font-bold leading-tight tracking-[-0.02em]">{children}</h2>
)
const P = ({ children }) => <p className="mt-3 text-[16px] leading-relaxed">{children}</p>
const Note = ({ children }) => <p className="mt-3 text-[14px] leading-relaxed muted">{children}</p>

function Table({ head, rows }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[15px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-black/10 py-2 pr-4 text-left text-[13px] font-semibold uppercase tracking-[0.08em] muted dark:border-white/10">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i} className="border-b border-black/[.06] py-2.5 pr-4 align-top leading-snug dark:border-white/[.08]">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Privacy() {
  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-2xl px-5 pb-20 pt-safe">
        <header className="flex items-center justify-between pt-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="TurnUp home">
            <Mark className="h-8 w-auto" id="top" />
            <span className="text-[21px] font-bold tracking-[-0.02em]">TurnUp</span>
          </Link>
        </header>

        <section className="mt-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.13em] muted">Privacy</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">
            What TurnUp holds, and who can read it.
          </h1>
          <P>
            TurnUp shows a customer where their tradesperson’s job has got to. Doing that needs
            a name, an address and a phone number, which is most of what anyone would want to
            steal, so the short version is: the trade sees their own jobs behind a password, the
            customer sees only what the trade told them, and nothing is sold or shared with
            anybody.
          </P>
          <Note>Last updated {UPDATED}. TurnUp is operated by its developer as a sole trader in the United Kingdom.</Note>
        </section>

        <H2>Who is who</H2>
        <P>
          Two different people use TurnUp and the law treats them differently.
        </P>
        <P>
          The <strong>tradesperson</strong> decides what goes on a job card — the customer’s name,
          address and number, and what is said about the visit. They are the data controller for
          that. TurnUp is their processor: it holds that information and shows it, and does nothing
          else with it.
        </P>
        <P>
          The <strong>customer</strong> opens a link. TurnUp holds what they answer back (whether
          someone will be in, a door note, a private message to the trade) on behalf of that same
          tradesperson.
        </P>

        <H2>What is held</H2>
        <Table
          head={['What', 'Why', 'How long']}
          rows={[
            ['Customer name, address, phone, job reference and what the job is', 'It is the job card. The address is what the trade drives to.', 'Until the trade deletes the job or closes the account'],
            ['Stage changes, notes, arrival window, and the time of each', 'The record the customer reads, and the trade’s own evidence of what was said when', 'With the job'],
            ['Answers the customer gives: will someone be in, door and access notes, a private note after the job', 'So the trade knows what to expect at the door', 'With the job'],
            ['A map pin, where one is dropped', 'Turn-by-turn to the right gate rather than near it', 'With the job'],
            ['Push notification subscriptions', 'To send “has set off” to a phone', 'Until the browser discards it or notifications are switched off'],
            ['The trade’s own details: business name, photo, van and plate', 'Shown to the customer from “on my way”, so they know who is at the door', 'Until changed or deleted'],
            ['ServiceM8 bookings, where a trade connects ServiceM8', 'So the card follows the job without anything being retyped', 'With the job'],
            ['The waiting list (/join): name, email, trade or “a home”, and the first half of a postcode', 'To email you once, when there is a place', 'Until you ask for it to be removed'],
            ['A household card made on /join: the name chosen for it, and its two codes', 'The card is a link for the people who live there; the second code is its forwarding address and is shown only on the phone that made it', 'Until the card is switched off'],
            ['What else you type into /join: the map pin, photos, who else is home, a work address', 'Builds your card on the page as you go. It is kept in your own browser and never sent to TurnUp', 'Until you tap Start again or clear the browser'],
            ['Emails forwarded to a household card’s inbox address', 'The sender, the subject and the text are read for an arrival and a date; the message itself is not kept', 'The arrival row stays on the card; the email is not stored'],
          ]}
        />
        <P>
          There is no analytics, no advertising and no tracking script on any page. TurnUp sets one
          cookie: the tradesperson’s own sign-in. A customer’s link sets none.
        </P>

        <H2>Who can read it</H2>
        <P>
          <strong>The link in the URL is the credential.</strong> A customer has no account. Anyone
          holding that link can see the page, so what the page shows is deliberately narrow, and
          what it shows is one rule:
        </P>
        <P className="mt-3">
          <em>It carries what the trade told the customer. It never carries what the customer told
          the trade.</em>
        </P>
        <P>
          So the stage, the day, an agreed window, the trade’s name and face are on the page. The
          customer’s own answers are not: whether anyone will be in, the door note, the dog, the
          photos of the house, a private message. Those live on the device that gave them and on
          the trade’s dashboard, behind the trade’s password. A link forwarded into a family group
          chat shows a stage and a street — never a way in.
        </P>
        <P>
          A link can be switched off at any time by the trade, and stops working the moment it is.
          Every page tells search engines not to index it.
        </P>
        <P>
          Notifications are the least private surface here, because they are read by whoever picks
          the phone up. One carries the trade’s name and the stage, and nothing else — never the
          address, never the job reference, never the customer’s name, never a free-text note.
        </P>

        <H2>Who it is shared with</H2>
        <P>
          Nobody, in the sense that matters: TurnUp does not sell, rent or share anything with
          advertisers, data brokers or anyone else, and there is no onward sharing between the
          trades who use it. Each trade sees their own jobs and no one else’s.
        </P>
        <P>These are the services it runs on, and all it sends them is what they need to do their job:</P>
        <Table
          head={['Service', 'What it sees']}
          rows={[
            ['Vercel (hosting)', 'Requests to the site, in the EU and US'],
            ['Neon (database)', 'Everything in the table above, at rest'],
            ['ServiceM8', 'Only where a trade connects their own account: the bookings TurnUp reads and the texts and diary lines it writes'],
            ['Apple and Google push services', 'An anonymous subscription and the notification text'],
            ['Cloudflare', 'Where a household card uses email forwarding: the forwarded message, in transit'],
            ['Anthropic', 'Only when the trade uses the Ask box on their own dashboard: that trade’s job list, with every phone number taken out'],
            ['DVSA and DVLA', 'Only when a trade looks up their own van: the number plate'],
            ['postcodes.io and OpenStreetMap', 'On /join: the postcode you type, and the map squares around it. Your browser asks them directly'],
          ]}
        />
        <P>
          Tokens for a connected ServiceM8 account are encrypted before they are stored.
          Disconnecting the add-on deletes them.
        </P>

        <H2>Your rights</H2>
        <P>
          Under UK GDPR you can ask for a copy of what is held about you, ask for it to be
          corrected, or ask for it to be deleted.
        </P>
        <P>
          <strong>If you are a customer</strong> who has had a TurnUp link: the tradesperson who
          sent it decides what happens to it. Ask them first — they can delete the job, which
          removes everything on it. If you cannot reach them, write to the address below and TurnUp
          will act on it.
        </P>
        <P>
          <strong>If you are a tradesperson</strong>: everything is on your dashboard, and asking
          for the account to be deleted removes every job on it.
        </P>
        <P>
          If something is not put right, you can complain to the Information Commissioner’s Office
          at <a href="https://ico.org.uk" target="_blank" rel="noreferrer noopener" style={{ color: 'var(--tint)' }}>ico.org.uk</a>.
        </P>

        <H2>Children</H2>
        <P>
          TurnUp is for tradespeople and their customers and is not meant for anyone under 16. It
          does not knowingly hold anything about a child.
        </P>

        <H2>Changes</H2>
        <P>
          If this changes, the date at the top changes with it. A change that materially affects
          what is held or who can read it will be said on the dashboard, not only here.
        </P>

        <H2>Getting in touch</H2>
        <P>
          <a href="mailto:privacy@getturnup.com" style={{ color: 'var(--tint)' }}>privacy@getturnup.com</a>
        </P>
        <Note>
          {CANONICAL_HOST} · Questions about a specific job are quickest answered by the
          tradesperson who sent you the link.
        </Note>

        <div className="mt-12">
          <Link href="/" className="text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
            ← TurnUp
          </Link>
        </div>
      </main>
    </div>
  )
}
