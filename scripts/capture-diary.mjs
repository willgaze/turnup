/**
 * Capture this version's look into the diary.
 *
 *   node scripts/capture-diary.mjs            # against a running dev/prod server
 *   BASE=http://localhost:3000 node scripts/capture-diary.mjs
 *
 * Every build keeps its own folder under docs/diary/<version>/, so nothing is
 * overwritten and the whole history stays browsable — for checking a change
 * landed, and for marketing later.
 *
 * Saved as WebP at 2x on a phone viewport. A PNG of each screen every night
 * would put a gigabyte a year into git; WebP at quality 82 is a tenth of that
 * and still sharp enough to put in front of someone. If this ever does get
 * heavy, the fix is object storage with the diary holding links — not deleting
 * the history, which is the one thing it exists for.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { VERSION, BUILD_DATE, theme, CHANGELOG } from '../src/lib/version.js'

const BASE = process.env.BASE || 'http://localhost:3000'
const PASSWORD = process.env.OPERATOR_PASSWORD || 'smoketest'
const CODE = process.env.DEMO_CODE
// The household card needs a real Place, so it is shot only when one is
// named — seed-local.mjs prints the code it makes.
const PLACE = process.env.DEMO_PLACE
const OUT = new URL(`../docs/diary/v${VERSION}/`, import.meta.url).pathname
const EXEC = process.env.CHROME_PATH || undefined

// Without a DEMO_CODE there is no real job to photograph, so the customer
// shots come from /preview — the same component, drawn from a fixture. That is
// the difference between a diary entry and no diary entry on a machine with no
// database, and it keeps a real customer's name out of the marketing folder.
const CUSTOMER = CODE ? `/t/${CODE}` : '/preview'

const SHOTS = [
  { name: 'customer-light', path: () => CUSTOMER, scheme: 'light', full: true, auth: false },
  { name: 'customer-dark',  path: () => CUSTOMER, scheme: 'dark',  full: true, auth: false },
  // The state the page spends most of its life in. Only the fixture can show
  // it on demand, so it is skipped when shooting a real job.
  ...(CODE ? [] : [{ name: 'customer-booked', path: () => '/preview?stage=BOOKED', scheme: 'light', full: true, auth: false }]),
  { name: 'dashboard',      path: () => '/dashboard', scheme: 'light', full: true, auth: true, db: true },
  { name: 'dashboard-setup', path: () => '/dashboard', scheme: 'light', full: true, auth: true, db: true, open: /Setup and settings/ },
  { name: 'login',          path: () => '/login',     scheme: 'light', full: false, auth: false },
  // The homepage is a page in its own right now rather than a "you have
  // mistyped your link" card, so it is captured whole.
  { name: 'homepage',       path: () => '/',          scheme: 'light', full: true,  auth: false },
  { name: 'homepage-dark',  path: () => '/',          scheme: 'dark',  full: true,  auth: false },
  // The pages a visitor reaches from the homepage (v1.62.0): one per audience,
  // and the sign-up whose card builds as it is filled in.
  { name: 'for-trades',     path: () => '/for-trades', scheme: 'light', full: true, auth: false },
  { name: 'for-homes',      path: () => '/for-homes',  scheme: 'light', full: true, auth: false },
  { name: 'join',           path: () => '/join',       scheme: 'light', full: true, auth: false },
  // The household card: the other half of the product, and the one that has
  // to be looked at as often as the job page, or it will drift the way the
  // dashboard did while nobody could run it.
  ...(PLACE ? [
    { name: 'household',      path: () => `/h/${PLACE}`, scheme: 'light', full: true, auth: false },
    { name: 'household-dark', path: () => `/h/${PLACE}`, scheme: 'dark',  full: true, auth: false },
  ] : []),
]

// Playwright only writes PNG or JPEG; sharp (already here as a Next.js dependency)
// turns the PNG buffer into the WebP the diary keeps.
/**
 * WebP cannot hold an image taller than 16,383px, and at deviceScaleFactor 2
 * that is any page over about 8,190 CSS pixels. The homepage passed it, sharp
 * threw "Processed image is too large for the WebP format", the throw took the
 * whole run down with it, and v1.18 to v1.20 recorded almost nothing of the
 * product as a result — only the plan pages, which happened to be captured
 * first. So: scale a giant page down to fit rather than lose it.
 */
const WEBP_MAX = 16383

const toWebp = async (png, file) => {
  const img = sharp(png)
  const { height = 0, width = 0 } = await img.metadata()
  const tall = height > WEBP_MAX
  return (tall
    ? img.resize({ width: Math.max(1, Math.round(width * (WEBP_MAX / height))), height: WEBP_MAX })
    : img
  ).webp({ quality: 82 }).toFile(file)
}

const run = async () => {
  await mkdir(OUT, { recursive: true })
  if (!CODE) console.log('No DEMO_CODE \u2014 customer shots from /preview, operator shots skipped.')

  const browser = await chromium.launch({ executablePath: EXEC })
  let cookie = null
  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD }),
    })
    const set = r.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0].split('=').slice(1).join('=')
  } catch {
    // No database, no session. The shots that need one are skipped below.
  }

  const done = []
  const skipped = []
  if (!PLACE) skipped.push('the household card (set DEMO_PLACE to a seeded place code)')

  // The wallet views are the marketing shots — the ones that show what this
  // is, without a paragraph of explanation. Captured separately because each
  // needs a tab clicked first.
  if (!cookie) {
    skipped.push('the wallet views and the dashboard (they need an operator session)')
  } else {
    // WRAPPED, AND THE WRAPPING IS THE POINT. This block threw for three
    // builds — v1.38, v1.39 and v1.40 have no diary folder at all — because
    // the dashboard's panels moved inside a collapsed "Setup and settings"
    // and the wallet section stopped being in the page. One locator that
    // cannot find its element took down every other shot in the run, which is
    // the exact failure the WebP guard above was written for, happening again
    // somewhere else. Nothing in this script may throw past its own shot.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
    try {
      await ctx.addCookies([{ name: 'mts-session', value: cookie, url: BASE }])
      const page = await ctx.newPage()
      await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
      await page.waitForTimeout(1000)
      // The setup panels are shut by default — seven panels used once each
      // were the second half of every visit to a screen meant for a driveway.
      const setup = page.getByRole('button', { name: /Setup and settings/ })
      if (await setup.count()) { await setup.first().click(); await page.waitForTimeout(700) }
      const card = page.locator('section', { hasText: 'The wallet card' }).first()
      await card.scrollIntoViewIfNeeded({ timeout: 8000 })
      // The showcase is shut by default too.
      const opener = card.getByRole('button', { name: /The wallet card/ })
      if (await opener.count()) { await opener.first().click(); await page.waitForTimeout(400) }
      for (const [tab, name] of [['In the wallet', 'wallet-in-stack'],
                                 ['Opened', 'wallet-opened'],
                                 ['On its own', 'wallet-alone']]) {
        try {
          await page.getByRole('button', { name: tab, exact: true }).click({ timeout: 8000 })
          await page.waitForTimeout(500)
          await toWebp(await card.screenshot({ type: 'png' }), `${OUT}${name}.webp`)
          done.push(name)
          console.log('  captured', name)
        } catch (e) {
          skipped.push(`${name} (${e.message.slice(0, 60)})`)
          console.log('  SKIPPED', name, '-', e.message.slice(0, 60))
        }
      }
    } catch (e) {
      skipped.push(`the wallet views (${e.message.slice(0, 60)})`)
      console.log('  SKIPPED the wallet views -', e.message.slice(0, 60))
    } finally {
      await ctx.close()
    }
  }

  for (const shot of SHOTS) {
    if (shot.db && !cookie) continue
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: shot.scheme,
    })
    if (shot.auth && cookie) {
      await ctx.addCookies([{ name: 'mts-session', value: cookie, url: BASE }])
    }
    const page = await ctx.newPage()
    await page.goto(BASE + shot.path(), { waitUntil: 'networkidle' })
    await page.waitForTimeout(900)
    // Open the setup panels on the dashboard, or the diary records a screen
    // with its whole second half folded away.
    if (shot.open) {
      const opener = page.getByRole('button', { name: shot.open })
      if (await opener.count()) { await opener.first().click(); await page.waitForTimeout(900) }
    }
    // The dev server draws its own badge over the page. v1.4.0's diary was
    // captured with it in every shot. Refuse rather than record it.
    if (await page.locator('nextjs-portal').count()) {
      throw new Error(`${BASE} is a dev server (Next's badge is on the page). Capture against \`next start\`.`)
    }
    const file = `${OUT}${shot.name}.webp`
    try {
      // Scroll the whole page first. Pictures below the fold load lazily, and a
      // full-page shot taken from the top records their frames empty: every
      // homepage diary until v1.58.0 has blank boxes where the pictures are.
      if (shot.full) {
        const h = await page.evaluate(() => document.body.scrollHeight)
        for (let y = 0; y < h; y += 600) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(90) }
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(700)
      }
      await toWebp(await page.screenshot({ fullPage: shot.full, type: 'png' }), file)
      done.push(shot.name)
      console.log('  captured', shot.name)
    } catch (e) {
      // Record the gap and carry on. A run that dies on its fourth shot leaves
      // a diary that looks complete and is not.
      skipped.push(`${shot.name} (${e.message.slice(0, 80)})`)
      console.log('  SKIPPED', shot.name, '-', e.message.slice(0, 80))
    }
    await ctx.close()
  }
  await browser.close()

  const t = theme()
  const release = CHANGELOG.find((c) => c.version === VERSION)
  await writeFile(`${OUT}README.md`, `# v${VERSION} — ${t.name}

**${BUILD_DATE}** · background \`${t.bg}\` · accent \`${t.accent}\`

${(release?.notes || ['No notes recorded.']).map((n) => `- ${n}`).join('\n')}
${skipped.length ? `\nNot captured this time: ${skipped.join('; ')}.\n` : ''}

${done.map((n) => `### ${n}\n\n![${n}](./${n}.webp)`).join('\n\n')}
`)
  console.log(`\nDiary written to docs/diary/v${VERSION}/`)
}

run().catch((e) => { console.error(e.message); process.exit(1) })
