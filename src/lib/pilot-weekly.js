import { prisma } from '@/lib/prisma'
import { pushTrade, tradeDeviceCount } from '@/lib/push'
import { pilotNumbers } from '@/lib/pilot'
import { summaryDue, weekStart } from '@/lib/pilot-summary'
import { TRADE_LINES } from '@/lib/trade-push-words'

/**
 * Monday 08:00: the four pilot numbers, pushed to the trade's phone.
 *
 * Runs from the five-minute sweep. The row is claimed first with an atomic
 * update (pilotSummaryAt older than this Monday, or null), so two sweeps
 * cannot both send it, and it is claimed only when a phone is registered:
 * a summary nobody could receive should still go the day a phone appears.
 * `force` is the panel's "Send me this week's summary now": the same
 * message, any day, and it does not move the Monday clock.
 */
const DAY = 24 * 60 * 60 * 1000
const dayLabel = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })

async function numbersFor({ days, now, start }) {
  const since = new Date(now.getTime() - (days + 1) * DAY)
  const [trackers, noAccess, calls] = await Promise.all([
    prisma.tradeStatus.findMany({
      where: { OR: [{ scheduledFor: { gte: since } }, { createdAt: { gte: since } }] },
      select: { id: true, isActive: true, createdAt: true, scheduledFor: true, viewCount: true, presenceAt: true, presenceAskedAt: true, askedAt: true },
    }),
    prisma.noAccess.findMany({ where: { startedAt: { gte: since } }, select: { tradeStatusId: true, startedAt: true } }).catch(() => []),
    prisma.pilotCall.findMany({ where: { at: { gte: since } }, select: { id: true, at: true, tradeStatusId: true } }).catch(() => []),
  ])
  return pilotNumbers(trackers, noAccess, calls, { days, now, start })
}

/** The message as it would go now. Pure apart from the reads. */
export async function buildWeeklySummary({ now = new Date() } = {}) {
  const profile = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' }, select: { pilotStart: true, pilotSummaryAt: true } }).catch(() => null)
  const start = profile?.pilotStart || null
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const [week, prior, sinceStart] = await Promise.all([
    numbersFor({ days: 7, now, start }),
    numbersFor({ days: 7, now: weekAgo, start }),
    start ? numbersFor({ days: 366, now, start }) : Promise.resolve(null),
  ])
  // The week before only counts as a comparison if it had any of the pilot
  // in it; before the start date it is nothing, not zero.
  const priorValid = !start || new Date(start) < weekAgo
  const since = { startLabel: start ? dayLabel(start) : null, sinceStart }
  const line = TRADE_LINES.pilotWeek(week, priorValid ? prior : null, since)
  return { body: line.body, line, week, prior: priorValid ? prior : null, profile }
}

export async function sendWeeklySummary({ now = new Date(), force = false } = {}) {
  let profile = null
  try { profile = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' }, select: { pilotSummaryAt: true } }) } catch { return { on: false } }
  if (!force && !summaryDue(profile || {}, now)) return { due: false }
  const devices = await tradeDeviceCount()
  if (devices === 0) return { due: !force, sent: 0, devices: 0, why: 'no_trade_phone' }
  if (!force) {
    const claimed = await prisma.tradeProfile.updateMany({
      where: { id: 'singleton', OR: [{ pilotSummaryAt: null }, { pilotSummaryAt: { lt: weekStart(now) } }] },
      data: { pilotSummaryAt: now },
    }).catch(() => ({ count: 0 }))
    if (claimed.count !== 1) return { due: true, sent: 0, why: 'already' }
  }
  const { body, line } = await buildWeeklySummary({ now })
  const r = await pushTrade({ ...line, url: '/dashboard?open=pilot', tag: 'pilot-week' })
  return { due: !force, sent: r.sent, devices, body }
}
