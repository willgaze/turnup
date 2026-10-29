import { LegalShell, H2, P, Note, A, List } from '@/components/Legal'

export const metadata = {
  title: 'Trade terms — TurnUp',
  description: 'What TurnUp does for a trade, what it never does, and how either side stops. Free during the beta.',
  robots: { index: true },
}

/**
 * The terms a beta trade agrees to (go-to-market stop 4, 26 Oct 2026). Read
 * with /processor (their customers' details) and /privacy.
 *
 * Every "TurnUp never" below is a rule the code already enforces, and the
 * comment beside it names where, so the promise and the code can be checked
 * against each other. Do not add a never that the code does not keep.
 *
 * Commercial choices on this page that are the owner's to change, not law:
 * free during the beta, 30 days' notice before TurnUp stops the service, and
 * England and Wales as the law. Legal claims are linked to their source.
 */

const UPDATED = '26 October 2026'
const ICO_INFORMED = 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/'
const UCTA_2 = 'https://www.legislation.gov.uk/ukpga/1977/50/section/2'

export default function TermsForTrades() {
  return (
    <LegalShell
      here="/terms-for-trades"
      eyebrow="Trade terms"
      title="What TurnUp does for you, and what it never does."
      updated={UPDATED}
      intro={(
        <P>
          Short on purpose. These are between you, the trade, and TurnUp. Your customers’
          details are covered by the <A href="/processor">data processing terms</A>, which come
          with these. You agree to both by using TurnUp for your customers’ jobs.
        </P>
      )}
    >
      <H2>What TurnUp does</H2>
      <List items={[
        'Gives each job one link you send by text. Your customer opens it with no account and sees where the job is: Booked in, On my way, On site, Job done, and Paused with your reason.',
        'Carries hours you and your customer have agreed, and says whose they are when they are only proposed.',
        'Asks the afternoon before whether someone will be in, and tells you the answer.',
        'Nudges your phone when a window has started and the card has not moved.',
        'Puts the job on a card in Apple Wallet that updates itself. On Android, today, it is the link.',
        'Where you connect ServiceM8, follows your bookings from it, and only sends what you switch on.',
      ]} />

      <H2>What TurnUp never does</H2>
      <List items={[
        <><strong>Never promises a time.</strong> It never works out, estimates or counts down to when you will arrive. It shows what you said and when you said it.</>,
        <><strong>Never holds money.</strong> It takes no payment, holds no deposit and charges your customer nothing. If you set a short-notice charge, the page states it and your customer agrees to it before the day. Collecting it is between you and them.</>,
        <><strong>Never runs your job.</strong> No quotes, invoices or job management. Your job lives in your own system; TurnUp is the link between you and your customer.</>,
        <><strong>Never sells or shares your customers’ details,</strong> and never uses them for anything but your jobs.</>,
        <><strong>Never contacts your customers on its own account.</strong> Every text, email and notification is about your job, in your name, and is one that you or your customer switched on.</>,
        <><strong>Never shows a customer’s answers on the link.</strong> Who will be in, the door note and the dog stay between them and you.</>,
      ]} />

      <H2>Free during the beta</H2>
      <P>
        TurnUp costs you nothing during the beta. If that ever changes, you will be told first,
        with the price, and nothing will be charged unless you agree to it.
      </P>
      <P>
        It is a beta: things will change and some will break. Tell TurnUp what goes wrong and it
        will be fixed. Keep your own record of your jobs in your own system, because TurnUp is not
        where the job lives.
      </P>

      <H2>Your part</H2>
      <List items={[
        'Only put a customer on a job you are doing for them, with the details the job needs.',
        <>Say in your own privacy notice that you use TurnUp to keep customers updated (UK GDPR, <A href={ICO_INFORMED}>the right to be informed</A>).</>,
        'Send each link only to the customer it is for. Switch a link off if it went to the wrong person.',
        'Keep your dashboard sign-in to yourself, and tell TurnUp straight away if you think someone else has it.',
        'Do not put health details or anything sensitive in a note: a note is free text.',
      ]} />

      <H2 id="stopping">Stopping</H2>
      <P>
        <strong>Either side can stop at any time.</strong>
      </P>
      <P>
        <strong>You:</strong> stop using it whenever you like. Download everything first if you
        want a copy (Setup and settings, Your data), then Delete account, which switches every
        link off and removes every job straight away. If you just stop, finished jobs are still
        deleted on the timetable in the <A href="/processor">data processing terms</A>.
      </P>
      <P>
        <strong>TurnUp:</strong> will give you at least 30 days’ notice by email before it stops
        the service for you, so you can download everything and tell your customers, unless it
        has to act sooner for security or because the law requires it.
      </P>

      <H2>The small print</H2>
      <P>
        TurnUp is free during the beta and offered as it is. Nothing in these terms limits a
        liability the law does not allow to be limited, such as for death or personal injury
        caused by negligence (<A href={UCTA_2}>Unfair Contract Terms Act 1977, section 2</A>) or
        for fraud.
      </P>
      <P>
        If these terms change, the date at the top changes and the dashboard says so. These terms
        are governed by the law of England and Wales.
      </P>

      <H2>Contact</H2>
      <P><A href="mailto:privacy@getturnup.com">privacy@getturnup.com</A></P>
      <Note>TurnUp is run by one person. A beta trade gets that person.</Note>
    </LegalShell>
  )
}
