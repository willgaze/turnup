/**
 * A day's work, in a local database, so the dashboard can be looked at.
 *
 *   bash scripts/local-db.sh        # starts Postgres and runs this
 *
 * Every name, address and phone number below is invented. Nothing here ever
 * runs against the real database: it refuses unless DATABASE_URL points at
 * localhost, because a seed that wipes a live table is a seed that does it
 * exactly once.
 *
 * The jobs are deliberately not all tidy. A real Thursday has one job that is
 * finished, one running, one paused on a part that has not turned up, one with
 * a window the customer has countered and not had answered, and one booked for
 * next week that nobody has touched. A dashboard that only ever gets looked at
 * with neat data is a dashboard whose awkward states nobody has seen.
 */
import { PrismaClient } from '@prisma/client'
import { atLocalTime } from '../src/lib/when.js'

const url = process.env.DATABASE_URL || ''
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error('Refusing to seed: DATABASE_URL is not a local database.')
  process.exit(1)
}

const prisma = new PrismaClient()
const day = (offset, hour = 9) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d
}

const JOBS = [
  {
    code: 'K7M4PQRT', customerName: 'Sarah Whitfield', customerPhone: '07700 900412',
    jobRef: '2718', jobAddress: '14 Church Lane, Burbage SN8 3AQ',
    jobSummary: 'Unvented cylinder swap', stage: 'ON_SITE',
    stageNote: 'Old cylinder is out. Starting on the new one now.',
    scheduledFor: day(0), arrivingAt: day(0, 8), position: 2,
    windowStart: day(0, 9), windowEnd: day(0, 11), windowState: 'AGREED', windowBy: 'TRADE', windowAt: day(-1, 17),
    presence: 'IN', presenceAt: day(0, 7), doorToUse: 'SIDE', petsOnSite: true,
    accessNotes: 'Gate sticks. Park on the verge, not the drive.',
    events: [['BOOKED', 'Booked in for Thursday.', day(-3, 14)],
             ['ON_MY_WAY', null, day(0, 8)],
             ['ON_SITE', null, day(0, 9)]],
  },
  {
    code: 'B3XN8WHF', customerName: 'Mr & Mrs Doherty', customerPhone: '07700 900188',
    jobRef: '2716', jobAddress: '3 Mill Cottages, Pewsey SN9 5LW',
    jobSummary: 'Bathroom install — second fix', stage: 'PAUSED',
    stageNote: 'Waiting on the basin. Merchant has it Monday.',
    scheduledFor: day(0), position: 1,
    events: [['BOOKED', null, day(-7, 11)], ['ON_SITE', null, day(-1, 8)], ['PAUSED', 'Waiting on the basin.', day(-1, 15)]],
  },
  {
    code: 'QF52MDKR', customerName: 'Janet Pryce', customerPhone: '07700 900733',
    jobRef: '2719', jobAddress: 'The Old Forge, Oare SN8 4JQ',
    jobSummary: 'Leaking rad valve', stage: 'BOOKED',
    scheduledFor: day(1),
    // The customer has asked for different hours and nobody has answered yet.
    // The row that should be shouting on the dashboard.
    windowStart: day(1, 14), windowEnd: day(1, 16), windowState: 'PROPOSED', windowBy: 'CUSTOMER',
    windowNote: 'School run until half one, sorry.', windowAt: day(0, 7),
    presence: 'BACK_SOON', presenceAt: day(0, 7),
    events: [['BOOKED', null, day(-1, 16)]],
  },
  {
    code: 'TW9HJ4CN', customerName: 'Alan Beck', customerPhone: '07700 900051',
    jobRef: '2714', jobAddress: '22 Kennet Place, Hungerford RG17 0BZ',
    jobSummary: 'Outside tap', stage: 'DONE',
    scheduledFor: day(-1), arrivingAt: day(-1, 13),
    events: [['BOOKED', null, day(-5, 9)], ['ON_MY_WAY', null, day(-1, 13)],
             ['ON_SITE', null, day(-1, 14)], ['DONE', 'All done, tested, no leaks.', day(-1, 15)]],
  },
  {
    code: 'ZD6RVB8M', customerName: 'Priya Raman', customerPhone: '07700 900620',
    jobRef: '2721', jobAddress: 'Flat 2, 8 High Street, Marlborough SN8 1AA',
    jobSummary: 'Quote — full bathroom', stage: 'BOOKED',
    scheduledFor: day(6),
    events: [['BOOKED', null, day(0, 6)]],
  },
]

/**
 * One household card, with a real week on it.
 *
 * The parcels are what a forwarded inbox actually produces: four carriers, one
 * of them with no tracking number at all (the sofa), one that missed, one
 * already delivered, and the trade's own job showing up alongside them with a
 * link to its live page. That last row is the whole point of the card — the
 * plumber and the parcels in one list, because that is how the person living
 * there already thinks about their Thursday.
 */
const PLACE = { code: 'HOME24XK', inboxKey: 'q7rmt4ndkw82jp', label: '14 Church Lane' }

const ARRIVALS = [
  {
    dedupeKey: 'royalmail:ab123456789gb', kind: 'PARCEL', source: 'EMAIL', stage: 'OUT_FOR_DELIVERY',
    carrier: 'Royal Mail', title: 'Royal Mail parcel', reference: 'AB123456789GB',
    trackUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/AB123456789GB',
    expectedFor: day(0), expectedSaid: 'today',
  },
  {
    dedupeKey: 'sofa:two-seater', kind: 'DELIVERY', source: 'EMAIL', stage: 'BOOKED',
    carrier: 'Loaf', title: 'Two-seater sofa', reference: null, trackUrl: null,
    expectedFor: day(1), expectedSaid: 'Friday',
    // Through atLocalTime, exactly as a parsed email goes in: a seed that
    // builds the window in UTC shows 13:00 and hides the bug it is here to
    // catch.
    windowStart: atLocalTime(day(1), '12:00'), windowEnd: atLocalTime(day(1), '16:00'),
    windowSaid: 'between 12pm and 4pm',
  },
  {
    dedupeKey: 'turnup:2718', kind: 'SERVICE', source: 'TRADE', stage: 'BOOKED',
    carrier: null, title: 'Unvented cylinder swap', reference: '2718', trackUrl: null,
    expectedFor: day(0, 9), expectedSaid: null, tradeStatusCode: 'K7M4PQRT',
  },
  {
    dedupeKey: 'heatingco:boiler service', kind: 'SERVICE', source: 'EMAIL', stage: 'BOOKED',
    carrier: 'Heatwise', title: 'Your boiler service is booked', reference: null, trackUrl: null,
    expectedFor: day(2), expectedSaid: 'Wednesday',
    windowStart: atLocalTime(day(2), '09:00'), windowEnd: atLocalTime(day(2), '13:00'),
    windowSaid: 'between 9am and 1pm',
  },
  {
    dedupeKey: 'evri:h00ap1234567890', kind: 'PARCEL', source: 'EMAIL', stage: 'MISSED',
    carrier: 'Evri', title: 'Parcel from Screwfix', reference: 'H00AP1234567890',
    trackUrl: 'https://www.evri.com/track/parcel/H00AP1234567890',
    expectedFor: day(-1), expectedSaid: 'yesterday',
  },
  {
    dedupeKey: 'dpd:15502938475610', kind: 'PARCEL', source: 'EMAIL', stage: 'DONE',
    carrier: 'DPD', title: 'DPD parcel', reference: '15502938475610',
    trackUrl: 'https://track.dpd.co.uk/search?reference=15502938475610',
    expectedFor: day(-1), expectedSaid: 'yesterday',
  },
]

const seedPlace = async () => {
  try {
    await prisma.arrival.deleteMany({})
    await prisma.place.deleteMany({})
    const place = await prisma.place.create({ data: PLACE })
    for (const a of ARRIVALS) await prisma.arrival.create({ data: { ...a, placeId: place.id } })
    console.log(`\n  /h/${place.code}   ${ARRIVALS.length} arrivals`)
    console.log(`  forward to: ${place.inboxKey}@in.getturnup.com`)
  } catch {
    // The household tables are new, which is the migration case that fails
    // soft. No tables yet means no card, and the jobs above are untouched.
    // Loud on purpose. This was a quiet line for three diaries, and each one
    // photographed a household card that said it had expired.
    console.log('\n  NO HOUSEHOLD CARD: the Place/Arrival tables are missing or the Prisma client is stale.')
    console.log('  Run: npx prisma generate && npx prisma db push, then this seed again.')
  }
}

const run = async () => {
  await prisma.tradeStatusEvent.deleteMany({})
  await prisma.tradeStatus.deleteMany({})

  for (const { events, ...job } of JOBS) {
    const row = await prisma.tradeStatus.create({ data: job })
    for (const [stage, note, createdAt] of events) {
      await prisma.tradeStatusEvent.create({ data: { tradeStatusId: row.id, stage, note, createdAt } })
    }
    console.log(`  ${job.code}  ${job.stage.padEnd(9)} ${job.customerName}`)
  }

  await prisma.tradeProfile.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton', engineerName: 'Sam Hale', aboutLine: 'Twelve years on the tools',
      vehicleReg: 'SH21 VAN', vehicleMake: 'Vauxhall', vehicleModel: 'Vivaro', vehicleColour: 'White',
    },
    update: {},
  })
  await seedPlace()

  console.log('\nSeeded. Dashboard password: whatever OPERATOR_PASSWORD is set to.')
}

run().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
