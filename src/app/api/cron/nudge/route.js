import { NextResponse } from 'next/server'
import { nudgeAll } from '@/lib/nudge'
import { autoFollow } from '@/lib/sm8-auto'
import { reviewAsks } from '@/lib/review'

export const dynamic = 'force-dynamic'

/**
 * Sweep every live job and send whatever nudge is due.
 *
 * Vercel Cron calls this every five minutes (vercel.json); a slower GitHub
 * Actions ping in .github/workflows/nudge.yml is the backup. GitHub alone ran
 * it about every four hours, which is why it moved (v1.56.0). Without one the same check still runs on the customer's 30-second
 * poll and after every ServiceM8 sync — but only while somebody has the page
 * open, which is exactly the case a trade cannot rely on. A window passing
 * unnoticed because nobody happened to be looking is the failure this closes.
 *
 * OPEN BY DEFAULT, AND THAT IS A CHOICE. Every level fires once and a repeat is
 * paced to ten minutes inside nudgeAll(), whoever calls it, so hammering this
 * cannot produce extra notifications. Set CRON_SECRET and it starts requiring
 * `Authorization: Bearer <secret>` — the header Vercel Cron sends — without
 * anything else changing. Unset, it stays open, so the schedule works today
 * with nothing to configure.
 */

// A sweep reads every live job. The nudges are already paced, so this is about
// the database rather than the notifications: one sweep every twenty seconds is
// far more than a five-minute schedule needs, and caps what an open URL costs.
const MIN_GAP_MS = 20 * 1000
let lastSweep = 0

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  if (now - lastSweep < MIN_GAP_MS) {
    // Not an error: the caller asked, the answer is that nothing is due to be
    // re-checked yet. A scheduler seeing 200 keeps quiet, which is right.
    return NextResponse.json({ ok: true, at: new Date().toISOString(), skipped: 'too soon' })
  }
  lastSweep = now

  try {
    const r = await nudgeAll()
    // Follow every ServiceM8 booking, when switched on: cards for new
    // bookings, the link texted after the automation's head start. Its own
    // failures are its own; the nudges above have already gone.
    const follow = await autoFollow().catch((e) => ({ on: true, error: e.message }))
    // Two hours after Job done: how did it go? Once per job.
    const reviews = await reviewAsks().catch((e) => ({ on: true, error: e.message }))
    // One line per sweep, so the schedule can be checked in Vercel's logs: a
    // warm function otherwise logs nothing, and a schedule with no evidence is
    // a schedule nobody can tell has stopped. Counts only, no names.
    const who = /vercel-cron/i.test(request.headers.get('user-agent') || '') ? 'vercel-cron' : 'other'
    console.log(`sweep by=${who} checked=${r.checked ?? 0} nudged=${(r.nudged || []).length}`)
    return NextResponse.json({ ok: true, at: new Date().toISOString(), ...r, follow, reviews })
  } catch (error) {
    console.error('cron nudge failed:', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
