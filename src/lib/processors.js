/**
 * Who else touches the data, written once and printed by /processor and
 * /privacy, so the two pages cannot list different companies.
 *
 * Every line here is a claim about the code, the same rule as the privacy
 * page (CLAUDE.md, "src/app/privacy/page.js is a claim about the code"): a
 * change that sends something new to a third party is a change to this file,
 * in the same push. Where a fact was checked, `source` says where, so the next
 * person can check it again rather than trust it.
 *
 * Two lists, because the law treats them differently:
 *
 * - SUBPROCESSORS handle a trade's customers' details on the trade's behalf
 *   (the trade is the controller, TurnUp the processor; /processor).
 * - OTHER_RECIPIENTS handle what TurnUp holds for itself or for households,
 *   where TurnUp is the controller (/privacy only).
 *
 * ServiceM8 is in neither, deliberately: it is the trade's own system, under
 * the trade's own contract with ServiceM8. TurnUp reads it and writes texts,
 * emails and diary lines into it only with the trade's own key or
 * authorisation, on the trade's instruction. NOT_A_SUBPROCESSOR says so on the
 * page, because "where is my data" has to name it.
 */

// Checked 26 Oct 2026 with Vercel's own API: the production deployment's
// functions run in region iad1, Washington DC.
const VERCEL_REGION = 'Functions run in Washington DC, USA (Vercel region iad1); pages are served from Vercel’s worldwide network'

// NOT KNOWN from here: Neon's region is in the database address, and the
// address is an environment variable a session cannot read (CLAUDE.md, the
// Vercel connector is read-only for env vars). Null makes both pages say the
// region is being confirmed rather than guess one. Set it from the Neon
// console (Project settings, Region) and the pages follow.
export const NEON_REGION = null

export const SUBPROCESSORS = [
  {
    name: 'Vercel Inc.',
    does: 'Hosting: runs TurnUp and serves every page',
    sees: 'Every request, and the job details as they pass through on the way to the trade or the customer',
    where: VERCEL_REGION,
    safeguard: 'Vercel’s data processing addendum. Vercel is certified under the EU-U.S. Data Privacy Framework and relies on the EU Standard Contractual Clauses with the UK Addendum',
    link: 'https://vercel.com/legal/dpa',
    source: 'https://vercel.com/kb/guide/is-vercel-certified-under-dpf',
    when: 'Always',
  },
  {
    name: 'Neon (Databricks)',
    does: 'The database: where everything is stored',
    sees: 'Every job and everything on it, at rest',
    where: NEON_REGION ? `Neon region ${NEON_REGION}` : 'Neon’s region for this database is being confirmed and will be stated here',
    safeguard: 'Neon’s data processing addendum',
    link: 'https://neon.com/dpa',
    source: 'https://neon.com/dpa',
    when: 'Always',
  },
  {
    name: 'Apple, Google and Mozilla push services',
    does: 'Carry notifications to phones and browsers, and tell Apple Wallet a card has changed',
    sees: 'An anonymous subscription and the notification: the trade’s name and the stage, nothing else. A Wallet push carries no words at all',
    where: 'Their own networks',
    safeguard: 'Each company’s own terms for its push service. The message is encrypted so the push service cannot read it (web push)',
    link: null,
    source: 'src/lib/push.js, src/lib/apns.js',
    when: 'When a customer or the trade switches notifications on, or adds a card to Apple Wallet',
  },
  {
    name: 'Google (Google Wallet)',
    does: 'Holds the Android version of the job’s card',
    sees: 'What the card shows: the trade’s name, the customer’s name and the address (each shortened), the stage and the link',
    where: 'Google’s network',
    safeguard: 'Google’s terms for the Google Wallet API',
    link: 'https://developers.google.com/wallet',
    source: 'src/lib/google-wallet-words.js',
    when: 'Not switched on yet. Only once the Google Wallet issuer account exists and a customer adds the card',
  },
  {
    name: 'Anthropic',
    does: 'Reads and answers what the trade types into the Ask box on the dashboard',
    sees: 'That trade’s job list with every phone number taken out, and what was typed',
    where: 'Anthropic’s network',
    safeguard: 'Anthropic’s commercial terms',
    link: 'https://www.anthropic.com/legal/commercial-terms',
    source: 'src/lib/assistant.js',
    when: 'Only when the trade uses the Ask box',
  },
  {
    name: 'Cloudflare',
    does: 'Receives email forwarded to a household card and passes it on',
    sees: 'The forwarded email, in transit. Not a trade’s job list',
    where: 'Cloudflare’s worldwide network',
    safeguard: 'Cloudflare’s data processing addendum: EU Standard Contractual Clauses with the UK Addendum, or the UK extension to the Data Privacy Framework',
    link: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    source: 'https://www.cloudflare.com/dpa',
    when: 'Only where a household card uses email forwarding',
  },
]

export const OTHER_RECIPIENTS = [
  { name: 'Ship24', sees: 'A parcel’s tracking number and courier, so its row moves from the courier’s own scans', when: 'Only for a household card row that has a tracking number, and only once tracking by number is switched on', source: 'src/lib/ship24.js' },
  { name: 'Google (Gmail)', sees: 'Messages in a connected inbox that look like an order or a delivery; only the arrival is kept, never the email', when: 'Only where an inbox is connected. Today that is the owner’s own, and no other household’s', source: 'src/lib/gmail.js' },
  { name: 'DVSA and DVLA', sees: 'The number plate', when: 'Only when a trade looks up their own van', source: 'src/lib/dvla.js' },
  { name: 'postcodes.io and OpenStreetMap', sees: 'The postcode typed on /join, and the map squares around it. Your browser asks them directly', when: 'Only on /join', source: 'src/app/join' },
]

export const NOT_A_SUBPROCESSOR = {
  name: 'ServiceM8',
  says: 'ServiceM8 is your own system, under your own contract with ServiceM8. Where you connect it, TurnUp reads your bookings and writes texts, emails and diary lines into it with your own key or authorisation, because you asked it to. That makes it your tool, not ours: TurnUp does not send your customers’ details to ServiceM8 that ServiceM8 did not already hold.',
}
