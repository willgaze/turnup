import { PKPass } from 'passkit-generator'
import { STAGES, STAGE_ORDER, stageOf } from '@/lib/trade-status'
import { TRADE_NAME, TRADE_PHONE } from '@/lib/trade'
import { passImages } from '@/lib/pass-images'

/**
 * Apple Wallet passes.
 *
 * Everything here works today except the signature, which needs things only
 * an Apple Developer Program member can produce. They are read from the
 * environment so the certificate never enters the repository.
 * `bash scripts/apple-wallet.sh` makes every one of them:
 *
 *   PASSKIT_CERT_PEM        the Pass Type ID certificate, PEM
 *   PASSKIT_KEY_PEM         its private key, PEM (encrypted; the script makes it)
 *   PASSKIT_KEY_PASSWORD    the passphrase on that key
 *   PASSKIT_WWDR_PEM        Apple's WWDR G4 intermediate certificate, PEM
 *   PASSKIT_PASS_TYPE_ID    e.g. pass.com.getturnup.job
 *   PASSKIT_TEAM_ID         the 10-character Apple team identifier
 *
 * Each PEM may be given as the PEM text itself or as base64 of it, because a
 * one-line value is far easier to paste into an environment-variable form
 * than six hundred characters with line breaks in them.
 *
 * Until they exist, passkitConfigured() is false and the routes say so plainly
 * rather than returning a file iOS will silently refuse to open.
 *
 * The library (passkit-generator) wants PEM, not a .p12. An earlier version of
 * this file handed it a .p12 for both the certificate and the key, which
 * would have failed on the first real request with a forge parse error — the
 * kind of mistake that waits until the day the certificate arrives.
 */

const REQUIRED = [
  ['PASSKIT_CERT_PEM', 'the Pass Type ID certificate, PEM (or base64 of it)'],
  ['PASSKIT_KEY_PEM', 'the private key for that certificate, PEM (or base64 of it)'],
  ['PASSKIT_WWDR_PEM', "Apple's WWDR G4 intermediate certificate, PEM (or base64 of it)"],
  ['PASSKIT_PASS_TYPE_ID', 'e.g. pass.com.getturnup.job'],
  ['PASSKIT_TEAM_ID', 'the 10-character Apple team identifier'],
]

export function passkitConfigured() {
  return REQUIRED.every(([key]) => process.env[key])
}

// What is missing, named, so setting this up is not guesswork.
export function passkitMissing() {
  return REQUIRED.filter(([key]) => !process.env[key]).map(([key, what]) => ({ key, what }))
}

// A PEM, whether it was pasted as text or as one line of base64.
export function pem(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  if (v.includes('-----BEGIN')) return v.replace(/\\n/g, '\n')
  const decoded = Buffer.from(v, 'base64').toString('utf8')
  return decoded.includes('-----BEGIN') ? decoded : v
}

// Wallet wants #rrggbb or rgb(). Keep them here so the pass and the web page
// cannot drift apart.
const NAVY = 'rgb(31, 59, 87)'
const AMBER = 'rgb(240, 162, 2)'
const WHITE = 'rgb(255, 255, 255)'

/**
 * The pass body. Separated from signing so it can be rendered, diffed and
 * tested without a certificate — which is most of what there is to get wrong.
 */
export function buildPassJson(status, { origin, authToken }) {
  const stage = stageOf(status.stage)
  const step = STAGE_ORDER.indexOf(stage.key)
  const position = step >= 0 ? `${step + 1} of ${STAGE_ORDER.length}` : '—'

  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.PASSKIT_PASS_TYPE_ID,
    teamIdentifier: process.env.PASSKIT_TEAM_ID,
    organizationName: TRADE_NAME,
    // No logo image, so Wallet prints this top-left instead. The trade's name,
    // because it is their card.
    logoText: TRADE_NAME,
    // Shown in Notification Centre when the pass changes, so it reads as a
    // sentence a customer would want on their lock screen.
    description: `${TRADE_NAME} — job status`,
    serialNumber: status.code,

    foregroundColor: WHITE,
    backgroundColor: NAVY,
    labelColor: 'rgb(157, 182, 205)',

    // How the pass keeps itself up to date (src/app/api/passes/v1/...).
    // Wallet registers there, and pushPassUpdate() tells it when to bother.
    webServiceURL: `${origin}/api/passes/v1`,
    authenticationToken: authToken,

    // Tapping the barcode area opens the full page. The pass is the glance;
    // the page is the detail.
    associatedStoreIdentifiers: undefined,
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: `${origin}/t/${status.code}`,
        messageEncoding: 'iso-8859-1',
        altText: status.code,
      },
    ],

    generic: {
      headerFields: [
        ...(status.jobRef ? [{ key: 'job', label: 'JOB', value: `#${status.jobRef}` }] : []),
      ],
      primaryFields: [
        // The one field with a changeMessage. When the pass updates itself
        // (src/lib/pass-service.js) Wallet puts this on the lock screen under
        // the trade's name, so it is the stage and nothing else: the same rule
        // as LINES in src/lib/push.js. Never add a changeMessage to the
        // customer, address or note fields.
        { key: 'stage', label: 'STATUS', value: stage.label, changeMessage: '%@' },
      ],
      secondaryFields: [
        ...(status.customerName
          ? [{ key: 'customer', label: 'CUSTOMER', value: status.customerName }]
          : []),
        { key: 'step', label: 'STEP', value: position },
      ],
      auxiliaryFields: [
        ...(status.jobAddress
          ? [{ key: 'where', label: 'WHERE', value: status.jobAddress }]
          : []),
      ],
      backFields: [
        { key: 'what', label: 'Job', value: status.jobSummary || 'Plumbing work' },
        ...(status.stageNote ? [{ key: 'note', label: 'Latest', value: status.stageNote }] : []),
        ...(status.arrivingAt
          ? [{
              key: 'setoff', label: 'Set off',
              value: status.arrivingAt,
              dateStyle: 'PKDateStyleNone', timeStyle: 'PKDateStyleShort',
            }]
          : []),
        ...(TRADE_PHONE ? [{ key: 'phone', label: 'Call', value: TRADE_PHONE }] : []),
        { key: 'page', label: 'Full status', value: `${origin}/t/${status.code}` },
        // No promised arrival time anywhere on this pass, front or back. The
        // product does not make that promise on the page and must not make it
        // here either, where it would sit on a lock screen looking official.
        {
          key: 'about', label: 'About',
          value: `${TRADE_NAME} updates this card as the job moves. It shows what has happened, not what time anyone will arrive.`,
        },
      ],
    },
  }
}

/**
 * A signed .pkpass, as a Buffer. Throws if the certificate is not configured —
 * callers check passkitConfigured() first and say something useful.
 */
export async function buildSignedPass(status, { origin, authToken, images }) {
  if (!passkitConfigured()) throw new Error('passkit_not_configured')

  const json = buildPassJson(status, { origin, authToken })

  // The top-level props go in through the constructor, which validates them.
  // `pass.props` is a COPY — assigning to it is silently ignored, and a pass
  // built that way carried nothing but its fields: no pass type, no serial,
  // no colours, no web service. The test against a stand-in chain caught it.
  const { generic, barcodes, ...top } = json
  const props = Object.fromEntries(Object.entries(top).filter(([, v]) => v !== undefined))

  const pass = new PKPass(images || passImages(), {
    wwdr: pem(process.env.PASSKIT_WWDR_PEM),
    signerCert: pem(process.env.PASSKIT_CERT_PEM),
    signerKey: pem(process.env.PASSKIT_KEY_PEM),
    signerKeyPassphrase: process.env.PASSKIT_KEY_PASSWORD || undefined,
  }, props)

  pass.type = 'generic'
  pass.setBarcodes(...barcodes)
  for (const [group, fields] of Object.entries(generic)) {
    for (const f of fields) pass[group].push(f)
  }

  return pass.getAsBuffer()
}

export { STAGES, STAGE_ORDER }
