/**
 * "Your data": what a download holds, what a delete removes and what it
 * leaves, and the one check that guards the delete. Pure, so the panel, the
 * routes, /privacy, /processor and `node scripts/check-your-data.mjs` all read
 * the same lists and none of them can promise more than the code does.
 *
 * Until go-to-market stop 5 makes TurnUp multi-trade, an install serves one
 * trade (docs/launch/known-issues.md, item 1). So "the account" is that
 * trade's data in this install: their jobs and everything on them, their
 * profile and settings, their phones and their ServiceM8 authorisation. Things
 * that belong to somebody else stay: a household's own card belongs to the
 * household, the waiting list is TurnUp's, and the sign-in stays so the empty
 * dashboard can still be opened to see that it worked.
 */

/** Typed to confirm a delete. Case and spacing do not matter; anything else does. */
export function confirmMatches(typed, businessName) {
  const norm = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
  const want = norm(businessName)
  return want.length > 0 && norm(typed) === want
}

/** What the JSON download holds. Read by the panel and the pages. */
export const EXPORT_HOLDS = [
  'Every job: the customer’s name, address, phone and job, every stage and note with its time, the hours and who agreed them, and everything the customer answered',
  'No one home records, with their photos',
  'Your profile: name, photo, van, booking terms, review link and settings',
  'Which jobs follow ServiceM8, and the emails sent to customers when no notification landed',
  'Your trade’s own rows on household cards',
  'The “when are you coming?” calls you logged, with their time and job',
  'Your phones and Face ID by name and date, and your roadmap votes',
]

/**
 * Left out of the download, each for a reason, and the reason is the point:
 * these are keys and secrets, not information about anyone.
 */
export const EXPORT_LEAVES_OUT = [
  'Sealed tokens and app secrets (ServiceM8, Google, the letterbox password)',
  'Push subscription keys for phones and browsers (counted, not copied)',
  'Face ID public keys',
]

/** What Delete account removes. */
export const DELETE_REMOVES = [
  'Every job and everything on it: timeline, the customer’s answers, No one home records and photos',
  'Every customer link, switched off at once (a forwarded link stops working)',
  'Every Wallet card for those jobs: Apple Wallet is told the card is dead and removes it; a Google card is expired',
  'Your profile, photo, van, booking terms and settings',
  'Your phones registered for nudges',
  'Your ServiceM8 authorisation, the job links and the email record',
  'Your trade’s rows on household cards, the calls you logged, and your roadmap votes',
]

/** What it leaves, and why. */
export const DELETE_KEEPS = [
  'Your sign-in (Face ID or password), so you can open the empty dashboard and see it worked',
  'Household cards, which belong to the households that made them',
  'The waiting list',
]

/** Shape of a filename for the download: no business name in it, just a date. */
export function exportFilename(now = new Date()) {
  const d = new Date(now).toISOString().slice(0, 10)
  return `turnup-export-${d}.json`
}
