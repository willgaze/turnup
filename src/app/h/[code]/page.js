import Link from 'next/link'
import { placeByCode, cardShape } from '@/lib/arrivals'
import { nearDay, timeOnly, dayAndMonth } from '@/lib/when'
import { TRADE_NAME } from '@/lib/trade'
import Mark from '@/components/Mark'
import { VanIcon, TickIcon, ClockIcon, HouseIcon, ChevronIcon } from '@/components/icons'

/**
 * The household card: everything coming to one door.
 *
 * The second half of the product. A job page answers "where is my plumber".
 * This answers "what is happening at my house this week" — the plumber, the
 * sofa, four parcels, in one list, because that is how the person living there
 * already thinks about it. A card that splits parcels from trades makes them
 * do the merging in their head.
 *
 * Same credential rules as a job page: the code in the URL is the only thing
 * standing in front of it, so it is unguessable, revocable, and never indexed.
 * Nothing on this page is anything the household told us — it is all things
 * other people said were coming to them.
 */
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Coming to your door | TurnUp', robots: { index: false, follow: false } }

// Arrival stages borrow the job stages' colours rather than inventing a second
// palette. A customer who has used a TurnUp job link already knows amber means
// something is wrong and green means it is finished; teaching them a second
// set of colours for the same five ideas would be worse than useless.
const TONE = {
  ORDERED: 'tone-booked',
  BOOKED: 'tone-booked',
  ON_THE_WAY: 'tone-onway',
  OUT_FOR_DELIVERY: 'tone-onway',
  // A trade's own job brings two stages a parcel does not have, and they get
  // the job page's own colours so the two surfaces agree on sight.
  HERE: 'tone-onsite',
  PAUSED: 'tone-paused',
  MISSED: 'tone-paused',
  DONE: 'tone-done',
}

/**
 * The same stage reads differently depending on what is arriving.
 *
 * "Out for delivery" is right for a parcel and absurd for a plumber; "Arrived"
 * is right for a parcel and wrong for a job, which is finished rather than
 * delivered. One map per kind, so neither has to carry the other's words.
 */
const LABEL = {
  ORDERED: 'Ordered',
  BOOKED: 'Booked in',
  ON_THE_WAY: 'On the way',
  OUT_FOR_DELIVERY: 'Out for delivery',
  HERE: 'Here now',
  PAUSED: 'Paused',
  MISSED: 'They missed you',
  DONE: 'Arrived',
}

const PERSON_LABEL = {
  ...LABEL,
  ON_THE_WAY: 'On their way',
  OUT_FOR_DELIVERY: 'On their way',
  MISSED: 'Nobody was in',
  DONE: 'Finished',
}

const labelFor = (a) =>
  (a.kind === 'SERVICE' || a.source === 'TRADE' ? PERSON_LABEL : LABEL)[a.stage] || a.stage

// The row the empty card shows, so a household sees what forwarding an email
// does before they have done it. Not a real parcel; nothing links anywhere.
const example = () => ({
  kind: 'PARCEL', stage: 'OUT_FOR_DELIVERY', carrier: 'Royal Mail', title: 'Royal Mail parcel',
  reference: null, trackUrl: null, tradeStatusCode: null, source: 'EMAIL',
  expectedFor: new Date(), windowSaid: null, windowStart: null, windowEnd: null,
})

/**
 * When it is expected, always attributed.
 *
 * "Evri said Tuesday", never "Tuesday". The product does not work out arrival
 * times and does not want to look as though it has — the words came from the
 * carrier and the card says so, exactly as a trade's proposed window says
 * whose it is.
 */
function Expected({ a }) {
  if (!a.expectedFor && !a.windowSaid) return null
  const hours = a.windowStart && a.windowEnd
    ? `${timeOnly(a.windowStart)}–${timeOnly(a.windowEnd)}`
    : a.windowSaid
  // Somebody always said it. A carrier's own words carry the carrier's name; a
  // row the trade put here is the trade speaking, so it carries theirs. An
  // unattributed date would read as the product working out an arrival, which
  // it never does.
  const who = a.carrier || (a.source === 'TRADE' ? TRADE_NAME : null)
  return (
    <p className="mt-1.5 text-[15px] font-semibold" style={{ color: 'var(--tint)' }}>
      {who ? `${who} said ` : 'Expected '}
      {a.expectedFor ? nearDay(a.expectedFor) : ''}{hours ? `, ${hours}` : ''}
    </p>
  )
}

function Row({ a }) {
  const done = a.stage === 'DONE'
  return (
    <li className={`${TONE[a.stage] || 'tone-booked'} glass r-outer p-4 ${done ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 14%, transparent)' }}>
          {a.kind === 'SERVICE' ? <HouseIcon size={19} /> : <VanIcon size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tint)' }}>
            {labelFor(a)}
          </p>
          <p className="mt-0.5 text-[17px] font-semibold leading-snug">{a.title}</p>
          {a.carrier && !a.expectedFor && !a.windowSaid && (
            <p className="text-[15px] muted">{a.carrier}</p>
          )}
          <Expected a={a} />
          {/* Why it is paused is the thing a customer most wants said out loud
              and the thing least often said. It is the trade talking to this
              customer about this job — the same words their job page shows. */}
          {a.note && (
            <p className="mt-1.5 text-[15px] leading-snug">{a.note}</p>
          )}
          {a.reference && (
            <p className="mt-1 break-all font-mono text-[12px]" style={{ color: 'var(--label-3)' }}>{a.reference}</p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {/* A live TurnUp job gets the real page, not a flat row: that one
                has the stage the trade is actually tapping. */}
            {a.tradeStatusCode && (
              <Link href={`/t/${a.tradeStatusCode}`} className="btn btn-tinted !min-h-[40px] !px-4 !text-[14px]">
                Follow it live <ChevronIcon size={14} />
              </Link>
            )}
            {a.trackUrl && (
              <a href={a.trackUrl} target="_blank" rel="noreferrer"
                 className="btn btn-grey !min-h-[40px] !px-4 !text-[14px]">
                Track with {a.carrier}
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

/** A section rule, so the two lists read as two lists and not one long one. */
function Heading({ children }) {
  return (
    <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
      {children}
    </h2>
  )
}

/**
 * The one line at the top, which has to say the thing they opened it for.
 *
 * People are counted first and named first, because a person coming is the
 * fact that changes somebody's day — it decides whether they can go out. Four
 * parcels do not.
 */
function headline(people, things) {
  const n = (c, one, many) => `${c} ${c === 1 ? one : many}`
  if (!people && !things) return 'Nothing on its way'
  if (!people) return `${n(things, 'thing', 'things')} arriving`
  if (!things) return `${n(people, 'person', 'people')} coming`
  return `${n(people, 'person', 'people')} coming, ${n(things, 'thing', 'things')} arriving`
}

export default async function HouseholdCard({ params }) {
  const { code } = await params
  const place = await placeByCode(code)

  if (!place) {
    return (
      <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
        <div className="stage-wash" aria-hidden="true" />
        <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
          <Mark className="mx-auto h-12 w-auto" id="gone" />
          <h1 className="mt-5 text-[24px] font-bold">That card has expired</h1>
          <p className="mt-2 text-[17px] muted">Ask whoever set it up to send you a new link.</p>
        </main>
      </div>
    )
  }

  const card = cardShape(place)
  // Gmail asking to confirm forwarding: shown first, never counted as coming.
  const notices = card.arrivals.filter((a) => a.kind === 'NOTICE')
  const coming = card.arrivals.filter((a) => a.stage !== 'DONE' && a.kind !== 'NOTICE')
  const settled = card.arrivals.filter((a) => a.stage === 'DONE')

  /*
   * People first, then things.
   *
   * The household already sorts these two ways and the difference is what you
   * have to be in for. Nobody waits in for a jiffy bag; everybody waits in for
   * an engineer. One undifferentiated list makes the reader do that sorting
   * every time they open the page, which is the work the card exists to save.
   *
   * A row the trade put here is a person by definition — somebody is driving
   * to the house. SERVICE is a person coming to do something. Everything else
   * is goods, however many people carry them through the door.
   */
  const isPerson = (a) => a.kind === 'SERVICE' || a.source === 'TRADE'
  const people = coming.filter(isPerson)
  const things = coming.filter((a) => !isPerson(a))

  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-xl px-4 pb-16 pt-safe">
        <header className="pt-6">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--mts-accent)' }}>
            {card.label || 'Your door'}
          </p>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-[-0.02em]">
            {headline(people.length, things.length)}
          </h1>
        </header>

        {notices.map((n) => (
          <div key="gmail-confirm" className="tone-paused glass r-outer mt-6 p-4">
            <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--tint)' }}>One step left</p>
            <p className="mt-0.5 text-[17px] font-semibold leading-snug">{n.title}</p>
            <p className="mt-1 text-[15px] leading-snug muted">Nothing is forwarded until you do. Tap Confirm, or type the code into Gmail’s forwarding settings.</p>
            {n.reference && <p className="mt-2 font-mono text-[20px] font-bold tracking-wider">{n.reference}</p>}
            {n.trackUrl && (
              <a href={n.trackUrl} target="_blank" rel="noreferrer" className="btn btn-filled mt-3 !min-h-[44px] !px-5 !text-[15px]">Confirm in Gmail</a>
            )}
          </div>
        ))}

        {people.length > 0 && (
          <>
            <Heading>{people.length === 1 ? 'Coming to the door' : 'Coming to the door'}</Heading>
            <ul className="mt-3 grid gap-3">
              {people.map((a, i) => <Row key={`p-${a.title}-${i}`} a={a} />)}
            </ul>
          </>
        )}

        {things.length > 0 && (
          <>
            <Heading>{people.length > 0 ? 'Also arriving' : 'Arriving'}</Heading>
            <ul className="mt-3 grid gap-3">
              {things.map((a, i) => <Row key={`t-${a.title}-${i}`} a={a} />)}
            </ul>
          </>
        )}

        {coming.length === 0 && (
          <div className="glass r-outer mt-6 p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full"
                  style={{ color: 'var(--mts-accent)', background: 'color-mix(in srgb, var(--mts-accent) 13%, transparent)' }}>
              <ClockIcon size={22} />
            </span>
            <p className="mt-3 text-[17px] font-semibold">Nothing due</p>
            <p className="mt-1 text-[16px] leading-snug muted">Forward a delivery email or a booking confirmation and it lands here.</p>
          </div>
        )}

        {coming.length === 0 && (
          /* What a forwarded email becomes, drawn with the same Row the real
             ones use. Invented parcel; the label says it is an example. */
          <div className="mt-5">
            <p className="px-1 text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
              Like this
            </p>
            <ul className="mt-2 grid gap-3" aria-label="An example row">
              <Row a={example()} />
            </ul>
          </div>
        )}

        {settled.length > 0 && (
          <>
            <h2 className="mt-9 text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
              Arrived
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {settled.map((a, i) => (
                <li key={`${a.title}-done-${i}`} className="tone-done glass r-outer flex items-center gap-3 p-3.5">
                  <span className="shrink-0" style={{ color: 'var(--tint)' }}><TickIcon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{a.title}</span>
                    <span className="block text-[14px] muted">
                      {a.carrier}{a.updatedAt ? ` · ${dayAndMonth(a.updatedAt)}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <footer className="mt-12 text-center">
          <span className="inline-flex items-center gap-2 opacity-60">
            <Mark className="h-4 w-auto" id="hfoot" />
            <span className="text-[12px] muted">Everything coming to your door, by TurnUp</span>
          </span>
        </footer>
      </main>
    </div>
  )
}
