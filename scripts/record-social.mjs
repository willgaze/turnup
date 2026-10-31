/**
 * Film the customer's card going round once, for the homepage.
 *
 *   npm run build && npx next start &
 *   npm run record:social            # BASE defaults to http://localhost:3000
 *
 * Writes public/video/customer-card.{mp4,webm,jpg}: a phone-shaped (390x844
 * at 2x) silent loop of /demo moving Booked in -> On my way -> On site ->
 * Job done, about 13 seconds, and the first frame as the poster.
 *
 * Rules it keeps, and why:
 *   - LOCAL ONLY. It refuses any BASE that is not localhost. The demo on
 *     production is a page customers are sent to try, not a thing to drive.
 *   - EVERY NON-GET REQUEST IS BLOCKED, and counted. Since v1.78.0 the demo
 *     answers its own taps on the page, so the count should be zero; a
 *     non-zero count fails the run, because it means the demo has started
 *     posting again and the video would have been filming real requests.
 *   - It drives the stage through `window.__turnupDemo`, which StatusTracker
 *     exposes under the demo provider and nowhere else. Nothing is tapped
 *     that a customer could not tap; the stage is the trade's move, so the
 *     recorder plays the trade.
 *   - Frames, not a screen recording: a fixed number of frames per stage,
 *     so the loop is the same length every run and ends where it starts.
 *   - It is a picture of the live product. The banner that says "This is an
 *     example" is hidden for the shot because the caption on the homepage
 *     says it; nothing else is touched or retouched. If the card changes,
 *     re-run it (CLAUDE.md).
 *
 * Needs ffmpeg on the PATH (libx264 and libvpx-vp9) and playwright
 * (`npm install --no-save playwright`); CHROME_PATH picks the browser.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile, rm, stat, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { atLocalTime } from '../src/lib/when.js'

const BASE = process.env.BASE || 'http://localhost:3000'
const host = new URL(BASE).hostname
if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) {
  console.error(`record-social: refusing ${BASE}. It films a local server only; never point it at production.`)
  process.exit(2)
}
const EXEC = process.env.CHROME_PATH || undefined
const OUT = new URL('../public/video/', import.meta.url).pathname
const FPS = 12
const LIMIT = 1.5 * 1024 * 1024

/* The story, in frames. Booked in holds long enough to read the day, then
   the three taps a trade makes in a morning, then back to the start. */
/* The job is TOMORROW, in the trade's zone. The fixture's own day (1 Oct
   2026) is in the past, so a Booked in card on it says "the window started
   at 09:00 and nothing has moved yet", which is the page being honest about
   a date and the worst first three seconds a film could have. Tomorrow is
   the one day on which a booked job is never late whatever time the film is
   made. The hours stay the fixture's: agreed 09:00-11:00, set off at 08:00. */
const tomorrow = new Date(Date.now() + 86_400_000)
const at = (hhmm) => atLocalTime(tomorrow, hhmm).toISOString()
const SCENES = [
  { stage: 'BOOKED', note: null, at: at('06:00'), hold: 3.0 },
  { stage: 'ON_MY_WAY', note: 'Cylinder is on the van, picked it up from the merchant first thing.', at: at('08:00'), hold: 3.5 },
  { stage: 'ON_SITE', note: null, at: at('09:10'), hold: 3.0 },
  { stage: 'DONE', note: null, at: at('11:40'), hold: 3.5 },
]
const DAY = {
  scheduledFor: at('00:00'), arrivingAt: null, events: [], presenceAt: null, position: 2,
  window: { state: 'AGREED', by: 'TRADE', start: at('09:00'), end: at('11:00'), at: at('07:00') },
}

const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  colorScheme: 'light', locale: 'en-GB', timezoneId: 'Europe/London',
})
let blocked = 0
await ctx.route('**/*', (route) => {
  if (route.request().method() !== 'GET') { blocked++; console.error(`record-social: blocked ${route.request().method()} ${route.request().url()}`); return route.abort() }
  return route.continue()
})
const page = await ctx.newPage()
await page.goto(`${BASE}/demo?stage=BOOKED`, { waitUntil: 'networkidle' })
if (await page.locator('text=404').count()) { console.error('record-social: /demo is a 404 here. It is off in production; run against a local build.'); process.exit(1) }
/* The banner is the demo's, not the customer's; the caption says it. And a
   real iPhone pushes the page down under its own status bar by its safe
   area (59px on a 14 Pro), which a headless viewport has none of, so the
   same room is made here: without it the first line sits under the status
   bar Device.jsx draws over the film. */
await page.addStyleTag({ content: '[data-demo-banner]{display:none !important} main.pt-safe{padding-top:59px !important}' })
await page.waitForFunction(() => typeof window.__turnupDemo?.setStage === 'function')
await page.evaluate((day) => window.__turnupDemo.patch(day), DAY)
await page.waitForTimeout(600) // the rise animation

const frames = join(tmpdir(), `turnup-frames-${process.pid}`)
await rm(frames, { recursive: true, force: true }); await mkdir(frames, { recursive: true })
let n = 0
for (const s of SCENES) {
  await page.evaluate(([stage, note, at]) => window.__turnupDemo.setStage(stage, note, at), [s.stage, s.note, s.at])
  await page.evaluate(() => window.scrollTo(0, 0))
  const count = Math.round(s.hold * FPS)
  for (let i = 0; i < count; i++) {
    const t0 = Date.now()
    await writeFile(join(frames, `${String(++n).padStart(4, '0')}.png`), await page.screenshot({ type: 'png' }))
    const left = 1000 / FPS - (Date.now() - t0)
    if (left > 0) await page.waitForTimeout(left)
  }
  console.log(`  ${s.stage.padEnd(10)} ${count} frames`)
}
await browser.close()
if (blocked) { console.error(`record-social: ${blocked} non-GET request(s) were attempted. The demo is posting again; fix that before filming it.`); process.exit(1) }

await mkdir(OUT, { recursive: true })
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const input = ['-framerate', String(FPS), '-i', join(frames, '%04d.png')]
ff([...input, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', join(OUT, 'customer-card.mp4')])
ff([...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', join(OUT, 'customer-card.webm')])
ff(['-i', join(frames, '0001.png'), '-q:v', '5', join(OUT, 'customer-card.jpg')])
await rm(frames, { recursive: true, force: true })

let over = false
for (const f of ['customer-card.mp4', 'customer-card.webm', 'customer-card.jpg']) {
  const { size } = await stat(join(OUT, f))
  const kb = Math.round(size / 1024)
  if (size > LIMIT) over = true
  console.log(`  ${f.padEnd(18)} ${kb} KB${size > LIMIT ? '  OVER 1.5 MB' : ''}`)
}
console.log(`  ${n} frames at ${FPS} fps = ${(n / FPS).toFixed(1)} s`)
if (over) { console.error('record-social: a file is over 1.5 MB; raise the crf or shorten a hold.'); process.exit(1) }
