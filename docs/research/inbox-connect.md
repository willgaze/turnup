# Reading the inbox like Shop does

*Researched 18 October 2026 from Google, Microsoft, ICO and vendor documentation, plus a few forum and news pieces, each one marked as such. Prices are the vendor's own unless marked **estimate**. Read beside `shop-competitive-landscape.md` (9 Oct). Nothing here has been built, and no OAuth app or account has been created.*

---

## Headline

**Build "Connect Gmail" as an Internal app on the owner's own Google Workspace first.** It needs no Google review, it replaces the content-compliance rule, and it tests the parser on mail nobody has forwarded.
**Next, add a tracking-number route** through an aggregator (Ship24: 10 shipments a month free, then $39 for 1,000). That way one dispatch email, or one typed number, keeps a card moving with no further mail.
**Do not take Gmail public until the parser has held up on real inboxes.** Public access to `gmail.readonly` means Google's restricted-scope verification plus a CASA security assessment every year. The cheapest lab has quoted about $540 to $1,800 a year (third-party figures, 2024 to 2025), and Google says verification "can potentially take several weeks". Outlook.com through Microsoft Graph has no comparable paid assessment and could go public sooner.

---

## How the others do it

| App | Mail source | Scope / method | Verified? CASA? | Source |
|---|---|---|---|---|
| Shop (Shopify) | Connected Gmail or Outlook, plus a personal forwarding address | Searches for keywords such as "tracking number" and "track your package"; scans the last 30 days, then "keeps checking". Exact Gmail scope **not public** | Not public. Its privacy policy says inbox data is not used "for advertising or marketing purposes", which is Limited Use language | [Shop Help](https://help.shop.app/hc/en-us/articles/360058869972-Automatically-track-orders), [Shop privacy](https://shop.app/privacy) |
| Klarna | Connected Gmail or Outlook ("Auto-track") | Asks the provider for emails selected "by sender address and keywords". Google and Microsoft accounts are asked to re-consent periodically | Not public | [Klarna UK help](https://www.klarna.com/uk/help/products-and-services/how-does-auto-track-work/) (read through a search summary, as the page renders in script), [FashionUnited, Aug 2022](https://fashionunited.uk/news/business/klarna-launches-feature-allowing-consumers-to-view-order-history/2022081664658) |
| Route | Connected inbox (Gmail; Outlook per a developer reply), plus forwarding to `tracking@orders.route.com` | "Route Bot pulls only the necessary information" | Not public | [App Store listing](https://apps.apple.com/us/app/route-package-tracker/id1449803898) |
| Parcel (iOS) | **No inbox connection.** Had a forwarding address ("Parcel Email") that relied on a Gmail filter, plus an Amazon integration | Forwarding is now "in the maintenance mode" and "no longer available for new customers"; the app recommends the share extension instead | Not applicable: no Google scopes | [Parcel Email help](https://parcel.app/help/parcel-email.html), [Gmail setup](https://parcelapp.net/parcel-email-gmail.html) |
| Deliveries (Junecloud) | **No inbox connection found.** "Mail to Deliveries" forwarding address (needs a sync subscription) | Reads the tracking number from a forwarded email. Messages are "stored for up to ten days and then deleted" | Not applicable | [Email service](https://junecloud.com/support/deliveries-ios/email-service.html), [Privacy overview](https://junecloud.com/support/deliveries-privacy-overview.html) |
| PayPal Package tracking (for comparison) | Connected Gmail and Outlook | "As of November 2024, you'll need to relink your Gmail account ... every 6 months." Says humans are "generally prohibited from reading" the data | Says it adheres to Google's User Data Policy | [PayPal help](https://www.paypal.com/au/cshelp/article/whats-paypal-package-tracking-help956) |
| AfterShip app (for comparison) | Gmail sign-up | Says it uses "Google's Restricted scope APIs" and follows Limited Use | Scope and CASA not stated | [AfterShip, 29 Jun 2026](https://support.aftership.com/en/tracking/articles/15441934-understanding-google-s-limited-use-requirements) |

**What the table says:** the two small independent apps, Parcel and Deliveries, never connected an inbox. They used forwarding, and Parcel has since closed forwarding to new customers. Inbox connection is done by firms large enough to carry a yearly security assessment. None of them publishes its Gmail scope, its CASA tier, what it paid or how long it took. **That is not public, and is not guessed at here.** The nearest public account of cost comes from two email-client makers (see "The rules").

---

## The rules

### Gmail scopes

| Scope | Class | What it reads | Source |
|---|---|---|---|
| `gmail.readonly` | **Restricted** | All messages and settings. Search (`q`) works | [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) (updated 10 Sep 2026) |
| `gmail.metadata` | **Restricted** | Labels and headers, "but not the email body". `q` "cannot be used" with this scope | [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [messages.list](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list) |
| `gmail.labels` | Non-sensitive | Labels only, no messages | [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) |
| `gmail.addons.current.message.action` | Non-sensitive | The open message's content "upon user interaction" in a Gmail add-on | [Add-on scopes](https://developers.google.com/workspace/add-ons/concepts/workspace-scopes) |
| `gmail.addons.current.message.readonly` | Sensitive | The open message and its thread, while the add-on runs | [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [Add-on scopes](https://developers.google.com/workspace/add-ons/concepts/workspace-scopes) |

**No scope limits an app to messages that match a search or a label.** `gmail.metadata` cannot read bodies, cannot search, and is restricted anyway, so it costs the same review as `gmail.readonly` and does less. A household's own filter plus label does not narrow the grant: the token can still read everything, and the label only tells the app where to look. Narrowing happens in our code (`q=from:(royalmail.com OR evri.com ...) newer_than:30d`). That is a promise we make, not a limit Google enforces, so it belongs in the privacy policy and the DPIA.

**Is a parcel tracker allowed at all?** Yes. Google's Gmail policy lists, as an approved use, "applications that use information from emails to provide reporting or monitoring services", for example apps that "track flights or package delivery statuses" ([Workspace API user data policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy), updated 3 Sep 2026).

**The six-month lapse.** A Google notice from 2024, quoted on a forum, says Gmail access granted to "reporting and monitoring apps will automatically expire after six months. Users must renew permissions" ([Make community, June 2024](https://community.make.com/t/gmail-access-via-oauth-starting-june-3-2024/46675), forum, secondhand). Google's current policy page does not repeat it. PayPal's relink rule above and Klarna's re-consent are consistent with it. **Plan for every household to reconnect twice a year.**

**The Gmail add-on route is lighter but manual.** An add-on with the non-sensitive `.action` scope can read the one email the household has open when they tap a button. Google says Gmail add-ons work "on both desktop and mobile clients" ([Gmail add-ons](https://developers.google.com/workspace/add-ons/gmail)). A public listing still needs Marketplace review, which "typically takes several days" ([Marketplace review](https://developers.google.com/workspace/marketplace/about-app-review)). One tap per email is the same effort as forwarding that email by hand, so this does not answer "households will not set up forwarding". **Not tested:** whether a public add-on works for personal @gmail.com accounts in the Gmail iPhone app.

### The three modes

| Mode | Who can connect | Google review | Catch | Source |
|---|---|---|---|---|
| **Internal** | Only accounts in the owner's Google Workspace or Cloud Identity organisation | None: "Internal Use apps" are exempt | Households cannot use it. Only the owner's own mailboxes | [When verification is not needed](https://support.google.com/cloud/answer/13464323), [Audience](https://support.google.com/cloud/answer/15549945?hl=en) |
| **External, Testing** | Up to **100 test users**, each named by email on the consent screen | None. Google shows a warning before consent | Refresh tokens **expire in 7 days**, so a tester reconnects weekly | [Audience](https://support.google.com/cloud/answer/15549945?hl=en), [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2) |
| **External, In production, unverified** | Anyone, but "limited to 100 new users until it is verified" | None yet | "Unverified app" screen. The "personal use" exemption covers "a small group of people you know personally", not strangers | [Unverified apps](https://support.google.com/cloud/answer/7454865), [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) |
| **External, In production, verified** | Anyone with a Google account | Brand verification, data access review, demo video, scope justification, then **CASA** for restricted scopes. Reassessed "at least every 12 months" | Cost and lead time, below | [Verification requirements](https://support.google.com/cloud/answer/13464321), [Restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification) (updated 19 Aug 2026) |

**What restricted verification takes:**
- **Google's stated times:** brand verification "2-3 business days" when branding has changed. Restricted scope verification "can potentially take several weeks to complete" ([Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)).
- **What Google asks for:** verified domains, a homepage that describes the app, a privacy policy on the same domain, an unlisted YouTube demo of the consent flow, and a justification of why a narrower scope will not do ([Google](https://support.google.com/cloud/answer/13464321)).
- **When the assessment applies:** to apps that can reach restricted data "from or through a third-party server". TurnUp's server is that ([Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)).
- **How CASA works:** it is "risk-based, multi-tiered", assigned on "user count, requested scopes". Google's Trust and Safety team says when to start. A pass earns a "Letter of Validation", and "All applications must be revalidated every year" ([Google](https://support.google.com/cloud/answer/13465431?hl=en-GB)).
- **Scanning it yourself:** "The CASA self scanning process is **deprecated**". It is now lab-verified ([App Defense Alliance](https://appdefensealliance.dev/casa/tier-2/tier2-overview)).
- **What it costs:** Google does not publish a price. The developer pays the lab ([Mimestream, 24 Jun 2024](https://mimestream.com/blog/casa-verified): Tier 2, TAC Security, amount not given).
  - MailMate's developer, April 2025: "between $540 and $1800" a year through Google's preferred lab at a negotiated discount, or "between $1800 and $6300" without it ([MailMate list](https://lists.freron.com/mailmate/2025-April/018270.html), developer's own post).
  - A comparison dated 2024 gives TAC Tier 2 at $540, with 1 to 3 weeks of turnaround ([Switch Labs](https://www.switchlabs.dev/post/casa-tier-2-tier-3-security-review-providers-pricing-and-the-cheapest-option), third party).
  - TAC's own pricing page refused automated reading, so **current TAC prices are unverified**.
  - **Estimate:** roughly £400 to £1,400 a year for Tier 2 (exchange rate not checked), more if Google assigns Tier 3.
  - TurnUp's CLAUDE.md says "a four-figure annual cost". The evidence puts it at three to low four figures in dollars.
- **How long it really takes:** a sensitive-scope verification submitted on 22 April 2026 was still waiting for its first Trust and Safety email four months later ([Google developer forum, 24 Aug 2026](https://discuss.google.dev/t/oauth-verification-pending-since-22-apr-2026-first-trust-safety-email-never-received/392005), one developer's report). **Estimate: allow 2 to 4 months end to end, possibly longer.**

### Limited Use (applies to every sensitive or restricted scope)

Data may only provide or improve "user-facing features". Google bars:
- **Ads.** "Transferring, selling, or using user data for serving ads".
- **Transfers,** except to provide the feature with consent, for security, to obey the law, or in a merger.
- **Human reading,** unless the user agrees for specific messages, for security, by law, or as aggregated data.

Request "the minimum relevant permissions" ([API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), last updated 15 Feb 2024). The Workspace policy adds encryption at rest and CASA for restricted scopes ([Workspace policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy)).

### Google Calendar

| Point | Finding | Source |
|---|---|---|
| Class | Calendar is **not** on Google's restricted list. Google gives "reading events stored in Google Calendar" as its example of a **sensitive** scope | [Restricted scopes list](https://support.google.com/cloud/answer/13464325), [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) |
| Narrowest read | `calendar.events.readonly` (events on all calendars), `calendar.events.owned.readonly` (owned calendars) | [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth) (updated 3 Sep 2026) |
| Review | Demo video and scope justification; "typically takes 3-5 business days". No security assessment, which applies to restricted scopes only | [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification), [Verification requirements](https://support.google.com/cloud/answer/13464321) |
| Worth it? | **Lighter, but it reads the wrong thing.** Parcels are not in a calendar. A trade visit appears only if the household accepted an invite or typed it in. Reading it adds little beyond a job the trade has already attached. The reverse is free: the card could *publish* a calendar feed the household subscribes to, which needs no scope at all. That is an idea, not researched further | Judgement |

### Microsoft Graph (Outlook.com and Hotmail)

| Point | Finding | Source |
|---|---|---|
| Personal accounts | `Mail.Read` delegated "is available for consent in personal Microsoft accounts". No admin consent | [Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference) |
| Narrower | `Mail.ReadBasic` reads mail "except body, previewBody, attachments", also personal-account capable. The list-messages API names it least privileged, and it supports OData filters | [Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference), [List messages](https://learn.microsoft.com/en-us/graph/api/user-list-messages) |
| Publisher verification | Free ("Microsoft doesn't charge developers"). Needs a verified Microsoft AI Cloud Partner Program account, an app registered with an Entra **work or school** account (not a personal one) and a custom publisher domain. Without it, the consent screen marks the app unverified | [Publisher verification](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview) |
| Security review | Microsoft 365 Certification is a yearly independent audit for apps "that integrate with" Teams, Outlook and others. It is presented as a trust badge, "required" only "in some cases" to be enabled in a tenant. **Nothing found that makes it mandatory for a consumer `Mail.Read` app.** Not confirmed directly by Microsoft for personal accounts | [M365 App Compliance](https://learn.microsoft.com/en-us/microsoft-365-app-certification/overview) |

---

## Tracking a number instead of reading more mail

The parser already pulls carrier references from dispatch emails (`CARRIERS` in `src/lib/arrival-email.js`). With a tracking webhook, **one** email, forwarded or read, is enough. After that the carrier's own updates move the row, attributed as "Royal Mail said, via Ship24", never worked out by us.

| Service | UK coverage found | Webhook | Price | Source |
|---|---|---|---|---|
| Royal Mail (direct) | Its own items only. The API is for "account customers ... for their mail items" | Not checked | Free portal account. Some APIs need approval, "usually ... less than a week" | [Royal Mail APIs](https://www.royalmail.com/business/services/sending/business-integration-tools-apis/tracking-api) (read through a search summary, page blocks automated reading), [Developer portal](https://developer.royalmail.net/) |
| DPD UK (direct) | Needs a MyDPD account. Credentials are issued by DPD, and one plugin guide says a contract and a DPD audit come first | Not checked | Not public | [AfterShip DPD guide](https://support.aftership.com/en/shipping/articles/15380750-dpd-uk-developer-guide-and-api-credentials), [WP Desk](https://wpdesk.net/docs/dpd-uk-how-to-get-api-access/) |
| Evri (direct) | **No public developer tracking API found.** Unverified either way | No | No | Searched, nothing official |
| **Ship24** | Royal Mail page exists. Other UK carriers not individually checked | Yes, on every tier including Free | Free 10 shipments a month. $39 for 1,000, then $0.045 each. "One tracker is one shipment however long the parcel takes" | [Ship24 pricing](https://help.ship24.com/en/article/ship24-pricing-and-plans-explained-425d9d/) (updated 07/09/2026), [Royal Mail](https://www.ship24.com/tracking-api/royal-mail) |
| TrackingMore | Royal Mail, Hermes UK (Evri), DPD UK pages | Yes (Pro) | Free 50 a month, no API. Pro about $74 for 2,000 (third-party figures; the official page did not show the price) | [Pricing](https://trackingmore.com/pricing.html), [Royal Mail](https://trackingmore.com/royal-mail-tracking-api.html), [Evri](https://www.trackingmore.com/hermes-uk-tracking-api.html), [DPD UK](https://www.trackingmore.com/dpd-uk-tracking-api.html) |
| 17TRACK | Claims "3,500+" carriers. UK carriers not confirmed by name | Yes, POST on update | Not confirmed: the price page redirects to a login. Third-party figure $119 for 5,000 a year, prepaid | [17TRACK API](https://www.17track.net/en/api) |
| AfterShip | DPD UK confirmed in its app listing. Royal Mail, Evri and InPost not confirmed (pages block automated reading) | Yes (Pro) | Pro $119 a month for 2,000 shipments, with API and webhooks (Shopify listing via search summary) | [Supported couriers](https://www.aftership.com/docs/tracking/2025-01/others/supported-couriers), [Shopify listing](https://apps.shopify.com/AfterShip) |

**Not checked:** InPost (Yodel) and Amazon Logistics coverage at any aggregator, and every aggregator's terms on use in a consumer product. Read Ship24's terms before building. **Estimate:** 100 households at about 8 parcels a month is 800 trackers, inside Ship24's $39 tier.

---

## Privacy

- **Read the minimum.**
  - Ask Gmail only for mail from known carrier and retailer domains in the last 30 days, using `q`.
  - Never page through the inbox.
  - Use `Mail.ReadBasic` first on Outlook where the subject is enough.
  - Google: "Don't request access to information that you don't need" ([User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)). ICO: "adequate, relevant and limited to what is necessary", not "on the off-chance" ([Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)).
  - Filtering by sender also keeps out special category data. A pharmacy dispatch email reveals health ([Special category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/)).
- **Store the minimum.**
  - Keep the arrival row (title, stage, sender, reference, carrier link, the date the sender gave). Never keep the email body.
  - Encrypt the refresh token, as the ServiceM8 tokens already are.
  - Deliveries keeps forwarded mail for ten days, which is a fair ceiling for any raw message ([Junecloud](https://junecloud.com/support/deliveries-privacy-overview.html)).
  - ICO storage limitation: [link](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/). Google requires encryption at rest for restricted data ([Workspace policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy)).
- **No human reads it, no ads, no transfer.**
  - Debugging a misfiled email means asking the household to forward that one message. Opening their stored mail is not allowed ([Limited Use](https://developers.google.com/terms/api-services-user-data-policy)).
  - The privacy policy must say so in Google's terms ([Verification requirements](https://support.google.com/cloud/answer/13464321)).
- **Disconnect and delete.**
  - One button revokes the Google or Microsoft token and deletes every row that came from it.
  - Shop and Klarna both offer a disconnect, and Klarna has "Delete all imported information".
  - ICO right to erasure: [link](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/).
- **Lawful basis.**
  - Contract fits: the household asked for a card that fills itself, and reading delivery mail is necessary for that ([Contract](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/contract/)).
  - Google's consent screen is a platform permission, not UK GDPR consent ([Consent](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/consent/)).
- **DPIA: do one before Stage 2.**
  - The ICO list includes "invisible processing": senders' and couriers' names in a household's mail are personal data not obtained from them. It also includes "innovative technology" if a model reads the mail.
  - The ICO "considers it best practice to do a DPIA" regardless ([Examples of high-risk processing](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/examples-of-processing-likely-to-result-in-high-risk/), [When do we need a DPIA](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/)).
  - Google's CASA lab will want much of the same evidence.
- **Data protection fee.**
  - A controller pays the ICO, tier 1 £52 since 17 Feb 2025 ([ICO fee](https://ico.org.uk/for-organisations/data-protection-fee/), [Lewis Silkin](https://www.lewissilkin.com/insights/2025/02/06/fee-payable-to-the-ico-to-increase-in-february-102jzb9)).
  - Not checked whether TurnUp's operator already pays it.

---

## The plan

| Stage | Who | What it needs | Rough cost | Rough time | Main risk |
|---|---|---|---|---|---|
| **1. Internal** | The owner's own Workspace mailboxes only | A Google Cloud project inside the owner's Workspace organisation, consent screen set to Internal, a web OAuth client. Code: connect, `q` search, parser, token encryption, disconnect | £0 to Google. Build time only | **Estimate:** a few days of build. No Google wait | Proves the parser on one inbox only. Households still cannot connect |
| **2. Testers** | Up to 100 named testers | Same project switched to External, Testing. Each tester's email added by hand. DPIA written. Privacy policy live. Aggregator webhook so a card keeps moving between reconnects | £0 to Google. Ship24 free tier, or $39 a month | **Estimate:** 1 to 2 weeks after Stage 1 | **Tokens die every 7 days**, so testers reconnect weekly, plus a warning screen. Alternative: In production, unverified, which caps at 100 new users ever and shows the unverified screen |
| **3. Public** | Any Gmail user | Verified domain, homepage and privacy policy on it, demo video, scope justification, restricted-scope review, CASA Letter of Validation, then yearly reassessment. Six-monthly reconnect prompts | **Estimate:** CASA Tier 2 $540 to $1,800 a year at the cheapest lab (2024 to 2025 figures, unverified today), more at Tier 3. Plus the time spent on fixes | Google: "several weeks". **Estimate:** 2 to 4 months end to end, and one forum report was still waiting after 4 months | Google declines or asks for a narrower scope. A yearly bill and audit for a feature that may not pay for itself. A token that can read a whole inbox is the most dangerous thing TurnUp would hold |

**In parallel and cheaper:**
- Outlook.com through Graph. There is no paid assessment, and publisher verification is free but needs a Partner Program account and an Entra work tenant.
- Keep forwarding as the fallback for iCloud, Yahoo and anyone who will not connect.

---

## Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Google refuses or stalls verification | Stage 3 never arrives | Build stages 1 and 2 so they are useful on their own, and keep forwarding and Outlook |
| Six-month lapse for monitoring apps (secondhand, but corroborated) | Cards go quiet for households who ignore the prompt | Send a reconnect nudge before the lapse. The tracking webhook keeps open parcels moving |
| 7-day tokens in Testing | Testers drop out | Short test windows, or the unverified-production route with its warning |
| Token breach | `gmail.readonly` reads every email, not just deliveries | Encrypt tokens, keep no bodies, do one thing with the token, and rotate keys |
| Limited Use breach while debugging | Losing access, and losing trust | Ask for a forward, never open stored mail. Write this into the runbook |
| Parser noise on unforwarded mail | Marketing emails say "dispatched" too, so the card fills with things that are not coming | Sender allow-list first. Stage 1 exists to measure this |
| Special category data | A pharmacy or clinic email reveals health | Sender allow-list, nothing stored but the row |
| Aggregator terms or coverage | InPost and Amazon not confirmed. Consumer use not checked | Read Ship24's terms first. Leave a carrier's own link on every row |
| Household distrust | The privacy objection to Shop already exists ([shop-competitive-landscape.md](shop-competitive-landscape.md)) | Say exactly what is read, in one sentence, before the consent screen |

---

## What Will has to do himself

No session creates any of this. Each console step can be written up as one Cowork prompt, under the standing rule.

1. **Choose the Google Cloud home.** Create a Google Cloud project while signed in as a Workspace admin, so it sits inside the organisation. Internal mode depends on that.
2. **Set the consent screen.** Audience Internal, app name TurnUp, support email, the getturnup.com authorised domain, and the `gmail.readonly` scope.
3. **Create a web OAuth client** with TurnUp's callback URL. Put the client ID and secret into Vercel as environment variables through Cowork. Never paste them into a chat or a file.
4. **Connect his own mailbox** once Stage 1 is built, and remove the content-compliance forwarding rule when the card fills without it.
5. **Stage 2:** switch the audience to External, keep Testing, and add each tester's email on the Audience page.
6. **Verify getturnup.com** in Google Search Console with a DNS TXT record. That is a Cloudflare DNS change he has to make.
7. **Publish the homepage and privacy policy** on getturnup.com, including Google's Limited Use wording. Sign off the DPIA. Check the ICO data protection fee is paid.
8. **Record the demo video**: the full consent flow and what is read. Upload it to YouTube as unlisted.
9. **Submit for verification** in the Verification Center and answer Trust and Safety emails himself.
10. **Pay for CASA.** Pick a lab (TAC Security is the one Google is reported to prefer), pay it, run the scan it specifies, fix what it finds, and receive the Letter of Validation.
11. **Diary the renewals.** CASA reassessment within 12 months of the letter. For Outlook: a Partner Program account and publisher verification.

---

## Sources

**Google**
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
- https://support.google.com/cloud/answer/13464325
- https://support.google.com/cloud/answer/13464323
- https://support.google.com/cloud/answer/15549945?hl=en
- https://support.google.com/cloud/answer/7454865
- https://support.google.com/cloud/answer/13464321
- https://support.google.com/cloud/answer/13465431?hl=en-GB
- https://developers.google.com/identity/protocols/oauth2
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- https://developers.google.com/terms/api-services-user-data-policy
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy
- https://developers.google.com/workspace/add-ons/concepts/workspace-scopes
- https://developers.google.com/workspace/add-ons/gmail
- https://developers.google.com/workspace/marketplace/about-app-review
- https://developers.google.com/workspace/calendar/api/auth
- https://appdefensealliance.dev/casa/tier-2/tier2-overview
- https://discuss.google.dev/t/oauth-verification-pending-since-22-apr-2026-first-trust-safety-email-never-received/392005 (forum)
- https://community.make.com/t/gmail-access-via-oauth-starting-june-3-2024/46675 (forum)

**CASA cost**
- https://lists.freron.com/mailmate/2025-April/018270.html
- https://mimestream.com/blog/casa-verified
- https://www.switchlabs.dev/post/casa-tier-2-tier-3-security-review-providers-pricing-and-the-cheapest-option

**Other apps**
- https://help.shop.app/hc/en-us/articles/360058869972-Automatically-track-orders
- https://shop.app/privacy
- https://www.klarna.com/uk/help/products-and-services/how-does-auto-track-work/
- https://fashionunited.uk/news/business/klarna-launches-feature-allowing-consumers-to-view-order-history/2022081664658
- https://apps.apple.com/us/app/route-package-tracker/id1449803898
- https://parcel.app/help/parcel-email.html
- https://parcelapp.net/parcel-email-gmail.html
- https://junecloud.com/support/deliveries-ios/email-service.html
- https://junecloud.com/support/deliveries-privacy-overview.html
- https://www.paypal.com/au/cshelp/article/whats-paypal-package-tracking-help956
- https://support.aftership.com/en/tracking/articles/15441934-understanding-google-s-limited-use-requirements

**Microsoft**
- https://learn.microsoft.com/en-us/graph/permissions-reference
- https://learn.microsoft.com/en-us/graph/api/user-list-messages
- https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview
- https://learn.microsoft.com/en-us/microsoft-365-app-certification/overview

**Carriers and aggregators**
- https://www.royalmail.com/business/services/sending/business-integration-tools-apis/tracking-api
- https://developer.royalmail.net/
- https://support.aftership.com/en/shipping/articles/15380750-dpd-uk-developer-guide-and-api-credentials
- https://wpdesk.net/docs/dpd-uk-how-to-get-api-access/
- https://help.ship24.com/en/article/ship24-pricing-and-plans-explained-425d9d/
- https://www.ship24.com/tracking-api/royal-mail
- https://trackingmore.com/pricing.html
- https://trackingmore.com/royal-mail-tracking-api.html
- https://www.trackingmore.com/hermes-uk-tracking-api.html
- https://www.trackingmore.com/dpd-uk-tracking-api.html
- https://www.17track.net/en/api
- https://www.aftership.com/docs/tracking/2025-01/others/supported-couriers
- https://apps.shopify.com/AfterShip

**UK GDPR and ICO**
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/contract/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/consent/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/examples-of-processing-likely-to-result-in-high-risk/
- https://ico.org.uk/for-organisations/data-protection-fee/
- https://www.lewissilkin.com/insights/2025/02/06/fee-payable-to-the-ico-to-increase-in-february-102jzb9
