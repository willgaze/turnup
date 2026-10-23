/**
 * The pure half of the Wallet update service: no database, no network, so
 * `node scripts/check-pass-service.mjs` can prove it without either.
 *
 * Apple's protocol (PassKit Web Service Reference), in one place:
 *   POST   /v1/devices/{device}/registrations/{passType}/{serial}  register   201 | 200 | 401
 *   DELETE /v1/devices/{device}/registrations/{passType}/{serial}  unregister 200 | 401
 *   GET    /v1/devices/{device}/registrations/{passType}?passesUpdatedSince=tag
 *                                                  → { serialNumbers, lastUpdated } | 204 | 404
 *   GET    /v1/passes/{passType}/{serial}          the latest .pkpass | 304 | 401
 *   POST   /v1/log                                 { logs: [...] } → 200
 * Every call that names a serial carries `Authorization: ApplePass <token>`,
 * the authenticationToken baked into that pass. The device listing does not
 * (Apple's design): the device identifier is the secret there.
 */

/** 'ApplePass abc123' → 'abc123'. Anything else → null. */
export function applePassToken(header) {
  const m = /^\s*ApplePass\s+([A-Za-z0-9._-]{8,256})\s*$/.exec(String(header || ''))
  return m ? m[1] : null
}

/**
 * The `lastUpdated` tag this service hands out is the newest change as
 * milliseconds since the epoch, as a string. Wallet hands it straight back as
 * `passesUpdatedSince`; it is opaque to Wallet and must only be read by us.
 * Anything that is not a plain integer is treated as "from the beginning".
 */
export function sinceDate(tag) {
  if (tag == null || tag === '') return null
  if (!/^\d{1,16}$/.test(String(tag))) return null
  const d = new Date(Number(tag))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Which of a device's passes changed since the tag. `rows` are the live
 * trackers this device holds passes for: [{ code, updatedAt }]. Returns null
 * when nothing changed (the route answers 204), otherwise the serials and the
 * new tag. The tag is the newest updatedAt of the WHOLE set, not of the changed
 * ones only — same thing when there is a change, and it keeps the tag moving.
 */
export function updatedSince(rows, since) {
  const live = (rows || []).filter((r) => r && r.code && r.updatedAt)
  const changed = live.filter((r) => !since || new Date(r.updatedAt).getTime() > since.getTime())
  if (changed.length === 0) return null
  const newest = Math.max(...live.map((r) => new Date(r.updatedAt).getTime()))
  return { serialNumbers: changed.map((r) => r.code), lastUpdated: String(newest) }
}

/**
 * Wallet sends If-Modified-Since with the Last-Modified it was last given,
 * which has one-second resolution. Not modified when the row's updatedAt,
 * rounded down to the second, is no newer than the header.
 */
export function notModified(updatedAt, ifModifiedSince) {
  if (!updatedAt || !ifModifiedSince) return false
  const ims = new Date(ifModifiedSince).getTime()
  if (Number.isNaN(ims)) return false
  const row = Math.floor(new Date(updatedAt).getTime() / 1000) * 1000
  return row <= ims
}

/**
 * What to do with APNs' answer. The same rule as web push: a token the
 * service says is dead is deleted, not retried for the life of the job.
 *   ok     delivered
 *   drop   the registration is dead; delete it
 *   cert   our certificate or topic is wrong; log loudly, keep the row
 *   retry  APNs is busy or down; keep the row, try on the next change
 */
export function apnsVerdict(status, reason) {
  const s = Number(status)
  const r = String(reason || '')
  if (s === 200) return 'ok'
  if (s === 410) return 'drop'
  if (s === 400 && /^(BadDeviceToken|DeviceTokenNotForTopic|Unregistered)$/.test(r)) return 'drop'
  if (s === 403 || (s === 400 && /^(BadTopic|MissingTopic|TopicDisallowed|BadCertificate|BadCertificateEnvironment)$/.test(r))) return 'cert'
  return 'retry'
}
