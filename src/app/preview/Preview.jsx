'use client'

import StatusTracker from '../t/StatusTracker'
import { TradeProvider } from '@/components/TradeProvider'
import { DemoProvider } from '../t/status-fetch'

/**
 * The customer's page, drawn from a fixture.
 *
 * Two states worth looking at, and `?stage=` picks between them:
 *
 *   ON_MY_WAY (default) — everything filled in. The busiest the page ever
 *                         gets, so the state to measure and photograph.
 *   BOOKED              — nothing arranged, nothing reported. The state the
 *                         page spends most of its life in, and the easiest
 *                         one to forget is there.
 *
 * The day is fixed rather than relative to now, so two captures a week apart
 * are comparable.
 */
const DAY = '2026-10-01T00:00:00.000Z'
const hour = (h) => {
  const d = new Date(DAY)
  d.setUTCHours(h - 1, 0, 0, 0) // the fixture day is BST, an hour ahead
  return d.toISOString()
}

const STAGES = ['BOOKED', 'ON_MY_WAY', 'ON_SITE', 'PAUSED', 'DONE']

export default function Preview({ stage }) {
  const at = STAGES.includes(stage) ? stage : 'ON_MY_WAY'
  const fresh = at === 'BOOKED'

  return (
    /* An invented trade, whatever the environment says: this page is the
       demo and the diary, and both say nothing on them is real. No phone,
       so there is no Call button that rings a real business. */
    <TradeProvider name="Sam Hale Plumbing">
    {/* Nothing on this page reaches a server: every tap is answered on the
        page by src/lib/demo-answers.js. Until v1.78.0 the buttons posted to
        the real API under the fixture's code and nothing was there. */}
    <DemoProvider>
    <StatusTracker
      initialProfile={{
        engineerName: 'Sam Hale',
        aboutLine: 'Twelve years on the tools',
        vehicle: 'White Vauxhall Vivaro',
        vehicleReg: 'SH21 VAN',
      }}
      initialBrand={null}
      /* An invented Google link, so the DONE page shows both doors of How did
         it go? Nothing in the fixture is tapped; it is photographed. */
      initialReviewUrl={at === 'DONE' ? 'https://g.page/r/example/review' : null}
      initialStatus={{
        code: 'K7M4PQRT',
        stage: at,
        stageNote: fresh ? null : 'Cylinder is on the van — picked it up from the merchant first thing.',
        customerName: 'Sarah',
        jobRef: '2718',
        jobAddress: 'Church Lane, Burbage SN8',
        jobSummary: 'Unvented cylinder swap',
        scheduledFor: DAY,
        arrivingAt: fresh ? null : hour(8),
        updatedAt: hour(fresh ? 6 : 8),
        position: fresh ? null : 2,
        presenceAt: fresh ? null : hour(7),
        window: fresh ? null : { state: 'AGREED', by: 'TRADE', start: hour(9), end: hour(11), at: hour(7) },
        events: fresh
          ? [{ stage: 'BOOKED', note: 'Booked in for Thursday.', at: hour(6) }]
          : [
            { stage: 'BOOKED', note: 'Booked in for Thursday.', at: hour(6) },
            { stage: at, note: null, at: hour(8) },
          ],
      }}
    />
    </DemoProvider>
    </TradeProvider>
  )
}
