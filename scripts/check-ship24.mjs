/**
 * Tracking by number, checked without a database or a Ship24 account.
 *
 *   node scripts/check-ship24.mjs
 *
 * The payload is Ship24's own example from its OpenAPI file, cut to what the
 * card reads. A webhook moves a row forwards by the courier's scan and never
 * backwards; the card copies the courier's words and none of its estimates.
 */
import { readWebhook, stageForMilestone, nextStage, noteFor, webhookTokenFrom, webhookAuthorised, courierNameFor } from '../src/lib/ship24-words.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

const example = { trackings: [{
  metadata: { generatedAt: '2025-03-04T17:13:35.000Z', messageId: '356a7f93-3ce5-4b49-b560-156537283df9', topic: 'tracking/events' },
  tracker: { trackerId: '26148317-7502-d3ac-44a9-546d240ac0dd', trackingNumber: '9400115901047177598206', clientTrackerId: 'arr_abc123', isSubscribed: true },
  shipment: { statusCode: 'delivery_delivered', statusCategory: 'delivery', statusMilestone: 'delivered',
    delivery: { estimatedDeliveryDate: '2025-03-04T18:00:00', courierEstimatedDeliveryDate: { from: '2025-03-04T17:00:00', to: '2025-03-04T18:00:00' } },
    trackingNumbers: [{ tn: '9400115901047177598206' }, { tn: '9400111202544843610364' }] },
  events: [
    { eventId: 'e1', status: 'Out for delivery', occurrenceDatetime: '2025-03-04T10:12:57', datetime: '2025-03-04T10:12:57.000Z', statusMilestone: 'out_for_delivery', courierCode: 'us-post' },
    { eventId: 'e2', status: 'Delivered to the addressee', occurrenceDatetime: '2025-03-04T17:12:57', datetime: '2025-03-04T17:12:57.000Z', location: 'SAN RAFAEL, CA 94901', statusMilestone: 'delivered', courierCode: 'us-post' },
  ],
}] }

const [e] = readWebhook(example)
check(readWebhook(example).length === 1, 'one tracking in the example, one entry out')
check(e.trackerId === '26148317-7502-d3ac-44a9-546d240ac0dd' && e.clientTrackerId === 'arr_abc123', 'tracker id and our row id both read')
check(e.trackingNumbers.length === 2 && e.trackingNumbers.includes('9400111202544843610364'), 'every number the courier knows it by')
check(e.milestone === 'delivered' && e.stage === 'DONE', 'delivered is Arrived')
check(e.status === 'Delivered to the addressee' && e.location === 'SAN RAFAEL, CA 94901', 'the latest scan is the newest event, not the first listed')
check(noteFor(e, 'Royal Mail') === 'Royal Mail says: Delivered to the addressee (SAN RAFAEL, CA 94901).', 'the note is the courier\'s words, attributed')
check(!JSON.stringify(e).includes('2025-03-04T18:00:00'), 'the courier\'s estimated delivery date is not copied onto the card')

// Every milestone Ship24 documents, to a stage or to nothing.
check(stageForMilestone('in_transit') === 'ON_THE_WAY' && stageForMilestone('out_for_delivery') === 'OUT_FOR_DELIVERY', 'in transit and out for delivery')
check(stageForMilestone('failed_attempt') === 'MISSED' && stageForMilestone('available_for_pickup') === 'MISSED', 'a failed attempt or a pickup point is Missed')
check(stageForMilestone('pending') === null && stageForMilestone('info_received') === null && stageForMilestone('exception') === null, 'pending, label made and exception change nothing')
check(stageForMilestone('made_up') === null && stageForMilestone(undefined) === null, 'an unknown milestone changes nothing')

// Forwards only, Missed the exception.
check(nextStage('OUT_FOR_DELIVERY', 'ON_THE_WAY') === 'OUT_FOR_DELIVERY', 'a late in-transit scan cannot move a row back from out for delivery')
check(nextStage('DONE', 'OUT_FOR_DELIVERY') === 'DONE', 'nothing moves a delivered row back')
check(nextStage('OUT_FOR_DELIVERY', 'MISSED') === 'MISSED' && nextStage('MISSED', 'ON_THE_WAY') === 'ON_THE_WAY', 'Missed can follow anything, and anything can follow Missed')
check(nextStage('ON_THE_WAY', null) === 'ON_THE_WAY', 'no stage in the webhook: the row stays put')

// Tolerates the optional fields being absent, as Ship24 asks.
const bare = readWebhook({ trackings: [{ tracker: { trackerId: 't1' }, shipment: { statusMilestone: 'in_transit' } }] })
check(bare.length === 1 && bare[0].stage === 'ON_THE_WAY' && bare[0].status === null && bare[0].trackingNumbers.length === 0, 'a payload with no events and no numbers still reads')
check(readWebhook(null).length === 0 && readWebhook({}).length === 0 && readWebhook({ trackings: 'x' }).length === 0, 'rubbish reads as nothing, never throws')

// The courier Ship24 is told about: the tracking link's host before the sender.
check(courierNameFor({ carrier: 'Harbour Home', trackUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/AB123456789GB' }) === 'Royal Mail', 'a shop posting by Royal Mail: Royal Mail is the courier')
check(courierNameFor({ carrier: 'DPD', trackUrl: 'https://track.dpd.co.uk/search?reference=1' }) === 'DPD' && courierNameFor({ carrier: 'Evri' }) === 'Evri', 'a courier emailing about its own parcel: itself')
check(courierNameFor({ carrier: 'Some Shop', trackUrl: 'https://shop.example/track/1' }) === 'Some Shop' && courierNameFor({}) === null, 'an unknown link falls back to the sender; nothing is nothing')

// The locks.
const tok = webhookTokenFrom({ JWT_SECRET: 'local-only-not-a-real-secret' })
check(/^[0-9a-f]{40}$/.test(tok) && tok === webhookTokenFrom({ JWT_SECRET: 'local-only-not-a-real-secret' }), 'the URL token is derived from JWT_SECRET and stable')
check(webhookTokenFrom({ JWT_SECRET: 'local-only-not-a-real-secret', SHIP24_WEBHOOK_TOKEN: 'chosen' }) === 'chosen' && webhookTokenFrom({}) === null, 'SHIP24_WEBHOOK_TOKEN overrides; no secret, no token')
check(webhookAuthorised('Bearer s3cret', 's3cret') && !webhookAuthorised('Bearer wrong', 's3cret') && !webhookAuthorised(null, 's3cret'), 'the bearer secret is checked when set')
check(webhookAuthorised(null, undefined), 'no bearer secret configured: the URL token is the lock')

console.log(`\n${failed === 0 ? 'Tracking by number holds.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)
