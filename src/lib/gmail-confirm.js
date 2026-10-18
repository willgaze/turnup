/**
 * Gmail's "confirm forwarding" email, read so the household can see it.
 *
 * Before Gmail will forward to a new address it sends a code and a link TO
 * that address, and nothing is forwarded until someone uses one. That address
 * is the card's letterbox, so the email arrived here, was not an arrival, and
 * was dropped: the household set up a forwarding rule, Gmail sat waiting, and
 * the card stayed empty with nothing anywhere saying why. (Flagged in the
 * onboarding research, 17 Oct 2026; built 18 Oct, v1.64.1.)
 *
 * So it is filed as a NOTICE row the card shows above everything else, with
 * the code and Gmail's own link. Pure, no database: scripts/check-gmail-confirm.mjs.
 *
 * Sender matched on the DOMAIN, the same rule as the carriers: a subject line
 * can claim anything; google.com has to pass SPF to land in Cloudflare.
 */
const FROM = /@(?:[a-z0-9-]+\.)*google\.com\b/i
const SUBJECT = /forwarding confirmation|confirm.*forward/i
const CODE = /confirmation code:?\s*([0-9]{6,12})/i
// Gmail's own confirmation hosts only; anything else is not put on a card.
const LINK = /https:\/\/(?:mail-settings\.google\.com|mail\.google\.com|isolated\.mail\.google\.com)\/[^\s<>"')\]]+/i

export function readForwardingConfirm({ from, subject, text }) {
  if (!FROM.test(String(from || ''))) return null
  if (!SUBJECT.test(String(subject || ''))) return null
  const body = String(text || '')
  const code = body.match(CODE)?.[1] || null
  const url = body.match(LINK)?.[0]?.replace(/[.,;]+$/, '') || null
  if (!code && !url) return null
  return { code, url }
}

/** The row's fixed identity, so a second confirmation email replaces the first. */
export const CONFIRM_KEY = 'gmail-forwarding-confirm'
