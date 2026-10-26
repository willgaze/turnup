/**
 * The deleting half of retention, and the one way a job is erased.
 *
 * `eraseJobs()` is used by three callers and they must all do the same thing,
 * so there is one of it:
 *
 * - the daily retention sweep (`sweepRetention()`, from /api/cron/retention),
 * - "Delete for good" on one job (DELETE /api/dashboard/trackers/<id>?erase=1),
 *   which is how a customer's erasure request is met,
 * - "Delete account" (src/lib/account-data.js).
 *
 * WHICH rows are due is never decided here: the sweep queries to narrow and
 * then asks `jobDue()` / `arrivalDue()` in src/lib/retention.js, which is pure
 * and checked by `node scripts/check-retention.mjs`.
 *
 * Things that are not obvious:
 *
 * - **The link dies first.** `isActive: false` is written before anything is
 *   deleted, so if a later step fails the customer's page is already a 404 and
 *   the Wallet card is already refused.
 * - **Wallet registrations are kept on purpose.** `PassDevice` has no foreign
 *   key to the job. Leaving the row lets the phone ask what changed, be told
 *   the card is dead (`serialsChangedSince()` reports a missing code as
 *   changed), get a 401 for the pass, and take it off. Rows for a job that no
 *   longer exists go `ORPHAN_PASS_DAYS` later, in the sweep.
 * - **A household card keeps its row, unlinked.** An Arrival a trade's job put
 *   on a household card belongs to the household; erasing the job clears its
 *   `tradeStatusCode` so the row no longer points at a dead link, and the
 *   household's own 90-day rule takes it from there.
 * - **Every table that may not exist yet is wrapped** (`soft()`): a new table
 *   that has not migrated must not stop the rows that can be deleted from
 *   being deleted (CLAUDE.md, shipping a schema change).
 */
import { prisma } from '@/lib/prisma'
import { jobDue, arrivalDue, orphanPassDue, cutoffs } from '@/lib/retention'
import { notifyPassUpdated } from '@/lib/pass-devices'
import { expireGoogleCard } from '@/lib/google-wallet'

const soft = async (p) => { try { return await p } catch (error) { console.warn('retention: skipped a step:', error?.message); return null } }

/** How many jobs one call will erase. The rest wait for the next sweep. */
export const ERASE_BATCH = 200

/**
 * Erase jobs by id: the job, its timeline, the customer's answers (they are
 * columns on the job), No one home records, push subscriptions, the
 * ServiceM8 link and its log lines, the email claims. Returns what it did,
 * as counts, for the caller to log or show.
 */
export async function eraseJobs(ids, { tellWallets = true } = {}) {
  const list = [...new Set((ids || []).filter(Boolean))].slice(0, ERASE_BATCH)
  if (!list.length) return { jobs: 0 }

  const rows = await prisma.tradeStatus.findMany({ where: { id: { in: list } }, select: { id: true, code: true } })
  const idsFound = rows.map((r) => r.id)
  const codes = rows.map((r) => r.code)
  if (!idsFound.length) return { jobs: 0 }

  // 1. The links die before anything else.
  await prisma.tradeStatus.updateMany({ where: { id: { in: idsFound } }, data: { isActive: false } })

  // 2. Rows that point at a job without a foreign key.
  await soft(prisma.sm8Link.deleteMany({ where: { tradeStatusId: { in: idsFound } } }))
  await soft(prisma.sm8Event.deleteMany({ where: { tradeStatusId: { in: idsFound } } }))
  await soft(prisma.customerEmail.deleteMany({ where: { tradeStatusId: { in: idsFound } } }))
  await soft(prisma.arrival.updateMany({ where: { tradeStatusCode: { in: codes } }, data: { tradeStatusCode: null } }))

  // 3. The job. Events, No one home records and push subscriptions cascade.
  const gone = await prisma.tradeStatus.deleteMany({ where: { id: { in: idsFound } } })

  // 4. Tell any wallet holding a card for these jobs. Apple's push makes the
  //    phone ask; it is told the card is dead and removes it. Google has no
  //    such call, so the card is expired, which moves it out of the way.
  if (tellWallets) {
    for (const code of codes) {
      await soft(notifyPassUpdated(code))
      await soft(expireGoogleCard(code))
    }
  }

  return { jobs: gone.count }
}

/**
 * The daily sweep. Narrow with a query, decide with the pure rule, erase.
 * `now` is a parameter so a check can run it against a fixed clock.
 */
export async function sweepRetention({ now = new Date() } = {}) {
  const cut = cutoffs(now)
  const out = { jobs: 0, arrivals: 0, passDevices: 0 }

  // Jobs: Done now, with a Done moment at or before the cut-off (or no events
  // at all and nothing touched since). The rule then reads the LATEST Done
  // event, so a job finished again last month is not due.
  const candidates = await prisma.tradeStatus.findMany({
    where: {
      stage: 'DONE',
      OR: [
        { events: { some: { stage: 'DONE', createdAt: { lte: cut.jobsDoneBefore } } } },
        { events: { none: { stage: 'DONE' } }, updatedAt: { lte: cut.jobsDoneBefore } },
      ],
    },
    select: { id: true, stage: true, updatedAt: true, events: { where: { stage: 'DONE' }, select: { stage: true, createdAt: true } } },
    take: ERASE_BATCH,
  })
  const due = candidates.filter((j) => jobDue(j, now)).map((j) => j.id)
  if (due.length) out.jobs = (await eraseJobs(due)).jobs

  // Household rows that arrived more than ARRIVAL_KEEP_DAYS ago.
  const arrived = await soft(prisma.arrival.findMany({
    where: { stage: 'DONE', updatedAt: { lte: cut.arrivedBefore } },
    select: { id: true, stage: true, updatedAt: true },
    take: 1000,
  }))
  const arrivalIds = (arrived || []).filter((a) => arrivalDue(a, now)).map((a) => a.id)
  if (arrivalIds.length) {
    const r = await soft(prisma.arrival.deleteMany({ where: { id: { in: arrivalIds } } }))
    out.arrivals = r?.count || 0
  }

  // Wallet registrations for jobs that no longer exist, once they have had
  // time to hear so.
  const stale = await soft(prisma.passDevice.findMany({
    where: { updatedAt: { lte: cut.orphanPassBefore } },
    select: { id: true, serialNumber: true, updatedAt: true },
    take: 1000,
  }))
  if (stale?.length) {
    const live = await prisma.tradeStatus.findMany({
      where: { code: { in: [...new Set(stale.map((r) => r.serialNumber))] } },
      select: { code: true },
    })
    const liveCodes = new Set(live.map((r) => r.code))
    const orphanIds = stale.filter((r) => orphanPassDue(r, liveCodes, now)).map((r) => r.id)
    if (orphanIds.length) {
      const r = await soft(prisma.passDevice.deleteMany({ where: { id: { in: orphanIds } } }))
      out.passDevices = r?.count || 0
    }
  }

  return out
}
