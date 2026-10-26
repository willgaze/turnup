/**
 * Which phones hold which pass, and telling them when it moves.
 *
 * `PassDevice` is a new table, so every read here sits in a try/catch and
 * answers "no devices" if the migration has not run (CLAUDE.md, migrations).
 * The pass still downloads in that state and still shows the stage it was
 * added at — today's behaviour — rather than a stage tap erroring.
 */
import { prisma } from '@/lib/prisma'
import { pushToDevice, GONE, apnsConfigured, apnsMissing } from '@/lib/apns'

/**
 * Wallet registered, or re-registered. Apple re-sends this after a reinstall
 * and whenever the push token changes, so it is an upsert on (device, pass)
 * and the token is overwritten every time: a stale token is a card that
 * silently stops updating, which is the failure this whole service exists to
 * avoid.
 *
 * Returns `created` so the route can answer 201 the first time and 200 after,
 * which is what Apple's service expects and what stops Wallet retrying.
 */
export async function registerDevice({ deviceLibraryIdentifier, serialNumber, passTypeIdentifier, pushToken }) {
  const existing = await prisma.passDevice.findUnique({
    where: { deviceLibraryIdentifier_serialNumber: { deviceLibraryIdentifier, serialNumber } },
  })
  await prisma.passDevice.upsert({
    where: { deviceLibraryIdentifier_serialNumber: { deviceLibraryIdentifier, serialNumber } },
    create: { deviceLibraryIdentifier, serialNumber, passTypeIdentifier, pushToken },
    update: { pushToken, passTypeIdentifier },
  })
  return { created: !existing }
}

/** The pass was deleted from a wallet, or the job's link was switched off. */
export async function forgetDevice({ deviceLibraryIdentifier, serialNumber }) {
  await prisma.passDevice.deleteMany({ where: { deviceLibraryIdentifier, serialNumber } })
}

/**
 * What has changed for this device since it last asked.
 *
 * The serials are this device's own passes, filtered to the jobs whose row
 * has moved since the tag. A job whose link was revoked is reported as
 * changed too — Wallet then asks for it, gets a 401, and removes the card,
 * which is how a revoked link stops being a card in somebody's pocket.
 */
export async function serialsChangedSince(deviceLibraryIdentifier, passTypeIdentifier, since) {
  const rows = await prisma.passDevice.findMany({
    where: { deviceLibraryIdentifier, passTypeIdentifier },
    select: { serialNumber: true },
  })
  if (!rows.length) return { serialNumbers: [], lastUpdated: since }

  const codes = rows.map((r) => r.serialNumber)
  const moved = await prisma.tradeStatus.findMany({
    where: { code: { in: codes }, updatedAt: { gt: since } },
    select: { code: true, updatedAt: true },
  })

  // A code this device holds that no longer exists, or was revoked, counts as
  // changed: the card must be allowed to find out it is dead.
  const live = await prisma.tradeStatus.findMany({
    where: { code: { in: codes } },
    select: { code: true, isActive: true },
  })
  const liveSet = new Set(live.filter((r) => r.isActive).map((r) => r.code))
  const dead = codes.filter((c) => !liveSet.has(c))

  const serialNumbers = [...new Set([...moved.map((r) => r.code), ...dead])]
  const newest = moved.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), since)
  return { serialNumbers, lastUpdated: newest }
}

/**
 * A job moved: tell every phone holding its card.
 *
 * Called UN-AWAITED from the stage handler, the same rule as `notifyStage()`:
 * the trade tapped a button on a driveway and is waiting on that response,
 * and Apple being slow must never turn it into an error. Everything is
 * swallowed; the worst case is a card that catches up the next time Wallet
 * asks, which is where the product already is.
 *
 * A 410 means the pass was deleted from that wallet. The row goes, and is
 * never retried — the same rule the web-push subscriptions follow.
 */
export async function notifyPassUpdated(code) {
  try {
    if (!code) return { sent: 0, devices: 0 }
    const rows = await prisma.passDevice.findMany({ where: { serialNumber: code } })
    // Nobody holds this card. Not a problem, and not worth a line in the log.
    if (!rows.length) return { sent: 0, devices: 0 }

    // Somebody DOES hold it and we cannot push: say why, by name. A card that
    // silently stops moving is the whole failure this service exists to avoid,
    // and "nothing in the log" is the hardest version of it to diagnose.
    if (!apnsConfigured()) {
      console.warn(`pass push not configured for ${rows.length} device(s): ${apnsMissing().map((m) => m.key).join(', ')}`)
      return { sent: 0, devices: rows.length, blocked: true }
    }

    let sent = 0
    const gone = []
    for (const row of rows) {
      const r = await pushToDevice(row.pushToken)
      if (r.status === 200) sent += 1
      else if (r.status === GONE) gone.push(row.id)
      else if (r.status || r.error) console.warn('pass push', code, r.status || r.error, r.reason || '')
    }
    if (gone.length) await prisma.passDevice.deleteMany({ where: { id: { in: gone } } })

    // A push that WORKS logs too. This used to warn on failure and say nothing
    // on success, so the first proof that the push worked at all (25 Oct 2026)
    // had to be read from a line that was *absent* further down the log -- the
    // same reading-the-silence that cost two days on the wrong webServiceURL,
    // pointing the other way. A thing worth knowing happened should say so.
    console.log(`pass push code=${code} sent=${sent}/${rows.length}${gone.length ? ` dropped=${gone.length}` : ''}`)
    return { sent, devices: rows.length, dropped: gone.length }
  } catch (error) {
    // Includes the table not existing yet. Never throws into a stage tap.
    console.warn('pass update push failed:', error?.message)
    return { sent: 0, devices: 0 }
  }
}

/** How many phones hold this job's card. For the dashboard, and for honesty. */
export async function deviceCount(code) {
  try {
    return await prisma.passDevice.count({ where: { serialNumber: code } })
  } catch {
    return 0
  }
}
