import { prisma } from '@/lib/prisma'
import { notifyCustomer, pushTrade } from '@/lib/push'
import { TRADE_NAME } from '@/lib/trade'
import { diaryFor } from '@/lib/sm8-oauth'

/**
 * After Job done: how did it go?
 *
 * The page shows the ask the moment the job is done, to every customer, with
 * two honest doors: leave a review on Google, or tell the trade something.
 * Both are always there. A one-person firm lives on its reviews, and the
 * worst thing it can do is only ask the people it thinks are happy; the CMA
 * calls that review gating and it is the thing this must never become. Two
 * hours on, one push, if they switched notifications on and the trade has a
 * review link set. Once per job.
 */
export const REVIEW_DELAY_MS = 2 * 60 * 60_000
const first = TRADE_NAME.split(' ')[0]

/** Only Google's own review surfaces, so a pasted link cannot send a customer anywhere else. */
export function cleanReviewUrl(v) {
  if (typeof v !== 'string' || !v.trim()) return null
  try {
    const u = new URL(v.trim())
    if (u.protocol !== 'https:') return null
    const host = u.hostname.toLowerCase()
    const ok = ['g.page', 'g.co', 'maps.app.goo.gl', 'goo.gl'].includes(host) || host === 'google.com' || host.endsWith('.google.com') || /^google\.[a-z.]+$/.test(host) || /\.google\.[a-z.]+$/.test(host)
    return ok ? u.toString().slice(0, 500) : null
  } catch { return null }
}

export async function reviewUrl() {
  try { return cleanReviewUrl((await prisma.tradeProfile.findUnique({ where: { id: 'singleton' } }))?.reviewUrl) } catch { return null }
}

/** The customer tapped the Google button. Recorded once; a second tap is still a tap. */
export async function reviewTapped(tracker) {
  const now = new Date()
  const updated = await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    reviewClickedAt: now,
    ...(tracker.reviewClickedAt ? {} : { events: { create: { stage: tracker.stage, note: 'Customer went to leave a Google review.' } } }),
  } })
  if (!tracker.reviewClickedAt) {
    pushTrade({ ...TRADE_LINES.reviewTapped(), tag: `nudge-${tracker.code}` }).catch(() => {})
    diaryFor(updated, 'Customer opened the Google review link').catch(() => {})
  }
  return updated
}

/** A note to the trade after the job. Private; the trade's phone buzzes. */
export async function feedbackLeft(tracker, text) {
  const now = new Date()
  const updated = await prisma.tradeStatus.update({ where: { id: tracker.id }, data: {
    feedbackText: text, feedbackAt: now,
    events: { create: { stage: tracker.stage, note: 'Customer left a note after the job.' } },
  } })
  // The note itself never goes on the lock screen: it is free text a customer
  // typed and it can say anything, which is the same reason stageNote never
  // does. "Left a note" is all the trade needs to go and read it.
  pushTrade({ ...TRADE_LINES.feedbackLeft(), tag: `nudge-${tracker.code}` }).catch(() => {})
  diaryFor(updated, `Customer note after the job: ${text.slice(0, 300)}`).catch(() => {})
  return updated
}

/**
 * The sweep: every job done more than two hours ago that has not been asked,
 * while there is a review link to send them to. One push, once.
 */
export async function reviewAsks({ now = new Date() } = {}) {
  const url = await reviewUrl()
  if (!url) return { on: false }
  const rows = await prisma.tradeStatus.findMany({
    where: { isActive: true, stage: 'DONE', reviewAskedAt: null, updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
    select: { id: true, code: true, customerName: true, stage: true, reviewClickedAt: true },
  })
  const out = []
  for (const t of rows) {
    const done = await prisma.tradeStatusEvent.findFirst({ where: { tradeStatusId: t.id, stage: 'DONE' }, orderBy: { createdAt: 'desc' } })
    if (!done || now - done.createdAt < REVIEW_DELAY_MS) continue
    const claimed = await prisma.tradeStatus.updateMany({ where: { id: t.id, reviewAskedAt: null }, data: { reviewAskedAt: now } })
    if (claimed.count !== 1) continue
    if (t.reviewClickedAt) { out.push({ code: t.code, outcome: 'already-tapped' }); continue }
    const r = await notifyCustomer(t, { title: 'How did it go?', body: `A Google review helps ${first} more than anything. Or tell ${first} something, from your page.` }).catch(() => ({ sent: 0 }))
    out.push({ code: t.code, outcome: r.sent ? 'asked' : 'asked:no-device' })
  }
  return { on: true, checked: rows.length, asked: out }
}
