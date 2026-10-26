'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { STAGES, stageOf } from '@/lib/trade-status'
import Passkeys from './Passkeys'
import PushSetup from './PushSetup'
import Mark from '@/components/Mark'
import BuildStamp from '@/components/BuildStamp'
import Changelog from './Changelog'
import Profile from './Profile'
import Terms from './Terms'
import WalletShowcase from './WalletShowcase'
import GoogleWallet from './GoogleWallet'
import WaitlistPanel from './WaitlistPanel'
import Roadmap from './Roadmap'
import ServiceM8 from './ServiceM8'
import Nudges from './Nudges'
import Doors from './Doors'
import InboundSetup from './InboundSetup'
import Sources from './Sources'
import Assistant from './Assistant'
import Tip from './Tip'
import NoAccess from './NoAccess'
import TheyRang from './TheyRang'
import Pilot from './Pilot'
import Sm8Week from './Sm8Week'
import { AttendanceSheet } from './Pictures'
import { nextJobAfterDone, leftToday } from '@/lib/next-job'
import { queueFetch, startQueue, onQueue } from './offline-queue'
import { presenceOf, presenceIsFresh, presenceAgeLabel } from '@/lib/presence'
import { dayAndTime } from '@/lib/when'
import { mapsDirectionsUrl, w3wUrl } from '@/lib/places'
import DropPin from '@/components/DropPin'
import FindWords from '@/components/FindWords'
import { windowSummary, windowHours, windowRevisionLine } from '@/lib/window'
import { PAUSE_BACK, pauseBackLine } from '@/lib/pause-words'
import { syncActivity, primeNativeToken } from '@/lib/native'
import { TickIcon } from '@/components/icons'
import { DB_REASONS } from '@/lib/db-errors'
import { StageIcon, PresenceIcon, CopyIcon, EyeIcon, MessageIcon, LinkOffIcon, CompassIcon, KeyIcon, PinIcon, PlusIcon, ChevronIcon } from '@/components/icons'

// The API answers a failure with a reason code rather than a status number,
// because "503" tells the one person who can fix this nothing. Whoever is
// looking at this screen is the person who sets DATABASE_URL and runs the
// migration, so say which of those is missing.
async function failure(response, fallback) {
  let reason = null
  try { reason = (await response.json())?.error } catch { /* no body */ }
  const known = DB_REASONS[reason]
  if (known) return { title: known.title, fix: known.fix }
  if (response.status === 401) return { title: 'Signed out', fix: 'Sign in again to carry on.' }
  return { title: fallback, fix: null }
}

// Built for a phone held in one hand on a driveway: the stage buttons are the
// whole point, and they are the biggest thing on the row.
const STAGE_BUTTONS = ['BOOKED', 'ON_MY_WAY', 'ON_SITE', 'PAUSED', 'DONE']
// customerPhone belongs here even though nothing sets it initially: the form
// renders an input bound to form.customerPhone, and a value of undefined makes
// React treat it as uncontrolled and then complain the moment it is typed in.
const EMPTY = { sm8JobNumber: '', customerName: '', customerPhone: '', jobSummary: '', jobAddress: '', jobRef: '', scheduledFor: '' }

/**
 * The trade's screen. Three things on it, in this order:
 *
 *   1. The box. Ask it or tell it. "What's on today?", "on my way to
 *      Whitfield", a pasted booking email. It answers, or hands back a card
 *      to confirm. (Only when ANTHROPIC_API_KEY is set; otherwise a New job
 *      button and the form.)
 *   2. The day's run. One card per job: who and where, the stage control,
 *      and anything waiting on an answer. What is only useful at the door
 *      (Navigate, which door, the dog) appears when the stage says you are
 *      on your way or there. Everything done once per job sitting down (the
 *      link, hours, photos, the note) is under More.
 *   3. Setup and settings, shut. Who to expect, Nudge me, notifications,
 *      ServiceM8, Face ID, the wallet card, the roadmap. One tip at a time
 *      opens the right one when it is the next thing worth doing.
 *
 * This screen was ten phone-screens tall with every panel open at once, and
 * "it's impossible to know what all the buttons do" was the fair review.
 */
export default function Console({ assistant = false }) {
  const [trackers, setTrackers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  // One job open at a time, and the new-job form shut until it is wanted.
  const [openJob, setOpenJob] = useState(null)
  const [showForm, setShowForm] = useState(false)
  // The setup panels, shut by default; a tip or a tap opens them and names
  // the one to land on.
  const [setupOpen, setSetupOpen] = useState(false)
  const [focusPanel, setFocusPanel] = useState(null)
  const [setup, setSetup] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/trackers', { cache: 'no-store' })
      if (!r.ok) return setError(await failure(r, 'Could not load jobs'))
      const rows = (await r.json()).trackers || []
      setTrackers(rows)
      syncActivity(rows) // the lock screen, inside the iOS app; a no-op in a browser
      setError(null)
    } catch {
      setError({ title: 'Could not reach the server', fix: 'Check your connection and try again.' })
    } finally { setLoading(false) }
  }, [])

  // What is switched on, for the one-tip-at-a-time line. Never an error: a
  // dashboard that cannot work out what to suggest just suggests nothing.
  const loadSetup = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/assistant', { cache: 'no-store' })
      if (r.ok) setSetup((await r.json()).setup || null)
    } catch { /* no tip, no harm */ }
  }, [])

  useEffect(() => { load(); loadSetup() }, [load, loadSetup])

  const openPanel = (panel) => {
    setSetupOpen(true)
    setFocusPanel(panel)
  }
  // A link straight to a panel: /dashboard?open=doors opens Setup and settings
  // at Household cards. Every ask of the owner comes with a tappable link
  // (CLAUDE.md, Talking to Will), and "scroll down, open Setup, find the
  // panel" is three steps where one link will do. Panel ids only.
  useEffect(() => {
    try {
      const want = new URLSearchParams(window.location.search).get('open')
      if (want && /^[a-z0-9]{2,20}$/.test(want)) openPanel(want)
    } catch { /* no URL, no panel */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!setupOpen || !focusPanel) return
    const go = () => document.getElementById(`panel-${focusPanel}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    go()
    // The jobs above it are still loading when a ?open= link lands, and they
    // push the panel down the page; go again once they have settled.
    // Not cleared on re-run: clearing focusPanel below re-runs this effect
    // at once, and a cleanup would cancel them before they fire.
    setTimeout(go, 700); setTimeout(go, 1600)
    setFocusPanel(null)
  }, [setupOpen, focusPanel])

  // One way in for a new job, whether the fields came from the form or from
  // the box's card. Returns whether it worked, so the caller knows what to
  // clear.
  const createFields = async (fields) => {
    setSaving(true)
    try {
      const r = await fetch('/api/dashboard/trackers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
      })
      if (!r.ok) { setError(await failure(r, 'Could not create the link')); return false }
      await load()
      return true
    } catch {
      setError({ title: 'Could not create the link', fix: 'Check your connection and try again.' })
      return false
    } finally { setSaving(false) }
  }

  const create = async (e) => {
    e.preventDefault()
    if (await createFields(form)) { setForm(EMPTY); setShowForm(false) }
  }

  // Taps saved on this phone because there was no signal, by job. They go
  // the moment the page is back online (offline-queue.js); until then the
  // card says so, and the optimistic state above stands.
  const [queued, setQueued] = useState([])
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(navigator.onLine !== false)
    const up = () => setOnline(true), down = () => setOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    const offQueue = onQueue(setQueued)
    const stop = startQueue(() => load())
    // A heartbeat while the dashboard is open, so the customer's page can say
    // when this phone last reached the server rather than imply a live feed.
    const beat = () => { if (document.visibilityState === 'visible' && navigator.onLine !== false) fetch('/api/dashboard/seen', { method: 'POST' }).catch(() => {}) }
    beat(); const hb = setInterval(beat, 60_000); document.addEventListener('visibilitychange', beat)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); offQueue(); stop(); clearInterval(hb); document.removeEventListener('visibilitychange', beat) }
  }, [load])
  const queuedFor = (id) => queued.filter((q) => q.url === `/api/dashboard/trackers/${id}` || q.url.startsWith(`/api/dashboard/trackers/${id}/`))

  // Job done, so who is next? The offer card at the top of the list: the
  // earliest job still Booked in today, one tap to set off, nothing sent
  // until it is pressed (src/lib/next-job.js). Dismissed by Not yet, by a
  // tap, or by the offered job moving on its own.
  const [offer, setOffer] = useState(null)
  const patch = async (id, body) => {
    // Optimistic: signal is patchy in a van, and a button that does nothing for
    // three seconds gets pressed four times.
    setTrackers((rows) => rows.map((r) => (r.id === id ? { ...r, ...body } : r)))
    if (body.stage === 'DONE') {
      const next = nextJobAfterDone(trackers, id)
      setOffer(next ? { id, next: next.id } : { id, next: null, left: leftToday(trackers, id) })
    } else if (body.stage && offer && (id === offer.next || id === offer.id)) setOffer(null)
    let ok = false
    try {
      const r = await queueFetch(`/api/dashboard/trackers/${id}`, { method: 'PATCH', body })
      if (r.queued) return true // saved on this phone; the card says so
      ok = r.ok
      if (!r.ok) setError({ title: 'Update failed', fix: r.json?.error ? String(r.json.error) : `The server answered ${r.status}.` })
    } catch {
      setError({ title: 'Update failed', fix: 'Try again in a moment.' })
    } finally { await load() }
    return ok
  }
  const offered = offer?.next ? trackers.find((t) => t.id === offer.next && t.stage === 'BOOKED') : null

  const revoke = async (id) => {
    try {
      const r = await fetch(`/api/dashboard/trackers/${id}`, { method: 'DELETE' })
      if (!r.ok) return setError(await failure(r, 'Could not switch that link off'))
      await load()
    } catch {
      setError({ title: 'Could not switch that link off', fix: 'Check your connection and try again.' })
    }
  }

  // Read after mount: window does not exist during the server render.
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin); primeNativeToken() }, [])

  // "Mrs Hale".split(' ')[0] is "Mrs", and "Hi Mrs —" is worse than no name at
  // all. If the first word is a title, keep the whole thing.
  const TITLES = /^(mr|mrs|ms|miss|mx|dr|prof|rev|sir|lady|lord)\.?$/i
  const greetingName = (full) => {
    if (!full) return ''
    const parts = full.trim().split(/\s+/)
    return TITLES.test(parts[0]) ? parts.slice(0, 2).join(' ') : parts[0]
  }

  // One tap: open the phone's own Messages app with the recipient and the whole
  // message already written, so the job is send rather than copy, switch app,
  // paste, and think of something to type while standing in the rain.
  //
  // `sms:<number>?&body=` is the spelling that works on both: iOS wants the
  // separator to be `&`, Android wants `?`, and `?&` satisfies each of them.
  // With no number stored it still opens Messages with the text ready and lets
  // him pick the contact.
  const smsHref = (t) => {
    const link = `${origin}/t/${t.code}`
    const who = greetingName(t.customerName)
    const name = who ? ` ${who}` : ''
    const body =
      `Hi${name} — you can see where your job is up to here: ${link} ` +
      `It updates through the day so you are not left guessing.`
    return `sms:${(t.customerPhone || '').replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`
  }

  // WhatsApp's click-to-chat link: opens the app with the number and the
  // message written, same as the sms: button. It wants the number in
  // international form with no plus and no leading zero, so a UK mobile
  // typed as 07700 900123 becomes 447700900123. With no number it still
  // opens WhatsApp with the text ready and lets him pick the contact.
  const waNumber = (raw) => {
    const d = String(raw || '').replace(/\D/g, '')
    if (!d) return ''
    if (d.startsWith('00')) return d.slice(2)
    if (d.startsWith('0')) return '44' + d.slice(1)
    return d
  }
  const waHref = (t) => {
    const link = `${origin}/t/${t.code}`
    const who = greetingName(t.customerName)
    const name = who ? ` ${who}` : ''
    const body =
      `Hi${name} — you can see where your job is up to here: ${link} ` +
      `It updates through the day so you are not left guessing.`
    const n = waNumber(t.customerPhone)
    return `https://wa.me/${n}?text=${encodeURIComponent(body)}`
  }

  // A time input gives "14:30" with no date. Hang it off the job's own booked
  // day so the window lands on the right date, and fall back to today for a
  // job with no date set yet.
  const timeOnDay = (t, hhmm) => {
    if (!hhmm) return null
    const base = t.scheduledFor ? new Date(t.scheduledFor) : new Date()
    const [h, m] = hhmm.split(':').map(Number)
    base.setHours(h, m, 0, 0)
    return base.toISOString()
  }

  const copyLink = async (code) => {
    const link = `${window.location.origin}/t/${code}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(code); setTimeout(() => setCopied(null), 2000)
    } catch { window.prompt('Copy this link:', link) }
  }

  const field = (key, label, placeholder, type = 'text') => (
    <label className="block text-[14px] font-medium muted">
      {label}
      <input type={type} value={form[key]} placeholder={placeholder}
             onChange={(e) => setForm({ ...form, [key]: e.target.value })}
             className="field mt-1.5" />
    </label>
  )

  const openJobs = trackers.filter((t) => t.isActive !== false && t.stage !== 'DONE').length

  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-safe">
      <div className="flex items-center justify-between pt-2">
        <Link href="/" aria-label="TurnUp home" className="inline-flex min-h-[44px] items-center gap-2 pr-2">
          <Mark className="h-7 w-auto" id="dash" />
          <span className="text-[17px] font-bold tracking-[-0.02em]">TurnUp</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/plan" className="inline-flex min-h-[44px] items-center px-2 text-[15px] muted">Plan</Link>
          <button onClick={async () => { await fetch('/api/auth/login', { method: 'DELETE' }); location.href = '/login' }}
                  className="inline-flex min-h-[44px] items-center px-2 text-[15px] muted">Sign out</button>
        </div>
      </div>
      <h1 className="mt-5 text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">Today</h1>
      <p className="mt-1.5 text-[16px] muted">
        {loading ? 'Loading…' : openJobs === 0 ? 'Nothing open.' : `${openJobs} job${openJobs === 1 ? '' : 's'} open. Tap the stage as the day goes.`}
      </p>

      {(!online || queued.length > 0) && (
        <div className="r-outer mt-5 px-5 py-4" style={{ background: 'color-mix(in srgb, #ff9500 13%, transparent)' }}>
          <p className="font-semibold">{!online ? 'No signal' : 'Back in signal'}{queued.length ? ` · ${queued.length} tap${queued.length === 1 ? '' : 's'} saved on this phone` : ''}</p>
          <p className="mt-1 text-sm muted">{!online ? 'Keep tapping. Each tap is saved with its time and goes the moment signal comes back.' : 'Sending the saved taps now, in order, with the times they were made.'}</p>
        </div>
      )}
      {error && (
        <div className="r-outer mt-5 p-5"
             style={{ background: 'color-mix(in srgb, #ff3b30 12%, transparent)', color: '#ff3b30' }}>
          <p className="font-semibold">{error.title}</p>
          {error.fix && <p className="mt-1 text-sm">{error.fix}</p>}
        </div>
      )}

      {/* The box, or the button. With a key, saying it beats typing six
          fields; the form stays a tap away for a ServiceM8 number or a day
          with no signal worth spending on a round trip. */}
      {assistant
        ? <Assistant jobs={trackers} setup={setup} onCreate={createFields} onUpdate={patch} />
        : !showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-filled mt-6 w-full">
            <PlusIcon size={18} /> New job
          </button>
        )}

      <Tip jobs={trackers} setup={setup} onOpen={openPanel} />

      {assistant && !showForm && (
        <button type="button" onClick={() => setShowForm(true)}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium muted">
          <PlusIcon size={15} /> Add a job by hand, or by ServiceM8 number
        </button>
      )}

      {showForm && (
      <form onSubmit={create} className="glass r-outer mt-4 grid gap-4 p-5 sm:grid-cols-2">
        {field('sm8JobNumber', 'ServiceM8 job number — fills the rest in, and the card then follows the job', '2718')}
        {field('customerName', 'Customer name', 'Sarah Whitfield')}
        {field('customerPhone', 'Their mobile', '07700 900123', 'tel')}
        {field('jobSummary', 'Job', 'Unvented cylinder swap')}
        {field('jobAddress', 'Address', 'Church Lane, Burbage SN8')}
        {field('jobRef', 'Your job number', '2718')}
        {field('scheduledFor', 'Booked for (day/month/year)', '', 'date')}
        <div className="flex items-end">
          <button type="submit" disabled={saving}
                  className="btn btn-filled w-full">
            {saving ? 'Creating…' : 'Create tracking link'}
          </button>
        </div>
        <button type="button" onClick={() => { setForm(EMPTY); setShowForm(false) }}
                className="btn btn-grey w-full sm:col-span-2">Cancel</button>
      </form>
      )}

      {/* What ServiceM8 has booked this week and whether the link went,
          read from ServiceM8 itself. Renders nothing unless it is connected
          and there is something coming. */}
      <Sm8Week />

      {offer && (offered || offer.next === null) && (
        <section className="glass r-outer tone-onmyway mt-6 p-4" aria-live="polite">
          {offered ? (
            <>
              <p className="text-[16px] font-semibold">Job done. On your way to {offered.customerName ? offered.customerName.split(' ')[0] : 'the next one'}?</p>
              <p className="mt-0.5 text-[14px] muted">
                {[offered.jobSummary, offered.jobAddress].filter(Boolean).join(' · ') || 'Next job booked for today.'}
                {offered.windowStart ? ` Window from ${new Date(offered.windowStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}.` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { const id = offered.id; setOffer(null); patch(id, { stage: 'ON_MY_WAY' }) }}
                        className="btn tone-onmyway stage-seg stage-seg-on !min-h-[44px] !px-4 !text-[15px]">
                  <StageIcon tone={STAGES.ON_MY_WAY.tone} size={18} /> <span>On my way to {offered.customerName ? offered.customerName.split(' ')[0] : 'them'}</span>
                </button>
                <button type="button" onClick={() => setOffer(null)} className="btn btn-grey !min-h-[44px] !px-4 !text-[15px]">Not yet</button>
              </div>
              <p className="mt-2 text-[12px] muted">Tells them you have set off, the same as the button on their card. Nothing is sent until you tap.</p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[15px] font-semibold">Job done. That was the last one booked for today.</p>
              <button type="button" onClick={() => setOffer(null)} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[14px]">OK</button>
            </div>
          )}
        </section>
      )}

      {loading ? null
       : trackers.length === 0 ? <p className="mt-8 text-center text-[15px] muted">No jobs yet.</p>
       : (
        <ul className="mt-6 space-y-4">
          {trackers.map((t) => {
            const open = openJob === t.id
            // What is useful at the door shows when you are heading there or
            // there; before that it is noise between this job and the next.
            const heading = t.stage === 'ON_MY_WAY'
            const there = t.stage === 'ON_MY_WAY' || t.stage === 'ON_SITE' || t.stage === 'PAUSED'
            return (
            <li key={t.id}
                className={`glass r-outer tone-${stageOf(t.stage).tone} p-4 ${t.isActive ? '' : 'opacity-55'}`}>
              {presenceOf(t.presence) && presenceIsFresh(t.presenceAt) && (
                <div className="r-inner mb-3 flex items-start gap-3 px-4 py-3"
                     style={{
                       background: `color-mix(in srgb, var(--stage-${t.presence === 'OUT' ? 'paused' : 'done'}) 13%, transparent)`,
                       color: `var(--stage-${t.presence === 'OUT' ? 'paused' : 'done'})`,
                     }}>
                  <PresenceIcon presence={t.presence} size={19} className="mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold">{presenceOf(t.presence).forTrade}</span>
                    {t.presenceNote && <span className="block text-[14px]">{t.presenceNote}</span>}
                    <span className="block text-[13px] opacity-75">
                      they said so {presenceAgeLabel(t.presenceAt)}
                    </span>
                  </span>
                </div>
              )}

              {/* After the job: a note the customer sent to you, and whether they
                  went to leave a review. The note is yours alone. */}
              {t.stage === 'DONE' && (t.feedbackText || t.reviewClickedAt) && (
                <div className="r-inner mb-3 px-4 py-3 text-[14px]" style={{ background: t.feedbackText ? 'color-mix(in srgb, #ff9500 13%, transparent)' : 'color-mix(in srgb, var(--stage-done) 12%, transparent)' }}>
                  {t.feedbackText && <span className="block font-semibold">{greetingName(t.customerName) || 'The customer'} left you a note{t.feedbackAt ? ` at ${new Date(t.feedbackAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>}
                  {t.feedbackText && <span className="block whitespace-pre-wrap">{t.feedbackText}</span>}
                  {t.reviewClickedAt && <span className="block text-[13px] opacity-75">Went to leave a Google review at {new Date(t.reviewClickedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</span>}
                </div>
              )}
              {/* The customer is the late one. Their minutes, their time, and when
                  to expect them from — worked out from what THEY said. */}
              {t.customerLateMinutes && ['BOOKED', 'ON_MY_WAY'].includes(t.stage) && t.customerLateAt && (Date.now() - new Date(t.customerLateAt) < 6 * 3600_000) && (
                <div className="r-inner mb-3 px-4 py-3 text-[14px]" style={{ background: 'color-mix(in srgb, #ff9500 13%, transparent)' }}>
                  <span className="block font-semibold">{greetingName(t.customerName) || 'The customer'} is running about {t.customerLateMinutes} minutes late</span>
                  <span className="block text-[13px] opacity-75">Said at {new Date(t.customerLateAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. Expect them from about {new Date(new Date(t.customerLateAt).getTime() + t.customerLateMinutes * 60_000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</span>
                </div>
              )}
              {!(presenceOf(t.presence) && presenceIsFresh(t.presenceAt)) && !t.reminderReply && t.presenceAskedAt && t.stage === 'BOOKED' && (
                <div className="r-inner mb-3 px-4 py-3 text-[14px]" style={{ background: 'rgb(var(--glass-line) / 0.08)' }}>
                  <span className="block font-semibold">Asked whether anyone will be in tomorrow. No answer yet.</span>
                  <span className="block text-[13px] opacity-75">Asked {dayAndTime(t.presenceAskedAt)}. If they have no notifications on, text them the link.</span>
                </div>
              )}

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1 break-words">
                  <p className="text-[19px] font-semibold tracking-[-0.01em]">{t.customerName || 'Unnamed customer'}{t.jobRef ? ` · #${t.jobRef}` : ''}</p>
                  <p className="mt-0.5 text-[15px] muted">{t.jobSummary || 'No description'}{t.jobAddress ? ` — ${t.jobAddress}` : ''}</p>
                  {!t.isActive && (
                    <p className="mt-1.5 text-[14px] font-semibold" style={{ color: '#ff9500' }}>
                      Link is off. The customer sees &ldquo;expired&rdquo;. Switch it back on under More.
                    </p>
                  )}
                  {/* Linked at birth to a ServiceM8 job: the card moves on its own. Worth
                      saying on the card, because the stage buttons below still work and
                      a trade should know which cards follow the job and which are theirs. */}
                  {t.externalId && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2 py-0.5 text-[12px] font-semibold" style={{ color: 'var(--tint)' }}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />Follows ServiceM8 job {t.jobRef ? `#${t.jobRef}` : ''}
                    </p>
                  )}
                  {/* Whether they have read the terms and tapped Go ahead. Until
                      Job done it is worth a glance: a short-notice charge only
                      holds if this happened before the day. */}
                  {queuedFor(t.id).length > 0 && (
                    <p className="ml-1.5 mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2 py-0.5 text-[12px] font-semibold" style={{ color: '#ff9500' }}>
                      {queuedFor(t.id).length === 1 ? 'Saved on this phone — sends when back in signal' : `${queuedFor(t.id).length} taps saved — send when back in signal`}
                    </p>
                  )}
                  {/* What came back from the day-before ask. Amber when they
                      want it moved, because that one needs you to do something.
                      "No answer yet" is the banner above, not a chip. */}
                  {t.stage === 'BOOKED' && t.reminderReply && (
                    <p className="ml-1.5 mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2 py-0.5 text-[12px] font-semibold"
                       style={{ color: t.reminderReply === 'MOVE' ? '#ff9500' : 'var(--tint)' }}>
                      {t.reminderReply === 'OK' ? `Confirmed ${new Date(t.reminderReplyAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                        : t.reminderReply === 'SOMEONE_ELSE' ? 'Someone else will be in'
                        : 'Wants to move it — offer new hours under More'}
                    </p>
                  )}
                  {t.stage !== 'DONE' && (
                    <p className="ml-1.5 mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-2 py-0.5 text-[12px] font-semibold"
                       style={{ color: t.termsAgreedAt ? 'var(--tint)' : 'var(--label-2)' }}>
                      {t.termsAgreedAt
                        ? `Terms agreed ${new Date(t.termsAgreedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${t.termsAgreed?.fee ? ` · £${t.termsAgreed.fee}` : ''}`
                        : 'Terms not agreed yet'}
                    </p>
                  )}
                </div>
                <p className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold"
                   style={{ color: 'var(--tint)' }}>
                  <StageIcon tone={stageOf(t.stage).tone} size={17} />
                  {stageOf(t.stage).label}
                </p>
              </div>

              <div className="stages mt-3.5" role="group" aria-label="Stage">
                {STAGE_BUTTONS.map((s) => (
                  <button key={s} type="button" onClick={() => patch(t.id, { stage: s })}
                          aria-pressed={t.stage === s} aria-label={STAGES[s].label}
                          className={`tone-${STAGES[s].tone} stage-seg ${t.stage === s ? 'stage-seg-on' : ''}`}>
                    <StageIcon tone={STAGES[s].tone} size={18} />
                    <span>{STAGES[s].short}</span>
                  </button>
                ))}
              </div>

              {/* Paused: when will you be back? One tap, your words, with the
                  time. The customer reads the same sentence. */}
              {t.stage === 'PAUSED' && (
                <div className="mt-3.5 rounded-2xl px-4 py-3" style={{ background: 'color-mix(in srgb, var(--stage-paused) 12%, transparent)' }}>
                  <p className="text-[14px] font-semibold">
                    {t.pauseBack && t.pauseBackAt
                      ? `You said: ${pauseBackLine(t.pauseBack, t.pauseBackAt).replace(/^./, (c) => c.toLowerCase())}`
                      : `Paused${t.pausedAt ? ` at ${new Date(t.pausedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''} — when will you be back?`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(PAUSE_BACK).map(([key, c]) => (
                      <button key={key} type="button" onClick={() => patch(t.id, { pauseBack: key })}
                              className={`btn !min-h-[40px] !px-3.5 !text-[13px] ${t.pauseBack === key ? 'accent-fill' : 'btn-grey'}`}>{c.chip}</button>
                    ))}
                    {t.pauseBack && <button type="button" onClick={() => patch(t.id, { pauseBack: null })} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">Clear</button>}
                  </div>
                </div>
              )}

              {/* "Are you still coming?" — the customer asked, or the window has
                  started and the card has not moved. Answer in one tap: set off,
                  or say how late. The estimate is yours, written with the time. */}
              {(() => {
                const askOpen = t.askedAt && !t.askAnsweredAt
                const start = t.windowStart || t.scheduledFor
                const started = start && new Date(start) <= new Date() && t.stage === 'BOOKED'
                const missed = t.missedAt && !['ON_SITE', 'PAUSED', 'DONE'].includes(t.stage)
                if (!askOpen && !started && !t.lateMinutes && !missed) return null
                const hhmm = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                const who = greetingName(t.customerName) || 'The customer'
                const CHOICE = { WAIT: 'will wait', LATER: 'would like it later today — set new hours under More', REBOOK: 'would like another day — set new hours for that day under More' }
                return (
                  <div className="mt-3.5 rounded-2xl px-4 py-3" style={{ background: missed ? 'color-mix(in srgb, #ff3b30 12%, transparent)' : 'color-mix(in srgb, #ff9500 12%, transparent)' }}>
                    <p className="text-[14px] font-semibold">
                      {missed ? `Window missed — ${who} was told at ${hhmm(t.missedAt)}${t.missedChoice ? `, and ${CHOICE[t.missedChoice]}` : ', no answer from them yet'}`
                        : askOpen ? `${who} asked at ${hhmm(t.askedAt)}: are you still coming?`
                        : t.lateMinutes ? `You said about ${t.lateMinutes} minutes late at ${hhmm(t.lateAt)}`
                        : `Window started at ${hhmm(start)} and the card still says Booked in`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {t.stage === 'BOOKED' && <button type="button" onClick={() => patch(t.id, { stage: 'ON_MY_WAY' })} className="btn accent-fill !min-h-[40px] !px-3.5 !text-[13px]">On my way</button>}
                      {[15, 30, 60].map((m) => (
                        <button key={m} type="button" onClick={() => patch(t.id, { lateMinutes: m })} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">{m} min late</button>
                      ))}
                      {t.lateMinutes && <button type="button" onClick={() => patch(t.id, { lateMinutes: null })} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">Clear</button>}
                      {t.customerPhone && <a href={`tel:${t.customerPhone.replace(/\s+/g, '')}`} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">Call</a>}
                      {/* Quiets the buzzing without moving the card. For when
                          you have rung them: the question is dealt with, but
                          nothing the customer sees should claim you set off. */}
                      {askOpen && <button type="button" onClick={() => patch(t.id, { stopAsk: true })} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[13px]">Stop reminders</button>}
                    </div>
                  </div>
                )
              })()}

              {/* Customer not home: the clock, what you tried, the door photo,
                  and the note the customer reads. Nothing charged from here. */}
              <NoAccess tracker={t} onDone={load}>
                <TheyRang tracker={t} />
              </NoAccess>

              {/* Getting there. Shown while you are on your way, which is when
                  you need it; otherwise it waits under More. */}
              {(heading || open) && (t.jobAddress || t.mapPin || t.what3words) && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <a href={mapsDirectionsUrl({ mapPin: t.mapPin, address: t.jobAddress })} target="_blank" rel="noreferrer"
                     className="btn btn-tinted !min-h-[44px] !px-4 !text-[14px]">
                    <CompassIcon size={16} /> Navigate
                  </a>
                  {t.what3words && (
                    <a href={w3wUrl(t.what3words)} target="_blank" rel="noreferrer"
                       className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">///{t.what3words}</a>
                  )}
                  {t.mapPin && (
                    <a href={t.mapPin} target="_blank" rel="noreferrer"
                       className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]"><PinIcon size={15} /> Their pin</a>
                  )}
                </div>
              )}

              {/* What they told you about the door. Read at the gate, not in
                  the office, so it shows once you are heading there. */}
              {(there || open) && (t.doorToUse || t.petsOnSite || t.accessNotes) && (
                <div className="r-inner mt-3 flex items-start gap-3 px-4 py-3" style={{ background: 'rgb(var(--glass-line) / 0.07)' }}>
                  <KeyIcon size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--tint)' }} />
                  <span className="min-w-0 text-[14px]">
                    <span className="block font-semibold">
                      {[t.doorToUse && `${t.doorToUse.charAt(0)}${t.doorToUse.slice(1).toLowerCase()} door`,
                        t.petsOnSite && 'There is a dog'].filter(Boolean).join(' · ') || 'From the customer'}
                    </span>
                    {t.accessNotes && <span className="block">{t.accessNotes}</span>}
                  </span>
                </div>
              )}

              {/* What the customer said back about the time. Loud when it is
                  waiting on an answer, because an unanswered counter-offer is
                  a wasted trip in the making. */}
              {t.windowState === 'PROPOSED' && t.windowBy === 'CUSTOMER' && (
                <div className="r-inner mt-3 p-4"
                     style={{ background: 'color-mix(in srgb, var(--stage-paused) 13%, transparent)' }}>
                  <p className="text-[15px] font-bold" style={{ color: 'var(--stage-paused)' }}>
                    {windowSummary({ state: t.windowState, by: t.windowBy, start: t.windowStart, end: t.windowEnd }, 'TRADE')}
                  </p>
                  {t.windowNote && <p className="mt-1 text-[15px]">&ldquo;{t.windowNote}&rdquo;</p>}
                  <button type="button" onClick={() => patch(t.id, { windowAgree: true })}
                          className="btn btn-filled mt-3 w-full !min-h-[48px] !text-[16px]">
                    <TickIcon size={17} /> That works — agree it
                  </button>
                  <p className="mt-2 text-[13px] muted">
                    Or set your own hours under More, which sends it back to them.
                  </p>
                </div>
              )}

              {t.windowState === 'AGREED' && t.windowStart && (
                <p className="mt-3 text-[15px] font-semibold" style={{ color: 'var(--stage-done)' }}>
                  {windowHours({ start: t.windowStart, end: t.windowEnd })} — agreed with them
                </p>
              )}
              {t.windowState === 'PROPOSED' && t.windowBy === 'TRADE' && (
                <p className="mt-3 text-[15px] muted">
                  {windowHours({ start: t.windowStart, end: t.windowEnd })} — sent, waiting on them
                </p>
              )}
              {/* What the customer reads when the hours or the day have moved:
                  the change, and the original beside it. Same words as their page. */}
              {t.windowRevisedAt && (
                <p className="mt-1 text-[13px]" style={{ color: 'var(--stage-paused)' }}>
                  {windowRevisionLine({ state: t.windowState, start: t.windowStart, end: t.windowEnd, revisedAt: t.windowRevisedAt, revisedBy: t.windowRevisedBy,
                    was: t.windowFirstStart ? { start: t.windowFirstStart, end: t.windowFirstEnd } : null }, 'TRADE')}
                </p>
              )}
              {t.scheduledWas && t.scheduledMovedAt && (
                <p className="mt-1 text-[13px]" style={{ color: 'var(--stage-paused)' }}>
                  Day moved from {new Date(t.scheduledWas).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}; the card says so.
                </p>
              )}

              {/* --- everything below is folded away until the row is opened ---

                  What stays visible is what gets used standing next to a van:
                  who and where, the stage buttons, anything the customer has
                  said that is waiting on an answer. The rest — sending the
                  link, setting hours, photos, the note — is done once per job,
                  sitting down, and does not belong between this job and the
                  next one. */}
              <button type="button" onClick={() => setOpenJob(open ? null : t.id)}
                      aria-expanded={open}
                      className="mt-3 flex min-h-[44px] w-full items-center justify-between gap-2 text-[14px] font-medium muted">
                <span>{open ? 'Less' : 'More'}</span>
                <ChevronIcon size={16} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
              </button>

              {open && (<>
              {/* Dropped from the doorstep on the first visit, which is the
                  better moment than asking the customer to do it: the person
                  standing there is the one who will have to find it again, and
                  a pin beats "third gate past the postbox" next time. */}
              <div className="mt-2">
                <DropPin
                  label={t.mapPin ? 'Replace pin with where I am' : 'Drop a pin here'}
                  className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]"
                  onPin={(url) => patch(t.id, { mapPin: url })}
                />
              </div>

              {/* The trade needs three words as often as the customer does, and
                  is more likely to be the one standing at the gate. */}
              <label className="mt-3 block text-[13px] muted">
                what3words — for a gate with no number
                {/* Uncontrolled, like the other fields here, so it does not
                    fight a keystroke on a patchy connection. Keyed on the
                    value so a lookup that fills it in is actually seen. */}
                <input type="text" key={t.what3words || 'empty'}
                       defaultValue={t.what3words || ''} placeholder="///filled.count.soap"
                       autoCapitalize="none" autoCorrect="off"
                       onBlur={(e) => e.target.value !== (t.what3words || '') && patch(t.id, { what3words: e.target.value })}
                       className="field mt-1.5 !min-h-[44px] !text-[14px]" />
              </label>
              <FindWords onWords={(w) => patch(t.id, { what3words: w })} />

              <div className="r-inner mt-4 p-4" style={{ background: 'rgb(var(--glass-line) / 0.07)' }}>
                <p className="text-[13px] font-semibold muted">Send this to the customer</p>
                <p className="mt-1.5 select-all break-all font-mono text-[14px]">
                  {origin}/t/{t.code}
                </p>
                {/* Two capsules side by side. The channel is the big word and the
                    customer's name sits under it in one truncated line, so "Text
                    Mrs Whitfield" can never wrap to three lines and stretch the
                    pair into a pill the size of a thumb. */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={smsHref(t)}
                     className="btn !min-h-[56px] !flex-col !gap-0 !px-3 !py-2 !text-[16px]"
                     style={{ background: 'var(--mts-accent)', color: '#fff' }}>
                    <span className="flex items-center gap-1.5"><MessageIcon size={17} /> Text</span>
                    <span className="max-w-full truncate text-[12px] font-medium opacity-80">
                      {greetingName(t.customerName) || 'the customer'}
                    </span>
                  </a>
                  <a href={waHref(t)} target="_blank" rel="noreferrer"
                     className="btn !min-h-[56px] !flex-col !gap-0 !px-3 !py-2 !text-[16px]"
                     style={{ background: '#25D366', color: '#062e18' }}>
                    <span>WhatsApp</span>
                    <span className="max-w-full truncate text-[12px] font-medium opacity-80">
                      {greetingName(t.customerName) || 'the customer'}
                    </span>
                  </a>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => copyLink(t.code)}
                          className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">
                    <CopyIcon size={16} /> {copied === t.code ? 'Copied' : 'Copy link'}
                  </button>
                  <a href={`/t/${t.code}`} target="_blank" rel="noreferrer"
                     className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">
                    <EyeIcon size={16} /> Open it
                  </a>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block text-[13px] muted">
                  Window from
                  <input type="time"
                         defaultValue={t.windowStart ? new Date(t.windowStart).toTimeString().slice(0, 5) : ''}
                         onBlur={(e) => patch(t.id, { windowStart: timeOnDay(t, e.target.value) })}
                         className="field mt-1.5" />
                </label>
                <label className="block text-[13px] muted">
                  until
                  <input type="time"
                         defaultValue={t.windowEnd ? new Date(t.windowEnd).toTimeString().slice(0, 5) : ''}
                         onBlur={(e) => patch(t.id, { windowEnd: timeOnDay(t, e.target.value) })}
                         className="field mt-1.5" />
                </label>
              </div>
              <label className="mt-2 block text-[13px] muted">
                Where in today&apos;s run
                <input type="number" min="1" inputMode="numeric"
                       defaultValue={t.position ?? ''}
                       placeholder="2 — tells them &quot;you are second today&quot;"
                       onBlur={(e) => patch(t.id, { position: e.target.value === '' ? null : e.target.value })}
                       className="field mt-1.5" />
              </label>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {t.isActive ? (
                  <button type="button" onClick={() => revoke(t.id)}
                          className="btn btn-danger !min-h-[44px] !px-4 !text-[14px]">
                    <LinkOffIcon size={16} /> Switch link off
                  </button>
                ) : (
                  /* A link switched off by mistake used to be dead: the only way back
                     was a new job. Same place, same size; the API took
                     { isActive: true } all along, only the button was missing. */
                  <button type="button" onClick={() => patch(t.id, { isActive: true })}
                          className="btn accent-fill !min-h-[44px] !px-4 !text-[14px]">
                    Switch link back on
                  </button>
                )}
                <span className="text-[14px] muted">{t.viewCount || 0} view{t.viewCount === 1 ? '' : 's'}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[['housePhoto', 'House from the road'], ['doorPhoto', 'The door to come to']].map(([k, label]) => (
                  <label key={k} className="block text-[13px] muted">
                    {label}
                    {t[k] && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={t[k]} alt={label} className="r-inner mt-1.5 aspect-[4/3] w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <input type="url" defaultValue={t[k] || ''} placeholder="Photo link…" inputMode="url"
                           onBlur={(e) => e.target.value !== (t[k] || '') && patch(t.id, { [k]: e.target.value })}
                           className="field mt-1.5 !min-h-[44px] !text-[14px]" />
                  </label>
                ))}
              </div>

              <label className="mt-4 block text-[14px] font-medium muted">
                Note shown to the customer
                <input type="text" defaultValue={t.stageNote || ''}
                       placeholder="Waiting on the cylinder from the merchant — back Thursday morning"
                       onBlur={(e) => e.target.value !== (t.stageNote || '') && patch(t.id, { stageNote: e.target.value })}
                       className="field mt-1.5" />
              </label>
              </>)}
            </li>
            )
          })}
        </ul>
      )}

      {/* Setup and settings, shut. Seven panels used once each, and they were
          the second half of every visit to a screen meant for a driveway. A
          tip above opens the right one when it is the next thing to do. */}
      <button type="button" onClick={() => setSetupOpen((o) => !o)} aria-expanded={setupOpen}
              className="glass r-outer mt-8 flex min-h-[54px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left">
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold leading-tight">Setup and settings</span>
          <span className="mt-px block truncate text-[13px]" style={{ color: 'var(--label-2)' }}>
            Who to expect, Booking terms, Nudge me, notifications, household cards, ServiceM8, Face ID, the wallet card, the attendance record, the pilot numbers, what is next
          </span>
        </span>
        <ChevronIcon size={18} style={{ color: 'var(--label-3)' }}
                     className={`shrink-0 transition-transform duration-200 ${setupOpen ? 'rotate-90' : ''}`} />
      </button>

      {setupOpen && (<>
        <div id="panel-profile" className="scroll-mt-4"><Profile /></div>
        <div id="panel-terms" className="scroll-mt-4"><Terms /></div>
        <div id="panel-nudges" className="scroll-mt-4"><Nudges /></div>
        <Doors />
        <InboundSetup />
        <div id="panel-sources" className="scroll-mt-4"><Sources /></div>
        <div id="panel-push" className="scroll-mt-4"><PushSetup /></div>
        <div id="panel-servicem8" className="scroll-mt-4"><ServiceM8 onChanged={load} /></div>
        <div id="panel-passkeys" className="scroll-mt-4"><Passkeys /></div>
        <div id="panel-wallet" className="scroll-mt-4"><WalletShowcase tracker={trackers[0]} /></div>
        <GoogleWallet />
        {/* The attendance record. One row per visit, timestamped from the taps
            above, for whoever pays per visit and is marked per missed one. */}
        <section id="panel-attendance" className="glass r-outer mt-4 scroll-mt-4 p-5">
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">Attendance record</h2>
          <p className="mt-1 text-[14px] muted">One row per visit, timestamped from your taps. A job nobody went to says so.</p>
          <div className="mt-3 max-w-[460px]"><AttendanceSheet /></div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/api/dashboard/attendance?days=30" download className="btn btn-grey text-[14px]">Last 30 days</a>
            <a href="/api/dashboard/attendance?days=90" download className="btn btn-grey text-[14px]">Last 90 days</a>
          </div>
          <p className="mt-2 text-[12px] muted">Names, addresses and the job go in it. Nothing the customer told you does, nor the link.</p>
        </section>
        <div id="panel-pilot" className="scroll-mt-4"><Pilot /></div>
        <div id="panel-waitlist" className="scroll-mt-4"><WaitlistPanel /></div>
        <div id="panel-roadmap" className="scroll-mt-4"><Roadmap /></div>
        <div id="panel-changelog" className="scroll-mt-4"><Changelog /></div>
      </>)}
      <div className="mt-8 flex justify-center"><BuildStamp /></div>
      </main>
    </div>
  )
}
