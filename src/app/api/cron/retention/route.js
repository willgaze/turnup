import { NextResponse } from 'next/server'
import { sweepRetention } from '@/lib/retention-sweep'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * The retention sweep. Vercel Cron calls this once a day (vercel.json).
 *
 * The rule is src/lib/retention.js (pure, `node scripts/check-retention.mjs`);
 * this only runs it. **Open by default for the same reason as the nudge
 * sweep:** it deletes only what the rule says is already due, so calling it
 * more often cannot delete anything sooner. Set CRON_SECRET and it requires
 * `Authorization: Bearer <secret>`, the header Vercel Cron sends.
 *
 * One line per run, counts only, so the schedule can be checked in Vercel's
 * logs rather than trusted from its config (CLAUDE.md, the nudge sweep).
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    console.log('retention refused: bad or missing cron secret')
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const r = await sweepRetention()
    console.log(`retention jobs=${r.jobs} arrivals=${r.arrivals} passDevices=${r.passDevices}`)
    return NextResponse.json({ ok: true, at: new Date().toISOString(), ...r })
  } catch (error) {
    console.error('retention sweep failed:', error?.message)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
