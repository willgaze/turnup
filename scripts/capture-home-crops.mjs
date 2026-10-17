/**
 * The small pictures on the homepage: a part of a screen, not a whole phone.
 *
 *   NEXT_PUBLIC_TRADE_NAME="Sam Hale Plumbing" npm run build && npx next start -p 3100 &
 *   BASE=http://localhost:3100 node scripts/capture-home-crops.mjs
 *
 * Writes public/home/crops/<name>.webp and src/lib/home-crops.json (the
 * pixel size of each, which next/image needs). Rebuild afterwards: Next
 * serves only what was in public/ at build time.
 *
 * Two sources, deliberately:
 *
 *   - The customer's page is photographed live from /preview, the same
 *     fixture the diary uses, one element at a time: the status card at each
 *     of the five stages, and each row opened. Recapture; never retouch.
 *   - The trade's screens are photographed live too, one element at a time,
 *     signed in as the operator against the seeded local database
 *     (scripts/local-db.sh; OPERATOR_PASSWORD, default smoketest). Until
 *     v1.55.0 they were cut by pixel box from full captures made weeks
 *     earlier, which is how the homepage went on showing the glass look for
 *     a week after the flat one shipped. No database, no session: the trade
 *     crops are left as they are and the run says so.
 *   - The hero phone (public/home/customer-on-my-way.webp, the whole customer
 *     page at On my way) and the household card (public/home/household.webp,
 *     which house-card is cut from) are re-shot on every full pass for the
 *     same reason.
 *
 * The push row renders only when NEXT_PUBLIC_VAPID_PUBLIC_KEY was set at
 * build time, so build with one (any string will do for a photograph) or
 * row-notify is left as it was.
 *
 * Playwright is not a dependency: `npm install --no-save playwright`.
 * `ONLY=sm8 node scripts/capture-home-crops.mjs` cuts only the /with-servicem8
 * parts, `ONLY=house` only the household card (no browser either way),
 * `ONLY=after` only the How-did-it-go row from /preview?stage=DONE,
 * `ONLY=trade` only the trade's screens, and each leaves every other crop
 * untouched.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdir, writeFile, readFile } from 'node:fs/promises'

const BASE = process.env.BASE || 'http://localhost:3000'
const ROOT = new URL('../', import.meta.url).pathname
const OUT = `${ROOT}public/home/crops/`
const EXEC = process.env.CHROME_PATH || undefined
const PASSWORD = process.env.OPERATOR_PASSWORD || 'smoketest'

const sizes = {}
const save = async (png, name) => {
  const file = `${OUT}${name}.webp`
  const img = sharp(png)
  const { width, height } = await img.metadata()
  await img.webp({ quality: 84 }).toFile(file)
  sizes[name] = { w: width, h: height }
  console.log('  ', name, `${width}x${height}`)
}

// The rows on the customer page, by the title on the button that opens them.
const ROWS = [
  ['who',      'Who to expect'],
  ['presence', 'Will someone be in?'],
  ['window',   'When suits you?'],
  ['job',      'The job'],
  ['door',     'Help them find you'],
  ['history',  'What has happened'],
  ['terms',    'Before the visit'],
  ['notify',   'Tell me when they set off'],
]

// Rows that open long. A thumbnail wants the top of them, where the question is.
const TRIM = { 'row-door': 640, 'row-terms': 500, 'row-job': 560, 'trade-fields': 760 }

// /with-servicem8: parts of the captures scripts/capture-with-servicem8.mjs
// made (they need the seeded database and a fake ServiceM8, so they are not
// re-photographed here). Same output folder, sm8- prefix, so Shot.jsx reads them.
const SM8 = {
  'sm8-customer-booked': ['customer-booked.webp', 34, 364, 712, 442],
  'sm8-customer-onway':  ['customer-onway.webp',  34, 364, 712, 500],
  'sm8-customer-onsite': ['customer-onsite.webp', 34, 364, 712, 672],
  'sm8-customer-paused': ['customer-paused.webp', 34, 364, 712, 672],
  'sm8-customer-done':   ['customer-done.webp',   34, 364, 712, 512],
  'sm8-claim':           ['claim.webp',           34, 230, 712, 1280],
  'sm8-dashboard-card':  ['dashboard-card.webp',  34, 150, 712, 790],
  'sm8-dashboard-stage': ['dashboard-stage.webp', 34, 455, 712, 190],
  'sm8-panel-head':      ['dashboard-sm8.webp',    0,   0, 716, 150],
  'sm8-lately':          ['dashboard-lately.webp', 0,   0, 716, 504],
}

// The household card, cut from public/home/household.webp: a 390x844 shot at 2x
// of /h/<seeded code> (scripts/local-db.sh seeds HOME24XK). The dashboard's
// Household cards panel shows it.
const HOUSE = {
  'house-card': ['household.webp', 24, 80, 732, 1180],
}

// ONLY=sm8 or ONLY=house cuts just that group from its existing capture, no
// browser, and leaves every other crop as it is.
const GROUPS = { sm8: ['with-servicem8', SM8], house: ['home', HOUSE] }

// How did it go?, on the DONE page: a section with no button to open, so it
// is photographed whole. ONLY=after shoots just this one (browser needed).
const shootAfter = async (page, open) => {
  await open('/preview?stage=DONE')
  const section = page.locator('section', { hasText: 'How did it go?' }).first()
  await section.scrollIntoViewIfNeeded()
  await save(await section.screenshot({ type: 'png' }), 'row-after')
}

const trim = async (png, name) => {
  if (!TRIM[name]) return png
  const { width } = await sharp(png).metadata()
  return sharp(png).extract({ left: 0, top: 0, width, height: TRIM[name] }).png().toBuffer()
}

// One picture from two elements: the box that holds both, with a little air.
const clipAround = async (page, locators, pad = 14) => {
  const boxes = []
  for (const l of locators) { const b = await l.boundingBox(); if (b) boxes.push(b) }
  if (!boxes.length) throw new Error('nothing to photograph')
  const top = await page.evaluate(() => window.scrollY)
  const x = Math.min(...boxes.map((b) => b.x)) - pad
  const y = Math.min(...boxes.map((b) => b.y)) - pad + top
  const r = Math.max(...boxes.map((b) => b.x + b.width)) + pad
  const d = Math.max(...boxes.map((b) => b.y + b.height)) + pad + top
  return page.screenshot({ type: 'png', clip: { x, y, width: r - x, height: d - y }, fullPage: true })
}

// The trade's screens, live. Each shot is its own try/catch: one locator that
// has moved must cost one crop, not the run (the diary learned that the hard way).
const shootTrade = async (browser) => {
  let cookie = null
  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }),
    })
    const set = r.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0].split('=').slice(1).join('=')
  } catch {}
  if (!cookie) { console.log('   NO SESSION: the trade crops are left as they were (run scripts/local-db.sh first)'); return }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' })
  await ctx.addCookies([{ name: 'mts-session', value: cookie, url: BASE }])
  const page = await ctx.newPage()
  const shot = async (name, fn) => {
    try { await save(await trim(await fn(), name), name) }
    catch (e) { console.log('   SKIPPED', name, '-', e.message.slice(0, 70)) }
  }
  const goto = async (path, ms = 1200) => { await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(ms) }

  // Sign in: the Face ID button and the password line under it.
  await goto('/login')
  await shot('trade-faceid', () => clipAround(page, [
    page.getByRole('button', { name: /Face ID/ }).first(),
    page.getByRole('button', { name: /password/ }).first(),
  ]))

  // The dashboard: the first job's stage buttons; Navigate and the door note
  // on the job that is On site (the seed's K7M4PQRT has a side door, a dog and a note).
  await goto('/dashboard')
  await shot('trade-stage-buttons', async () => {
    const g = page.locator('[role="group"][aria-label="Stage"]').first()
    await g.scrollIntoViewIfNeeded()
    return g.screenshot({ type: 'png' })
  })
  // Navigate waits under More until the job is On my way, so open the first
  // job (the seed's On-site one) to photograph it with the note.
  await shot('trade-navigate-note', async () => {
    const more = page.getByRole('button', { name: 'More' }).first()
    await more.scrollIntoViewIfNeeded(); await more.click(); await page.waitForTimeout(500)
    const nav = page.locator('a', { hasText: 'Navigate' }).first()
    const note = page.locator('text=/There is a dog|Side door/').first()
    const noteBox = note.locator('xpath=ancestor::div[contains(@class,"r-inner")][1]')
    await nav.scrollIntoViewIfNeeded()
    return clipAround(page, [nav, (await noteBox.count()) ? noteBox : note])
  })

  // The same open job: the send box.
  await shot('trade-send', async () => {
    if (!(await page.locator('p', { hasText: 'Send this to the customer' }).count())) {
      await page.getByRole('button', { name: 'More' }).first().click(); await page.waitForTimeout(500)
    }
    const box = page.locator('p', { hasText: 'Send this to the customer' }).first()
      .locator('xpath=ancestor::div[contains(@class,"r-inner")][1]')
    await box.scrollIntoViewIfNeeded()
    return box.screenshot({ type: 'png' })
  })

  // New job: the form, from the top.
  await shot('trade-fields', async () => {
    await goto('/dashboard', 800)
    await page.getByRole('button', { name: /New job/ }).first().click(); await page.waitForTimeout(500)
    const form = page.locator('form').first()
    await form.scrollIntoViewIfNeeded()
    return form.screenshot({ type: 'png' })
  })

  // Who to expect, under Setup and settings: the plate and what it fills in.
  await shot('trade-plate', async () => {
    await goto('/dashboard', 800)
    const setup = page.getByRole('button', { name: /Setup and settings/ }).first()
    if (await setup.count()) { await setup.click(); await page.waitForTimeout(600) }
    const panel = page.locator('#panel-profile')
    const opener = panel.getByRole('button', { name: /Who to expect/ }).first()
    if (await opener.count()) { await opener.click(); await page.waitForTimeout(500) }
    const label = panel.locator('label', { hasText: 'Van registration' }).first()
    const make = panel.locator('label', { hasText: 'Make' }).first()
    await label.scrollIntoViewIfNeeded()
    return clipAround(page, [label, make])
  })
  await ctx.close()
}

// The household card, whole, for the house-card crop below: a 390x844 shot at
// 2x of the seeded card (scripts/local-db.sh seeds HOME24XK). Refuses to write
// a card that says it has expired: the seed skipped the Place table.
const shootHouse = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(BASE + `/h/${process.env.DEMO_PLACE || 'HOME24XK'}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  if (/expired/i.test(await page.textContent('body'))) {
    console.log('   HOUSEHOLD CARD SAYS EXPIRED: household.webp left as it was (npx prisma generate, then the seed)')
  } else {
    await sharp(await page.screenshot({ type: 'png' })).webp({ quality: 86 }).toFile(`${ROOT}public/home/household.webp`)
    console.log('   household (whole card) 780x1688')
  }
  await ctx.close()
}

// The hero phone on the homepage: the whole customer page at On my way, the
// size Device.jsx draws it (390x780 at 2x).
const shootHero = async (browser) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(BASE + '/preview?stage=ON_MY_WAY', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1100)
  const png = await page.screenshot({ type: 'png' })
  await sharp(png).webp({ quality: 84 }).toFile(`${ROOT}public/home/customer-on-my-way.webp`)
  console.log('   customer-on-my-way (hero phone) 780x1560')
  await ctx.close()
}

const run = async () => {
  await mkdir(OUT, { recursive: true })
  const existing = JSON.parse(await readFile(`${ROOT}src/lib/home-crops.json`, 'utf8').catch(() => '{}'))
  const only = process.env.ONLY
  if (only && only !== 'after' && only !== 'trade' && !GROUPS[only]) throw new Error(`ONLY=${only}: not one of after, trade, ${Object.keys(GROUPS).join(', ')}`)
  if (only === 'trade') {
    const browser = await chromium.launch({ executablePath: EXEC })
    await shootTrade(browser)
    await browser.close()
  }
  if (!only || only === 'after') {
  const browser = await chromium.launch({ executablePath: EXEC })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' })
  const page = await ctx.newPage()

  const open = async (path) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1100) // the rows rise in; wait for them to land
    if (await page.locator('nextjs-portal').count()) {
      throw new Error(`${BASE} is a dev server. Capture against \`next start\`.`)
    }
  }

  if (only === 'after') {
    await shootAfter(page, open)
    await browser.close()
  } else {

  // The status card, one per stage.
  for (const stage of ['BOOKED', 'ON_MY_WAY', 'ON_SITE', 'PAUSED', 'DONE']) {
    await open(`/preview?stage=${stage}`)
    const card = page.locator('section[aria-live="polite"]').first()
    await save(await card.screenshot({ type: 'png' }), `stage-${stage.toLowerCase().replace('_', '-').replace('_', '-')}`)
  }

  // Each row, opened, on the busiest page.
  await open('/preview')
  for (const [name, title] of ROWS) {
    const btn = page.locator('button', { hasText: title }).first()
    if (!(await btn.count())) { console.log(`   NO ROW "${title}": row-${name} left as it was` + (name === 'notify' ? ' (build with NEXT_PUBLIC_VAPID_PUBLIC_KEY set)' : '')); continue }
    const section = page.locator('section', { has: btn }).first()
    await btn.click()
    await page.waitForTimeout(350)
    await section.scrollIntoViewIfNeeded()
    await save(await trim(await section.screenshot({ type: 'png' }), `row-${name}`), `row-${name}`)
    await btn.click() // shut it again so the next one is photographed alone
    await page.waitForTimeout(250)
  }

  await shootAfter(page, open)
  await shootHero(browser)
  await shootHouse(browser)
  await shootTrade(browser)
  await browser.close()
  }
  }

  for (const [group, [dir, map]] of Object.entries(GROUPS)) {
    if (only && only !== group) continue
    for (const [name, [src, left, top, width, height]] of Object.entries(map)) {
      const png = await sharp(`${ROOT}public/${dir}/${src}`).extract({ left, top, width, height }).png().toBuffer()
      await save(png, name)
    }
  }

  await writeFile(`${ROOT}src/lib/home-crops.json`, JSON.stringify({ ...existing, ...sizes }, null, 2) + '\n')
  console.log('wrote', Object.keys(sizes).length, 'crops')
}

run().catch((e) => { console.error(e); process.exit(1) })
