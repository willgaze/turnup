/**
 * The poster frames, re-shot from the app as it is today.
 *
 *   NEXT_PUBLIC_TRADE_NAME="Sam Hale Plumbing" NEXT_PUBLIC_VAPID_PUBLIC_KEY=x npm run build
 *   npx next start -p 3100 &
 *   BASE=http://localhost:3100 node scripts/capture-posters.mjs
 *
 * Two passes, in this order, because the second photographs the first:
 *
 *   1. The phone screens a poster shows (public/home/customer-*.webp,
 *      trade-*.webp, dashboard.webp), 390x780 at 2x, the size Device.jsx draws.
 *      The customer's come from /preview, the fixture; the trade's need the
 *      seeded local database (scripts/local-db.sh) and sign in with
 *      OPERATOR_PASSWORD (default smoketest). Without a session the trade
 *      screens are left as they were and the run says so.
 *   2. Every frame in src/lib/posters.js, from /preview/posters?n=<key>, at
 *      621x1344 at 2x (1242x2688, the App Store size) into
 *      public/home/frame-<key>.webp.
 *
 * Until v1.63.0 there was no script: the screens were captured on 12 Oct, under
 * the glass look, and the posters kept showing it for a week after the flat one
 * shipped. Recapture; never retouch. Note: the image optimiser caches by URL,
 * so a screen re-shot under a running server shows its OLD self in the frames:
 * capture the screens, then `rm -rf .next/cache/images`, restart, ONLY=frames. Each shot is its own try/catch, so one
 * locator that has moved costs one picture, not the run.
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { FRAMES } from '../src/lib/posters.js'

const BASE = process.env.BASE || 'http://localhost:3100'
const EXEC = process.env.CHROME_PATH || '/opt/pw-browsers/chromium'
const PASSWORD = process.env.OPERATOR_PASSWORD || 'smoketest'
const ROOT = new URL('../', import.meta.url).pathname
const ONLY = process.env.ONLY // screens | frames

const save = async (png, name) => {
  await sharp(png).webp({ quality: 84 }).toFile(`${ROOT}public/home/${name}.webp`)
  console.log('  ', name)
}
const attempt = async (name, fn) => {
  try { await fn() } catch (e) { console.log('   SKIPPED', name, '-', e.message.split('\n')[0].slice(0, 80)) }
}
// next/image loads lazily, and a picture below the fold at the moment of the
// shot is a blank box in the poster (trade-profile's was, first time round).
const settle = async (page) => {
  await page.evaluate(async () => {
    const imgs = [...document.images]
    imgs.forEach((i) => { i.loading = 'eager' })
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000) }))))
  })
  await page.waitForTimeout(300)
}
// Put an element near the top of the phone, under where the status bar would be.
const toTop = async (page, locator, gap = 70) => {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  await page.evaluate(([y]) => window.scrollBy(0, y), [box.y - gap])
  await settle(page)
}


// The dashboard prints its own origin into the link it hands out, so a capture
// against a local server shows http://127.0.0.1:3100/t/... where a trade sees
// https://www.getturnup.com/t/.... That address was on the homepage's
// "Send it in one tap" picture from v1.58.0 to v1.63.0. Put the real one back
// before the shot: it is the environment, not the design, being corrected.
const LIVE_ORIGIN = 'https://www.getturnup.com'
const asLive = (page) => page.evaluate(([from, to]) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.includes(from)) n.nodeValue = n.nodeValue.split(from).join(to)
}, [new URL(BASE).origin, LIVE_ORIGIN])

const PHONE = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, colorScheme: 'light' }

/* [file, row title on the customer's page] */
const CUSTOMER = [
  ['customer-window', 'When suits you?'],
  ['customer-presence', 'Will someone be in?'],
  ['customer-find-you', 'Help them find you'],
  ['customer-who', 'Who to expect'],
  ['customer-notify', 'Tell me when they set off'],
  ['customer-history', 'What has happened'],
]

async function customerScreens(browser) {
  const ctx = await browser.newContext(PHONE)
  const page = await ctx.newPage()
  const open = async (path) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await settle(page)
    if (await page.locator('nextjs-portal').count()) throw new Error(`${BASE} is a dev server. Capture against next start.`)
  }
  for (const [name, title] of CUSTOMER) {
    await attempt(name, async () => {
      await open('/preview')
      const btn = page.locator('button', { hasText: title }).first()
      if (!(await btn.count())) throw new Error(`no row "${title}"${name === 'customer-notify' ? ' (build with NEXT_PUBLIC_VAPID_PUBLIC_KEY set)' : ''}`)
      await btn.click()
      await page.waitForTimeout(400)
      await toTop(page, btn, 60)
      await save(await page.screenshot({ type: 'png' }), name)
    })
  }
  await attempt('customer-paused', async () => {
    await open('/preview?stage=PAUSED')
    await save(await page.screenshot({ type: 'png' }), 'customer-paused')
  })
  await ctx.close()
}

async function tradeScreens(browser) {
  // Signed out first: the sign-in screen.
  await attempt('trade-login', async () => {
    const ctx = await browser.newContext(PHONE)
    const page = await ctx.newPage()
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await save(await page.screenshot({ type: 'png' }), 'trade-login')
    await ctx.close()
  })

  let cookie = null
  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }),
    })
    const set = r.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0].split('=').slice(1).join('=')
  } catch {}
  if (!cookie) { console.log('   NO SESSION: the trade screens are left as they were (run scripts/local-db.sh first)'); return }

  const ctx = await browser.newContext(PHONE)
  await ctx.addCookies([{ name: 'mts-session', value: cookie, url: BASE }])
  const page = await ctx.newPage()
  const dash = async () => { await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' }); await settle(page); await asLive(page) }

  await attempt('trade-run', async () => {
    await dash()
    await save(await page.screenshot({ type: 'png' }), 'trade-run')
  })
  await attempt('dashboard', async () => {
    await dash()
    await toTop(page, page.locator('[role="group"][aria-label="Stage"]').first(), 230)
    await save(await page.screenshot({ type: 'png' }), 'dashboard')
  })
  await attempt('trade-job-open', async () => {
    await dash()
    const more = page.getByRole('button', { name: 'More' }).first()
    await more.scrollIntoViewIfNeeded(); await more.click(); await page.waitForTimeout(500)
    // The poster is "Send it in one tap", and the phone runs off the bottom of
    // it, so the send box has to sit in the top half of the screen.
    const send = page.locator('p', { hasText: 'Send this to the customer' }).first()
    await toTop(page, (await send.count()) ? send : page.locator('[role="group"][aria-label="Stage"]').first(), 170)
    await asLive(page)
    await save(await page.screenshot({ type: 'png' }), 'trade-job-open')
  })
  await attempt('trade-new-job', async () => {
    await dash()
    await page.getByRole('button', { name: /New job/ }).first().click(); await page.waitForTimeout(500)
    await toTop(page, page.locator('form').first(), 40)
    await save(await page.screenshot({ type: 'png' }), 'trade-new-job')
  })
  await attempt('trade-profile', async () => {
    await dash()
    const setup = page.getByRole('button', { name: /Setup and settings/ }).first()
    if (await setup.count()) { await setup.click(); await page.waitForTimeout(600) }
    const panel = page.locator('#panel-profile')
    const opener = panel.getByRole('button', { name: /Who to expect/ }).first()
    await opener.click(); await page.waitForTimeout(500)
    await toTop(page, opener, 40)
    await save(await page.screenshot({ type: 'png' }), 'trade-profile')
  })
  await ctx.close()
}

async function frames(browser) {
  const ctx = await browser.newContext({ viewport: { width: 621, height: 1344 }, deviceScaleFactor: 2, colorScheme: 'light' })
  const page = await ctx.newPage()
  for (const f of FRAMES) {
    await attempt(`frame-${f.key}`, async () => {
      await page.goto(`${BASE}/preview/posters?n=${encodeURIComponent(f.key)}`, { waitUntil: 'networkidle' })
      await settle(page)
      const el = page.locator('div.relative.overflow-hidden').first()
      await save(await el.screenshot({ type: 'png' }), `frame-${f.key}`)
    })
  }
  await ctx.close()
}

const browser = await chromium.launch({ executablePath: EXEC })
try {
  if (ONLY !== 'frames') {
    console.log('screens')
    await customerScreens(browser)
    await tradeScreens(browser)
  }
  if (ONLY !== 'screens') {
    console.log('frames')
    await frames(browser)
  }
} finally {
  await browser.close()
}
