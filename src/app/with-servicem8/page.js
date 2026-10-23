import Link from 'next/link'
import Mark from '@/components/Mark'
import Shot from '@/components/Shot'
import { sm8Configured } from '@/lib/servicem8'
import { CANONICAL_HOST } from '@/lib/trade'
import { Sm8Window, Sm8Buttons, SmsBubble } from './Sm8Mocks'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Using TurnUp with ServiceM8',
  description: 'How a ServiceM8 job becomes a TurnUp link in the booking text, what moves the card, and how to test it in ten minutes. Every step with the screen.',
}

/**
 * The page a ServiceM8 user reads once. Every step has the screen next to
 * it, and since v1.36.0 the screen is the PART that matters, not a phone:
 * TurnUp's own screens are cut from the captures in public/with-servicem8/
 * (scripts/capture-home-crops.mjs, ONLY=sm8); ServiceM8's are drawn from its
 * layout, because nobody's account belongs on a public page and ServiceM8's
 * help images are ServiceM8's. The words are a line or two per step. The
 * two messages to paste are kept whole, because they are the thing to paste.
 */
const Drawn = () => <p className="mt-1.5 text-[12px] muted">Drawn from ServiceM8’s layout, not a screenshot.</p>
const H2 = ({ children }) => <h2 className="text-[24px] font-bold tracking-[-0.02em]">{children}</h2>
const Pre = ({ children }) => (
  <pre className="mt-3 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl border border-black/10 bg-white/60 p-3.5 font-mono text-[13px] leading-snug text-slate-800 dark:bg-black/30 dark:text-slate-100">{children}</pre>
)

/* A step: number, a line or two on the left, the screen on the right (below, on a phone). */
function Step({ n, title, visual, children }) {
  return (
    <li className="glass r-outer p-4 sm:p-5">
      <div className={`grid gap-5 ${visual ? 'sm:grid-cols-[minmax(0,1fr)_minmax(0,340px)]' : ''} sm:items-start`}>
        <div className="flex gap-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: 'var(--tint)' }}>{n}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold leading-tight">{title}</p>
            <div className="mt-1.5 text-[15px] leading-snug muted">{children}</div>
          </div>
        </div>
        {visual && <div className="flex justify-center sm:justify-end">{visual}</div>}
      </div>
    </li>
  )
}

/* What moves the card: what you press, then what they see. */
const STAGES = [
  ['Booked in', 'booked', 'ServiceM8 sends the text. The card carries the booking window.', 'sms'],
  ['On my way', 'onway',  'Your tap. ServiceM8 has no set-off event.', 'dashboard'],
  ['On site',   'onsite', 'Check In.', 'checkin'],
  ['Paused',    'paused', 'Check Out before the job is complete.', 'checkout'],
  ['Job done',  'done',   'Complete Job.', 'complete'],
]

export default function WithServiceM8() {
  const connected = sm8Configured()
  const host = CANONICAL_HOST
  const Trigger = ({ kind }) => (
    kind === 'sms' ? <SmsBubble host={host} />
    : kind === 'dashboard' ? <Shot name="sm8-dashboard-stage" label="" alt="The stage buttons on the TurnUp dashboard" />
    : <Sm8Buttons kind={kind} />
  )
  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-safe">
        <header className="flex items-center justify-between pt-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="TurnUp home">
            <Mark className="h-8 w-auto" id="top" />
            <span className="text-[21px] font-bold tracking-[-0.02em]">TurnUp</span>
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-[44px] items-center text-[15px] font-medium" style={{ color: 'var(--tint)' }}>Dashboard</Link>
        </header>

        {/* --- what you get ------------------------------------------------ */}
        <section className="mt-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.13em] muted">With ServiceM8</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">Book the job in ServiceM8. The link sends itself.</h1>
          <p className="mt-4 text-[17px] leading-snug muted">One line in your booking text. Nothing else changes.</p>
          <p className="glass r-outer mt-5 inline-flex items-center gap-2 px-3.5 py-2 text-[14px] font-medium">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: connected ? '#34c759' : '#ff9500' }} />
            {connected ? 'This TurnUp is connected to a ServiceM8 account' : 'This TurnUp is not connected to ServiceM8 yet'}
          </p>
          {/* The 19 Oct review: the only button on this page's first screen was
              Dashboard, which is a sign-in. A trade reading this is not signed in. */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/join?as=trade" className="btn btn-filled !px-6">Get on the list</Link>
            <Link href="/demo" className="btn btn-grey !px-6">See what they see</Link>
          </div>

          <h2 className="mt-10 text-[24px] font-bold tracking-[-0.02em]">What you get</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <figure className="m-0 min-w-0">
              <SmsBubble host={host} />
              <figcaption className="mt-2.5 px-0.5"><span className="block text-[16px] font-semibold leading-tight">The text you already send</span><span className="mt-0.5 block text-[14px] leading-snug muted">now carries a link.</span></figcaption>
            </figure>
            <Shot name="sm8-customer-booked" label="The customer gets a page" note="It moves as the day does." alt="The customer's page: Booked in, between 10:00 and 12:00" />
            <Shot name="sm8-dashboard-card" label="You get the card for free" note="Already on your dashboard, following the job." alt="The job on the TurnUp dashboard, marked Follows ServiceM8 job #2715" fade />
          </div>
        </section>

        {/* --- the one line ------------------------------------------------- */}
        <section className="mt-14">
          <H2>The one line</H2>
          <p className="mt-2 text-[16px] muted">The link is the ServiceM8 job number. The customer proves it is theirs with four digits, once.</p>
          <ol className="mt-5 grid gap-4">
            <Step n="1" title="Switch on Booking Confirmation" visual={<div className="w-full max-w-[340px]"><Sm8Window kind="automation" /><Drawn /></div>}>
              <a href="https://go.servicem8.com/" target="_blank" rel="noopener">ServiceM8 online</a> → Settings → <b>Automations</b> → <b>Booking Confirmation</b> → on → Edit. On <b>Method</b>, tick <b>Send text message confirmation</b>.
            </Step>
            <Step n="2" title="Paste this as the Message" visual={<div className="w-full max-w-[340px]"><Sm8Window kind="template" host={host} /><Drawn /></div>}>
              <Pre>{`Hi {recipient_first}, your booking with {vendor.name} is confirmed for {booking_date}, arriving {booking_time}. Follow the job here — it says when I set off, when I arrive and when I am done, and it has the booking terms and your right to cancel:\nhttps://${host}/j/{job.generated_job_id}`}</Pre>
              <span className="mt-2 block">Use <b>Insert Field</b> for the job number. Delete ServiceM8’s line about an estimated arrival time.</span>
              <span className="mt-1.5 block text-[13px]">The words about terms matter: a short-notice charge only holds if they agreed it before the day, and the page is where they do. Set yours under <b>Booking terms</b> on the dashboard.</span>
            </Step>
            <Step n="3" title="Tick it when you book" visual={<div className="w-full max-w-[340px]"><Sm8Window kind="booking" /><Drawn /></div>}>
              Schedule from the job card → tick <b>Send Booking Confirmation</b>. ServiceM8 remembers it.
              <span className="mt-1.5 block text-[13px]">Dragging a job onto the calendar sends nothing. Book from the job card.</span>
            </Step>
            <Step n="3b" title="Optional: the day-before text">
              Settings → Automations → <b>Booking Reminder</b> → on → the day before → this message:
              <Pre>{`Hi {recipient_first}, a reminder that {vendor.name} is booked for tomorrow, {booking_date}, arriving {booking_time}. Still fine? Tap to say so, to say someone else will be in, or to move it:\nhttps://${host}/j/{job.generated_job_id}`}</Pre>
              <span className="mt-2 block text-[13px]">The page asks them at four the afternoon before either way. Each reply lands on your card and your phone.</span>
            </Step>
            <Step n="3c" title="Or let TurnUp send it">
              Dashboard → <b>ServiceM8</b> → switch on <b>Follow every booking</b>. Every booking gets its card at once; ten minutes later TurnUp texts the link through ServiceM8, unless ServiceM8 already did. One text per job.
              <span className="mt-1.5 block text-[13px]">A job dragged onto the calendar gets told too. Move a booking later and they get one more text with the new hours, once the move has settled.</span>
            </Step>
            <Step n="4" title="That is the setup" visual={<div className="w-full max-w-[340px]"><Shot name="sm8-panel-head" label="" alt="The ServiceM8 panel on the TurnUp dashboard: Listening, 1 job linked" /></div>}>
              Nothing to add per job. The card appears on your dashboard the moment the customer opens the link.
            </Step>
          </ol>
        </section>

        {/* --- what moves the card ------------------------------------------- */}
        <section className="mt-14">
          <H2>What moves the card</H2>
          <p className="mt-2 text-[16px] muted">What you press. What they see a minute later.</p>
          <ul className="mt-5 grid gap-4">
            {STAGES.map(([name, cap, how, trigger]) => (
              <li key={name} className="glass r-outer p-4 sm:p-5">
                <p className="text-[18px] font-bold tracking-[-0.01em]">{name}</p>
                <p className="mt-1 text-[15px] leading-snug muted">{how}</p>
                <div className="mt-4 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <figure className="m-0 min-w-0">
                    <Trigger kind={trigger} />
                    <figcaption className="mt-1.5 text-[12px] muted">{trigger === 'sms' ? 'The text, from ServiceM8' : trigger === 'dashboard' ? 'Your TurnUp dashboard' : 'ServiceM8 app, drawn'}</figcaption>
                  </figure>
                  {/* points down on a phone, where the next picture is below, and across on a desktop */}
                  <span className="justify-self-center rotate-90 text-[22px] muted sm:rotate-0" aria-hidden="true">→</span>
                  <Shot name={`sm8-customer-${cap}`} label="" alt={`The customer's page showing ${name}`} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] muted">Every event is checked against the job itself. A missed webhook costs a minute, not a wrong card.</p>
        </section>

        {/* --- test it ------------------------------------------------------- */}
        <section className="mt-14">
          <H2>Test it in ten minutes</H2>
          <ol className="mt-5 grid gap-4">
            <Step n="1" title="Make a test job for yourself" visual={<div className="w-full max-w-[300px]"><Sm8Buttons kind="job" /><Drawn /></div>}>You as the contact, your own mobile, any address.</Step>
            <Step n="2" title="Book it from the job card" visual={<div className="w-full max-w-[340px]"><Sm8Window kind="booking" /><Drawn /></div>}>Schedule → a time → tick Send Booking Confirmation → Save. The text arrives in a few minutes.</Step>
            <Step n="3" title="Tap the link, type four digits" visual={<div className="w-full max-w-[300px]"><Shot name="sm8-claim" label="" alt="TurnUp asking for the last four digits of the mobile" /></div>}>
              You land on Booked in, with the day. Your <Link href="/dashboard">dashboard</Link> has the job, linked.
            </Step>
            <Step n="4" title="Work the job in the ServiceM8 app" visual={<div className="w-full max-w-[300px]"><Sm8Buttons kind="checkin" /><Drawn /></div>}>
              Check In → On site. Check Out → Paused. Complete → Job done. Set off is your tap on the dashboard.
            </Step>
            <Step n="5" title="Watch it happen" visual={<div className="w-full max-w-[340px]"><Shot name="sm8-lately" label="" alt="The Lately log on the ServiceM8 panel: every event received and what it did" /></div>}>
              Dashboard → ServiceM8 → <b>Lately</b>. If a stage does not move, that log says why.
            </Step>
          </ol>
        </section>

        {/* --- not yet ------------------------------------------------------- */}
        <section className="mt-14">
          <H2>What it does not do yet</H2>
          <ul className="mt-4 grid gap-4">
            <li className="glass r-outer p-4 sm:p-5">
              <div className="grid gap-5 sm:grid-cols-[1fr_minmax(0,300px)] sm:items-center">
                <div><p className="text-[16px] font-semibold">On my way from ServiceM8’s Navigate.</p><p className="mt-1 text-[15px] leading-snug muted">Next build, once the connector has run on real jobs.</p></div>
                <div><Sm8Buttons kind="navigate" /><p className="mt-1.5 text-[12px] muted">Next</p></div>
              </div>
            </li>
            <li className="glass r-outer px-4 py-3.5 text-[15px] leading-snug muted"><b>Jobs booked before today.</b> Work the moment a customer opens a link, or add them by job number.</li>
            <li className="glass r-outer px-4 py-3.5 text-[15px] leading-snug muted"><b>Quotes.</b> The link says “not booked in yet” until the job is a Work Order.</li>
          </ul>
        </section>

        <footer className="mt-12 text-center">
          <Mark className="mx-auto h-6 w-auto opacity-60" id="foot" />
          <p className="mt-2 text-[13px]" style={{ color: 'var(--label-3)' }}>TurnUp — live job tracking for trades</p>
        </footer>
      </main>
    </div>
  )
}
