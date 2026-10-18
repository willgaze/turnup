/**
 * What the customer is emailed when no notification reached them.
 *
 * Pure, so `scripts/check-customer-email.mjs` can test it without a database.
 * The sending is in src/lib/customer-email.js.
 *
 * The lock-screen rule applies here too, because a mail app shows the subject
 * and the first line on the lock screen: the trade's name, the van, the stage,
 * the link. Never the customer's name or address, never the job reference,
 * never a stage note. And never a time: "has set off" is a fact, and an email
 * is no better a place than a push to promise an arrival.
 */

export const EMAIL_KINDS = ['ON_MY_WAY', 'MISSED', 'DAY_BEFORE']

// Loose on purpose: ServiceM8 validates the address itself and says so
// ("Email To address is not valid"). This only stops sending to a phone
// number or a blank that somebody typed into the email field.
export const validEmail = (s) => /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i.test(String(s || '').trim())

// The how-to names the button on the customer's page, so it is only said when
// that row exists: without the push keys it is not rendered (PUSH_CONFIGURED
// in src/app/t/Notify.jsx), and an email pointing at it would be the push row
// that opened onto nothing all over again.
const FOOTER = (tradeName, pushOn) =>
  (pushOn
    ? `You are getting this by email because notifications are not switched on for this booking. ` +
      `To have them on your phone instead, open the page and tap "Tell me when they set off".\n\n`
    : '') +
  `Sent by TurnUp for ${tradeName}.`

/**
 * One email. `who` is the trade's first name and van, from Who to expect;
 * either may be missing, and the email reads properly without them.
 */
export function emailFor({ kind, tradeName, host, code, who = {}, pushOn = false }) {
  const link = `https://${host}/t/${code}`
  const name = who.name || null
  if (kind === 'ON_MY_WAY') {
    const van = who.vehicle ? ` Look out for a ${who.vehicle}${who.reg ? `, ${who.reg}` : ''}.` : ''
    return {
      subject: name ? `${name} from ${tradeName} is on the way` : `${tradeName} is on the way`,
      text: `${name ? `${name} from ${tradeName}` : tradeName} has set off and is heading to you.${van}\n\n` +
        `Follow the job here: ${link}\n\n${FOOTER(tradeName, pushOn)}`,
    }
  }
  if (kind === 'MISSED') {
    return {
      subject: `Sorry, the window has passed - ${tradeName}`,
      text: `${tradeName} has not arrived in the window, and is sorry.\n\n` +
        `Open the page to choose what happens next: wait, later today, or another day.\n${link}\n\n${FOOTER(tradeName, pushOn)}`,
    }
  }
  if (kind === 'DAY_BEFORE') {
    return {
      subject: `Booked for tomorrow - ${tradeName}`,
      text: `You are booked in with ${tradeName} tomorrow. Is it still fine, and will someone be in?\n\n` +
        `One tap on the page answers both: ${link}\n\n${FOOTER(tradeName, pushOn)}`,
    }
  }
  return null
}

/**
 * Whether to email, before anything is claimed or fetched. The order is the
 * order of the reasons: a push that landed outranks everything, because the
 * email is the fallback, not a second copy.
 */
export function emailDecision({ kind, pushed, on, sm8, jobUuid }) {
  if (!EMAIL_KINDS.includes(kind)) return 'skip:kind'
  if (pushed > 0) return 'skip:pushed'
  if (!on) return 'skip:off'
  if (!sm8) return 'skip:no_servicem8'
  if (!jobUuid) return 'skip:not_linked'
  return 'send'
}
