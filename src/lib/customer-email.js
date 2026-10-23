import { prisma } from '@/lib/prisma'
import { TRADE_NAME, CANONICAL_HOST } from '@/lib/trade'
import { sm8Configured, fetchJobContact, sendEmail } from '@/lib/servicem8'
import { pushConfigured } from '@/lib/push'
import { emailFor, emailDecision, validEmail } from '@/lib/customer-email-words'

/**
 * The non-push fallback: an email when no notification reached the customer.
 *
 * A customer who opened the link once in Safari will never get a push (iOS
 * delivers web push only to a page on the Home Screen), so for the three
 * moments that matter most — the trade has set off, the window was missed,
 * and the day-before ask — the push is the enhancement and this is the floor.
 * Rule 1 of docs/design/when-things-go-wrong.md.
 *
 * Through ServiceM8, because that is where the customer's email already is
 * and where the trade's own address sends from: no new mail provider, no
 * address copied into TurnUp, and the email lands in the job diary. So it
 * only covers cards linked to a ServiceM8 job. A card made by hand has no
 * address to send to, and its page is still the page.
 *
 * Never throws, and nothing the trade is waiting on awaits it.
 */

export async function emailFallbackOn() {
  try { return Boolean((await prisma.tradeProfile.findUnique({ where: { id: 'singleton' } }))?.emailFallback) } catch { return false }
}

async function whoIsComing() {
  try {
    const p = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' }, select: { engineerName: true, vehicleColour: true, vehicleMake: true, vehicleModel: true, vehicleReg: true } })
    if (!p) return {}
    const vehicle = [p.vehicleColour, p.vehicleMake, p.vehicleModel].filter(Boolean).join(' ')
    return { name: p.engineerName?.split(' ')[0] || null, vehicle: vehicle || null, reg: p.vehicleReg || null }
  } catch { return {} }
}

/**
 * Email the customer if the push did not land. `pushed` is what notifyStage
 * or notifyCustomer returned. Once per kind per job: the CustomerEmail row is
 * claimed before anything is fetched or sent.
 *
 * @returns {Promise<{emailed: boolean, outcome: string}>}
 */
export async function emailIfUnreached(tracker, kind, pushed, extra = {}) {
  try {
    const decision = emailDecision({
      kind,
      pushed: pushed?.sent || 0,
      on: await emailFallbackOn(),
      sm8: sm8Configured(),
      jobUuid: tracker?.externalId || null,
    })
    if (decision !== 'send') return { emailed: false, outcome: decision }

    let row
    try {
      row = await prisma.customerEmail.create({ data: { tradeStatusId: tracker.id, kind } })
    } catch (error) {
      // P2002: already sent (or being sent) for this job. Anything else is
      // most likely the table not existing yet, and the feature stays dark.
      return { emailed: false, outcome: error?.code === 'P2002' ? 'already' : 'no_table' }
    }
    const done = (outcome, messageId = null) =>
      prisma.customerEmail.update({ where: { id: row.id }, data: { outcome: String(outcome).slice(0, 120), messageId } }).catch(() => {})

    const contact = await fetchJobContact(tracker.externalId).catch(() => null)
    const to = contact?.email ? String(contact.email).trim() : ''
    if (!validEmail(to)) { await done('no_email'); return { emailed: false, outcome: 'no_email' } }

    const mail = emailFor({ kind, tradeName: TRADE_NAME, host: CANONICAL_HOST, code: tracker.code, who: kind === 'ON_MY_WAY' ? await whoIsComing() : {}, pushOn: pushConfigured(), ...extra })
    try {
      const r = await sendEmail({ to, subject: mail.subject, text: mail.text, jobUuid: tracker.externalId })
      await done('sent', r.messageID)
      return { emailed: true, outcome: 'sent' }
    } catch (error) {
      await done(`error:${error?.message || 'failed'}`)
      return { emailed: false, outcome: 'error' }
    }
  } catch (error) {
    console.error('customer email failed:', error?.message)
    return { emailed: false, outcome: 'error' }
  }
}

/** For the switch's panel: what was emailed lately, newest first. */
export async function recentCustomerEmails(take = 8) {
  try { return await prisma.customerEmail.findMany({ orderBy: { createdAt: 'desc' }, take, select: { kind: true, outcome: true, createdAt: true } }) } catch { return null }
}
