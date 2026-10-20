import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TRADE_LINES } from '@/lib/trade-push-words'
import { pushTrade } from '@/lib/push'
import { diaryFor } from '@/lib/sm8-oauth'

export const dynamic = 'force-dynamic'

const CHOICES = [15, 30, 60]
const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })

/**
 * The customer running late themselves: 15, 30 or 60 minutes, or null for
 * "I'm there now". Public, like the page; the code is the credential. Only
 * before the trade is at the door: once On site, lateness is a conversation.
 * The minutes are the customer's own answer and do not come back out of the
 * public shape; the time they said it does.
 */
export async function POST(request, { params }) {
  const { code } = await params
  if (!code || code.length > 32) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  try {
    const row = await prisma.tradeStatus.findUnique({ where: { code: code.toUpperCase() } })
    if (!row || !row.isActive || !['BOOKED', 'ON_MY_WAY'].includes(row.stage)) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const m = body.minutes === null || body.minutes === undefined ? null : Number(body.minutes)
    if (m !== null && !CHOICES.includes(m)) return NextResponse.json({ error: 'bad_minutes' }, { status: 400 })
    const now = new Date()
    const who = row.customerName ? row.customerName.split(' ')[0] : 'The customer'
    const line = m ? `${who} says they are running about ${m} minutes late` : `${who} says they are there now`
    const updated = await prisma.tradeStatus.update({ where: { id: row.id }, data: {
      customerLateMinutes: m, customerLateAt: now,
      events: { create: { stage: row.stage, note: m ? `Customer says about ${m} minutes late.` : 'Customer says they are there now.' } },
    } })
    // `line` is the record and the diary, which are behind the password. The
    // notification says the same thing without naming them.
    const r = await pushTrade({ ...TRADE_LINES.customerLate(m, hhmm(now), m ? hhmm(now.getTime() + m * 60_000) : null), tag: `nudge-${row.code}` })
    diaryFor(updated, `${line} (${hhmm(now)})`).catch(() => {})
    return NextResponse.json({ ok: true, customerLateAt: now.toISOString(), minutes: m, sent: r.sent })
  } catch (error) {
    console.error('customer-late failed:', error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }
}
