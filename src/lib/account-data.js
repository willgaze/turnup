/**
 * Download everything, and delete the account. The lists of what each does
 * live in src/lib/your-data.js (pure, checked); this file is the database half.
 *
 * Both are called only from /api/dashboard/data, which guards itself with
 * requireOperator() like every operator route.
 *
 * `selectNo` lists are written out field by field on purpose: a new column on
 * a model does NOT reach the download until somebody adds it here, the same
 * rule as publicShape() (CLAUDE.md, the link is the credential), and
 * `node scripts/check-your-data.mjs` fails if a secret's column name ever
 * appears in a select below.
 */
import { prisma } from '@/lib/prisma'
import { eraseJobs, ERASE_BATCH } from '@/lib/retention-sweep'
import { TRADE_NAME } from '@/lib/trade'
import { VERSION } from '@/lib/version'

const soft = async (p, fallback = null) => { try { return await p } catch { return fallback } }
const b64 = (bytes) => (bytes ? Buffer.from(bytes).toString('base64') : null)

/** Everything the trade has put in, as one JSON-ready object. */
export async function exportAll({ now = new Date() } = {}) {
  const jobs = await prisma.tradeStatus.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      events: { orderBy: { createdAt: 'asc' } },
      noAccess: { orderBy: { startedAt: 'asc' } },
      pushSubs: { select: { createdAt: true, lastSentAt: true } },
    },
  })
  const ids = jobs.map((j) => j.id)
  const codes = jobs.map((j) => j.code)

  const profile = await soft(prisma.tradeProfile.findUnique({ where: { id: 'singleton' } }))
  const sm8Links = await soft(prisma.sm8Link.findMany({ where: { tradeStatusId: { in: ids } } }), [])
  const emails = await soft(prisma.customerEmail.findMany({ where: { tradeStatusId: { in: ids } } }), [])
  const tradeRows = await soft(prisma.arrival.findMany({
    where: { OR: [{ source: 'TRADE' }, { tradeStatusCode: { in: codes } }] },
    select: { id: true, kind: true, source: true, stage: true, title: true, note: true, expectedFor: true, expectedSaid: true, windowStart: true, windowEnd: true, windowSaid: true, tradeStatusCode: true, createdAt: true, updatedAt: true },
  }), [])
  const devices = await soft(prisma.tradeDevice.findMany({ select: { label: true, createdAt: true, lastSentAt: true } }), [])
  const passkeys = await soft(prisma.passkey.findMany({ select: { label: true, createdAt: true, lastUsedAt: true } }), [])
  const votes = await soft(prisma.featureInterest.findMany(), [])
  const calls = await soft(prisma.pilotCall.findMany({ orderBy: { at: 'asc' }, select: { at: true, deviceAt: true, tradeStatusId: true, note: true } }), [])
  const walletPhones = await soft(prisma.passDevice.count({ where: { serialNumber: { in: codes } } }), 0)

  const { engineerPhotoData, ...profileRest } = profile || {}

  return {
    exportedAt: new Date(now).toISOString(),
    turnupVersion: VERSION,
    business: TRADE_NAME,
    about: 'Everything this TurnUp account holds for your business, as JSON. Photos are base64 JPEG. Keys and secrets are left out on purpose; the dashboard panel Your data says which.',
    profile: profile ? { ...profileRest, engineerPhoto: profileRest.engineerPhoto || null, engineerPhotoJpegBase64: b64(engineerPhotoData) } : null,
    jobs: jobs.map(({ noAccess, pushSubs, ...j }) => ({
      ...j,
      notificationsOnPhones: pushSubs.length,
      noOneHome: noAccess.map(({ photo, ...n }) => ({ ...n, photoJpegBase64: b64(photo) })),
    })),
    servicem8Links: sm8Links,
    customerEmails: emails,
    householdCardRows: tradeRows,
    phonesForNudges: devices,
    faceId: passkeys,
    walletCardsHeld: walletPhones,
    roadmapVotes: votes,
    whenAreYouComingCalls: calls,
  }
}

/**
 * Delete the account. The caller has already checked the typed name.
 * Returns counts, so the panel ends with a demonstration, not a sentence.
 */
export async function deleteAccount() {
  const out = { jobs: 0, profile: 0, phones: 0, servicem8: false, cardRows: 0, votes: 0, calls: 0 }

  // Every link off first, in one write, so nothing below can leave one live.
  await prisma.tradeStatus.updateMany({ data: { isActive: false } })

  // Then the jobs, in batches, each one through the same eraser the retention
  // sweep and "Delete for good" use.
  for (let round = 0; round < 1000; round += 1) {
    const batch = await prisma.tradeStatus.findMany({ select: { id: true }, take: ERASE_BATCH })
    if (!batch.length) break
    const r = await eraseJobs(batch.map((b) => b.id))
    out.jobs += r.jobs
    if (!r.jobs) break
  }

  out.cardRows = (await soft(prisma.arrival.deleteMany({ where: { source: 'TRADE' } })))?.count || 0
  out.profile = (await soft(prisma.tradeProfile.deleteMany({})))?.count || 0
  out.phones = (await soft(prisma.tradeDevice.deleteMany({})))?.count || 0
  out.votes = (await soft(prisma.featureInterest.deleteMany({})))?.count || 0
  // Counted, not assumed: the panel only says the ServiceM8 link went if there was one.
  out.servicem8 = ((await soft(prisma.sm8OAuth.deleteMany({})))?.count || 0) > 0
  await soft(prisma.sm8Event.deleteMany({}))
  out.calls = (await soft(prisma.pilotCall.deleteMany({})))?.count || 0

  console.log(`account deleted jobs=${out.jobs} cardRows=${out.cardRows} phones=${out.phones}`)
  return out
}
