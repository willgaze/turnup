/**
 * What the household card shows — and, just as much, what it does not.
 *
 * THIS IS A SECOND PUBLIC BOUNDARY. `/h/<code>` is a link like any other link
 * in this product: it gets forwarded, and everything this function returns is
 * readable by everyone it reaches. Kept in its own file with no database
 * import so `scripts/check-public-shape.mjs` can call it without a connection,
 * for the same reason publicShape() is checked: nobody spots a widened shape
 * by reading a diff.
 *
 * The rule is the one from CLAUDE.md, pointed at a door rather than a job:
 * everything here is something SOMEBODY ELSE said was coming. The inbox key
 * that lets a sender write to this card is not here, the row ids are not here,
 * and nothing the household itself told us is either.
 *
 * Finished and missed things older than a few days fall off: the card answers
 * "what is coming", and a list that keeps everything becomes a thing to scroll
 * rather than a thing to glance at.
 */
const KEEP_FINISHED_DAYS = 3

export function cardShape(place, now = new Date()) {
  const cutoff = new Date(now.getTime() - KEEP_FINISHED_DAYS * 24 * 3600 * 1000)
  const arrivals = (place.arrivals || [])
    .filter((a) => !(['DONE', 'MISSED'].includes(a.stage) && new Date(a.updatedAt) < cutoff))
    // Gmail's forwarding confirmation (gmail-confirm.js) is a notice, not an
    // arrival; a week on, Gmail's link has long expired and it only clutters.
    .filter((a) => !(a.kind === 'NOTICE' && new Date(a.updatedAt) < new Date(now.getTime() - 7 * 24 * 3600 * 1000)))
    .map((a) => ({
      kind: a.kind,
      source: a.source,
      stage: a.stage,
      carrier: a.carrier,
      title: a.title,
      reference: a.reference,
      trackUrl: a.trackUrl,
      note: a.note,
      expectedFor: a.expectedFor,
      expectedSaid: a.expectedSaid,
      windowStart: a.windowStart,
      windowEnd: a.windowEnd,
      windowSaid: a.windowSaid,
      tradeStatusCode: a.tradeStatusCode,
      updatedAt: a.updatedAt,
    }))
  return { code: place.code, label: place.label, arrivals }
}
