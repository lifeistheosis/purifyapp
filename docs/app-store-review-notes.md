# App Review notes: Purify 1.9

The one source for what Apple is told when 1.9 is submitted (OWNER-STEPS,
R5d draws on this file and on nothing else). Rewritten 2026-11-10 for 1.9 by
the arbiter's word. The earlier text, written for a build that sold nothing on
iPhone, is in this file's history only (before 2026-11-10); it is never pasted
into App Store Connect again, because 1.8 and 1.9 sell Purify Plus and Pro on
iPhone.

The file has three parts:

- **A. For the team, before anything is pasted** (never sent to Apple).
- **B. The Notes for App Review**: the block pasted into App Store Connect,
  **App Review Information**, **Notes**.
- **C. If Apple asks for more**: what a screen recording must show, and the
  plain facts behind the notes.

---

## A. For the team, before anything is pasted

The arbiter confirms each line below against the build being submitted, on
the morning of R5d, and changes part B where a line is not yet true. Part B is
written as 1.9 is planned to ship.

1. **Prayer wall gone.** His word, 2026-11-10: "I'd say remove the prayer
   wall and just keep the prayer campaigns." Part B describes Pray together as
   prayer campaigns only. The campaigns chat removes the wall; if the build
   still shows it, part B must name it with its own moderation.
2. **Prayer campaigns open to every reader** (R5c). If campaigns are still
   for the team only when the build is submitted, part B says so in one line
   ("Prayer campaigns are in this build and open to our team only").
3. **The removal notice.** "The reader who posted it is told why" is true
   once `docs/1.9-build/sql/removal-notices.sql` has run on the live database
   (his yes, then the push). Every moderator's removal in the build writes
   the notice already: posts, replies, comments, shared journal pages, and
   (since `aa6417915`) campaigns and their pictures. Until the SQL has run,
   say only that moderators remove what breaks the rules.
4. **Pictures on prayer campaigns** have two switches: the server's
   (`CAMPAIGN_PARTS.pictures` in `lib/campaigns/parts.ts`, off until his
   three steps are done) and the store builds' own (`PICTURES_IN_STORE_BUILDS`
   in `lib/campaigns/flags.ts`, from `bac1be393`), which a test holds false
   while the server's is off. Part B is written for the store builds' switch
   false: the app shows no picture and offers no way to add one, whatever the
   server says. If both are true in the build being submitted, replace part
   B's pictures line with "Pictures on prayer campaigns: every picture is
   checked by a moderator before anyone else sees it, and each has Report."
5. **The safety line** for a campaign whose writer may be in danger (his yes
   to its words, 2026-11-10) is named in part B only once it is in the build.
   The moderators' queue already reads such a campaign first.
6. **Demo account**: his to make (OWNER-STEPS, R5a). Its email and password
   go only into App Store Connect, **App Review Information**, **Sign-In
   Information**: never in this file, a chat or the repository.
7. **Devices tested**: he names in the **Notes** field's last line the
   phone (and iPad, if he walked one) and its system version, from his own
   walk in R5b.
8. **The Terms tick on a new campaign** ("I agree to the Terms of Service")
   is in the build: the campaigns chat's screen and its fourth SQL file
   (signed). Until both are in, part B leaves that sentence out.
9. **No dormant features** (Guideline 2.5.19, read on Apple's page
   2026-11-10, last updated 16 October 2026: "Don't include any hidden,
   dormant, or undocumented features in your app"; hiding one is "grounds
   for removal of your app from the App Store and termination of your
   developer account"). Pictures are answered by item 4: while the store
   builds' switch is false, nothing of them can be reached in the app, the
   server cannot turn them on there, and part B says so plainly. Campaigns
   as a whole are answered by R5c: open before R5d, or, by his choice,
   named in part B as in the build and switched off (holding the stores is
   the safe choice).
10. **The age ratings** are answered again in R5d for user content. Apple's
   answer "Social media: yes" sets 13+; the store listing's "4+" goes with
   it (`docs/launch/STORE-LISTINGS.md`).
11. **New in 1.9** in part B matches the 1.9 note as shipped (Guideline
   2.3.1(a): new features "described with specificity in the Notes for
   Review").

---

## B. The Notes for App Review (paste this block)

Copy everything between the two lines, then fill the last line.

---

Purify is a free Eastern Orthodox library and prayer companion: Scripture with the Church Fathers' commentary, the lives of the saints, the Church's calendar and fasts, the prayers and the Hours, and the councils. The whole library works without an account and offline.

NEW IN 1.9
A journal by the Church's day (free). Hold a verse to open its window: highlight, copy, share as a picture, a note, its Greek. Five more Bibles to download. In Purify Plus: study on a verse (cross-references, the Greek of every word, Compare, Remember the verse), new reading plans, the Florilegium and the Thread, Candlelight and ambience. The Creed by council, Church history on Today, and a widget. Prayer campaigns reworked, with the moderation below. New welcome questions: a new reader is offered an account either as the last question or on a card on Today, one of the two for each device; both are in this build.

PURIFY PLUS AND PURIFY PRO (in-app purchase)
Two optional auto-renewable subscriptions, sold through the App Store: Purify Plus (monthly, or yearly with a free week on a first subscription) and Purify Pro (monthly or yearly). To find them: the Plus button at the top of Today, or You, then Purify Plus. A Plus feature, such as Compare on a verse, opens the same Purify Plus sheet. Restore purchases is on the Purify Plus page and in the sheet, beside the Terms of Service and the Privacy Policy. The library itself stays free.

SIGN-IN
An account is needed only for Community, prayer campaigns, sync across devices and the shop. A demo account is in Sign-In Information. Readers sign in with Apple, Google or email; every sign-in screen says that continuing accepts the Terms of Service and the Privacy Policy.

USER-GENERATED CONTENT (Guideline 1.2)
Readers write in two places, both for signed-in readers only.
- Community: public posts and replies. Before a post goes up, a filter holds it for a moderator when it comes from a new account, carries links or reads as spam, and a word filter masks objectionable words and sends the post to a moderator. Every post and reply has Report; enough reports hide it until a moderator looks. Any reader can block another and then sees nothing of theirs.
- Prayer campaigns (Pray together): a reader asks others to pray for someone or something. Every new campaign waits for a moderator before anyone else sees it, and one that suggests the writer may be in danger is read first. Starting one requires ticking "I agree to the Terms of Service", and the campaign rules are shown beside it. Campaigns, their updates and their comments have Report.
Moderators remove what breaks the rules, and the reader who posted it is told why, with the reason and an address to write to (support@purifyapp.net). Anything that sexualises or endangers a child is removed at once and reported to the authorities. Pictures on prayer campaigns are not in this build: the app shows none and offers no way to add one, and only a new build, sent for review, can add them.
Contact for anything a reader posts: support@purifyapp.net.

ACCOUNT DELETION
You, then Settings, then Delete account (under Data). It deletes the account and what is stored with it on our servers.

PERMISSIONS
The camera is asked for only when a reader takes a profile photo, and saving to the photo library only when a reader saves an image they made to share. No location, contacts, microphone, health or tracking permission is asked for.

Tested on: [his phone and its iOS version, from R5b]

---

---

## C. If Apple asks for more

### C1. A screen recording, if Apple asks for one

From a fresh install, signed out, on a real phone:

1. Open the app and read a chapter of a Gospel with the Fathers' commentary
   (no account, no paywall).
2. Tap the Plus button at the top of Today: the Purify Plus page with its
   prices, **Restore purchases**, the Terms of Service and the Privacy
   Policy.
   Buy Plus with a sandbox tester (it is free there), then show a Plus
   feature open.
3. Sign in with the demo account.
4. Community: report a post, then block its writer.
5. Pray together: start a prayer campaign up to the Terms tick (do not
   submit, or it waits in our moderators' queue), and report a campaign.
6. You, Settings, Delete account: delete an account (a spare one, never
   the demo).

### C2. The facts behind the notes

- **What Purify is.** A reference library and prayer companion for Eastern
  Orthodox Christians, catechumens and inquirers, clergy and students. Not a
  service that gives medical, legal or financial advice.
- **Languages.** The interface is in 21 languages. Scripture comes in
  public-domain editions: English, with the Russian Synodal, the Greek
  Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck
  and Spanish Reina-Valera to download. Most of the Fathers' texts are in
  English.
- **What is machine-translated.** Nothing is translated while a reader uses
  the app, and no AI service runs in the app or answers a reader. One thing
  was machine-translated ahead of time, and is labelled as such where it
  shows: the Verse of the Day, in an app language that has no public-domain
  Bible. The original English is one tap away.
- **Sources.** Every text of the Fathers is a public-domain translation,
  quoted word for word with its author, work and citation
  (`docs/editorial-standards.md`, held by a test that refuses any other
  source).
- **Services.** Supabase (accounts and the database), Sign in with Apple and
  Google, RevenueCat with the App Store (the subscriptions), Stripe (the
  EIKON shop's physical goods only, which is why they are not in-app
  purchases), Apple Push Notification service (opt in), Resend (account
  email), Render (the website and its services).
- **The shop** ships to the United States only; elsewhere it can be browsed.
- **Contact.** support@purifyapp.net for help and for what readers post;
  legal@purifyapp.net for legal matters.
