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
 *   calls             "when are you coming?" calls to the booking line. The
 *                     product cannot see a phone ring, so a person logs
 *                     them — but as a DATED ROW now (PilotCall), one tap
 *                     from the job, not as a running total typed on a panel.
 *                     See below: it is the number the product is a bet
 *                     against, and it was the one that could not be read.
 *
 * THE FOURTH NUMBER WAS THE BROKEN ONE (v1.76.0). It was an integer on
 * TradeProfile, and it failed three ways at once. It ignored the window, so
 * switching the panel to 90 days or pressing Start changed every number but
 * that one. It had no date, so it could never show a direction. And it was
 * typed on a panel folded inside Setup and settings, which is not a place a
 * trade goes between jobs — so in thirty days it would have read 0, and 0
 * reads as "nobody rang", which is exactly the verdict the product was
 * hoping for. A measurement that fails quietly towards the answer you wanted
 * is worse than no measurement at all.
 *
 * AND A TALLY COULD NEVER ANSWER THE QUESTION. "Three calls in thirty days"
 * means nothing without a before, and there is no before: the product was
 * not running. But a call attached to a JOB needs no before, because the
 * control is already inside the window — of the customers who opened their
 * link, how many rang anyway, against those who never opened it. If people
 * who read the card ring just as often as people who did not, the card does
 * not work, and that is knowable in thirty days without a baseline. That is
 * what rangAfterOpening() is, and it is the only number here that can settle
 * the bet rather than describe it.
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

/**
 * The bet, settled from inside the window.
 *
 * Of the jobs in the window, split by whether the CUSTOMER opened the link,
 * what share of each side rang to ask when you were coming. Only calls
 * attached to a job can say anything here; a call logged from the panel with
 * no job is counted in the total and sits out of this one, because it cannot
 * be placed on either side.
 *
 * Returns null for a side with no jobs in it, never 0% — "none of nobody
 * rang" is not evidence, and a 0 beside a 60 would read as if it were.
 */
export function rangAfterOpening(jobs, callRows) {
  const rangIds = new Set(callRows.map((c) => c.tradeStatusId).filter(Boolean))
  const side = (opened) => {
    const of = jobs.filter((t) => ((t.viewCount || 0) > 0) === opened)
    const n = of.filter((t) => rangIds.has(t.id)).length
    return { n, of: of.length, pct: of.length ? Math.round((n / of.length) * 100) : null }
  }
  return { opened: side(true), notOpened: side(false) }
}

export function pilotNumbers(trackers, noAccess = [], callRows = [], { days = 30, now = new Date(), start = null, typedBefore = null } = {}) {
  const until = now
  const rolling = new Date(now.getTime() - days * DAY)
  const floor = start ? new Date(start) : null
  const since = floor && floor > rolling ? floor : rolling
  const inside = (d) => { const t = new Date(d); return t >= since && t < until }
  const jobs = trackers.filter((t) => t.isActive !== false && inWindow(t, since, until))
  const pct = (n, of) => (of ? Math.round((n / of) * 100) : null)

  const opened = jobs.filter((t) => (t.viewCount || 0) > 0).length
  const askedDayBefore = jobs.filter((t) => t.presenceAskedAt).length
  const answered = jobs.filter((t) => t.presenceAskedAt && t.presenceAt).length
  const trips = noAccess.filter((n) => inside(n.startedAt)).length
  const stillComing = jobs.filter((t) => t.askedAt).length

  // Counted on the same window as the other three, which is the whole fix.
  const calls = (Array.isArray(callRows) ? callRows : []).filter((c) => inside(c.at))
  const onAJob = calls.filter((c) => c.tradeStatusId).length

  return {
    days, since: since.toISOString(), until: until.toISOString(),
    start: floor ? floor.toISOString() : null,
    jobs: jobs.length,
    linksOpened: { n: opened, pct: pct(opened, jobs.length) },
    askedDayBefore: { n: askedDayBefore, pct: pct(askedDayBefore, jobs.length) },
    inAnswered: { n: answered, pct: pct(answered, askedDayBefore), of: askedDayBefore },
    wastedTrips: { n: trips },
    stillComingAsks: { n: stillComing },
    // Still counted by a person, on purpose — the product cannot see a phone
    // ring — but dated, windowed, and logged where the trade already is.
    calls: {
      n: calls.length,
      onAJob,
      last: calls.length ? new Date(Math.max(...calls.map((c) => new Date(c.at)))).toISOString() : null,
      // An undated figure typed before v1.76.0. Shown so it is not silently
      // lost, never added in: it cannot be placed in any window.
      typedBefore: Number.isInteger(typedBefore) && typedBefore > 0 ? typedBefore : null,
    },
    rang: rangAfterOpening(jobs, calls),
  }
}
