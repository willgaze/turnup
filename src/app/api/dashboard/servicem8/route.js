import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOperator } from '@/lib/operator-auth'
import { sm8Configured, webhookToken, callbackUrl, listSubscriptions, subscribe, unsubscribe, syncTracker, fetchJob, sendEmail, EVENTS } from '@/lib/servicem8'
import { recentCustomerEmails } from '@/lib/customer-email'
import { emailFor, validEmail } from '@/lib/customer-email-words'
import { pushConfigured } from '@/lib/push'
import { TRADE_NAME, CANONICAL_HOST } from '@/lib/trade'
import { oauthState, disconnect, redirectUri, saveApp, forgetApp, validAppId, validAppSecret } from '@/lib/sm8-oauth'
import { cleanText } from '@/lib/clean-text'

export const dynamic = 'force-dynamic'

const origin = (request) => {
  const h = request.headers
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || (String(host).startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** What the panel shows: configured? subscribed? what happened lately? */
export async function GET(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })

  const state = { configured: sm8Configured(), hasToken: Boolean(webhookToken()), callbackUrl: callbackUrl(origin(request)), events: EVENTS }
  if (state.configured) {
    try {
      const subs = await listSubscriptions()
      state.subscriptions = subs.filter((s) => s.unique_id === 'turnup' || String(s.callback_url || '').includes('/api/servicem8/webhook/'))
        .map((s) => ({ event: s.event, callback_url: s.callback_url, active: s.active ?? 1 }))
    } catch (e) { state.subscriptionsError = e.message }
  }
  // The add-on half: configured means an App ID and App Secret are held, from
  // the panel or from SM8_APP_ID / SM8_APP_SECRET; connected means the
  // operator has authorised it and tokens are held.
  state.oauth = { ...(await oauthState()), redirectUri: redirectUri(origin(request)) }
  try {
    const p = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' } })
    state.autoFollow = Boolean(p?.autoFollow)
    state.emailFallback = Boolean(p?.emailFallback)
  } catch { state.autoFollow = false; state.emailFallback = false }
  state.customerEmails = await recentCustomerEmails()
  try {
    state.recent = await prisma.sm8Event.findMany({ orderBy: { receivedAt: 'desc' }, take: 12 })
    state.linked = await prisma.sm8Link.count()
  } catch (e) { state.tablesMissing = true }
  return NextResponse.json(state)
}

/** Actions: subscribe, unsubscribe, sync (all linked), link (one tracker to a job number). */
export async function POST(request) {
  const operator = await requireOperator()
  if (operator !== true) return NextResponse.json({ error: operator.error }, { status: operator.status })
  const body = await request.json().catch(() => ({}))
  try {
    if (body.action === 'subscribe') {
      const results = await subscribe(origin(request))
      // "Being activated" is not a failure, it is a wait. Say so with a code
      // the panel can act on, rather than a list of five identical errors.
      const activating = results.some((x) => !x.ok && /being activated|try again/i.test(x.error || ''))
      return NextResponse.json({ results, activating }, { status: activating ? 202 : 200 })
    }
    if (body.action === 'unsubscribe') return NextResponse.json({ removed: await unsubscribe() })
    if (body.action === 'oauth_disconnect') { await disconnect(); return NextResponse.json({ ok: true }) }
    // The two values from ServiceM8's Developer page, pasted on the phone.
    // Never echoed back: the panel only ever sees the last four of the ID.
    if (body.action === 'oauth_app_save') {
      const appId = (cleanText(body.appId) || '').replace(/\s+/g, '')
      const appSecret = (cleanText(body.appSecret) || '').replace(/\s+/g, '')
      if (!validAppId(appId)) return NextResponse.json({ error: 'bad_app_id' }, { status: 400 })
      if (!validAppSecret(appSecret)) return NextResponse.json({ error: 'bad_app_secret' }, { status: 400 })
      await saveApp(appId, appSecret)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'oauth_app_forget') { await forgetApp(); return NextResponse.json({ ok: true }) }
    // The switch ends with an email arriving, not a sentence: the set-off
    // email as a customer would get it, to an address the trade types, with
    // a demo link. Not linked to any job, so it lands in no diary.
    if (body.action === 'email_test') {
      const to = String(body.to || '').trim()
      if (!validEmail(to)) return NextResponse.json({ error: 'bad_email' }, { status: 400 })
      const p = await prisma.tradeProfile.findUnique({ where: { id: 'singleton' } }).catch(() => null)
      const vehicle = [p?.vehicleColour, p?.vehicleMake, p?.vehicleModel].filter(Boolean).join(' ')
      const mail = emailFor({ kind: 'ON_MY_WAY', tradeName: TRADE_NAME, host: CANONICAL_HOST, code: 'K7M4PQRT', who: { name: p?.engineerName?.split(' ')[0] || null, vehicle: vehicle || null, reg: p?.vehicleReg || null }, pushOn: pushConfigured() })
      await sendEmail({ to, subject: `Test: ${mail.subject}`, text: mail.text })
      return NextResponse.json({ ok: true, to })
    }
    if (body.action === 'sync') {
      const linked = await prisma.tradeStatus.findMany({ where: { isActive: true, externalId: { not: null } } })
      const results = []
      for (const t of linked) results.push({ id: t.id, code: t.code, ...(await syncTracker(t, { source: 'sync.manual' })) })
      return NextResponse.json({ results })
    }
    if (body.action === 'link') {
      const job = await fetchJob({ number: body.jobNumber })
      if (!job) return NextResponse.json({ error: 'sm8_job_not_found' }, { status: 404 })
      const tracker = await prisma.tradeStatus.update({ where: { id: String(body.id) }, data: { externalId: job.uuid, jobRef: String(job.generated_job_id || body.jobNumber) } })
      return NextResponse.json({ tracker, ...(await syncTracker(tracker, { source: 'sync.link' })) })
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (e) {
    const status = e.message === 'sm8_key_rejected' ? 401 : e.message === 'sm8_not_configured' ? 409 : 502
    return NextResponse.json({ error: e.message }, { status })
  }
}
