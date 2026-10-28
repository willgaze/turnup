// TurnUp — the five states a job can be in, in the customer's words.
//
// Wording rule: these describe what is happening now, never what will happen
// by a certain time. They also name nobody — this product is fitted by more
// than one trade, and the tradesperson's name comes from NEXT_PUBLIC_TRADE_NAME
// at the top of the page, never from copy baked into a shared constant. "On my way" is a fact. "With you in 20 minutes" is a
// promise one plumber cannot keep, and the site does not make it anywhere.
//
// `short` is the same stage in fewer characters, for the five-across control
// on the trade's own screen: at phone width the full labels wrapped to three
// lines each and the row stopped reading as one control. The customer is never
// shown `short` — they get the whole thing, because they have the room.
//
// `tone` does two jobs and is the only name a stage carries for either: it
// picks the colour (--stage-<tone> in globals.css) and the drawing (StageIcon
// in src/components/icons.jsx). It used to carry an emoji as well, which
// rendered in whatever style the customer's phone shipped and made a finished
// page look like a placeholder. This file is imported by the API routes, so it
// holds no JSX and no CSS — only the name.

// Relative, not '@/lib/window'. This file is loaded by plain node in
// scripts/check-public-shape.mjs, which has no bundler to resolve the '@'
// alias — and that check running without a build step is the point of it.
import { publicWindow } from './window.js'
import { noteAfterStage } from './late-note.js'

export const STAGES = {
  BOOKED: {
    key: 'BOOKED',
    label: 'Booked in',
    short: 'Booked',
    tone: 'booked',
    customerLine: 'Your job is in the diary.',
    step: 1,
  },
  ON_MY_WAY: {
    key: 'ON_MY_WAY',
    label: 'On my way',
    short: 'On way',
    tone: 'onway',
    customerLine: 'They have set off and are heading to you.',
    step: 2,
  },
  ON_SITE: {
    key: 'ON_SITE',
    label: 'On site',
    short: 'On site',
    tone: 'onsite',
    customerLine: 'They are with you and work is under way.',
    step: 3,
  },
  PAUSED: {
    key: 'PAUSED',
    label: 'Paused',
    short: 'Paused',
    tone: 'paused',
    customerLine: 'Work is on hold — the note below says why.',
    step: 3,
  },
  DONE: {
    key: 'DONE',
    label: 'Job done',
    short: 'Done',
    tone: 'done',
    customerLine: 'Work is finished and the site is tidy.',
    step: 4,
  },
}

// The four the customer sees as a progress line. PAUSED sits off to one side:
// it is a state, not a step, and showing it as a fifth dot would suggest every
// job pauses.
export const STAGE_ORDER = ['BOOKED', 'ON_MY_WAY', 'ON_SITE', 'DONE']

export const isValidStage = (stage) => Object.prototype.hasOwnProperty.call(STAGES, stage)

export const stageOf = (stage) => STAGES[stage] || STAGES.BOOKED

// Codes go in a link a customer reads off a text message, so no characters
// that look like each other: no 0/O, no 1/I/L.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateCode(length = 8) {
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(length))
      : // eslint-disable-next-line global-require
        require('crypto').randomBytes(length)

  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  }
  return code
}

// What the public route is allowed to hand back. Everything else on the row —
// the job UUID, view counts, who looked and when — stays inside.
export function publicNoAccess(n) {
  if (!n) return null
  return {
    at: n.startedAt.toISOString(),
    leftAt: n.leftAt ? n.leftAt.toISOString() : null,
    attempts: (Array.isArray(n.attempts) ? n.attempts : []).map((a) => ({ kind: a.kind, at: a.at })),
    photoTaken: Boolean(n.photoAt),
    reply: n.reply || null,
    replyAt: n.replyAt ? n.replyAt.toISOString() : null,
    // The charge the note stated, if one was agreed before the day. Null is
    // "nothing is charged", and the page says so in those words.
    fee: n.fee ?? null,
  }
}

export function publicShape(row) {
  return {
    code: row.code,
    stage: isValidStage(row.stage) ? row.stage : 'BOOKED',
    // A late note left from before the van arrived is not shown once it has:
    // covers rows written before the stage change started clearing it.
    stageNote: (noteAfterStage(row.stageNote, row.stage) === null ? null : row.stageNote) || null,
    customerName: row.customerName || null,
    jobRef: row.jobRef || null,
    jobAddress: row.jobAddress || null,
    jobSummary: row.jobSummary || null,
    scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
    // The day first booked, kept once it moves, and when it last moved. The
    // trade's own arrangement, shown as changed rather than silently replaced.
    scheduledWas: row.scheduledWas ? row.scheduledWas.toISOString() : null,
    scheduledMovedAt: row.scheduledMovedAt ? row.scheduledMovedAt.toISOString() : null,
    arrivingAt: row.arrivingAt ? row.arrivingAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    // ---------------------------------------------------------------------
    // ONE RULE DECIDES WHAT GOES BELOW THIS LINE:
    //
    //   This payload carries what the TRADE told the CUSTOMER.
    //   It never carries what the CUSTOMER told the TRADE.
    //
    // The code in the URL is the only credential, and a tracking link gets
    // forwarded — to a partner, into a family group chat, onward from there.
    // Everything this function returns is readable by everyone that link
    // reaches, for as long as it is live.
    //
    // For a while it returned the customer's own answers too, and together
    // they stopped being a status page: the address, a photo of the house, a
    // photo of the front door, which door is used, "the gate sticks, park on
    // the verge", whether there is a dog, "No, I'm out", and "between 09:00
    // and 11:00". That is a door, a time and a way in, and it went to anyone
    // holding a forwarded link.
    //
    // So those fields are gone from here. The trade still sees every one of
    // them on the dashboard, which is behind a password. The customer's own
    // phone remembers what it sent, in src/app/t/own-answers.js, so their form
    // still prefills — on their device and nobody else's.
    //
    // Do not add a customer-supplied field back to this shape. If a page needs
    // one, it needs the device that supplied it.
    // ---------------------------------------------------------------------
    // Gated, not copied. publicWindow() hands back the hours only when the
    // TRADE is the one putting them forward — their own proposal, or one they
    // have agreed to. While the CUSTOMER's counter-offer is on the table the
    // page learns that it is waiting and not what was asked for, because
    // "I am free between 2 and 4" says when a house is occupied.
    window: publicWindow(row),
    // Order only, never the total: "second today" is reassuring, but how many
    // jobs the trade has on is their business, not the customer's.
    position: row.position ?? null,
    // The TIME an answer was given, never the answer. Lets the page say "you
    // answered 20 minutes ago" without saying whether anyone is home.
    presenceAt: row.presenceAt ? row.presenceAt.toISOString() : null,
    // The TRADE asked, the afternoon before. When, never what was answered.
    presenceAskedAt: row.presenceAskedAt ? row.presenceAskedAt.toISOString() : null,
    // "Are you still coming?" and the answer. Times and a number of minutes
    // the TRADE chose to say; nothing the customer typed.
    askedAt: row.askedAt ? row.askedAt.toISOString() : null,
    askAnsweredAt: row.askAnsweredAt ? row.askAnsweredAt.toISOString() : null,
    lateMinutes: row.lateMinutes ?? null,
    // Paused: when, and when the TRADE said they expect to be back — their
    // own choice of words and the time they said it. Never a worked-out time.
    pausedAt: row.pausedAt ? row.pausedAt.toISOString() : null,
    pauseBack: row.pauseBack || null,
    pauseBackAt: row.pauseBackAt ? row.pauseBackAt.toISOString() : null,
    lateAt: row.lateAt ? row.lateAt.toISOString() : null,
    // The window was missed and the customer was told; and what they chose.
    missedAt: row.missedAt ? row.missedAt.toISOString() : null,
    missedChoice: row.missedChoice || null,
    missedChoiceAt: row.missedChoiceAt ? row.missedChoiceAt.toISOString() : null,
    // After Job done: when they went to leave a review, and when they left a
    // note. The note itself goes to the trade and nowhere else.
    reviewClickedAt: row.reviewClickedAt ? row.reviewClickedAt.toISOString() : null,
    feedbackAt: row.feedbackAt ? row.feedbackAt.toISOString() : null,
    // The customer said they are running late: the TIME they said it. The
    // minutes stay with the trade and on the device that chose them.
    customerLateAt: row.customerLateAt ? row.customerLateAt.toISOString() : null,
    // The customer's one-tap reply to the day-before ask. It is their own
    // answer, but it says nothing a forwarded link could use: "still fine"
    // and "wants to move it" are not a door, a time or a way in. (OK and
    // SOMEONE_ELSE also set presence, which stays private as before: only
    // presenceAt and presenceAskedAt are public.)
    reminderReply: row.reminderReply || null,
    reminderReplyAt: row.reminderReplyAt ? row.reminderReplyAt.toISOString() : null,
    // The booking terms the customer agreed to, from their own phone: when,
    // and the two numbers the words are built from. The words themselves are
    // rebuilt from src/lib/terms.js, so the page shows what was agreed even
    // if the trade has changed the fee since. Nothing here is theirs to hide:
    // it is the trade's terms and a time.
    termsAgreedAt: row.termsAgreedAt ? row.termsAgreedAt.toISOString() : null,
    termsAgreed: row.termsAgreed && typeof row.termsAgreed === 'object'
      ? { noticeHours: row.termsAgreed.noticeHours ?? 24, fee: row.termsAgreed.fee ?? null, first: row.termsAgreed.first || null }
      : null,
    // Customer not home: the facts of the visit, never the location or the
    // photo. "Was at the door at 10:04, knocked and called, waited until 10:14."
    noAccess: publicNoAccess(row.noAccess?.[0]),
    // `at` is when the server heard it; `deviceAt` is when the trade tapped,
    // kept separately when the tap was queued with no signal. The place the
    // phone was is never here.
    events: (row.events || []).map((event) => ({
      stage: event.stage,
      note: event.note || null,
      at: event.createdAt.toISOString(),
      deviceAt: event.deviceAt ? event.deviceAt.toISOString() : null,
      offline: Boolean(event.offline),
    })),
  }
}
