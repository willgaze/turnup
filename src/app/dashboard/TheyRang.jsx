'use client'

import { useState } from 'react'
import { queueFetch } from './offline-queue'
import { PhoneIcon } from '@/components/icons'

/**
 * "They rang to ask when I'm coming" — one tap, on the job they rang about.
 *
 * The fourth pilot number, and the one the whole product is a bet against.
 * It used to be a running total typed on a panel folded inside Setup and
 * settings, which is not a place a trade goes between jobs: in thirty days
 * it would have read 0, and 0 would have read as nobody ringing, which is
 * the answer the product was hoping for.
 *
 * It is here, on the job, for a second reason that matters more than the
 * convenience: a call attached to a job is what lets the panel ask whether
 * the people who OPENED the link rang less often than the people who did
 * not. That comparison needs no before — the control is inside the window —
 * and it is the only number in the pilot that can settle the bet rather
 * than describe it. A bare tally never could.
 *
 * Offline like every other tap from a driveway: queued with the phone's own
 * clock, replayed in order, never doubled (the tapId rides with it).
 */
export default function TheyRang({ tracker }) {
  const [logged, setLogged] = useState(0)
  const [busy, setBusy] = useState(false)

  // Not while you are standing in their kitchen, and not on a finished job.
  if (!['BOOKED', 'ON_MY_WAY', 'PAUSED'].includes(tracker.stage)) return null

  const log = async () => {
    setBusy(true)
    try {
      await queueFetch('/api/dashboard/pilot/call', { method: 'POST', body: { tradeStatusId: tracker.id } })
      setLogged((n) => n + 1)
    } finally { setBusy(false) }
  }

  return (
    <button type="button" onClick={log} disabled={busy}
            className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]"
            aria-label="They rang to ask when I am coming">
      <PhoneIcon size={16} />
      {busy ? '…' : logged ? `Rang · ${logged} logged` : 'They rang'}
    </button>
  )
}
