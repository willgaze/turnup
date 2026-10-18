/**
 * Does the parser read real emails?
 *
 * Samples written to match what these senders actually put in a subject line
 * and first paragraph. Every expectation here is a claim about the parser, so
 * a failure is a real failure and prints what it got instead.
 *
 *   node scripts/check-arrival-email.mjs
 */
import { readFileSync } from 'node:fs'
import { readArrivalEmail, unwrapForward, statedWindow, statedDate } from '../src/lib/arrival-email.js'
import { readRawEmail } from '../src/lib/mime.js'

// A fixed "now" so a weekday or "tomorrow" means the same thing every run.
const NOW = new Date('2026-10-12T09:00:00Z') // a Monday

const CASES = [
  { name: 'Royal Mail, out for delivery',
    email: { from: 'Royal Mail <no-reply@royalmail.com>', subject: 'Your item is out for delivery',
      text: 'Your item with tracking number AB123456789GB is out for delivery today.' },
    want: { carrier: 'Royal Mail', stage: 'OUT_FOR_DELIVERY', reference: 'AB123456789GB', hasTrack: true, hasDate: true } },

  { name: 'Evri, on the way with a stated day',
    email: { from: 'Evri <donotreply@evri.com>', subject: 'Your parcel is on its way',
      text: 'We have your parcel. It is on its way and due Tuesday 13 October.' },
    want: { carrier: 'Evri', stage: 'ON_THE_WAY', hasDate: true } },

  { name: 'DPD, one hour window',
    email: { from: 'DPD <noreply@dpd.co.uk>', subject: 'Your parcel is being delivered today',
      text: 'Your parcel 12345678901234 will be delivered between 1pm and 2pm today.' },
    want: { carrier: 'DPD', stage: 'OUT_FOR_DELIVERY', reference: '12345678901234', hasWindow: true } },

  { name: 'InPost, a two hour window on the day',
    email: { from: 'InPost <no-reply@inpost.co.uk>', subject: 'Your parcel is out for delivery today',
      text: 'Parcel JJD0002234062896206 ETA: 17:00-19:00 today. Not going to be in? Tap to update your delivery preferences.' },
    want: { carrier: 'InPost', stage: 'OUT_FOR_DELIVERY', reference: 'JJD0002234062896206', hasWindow: true } },

  { name: 'Missed delivery',
    email: { from: 'Yodel <noreply@yodel.co.uk>', subject: 'Sorry we missed you',
      text: 'Sorry we missed you today. A card was left.' },
    want: { carrier: 'Yodel', stage: 'MISSED' } },

  { name: 'Delivered',
    email: { from: 'DPD <noreply@dpd.co.uk>', subject: 'Your parcel has been delivered',
      text: 'Your parcel 99887766554433 has been delivered and left in the porch.' },
    want: { carrier: 'DPD', stage: 'DONE' } },

  { name: 'Amazon order confirmation',
    email: { from: '"Amazon.co.uk" <auto-confirm@amazon.co.uk>', subject: 'Your Amazon.co.uk order',
      text: 'Thanks for your order. Order 203-1234567-1234567 will arrive tomorrow.' },
    want: { carrier: 'Amazon', stage: 'ORDERED', reference: '203-1234567-1234567', hasDate: true } },

  { name: 'A merchant with no tracking number at all — the case Shop drops',
    email: { from: 'Sofa Workshop <orders@sofaworkshop.example>', subject: 'Your delivery is booked',
      text: 'Two of our team will deliver your sofa on Thursday between 8am and 12pm.' },
    want: { kind: 'DELIVERY', stage: null, hasWindow: true, hasDate: true } },

  { name: 'A newsletter is not an arrival',
    email: { from: 'Deals <news@someshop.example>', subject: '20% off this weekend only',
      text: 'Our autumn sale is on. Shop now and save on everything in store.' },
    want: null },

  { name: 'A password reset is not an arrival',
    email: { from: 'Account <no-reply@bank.example>', subject: 'Reset your password',
      text: 'Click the link below to reset your password. It expires in 30 minutes.' },
    want: null },
]

let pass = 0, fail = 0
const bad = (name, why, got) => { fail++; console.log(`  FAIL  ${name}\n        ${why}\n        got: ${JSON.stringify(got)}`) }

for (const { name, email, want } of CASES) {
  const got = readArrivalEmail({ ...email, receivedAt: NOW })
  if (want === null) {
    if (got === null) { pass++; console.log(`  ok    ${name}`) }
    else bad(name, 'expected it to be ignored', got)
    continue
  }
  if (!got) { bad(name, 'expected an arrival, got nothing', got); continue }

  const problems = []
  if (want.carrier && got.carrier !== want.carrier) problems.push(`carrier ${got.carrier} != ${want.carrier}`)
  if (want.stage && got.stage !== want.stage) problems.push(`stage ${got.stage} != ${want.stage}`)
  if (want.kind && got.kind !== want.kind) problems.push(`kind ${got.kind} != ${want.kind}`)
  if (want.reference && got.reference !== want.reference) problems.push(`reference ${got.reference} != ${want.reference}`)
  if (want.hasTrack && !got.trackUrl) problems.push('expected a tracking link')
  if (want.hasDate && !got.expectedFor) problems.push('expected a stated date')
  if (want.hasWindow && !got.window) problems.push('expected a stated window')
  if (want.trackUrl && !got.trackUrl) problems.push('expected a tracking link')
  if (problems.length) bad(name, problems.join('; '), got)
  else { pass++; console.log(`  ok    ${name}${got.expectedSaid ? `  (said "${got.expectedSaid}")` : ''}`) }
}

// A date is only ever carried when the email said one.
const noDate = readArrivalEmail({ from: 'x@dpd.co.uk', subject: 'On its way', text: 'Your parcel is on its way.' }, NOW)
if (noDate?.expectedFor == null) { pass++; console.log('  ok    no date in the email means no date on the card') }
else bad('no invented dates', 'a date appeared from nowhere', noDate)

// The title names the thing, not the stage. The card already says the stage,
// in colour, directly above the title — a title that repeats it spends the one
// line that could have said WHAT is coming.
const TITLES = [
  ['a subject that is only a stage', { from: 'noreply@evri.com', subject: 'Your parcel is out for delivery', text: 'Your parcel H00AP1234567890 is out for delivery today.' }, 'Evri parcel'],
  ['a sender with no carrier', { from: 'deliveries@loaf.com', subject: 'Your delivery is booked', text: 'We will deliver your sofa on Friday.' }, 'Delivery from Loaf'],
  ['a subject that names something', { from: 'noreply@dpd.co.uk', subject: 'Your Screwfix order has been dispatched', text: 'Order 15502938475610 has been dispatched.' }, 'Your Screwfix order has been dispatched'],
]
for (const [name, email, want] of TITLES) {
  const got = readArrivalEmail(email, NOW)
  if (got?.title === want) { pass++; console.log(`  ok    ${name} -> "${got.title}"`) }
  else bad(name, `title "${got?.title}" != "${want}"`, got)
}

// A parcel lands; a person knocks. The card separates them, and that split is
// only worth having if this is right — a jiffy bag in the list of people you
// have to be in for makes the whole list untrustworthy.
const KINDS = [
  ['a carrier parcel', { from: 'noreply@evri.com', subject: 'Your parcel is out for delivery', text: 'Parcel H00AP1234567890 is out for delivery today.' }, 'PARCEL', 'OUT_FOR_DELIVERY'],
  ['a boiler service', { from: 'bookings@heatingco.co.uk', subject: 'Your boiler service is booked', text: 'Our engineer will attend on Friday 17 October between 9am and 1pm.' }, 'SERVICE', 'BOOKED'],
  ['a window survey', { from: 'surveys@windowsco.uk', subject: 'Window survey', text: 'Our surveyor will visit on Monday morning.' }, 'SERVICE', 'BOOKED'],
  ['a kitchen fitting', { from: 'info@kitchensltd.co.uk', subject: 'Your installation date', text: 'Your fitting appointment is confirmed for Tuesday. The installer will arrive from 8am.' }, 'SERVICE', 'BOOKED'],
  ['a sofa with a crew', { from: 'deliveries@loaf.com', subject: 'Your delivery is booked', text: 'We will deliver your two-seater sofa on Friday between 12pm and 4pm. Two men will call ahead.' }, 'DELIVERY', 'BOOKED'],
]
for (const [name, email, wantKind, wantStage] of KINDS) {
  const got = readArrivalEmail(email, NOW)
  if (got?.kind === wantKind && got?.stage === wantStage) { pass++; console.log(`  ok    ${name} -> ${got.kind} / ${got.stage}`) }
  else bad(name, `${got?.kind} / ${got?.stage} != ${wantKind} / ${wantStage}`, got)
}

// An invoice is not an arrival. Worth its own case: it is the email most likely
// to look like one, because it names a thing that was bought.
const invoice = readArrivalEmail({ from: 'billing@someco.com', subject: 'Your invoice', text: 'Please find attached your invoice for last month.' }, NOW)
if (invoice === null) { pass++; console.log('  ok    an invoice is not an arrival') }
else bad('an invoice', 'filed something', invoice)

// FORWARDS, AS A CARD ACTUALLY RECEIVES THEM. Every card email is a forward.
// A live test on 18 Oct 2026 (the Thimbles card) found three bugs at once:
// the sender read as "Me" and the title as "Fwd: ...", a Samsung "Dispatched"
// email filed as arrived, and "Confirmation of your order" dropped. These are
// raw RFC 822 files, run through the same two functions the inbound route
// uses, so a pass here is a pass for the real path.
const FIXTURES = new URL('./fixtures/forwards/', import.meta.url)
const FORWARDS = [
  ['Gmail forward: Samsung order confirmation', 'gmail-samsung-order-confirmation.eml',
    { carrier: 'Samsung UK', stage: 'ORDERED', titleIs: 'Samsung UK order', reference: 'UK260018734512' }],
  ['Gmail forward: Samsung dispatched', 'gmail-samsung-dispatched.eml',
    { carrier: 'Samsung UK', stage: 'ON_THE_WAY', titleIs: 'Your Samsung order UK260018734512', hasDate: true, reference: 'UK260018734512' }],
  ['Gmail forward: Samsung delivered', 'gmail-samsung-delivered.eml',
    { carrier: 'Samsung UK', stage: 'DONE', titleIs: 'Your Samsung order UK260018734512', reference: 'UK260018734512' }],
  ['Outlook forward: DPD out for delivery', 'outlook-dpd-out-for-delivery.eml',
    { carrier: 'DPD', stage: 'OUT_FOR_DELIVERY', hasWindow: true }],
  ['A forward of a forward: Evri on its way', 'nested-evri-on-its-way.eml',
    { carrier: 'Evri', stage: 'ON_THE_WAY', hasDate: true }],
  // A live test, 18 Oct 2026 (names and numbers changed): iPhone Mail quotes
  // every line "> ", a bare ">" follows the mark, the shop's subject says
  // "marked as dispatched", and the Royal Mail number is only in the shop's
  // tracking link. It had come back from the household, Ordered, "Receipt".
  ['iPhone forward, quoted: a shop posting by Royal Mail', 'iphone-quoted-royalmail-via-shop.eml',
    { carrier: 'Parts Shop', stage: 'ON_THE_WAY', hasDate: true, reference: 'AB123456789GB', trackUrl: true }],
]
for (const [name, file, want] of FORWARDS) {
  const raw = readFileSync(new URL(file, FIXTURES), 'utf8')
  const read = readRawEmail(raw)
  const got = read && readArrivalEmail({ ...read, receivedAt: NOW })
  if (!got) { bad(name, 'expected an arrival, got nothing', read); continue }
  const problems = []
  if (got.carrier !== want.carrier) problems.push(`sender ${got.carrier} != ${want.carrier}`)
  if (/^me$/i.test(got.carrier)) problems.push('read the household as the sender')
  if (got.stage !== want.stage) problems.push(`stage ${got.stage} != ${want.stage}`)
  if (/^\s*(fwd?|fw)\s*:/i.test(got.title)) problems.push(`title still says Fwd: "${got.title}"`)
  if (want.titleIs && got.title !== want.titleIs) problems.push(`title "${got.title}" != "${want.titleIs}"`)
  if (/^\s*(dispatched|delivered|shipped|confirmation of)\b/i.test(got.title)) problems.push(`title still opens with its stage: "${got.title}"`)
  if (want.reference && got.reference !== want.reference) problems.push(`reference ${got.reference} != ${want.reference}`)
  if (want.hasDate && !got.expectedFor) problems.push('expected a stated date')
  if (want.hasWindow && !got.window) problems.push('expected a stated window')
  if (problems.length) bad(name, problems.join('; '), got)
  else { pass++; console.log(`  ok    ${name} -> ${got.carrier} / ${got.stage} / "${got.title}"`) }
}

// One order, one row. A shop's three emails all carry its order number, and
// the card matches rows on sender and reference, so the order confirmation,
// the dispatch and the delivery move ONE row forwards rather than adding
// three. (The shop's email names the courier's tracking number as well; the
// shop's own number is the one all three share.) Asserted above per fixture:
// every Samsung case expects reference UK260018734512.

// The traps on their own, without the forward round them.
const TRAPS = [
  ['"should be delivered to your address" is not arrived',
    { from: 'shop@example.com', subject: 'Order update', text: 'Your order has been dispatched and should be delivered to your address on Monday.' }, 'ON_THE_WAY'],
  ['"we will email you when it has been dispatched" is an order, not a dispatch',
    { from: 'shop@example.com', subject: 'Thanks for your order', text: 'We will email you when it has been dispatched.' }, 'ORDERED'],
  ['"it may be left in your safe place" is not arrived',
    { from: 'shop@example.com', subject: 'Dispatched: your order', text: 'If you are out it may be left in your safe place.' }, 'ON_THE_WAY'],
  ['"left with your neighbour" is arrived',
    { from: 'noreply@evri.com', subject: 'Your parcel update', text: 'We left your parcel with your neighbour at number 6.' }, 'DONE'],
]
for (const [name, email, wantStage] of TRAPS) {
  const got = readArrivalEmail({ ...email, receivedAt: NOW })
  if (got?.stage === wantStage) { pass++; console.log(`  ok    ${name}`) }
  else bad(name, `stage ${got?.stage} != ${wantStage}`, got)
}

// An order for something nobody carries to a door stays off the card.
const eticket = readArrivalEmail({ from: 'tickets@venue.example', subject: 'Confirmation of your order', text: 'Thank you for your order. Your e-tickets are attached.' }, NOW)
if (eticket === null) { pass++; console.log('  ok    an e-ticket order is not an arrival') }
else bad('an e-ticket order', 'filed something', eticket)

// Unwrapping leaves an email that is not a forward alone.
const plain = unwrapForward({ from: 'DPD <noreply@dpd.co.uk>', subject: 'Out for delivery', text: 'Your parcel is out for delivery today.' })
if (!plain.forwarded && plain.from === 'DPD <noreply@dpd.co.uk>') { pass++; console.log('  ok    an email that is not a forward is read as it is') }
else bad('not a forward', 'was changed', plain)

console.log(`\n${fail ? 'FAILED' : 'PASSED'} — ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
