/**
 * What build this is, and what it looks like.
 *
 * A version number on the page so a change is visible without diffing, and a
 * theme that moves with it so a change is visible without reading.
 *
 * Each theme is a light page background, a dark page background and an
 * accent. The dark one is NOT derived from the light one at runtime — a
 * darkened pastel is grey mud, and the heading on it was invisible once.
 *
 * THE THEME IS CURATED, NOT RANDOM. "A colour not used before" generated on
 * the fly produces mud and unreadable text within a week. Every entry below is
 * a deliberate pair: a page background and an accent, checked for contrast
 * against white text on the accent and dark text on the background. A nightly
 * build advances the index; it does not invent a colour.
 *
 * Adding one is welcome. Inventing one at runtime is not.
 */
export const VERSION = '1.74.0'
export const BUILD_DATE = '2026-10-25'

export const THEMES = [
  { id: 'harbour',  name: 'Harbour',   bg: '#f4f7fb', bgDark: '#0b1119', accent: '#255a95', deep: '#122a46' },
  { id: 'moss',     name: 'Moss',      bg: '#f3f8f4', bgDark: '#0a130e', accent: '#2c6e49', deep: '#14301f' },
  { id: 'slate',    name: 'Slate',     bg: '#f5f6f8', bgDark: '#0e1016', accent: '#44506b', deep: '#1d2333' },
  { id: 'clay',     name: 'Clay',      bg: '#faf6f2', bgDark: '#150e0a', accent: '#9a4a24', deep: '#3d1d0e' },
  { id: 'indigo',   name: 'Indigo',    bg: '#f5f5fc', bgDark: '#0e0d1a', accent: '#463a94', deep: '#1f1950' },
  { id: 'teal',     name: 'Teal',      bg: '#f2f9f9', bgDark: '#08181a', accent: '#1f6f72', deep: '#0d3132' },
  { id: 'plum',     name: 'Plum',      bg: '#f9f4f8', bgDark: '#160b14', accent: '#7a2f5e', deep: '#37132a' },
  { id: 'ochre',    name: 'Ochre',     bg: '#fbf8f0', bgDark: '#151006', accent: '#8a6414', deep: '#3a2a06' },
]

// Which one this build wears. The nightly job bumps it, so a glance at the
// page says whether last night's build actually landed.
//
// A THEME OWNS THE CHROME, NOT THE STAGES. It sets the page background and the
// accent on the landing page, the sign-in and the dashboard furniture. It does
// NOT set the colour of Booked in, On my way, On site, Paused or Job done —
// those are fixed in globals.css, because they mean something, and a meaning
// that changes colour every night is not a meaning. See the stage tint block
// in src/app/globals.css.
export const THEME_INDEX = 58

export const theme = () => THEMES[THEME_INDEX % THEMES.length]

/**
 * What changed, newest first. Kept short on purpose: this is read on a phone
 * by the person who asked for it, not by a release manager.
 */
export const CHANGELOG = [
  { version: '1.74.0', date: '2026-10-25', notes: [
    'The wallet card can now update itself. Until tonight a pass showed the stage it was added at and nothing moved it again, which is the difference between a card and a screenshot. The four service calls Wallet makes are built: it registers a phone against a job, it asks what has changed since it last looked, it fetches the current card, and it reports back when something went wrong. A stage tap on the dashboard, or a booking moving in ServiceM8, now tells every phone holding that card to come and look.',
    'The push that does it carries no words at all — Apple’s pass push is an empty body that only says "ask me again", so there is nothing on a lock screen to get wrong and no vocabulary to guard. Everything the card says still comes from the same builder as the download, so the card in a pocket and the page on the link cannot say different things.',
    'A revoked link takes the card with it. Switch a job’s link off and the next time Wallet asks it is told the pass is no longer theirs, and it comes off the phone. The token a pass sends back is worked out from the job code and your own secret rather than stored, so there is no new column, nothing extra to leak, and one job’s pass cannot ask about another’s.',
    'Still waiting on one thing, and it is not code: the Pass Type ID certificate from Apple. The enrolment went through on 21 October, so that is the next job, and this half is ready for the day it lands. Two checks on it, and the second one earned its keep immediately: run against a real server it found that a card whose link had been switched off was told \u201ccome back later\u201d instead of being removed from the phone. The paths Wallet itself calls are the one thing left to a real card, and every route logs a line so the log says whether it found them.',
    'Apple Wallet is live. The certificate landed and the first real card went into a real wallet on 23 October — job #2742, added straight from the customer’s page. It is the premise of this whole product and it had never actually existed before today. Everything that described it as pending (the plan, the roadmap, the homepage badge, the instructions) now says what is true.',
    'And the first real card immediately proved why the half above matters: added while the update service was still in a branch, it froze at Booked in with no note, while the job itself had said running about thirty minutes late fourteen hours earlier. A card that cannot move is a screenshot of a moment.',
    'One thing the audit caught that nothing would have reported: the private key is AES-256 encrypted, so the push needs its passphrase as well — and the check that said whether pushing was switched on did not look at it. It would have answered yes, failed inside a swallowed error and left every card quietly not updating. It now says no, and names what is missing, and a card nobody can push says so in the log instead of nothing at all.',
    'One more from the audit, found the hard way: scripts/local-db.sh rewrites .env.local, which silently drops the pass type, after which every one of the twenty-four live checks fails as a 404 that explains nothing. The check now says that in one line instead. A check that fails confusingly is only slightly better than one that cannot fail.',
    'The card tells you it has changed. A pass that updates silently is a pass nobody looks at, so the stage is the one field that announces itself: when the job moves, the lock screen reads Now: On my way, and Wallet puts your business name beside it. Nothing else on the card may do that — not the note, not the address, not the customer’s name — and the check names all eight of them, because the risk was never the field that has one today.',
    'Said out loud on the privacy page too: what a Wallet registration holds (an anonymous device identifier and a token from Apple), how long it is kept, and that the push itself carries no words at all. A change to what is stored or sent is a change to that page; when the two disagree, the page is the defect.',
  ] },
  { version: '1.73.1', date: '2026-10-25', notes: [
    'The Apple Wallet script can no longer publish its own private key. Its last step used to redeploy with a plain deploy command, run from the folder on the Mac that holds the key, and on 21 Oct that uploaded the folder, key included. Now every Vercel command in it goes through one gate that only allows commands which upload nothing, run from an empty temporary folder, and the redeploy re-runs the build that is already live and promotes it.',
    'Making a key now stops if one already exists, so the certificate Apple issued is never orphaned by accident, and a new rotate command retires an exposed key (kept in a dated folder, never deleted) and starts a fresh one, with the steps to revoke the old certificate once the new one works.',
    'Written on 22 October and left on a branch until today, while the line that did the damage stayed on main. A security fix that is only on a branch is not a fix.',
  ] },
  { version: '1.73.0', date: '2026-10-23', notes: [
    'Every moment that matters now reaches a customer with no notifications on. Sorry we missed you, running late (your own figure, with when you said it) and paused join set off, window missed and the day-before ask: an email through ServiceM8 when no push landed, once each per job. That closes the rule that every customer-critical event has a fallback that is not a push.',
    'Connect Gmail is parked, not pending. The panel and the paste exist; your own inbox already reaches the card through the Workspace forwarding rule; it comes back when other households can connect, which waits on Google. Nobody asks you about it again.',
  ] },
  { version: '1.72.2', date: '2026-10-23', notes: [
    'The homepage is a third of the length. It was eighteen screens on a phone (the 19 October review); nobody scrolls eighteen screens. It keeps what works today: the headline, the phone, the four stage colours, four of the customer\'s rows, the two buttons the trade taps most, the live count, the house card and the ask. The wallet card\'s story, the poster strips for what is next and the four things it will never do have moved to /next, which the homepage links to twice. The whole day, every row and every button, was already /for-trades, and the homepage now says so under What you tap.',
  ] },
  { version: '1.72.1', date: '2026-10-23', notes: [
    'The homepage leads with what works today. The headline is the owner\'s pick from the 19 October review, "Tap On my way. They stop ringing.", and the first picture is the customer\'s page from a text, which is live. The wallet card stays on the page, second, and says it is next: built, enrolment through on 21 October, certificate to come. "Android next" is gone, because Google Wallet is not started. "Thirty seconds", "live on every job" and "the tools you already use" are gone too: unmeasured, untrue for the things that need setup, and ServiceM8 is the only tool.',
    'The example job is an example all the way down. /demo said everything on it was invented and then showed the real business\'s name and a Call button that rang the real business. The customer\'s page now takes the trade from a provider (src/components/TradeProvider.jsx) that defaults to the environment, and the demo fixture wraps itself in an invented plumber with no phone. Every real page is unchanged.',
    'Words that had fallen behind: /for-homes said forwarding was being switched on (it is live); /join said the forwarding address comes when your place opens (it comes when the card is made); /with-servicem8 had no button on its first screen but Dashboard, which is a sign-in.',
  ] },
  { version: '1.72.0', date: '2026-10-23', notes: [
    'Connect Gmail is two boxes on the phone, not Vercel. The Google Client ID and secret are pasted into the panel under Where the card hears from, sealed before they are stored, and Connect Gmail appears straight away: no settings page, no redeploy. The three Google steps are links you can tap. Same fix the ServiceM8 add-on got the day before, for the same reason.',
  ] },
  { version: '1.71.0', date: '2026-10-22', notes: [
    'The ServiceM8 add-on no longer needs Vercel. The App ID and App Secret from ServiceM8\'s Developer page are pasted into two boxes on the ServiceM8 panel and saved encrypted in your own database, and the Connect button appears straight away: no settings page, no redeploy. Two Vercel settings were asked for three times and never happened, so the ask changed. The panel now says the three steps with a link for each and a Copy button for the Return URL, instead of pointing at a file in the repository you could not tap.',
  ] },
  { version: '1.70.0', date: '2026-10-20', notes: [
    'Job done? On my way to the next one, offered. Tap Job done and a card at the top asks whether you are heading to the next job booked today, with their name, the job and the hours. One tap sends On my way, exactly as the button on their card would: push, the email fallback, the ServiceM8 diary. Not yet puts it away. If nothing else is booked today it says so. It never offers tomorrow\'s job and never names a time.',
  ] },
  { version: '1.69.0', date: '2026-10-19', notes: [
    'Your lock screen stops naming your customers. Ten notifications to your phone carried a first name \u2014 "Sarah\u2019s window has started", "Sarah left a note after the job" \u2014 and one of them put the customer\u2019s own private note straight in the body, which is the thing the rule in this product bans hardest. The rule was written for the customer\u2019s phone and had simply never been applied to yours. Your phone sits on a kitchen table too.',
    'The cost, so it is your call and not a surprise: with four jobs on, the lock screen no longer says which one it is about. You tap, and the dashboard says. A name is the only thing that could tell them apart and a name is the thing that should not be there.',
    'What is left is a vocabulary rather than ten lines written in ten places (src/lib/trade-push-words.js), and nothing in it can take anything a customer supplied \u2014 there is nowhere to put it. What a notification may say is now a decision made in one file, the way it already was for the customer\u2019s side.',
    'A check that can actually fail (node scripts/check-trade-push.mjs): it builds every line and reads it, then reads every notification call in the app as source and refuses one that passes a customer field. It carries the five shapes this bug really took, and fails if it stops catching them. A check that cannot fail is decoration.',
  ] },
  { version: '1.68.0', date: '2026-10-19', notes: [
    'A reminder that stops. An unanswered "Are you still coming?" buzzed the trade every ten minutes for as long as it stayed open \u2014 one asked at 15:34 on 18 October went all night and was still going at breakfast. Three locks now: three buzzes in total and no more; nothing between 21:00 and 07:00 in your own zone, with one summary at seven if a question was left open across the night; and an ask belongs to the day of the job it is about, so a stale one never pushes the next morning. A reminder that has not worked three times will not work the fortieth.',
    'Stop reminders, on the card. The only way to silence a buzzing question used to be to move the stage, which tells the customer something that is not true. The button answers the question without touching the card: no stage, no note on their page, no claim that anybody has set off. For when you have already rung them.',
    'The lock screen stops naming the customer on that one. "Sarah is asking" became "A customer is asking", and the time came out of the body. A notification is read by whoever picks the phone up off the kitchen table, and knowing which card to open never needed her name. The other trade notifications still carry a first name; that is the next thing to look at.',
    'The two window nudges sleep as well, and they lose nothing by it: each fires once, so a window that ended at 22:00 is reported at 07:00 rather than at 22:00. The missed-window notice is deliberately NOT quietened \u2014 that one is the customer being told their window has passed, and they are owed it whatever the hour.',
  ] },
  { version: '1.67.0', date: '2026-10-19', notes: [
    'The pilot numbers count what they say. Links opened no longer counts your own opens or the preview a messaging app fetches when the link is pasted. A wasted trip is counted on the day it happened, so rebooking the job no longer loses it, and a tap that timed out no longer records it twice. The thirty days start when you press Start on the panel; before that the panel says the window is rolling. Calls to the booking line are typed on the panel with one button.',
    'Where the card hears from: two new sources on the dashboard, both off until their setting exists. Read my own inbox connects your Google Workspace mailbox and files delivery emails on one card every five minutes, with no forwarding rule. Track parcels by their number hands a courier reference to Ship24 and the courier\'s own scans move the row from then on. Each panel shows exactly what it needs and ends in a Check now or a tracked count.',
    'Honest words: You are 2nd today shows only on the day; the roadmap says the van lookup is live, that door photos are yours alone, and that the wallet card does not carry your logo yet; the homepage no longer says the wallet card moves on its own.',
  ] },
  { version: '1.66.0', date: '2026-10-19', notes: [
    'Are you still coming? no longer crashes the customer\'s page. If the page was open when the window started, it went to Application error, at the exact moment a customer was watching for you. Found in an audit, reproduced in a browser, fixed, and a new check fails any change that brings it back.',
    'The household card\'s email reader is proven in every client: Gmail, Outlook and Apple Mail forwards, each at ordered, on its way, out for delivery and delivered. Dispatched never files as arrived in any of them. "Ordered:" (Amazon\'s wording) and "you ordered" now count as an order. The test emails use invented people and addresses only.',
    'An audit of everything the roadmap and the build list say, checked against the code: docs/audit/2026-10-19.md. The build list no longer says every event has an email fallback; three do.',
    'A plan for reading a household\'s inbox the way Shop does, without forwarding: docs/research/inbox-connect.md, with a source for every claim. On the roadmap as Connect Gmail, an idea with no date, because Google has to review it first.',
  ] },
  { version: '1.65.3', date: '2026-10-18', notes: [
    'Card titles say what the thing is. "Confirmation of your order: A28609474611. Please find your invoice attached." is now "Screwfix order", and "Your Order with divapor.com has been marked as dispatched" is "Di Vapor order": the stage already shows above the title, and an order number and an invoice line name nothing.',
    'Rows left over from before forwarded emails were read properly, with "Fwd:" at the front of the title and the household as the sender, no longer show on the card.',
  ] },
  { version: '1.65.2', date: '2026-10-18', notes: [
    'A link that opens the dashboard at the right panel: getturnup.com/dashboard?open=doors goes straight to Household cards, ?open=servicem8 to ServiceM8, ?open=profile to Who to expect, and so on. Instructions can now be one tap instead of scroll, open Setup and settings, find the panel.',
  ] },
  { version: '1.65.1', date: '2026-10-18', notes: [
    'An email forwarded from an iPhone now lands on the card properly. iPhone Mail starts every line of a forward with a > mark, and the card stopped reading at the first one, so a live test filed a Royal Mail dispatch as coming from the person who forwarded it, as Ordered, on the forward\u2019s own date, with the word Receipt as its reference. Now it reads the shop as the sender, On the way, the day the shop gave, and the Royal Mail tracking number with a link to Royal Mail\u2019s own page.',
    '"Marked as dispatched" reads as on its way. A reference always has a number in it. Where a shop posts by Royal Mail and links to Royal Mail\u2019s tracking page, that number and that link are used, and the button says Track with Royal Mail; the shop is still who said it. The wrong row from the first try is replaced the next time the same email is forwarded.',
  ] },
  { version: '1.65.0', date: '2026-10-18', notes: [
    'A customer with no notifications still hears about the moments that matter. If no push reached them, they get an email instead when you set off, if the window is missed, and with the day-before ask. It goes through ServiceM8, from your own address, to the email on the ServiceM8 job, and it shows in the job diary. Once each per job, and it never mentions a time.',
    'Off until you switch it on: Setup and settings, ServiceM8, Email when notifications are off. Send me a test sends the set-off email to an address you type, so you can see exactly what a customer gets. Below it, the last few sends, including any job with no email on it.',
    'The missed-window notice now reaches the customer even when no trade phone is registered for nudges. Before, the window-started nudge waited for ever for a phone to take it and blocked the missed notice behind it.',
    'The day-before nudge to your phone now says when the ask went by email, so you only need to text the link if you want to be sure.',
  ] },
  { version: '1.64.1', date: '2026-10-18', notes: [
    'Gmail\u2019s confirm-forwarding email now shows on the card. Before Gmail will forward to a new address it sends a code to that address, which is the card\u2019s letterbox: it was not a delivery, so it was dropped, and Gmail waited for a confirmation nobody could see. Now the card shows One step left, the code, and a Confirm in Gmail button, and the notice goes once a delivery email arrives. The /join card screen also says how to set up Gmail, starting with one email forwarded by hand.',
  ] },
  { version: '1.64.0', date: '2026-10-18', notes: [
    'The household card reads the email inside the forward. Every card email is a forward, and until now the card read the wrapper: a live test on a household card showed Me as the sender and Fwd: Dispatched as the title. Gmail, Apple Mail and Outlook forwards are unwrapped first, a forward of a forward included, so the card shows Samsung UK and the subject they wrote.',
    'Dispatched is on its way, never arrived. A Samsung Dispatched email said the order should be delivered to your address, and the card filed it as arrived. The subject is now read before the body, since the headline names the stage the email is about, and arrived means only what is said after the event: delivered, left with someone, in your safe place.',
    'An order confirmation goes on the card as Ordered instead of being dropped. The shop\'s order number ties its three emails together, so order, dispatched and delivered move one row forward. An order for an e-ticket, a gift card or a download stays off: nothing comes to the door.',
    'Titles name the thing, not the stage: Dispatched: and Delivered: come off the front, since the card already says the stage above the title. A title made up because the first email named nothing (Samsung UK order) gives way to the first later email that does.',
  ] },
  { version: '1.63.0', date: '2026-10-18', notes: [
    'A household can make its own card. At the end of the home path on /join, pick a name for it and tap Make my card live: it becomes a real link for everyone who lives there, to open and share. Only the name goes on the card. Its forwarding address comes back once, is kept on that phone, and is shown only when the letterbox is actually receiving.',
    'The letterbox steps were wrong, and are fixed. They said to turn on a catch-all on in.getturnup.com; Cloudflare only allows a catch-all on the main domain, so it could never have worked. Every card now gets cards+<its key>@in.getturnup.com, and one Cloudflare rule for cards@ with plus-addressing switched on takes them all. The dashboard\u2019s steps say so, and the whole job is one Cowork paste.',
    'The poster pictures are re-shot from today\u2019s app: 13 phone screens and all 29 frames, from a new script, so they can be redone whenever a screen changes. The homepage\u2019s Send it in one tap picture had shown a test address (127.0.0.1) since v1.58.0; it now shows getturnup.com, and both capture scripts put the real address in before every shot.',
  ] },
  { version: '1.62.0', date: '2026-10-17', notes: [
    'The homepage no longer scrolls sideways on a phone. One section, the wallet drawings, pushed the whole page out to 917 pixels wide on a 375-pixel phone, so every section below it was cut off at the right edge. Every page was measured at three phone widths; the homepage was the only one wider than the screen.',
    'Getting on the list is now a card that builds itself: /join. Pick trade or home, and each answer files onto a card above as you go, with a tick and an Edit. Your postcode puts a map up and you drag the map until the pin is on your door; a photo shows as a picture, not a file name. Email is step one and that is the sign-up; everything after has a Skip. Only your name, email, trade and the first half of your postcode are sent. The pin, the photos, who else lives there and a work address stay on your own phone.',
    'Two new pages: /for-trades, one job start to finish as the screens that do it, and /for-homes, the household card, which the homepage did not mention at all. Both are linked from the top of every page.',
    'Search engines are now told to keep out of household-card links (/h/) and ServiceM8 claim links (/j/) as well as job links. Both pages already said noindex themselves; the second lock was missing. There is also a sitemap of the public pages, so the new pages can be found.',
    'The privacy page now lists the waiting list, and four services it had missed: Anthropic for the Ask box, DVSA and DVLA for the van lookup, and postcodes.io and OpenStreetMap for the map on /join.',
  ] },
  { version: '1.61.0', date: '2026-10-17', notes: [
    'The privacy policy is a page, not a draft. getturnup.com/privacy, linked from the homepage footer, which is what a store listing actually takes: a public URL. It is written from what the code does rather than from a template \u2014 what is held, who can read it, and the rule that the page carries what the trade told the customer and never what the customer told the trade \u2014 so if a line in it and the code ever disagree, the line is the bug. One of the three things the listing said it was waiting on.',
    'Read in ServiceM8\u2019s store rules while writing the listing, and worth knowing before move 3 goes further: an add-on may not take a payment between a trade and their customer inside a ServiceM8 interface. Pay-to-book and paid-on-the-page are both parked behind the pilot already, so nothing changes today \u2014 but those two ideas and a store listing pull against each other, and an external payment link is the shape that survives both.',
  ] },
  { version: '1.60.1', date: '2026-10-17', notes: [
    'The five-minute sweep now writes one line to the log each time it runs, saying who called it and how many jobs it checked. Without it a sweep that ran quietly left no trace, so nobody could see whether the schedule was keeping time. Counts only; no names.',
  ] },
  { version: '1.60.0', date: '2026-10-17', notes: [
    'A day is not a time. A job booked for a day with no hours was treated as if its window began at midnight: your phone buzzed in the small hours, the customer\'s page said the window started at 00:00, and at ten past two the customer was told their window had been missed. With the sweep now every five minutes that would have happened every night. Only hours you actually set or agreed count as a window now; ServiceM8 bookings, which always carry their times, are unchanged. The customer\'s times on that row also go through the one date formatter, so phone and server agree.',
    'The ServiceM8 add-on listing, ready to paste: the short and long description written to ServiceM8\'s store rules, four real screenshots with an invented trade and customer, the icon, and a manifest checked against ServiceM8\'s own schema, served at /servicem8/manifest.json. The add-on now asks ServiceM8 for two permissions instead of three; it never used the third. A privacy policy is drafted from what the database actually holds, for the owner to agree. A public listing waits on three things the listing says plainly: an account per trade, that privacy page, and a support mailbox.',
  ] },
  { version: '1.59.0', date: '2026-10-17', notes: [
    'Your job on your lock screen, written and waiting on Apple, now on main rather than on its own branch. native/ holds the iOS app: the dashboard in a native window, and the job you are on as a Live Activity, with the stage, the time it was tapped, the note, and On site, Paused, Back on site and Job done buttons on the lock screen and in the Dynamic Island. A button is a real tap: the same record, the same buzz to the customer, the same line in ServiceM8. Written 15 Oct; merged 17 Oct on the owner\'s go.',
    'In a browser nothing changes: the dashboard\'s half is a no-op outside the app. The lock-screen buttons sign in with a token the app fetches from the dashboard, so the operator check accepts that token as well as the cookie: the same secret, the same thirty days. It compiles on a Mac runner the day the Apple Developer membership is active; until then the iOS build job does not run.',
  ] },
  { version: '1.58.0', date: '2026-10-17', notes: [
    'The pictures are of this month\'s app. Every small picture on the homepage, the dashboard\'s setup panels and the roadmap (the status card at each stage, each row of the customer\'s page opened, the stage buttons, the send box, the new-job form, the sign-in, the plate, the household card) and the phone at the top of the homepage were photographed before the flat look, so for a week the site showed a product that no longer existed. All re-shot from this build, in flat frames: the one corner radius and a hairline. The trade\'s screens are now photographed live by the capture script, signed in against the seeded database, instead of cut by pixel box from captures made weeks earlier.',
    'The household card says less and shows more: no sentence under the heading, and an empty card shows one example row so a household sees what forwarding does before doing it. On the dashboard, Household cards shows the card itself. The local seed now says so loudly when a stale database client skips the card, which is how three diaries photographed one that said it had expired.',
    'The review link in pictures: under Who to expect the Google review field sits under the row every customer sees after Job done, and How did it go? says one line, a review helps most, a note reaches the trade alone. Both doors stay open to everyone.',
    'The diary records the pictures too. Its full-page shots were taken from the top of the page, so every picture below the fold was still waiting to load: every homepage diary until now has empty frames where the pictures are. It scrolls the page first.',
    'What this could become, in pictures: every roadmap item that has a screen shows it; a row is a picture, a name and a chip, and the sentence opens on a tap. The live list is folded behind its count, on the roadmap and on the homepage, where it was a screen and a half of chips on a phone.',
  ] },
  { version: '1.57.0', date: '2026-10-17', notes: [
    'The words catch up with the app (Standing Rule 24). Five things that work today were still filed as ideas or as waiting on a key: the day-before reminder that answers back, the review ask two hours after Job done, running late in one tap, ServiceM8 following the job, and the card moving itself on a ServiceM8 check-in. All five are live on the roadmap now, under Working now with the window-missed message and customer-not-home, which were live but filed among the big ideas: 38 live in all. The van lookup says what is true: DVSA approved the key on 14 Oct and three settings in Vercel are what is left.',
    'The business plan reads the app as it is, merged from the plan branch and then corrected against the live site: ServiceM8 connected since 9 Oct, nudges every five minutes, the Apple enrolment under review, and the letterbox honest about itself: getturnup.com is on Cloudflare but Email Routing for in.getturnup.com is not on, so nothing arrives yet. The owner\'s taps are the four that are actually left: ring Apple, start the thirty-day count, the DVSA keys, the ServiceM8 developer account. The homepage\'s not-built strip no longer shows the card moving itself, because it is built.',
  ] },
  { version: '1.56.0', date: '2026-10-17', notes: [
    'Nudges on time. The sweep that notices a window has passed, asks the day-before question at 4pm, asks how it went and follows every ServiceM8 booking was meant to run every five minutes. GitHub ran it about every four hours, so all four fired hours late. It now runs on Vercel\'s own scheduler every five minutes, with the GitHub job kept as a half-hourly backup. Two callers cannot send anything twice: every nudge is sent once and paced inside the sweep.',
  ] },
  { version: '1.55.0', date: '2026-10-14', notes: [
    'Turn on forwarding says where it has got to, and checks itself every twenty seconds. Switched on here, the domain is on Cloudflare, mail points at Cloudflare, something has arrived \u2014 each one asked of the internet rather than assumed, so setting this up stops being four things done blind in four different websites.',
    'Asked of two DNS-over-HTTPS resolvers, not the server\u2019s own, which in the container this was written in answered ENODATA for records that plainly exist. A step somebody HAS done must never be drawn with a cross because a lookup failed, so unknown is its own state and draws the same empty circle as not-yet.',
    'Something has arrived is a demonstration, not a claim: it counts what actually reached the letterbox and says what became of the last one \u2014 filed as OUT_FOR_DELIVERY, not an arrival, or arrived but no card address in it. Those are three different problems with three different fixes, and before this they all looked like silence.',
    'The nameserver half is written out as a Cowork job in docs/cowork-nameservers.md, per the standing rule that clicking through a console is a paste, not a step list.',
  ] },
  { version: '1.54.0', date: '2026-10-13', notes: [
    'Paused says when you expect to be back. Tap Paused and the card asks: 30 min, 1 hour, 2 hours, after lunch, later today, tomorrow, another day. The customer\'s page reads Paused at 10:40 and Sam says: back in about an hour, said at 10:40 — your words, with the time you said them, never a time the product worked out. Once the hour has gone it says that was 11:40, still paused, taking longer than they thought, rather than keep promising.',
    'One tap goes to the four places about 30 minutes late already goes: the card, a push to the customer, the record, and the ServiceM8 diary. Leaving Paused clears it. Tomorrow and another day carry no clock time at all; the hours for that come under When suits you? like any other window.',
  ] },
  { version: '1.53.0', date: '2026-10-13', notes: [
    'Turning forwarding on is one button and two Cloudflare steps. It was four steps and two of them needed a laptop \u2014 an environment variable in Vercel plus a redeploy, and a Worker deployed with a terminal. Asked twice more to just set it up, which is the same signal as the push script being run none of the four times it was asked for, so two steps were deleted rather than explained again.',
    'Switch it on writes the password itself, to a row, so there is no Vercel visit and nothing to redeploy. The environment variable still wins wherever it is set.',
    'And the Worker is handed over finished, with the address and the password already in it, to paste into Cloudflare\u2019s own editor in a browser. Pressing the button twice keeps the same password rather than quietly stranding a Worker that is already deployed.',
    'What is left is a Cloudflare account and a nameserver change. Nothing can delete those: one is an account somebody has to own, the other is a domain somebody has to prove they control.',
  ] },
  { version: '1.52.0', date: '2026-10-13', notes: [
    'A revised promise is shown as revised, and the original is kept. Move the hours and the customer\'s page says Revised 10:02, they first said between 09:00 and 11:00; agree their counter and it says changed at your request; withdraw the hours and it says so, with the day standing. Move the day and Booked for says which day it was first. Nobody is told the new time was always the time.',
    'Every change is a line in the record: Hours changed from between 09:00 and 11:00 to between 14:00 and 16:00, Moved from Tuesday 13 October to Wednesday 14 October, in ServiceM8 or on the dashboard alike. The dashboard shows the same words under the window, so you know what they are reading. The first hours are written once and never overwritten; scripts/check-public-shape.mjs proves a customer\'s counter can never become them.',
  ] },
  { version: '1.51.0', date: '2026-10-12', notes: [
    'A flatter look, the same page. Geist is the typeface everywhere now, bundled with the app so an Android and an iPhone show the same product. Cards are a surface and a hairline, with no blur and nothing cast under them; buttons, fields and the stage control share one corner radius with the cards, instead of capsules sitting on rounded boxes. The stage colours, the wash and the rail are untouched: they mean something, and nothing here changes what they say.',
  ] },
  { version: '1.50.0', date: '2026-10-12', notes: [
    'Who is coming, with a face. Under Who to expect, Take or choose a photo opens the phone camera, squares the picture off on the phone and keeps it at 512 pixels, so nothing is pasted and nothing large is sent. The moment you tap On my way the customer\'s card shows your face, your name, the van and the plate; at On site it reads is with you. Before that, nothing, as before.',
    'The On-my-way notification now says who: Sam Hale is on the way, from Sam Hale Plumbing, look out for a White Vauxhall Vivaro, AB12 CDE, with the face as the icon where the phone shows one. The photo is served from the app itself, never pasted from a link, and Remove takes it down everywhere at once.',
  ] },
  { version: '1.49.0', date: '2026-10-12', notes: [
    'The letterbox. Turn on forwarding, under Setup and settings, is the four steps that make a forwarded delivery email land on a household card \u2014 the password made on your own phone and sent nowhere, then Vercel, then Cloudflare, then the Worker, each with the link to press and what you will see when it worked. It disappears the moment forwarding is on, like the push one.',
    'The Cloudflare Email Worker is written and in the repo, and it does almost nothing on purpose: it reads the raw message and posts it. Fifteen lines, no dependencies, and it never throws \u2014 a thrown Email Worker bounces the mail back to the carrier.',
    'Which means the fiddly half lives here, under test. src/lib/mime.js turns a raw email into four facts: quoted-printable, base64, multipart with the plain part preferred over the HTML one, an HTML-only sender, encoded subject lines, and a pound sign that is a pound sign and not mojibake. The card inbox is read from Delivered-To, never from To, because a forwarded email\u2019s To is whoever it was sent to in the first place.',
    'Checked on a subdomain rather than guessed: Cloudflare routes in.getturnup.com if the subdomain is added from the main domain\u2019s Settings page, which leaves your own email at getturnup.com untouched, now and later.',
  ] },
  { version: '1.48.0', date: '2026-10-12', notes: [
    'The household card tells a person from a parcel. Who is calling round comes first, under Coming to the door \u2014 your visit, the boiler engineer, the surveyor, the kitchen fitter. Everything that just lands sits under Also arriving. Nobody waits in for a jiffy bag and everybody waits in for an engineer, and one undifferentiated list made the reader do that sorting every time they opened it.',
    'The parser learned the difference. An email with a carrier or a tracking number is a parcel; one that says an engineer, surveyor, fitter or installer will attend is a person; a sofa with two men is goods with a crew. A boiler service and a window survey were both being dropped entirely before this, because no delivery phrase matched the way those senders write.',
    'Your own jobs go on a card and stay in step. Pick one from the dashboard under Household cards and it follows every stage you tap \u2014 On their way, Here now, Paused and why, Finished \u2014 including backwards, because a trade un-pausing a job is a fact and a carrier emailing out of order is not. Taking it off the card leaves the job untouched.',
    'Added by hand on purpose, never matched on address: two flats share a postcode, and a card is a link anyone can forward.',
  ] },
  { version: '1.47.0', date: '2026-10-12', notes: [
    'The /j/ page, the one a customer lands on from the ServiceM8 text, drawn like the page it leads to: the glass, the wash, Booked in\'s blue, and under the four-digit box a picture of the card the digits unlock, so the person who just tapped a link can see what they are typing for. The words are shorter. The dead ends (no such job, still a quote, cancelled) say one line and show the number to ring.',
  ] },
  { version: '1.46.0', date: '2026-10-12', notes: [
    'Switch link back on. A link switched off by mistake used to be dead and meant a new job; now Switch link back on sits where Switch link off was, under More, same size. A switched-off card says so in words — Link is off, the customer sees expired — rather than just going pale.',
  ] },
  { version: '1.45.0', date: '2026-10-12', notes: [
    'The pilot, in four numbers, under Setup and settings: links opened, “will someone be in?” answered, wasted trips, and “when are you coming?” calls. Three are counted from the rows for the last 30 or 90 days. The fourth is counted by a person, and the panel says so instead of guessing.',
    'The plan’s six moves reordered: move 1 is now proving it on the owner’s own jobs beside ServiceM8, with the four numbers as the gate. Housing and carriers share move 6, parked until move 1 has its numbers. The product page says what TurnUp is not: no job management, no invoice, no money held.',
    'The ask has a reader, confirmed. The plan’s last section carries, for the owner only, who is being sent it and why, six questions only he can answer, three things to watch, six ducks to tick before it goes, and the message in the owner’s own words with a copy button. The guest page never shows it.',
    'Every build updates the words. Standing Rule 24: the plan, the homepage, the guides and the instructions are part of every build and every nightly. scripts/check-current.mjs checks what a script can and must pass before a push; the nightly reads the rest.',
  ] },
  { version: '1.44.0', date: '2026-10-12', notes: [
    'The dashboard\'s setup panels get the homepage treatment: a picture of the part instead of a paragraph about it. Who to expect shows the row the customer opens; Booking terms shows what they read and tap; Nudge me shows the two buzzes as they land on your lock screen, in the words actually sent; Turn on notifications shows the row it switches on; ServiceM8 shows Check In beside On site; the attendance record shows three rows of itself. Every one of them is shorter.',
  ] },
  { version: '1.43.0', date: '2026-10-12', notes: [
    'After Job done: how did it go? The customer\'s page offers a Google review and a note to you, both always, to everyone. Nobody is sorted into happy and unhappy first; a one-person firm\'s reviews are worth having only if they are real. Two hours on, one notification, once per job.',
    'Your Google review link goes under Who to expect. The note comes to your phone and onto the card, and nowhere else; the page says only that one was sent.',
  ] },
  { version: '1.42.0', date: '2026-10-12', notes: [
    'The card comes first. The owner\'s call: the wallet card is the thing to show, so it is now the hero — largest, before the phone — with the headline "One card in their wallet. Not a pile of emails." The whole card section follows straight after. The Now panel is the inbox a booking turns into, five emails deep, beside the one card that moves.',
  ] },
  { version: '1.41.0', date: '2026-10-12', notes: [
    'The household card. One link per door, with everything coming to it on one list: your visit, the sofa, four parcels, whoever is booked to call round. A job link answers where is my plumber; this answers what is happening at my house this week, which is how the person living there already thinks about it.',
    'It fills itself from forwarded email. A delivery email forwarded to the card\u2019s own address is read for who it is from, what stage it is at and what day they said \u2014 thirteen UK carriers matched on the sending domain, because a subject line can claim to be Royal Mail and a domain has to pass SPF. Anything that is not an arrival is dropped.',
    'The row Shop drops: a sofa with two men and a Tuesday window and no tracking number anywhere. Those emails say we will deliver and a date, so that is what is read, and the card carries them alongside the parcels.',
    'Every date is attributed \u2014 Evri said today, Loaf said tomorrow, 12:00\u201316:00. The product still never works out an arrival time; it repeats what the sender said and names them.',
    'Two separate secrets per card, on purpose: the link is the read half and goes to the customer, the forwarding address is the write half and goes in a mail rule. Neither is ever on the card, so a link passed round a family group chat cannot be used to post onto somebody\u2019s door. scripts/check-public-shape.mjs now proves it.',
  ] },
  { version: '1.40.0', date: '2026-10-12', notes: [
    'The customer\'s page says how fresh it is. The line at the bottom now reads Updated 10:42, checks again every half minute, or Last checked 10:40, not reaching the server just now. And during the visit, if your phone has not reached the server for a quarter of an hour, the card says so with the time — out of signal, most likely — instead of passing a quiet phone off as a live feed. The dashboard sends a heartbeat once a minute while it is open to make that true.',
    'The customer can be the late one. Running late yourself? on their page: about 15, 30 or 60 minutes, or I am there now. Your phone buzzes with when to expect them from; the card says it in amber. Their minutes stay with you and on their phone, never on a forwarded link.',
  ] },
  { version: '1.39.0', date: '2026-10-12', notes: [
    'A tap with no signal still counts. Every stage tap and every No one home record from the dashboard is saved on the phone when the network is not there — with the time of the tap and the fix the phone had — and sent in order the moment signal comes back. The strip says No signal and how many taps are waiting; the card says Saved on this phone. Nothing is ever dropped.',
    'The customer reads the true time: Set off at 07:42, sent 07:58 when back in signal. The event keeps both clocks, and the job diary line says the same.',
    'Done in the page, not the service worker, because Safari on iPhone has no background sync; a home-screen app flushes every time it is opened.',
  ] },
  { version: '1.38.0', date: '2026-10-12', notes: [
    'A booking that moves in ServiceM8 after the customer was texted earns them one more text: the new hours, the old ones in brackets, the same link. Sent through ServiceM8 once the move has settled for ten minutes, so a job dragged three times in two minutes is one text, not three. Only while the job is still Booked in, and never for a booking taken off the diary — that is yours to say.',
    'What the customer was last told is kept on the card. The window follows a move at once, as before; the message now follows it once.',
  ] },
  { version: '1.37.0', date: '2026-10-12', notes: [
    '/with-servicem8 gets the homepage treatment: fewer words, and a picture of the part for every step. The customer\'s status card at each stage, the claim screen, the linked card and the ServiceM8 panel are cut from the existing captures (scripts/capture-home-crops.mjs, ONLY=sm8); the ServiceM8 app\'s four buttons and the booking text are drawn at a readable size instead of inside a 150px phone. What moves the card is a row per stage: what you press, an arrow, what they see.',
    'The wallet section on the homepage, second pass at the owner\'s request: it opens with three phones — the lock screen, double-click, the wallet open with the card in the stack, the card tapped — so a visitor sees it is a card before anything is explained. The pulled-apart card, the four stage cards and the back now stand in three dimensions on the same dark floor as the hero, instead of lying flat.',
  ] },
  { version: '1.36.0', date: '2026-10-12', notes: [
    'Follow every booking. Switch it on under ServiceM8 and every booking made in ServiceM8 gets its TurnUp card straight away, and ten minutes later the link is texted through ServiceM8 unless ServiceM8\'s own confirmation already texted it. One text per job, ever; a job dragged onto the calendar is no longer a job nobody told. The Booking Confirmation automation becomes optional.',
    'Because the card now exists from the moment of booking, the day-before ask, the nudges and the terms work for every ServiceM8 job, not just the ones whose customer opened the link first.',
    'This week in ServiceM8 says TurnUp sent it, with the time, when it did.',
  ] },
  { version: '1.35.0', date: '2026-10-12', notes: [
    'The homepage says less and shows more. Every row the customer can open and every part of the dashboard the trade taps is now a picture of that part — cut from the real screen at 2x by scripts/capture-home-crops.mjs, never a whole phone — under a label of a few words. The paragraphs are gone; the two walkthrough strips went with them.',
    'The wallet card gets the section it always needed: the card pulled apart with each band named (the same bands buildPassJson signs), the same card at all four stages, its back, and the lock screen the notification lands on. Drawn from PassCard, so it cannot drift from the real pass. The badge still says it: built, waiting on Apple. The buzz on the lock screen is live today; the card updating itself in Wallet is not.',
    'Instead of this, with this: the “between eight and six” text beside the status card, as two panels rather than two paragraphs.',
  ] },
  { version: '1.34.0', date: '2026-10-12', notes: [
    'Send the link via ServiceM8. The booking text now goes out through ServiceM8 itself from This week in ServiceM8: one of the account\'s SMS credits, and it lands in the job\'s own SMS history and diary exactly as if ServiceM8 had sent it. Checked against the live account on 12 Oct: the API key may send. Text it from my phone stays as the free way.',
    'TurnUp as a ServiceM8 add-on, built and waiting on an App ID: Connect ServiceM8 as an add-on under Setup and settings, and from then on set off, on site, paused, done, terms agreed, no one home, running late and every customer reply are written into the job diary as a line from TurnUp. The diary is the one thing the key cannot write; the add-on can. docs/servicem8-add-on.md has the sign-up steps.',
    'Texts are plain ASCII: ServiceM8\'s SMS endpoint turns a curly quote into question marks or a second credit.',
  ] },
  { version: '1.33.0', date: '2026-10-12', notes: [
    'This week in ServiceM8, on the dashboard: every booking in the next seven days, whether ServiceM8 sent the link by text or email, whether the email was opened, and whether the TurnUp card exists yet. Read from ServiceM8\'s own email and SMS history, which the API key turns out to be allowed to see. Nothing is guessed.',
    'Where ServiceM8 sent nothing, one tap: Text the link opens Messages with the number and the words in. Make the card now builds the card before the customer opens the link.',
    'The box can answer "did the link go?" now. It is given the same ServiceM8 lines, and says why a confirmation usually fails to send: a booking not made from the job card with the tick, or the automation\'s text method off.',
    'docs/design/servicem8-connection.md: what the key can and cannot do, and the plan for the full connection — a private add-on so TurnUp can send the text through ServiceM8 and write to the job diary.',
  ] },
  { version: '1.32.0', date: '2026-10-12', notes: [
    'The day-before ask now carries the answers. The card on the customer\'s page — tomorrow, these hours, still fine? — has three replies: still fine, someone else will be in, need to move it. Each one lands on your card and your phone. Still fine and someone else also answer will someone be in?, so one tap does both. Two-way reminders are the best-evidenced cut in no-shows there is; the reply is what makes it two-way.',
    'Need to move it asks; the new hours are still yours to offer and theirs to agree under When suits you?.',
    'The card says Confirmed 18:02, Someone else will be in, or Wants to move it, beside the terms chip.',
    'On /with-servicem8: the optional Booking Reminder text that gets them to open the page the day before.',
  ] },
  { version: '1.31.0', date: '2026-10-11', notes: [
    'The day before the job, the customer is asked whether anyone will be in. Once, at four in the afternoon in the trade\u2019s own time, never again for that job. A notification if they switched one on, the page asks either way, and the timeline records that it was asked.',
    'If none of the customer\u2019s phones can be reached, the trade is nudged to text the link instead, because an ask that reaches nobody is not an ask. The dashboard card says asked, no answer yet. The answer itself stays between the two of them, as before.',
    'The first thing built for the pilot on the owner\u2019s own jobs: the moment a courier gets right and a trade never had.',
  ] },
  { version: '1.30.0', date: '2026-10-11', notes: [
    'The attendance record. Every set-off, arrival and finish the trade has tapped, as a CSV with one row per visit: a second visit after a pause is a second row, and a job nobody went to is a row that says so. Under Setup and settings, last 30 or 90 days.',
    'Built for the first enterprise wedge, social housing: a landlord pays its contractor per visit and is marked by the Ombudsman per missed one, so the taps are the proof. Names, the address and the job go in the file; nothing the customer told the trade does, and nor does the link. scripts/check-attendance.mjs holds that line.',
    'Two roadmap items, both honest about their state. Pay to book: a call-out charge or a deposit of any size from the card, after the pilot on the owner\u2019s own jobs. Escrow: later, through a regulated partner, never TurnUp holding funds.',
    'The order was reset the same day: the real pilot is the owner\u2019s own jobs beside ServiceM8. White Horse is parked until that has run.',
  ] },
  { version: '1.29.0', date: '2026-10-11', notes: [
    'Booking terms, agreed from the customer\'s phone. Before the visit, their page now carries three short paragraphs: how much notice you ask for to move or cancel, what happens if nobody is in, and their 14-day right to cancel. One tap, Got it, go ahead, records the time and the exact words. That tap is the express request the Consumer Contracts Regulations want before work starts inside the fortnight, and the thing that makes a short-notice charge enforceable at all.',
    'Booking terms on the dashboard: the notice period and a short-notice charge in whole pounds, or none. A preview shows the exact words every customer reads. TurnUp states a charge and records the agreement; it never takes one.',
    'The card says Terms agreed 10:22 or Terms not agreed yet until the job is done. The sorry-we-missed-you note and page now say the figure the customer agreed, if they agreed one, and still say nothing is charged otherwise.',
    'The ServiceM8 confirmation line now says the terms and the right to cancel are on the link, which is what makes the link the durable copy the regulations ask for.',
  ] },
  { version: '1.28.0', date: '2026-10-10', notes: [
    'Customer not home, in one tap. "No one home" on the card starts the clock and takes a location fix; knocked, called and texted are logged as you do them; a photo of the door if you want one; "Leave and tell them" sets the card to Paused with a plain note. The customer\'s page says sorry we missed you, with what was tried and when, and three replies: I am here now, later today, another day. Nothing is charged from here; the photo never leaves the dashboard.',
  ] },
  { version: '1.27.0', date: '2026-10-10', notes: [
    'Ask it or tell it. One box at the top of the dashboard: "what is on today?" gets an answer; "on my way to Whitfield", "paused on Hale, waiting on the cylinder" or a pasted booking email gets a card to confirm. It proposes, you tap, the same routes as the form do the saving. It cannot promise a time.',
    'The dashboard stopped being a wall of buttons. Navigate and the door notes show when you are heading there; the link, hours, photos and note are under More; the seven setup panels are shut under Setup and settings.',
    'It teaches itself one tip at a time: no jobs yet, a link nobody has opened, no name on the card, nudges not on. Got it, and the next one waits its turn.',
    'Invisible until ANTHROPIC_API_KEY is set. No key, no box, and the New job button is back.',
  ] },
  { version: '1.26.0', date: '2026-10-10', notes: [
    'A window passing is noticed even when nobody has the page open \u2014 a scheduled check every five minutes',
    'Before this, nudges only ran while a customer was looking, which is the one time you do not need telling',
  ] },
  { version: '1.25.0', date: '2026-10-10', notes: [
    'When the window is missed, the customer is told. Ten minutes after a window ends with nobody On site and no late estimate still running, their page says so plainly — sorry, that is on us — and offers three choices: I will wait, later today, another day. Their choice lands on your card and your phone. You propose the new window; the product never invents a time.',
  ] },
  { version: '1.24.1', date: '2026-10-10', notes: [
    'Notifications are live \u2014 a real one reached a real phone, so the roadmap says live rather than ready',
  ] },
  { version: '1.24.0', date: '2026-10-10', notes: [
    'Nudge me has a Send a test to this phone button \u2014 tap it, your phone buzzes, no job to move',
    'It says how many phones it actually reached, so nothing arriving is visible rather than silent',
    'Nudge me now says plainly that it is YOUR phone; customers switch their own on from their link',
  ] },
  { version: '1.23.0', date: '2026-10-10', notes: [
    'Turn on notifications from the dashboard \u2014 no terminal, no laptop, all on your phone',
    'It makes the keys on your own phone and sends them nowhere, then links you straight to Vercel',
    'The box disappears by itself once the keys are in, which is how you know it worked',
  ] },
  { version: '1.22.0', date: '2026-10-10', notes: [
    'Are you still coming? When a window the trade gave has started and the card has not moved, the customer gets one button. It buzzes the trade\'s phone; the trade answers from the card with On my way or about how late, and the answer shows on the customer\'s page with the time it was said.',
    'Nudges to the trade without being asked: once when the window starts with the card still Booked in, once when it ends with nobody On site, and every ten minutes while a question goes unanswered. Nudge me on the dashboard registers the phone.',
    'Running late is a one-tap answer on the card: 15, 30 or 60 minutes. Written to the card with the time, pushed to the customer. Never worked out by the product, always said by the trade.',
  ] },
  { version: '1.21.0', date: '2026-10-10', notes: [
    'The what3words box no longer assumes you already know your three words',
    'A link straight to their map, which finds you \u2014 then copy them back',
    'You can set three words from the van too; the dashboard field was read-only',
    'One tap fills it in automatically the day there is a what3words key',
    'Fixed: the diary had quietly stopped recording the app \u2014 three nights of it',
  ] },
  { version: '1.20.0', date: '2026-10-09', notes: [
    'The plan has a spine: three moats a big firm cannot build in a sprint, six moves in order with a gate each, five rivals with the move that beats each, and seven sectors where a regulator already prices a missed visit.',
    'Pricing turned round a third time, and this one holds: free for every sender, homes, trades and small firms, no cap and no activation. An enterprise pays per card. Why they pay is Ofgem, Ofcom, Ofwat and the Ombudsman, not the card.',
    'Seventeen sections now. The ask for the friend is one line: read it and say what is wrong.',
  ] },
  { version: '1.19.0', date: '2026-10-09', notes: [
    'Pricing turned round: the card and the job are free with no cap. A trade who is a month in and past a number of jobs pays a small activation charge and a small yearly one, card details on file. Everything else is a bundle (Get paid, Look the part, Run the day) or a tier, paid monthly or weekly.',
    'Get paid takes the payment on the job, with a small margin on top of the processor. Referrals earn free jobs before activation, the Dropbox way.',
    'Five pricing decisions open on the page: the jobs threshold, the activation charge, the yearly fee, the payments margin, the referral reward. The calculator stacks all four revenue lines.',
  ] },
  { version: '1.18.1', date: '2026-10-09', notes: [
    'Two more decisions landed: Home is free to five cards a month, and Trade is five pounds a month. The tiles, the chips and the calculator follow.',
  ] },
  { version: '1.18.0', date: '2026-10-09', notes: [
    'The plan grew up: fifteen sections, a wallet-card page, a timeline read from this changelog, and an ask written for one person who builds apps.',
    'Pricing has a shape: Home is free forever up to a number of cards a month, Trade and Crew pay for the trade features, Partners is quoted. The cap and the Trade price are decisions on the page, and nothing is charged yet.',
    'A share link: /plan/<code> opens the plan read-only with no sign-in. Copy it from the rail. Set PLAN_SHARE_CODE to off to stop it.',
    'The financials chart drew no bars and the big figures overflowed their tiles. Fixed.',
  ] },
  { version: '1.17.2', date: '2026-10-09', notes: [
    'Four decisions landed on the plan: free while customer zero, a new Ltd will own it, RIBA is the first template after ServiceM8, and raising money stays undecided.',
  ] },
  { version: '1.17.1', date: '2026-10-09', notes: [
    'A card that follows a ServiceM8 job now carries the booking window too: "Between 09:00 and 11:00" from the ServiceM8 booking, agreed, and moved when the booking moves. ServiceM8 stamps times in UK local time with no offset, so they are read as Europe/London rather than trusted as UTC.',
  ] },
  { version: '1.17.0', date: '2026-10-09', notes: [
    'Paid on the same page: a new idea on the roadmap and a frame under Where it is going. When the card says Job done, the bill is under it and Apple Pay settles it there; the receipt stays with the job.',
    'The trade-side homepage frames are re-captured with the new stage control.',
  ] },
  { version: '1.16.3', date: '2026-10-09', notes: [
    'The stage control on a job card is one track with five equal cells, icon over a short label, instead of five pills that wrapped and clipped at phone width. Will: "the buttons lose their integrity".',
  ] },
  { version: '1.16.2', date: '2026-10-09', notes: [
    '/with-servicem8 has a screen beside every sentence: real captures where the screen is TurnUp\'s, drawings of ServiceM8\'s own screens where it is theirs, and a What you get row at the top.',
    'A dashboard card that follows a ServiceM8 job now says so.',
  ] },
  { version: '1.16.1', date: '2026-10-09', notes: [
    'The link ServiceM8 can send itself. /j/<job number> goes in the booking confirmation template; the customer proves it is their booking with the last four digits of their mobile, once, and the card appears on the dashboard already linked to the job.',
    '/with-servicem8: the page that says what the connector does in its current form, the exact template line, and a ten-minute test. Linked from the homepage.',
    'Two ideas logged from Will: a diary on every job, and WhatsApp as the place bookings actually arrive.',
  ] },
  { version: '1.16.0', date: '2026-10-09', notes: [
    'The business plan lives here now, at /plan, behind the same sign-in as Jobs. Twelve sections, arrow keys to move, P to present. Every figure says whether it is a fact with a source, a working estimate, or a decision only the owner can make.',
    'Pricing, the owning company and whether to raise money are open questions on the page, not answers.',
  ] },
  { version: '1.15.4', date: '2026-10-09', notes: [
    'Ready for Apple. The signing code wanted a .p12 the library cannot read, and the pass carried no icon, which Wallet rejects without a word. Both fixed, and tested end to end with a stand-in certificate chain.',
    'bash scripts/apple-wallet.sh — two commands turn Apple\'s certificate into the six settings, no Keychain Access.',
    'Add to Apple Wallet appears on the customer page the moment the deployment can sign a pass, and only on an Apple device.',
  ] },
  { version: '1.15.3', date: '2026-10-09', notes: [
    'The CarPlay and Android Auto frames are photographs from the driver\u2019s seat now, with the app on the real screen \u2014 the UI pressed onto the glass in its perspective, still crisp text',
  ] },
  { version: '1.15.2', date: '2026-10-09', notes: [
    'CarPlay in the van and Android Auto in the car, drawn from the driver\u2019s seat: the map, Navigate to the address, the four stage buttons',
    'The TurnUp mark on the dashboard goes to the homepage, and the homepage\u2019s Sign in comes back',
    'ServiceM8 needs one setting in Vercel now: the webhook secret is derived and new tables are created on deploy',
  ] },
  { version: '1.15.1', date: '2026-10-09', notes: [
    'Move my sign-in: the address you are signed in on vouches for you on the new one \u2014 no password, 90 seconds, this browser only',
    'The sign-in page says plainly that Face ID is per address, and points at the move',
    'CarPlay and Android Auto drawn on a car\u2019s screen in a dash, not a phone',
    'ServiceM8: waits and retries while the account is being switched on',
  ] },
  { version: '1.15.0', date: '2026-10-09', notes: [
    'ServiceM8 connector: add a job by its ServiceM8 number and the card follows the job \u2014 check in is On site, complete is Job done, check out early is Paused',
    'Robust by design: a webhook is only a doorbell; every event is checked against the job itself, every sync is idempotent, and a customer opening their page pulls the truth too',
    'A ServiceM8 panel on the dashboard: connected, listening, and what it did lately',
    'One command connects it: scripts/connect-servicem8.sh',
    'CarPlay on the roadmap, with its frame',
  ] },
  { version: '1.14.0', date: '2026-10-08', notes: [
    'The homepage tells both sides: pick \u201cI\u2019m the customer\u201d or \u201cI do the work\u201d and walk through that side in eight frames',
    'Either end, any job \u2014 the role swap is on the page, badged Next so nobody mistakes it for live',
    'Everything it does today, as one list that reads from the same file as the in-app roadmap',
    'Where it is going: six drawn frames, every one badged Next',
    'Twenty-six App Store-sized frames in all, each a real screen or an honest drawing \u2014 including a record of your home, and the step from tracker to the job itself',
  ] },
  { version: '1.13.4', date: '2026-10-08', notes: [
    'The wallet card on the homepage is pulled out of a stack in real 3D \u2014 the flat version stays in the dashboard',
    'Six App Store-style frames tell the story: sent by text, four words, will someone be in, find the door, your five buttons, in their wallet',
    'Every frame is rendered from the real screens, in a drawn phone with a status bar, from /preview/posters',
  ] },
  { version: '1.13.3', date: '2026-10-08', notes: [
    'The homepage finally shows the thing: the customer\u2019s page and the wallet card, before any words',
    '\u201cHow it goes\u201d is pictures now \u2014 your job card, their page changing across the day, and a paused job',
    'The wallet card is one drawing shared by the homepage and the dashboard, so it cannot drift from the real pass',
  ] },
  { version: '1.13.2', date: '2026-10-02', notes: [
    'Van lookup now uses the DVSA MOT history record \u2014 make, model AND colour from the plate',
    'DVLA closed new registrations; it stays as the fallback for anyone who already has a key',
    'The profile page says exactly which key to get, where, and that it must be used within 90 days',
  ] },
  // Added after the fact: 1.13.1 shipped without an entry, and a changelog
  // with a hole in it is worse than a late line.
  { version: '1.13.1', date: '2026-10-01', notes: [
    'Took the one-off database migration back out of the build',
    'The waiting list can be cleared, not just added to',
  ] },
  { version: '1.13.0', date: '2026-10-01', notes: [
    'It is called TurnUp now \u2014 renamed everywhere a person reads it',
    'A real homepage: what it is, what it will never do, and a working example to tap',
    'Trades can ask to be told when there is room; the list is on your dashboard',
    'The homepage is the only page search engines may see \u2014 every tracking link stays hidden',
  ] },
  { version: '1.12.0', date: '2026-10-01', notes: [
    'The jobs list is a day\u2019s run now \u2014 what you are on, then what is next, finished at the bottom',
    'A job shows who, where and the stage buttons; tap the row for the link, hours, photos and note',
    'New job is a button, not six empty boxes above the work',
    'Dashboard went from nine screens to under four',
  ] },
  { version: '1.11.0', date: '2026-10-01', notes: [
    'A job that is only booked now says the day on the card, not two taps down',
    'Agreed hours replace it once there are any \u2014 never both, the day is implied',
    'One command turns push notifications on: bash scripts/enable-push.sh',
  ] },
  { version: '1.10.0', date: '2026-09-30', notes: [
    'The page is a quarter shorter \u2014 less to scroll past before the thing that matters',
    'Tap any heading to open it; closed, each row says the one thing worth knowing',
    'Removed the notifications row until the keys are in, rather than open onto nothing',
    'The version line, the wordmark and the small print are now one line, not three',
  ] },
  { version: '1.9.0', date: '2026-09-30', notes: [
    'A window is now something you agree, not something you announce',
    'They can say "that suits" or ask for different hours, and say why \u2014 either end can start it',
    'Only an agreed window is stated as fact, or goes in a calendar as a real block',
    'What they ask for goes to you, never onto a page that can be forwarded',
  ] },
  { version: '1.8.0', date: '2026-09-30', notes: [
    'Drop a pin with one tap instead of pasting a Maps link \u2014 from either end',
    'You can drop it yourself standing at the door on the first visit, so the next one is easy',
    'Navigate now gives turn-by-turn to the exact spot, not a map centred near it',
    'If the phone is only sure to within a hundred metres it says so, rather than sending a van four doors down',
  ] },
  { version: '1.7.0', date: '2026-09-30', notes: [
    'Your customer\u2019s own answers are no longer on a page that can be forwarded',
    'A forwarded link used to carry the address, photos of the house and door, which door to use, the dog, the access notes, \u201cnobody is in\u201d and the time window \u2014 all at once',
    'Their own phone still remembers what they typed. Anyone else\u2019s gets a blank form.',
    'You still see every word of it on the dashboard, behind your password.',
  ] },
  { version: '1.6.0', date: '2026-09-30', notes: [
    'Your phone buzzes when they set off, arrive and finish — no app, no App Store',
    'On iPhone it needs the page added to the home screen first, and the page says so rather than giving you a button that does nothing',
    'The notification says who and what stage, and nothing else. Your address does not go on a lock screen.',
    'Needs one migration and a key pair before it works — run scripts/setup.sh',
  ] },
  { version: '1.5.0', date: '2026-09-29', notes: [
    'Dashboard brought onto the same iOS material as the customer page — glass cards, capsule buttons, proper fields',
    'what3words and a dropped pin open the map in one tap, both sides. A Navigate button on every job',
    'Photos of the house and the door, set on the first visit so the next one is easy. Your logo on the page',
    'DVLA lookup now says exactly what it needs when the key is missing, with the link to get it',
  ] },
  { version: '1.4.0', date: '2026-09-29', notes: [
    'The whole app redrawn to the current iOS look — translucent cards, the system font, proper dark mode',
    'Every emoji replaced with a drawn icon. They rendered in whatever style the phone shipped and made a finished page look unfinished',
    'Each stage now has its own colour and keeps it: blue booked, indigo on the way, amber paused, green done',
    'Fixed: dates were formatted differently by the server and the phone, which tore the page apart as it loaded',
  ] },
  { version: '1.3.3', date: '2026-09-29', notes: [
    'Customer page pruned: status up top, then rows that open on tap. The call button never hides.',
  ] },
  { version: '1.3.2', date: '2026-09-29', notes: [
    'WhatsApp the customer their link in one tap, beside the text button',
  ] },
  { version: '1.3.1', date: '2026-09-29', notes: [
    'Dark mode: the page background was pinned to the light colour, so the heading was invisible. Each theme now has a dark background of its own.',
  ] },
  { version: '1.3.0', date: '2026-09-29', notes: [
    'Wallet card shown three ways: in the stack, opened, on its own',
    'The whole roadmap in the app, with a way to vote on what gets built',
    'Dashboard restyled — no hard-coded greys, dark mode throughout',
    'Version number and theme on every page',
  ] },
  { version: '1.2.0', date: '2026-09-29', notes: [
    'Will someone be in? — four taps back from the customer',
    'Who is coming and what they drive, set up once',
    'Arrival window you can narrow through the day',
    'Where they are in the day: "you are 2nd today"',
  ] },
  { version: '1.1.0', date: '2026-09-28', notes: [
    'Face ID and Touch ID sign-in',
    'Apple Wallet pass built, waiting on a certificate',
    'Put it in my calendar',
    'The 2015 mark restored',
  ] },
  { version: '1.0.0', date: '2026-09-28', notes: [
    'One link per job, live',
  ] },
]
