'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * The pilot, in four numbers, for the thirty days decided on 11 Oct 2026.
 * Three are counted from the rows; the fourth, calls to the booking line, is
 * a person's count, typed here, and the panel says so rather than guessing.
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

  const save = async (what, body) => {
    setBusy(what)
    try {
      await fetch('/api/dashboard/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      await load()
    } finally { setBusy(null) }
  }

  const calls = r?.calls?.n ?? null
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
      <p className="mt-1 text-[14px] muted">Four numbers decide whether this works. Three are counted here. The fourth is yours.</p>
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

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Tile n={r.linksOpened.n} pct={r.linksOpened.pct} label="Links opened by a customer" note={`of ${r.jobs} job${r.jobs === 1 ? '' : 's'}. Your own opens and link previews do not count.`} />
            <Tile n={r.inAnswered.n} pct={r.inAnswered.pct} label="“Will someone be in?” answered" note={`of the ${r.inAnswered.of} asked the day before`} />
            <Tile n={r.wastedTrips.n} label="Wasted trips" note="No one home records, by the day they happened" />
            <Tile n={calls} label="“When are you coming?” calls" note={calls === null ? `Not counted yet. ${r.stillComingAsks.n} asked it from the card.` : `Typed by you${r.callsAt ? `, last on ${day(r.callsAt)}` : ''}. ${r.stillComingAsks.n} asked it from the card.`} />
          </div>

          {/* The hand count. A running total, two buttons, no form. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[14px]">
            <span className="muted">Calls to the booking line asking when you are coming:</span>
            <button type="button" disabled={busy || !calls} onClick={() => save('calls', { pilotCalls: Math.max(0, (calls || 0) - 1) })} className="btn btn-grey !min-h-[36px] !px-3 !text-[14px]" aria-label="One fewer call">−</button>
            <span className="min-w-[2ch] text-center font-semibold tabular-nums">{calls ?? 0}</span>
            <button type="button" disabled={busy} onClick={() => save('calls', { pilotCalls: (calls || 0) + 1 })} className="btn accent-fill !min-h-[36px] !px-3 !text-[14px]" aria-label="One more call">{busy === 'calls' ? '…' : '+1 call'}</button>
          </div>
          <p className="mt-3 text-[12px] muted">If the first two stay low, the product is wrong, not the pitch. Nothing moves on housing or pricing until these are in.</p>
        </>
      )}
    </section>
  )
}
