/**
 * The pilot, in four numbers.
 *
 * Decided 11 Oct 2026: the real pilot is the owner's own jobs, thirty days,
 * and the test is whether customers use the link, not whether the product is
 * clever. Four numbers answer that, and three of them come out of the rows
 * the product already keeps:
 *
 *   links opened      jobs whose page a CUSTOMER opened at least once
 *                     (viewCount). The trade's own opens and link-preview
 *                     fetchers do not count: see countsAsCustomerView().
 *   "in?" answered    jobs where the customer answered will-someone-be-in,
 *                     as a share of the jobs that were ASKED. Before 19 Oct
 *                     2026 it was a share of every job, asked or not.
 *   wasted trips      No one home records, by their own date. Before 19 Oct
 *                     a record dropped out of the count when its job was
 *                     rebooked into the future, which is exactly when a
 *                     wasted trip happens.
 *   calls             "when are you coming?" calls to the booking line.
 *                     Nobody can count those from here; the trade types the
 *                     running total on the panel (TradeProfile.pilotCalls).
 *                     "Are you still coming?" taps on the card are the
 *                     nearest thing the product sees, shown as that, never
 *                     as calls.
 *
 * THE WINDOW STARTS ON A DATE. The audit of 19 Oct 2026 found the thirty days
 * rolling back from now, so the count reached into September and swept up
 * every test card. `start` (TradeProfile.pilotStart, set by the Start button)
 * is the floor: the window is the last `days` days or since the start,
 * whichever is shorter.
 *
 * Pure and relative-imported so scripts/check-pilot.mjs runs it without a
 * database. The route fetches the rows; this file only counts.
 */

const DAY = 24 * 60 * 60 * 1000

/** A job belongs to the window if it was booked for, or made, inside it. */
export function inWindow(t, since, until) {
  const day = t.scheduledFor ? new Date(t.scheduledFor) : new Date(t.createdAt)
  return day >= since && day < until
}

/**
 * Messaging apps fetch a link to draw its preview the moment it is pasted,
 * which read as the customer opening it. Matched on the names those fetchers
 * announce themselves with; an ordinary phone browser never carries one.
 */
export const PREVIEW_UA = /\b(WhatsApp|facebookexternalhit|Facebot|Twitterbot|Slackbot|Slack-ImgProxy|TelegramBot|Discordbot|SkypeUriPreview|LinkedInBot|iMessageLinkPreview|Applebot|Googlebot|bingbot|HeadlessChrome|curl|python-requests|Go-http-client)\b/i

/** Whether a page load counts as the customer opening the link. */
export function countsAsCustomerView({ operator = false, userAgent = '' } = {}) {
  if (operator) return false
  return !PREVIEW_UA.test(String(userAgent || ''))
}

export function pilotNumbers(trackers, noAccess = [], { days = 30, now = new Date(), start = null, calls = null } = {}) {
  const until = now
  const rolling = new Date(now.getTime() - days * DAY)
  const floor = start ? new Date(start) : null
  const since = floor && floor > rolling ? floor : rolling
  const jobs = trackers.filter((t) => t.isActive !== false && inWindow(t, since, until))
  const pct = (n, of) => (of ? Math.round((n / of) * 100) : null)

  const opened = jobs.filter((t) => (t.viewCount || 0) > 0).length
  const askedDayBefore = jobs.filter((t) => t.presenceAskedAt).length
  const answered = jobs.filter((t) => t.presenceAskedAt && t.presenceAt).length
  const trips = noAccess.filter((n) => new Date(n.startedAt) >= since && new Date(n.startedAt) < until).length
  const stillComing = jobs.filter((t) => t.askedAt).length

  return {
    days, since: since.toISOString(), until: until.toISOString(),
    start: floor ? floor.toISOString() : null,
    jobs: jobs.length,
    linksOpened: { n: opened, pct: pct(opened, jobs.length) },
    askedDayBefore: { n: askedDayBefore, pct: pct(askedDayBefore, jobs.length) },
    inAnswered: { n: answered, pct: pct(answered, askedDayBefore), of: askedDayBefore },
    wastedTrips: { n: trips },
    stillComingAsks: { n: stillComing },
    // The fourth number is counted by a person, on purpose. Null until they
    // have typed one; never invented.
    calls: { n: Number.isInteger(calls) && calls >= 0 ? calls : null, note: 'Counted by hand: "when are you coming?" calls to the booking line. The product cannot see a phone ring.' },
  }
}
