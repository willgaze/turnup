/**
 * The Google Wallet card, decided without a database, a network or a key.
 *
 * Everything here is pure, so `node scripts/check-google-wallet.mjs` can run
 * the real thing. The half that signs, stores and talks to Google is in
 * google-wallet.js; this is what the card SAYS and where it lives.
 *
 * Google's shapes, checked against their own pages on 25 Oct 2026 rather than
 * recalled, because recalling Apple's cost two days this week:
 *
 *   - A save link is `https://pay.google.com/gp/v/save/<signed JWT>`, RS256,
 *     signed with the service account key.
 *   - The JWT claims are `iss` (the service account email), `aud: 'google'`,
 *     `typ: 'savetowallet'`, `iat`, `origins`, and a `payload` holding
 *     `genericClasses` and `genericObjects`. Putting the class in the same
 *     JWT means no REST call is needed to issue a card at all.
 *   - Ids are `<issuerId>.<suffix>` for both the class and the object.
 *   - **The encoded JWT must stay under about 1,800 characters**, because a
 *     longer link gets truncated by browsers. That is the one hard limit on
 *     this file and `jwtTooLong()` is the guard.
 */

/** The one class every TurnUp card belongs to. */
export const CLASS_SUFFIX = 'turnup_job'

/** Google's own ceiling on a save link, and the reason this card stays small. */
export const MAX_JWT = 1800

/**
 * A card is a glance, and Google's save link has a hard ceiling (MAX_JWT).
 * A 106-character address put a real card 48 characters over it -- and an
 * address that long is unreadable on a card anyway. So the glance fields are
 * trimmed on a word boundary where one is near, and the full thing stays one
 * tap away behind the QR and the link. It is the customer's own address: they
 * are not reading it to find out where they live.
 */
export function glance(value, max) {
  const v = String(value || '').trim()
  if (v.length <= max) return v
  const cut = v.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}\u2026`
}

export const NAME_MAX = 40
export const ADDRESS_MAX = 64

export const classId = (issuerId) => `${issuerId}.${CLASS_SUFFIX}`

/**
 * A job's object id. Google allows only letters, numbers, underscore, dash and
 * full stop in a suffix, and the code is already of that alphabet -- but it is
 * lowercased and prefixed so a code can never collide with the class suffix,
 * and so the id reads as ours in Google's console.
 */
export function objectId(issuerId, code) {
  const safe = String(code || '').replace(/[^A-Za-z0-9_-]/g, '').toLowerCase()
  if (!issuerId || !safe) return null
  return `${issuerId}.job_${safe}`
}

/**
 * The class: the parts that are the same on every card.
 *
 * `GENERIC_TYPE` rather than a boarding pass or a loyalty card, because this
 * is none of those and Google's generic type is the honest one.
 */
export function cardText({ status, stage }) {
  const text = []
  if (status?.customerName) text.push({ id: 'customer', header: 'CUSTOMER', body: glance(status.customerName, NAME_MAX) })
  if (stage?.position) text.push({ id: 'step', header: 'STEP', body: stage.position })
  if (status?.jobAddress) text.push({ id: 'where', header: 'WHERE', body: glance(status.jobAddress, ADDRESS_MAX) })
  return text
}

export function buildClass(issuerId) {
  return {
    id: classId(issuerId),
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [{
          twoItems: {
            startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['customer']" }] } },
            endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['step']" }] } },
          },
        }],
      },
    },
  }
}

/**
 * One job's card.
 *
 * What it carries is the same as the Apple pass and for the same reasons: the
 * trade's name, the stage, who and where, and a QR of the link. The customer's
 * own answers are not here, the way they are not in `publicShape()` -- a card
 * is as forwardable as a link.
 */
export function buildObject({ issuerId, status, stage, tradeName, origin, hexBackground }) {
  // No `subheader`: it would read "STATUS" above a word that is plainly a
  // status, and every character here is spent against MAX_JWT. The trade's
  // name is trimmed for the same reason -- see `glance()`.
  const id = objectId(issuerId, status?.code)
  if (!id) return null

  const url = `${origin}/t/${status.code}`
  const text = cardText({ status, stage })

  return {
    id,
    classId: classId(issuerId),
    state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'en-GB', value: glance(tradeName, NAME_MAX) } },
    header: { defaultValue: { language: 'en-GB', value: stage?.label || '' } },
    hexBackgroundColor: hexBackground || '#1f3b57',
    barcode: { type: 'QR_CODE', value: url, alternateText: status.code },
    textModulesData: text,
    linksModuleData: { uris: [{ uri: url, description: 'Full status', id: 's' }] },
  }
}

/**
 * The claims of a save-link JWT. Unsigned: signing needs the key, which lives
 * on the other side of this file.
 *
 * `origins` is the site the link is pressed from. Google's own samples leave
 * it empty or name a domain; naming ours is the tighter of the two.
 */
export function saveClaims({ serviceAccountEmail, issuerId, object, origin, withClass = false, now = Date.now() }) {
  return {
    iss: serviceAccountEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(now / 1000),
    origins: origin ? [new URL(origin).host] : [],
    payload: {
      // The class is NOT in here by default, and that is the whole reason the
      // link fits. Carrying it made a real card 2,094 characters against
      // Google's 1,800 ceiling -- a link a browser truncates, which is a
      // button that looks right and does nothing. The class is made once over
      // REST when the credentials are saved (`ensureClass()`), so every link
      // after that carries only the job. `withClass` exists for the one case
      // where the class could not be made and the link must stand alone; it
      // is checked against the ceiling the same as any other.
      ...(withClass ? { genericClasses: [buildClass(issuerId)] } : {}),
      genericObjects: [object],
    },
  }
}

export const saveUrl = (jwt) => `https://pay.google.com/gp/v/save/${jwt}`

/**
 * Is this link too long to survive a browser?
 *
 * Google's ceiling is about 1,800 characters of encoded JWT. Over it the link
 * is silently truncated, which is a button that looks fine and does nothing --
 * the failure this product keeps having to fix. So it is checked, and the
 * caller falls back to creating the object over REST and linking to a short
 * id instead of putting the whole card in the URL.
 */
export const jwtTooLong = (jwt) => String(jwt || '').length > MAX_JWT

/** The REST resource for one object, for an update after the card exists. */
export const objectResource = (issuerId, code) =>
  `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId(issuerId, code)}`

/**
 * What a stage change writes back. Only the fields that move: Google merges a
 * PATCH, so sending the whole object would overwrite things a person may have
 * changed in the console, and would also re-send the barcode on every tap.
 */
export function patchForStage({ stage, status }) {
  return {
    header: { defaultValue: { language: 'en-GB', value: stage?.label || '' } },
    textModulesData: cardText({ status, stage }),
  }
}
