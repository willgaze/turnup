import { LegalShell, H2, P, Note, A, List, Cards } from '@/components/Legal'
import { RETENTION_WORDS, ORPHAN_PASS_DAYS } from '@/lib/retention'
import { SUBPROCESSORS, NOT_A_SUBPROCESSOR } from '@/lib/processors'
import { EXPORT_HOLDS, DELETE_REMOVES } from '@/lib/your-data'

export const metadata = {
  title: 'Data processing terms — TurnUp',
  description: 'The terms between a trade and TurnUp for their customers’ details: the trade is the controller, TurnUp the processor.',
  robots: { index: true },
}

/**
 * The controller-processor terms a beta trade reads before they start (stop
 * 4). Built from the ICO's list of what such a contract must contain
 * (UK GDPR Article 28(3)), one section per item, and from the code: the
 * retention numbers come from src/lib/retention.js, the sub-processors from
 * src/lib/processors.js, the export and delete lists from src/lib/your-data.js.
 * If a sentence here stops being true of the code, the page is the defect.
 *
 * What this page does NOT claim, because it could not be sourced on 26 Oct
 * 2026: the database's region (NEON_REGION in processors.js says so on the
 * page), a fixed number of hours for a breach notice beyond what the law says,
 * and any certification TurnUp itself holds. It holds none.
 */

const UPDATED = '26 October 2026'
const ICO_CONTRACTS = 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/'
const ART = (n) => `https://www.legislation.gov.uk/eur/2016/679/article/${n}`

export default function Processor() {
  return (
    <LegalShell
      here="/processor"
      eyebrow="Data processing terms"
      title="Your customers’ details: yours to decide, ours to look after."
      updated={UPDATED}
      intro={(<>
        <P>
          When you put a customer on a TurnUp job, you decide what goes on it and why. That
          makes you the <strong>controller</strong> of those details and TurnUp your
          <strong> processor</strong>. UK GDPR says what has to be written down between the two
          (<A href={ART(28)}>Article 28</A>), and the ICO lists it
          (<A href={ICO_CONTRACTS}>what needs to be in the contract</A>). This page is that,
          in the same order, in plain English.
        </P>
        <P>
          They apply from the day you start using TurnUp for your customers’ jobs, alongside the
          <A href="/terms-for-trades"> trade terms</A>. Each version is dated; the one in force is
          the one on this page.
        </P>
      </>)}
    >
      <H2>1. What is processed, and why</H2>
      <Cards
        items={[{ title: 'In short', rows: [
          ['Subject matter', 'Keeping your customers told where their job has got to: one link per job, and the card in Apple Wallet'],
          ['Nature and purpose', 'Storing the job you enter, showing the customer the part of it you chose to tell them, sending the notifications and texts you switch on, and keeping the record of what was said when'],
          ['Duration', `For as long as you use TurnUp, and then until deleted: ${RETENTION_WORDS.job}, or at once if you delete the job or the account`],
          ['Whose details', 'Your customers, and anyone at the house they tell you about. Your own staff, where you add them to the profile'],
          ['What details', 'Name, address, phone number, the job, the hours, the stage and notes with their times, a map pin, photos of the house or door you add, what the customer answers (who will be in, door and access notes, a private note after the job), No one home records with a photo and where your phone was'],
          ['Special category data', 'None is asked for. Do not put health or other special category details in a note: a note is free text and TurnUp cannot tell what is in it'],
        ] }]}
      />

      <H2>2. What TurnUp commits to</H2>
      <P><strong>Only on your instructions.</strong> TurnUp does with your customers’ details only what you do on your dashboard, what you switch on, and what these terms describe. It does not use them for anything of its own: no marketing, no selling, no training anything, no sharing between trades.</P>
      <P><strong>Confidentiality.</strong> One person can read your jobs at TurnUp’s end: its developer and operator, who is bound by these terms. Nobody else at TurnUp has access, because there is nobody else.</P>
      <P><strong>Security.</strong> What is actually in place today:</P>
      <List items={[
        'A customer’s link is the only key to their page: 8 random characters, switchable off at any time, never in a search index',
        'The page shows only what you told the customer, never what they told you, and a check in the code fails if that ever changes',
        'Notifications and Wallet lock-screen messages carry your name and the stage, never the customer’s name, address or a note',
        'Your dashboard is behind Face ID (passkeys) or a password, and every dashboard route checks it before doing anything',
        'ServiceM8, Google and Gmail tokens and app secrets are sealed with AES-256-GCM before they are stored, and no route returns them',
        'Everything travels over HTTPS',
      ]} />
      <P id="subprocessors"><strong>Sub-processors.</strong> You agree that TurnUp may use the services below. Before adding or replacing one, TurnUp will say so on this page and on your dashboard, so you can object; if you object and it cannot be avoided, you can stop and delete as in section 5. Each one is held to data protection terms of its own.</P>
      <Cards
        items={SUBPROCESSORS.map((s) => ({
          title: s.name,
          sub: s.when,
          rows: [
            ['What for', s.does],
            ['Sees', s.sees],
            ['Where', s.where],
            ['Safeguard', s.link ? <A href={s.link}>{s.safeguard}</A> : s.safeguard],
          ],
        }))}
      />
      <P><strong>{NOT_A_SUBPROCESSOR.name} is not on that list.</strong> {NOT_A_SUBPROCESSOR.says}</P>
      <P><strong>Outside the UK.</strong> Some of those services run outside the UK, chiefly in the United States. Each transfer relies on the safeguard in the last column.</P>
      <P><strong>Helping you with your customers’ rights.</strong> If a customer asks you for a copy of what you hold, or for it to be deleted:</P>
      <List items={[
        'A copy: Setup and settings, Your data, Download everything. It holds every job and everything on it',
        'Delete: switch the job’s link off, then Delete for good. It removes the job, its timeline, the customer’s answers and any photo',
        'Stop the page being seen: switch the link off. It stops working at once, wherever it was forwarded',
      ]} />
      <P>Anything those cannot do, ask TurnUp and it will help.</P>
      <P><strong>Helping you with your own duties.</strong> TurnUp will give you what it knows to help with security, a breach, a data protection impact assessment, or a question from the ICO.</P>
      <P><strong>Information and audits.</strong> TurnUp will answer your questions about how your customers’ details are handled and show you the evidence, and will co-operate with an audit you reasonably ask for. Most of the evidence is written into the product’s own code and checks.</P>

      <H2>3. If something goes wrong</H2>
      <P>
        If TurnUp becomes aware of a breach affecting your customers’ details, it will tell you
        <strong> without undue delay</strong> (<A href={ART(33)}>Article 33(2)</A>), by email and
        on your dashboard, with what it knows at the time and more as it learns it:
      </P>
      <List items={[
        'What happened, and when',
        'Which jobs and which details',
        'What it is likely to mean for the people affected',
        'What TurnUp has done and is doing about it, and who to talk to',
      ]} />
      <P>
        That is so you can meet your own duty, where one applies, to tell the ICO within 72 hours
        of becoming aware (<A href={ART(33)}>Article 33(1)</A>), and to tell the customers
        affected where the risk to them is high (<A href={ART(34)}>Article 34</A>).
      </P>

      <H2>4. How long things are kept</H2>
      <List items={[
        RETENTION_WORDS.jobLong,
        `Apple Wallet registrations for a deleted job are kept up to ${ORPHAN_PASS_DAYS} days, so the phone can be told to remove the card. They hold no name or address.`,
        RETENTION_WORDS.sweep,
        RETENTION_WORDS.backups,
      ]} />

      <H2>5. When you stop</H2>
      <P>Either of us can stop at any time (<A href="/terms-for-trades#stopping">trade terms</A>). When you do, it is your choice whether TurnUp returns your customers’ details or deletes them:</P>
      <P><strong>Return.</strong> Download everything gives you one file with:</P>
      <List items={EXPORT_HOLDS} />
      <P><strong>Delete.</strong> Delete account, under Setup and settings, Your data, removes straight away:</P>
      <List items={DELETE_REMOVES} />
      <P>Copies in the database provider’s restore history then age out as section 4 says. If you stop without deleting, the retention timetable in section 4 still runs, and you can ask TurnUp to delete everything at any time.</P>

      <H2>Contact</H2>
      <P><A href="mailto:privacy@getturnup.com">privacy@getturnup.com</A></P>
      <Note>Sources for the law on this page: <A href={ART(28)}>UK GDPR Article 28</A>, <A href={ART(33)}>Article 33</A>, <A href={ART(34)}>Article 34</A>, and the ICO’s <A href={ICO_CONTRACTS}>guide to controller-processor contracts</A>.</Note>
    </LegalShell>
  )
}
