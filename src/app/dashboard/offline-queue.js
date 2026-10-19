/**
 * A tap with no signal still counts.
 *
 * The dashboard is used in vans, in plant rooms and under floors. A stage tap
 * that fails because there is no signal used to be a red strip and a tap to
 * remember; this keeps it. Every write from the dashboard goes through
 * queueFetch(): if the network is not there, the request is written to
 * IndexedDB with the time of the tap and whatever location fix the phone can
 * give, and sent in order the moment the page is back online. The server is
 * told the tap was queued (offline: true) and when it was really made
 * (deviceAt), so the customer reads "Set off at 07:42, sent at 07:58 when
 * back in signal" rather than a time that is simply wrong.
 *
 * Why not Background Sync in the service worker: Safari on iOS does not have
 * it, and that is the phone this runs on. The queue flushes when the page is
 * open and online, which on a home-screen app is every time it is opened.
 *
 * Nothing in the queue is ever dropped on failure. A 4xx answer means the
 * server read it and said no, which is final; a network failure means try
 * again next time. Order is kept: On site never overtakes On my way.
 */
const DB = 'turnup-queue', STORE = 'taps', VERSION = 1
const listeners = new Set()
let flushing = false

function idb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no_idb'))
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
const tx = (db, mode, fn) => new Promise((resolve, reject) => {
  const t = db.transaction(STORE, mode); const r = fn(t.objectStore(STORE))
  t.oncomplete = () => resolve(r?.result); t.onerror = () => reject(t.error)
})
async function all() { try { const db = await idb(); return (await tx(db, 'readonly', (s) => s.getAll())) || [] } catch { return [] } }
async function put(item) { const db = await idb(); await tx(db, 'readwrite', (s) => s.put(item)) }
async function del(id) { const db = await idb(); await tx(db, 'readwrite', (s) => s.delete(id)) }

const notify = async () => { const items = await all(); for (const cb of listeners) { try { cb(items) } catch { /* a listener's problem */ } } }
export function onQueue(cb) { listeners.add(cb); all().then((i) => cb(i)); return () => listeners.delete(cb) }
export const pending = () => all()

/** A fix for the tap, if the phone will give one quickly. Never blocks the tap. */
function quickFix(timeout = 4000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    const done = (v) => resolve(v)
    const t = setTimeout(() => done(null), timeout)
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); done({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, fixAt: new Date(p.timestamp).toISOString() }) },
      () => { clearTimeout(t); done(null) }, { enableHighAccuracy: true, timeout, maximumAge: 120_000 })
  })
}

const isNetworkFailure = (e) => e instanceof TypeError || e?.name === 'AbortError' || e?.name === 'TimeoutError'

/**
 * fetch(), but a tap. Resolves to { ok, status, json } when the server
 * answered, or { queued: true, id } when it could not be reached. Only used
 * for writes that are safe to replay: a stage, a note, a no-access record.
 */
export async function queueFetch(url, { method = 'POST', body = null, timeoutMs = 12_000 } = {}) {
  const deviceAt = new Date().toISOString()
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  // The tap's id is made BEFORE the first attempt and sent with it. Until
  // v1.67.0 it was made only when the tap was queued, so an online attempt
  // that timed out after the server had already taken it came back later as
  // a new tap: two No one home records, two "sorry we missed you" notes,
  // and a wasted trip counted twice on the pilot panel.
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  if (!offline) {
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify({ ...body, tapId: id }) : JSON.stringify({ tapId: id }), signal: AbortSignal.timeout(timeoutMs) })
      let json = null; try { json = await r.json() } catch { json = null }
      return { ok: r.ok, status: r.status, json }
    } catch (e) {
      if (!isNetworkFailure(e)) throw e
    }
  }
  const item = { id, url, method, body: body || {}, deviceAt, attempts: 0 }
  await put(item); notify()
  // The fix is added after the tap is safe, so a slow GPS never costs the tap.
  quickFix().then(async (fix) => { if (fix) { item.fix = fix; try { await put(item) } catch { /* keep the unfixed one */ } } })
  return { queued: true, id }
}

/** Send what is waiting, in order. Stops at the first network failure. */
export async function flush() {
  if (flushing) return { sent: 0, left: null }
  flushing = true
  let sent = 0
  try {
    const items = (await all()).sort((a, b) => a.deviceAt.localeCompare(b.deviceAt))
    for (const item of items) {
      // tapId makes a replay idempotent: the server treats the same id twice as
      // one tap, so a flush cut off by a page change cannot double anything.
      const body = { ...item.body, tapId: item.id, deviceAt: item.deviceAt, offline: true, ...(item.fix ? { lat: item.fix.lat, lng: item.fix.lng, accuracy: item.fix.accuracy, fixAt: item.fix.fixAt } : {}) }
      try {
        const r = await fetch(item.url, { method: item.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) })
        // Any answer from the server settles it. 5xx is the server's bad
        // moment, not ours: keep it and try again next pass.
        if (r.status >= 500) { item.attempts += 1; await put(item); break }
        await del(item.id); sent += 1
      } catch (e) {
        if (!isNetworkFailure(e)) { await del(item.id); continue }
        item.attempts += 1; await put(item); break
      }
    }
  } finally { flushing = false; notify() }
  return { sent, left: (await all()).length }
}

/** Wire the flush to the moments signal usually comes back. Call once per page. */
export function startQueue(onFlushed) {
  if (typeof window === 'undefined') return () => {}
  const run = async () => { const r = await flush(); if (r.sent) onFlushed?.(r) }
  const onVisible = () => { if (document.visibilityState === 'visible') run() }
  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisible)
  const t = setInterval(run, 20_000)
  run()
  return () => { window.removeEventListener('online', run); document.removeEventListener('visibilitychange', onVisible); clearInterval(t) }
}
