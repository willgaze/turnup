import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cleanText } from '@/lib/clean-text'

/**
 * A trade, or a household, asking to be told when this opens up (/join).
 *
 * Public and unauthenticated, because it is the one thing on the homepage a
 * stranger is meant to be able to do. Which means it gets the same treatment
 * as every other public route here:
 *
 *   - Throttled, because an open POST on a public URL is a form somebody will
 *     eventually point a script at.
 *   - Everything through cleanText(), which coerces rather than assumes — a
 *     JSON body can hand you a number where a string belongs, and `.trim()` on
 *     a number throws a TypeError that comes back as a 503 about the database.
 *   - It never reads anything back. There is no GET here at all. The list is
 *     other people's email addresses; it is readable on the dashboard, behind
 *     the password, and nowhere else.
 *
 * It also never says whether an address is already on the list. "You are
 * already signed up" turns this into a way to test whether a given trade has
 * registered, which is nobody's business but theirs — so a repeat submission
 * updates the row and answers exactly as a new one does.
 */
export const dynamic = 'force-dynamic'

// Same shape as the login throttle, and the same honesty about it: per-instance
// memory, so it is a speed bump rather than a lock. Worth having anyway — it
// turns a script's thousands of rows into a handful.
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_IP = 5
const hits = new Map()

function tooMany(key) {
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k)
  }
  return recent.length >= MAX_PER_IP
}

// Deliberately loose. The job of this check is to catch a typo and a bot, not
// to adjudicate RFC 5322 — a real address that a strict pattern rejects is a
// trade turned away at the door, which is worse than a junk row.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (tooMany(ip)) {
    return NextResponse.json({ error: 'too_many' }, { status: 429 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  }

  const email = cleanText(body?.email, 200)?.toLowerCase()
  if (!email || !LOOKS_LIKE_EMAIL.test(email)) {
    return NextResponse.json({ error: 'bad_email' }, { status: 400 })
  }

  const data = {
    email,
    trade: cleanText(body?.trade, 60) || null,
    town: cleanText(body?.town, 80) || null,
    // The name rides in `note` rather than a new column: columns on an existing
    // table are the migration that took every link down in v1.9.0, and a name on
    // a waiting list is read by a person, not queried. /join sends it.
    note: [cleanText(body?.name, 60) && `Name: ${cleanText(body?.name, 60)}`, cleanText(body?.note, 400)]
      .filter(Boolean).join(' · ') || null,
  }

  try {
    hits.set(ip, [...(hits.get(ip) || []), Date.now()])
    // Upsert, so signing up twice is one row. The update deliberately does not
    // blank fields the second form left empty.
    await prisma.waitlist.upsert({
      where: { email },
      create: data,
      update: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)),
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    // Most likely the table does not exist yet because `prisma db push` has not
    // run since this landed. Say so plainly rather than pretending it saved:
    // a waiting list nobody is on, that says they are on it, is worse than a
    // form that admits it is broken.
    console.error('waitlist save failed:', error?.code || error?.message)
    return NextResponse.json({ error: 'not_saved' }, { status: 503 })
  }
}
