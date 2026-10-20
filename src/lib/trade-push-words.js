/**
 * Everything a notification to the TRADE's phone may say.
 *
 * `LINES` in src/lib/push.js is this for the customer's phone, and the rule
 * written above it was only ever applied to that side: a notification carries
 * the stage and nothing else, never the address, never the job reference,
 * never the customer's name, never free text. The trade's own phone was
 * quietly exempt, so ten notifications named the customer —
 * "Sarah's window has started", "Sarah left a note after the job" — and one
 * of them put the customer's private note itself in the body, which is the
 * same thing as `stageNote` and is banned for the same reason.
 *
 * A trade's phone sits on a kitchen table too. The people who pick it up are
 * their family, not the customer who holds the link, and a plumber's lock
 * screen is not the place their customers' names live.
 *
 * So: **no argument here is ever taken from the customer.** Times are the
 * trade's own window, minutes are a figure one of them typed from a fixed
 * list, and the rest is fixed words. The leak is not avoided by remembering
 * to avoid it; it is impossible, because there is nowhere to put it.
 *
 * The cost, stated plainly: a trade with four jobs on cannot tell from the
 * lock screen which one it is about. They tap, and the dashboard says. That
 * is the trade the owner chose on 19 Oct 2026, knowing it.
 *
 * `node scripts/check-trade-push.mjs` proves both halves: that nothing here
 * leaks, and that no call site anywhere has gone back to building its own.
 */

/** The vocabulary. Adding one is a privacy decision, not a copy one. */
export const TRADE_LINES = {
  /* The window, and the trade's own silence --------------------------- */

  windowStarted: (from) => ({
    title: 'A window has started',
    body: `From ${from}, and the card still says Booked in. Set off, or say you are running late.`,
  }),

  windowEnded: (to) => ({
    title: 'A window has ended',
    body: `It ran to ${to} and the card is not On site. Tell them where you are.`,
  }),

  windowMissed: (to) => ({
    title: 'The window was missed, and the customer has been told',
    body: `It ended at ${to}. They can choose to wait, have it later today, or rebook. Set off, say how late, or give them a new window.`,
  }),

  /* An unanswered question -------------------------------------------- */

  asking: () => ({
    title: 'A customer is asking',
    body: '"Are you still coming?" Reply from the card: On my way, or how late.',
  }),

  askWaiting: () => ({
    title: 'A customer is asking',
    body: '"Are you still coming?" — asked earlier, no answer yet. Open the card to reply, or to stop the reminders.',
  }),

  askOvernight: () => ({
    title: 'A customer is asking',
    body: '"Are you still coming?" has been waiting since yesterday and is still unanswered. Open the card to reply, or to stop the reminders.',
  }),

  /* The day before ----------------------------------------------------- */

  bookedTomorrow: (emailed) => ({
    title: 'A job is booked tomorrow',
    body: emailed
      ? 'No notifications on their phone, so the ask went by email. Text them the link if you want to be sure.'
      : 'They cannot be reached by notification. Text them the link so they can say whether anyone will be in.',
  }),

  /* What the customer chose. The CHOICE is fixed words from a button, so
     it is safe; who chose it is not, so it is not here. ----------------- */

  afterMissed: (said, next) => ({
    title: `After the missed window: the customer ${said}`,
    body: next,
  }),

  reminderReply: (said, next) => ({
    title: `The customer ${said}`,
    body: next,
  }),

  afterNoAccess: (said, next) => ({
    title: `After no access: the customer ${said}`,
    body: next,
  }),

  /* After the job ------------------------------------------------------ */

  reviewTapped: () => ({
    title: 'A customer went to leave a review',
    body: 'Opened your Google review link from their page.',
  }),

  /**
   * The note itself never goes on the lock screen. It is free text a customer
   * typed, it can say anything, and "left a note" is all the trade needs to
   * know to go and read it — which is the whole shape of this product: the
   * notification says a thing happened, the link holds what it was.
   */
  feedbackLeft: () => ({
    title: 'A customer left a note after the job',
    body: 'It is on their card and on your dashboard. Nobody else can read it.',
  }),

  /* The customer is the late one ---------------------------------------- */

  customerLate: (minutes, said, from) => ({
    title: minutes ? 'A customer says they are running late' : 'A customer says they are there now',
    body: minutes ? `Said at ${said}. Expect them from about ${from}.` : `Said at ${said}.`,
  }),
}

/**
 * Anything a notification must never carry, for the check script and for
 * anyone reading this file to see the rule without going and finding it.
 */
export const NEVER_ON_A_LOCK_SCREEN = [
  'the customer\'s name',
  'the address',
  'the job reference',
  'free text: a stage note, a customer note, a door note',
  'a time the product worked out rather than one a person gave',
]
