'use client'

import { useCallback, useEffect, useState } from 'react'
import { dayAndMonth } from '@/lib/when'
import { ChevronIcon, TickIcon, LinkOffIcon } from '@/components/icons'

/**
 * Who has asked for this, so "I will let you know" is a thing that can be done.
 *
 * Shut by default and quiet when empty — this is the trade's working screen,
 * and a section about a waiting list has no business being open above the
 * jobs. It says the count in its own heading so it never needs opening just to
 * find out whether anything happened.
 *
 * Every address here was given to one person for one purpose. Tapping a row
 * opens a mail app; nothing is ever sent from the product on its own.
 */
export default function WaitlistPanel() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/waitlist', { cache: 'no-store' })
      if (r.ok) setRows((await r.json()).waitlist || [])
    } catch { /* the section simply stays empty */ } finally { setLoaded(true) }
  }, [])
  useEffect(() => { load() }, [load])

  const remove = async (row) => {
    setRows((rs) => rs.filter((r) => r.id !== row.id))
    try {
      await fetch(`/api/dashboard/waitlist?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    } finally { load() }
  }

  const mark = async (row) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, contacted: !r.contacted } : r)))
    try {
      await fetch('/api/dashboard/waitlist', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, contacted: !row.contacted }),
      })
    } finally { load() }
  }

  // Nothing to say yet, so it says nothing. An empty panel on a daily screen is
  // just something else to scroll past.
  if (!loaded || rows.length === 0) return null

  const waiting = rows.filter((r) => !r.contacted).length

  return (
    <section className="glass r-outer mt-8 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
              className="flex min-h-[66px] w-full items-center gap-3 px-6 py-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-semibold">Waiting list</span>
          <span className="block text-[14px] muted">
            {/* /join asks homes as well as trades; a home is filed with the
                trade "Household", so count the two apart. */}
            {(() => {
              const homes = rows.filter((r) => r.trade === 'Household').length
              const trades = rows.length - homes
              return `${trades} ${trades === 1 ? 'trade' : 'trades'}${homes ? `, ${homes} ${homes === 1 ? 'home' : 'homes'}` : ''} asked`
            })()}
            {waiting > 0 && ` · ${waiting} not contacted`}
          </span>
        </span>
        <ChevronIcon size={18} style={{ color: 'var(--label-3)' }}
                     className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <ul className="px-4 pb-5">
          {rows.map((r) => (
            <li key={r.id} className="r-inner mb-2 flex items-center gap-3 p-3.5"
                style={{ background: 'rgb(var(--glass-line) / 0.07)' }}>
              <span className="min-w-0 flex-1">
                <a href={`mailto:${r.email}`} className="block truncate text-[16px] font-semibold"
                   style={{ color: 'var(--tint)' }}>{r.email}</a>
                <span className="block text-[14px] muted">
                  {[r.trade, r.town, dayAndMonth(r.createdAt)].filter(Boolean).join(' · ')}
                </span>
                {r.note && <span className="block text-[14px]">{r.note}</span>}
              </span>
              <button type="button" onClick={() => mark(r)}
                      aria-pressed={r.contacted}
                      aria-label={r.contacted ? 'Mark as not contacted' : 'Mark as contacted'}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                      style={r.contacted
                        ? { color: 'var(--stage-done)', background: 'color-mix(in srgb, var(--stage-done) 15%, transparent)' }
                        : { color: 'var(--label-3)', background: 'rgb(var(--glass-line) / 0.1)' }}>
                <TickIcon size={18} />
              </button>
              <button type="button" onClick={() => remove(r)} aria-label={`Remove ${r.email}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                      style={{ color: 'var(--label-3)', background: 'rgb(var(--glass-line) / 0.1)' }}>
                <LinkOffIcon size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
