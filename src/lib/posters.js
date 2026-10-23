/**
 * The frames: every sentence the homepage says, with the screen that proves it.
 *
 * Plain data in its own module because the homepage (a server component) and
 * /preview/posters (a client component) both read it, and a named export from
 * a 'use client' file arrives on the server as a reference, not an array.
 *
 * group    customer | trade | either | next | shipped (live, drawn, on no strip)
 * state    live   — a real capture of the real screen (public/home/*.webp)
 *          ready  — built, waiting on something outside the code (a certificate); none since 23 Oct 2026
 *          next   — not built; drawn as a mock and badged so nobody is misled
 * screen   a capture; or `mock` names a drawing in Posters.jsx; or `wallet`.
 *
 * Four stage tints only, never invented: indigo for on-the-way things, blue
 * for booked/agreed, green for presence/done, orange for finding the door and
 * for pauses. Navy is the pass. Slate is the trade's own screens.
 */
const INDIGO = ['#5856d6', '#26257a']
const BLUE   = ['#007aff', '#0a3a7a']
const GREEN  = ['#34c759', '#125a28']
const ORANGE = ['#ff9500', '#8a4b00']
const NAVY   = ['#1f3b57', '#0b1a28']
const SLATE  = ['#4b5b6e', '#1c232c']

const f = (key, group, state, [tint, deep], head, sub, rest = {}) => ({ key, group, state, tint, deep, head, sub, ...rest })

export const FRAMES = [
  // ---- the customer's side -------------------------------------------------
  f('c-text', 'customer', 'live', INDIGO,
    'It starts with\na text.', 'Nothing to install. Nobody to sign up. A link, from someone you already booked.',
    { mock: 'sms', alt: 'A text message from Sam Hale Plumbing with the job link in it' }),
  f('c-open', 'customer', 'live', INDIGO,
    'Open it once.\nLeave it open.', 'It changes on its own as the day goes. No refreshing, no ringing.',
    { screen: '/home/customer-on-my-way.webp', alt: 'The customer page: On my way, set off at 08:00, between 09:00 and 11:00' }),
  f('c-window', 'customer', 'live', BLUE,
    'A time you agreed,\nnot one you were told.', 'Say it suits, or say what does. Only an agreed window is ever written down as settled.',
    { screen: '/home/customer-window.webp', alt: 'The customer page with “When suits you?” open' }),
  f('c-presence', 'customer', 'live', GREEN,
    'Will someone be in?\nTwo taps.', 'Answered once, read by the one person who needs it. A wasted visit, saved.',
    { screen: '/home/customer-presence.webp', alt: 'The customer page with “Will someone be in?” open' }),
  f('c-door', 'customer', 'live', ORANGE,
    'Help them find\nthe door.', 'Which door, the dog, a what3words square, a pin dropped from your doorstep. Kept between you.',
    { screen: '/home/customer-find-you.webp', alt: 'The customer page with “Help them find you” open' }),
  f('c-who', 'customer', 'live', SLATE,
    'Know who\nis coming.', 'A name, a face if they have added one, and the van to look out for.',
    { screen: '/home/customer-who.webp', alt: 'The customer page with “Who to expect” open' }),
  f('c-notify', 'customer', 'live', INDIGO,
    'Buzz me when\nthey set off.', 'A nudge on your phone the moment they leave, and the window in your calendar in one tap.',
    { screen: '/home/customer-notify.webp', alt: 'The customer page with “Tell me when they set off” open' }),
  f('c-done', 'customer', 'live', GREEN,
    'Done, with\na record.', 'Every stage, the time it happened, and the note that went with it.',
    { screen: '/home/customer-history.webp', alt: 'The customer page after the job, with “What has happened” open' }),

  // ---- the trade's side -------------------------------------------------------
  f('t-login', 'trade', 'live', NAVY,
    'Face ID in.\nNo password to forget.', 'Your phone is the key. A password exists only to add the next device.',
    { screen: '/home/trade-login.webp', alt: 'The sign-in screen: Sign in with Face ID or Touch ID' }),
  f('t-new', 'trade', 'live', SLATE,
    'A job is\nfive fields.', 'Name, number, what, where, when. Thirty seconds, and their link exists.',
    { screen: '/home/trade-new-job.webp', alt: 'The new job form' }),
  f('t-send', 'trade', 'live', INDIGO,
    'Send it\nin one tap.', 'Text or WhatsApp, already written. Copy it if you would rather.',
    { screen: '/home/trade-job-open.webp', alt: 'A job card opened: Text, WhatsApp, Copy link, Open it' }),
  f('t-stage', 'trade', 'live', BLUE,
    'Then just tap\nthe stage.', 'Booked · On my way · On site · Paused · Done. One-handed, next to the van.',
    { screen: '/home/dashboard.webp', alt: 'A job card with the five stage buttons and Navigate' }),
  f('t-pause', 'trade', 'live', ORANGE,
    'Running late?\nSay so once.', 'Pause with a reason and everyone waiting on you reads it. Nothing invented on your behalf.',
    { screen: '/home/customer-paused.webp', alt: 'The customer page when the job is paused, with the reason' }),
  f('t-van', 'trade', 'live', SLATE,
    'Your van,\nfrom the plate.', 'Type the registration and make, model and colour fill themselves in. Your logo on their page.',
    { screen: '/home/trade-profile.webp', alt: 'The profile: registration lookup, make, model, colour, logo' }),
  f('t-run', 'trade', 'live', NAVY,
    'Your day,\nin order.', 'What you are on, what is next, what is finished. Nothing else on the screen.',
    { screen: '/home/trade-run.webp', alt: 'The dashboard: the day’s jobs in order' }),
  f('t-wallet', 'trade', 'live', INDIGO,
    'In their\nwallet.', 'The same job as a card in Apple Wallet, since 23 October 2026. Built to move with the job; the first one seen moving is the proof to come.',
    { wallet: true, alt: 'The job as a wallet card, lifted out of a stack of other cards' }),

  // ---- either end ---------------------------------------------------------------
  f('e-swap', 'either', 'next', BLUE,
    'Either end.\nAny job.', 'Today you send the link. Tomorrow you are the one waiting in — for a delivery, a mate, the engineer. Same page, other chair.',
    { mock: 'swap', alt: 'A switch between “I am on my way” and “I am waiting in”' }),
  f('e-house', 'either', 'next', GREEN,
    'One address,\nwhoever is home.', 'Two or three people who can open the door. The house answers, not one phone.',
    { mock: 'household', alt: 'A household with three people who can answer the door' }),

  // ---- where it is going -----------------------------------------------------------
  // Live since 9 Oct (ServiceM8 connected), so it is no longer a promise and
  // leaves the "Where it is going" strip. It stays a drawing, not a capture,
  // so it does not join the live frames either; the roadmap still pictures it.
  f('n-sm8', 'shipped', 'live', NAVY,
    'The card moves\nitself.', 'Check in on ServiceM8 and the customer sees On site. Nobody taps anything.',
    { mock: 'sm8', alt: 'ServiceM8 check-in becoming On site automatically' }),
  f('n-live', 'next', 'next', INDIGO,
    'A dot on a map,\nwhile you drive.', 'Only while you are on your way, only to that customer, gone the moment you arrive.',
    { mock: 'live', alt: 'A map with the van on its way' }),
  f('n-android', 'next', 'next', GREEN,
    'The same card\non Android.', 'Google Wallet, once Apple’s is signed.',
    { mock: 'android', alt: 'The card in Google Wallet' }),
  f('n-stages', 'next', 'next', BLUE,
    'Speaks your\nindustry’s stages.', 'RIBA 0–7. Building control inspections. PAS 2035 retrofit. Conveyancing A–F. Pick the template; the card speaks the language.',
    { mock: 'stages', alt: 'A job tracked in RIBA Plan of Work stages' }),
  f('n-photos', 'next', 'next', ORANGE,
    'Finished,\nphotographed,\nreviewed.', 'Photos of the work when it is done, and the review asked for at the right moment.',
    { mock: 'photos', alt: 'Job-done photos and a review request' }),
  f('n-carplay', 'next', 'next', NAVY,
    'From the dash,\nnot the phone.', 'Navigate to the address, then On my way, On site, Paused, Done — on CarPlay, in the van. Or say it to Siri.',
    { car: { vehicle: 'van', ui: 'carplay' }, alt: 'Seen from the driver\'s seat of a van: CarPlay on the head unit with Navigate and the four stage buttons, a country lane through the windscreen' }),
  f('n-androidauto', 'next', 'next', GREEN,
    'Same in the car,\non Android Auto.', 'The map underneath, Navigate on top, the four buttons beside it. Whatever van, whatever phone.',
    { car: { vehicle: 'car', ui: 'android' }, alt: 'Seen from the driver\'s seat of a car: Android Auto on the dash screen with the map, Navigate and the four stage buttons, a town street ahead' }),
  f('n-record', 'next', 'next', NAVY,
    'A record of\nyour home.', 'Everything done to the house, by whom, when, with the certificate and the photos. Kept with the address, not lost in an inbox.',
    { mock: 'record', alt: 'A house record: the work done, by whom, when, with certificates' }),
  f('n-manage', 'next', 'next', GREEN,
    'Quote. Book.\nDo. Invoice.', 'The link grows into the job itself: the quote they accepted, the day, the bill, the next service due. One place, for a one-van firm.',
    { mock: 'manage', alt: 'A job from quote to invoice in one place' }),
  f('n-pay', 'next', 'next', NAVY,
    'Done.\nPaid.\nReceipt kept.', 'The bill on the same page as the job, settled with Apple Pay or a card the moment it says Job done. A deposit at booking if you take one. The receipt stays with the job.',
    { mock: 'pay', alt: 'The customer page after Job done: the bill, an Apple Pay button, and the receipt kept with the job' }),
  f('n-pickup', 'next', 'next', SLATE,
    'Pickup here.\nDrop-off there.', 'Removals, returns, a courier. Two ends, each with its own “will someone be in?”',
    { mock: 'pickup', alt: 'A journey with a pickup and a drop-off' }),
]

export const byGroup = (g) => FRAMES.filter((x) => x.group === g)
export const frameSrc = (x) => `/home/frame-${x.key}.webp`
