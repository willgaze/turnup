/**
 * Turning a forwarded email into something coming to a door.
 *
 * THE WHOLE STRATEGY IS IN THIS FILE. Getting delivery companies to integrate
 * is a cold start nobody wins: every one of them has to say yes before a
 * customer sees anything. But they are all already sending the customer an
 * email. So the customer forwards those emails to an address of their own, and
 * the card fills itself. Nobody has to sign up but the person who benefits.
 *
 * WHERE THIS DIFFERS FROM SHOP. Shopify's Shop app does the same trick and
 * says so in its own help pages: forwarding "only works for English emails
 * with a tracking number", and orders it cannot read are simply not tracked.
 * That is the gap. A plumber has no tracking number. A sofa with two men and a
 * Tuesday morning window has no tracking number. A boiler service has no
 * tracking number. **This parses arrivals, not parcels** — if something is
 * coming to the door, it belongs on the card, tracking number or not.
 *
 * THE NO-INVENTED-TIME RULE HOLDS HERE TOO, and it is worth being exact about
 * why this is allowed. The product may never work out when something will
 * arrive. But a carrier writing "expected Tuesday" in an email is the carrier
 * asserting it, the same way a trade proposing a window is the trade asserting
 * it. So a date is carried only when the email states one, it is always
 * attributed to whoever said it, and nothing here ever interpolates, averages
 * or guesses. An email with no date produces an arrival with no date.
 */

import { cleanText } from './clean-text.js'

/** Stages an arrival moves through. Deliberately the shape of a parcel's life
 *  and a trade's day at once, because the card shows both in one list. */
export const ARRIVAL_STAGES = ['ORDERED', 'BOOKED', 'ON_THE_WAY', 'OUT_FOR_DELIVERY', 'MISSED', 'DONE']

/**
 * Carriers, by the domain the mail actually comes from.
 *
 * Matched on the SENDING DOMAIN rather than on words in the body, because a
 * subject line can say "Royal Mail" in a phishing email and a domain is harder
 * to fake past SPF. `track` builds the carrier's own tracking URL from the
 * reference, so the card can hand the customer straight to the horse's mouth
 * rather than re-stating what it scraped.
 */
const CARRIERS = [
  { id: 'royalmail', name: 'Royal Mail', domains: [/(^|\.)royalmail\.com$/i],
    ref: [/\b([A-Z]{2}\d{9}GB)\b/], track: (r) => `https://www.royalmail.com/track-your-item#/tracking-results/${r}` },
  { id: 'parcelforce', name: 'Parcelforce', domains: [/(^|\.)parcelforce\.(com|net)$/i],
    ref: [/\b([A-Z]{2}\d{7,10})\b/], track: (r) => `https://www.parcelforce.com/track-trace?trackNumber=${r}` },
  { id: 'evri', name: 'Evri', domains: [/(^|\.)evri\.com$/i, /(^|\.)hermes(-europe)?\.co\.uk$/i],
    ref: [/\b(H[0-9A-Z]{15,19})\b/, /\b(\d{16})\b/], track: (r) => `https://www.evri.com/track/parcel/${r}` },
  { id: 'dpd', name: 'DPD', domains: [/(^|\.)dpd\.co\.uk$/i, /(^|\.)dpdgroup\.co\.uk$/i],
    ref: [/\b(\d{14})\b/], track: (r) => `https://track.dpd.co.uk/search?reference=${r}` },
  // Yodel merged into InPost on 17 July 2026; a yodel.co.uk tracking link now
  // 302s to this InPost address (checked 14 Oct 2026). The email may still come
  // from either domain, so both are matched and both land on the same page.
  { id: 'inpost', name: 'InPost', domains: [/(^|\.)inpost\.co\.uk$/i],
    ref: [/\b(JJD\d{15,18})\b/, /\b([A-Z0-9]{10,16})\b/], track: (r) => `https://inpost.co.uk/tracking/result?parcel_code=${r}` },
  { id: 'yodel', name: 'Yodel', domains: [/(^|\.)yodel\.co\.uk$/i],
    ref: [/\b(JJD\d{15,18})\b/, /\b([A-Z0-9]{10,16})\b/], track: (r) => `https://inpost.co.uk/tracking/result?parcel_code=${r}` },
  { id: 'dhl', name: 'DHL', domains: [/(^|\.)dhl\.(com|co\.uk|de)$/i],
    ref: [/\b(\d{10,12})\b/], track: (r) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${r}` },
  { id: 'ups', name: 'UPS', domains: [/(^|\.)ups\.com$/i],
    ref: [/\b(1Z[0-9A-Z]{16})\b/], track: (r) => `https://www.ups.com/track?tracknum=${r}` },
  { id: 'fedex', name: 'FedEx', domains: [/(^|\.)fedex\.com$/i],
    ref: [/\b(\d{12,15})\b/], track: (r) => `https://www.fedex.com/fedextrack/?trknbr=${r}` },
  { id: 'amazon', name: 'Amazon', domains: [/(^|\.)amazon\.(co\.uk|com)$/i],
    ref: [/\b(\d{3}-\d{7}-\d{7})\b/], track: () => 'https://www.amazon.co.uk/gp/css/order-history' },
  { id: 'dxdelivery', name: 'DX', domains: [/(^|\.)dxdelivery\.com$/i], ref: [/\b(\d{10,14})\b/] },
  { id: 'tuffnells', name: 'Tuffnells', domains: [/(^|\.)tuffnells\.co\.uk$/i], ref: [/\b(\d{8,12})\b/] },
  { id: 'arrowxl', name: 'ArrowXL', domains: [/(^|\.)arrowxl\.co\.uk$/i], ref: [/\b([A-Z0-9]{8,14})\b/] },
  { id: 'panther', name: 'Panther Logistics', domains: [/(^|\.)pantherlogistics\.co\.uk$/i], ref: [/\b(\d{6,12})\b/] },
]

/**
 * What the email is telling you, in the order a parcel's life happens.
 *
 * Ordered last-to-first on purpose: an email that says both "your order has
 * shipped" and "out for delivery today" is describing the later state, and the
 * later state is the one worth showing. Phrases are the ones UK carriers
 * actually write, not a tidy taxonomy.
 */
const STAGE_PHRASES = [
  // "delivered" ALONE IS A TRAP. "Your parcel will be delivered between 1pm
  // and 2pm" is a parcel that has not arrived, and reading it as arrived is
  // the worst mistake this file can make — it drops a thing off the card at
  // the moment the customer most wants it there. Every pattern here is
  // explicitly past tense, and the future-tense guard below is belt and braces.
  //
  // "delivered to" ALONE IS THE SAME TRAP (18 Oct 2026). A Samsung "Dispatched"
  // email said its order "should be delivered to your address", and a bare
  // /delivered to/ filed it as arrived while the parcel was still at a depot.
  // DONE is now only what a carrier writes AFTER the event: it has been
  // delivered, it was left with someone, it is in your safe place.
  ['DONE', [/^\s*delivered\b/i, /\b(has|have) been delivered\b/i, /\b(was|were) delivered\b/i,
    /\bwe('ve| have)? delivered\b/i,
    /\bdelivered to (your |a |the )?(safe place|neighbou?r|porch|front door|door|reception|locker|parcel locker|letterbox|mailbox|chosen)/i,
    /\b(left|handed) (it |them |your (parcel|order|item|package)s? )?with\b/i,
    /\b(left|placed|put) (it |them |your (parcel|order|item|package)s? )?in your safe ?place\b/i,
    /\bin your safe ?place\b.{0,40}\b(at|on)\b/i,
    /\bdelivery (is |was )?complete(d)?\b/i, /\byour (parcel|order|item|package)s? (is here|has arrived|arrived)\b/i]],

  ['MISSED', [/\bsorry we missed you\b/i, /\bwe missed you\b/i, /\bunable to deliver\b/i,
    /\bdelivery attempt(ed)? (was )?unsuccessful\b/i, /\bnobody (was )?(in|home)\b/i,
    /\bcard (was )?left\b/i, /\bno one was (in|home)\b/i]],

  ['OUT_FOR_DELIVERY', [/\bout for delivery\b/i, /\bon (its|it's|the) way to you today\b/i,
    /\bwith (your|the) (driver|courier)\b/i, /\barriving today\b/i,
    /\b(is|are|being) (being )?delivered today\b/i, /\bwill be delivered .{0,30}today\b/i]],

  ['ON_THE_WAY', [/^\s*(dispatched|despatched|shipped)\b/i, /\b(has|have) (been )?(dispatched|despatched|shipped)\b/i,
    /\b(order|parcel|item|package)s? (is |are |was |were )?(now )?(dispatched|despatched|shipped)\b/i, /\bon its way\b/i,
    // "has been marked as dispatched" (Di Vapor, and many small shop systems).
    /\bmarked as (dispatched|despatched|shipped)\b/i, /^\s*(dispatch|despatch|shipping) confirmation\b/i,
    /\byour (parcel|order) is on the way\b/i, /\bleft (our|the) (warehouse|depot)\b/i,
    /\bin transit\b/i, /\bwe('| ha)ve got your (parcel|item)\b/i]],

  // THE CASE SHOP DROPS. A sofa, a fridge, a boiler service: a real date, two
  // people turning up, and no tracking number anywhere. Shop's own help page
  // says forwarding "only works for English emails with a tracking number".
  // These phrases are how those senders actually write, and catching them is
  // most of why this product is not just a worse Shop.
  ['BOOKED', [/\bwill (be )?deliver(ed|ing|y)?\b/i, /\bdelivery (is |has been )?(booked|confirmed|scheduled|arranged)\b/i,
    /\byour (delivery|installation|appointment|visit|engineer|service) (date|slot|is|will)\b/i,
    /\bbooked (you )?in for\b/i, /\bwe('| wi)ll be with you\b/i, /\bscheduled for\b/i,
    /\b(is |are )?(due|arriving|coming) on\b/i, /\bappointment (is )?confirmed\b/i,
    // A person coming to DO something writes differently again. Nobody books a
    // parcel; they book a visit, and they say "will attend" or "will call" or
    // name the trade who is coming. Without these a boiler service and a
    // window survey were both read as not-an-arrival and silently dropped.
    /\b(engineer|technician|surveyor|fitter|installer|electrician|plumber)\b.{0,40}\b(will|is|are|to)\b/i,
    /\bwill (attend|call (round|out)|come (out|round)|be (attending|visiting|calling))\b/i,
    /\b(visit|appointment|survey|service|installation|fitting)\b.{0,30}\b(on|booked|confirmed|arranged|scheduled)\b/i]],

  // ORDERED IS FILED, NOT DROPPED (18 Oct 2026). "Confirmation of your order"
  // was read as not_an_arrival, but an order is the first thing a household
  // knows about something that is coming, and the card ranks ORDERED below
  // every later stage, so the dispatch email simply moves the same row on.
  // Only digital orders are dropped: see DIGITAL_ONLY below.
  ['ORDERED', [/\border (confirmation|confirmed|received|placed)\b/i, /\bconfirmation of your order\b/i,
    /\byour order (has been |is )?(confirmed|placed|received)\b/i,
    /\bthank(s| you) for (your|placing your) order\b/i, /\bthank(s| you) for shopping with\b/i,
    /\bthanks? for your order\b/i,
    /\bwe('| ha)ve received your order\b/i, /\byour order( is)? (is )?being (prepared|picked|processed)\b/i]],
]

// Said anywhere near "delivered", these mean it has not happened yet.
const FUTURE_TENSE = /\b(will be|to be|due to be|being|scheduled to be|expected to be|should be|could be|may be|might be|can be|would be)\s+(deliver|left)/i

// "We'll email you when it has been dispatched" is an order, not a dispatch.
const NOT_YET_DISPATCHED = /\b(when|once|as soon as|after)\s+(it|they|your \w+)\s+(has|have|is|are)\s+(been\s+)?(dispatched|despatched|shipped)/i

/**
 * An order for something nobody carries to a door. A forwarding rule is set
 * by the household and catches whatever it catches; an e-ticket or a gift card
 * on the card would be a row for a thing that never arrives.
 */
const DIGITAL_ONLY = /\b(e-?tickets?|digital (code|download|delivery|product|gift)|download (link|now|your)|gift ?card|e-?gift|e-?voucher|subscription|licen[cs]e key|e-?book|activation code|redeem (your )?code)\b/i
const PHYSICAL = /\b(dispatch|despatch|ship|deliver|courier|parcel|tracking|postage|delivery address|collect(ion)? from store|click (&|and) collect)/i

/**
 * Unwrap a forward, so the parser reads the email the sender wrote rather
 * than the one the household's mail client wrapped round it.
 *
 * EVERY CARD EMAIL IS A FORWARD, which is the whole design, and until 18 Oct
 * 2026 nothing unwrapped them: a live test on a household card showed "Me" as
 * the sender and "Fwd: Dispatched: ..." as the title. The outer email is the
 * household writing to its own card; the facts are all inside.
 *
 * Gmail ("---------- Forwarded message ---------"), Apple Mail ("Begin
 * forwarded message:") and Outlook ("-----Original Message-----", or a bare
 * From / Sent / To / Subject block) all put the original headers as text lines
 * above the original body. A forward of a forward is unwrapped to the bottom.
 *
 * WHAT THIS DOES TO THE DOMAIN RULE. Carriers are matched on the sending
 * domain because a domain has to pass SPF. Inside a forward, the original
 * From line is text the household's own mail client wrote, so it carries no
 * SPF of its own. What protects the card instead is that only the household
 * holds its inbox key; anyone who can write to the card could write anything
 * there anyway. That trade is accepted: without it, no forwarded email could
 * ever match a carrier.
 */
const FORWARD_MARK = /(?:^|\n)[ \t>*]*(?:-{2,}\s*Forwarded message\s*-{2,}|Begin forwarded message:|-{2,}\s*Original Message\s*-{2,}|_{8,})[ \t]*\r?\n/i
const HEADER_LINE = /^[ \t>*]*(From|Date|Sent|Subject|To|Cc|Reply-To)\s*\*{0,2}\s*:\s*\*{0,2}\s*(.*)$/i
const FWD_PREFIX = /^\s*((fwd?|fw|tr|wg|re)\s*:\s*)+/i

function asFromHeader(line) {
  const s = String(line || '').replace(/\[mailto:[^\]]*\]/i, (m) => ` <${m.slice(8, -1)}>`).trim()
  const addr = (s.match(/[\w.+'-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0]
  if (!addr) return s
  const name = s.replace(/<?[\w.+'-]+@[\w-]+(?:\.[\w-]+)+>?/, '').replace(/["<>]/g, '').trim()
  return name ? `${name} <${addr}>` : `<${addr}>`
}

/** One level of a forward, or null when the text is not one. */
function unwrapOnce(text) {
  const t = String(text || '')
  let start = -1
  const mark = t.match(FORWARD_MARK)
  if (mark) start = mark.index + mark[0].length
  else {
    // Outlook with no marker: a From line followed within a few lines by Subject.
    const m = t.match(/(?:^|\n)[ \t>*]*From\s*\*{0,2}:[^\n]*\n(?:[ \t>*]*(?:Sent|Date|To|Cc)\s*\*{0,2}:[^\n]*\n){1,4}[ \t>*]*Subject\s*\*{0,2}:/i)
    if (!m) return null
    start = m.index
  }
  // iPhone Mail quotes the whole forward, every line "> ", and the line after
  // "Begin forwarded message:" is a bare ">". Read as text that ">" ended the
  // headers at once and the forward was never unwrapped: a live test on 18 Oct
  // 2026 filed a Royal Mail dispatch as from the household, Ordered, on the
  // forward's own date. One level of quoting comes off when the mark itself
  // was quoted.
  const markLine = t.slice(mark ? mark.index : start, start)
  const quoted = /^\s*>/.test(markLine.replace(/^\n/, ''))
  const lines = t.slice(start).split(/\r?\n/).map((l) => (quoted ? l.replace(/^[ \t]*> ?/, '') : l))
  const head = {}
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  for (; i < lines.length; i++) {
    const h = lines[i].match(HEADER_LINE)
    if (!h) break
    head[h[1].toLowerCase()] = h[2].trim()
  }
  if (!head.from) return null
  const body = lines.slice(i).join('\n').replace(/^\s+/, '')
  return { from: asFromHeader(head.from), subject: head.subject || '', text: body }
}

export function unwrapForward({ from, subject, text } = {}) {
  let cur = { from, subject: String(subject || '').replace(FWD_PREFIX, ''), text: String(text || '') }
  let forwarded = false
  for (let depth = 0; depth < 4; depth++) {
    const inner = unwrapOnce(cur.text)
    if (!inner) break
    forwarded = true
    cur = { from: inner.from, subject: (inner.subject || cur.subject).replace(FWD_PREFIX, ''), text: inner.text }
  }
  return { ...cur, forwarded }
}

/** The first stage a piece of text states, guards applied. */
function stageIn(text) {
  if (!text) return null
  for (const [name, patterns] of STAGE_PHRASES) {
    // Never read a future delivery as a past one, however the sentence is
    // built. This guard costs one regex and prevents the one unrecoverable
    // error: a parcel marked arrived while the customer is still waiting in.
    if (name === 'DONE' && FUTURE_TENSE.test(text)) continue
    if (name === 'ON_THE_WAY' && NOT_YET_DISPATCHED.test(text)) continue
    if (patterns.some((p) => p.test(text))) return name
  }
  return null
}

/** Dates a carrier actually wrote. Never a date this code worked out. */
const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
}
const DAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

/**
 * A stated delivery date, as `{ at, said }` — the instant, and the words the
 * carrier used, so the card can show the claim rather than a number this code
 * produced. Returns null when the email names no date, which is common and
 * entirely fine: an arrival with no date is still an arrival.
 */
export function statedDate(text, now = new Date()) {
  const s = String(text || '')

  // "Tuesday 14 October", "14 Oct", "14th October 2026"
  const dmy = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s*(\d{4})?/i)
  if (dmy) {
    const day = Number(dmy[1])
    const month = MONTHS[dmy[2].toLowerCase().slice(0, dmy[2].toLowerCase().startsWith('sept') ? 4 : 3)]
    const year = dmy[3] ? Number(dmy[3]) : guessYear(month, day, now)
    if (Number.isFinite(day) && Number.isFinite(month)) {
      return { at: new Date(Date.UTC(year, month, day, 12, 0, 0)), said: dmy[0].trim() }
    }
  }

  // "today" / "tomorrow" — relative to when the email arrived, not to now.
  if (/\btoday\b/i.test(s)) return { at: atNoon(now, 0), said: 'today' }
  if (/\btomorrow\b/i.test(s)) return { at: atNoon(now, 1), said: 'tomorrow' }

  // A bare weekday: the NEXT one, which is what a carrier means by it.
  const wd = s.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
  if (wd) {
    const want = DAYS[wd[1].toLowerCase()]
    const ahead = (want - now.getUTCDay() + 7) % 7 || 7
    return { at: atNoon(now, ahead), said: wd[1] }
  }
  return null
}

const atNoon = (from, plusDays) => {
  const d = new Date(from)
  d.setUTCDate(d.getUTCDate() + plusDays)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

// A carrier writing "14 Oct" in December means next year, not ten months ago.
function guessYear(month, day, now) {
  const y = now.getUTCFullYear()
  const asThisYear = Date.UTC(y, month, day)
  return asThisYear < now.getTime() - 60 * 24 * 3600 * 1000 ? y + 1 : y
}

/** "between 1pm and 2pm", "13:00 - 14:00", "1-2pm", and InPost's "ETA: 17:00-19:00" */
export function statedWindow(text) {
  const s = String(text || '')
  const m =
    s.match(/\bbetween\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:and|-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) ||
    s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ||
    // Twenty-four hour clock on both sides and no am/pm at all, which is how a
    // carrier's routing engine writes it. The empty groups keep the indices
    // the same as the two patterns above.
    s.match(/\b(\d{1,2}):(\d{2})()\s*(?:-|–|to)\s*(\d{1,2}):(\d{2})()\b/)
  if (!m) return null
  const h = (hh, mm, ap) => {
    let n = Number(hh)
    if (/pm/i.test(ap || '') && n < 12) n += 12
    if (/am/i.test(ap || '') && n === 12) n = 0
    return { h: n, m: Number(mm || 0) }
  }
  // A trailing am/pm applies to both ends: "1-2pm" is 13:00 to 14:00.
  const end = h(m[4], m[5], m[6])
  const start = h(m[1], m[2], m[3] || m[6])
  if (start.h > 23 || end.h > 23) return null
  return { start, end, said: m[0].trim() }
}

const domainOf = (from) => (String(from || '').match(/@([^\s>]+)/) || [])[1]?.toLowerCase() || ''

/** The name a person would use for who it is from, when no carrier matched. */
/** The name an email's own From line gives, as the card would show it. */
export const nameOfSender = (from) => senderName(from, domainOf(from))

function senderName(from, domain) {
  const named = String(from || '').match(/^\s*"?([^"<@]+?)"?\s*</)
  const label = named?.[1]?.trim()
  if (label && label.length <= 60 && !/^no-?reply/i.test(label)) return label
  const bare = domain.replace(/^(www|mail|email|e|notifications?|updates?)\./, '').split('.')[0]
  return bare ? bare.charAt(0).toUpperCase() + bare.slice(1) : 'A sender'
}

/**
 * A parcel lands. A person knocks.
 *
 * The household already thinks about these differently, and the difference is
 * what you have to be in for. Nobody waits in for a jiffy bag; everybody waits
 * in for an engineer. So the card separates them, and that separation is only
 * as good as this function.
 *
 * Three kinds:
 *   PARCEL    a known carrier, or anything with a tracking number. It lands.
 *   DELIVERY  goods with people attached — a sofa, a fridge, two men and a van.
 *   SERVICE   somebody coming to DO something — an engineer, a survey, a fit.
 *
 * Read conservatively. A row wrongly called a service puts a jiffy bag in the
 * list of people you have to be in for, which is the one list that has to stay
 * true to be worth looking at.
 */
const SERVICE_WORDS = [
  /\b(engineer|technician|surveyor|fitter|installer|electrician|plumber|gas safe)\b/i,
  /\b(service|servicing|annual service|safety check|inspection|survey|repair|maintenance)\s+(visit|appointment|booking|call|is|has|will|booked|due|scheduled)/i,
  /\b(appointment|visit)\s+(is |has been |now )?(booked|confirmed|scheduled|arranged|due)/i,
  /\bwe('| wi)ll (be there|attend|call round|come (out|round))\b/i,
  /\b(installation|fitting|instal)\s+(date|appointment|booking|is|has)/i,
  /\bboiler (service|repair)\b/i,
]

// Goods that come with a crew. These are deliveries, not services: nobody is
// doing a job, but somebody is carrying something through a door.
const CREW_WORDS = [
  /\b(two|2)[- ](man|person|people)\b/i,
  /\bour (delivery )?(team|crew|drivers)\b/i,
  /\b(sofa|bed|mattress|wardrobe|furniture|appliance|fridge|freezer|washing machine|cooker|dishwasher|tv|television)\b/i,
  /\b(white glove|room of choice|assembled|assembly)\b/i,
]

function kindOf(hay, carrier, reference) {
  if (carrier || reference) return 'PARCEL'
  if (SERVICE_WORDS.some((re) => re.test(hay))) return 'SERVICE'
  if (CREW_WORDS.some((re) => re.test(hay))) return 'DELIVERY'
  // Something is coming and nothing says who carries it. "Delivery" is the
  // safer of the two: it does not claim a person is turning up.
  return 'DELIVERY'
}

/**
 * What to call the thing, which is not always what the subject line says.
 *
 * Most delivery subjects are a restatement of the stage: "Your parcel is out
 * for delivery", "Your delivery is booked". The card already says the stage,
 * in colour, above the title — repeating it there wastes the one line that
 * could have said WHAT is coming. So a subject that carries nothing but
 * delivery words is swapped for the sender's name, and a subject that names
 * something ("Your Screwfix order has been dispatched", "Two-seater sofa:
 * delivery confirmed") is kept exactly as they wrote it, because what they
 * wrote is the honest answer and guessing a product name from prose is not.
 */
const PLUMBING = /\b(your|our|the|a|an|is|are|was|were|has|have|had|will|be|been|being|out|for|on|in|its|it|way|to|you|today|tomorrow|now|soon|update|re|fw|fwd|delivery|deliveries|delivered|deliver|delivering|parcel|parcels|package|order|items?|shipment|consignment|dispatch|dispatched|despatched|shipped|booked|confirmed|confirmation|scheduled|arriving|arrived|arrival|coming|missed|attempted|sorry|we|us|track|tracking|number|notification|notice)\b/gi

// A shop's subject often opens with the stage as a label ("Dispatched: Your
// Samsung order ...", "Delivered: ..."). The card shows the stage above the
// title already, so the label comes off and what is left names the thing.
const STAGE_LABEL = /^\s*(?:dispatched|despatched|shipped|delivered|out for delivery|order confirmation|confirmation of|order confirmed|order received)\b\s*[:\-–]?\s*/i
// An order number names nothing a person would recognise on a card.
const REF_TOKEN = /\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{5,}\b/g

function titleFrom(subject, who, isCarrier) {
  const raw = (subject || '').trim()
  const subj = raw.replace(STAGE_LABEL, '').trim()
  const left = subj.replace(REF_TOKEN, ' ').replace(PLUMBING, ' ').replace(/[^A-Za-z]+/g, '')
  if (subj && left.length > 2) return subj.charAt(0).toUpperCase() + subj.slice(1)
  if (isCarrier) return `${who} parcel`
  return /\border\b/i.test(raw) ? `${who} order` : `Delivery from ${who}`
}

/** True for the titles this file makes up when a subject named nothing. */
export const isGenericTitle = (title, who) =>
  [`${who} parcel`, `${who} order`, `Delivery from ${who}`].includes(String(title || ''))

/**
 * Read one forwarded email.
 *
 * Returns null when nothing about it says something is coming — a receipt, a
 * newsletter, a password reset. Returning null is the common case and is not a
 * failure: the card would rather miss a parcel than invent one.
 */
export function readArrivalEmail({ from: outerFrom, subject: outerSubject, text: outerText, receivedAt } = {}) {
  const now = receivedAt instanceof Date ? receivedAt : new Date(receivedAt || Date.now())
  // Before anything else: the original email inside the forward.
  const { from, subject, text } = unwrapForward({ from: outerFrom, subject: outerSubject, text: outerText })
  const subj = cleanText(subject, 300) || ''
  const body = String(text || '').slice(0, 20000)
  const hay = `${subj}\n${body}`
  const domain = domainOf(from)

  const carrier = CARRIERS.find((c) => c.domains.some((d) => d.test(domain))) || null

  // THE SUBJECT FIRST. The sender's headline names the stage they are telling
  // you about ("Dispatched:", "Delivered:", "Confirmation of your order"); the
  // body then mentions every other stage in passing ("we'll email you when it
  // has been dispatched", "should be delivered to your address"). Reading the
  // body first is how an order confirmation became a dispatch and a dispatch
  // became an arrival.
  let stage = stageIn(subj) || stageIn(body)
  // An order for something nobody carries to a door is not an arrival.
  if (stage === 'ORDERED' && DIGITAL_ONLY.test(hay) && !PHYSICAL.test(hay)) return null

  // Nothing says a thing is coming, and no known carrier sent it. Leave it.
  if (!stage && !carrier) return null
  // A known carrier with no recognisable stage is still worth showing as on
  // its way: they do not email about parcels that are not moving.
  if (!stage) stage = 'ON_THE_WAY'

  // A shop that posts with a carrier links to that carrier's own tracking
  // page ("RM Tracking Link: https://www.royalmail.com/track-your-item..."). The
  // shop is still who said it, and stays the sender; the carrier is only where
  // the reference and the tracking link come from. Matched on the link's
  // domain AND the carrier's own reference shape, never on its name in text.
  const linkHosts = [...body.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase())
  const via = carrier || CARRIERS.find((c) =>
    linkHosts.some((h) => c.domains.some((d) => d.test(h))) && c.ref.some((re) => re.test(hay))) || null

  let reference = null
  for (const re of via?.ref || []) {
    const m = hay.match(re)
    if (m) { reference = m[1]; break }
  }
  if (!reference) {
    // A reference has a digit in it: "Order Receipt Number: 1638376" once
    // came back as "Receipt" (18 Oct 2026).
    const generic = hay.match(/\b(?:tracking|consignment|parcel|order)\s*(?:receipt\s*)?(?:number|no\.?|#|reference|ref)?\s*[:#]?\s*((?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{5,24})\b/i)
    if (generic) reference = generic[1]
  }

  const when = statedDate(hay, now)
  const window = statedWindow(hay)
  const who = carrier?.name || senderName(from, domain)

  return {
    kind: kindOf(hay, via, reference),
    source: 'EMAIL',
    carrier: who,
    carrierId: carrier?.id || null,
    title: titleFrom(subj, who, Boolean(carrier)),
    reference: reference || null,
    stage,
    // Attributed, always. The card says "Evri said Tuesday", never "Tuesday".
    expectedFor: when?.at || null,
    expectedSaid: when?.said || null,
    window: window ? { start: window.start, end: window.end, said: window.said } : null,
    trackUrl: reference && via?.track && via.ref.some((re) => re.test(reference)) ? via.track(reference) : null,
  }
}
