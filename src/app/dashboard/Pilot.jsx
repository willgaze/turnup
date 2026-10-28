'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The pilot, in four numbers, for the thirty days decided on 11 Oct 2026.
 * Three are counted from the rows; the fourth, calls to the booking line, is
 * a person's count — but a dated row now, logged in one tap from the job,
 * not a running total typed here (v1.76.0; see src/lib/pilot.js).
 *
 * The clock starts when Start is pressed (TradeProfile.pilotStart). Until
 * then the window rolls back from today and the panel says so, because a
 * rolling window reaches into the weeks of test cards before the pilot.
 */
function Tile({ n, pct, label, note }) {
  return (
    <div className="r-inner px-4 py-3" style={{ background: 'rgb(var(--glass-line) / 0.08)' }}>
      <div className="text-[26px] font-bold leading-none tabular-nums">
        {n === null || n === undefined ? '—' : n}
        {pct !== null && pct !== undefined && <span className="ml-1.5 text-[14px] font-semibold muted">{pct}%</span>}
      </div>
      <div className="mt-1 text-[14px] font-semibold">{label}</div>
      {note && <div className="text-[12px] muted">{note}</div>}
    </div>
  )
}

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })

/**
 * The one number that can settle the bet.
 *
 * Everything else here describes the pilot; this compares the two halves of
 * it. "Three calls in thirty days" needs a before that does not exist, but
 * "one in four who read the card rang, against three in four who never
 * opened it" needs nothing outside the window. If the two sides match, the
 * card does not work, and that is worth knowing in thirty days.
 */
function Verdict({ rang }) {
  const { opened, notOpened } = rang
  const both = opened.pct !== null && notOpened.pct !== null
  // Only a real comparison gets a colour. A half-answer tinted green or
  // amber is the panel claiming a verdict it has not got — and --glass-line
  // is an RGB triplet, not a colour, so a color-mix on it silently washed
  // out to nothing anyway.
  const bg = both
    ? `color-mix(in srgb, ${opened.pct < notOpened.pct ? 'var(--stage-done)' : 'var(--stage-paused)'} 12%, transparent)`
    : 'rgb(var(--glass-line) / 0.08)'
  return (
    <div className="r-inner mt-3 px-4 py-3" style={{ background: bg }}>
      <p className="text-[13px] font-semibold muted">Did the card stop them ringing?</p>
      {both ? (
        <>
          <p className="mt-1 text-[15px]"><b>{opened.n} of {opened.of} who opened the link rang anyway</b> — {opened.pct}%.</p>
          <p className="text-[15px]">{notOpened.n} of {notOpened.of} who never opened it rang — {notOpened.pct}%.</p>
          <p className="mt-1.5 text-[12px] muted">
            {opened.pct < notOpened.pct
              ? 'Fewer of the people who read the card rang. That is the product working.'
              : 'Reading the card made no difference to who rang. That is the product not working.'}
            {' '}Both sides stay small until there are thirty days of real jobs in here.
          </p>
        </>
      ) : (
        // One side empty is not half an answer, it is no answer. Saying
        // "0 of the 1 who never opened it rang — 0%" on its own reads as a
        // finding, and it is noise.
        <p className="mt-1 text-[15px]">
          Nothing to compare yet.{' '}
          <span className="muted">
            {opened.of === 0 && notOpened.of === 0
              ? 'No jobs in this window.'
              : opened.of === 0
                ? `${notOpened.of} job${notOpened.of === 1 ? '' : 's'} so far, and nobody has opened their link.`
                : `${opened.of} job${opened.of === 1 ? '' : 's'} so far, and every customer opened their link — no other side to weigh it against.`}
          </span>
        </p>
      )}
    </div>
  )
}

export default function Pilot() {
  const [r, setR] = useState(null)
  const [days, setDays] = useState(30)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    setError(false)
    return fetch(`/api/dashboard/pilot?days=${days}`, { cache: 'no-store' })
      .then((x) => (x.ok ? x.json() : Promise.reject()))
      .then(setR)
      .catch(() => setError(true))
  }, [days])
  useEffect(() => { load() }, [load])

  const [summaryNote, setSummaryNote] = useState(null)
  const sendSummary = async () => {
    setBusy('summary'); setSummaryNote(null)
    try {
      const r = await fetch('/api/dashboard/pilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'summary' }) })
      const j = await r.json().catch(() => ({}))
      setSummaryNote(!r.ok ? `Did not send: ${j.error || r.status}` : j.devices === 0 ? 'No phone registered yet: switch on Nudge me first.' : `Sent to ${j.sent} phone${j.sent === 1 ? '' : 's'}.`)
    } finally { setBusy(null) }
  }

  const save = async (what, body) => {
    setBusy(what)
    try {
      await fetch('/api/dashboard/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      await load()
    } finally { setBusy(null) }
  }

  // A call logged from the panel belongs to no job, so it counts in the
  // total and sits out of the comparison above. The one that teaches you
  // something is the button on the job itself.
  const logCall = async (method) => {
    setBusy('calls')
    try {
      await fetch('/api/dashboard/pilot/call', { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined })
      await load()
    } finally { setBusy(null) }
  }

  const calls = r?.calls
  return (
    <section className="glass r-outer mt-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">The pilot</h2>
        <div className="flex gap-1">
          {[30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
                    className={`btn text-[13px] ${days === d ? 'btn-filled' : 'btn-grey'}`}>{d} days</button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[14px] muted">Four numbers decide whether this works. Three are counted here. The fourth is one tap on the job when someone rings.</p>
      {error && <p className="mt-3 text-[14px]" style={{ color: 'var(--stage-paused)' }}>Could not load the numbers. Try again in a moment.</p>}
      {r && (
        <>
          {/* The clock. Counting from a date, not from whenever you look. */}
          <div className="r-inner mt-3 flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[14px]" style={{ background: r.start ? 'color-mix(in srgb, var(--stage-done) 12%, transparent)' : 'color-mix(in srgb, var(--stage-paused) 12%, transparent)' }}>
            {r.start
              ? <span><b>Counting since {day(r.start)}.</b> Jobs booked from that day on; the last {days} days of them.</span>
              : <span><b>The count has not started.</b> Until it does, this is the last {days} days, test cards included.</span>}
            {r.start
              ? <button type="button" disabled={busy} onClick={() => { if (confirm('Clear the start date? The numbers go back to a rolling window.')) save('start', { pilotStart: null }) }} className="btn btn-grey !min-h-[36px] !px-3 !text-[13px]">Clear</button>
              : <button type="button" disabled={busy} onClick={() => save('start', { pilotStart: 'now' })} className="btn accent-fill !min-h-[40px] !px-4 !text-[14px]">{busy === 'start' ? '…' : 'Start the count today'}</button>}
          </div>

          <Verdict rang={r.rang} />

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Tile n={r.linksOpened.n} pct={r.linksOpened.pct} label="Links opened by a customer" note={`of ${r.jobs} job${r.jobs === 1 ? '' : 's'}. Your own opens and link previews do not count.`} />
            <Tile n={r.inAnswered.n} pct={r.inAnswered.pct} label="“Will someone be in?” answered" note={`of the ${r.inAnswered.of} asked the day before`} />
            <Tile n={r.wastedTrips.n} label="Wasted trips" note="No one home records, by the day they happened" />
            <Tile n={calls.n} label="“When are you coming?” calls"
                  note={calls.n === 0
                    ? `None logged. ${r.stillComingAsks.n} asked it from the card instead.`
                    : `${calls.onAJob} of them on a job${calls.last ? `, last on ${day(calls.last)}` : ''}. ${r.stillComingAsks.n} asked it from the card.`} />
          </div>

          <p className="mt-2 text-[13px] muted">
            Tap <b>They rang</b> on the job when someone phones to ask when you are coming. A call logged on the job is the one that counts for the question above.
          </p>

          {/* For a call that was not about any one job. It still counts in
              the total; it just cannot be placed on either side. */}
          <p className="mt-3 text-[13px] muted">A call about no one job:</p>
          <div className="mt-1.5 flex items-center gap-2 text-[14px]">
            <button type="button" disabled={busy} onClick={() => logCall('POST')} className="btn accent-fill !min-h-[40px] !px-4 !text-[14px]" aria-label="One more call">{busy === 'calls' ? '…' : '+1 call'}</button>
            <span className="min-w-[2ch] text-center font-semibold tabular-nums">{calls.n}</span>
            <button type="button" disabled={busy || !calls.n} onClick={() => logCall('DELETE')} className="btn btn-grey !min-h-[40px] !px-3.5 !text-[14px]" aria-label="Undo the last call">Undo</button>
          </div>
          {calls.typedBefore && (
            <p className="mt-2 text-[12px] muted">
              {calls.typedBefore} call{calls.typedBefore === 1 ? ' was' : 's were'} typed here before calls were dated. Not in the count above: there is no way to tell which window {calls.typedBefore === 1 ? 'it belongs' : 'they belong'} to.
            </p>
          )}
          {/* Monday 08:00, the four numbers on your phone. The button sends
              the same message now, so the schedule is seen before it is trusted. */}
          <div className="r-inner mt-3 px-4 py-3 text-[14px]" style={{ background: 'rgb(var(--glass-line) / 0.08)' }}>
            <p className="font-semibold">Every Monday at 8, on your phone</p>
            <p className="mt-0.5 muted">Last week's four numbers beside the week before, as a notification to the phone you registered under Nudge me. {r.summaryAt ? `Last sent ${day(r.summaryAt)}.` : 'Not sent yet.'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" disabled={busy} onClick={sendSummary} className="btn btn-grey !min-h-[40px] !px-4 !text-[14px]">{busy === 'summary' ? '…' : 'Send me this week\u2019s now'}</button>
              {summaryNote && <span className="text-[13px] muted">{summaryNote}</span>}
            </div>
          </div>
          <p className="mt-3 text-[12px] muted">If the first two stay low, the product is wrong, not the pitch. Nothing moves on housing or pricing until these are in.</p>
        </>
      )}
    </section>
  )
}
