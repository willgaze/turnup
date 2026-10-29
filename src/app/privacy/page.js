import { LegalShell, H2, P, Note, A, Table } from '@/components/Legal'
import { CANONICAL_HOST } from '@/lib/trade'
import { RETENTION_WORDS, ORPHAN_PASS_DAYS } from '@/lib/retention'
import { SUBPROCESSORS, OTHER_RECIPIENTS, NOT_A_SUBPROCESSOR } from '@/lib/processors'

export const metadata = {
  title: 'Privacy — TurnUp',
  description: 'What TurnUp holds, who can read it, and how long it is kept. Written from what the code actually does.',
  robots: { index: true },
}

/**
 * Required before TurnUp can be listed in the ServiceM8 add-on store, and one
 * of the three papers a beta trade reads before they start (stop 4, with
 * /terms-for-trades and /processor).
 *
 * It is written from what the code does, not from a template, because this is
 * the same product that refuses to state a time it has not been told. If a
 * claim here and the code disagree, the code is right and this page is a
 * defect. Three things are not typed here at all and come from the code:
 *
 * - how long things are kept: RETENTION_WORDS in src/lib/retention.js, the
 *   rule the daily sweep runs (`node scripts/check-retention.mjs`),
 * - who else touches the data: src/lib/processors.js, which /processor prints
 *   too,
 * - what the public page may show: `publicShape()` in src/lib/trade-status.js
 *   and `scripts/check-public-shape.mjs`.
 *
 * Deliberately NOT a cookie banner: TurnUp sets one cookie, the operator's own
 * sign-in, and no analytics or advertising script runs on any page.
 */

const UPDATED = '26 October 2026'
const WITH_JOB = `With the job: ${RETENTION_WORDS.job}, or sooner if the trade deletes it`

export default function Privacy() {
  return (
    <LegalShell
      here="/privacy"
      eyebrow="Privacy"
      title="What TurnUp holds, and who can read it."
      updated={UPDATED}
      intro={(
        <P>
          TurnUp shows a customer where their tradesperson’s job has got to. Doing that needs
          a name, an address and a phone number, which is most of what anyone would want to
          steal, so the short version is: the trade sees their own jobs behind a password, the
          customer sees only what the trade told them, nothing is sold, and finished jobs are
          deleted on a timetable rather than kept for ever.
        </P>
      )}
    >
      <H2>Who is who</H2>
      <P>Two different people use TurnUp and the law treats them differently.</P>
      <P>
        The <strong>tradesperson</strong> decides what goes on a job card: the customer’s name,
        address and number, and what is said about the visit. They are the data controller for
        that. TurnUp is their processor: it holds that information and shows it, and does nothing
        else with it. The terms between them are the <A href="/processor">data processing terms</A>.
      </P>
      <P>
        The <strong>customer</strong> opens a link. TurnUp holds what they answer back (whether
        someone will be in, a door note, a private message to the trade) on behalf of that same
        tradesperson.
      </P>
      <P>
        A <strong>household</strong> that makes its own card on /join, and anyone on the waiting
        list, deals with TurnUp directly. For those, TurnUp is the controller.
      </P>

      <H2>What is held, and for how long</H2>
      <Table
        head={['What', 'Why', 'How long']}
        rows={[
          ['Customer name, address, phone, job reference and what the job is', 'It is the job card. The address is what the trade drives to.', WITH_JOB],
          ['Stage changes, notes, arrival window, and the time of each', 'The record the customer reads, and the trade’s own evidence of what was said when', WITH_JOB],
          ['Answers the customer gives: will someone be in, door and access notes, a private note after the job', 'So the trade knows what to expect at the door', WITH_JOB],
          ['A No one home record: the time, where the phone was, what was tried, a photo of the door', 'The trade’s evidence that they came', WITH_JOB],
          ['A map pin, where one is dropped', 'Turn-by-turn to the right gate rather than near it', WITH_JOB],
          ['Push notification subscriptions', 'To send “has set off” to a phone', 'Until the browser discards it, or with the job'],
          ['An Apple Wallet registration, where a job’s card is added to Wallet: an anonymous device identifier and a push token from Apple', 'So the card in Wallet moves itself when the job does, instead of showing the stage it was added at', `Until the card is removed from Wallet. Once its job is deleted, up to ${ORPHAN_PASS_DAYS} days, so the phone can be told to remove the card`],
          ['The trade’s own details: business name, photo, van and plate', 'Shown to the customer from “on my way”, so they know who is at the door', 'Until changed, or the account is deleted'],
          ['ServiceM8 bookings, where a trade connects ServiceM8', 'So the card follows the job without anything being retyped', WITH_JOB],
          ['The waiting list (/join): name, email, trade or “a home”, and the first half of a postcode', 'To email you once, when there is a place', 'Until you ask for it to be removed'],
          ['A household card made on /join: the name chosen for it, and its two codes', 'The card is a link for the people who live there; the second code is its forwarding address and is shown only on the phone that made it', 'Until the card is switched off'],
          ['Each row on a household card: what is coming, who said so, and when', 'So the household sees everything coming to the door on one list', `${RETENTION_WORDS.arrival}. A row that never arrives stays until the card is switched off`],
          ['What else you type into /join: the map pin, photos, who else is home, a work address', 'Builds your card on the page as you go. It is kept in your own browser and never sent to TurnUp', 'Until you tap Start again or clear the browser'],
          ['Emails forwarded to a household card’s inbox address', 'The sender, the subject and the text are read for an arrival and a date; the message itself is not kept', 'The email is not stored. The row it makes follows the household-row rule above'],
        ]}
      />
      <P>{RETENTION_WORDS.sweep} {RETENTION_WORDS.backups}</P>
      <P>
        There is no analytics, no advertising and no tracking script on any page. TurnUp sets one
        cookie: the tradesperson’s own sign-in. A customer’s link sets none.
      </P>

      <H2>Who can read it</H2>
      <P>
        <strong>The link in the URL is the credential.</strong> A customer has no account. Anyone
        holding that link can see the page, so what the page shows is deliberately narrow, and
        what it shows is one rule:
      </P>
      <P><em>It carries what the trade told the customer. It never carries what the customer told the trade.</em></P>
      <P>
        So the stage, the day, an agreed window, the trade’s name and face are on the page. The
        customer’s own answers are not: whether anyone will be in, the door note, the dog, the
        photos of the house, a private message. Those live on the device that gave them and on
        the trade’s dashboard, behind the trade’s password. A link forwarded into a family group
        chat shows a stage and a street, never a way in.
      </P>
      <P>
        A link can be switched off at any time by the trade, and stops working the moment it is.
        Every page tells search engines not to index it.
      </P>
      <P>
        Notifications are the least private surface here, because they are read by whoever picks
        the phone up. One carries the trade’s name and the stage, and nothing else: never the
        address, never the job reference, never the customer’s name, never a free-text note.
        A Wallet card obeys the same rule: when it changes, the lock screen shows the
        new stage and nothing else, because the stage is the only field on that card
        allowed to announce itself.
      </P>

      <H2>Who else touches it</H2>
      <P>
        TurnUp does not sell, rent or share anything with advertisers, data brokers or anyone
        else, and there is no sharing between the trades who use it. These are the services it
        runs on, and all it sends them is what they need to do their job:
      </P>
      <Table
        head={['Service', 'What it sees', 'When']}
        rows={[
          ...SUBPROCESSORS.map((s) => [s.name, s.sees, s.when]),
          ...OTHER_RECIPIENTS.map((s) => [s.name, s.sees, s.when]),
        ]}
      />
      <Note>Where each one is, and the safeguard for sending data outside the UK: <A href="/processor#subprocessors">data processing terms</A>.</Note>
      <P><strong>{NOT_A_SUBPROCESSOR.name}.</strong> {NOT_A_SUBPROCESSOR.says}</P>
      <P>
        Tokens for a connected ServiceM8 account are encrypted before they are stored.
        Disconnecting the add-on deletes them.
      </P>

      <H2>Your rights</H2>
      <P>
        Under UK GDPR you can ask for a copy of what is held about you, ask for it to be
        corrected, or ask for it to be deleted.
      </P>
      <P>
        <strong>If you are a customer</strong> who has had a TurnUp link: the tradesperson who
        sent it decides what happens to it. Ask them first. They can switch your link off at
        once, and then delete the job for good, which removes everything on it: the timeline,
        your answers and any photo. If you cannot reach them, write to the address below and
        TurnUp will pass it on and make sure it is acted on.
      </P>
      <P>
        <strong>If you are a tradesperson</strong>: everything is on your dashboard, under
        Setup and settings, Your data. Download everything gives you one file with all of it.
        Delete account removes every job, switches every link off and takes every Wallet card
        with it.
      </P>
      <P>
        If something is not put right, you can complain to the Information Commissioner’s Office
        at <A href="https://ico.org.uk">ico.org.uk</A>.
      </P>

      <H2>Children</H2>
      <P>
        TurnUp is for tradespeople and their customers and is not meant for anyone under 16. It
        does not knowingly hold anything about a child.
      </P>

      <H2>Changes</H2>
      <P>
        If this changes, the date at the top changes with it. A change that materially affects
        what is held or who can read it will be said on the dashboard, not only here.
      </P>

      <H2>Getting in touch</H2>
      <P><A href="mailto:privacy@getturnup.com">privacy@getturnup.com</A></P>
      <Note>
        {CANONICAL_HOST} · Questions about a specific job are quickest answered by the
        tradesperson who sent you the link.
      </Note>
    </LegalShell>
  )
}
