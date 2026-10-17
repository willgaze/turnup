import { STAGES } from '@/lib/trade-status'

/**
 * The dashboard's half of the native shell (native/).
 *
 * Inside the iOS app, `window.Capacitor` exists and carries a LiveActivity
 * plugin. Everywhere else every function here is a no-op, so the dashboard
 * in a browser is untouched. One job at a time goes to the lock screen: the
 * first active one that is On my way, On site or Paused — the job you are on.
 */
const plugin = () => {
  if (typeof window === 'undefined') return null
  const cap = window.Capacitor
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return null
  return cap.Plugins?.LiveActivity || null
}

export const isNative = () => Boolean(plugin())

/** The job the lock screen should show, or null. */
export function currentJob(trackers) {
  return (trackers || []).find((t) => t.isActive && ['ON_MY_WAY', 'ON_SITE', 'PAUSED'].includes(t.stage)) || null
}

/** Start, update or end the Live Activity to match the rows. Never throws. */
export async function syncActivity(trackers) {
  const la = plugin()
  if (!la) return
  try {
    const job = currentJob(trackers)
    if (!job) { await la.end(); return }
    const since = job.events?.length ? job.events[job.events.length - 1].createdAt : job.updatedAt
    await la.sync({
      trackerId: job.id, code: job.code, stage: job.stage,
      stageLabel: STAGES[job.stage]?.label || job.stage,
      since: new Date(since || Date.now()).toISOString(),
      customer: (job.customerName || '').split(' ')[0],
      address: job.jobAddress || '',
      note: job.stageNote || '',
    })
  } catch { /* the lock screen is a nicety; the dashboard is the record */ }
}

/** Give the app a fresh bearer token for the lock-screen buttons. Never throws. */
export async function primeNativeToken() {
  const la = plugin()
  if (!la) return
  try {
    const r = await fetch('/api/dashboard/native-token', { method: 'POST' })
    if (!r.ok) return
    const { token } = await r.json()
    if (token) await la.setToken({ token })
  } catch { /* next open */ }
}
