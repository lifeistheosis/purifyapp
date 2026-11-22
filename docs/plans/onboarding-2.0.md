# Onboarding and the paywall for 2.0: a brainstorm

His word, 2026-11-22: "Okay, first, I want to talk to you about the actual onboarding itself, because there was another company, they spent $1 million on A/B testing. And the majority of it went to the paywall design and the onboarding design and the different screens that each user sees. So ask a bunch of questions about that, give a bunch of suggestions, recommendations, and yeah."

Brainstorm only. Nothing here is built, and nothing is built without his yes. It stands beside `docs/plans/reader-map.md` (what each reader is given) and the roads' design note (`docs/1.9-build/notes/onboarding-fable.md`, whose sections 4 and 5 already hold the testing system, how many readers a test needs, and the first five tests).

## The frame

What a million dollars of testing buys is readers to test on. Purify has a few hundred new readers a week. By the note's own table (4.3), a ten point change in finishing the questions takes about 350 readers a version; Plus going from 2% to 3% of those who see it takes about 3,800 a version. So Purify can find only large differences, cannot yet judge a paywall by purchases, and should borrow what the large testers already learned and test only the few big forks.

## What the real screens show (photos of 2026-11-22, the export of main)

- The questions are three, and take about a minute: where the reader comes from, how far along they are, what they are looking for. The practicing are also asked their calendar and fast.
- The payoff is hard to see. "Your space is ready" lists what was set and passes into Today by itself (`docs/plans/reader-map/img/handoff-into-today.jpg` caught it mid-fade). On Today the first week's card stands at 636 to 709 px of an 844 px screen, and its Begin is under the tab bar on every road.
- The Plus sheet (`img/plus-sheet.jpg`, `img/plus-sheet-from-a-lock.jpg`) opens on "Purify is kept by those it helps. Plus pays for the servers and the work. It never buys back what was given.", then each feature with its own "Try it". Opened from a lock, the feature that was tapped leads. Its button says "Join Plus", over "Renews automatically until you cancel. Billed securely through your app store. Cancel any time."
- Not seen: the price, the plans and the seven days free. The export used here carries a stand-in for the store's key, so no price loads. The catalogue has the words (`plus.cta.trial`: "Start {trial} free"; yearly begins with 7 days free on a first subscription, `lib/premium/plans.ts`).
- Two tests have counted since 1.9's release (2026-11-17, to 2027-02-09): where the account is asked, and the one Plus card after the first week. A third, how the Plus sheet opens from a lock, is registered and begins the day after (2027-02-10), since it reads the same buyers. A fourth is planned: reminders asked after a first prayer (`lib/ab/tests.ts`). Corrected 2026-11-22: this line said three were counting.

## Settled so far

- **Plus is never shown in onboarding. A reader meets it in two ways only: they run into a Plus feature, or they tap the Plus pill** (his word, 2026-11-22 18:49 UTC, above at question 3). So no test of a paywall at the questions' end. Suggestions 7 to 9 below are about the sheet those two ways open, and stand.
- **What this makes the levers:** where the first lock stands on each road (a reader's own path leads them to it, and the reader map should name it for every road); the "Try it" each lock opens; and the sheet itself.
- **Asked of him and open:** the one Plus card on Today after the first week (`components/onboarding/RoadCards.tsx`, PlusIntroCard) is neither a lock nor the pill. It is live as a test against Purify without it (`lib/ab/tests.ts`, plus-introduced), by his "yes Plus card" of 2026-11-10. Does the test run to its end, or does this rule end the card?

## Suggestions (his to pick from; none is begun)

**The questions and the first day**

1. **End the questions on the reader's own week.** Its seven steps by name, and one button: "Begin day 1", which opens step one. Today the answers pass into a Today that looks the same to five roads.
2. **The week's card first on Today** for the first seven days, whole and above the tab bar.
3. **Reminders asked after the first finished prayer or chapter**, with a time to choose. Already the planned test.
4. **The need.** The quiet row the note designed (3.3): peace, comfort in loss, someone who is ill, wanting to pray and not knowing how. Its Psalms want a priest's glance.
5. **One more question only if it changes something the reader sees:** when they pray, or how many minutes a day. It sets the reminder and the size of a step.
6. **The account when there is something to keep:** at the end of day one, with what it keeps said plainly. For 2.0 that is also where their answers go to the account.

**The paywall**

7. **Lead with what this reader gets,** then why it keeps Purify going. The road's own feature first, when the sheet is opened with no lock behind it.
8. **The price, the yearly saving and the seven days free on the first screen,** and said on the button.
9. **The trial as a short timeline:** today everything opens, a reminder before it ends, then the first charge. It is honest, and it is what the large testers found lifts trust.
10. **No countdown, no invented discount, no weekly plan.** They sell more this month and cost refunds, ratings and trust. Wrong for this house.

**Testing**

11. **One number for onboarding:** a first prayer or chapter on the first day (already counted, `first_act`), guarded by coming back on day seven.
12. **Big forks only, one at a time, whole weeks.** And five real readers watched going through the first run, which finds what no test of this size can.

## Asked of him (2026-11-22; his answers go here in his words)

1. Which company was it, and what did they end up with: a long set of questions, the paywall at their end, a trial?
   **2026-11-22 19:00 UTC: he sent the video.** "He Spent $1M on A/B Tests. Here's What Won.", on Mobbin's YouTube channel (video qK7WYCMvjUw; title and channel read from YouTube's public embed record). Its words were not read: YouTube refuses this cloud machine (HTTP 429), and the `/plugin` command he tried is not in a cloud session. Asked of him: its transcript pasted, or a transcript plugin added from his directory.
   **2026-11-22 20:22 UTC: he pasted the transcript.** Its lessons are under "The video's lessons, matched to Purify" below, in this chat's words. The transcript itself is not copied here: the words are the channel's, and this repository is public.
2. What does he want most from a new reader's first day: a first prayer, an account, a trial begun, or coming back tomorrow?
3. His rule is that Plus is never in the questions nor in the first week (his 111). Does it stand for 2.0, or may one honest screen that can be skipped come at the questions' end?
   **His answer, 2026-11-22 18:49 UTC: "don't show the plus on the onboarding they must run into plus feature or click on the premium pill".**
4. How many readers begin the questions in a week, and how many finish (Admin, Traffic, Onboarding)?
5. Where do most new readers come from?
6. How long may the questions be: three as now, or up to eight if each visibly shapes the plan?
7. Which of these would he add: a name, a time to pray, minutes a day, the need?
8. In 2.0, must a reader make an account, and when: before the questions, at their end, or after the first prayer?
9. What does the Plus sheet show on his own phone for price, plans and the trial (a screenshot)?
10. Is a lower price for a reader who closes the paywall ever allowed?
11. Is a parish and a first Liturgy the true end of every road outside the practicing, even ahead of Plus?
12. Whose onboarding does he like, and whose does he not?

## The video's lessons, matched to Purify (2026-11-22)

The video is an interview with the founder of an astrology app that spent six years and about a million dollars on tests. Each row: what they found, what Purify does today (read in the code this day), and what it means here. Their numbers are theirs, from paid traffic and a paywall inside the questions; none is a forecast for Purify.

| What they found | Purify today | What it means here |
|---|---|---|
| A long set of questions (about thirty screens) beat a short one, once it stopped listing features and went: the reader's need, one small insight, then the feature that answers that need. | Three questions, about a minute. After the first answer the screen already says what Purify will start the reader with (`onboard.background.startWith`). | Longer is allowed when every screen gives something back. Never thirty here. The pattern fits suggestions 1, 4 and 5: the need, one true line (the Church's own day, or a Father's sentence verbatim and cited, never written for the screen), then the page. New words about the faith go to the clergy queue. |
| The questions are chosen by where the reader came from: the ad, then a store page made for it, then its own flow, then its own first session. About ten flows. The value of a customer doubled. | Eight roads, chosen by asking. Where a visit came from is known on the website (`lib/analytics/source.ts`), and nothing uses it to shape the start. The note already names a store page for each theme (3.1, 4.4). | The largest win in the video, and Purify is halfway: the roads exist. What is missing is the way in: the page or the video a reader came from choosing their first step with no question asked (a reader who came in on a council starts at the councils). |
| As much as possible is asked at the start, and the first session is built from it: a card for the day, a programme, shortcuts chosen by the answers, and one personal thing that moves with time, which brings the reader back. They say 41% return on day one and 37% on day seven. | Today has the Church's day for everyone. The one card that differs by road stands low on the screen with its button under the tab bar, and five roads share a greeting (the photos). The picks set the week and nothing else on Today. | Supports suggestions 1 and 2. New: Today's shortcuts by the reader's picks; and a personal thing that moves with time, which the Church already has: the reader's patron saint and name day (the community profile already holds a patron saint), the day of the fast, their place in the week. |
| Being featured by the store brought the wrong readers and hurt its numbers. | Not featured. | Nothing to chase. Readers who came for this are worth more than many who did not. |
| No login anywhere, at ten million users. They asked why a login was needed at all; what a reader keeps is restored by the phone itself. Email as marketing never paid for them. | No account is needed to begin. The account's place is under test now (account-place). 2.0 keeps a reader's answers with their account (his word, 2026-11-22). | Supports the default in `reader-map.md`, section 9: a reader with no account keeps their answers on the phone until they sign in. Forcing an account to begin would cost readers. An account that needs no email and no password could be looked at for 2.0 (to be checked first: what the accounts service charges for it and how it is guarded). Purify's emails are few and cheap, so their finding on email is no reason to stop them. |
| A paywall for each feature lost every test: readers took it that each feature was sold alone. One paywall, saying plainly that one payment opens everything, won. | One sheet. From a lock, the feature tapped leads it, and its headline says the feature is part of Purify Plus. Whether it should open on its list or on the feature working is the test that begins 2027-02-10. | Already so, and a warning for suggestion 7: go no further toward a sheet for each feature or each reader. Whatever leads, "everything in Plus, one price" must be seen at once. |
| A paywall that can be closed won everywhere but the United States, where one that cannot won. Their close button waits five seconds. | No paywall in the questions at all (his rule of 2026-11-22). The library is free. | Purify is gentler than their gentlest, by choice. A paywall that cannot be closed, or a button that hides, is not for this house. What the rule costs is said under the table. |
| The picture on the paywall moved more than anything else: one picture doubled the result. A realistic picture beat a cartoon one, because those who pay are over 35 and did not see themselves in it. | The sheet has no picture. The house uses real icons and photographs and refuses drawn AI looks. | A real picture at the head of the sheet is worth one test when its turn comes. His own short videos lean the same way (2026-11-22, a small sample: the two icon videos were watched to the end far more often than the plain card). |
| Putting the reader's own face into the pictures failed: readers stopped opening the app. | Nothing like it. | A limit worth keeping: what is made personal is what the reader is given, never the reader themselves. |
| Words alone (eight headlines) lifted buying by about an eighth. Proof from others (downloads, reviews) and a small "cancel any time" line each helped. | The sheet opens on "Purify is kept by those it helps" and its button stands over "Cancel any time." The house forbids a count of subscribers on the sheet (`lib/ab/tests.ts`, its opening rules). | The cancel line is there. The headline is a fair thing to test. Proof from others meets the house's own rule: a store rating is not a subscriber count, and whether it may stand is his to say. |
| Forty tests of price in a year. A dear lifetime plan makes the yearly look fair; readers compare prices to each other, not to worth. The same number charged by the week instead of the month earned more, with more leaving. | Monthly and yearly, seven days free on a first yearly. Price tests are RevenueCat's, on his word each time (the note, 4.4). | A lifetime plan as the high price beside the yearly is clean, and fits a house kept by those it helps. His decision (pricing). A weekly price is not for this house (suggestion 10 stands). |
| The free trial was taken away: readers took the one thing they wanted in the trial and left, or bought and cancelled within seconds. In its place, one lower price offered once, about day three, which lifted what came in from day three to day thirty by about a seventh. | Seven days free on a first yearly. A feature's "Try it" shows it and grants nothing. | Their trial gave away a thing used once. Plus is things used daily, so a trial costs less here. Whether to keep it is a test for RevenueCat when there are readers enough. The one lower price is question 10: if ever, then once, calm, with no clock, and only for a reader who has opened the sheet themselves, which keeps his rule. |
| Sharing in one tap: readers share what is about themselves, not a feature. A screenshot is met with a ready card. About a quarter of their readers share something. | Pictures can be shared (`components/share/PictureSheet.tsx`). | What is about the reader, in the Church's own terms: their patron saint, the saint of their birthday, a verse they kept. A ready card when a reader takes a screenshot is a small thing to look at. |
| A talking guide made by AI is their most used feature. | The editorial rule: no AI-drafted teaching reaches a reader without the clergy queue, and no invented patristic text ever. | Not for Purify. Named here so that nobody proposes it from the video. |
| Things sold beside the subscription, offered by a list that knows what each reader has done. | EIKON is the house's own, and separate. | The list that decides what a reader is offered next is the ledger of `reader-map.md`, section 4. |
| Paying outside the App Store in the United States doubled a customer's value there: half of cancellations had come within three minutes of buying. On Android they found it not worth doing. | Plus is sold in both stores and on the website. | A question of the stores' rules, which changed in 2025 and may have changed since. To be read fresh, and his decision, before anything is planned. |
| Hundreds of tests a month, read by AI, each ending in ship, do not ship, or wait. Every element won its place. | Two tests run, one waits, one is planned; the panel says where each stands. | Purify cannot test a button: the readers are not there (the note, 4.3). The discipline is the same at any size: one question, decided before, read at its end. |
| Begin with a funnel on the web: free to change, and the answer comes at once. Go slowly and cheaply. | The website is where most new readers arrive, and the tests count it already (each row says the kind of device). | Test the large forks on the website first, where the readers are and no store reviews a change. The apps take the winner. |

**What his rule costs, said once.** Their figure of four in ten paying is from readers bought with ads and met by a paywall inside the questions. Purify shows no paywall there, by his word. That gives up the place where most apps sell, for trust. It is a fair trade for this house, and it means the locks and the sheet carry the selling: where the first lock stands on each road matters more here than anywhere in the video.

**What the video changes in the suggestions above.**

- 1, 2 and 6 are supported: end on the reader's own week, the week's card first on Today, the account when there is something to keep.
- 7 is narrowed: what leads the sheet may differ; the sheet stays one, with everything in Plus and one price seen at once.
- 8 and 9 stand. Whether there is a trial at all is a question for RevenueCat's own tests.
- 10 stands. The video's house does the opposite and earns by it; the reasons here are trust, ratings and the house's own rules for tests.
- **13, new. Start from where the reader came in.** The page, the email or the video a reader came from chooses their first step, with no question asked.
- **14, new. A lifetime plan as the high price** beside the yearly. His decision.
- **15, new. One personal thing on Today that moves with time:** the name day and the patron saint, the day of the fast, the place in the week.
- **16, new. Numbers on the web:** `reader-map.md`, section 12.
- **17, new. The large forks tested on the website first.**

## His yes, and the order of work (2026-11-22)

**His word, about 20:30 UTC: "everything recommended let's do it. and yes we can update the privacy policy."**

Read by this chat as a yes to what its last message recommended: numbers on the web (`reader-map.md`, section 12, parts A to D), and the six ideas marked worth taking above (13, 15, a longer set of questions where each screen gives back, a real picture on the Plus sheet, 14, 17). Not read as a yes to what that message set under "not for this house" or "yours to decide" (the trial, one lower price, paying outside the App Store), nor to suggestions 1 to 12, which stay his to pick.

**What his yes does not replace.** Each thing designed still goes to him as a drawing, with its reasons, for a yes or no. The privacy page's sentences are his to read before they stand, and so are the Terms. A price is his number. Words about the faith wait for the clergy queue. A push to main waits for his word, and a migration for his sign-off on the SQL. The store's own steps (a product, a store page) are his hands.

**The order, cheapest and most useful first.** Sizes are this chat's judgement, not measured. One at a time, by the house's rule of one chat.

| # | What | Size | Needs before it is built |
|---|---|---|---|
| 1 | Numbers on the web: the mock-up | done 2026-11-22 | his yes or no on the drawing |
| 2 | The road tallied in Admin from counts that exist (A1), drawn on the reader web there (B, its first part) | medium | his yes to 1; a design from the admin's own pieces |
| 3 | A line in his weekly brief for each running test (D) | small | nothing |
| 4 | Start from where the reader came in (13): the page or the tagged link a reader came from chooses the first step | medium | a drawing of the first screen; which pages lead where |
| 5 | One personal thing on Today that moves with time (15): the patron saint and the name day, the day of the fast | medium | a drawing; where a name day's date comes from |
| 6 | A lifetime plan as the high price (14) | small in code | his price; the product made in both stores and in RevenueCat by him |
| 7 | A longer set of questions where each screen gives something back | medium to large | a drawing of each new screen; the clergy queue for any new line about the faith |
| 8 | A real picture on the Plus sheet, as one test | small | the picture, his yes; its turn among the tests (the sheet's own test holds that place from 2027-02-10 to 2027-05-05) |
| 9 | The road on the counts after the questions (A2), and the source (C) | small in code | the privacy page's new sentences, read by him, in English and German; with 2.0's new terms |
| 10 | The rest of the web's numbers (B, in full) | small | 9 |

Number 17, the large forks tested on the website first, is a way of working and no build: every test from here is planned for the website's readers first.

**Said to him with this.** It is about ten pieces of work, and this chat is far past the size at which a chat is meant to hand over (`docs/OPERATIONS.md`). The drawings can be made here; the building should begin in a fresh chat, from this file and `reader-map.md`.

## "What are you looking for?": the question he wants looked at (2026-11-22)

His word, about 20:45 UTC: "I feel like the what are you looking for section is very very important we should focalize in that for a second"

Brainstorm. Read in the code and on the photo this day; nothing is changed.

**What it is today** (`components/onboarding/LookingFor.tsx`, his own pick of 2026-10-27, "picture cards numbered in tap order").

- Eleven picture cards, two across, in one order for every reader (`lib/onboarding/space.ts`, INTENTS): the saints' lives, the Fathers' writings, the Gospels, the councils, Church history, What the Orthodox believe, the Liturgy, Fasts and feasts, A rule of prayer, Daily quiet, Study. On a phone six stand whole on the first screen and the last three are a scroll away (`docs/plans/reader-map/img/q-looking-for.jpg`).
- A card shows its picture and its name. The line each has in the catalogue ("Stillness, and some peace from anxiety") is not drawn; a screen reader says it.
- "Pick as many as you like. The order you tap is the order Purify puts them in." Each pick wears its number. The button reads "Continue with 3".

**What the picks do** (`lib/onboarding/week.ts`, `road.ts`, `state.ts`).

- The first pick leads the week: it is day one. The second and third take days four and five. A fourth pick and any after it change nothing a reader sees.
- For a reader who is "Just curious", who prefers not to say, or who skipped the first question, the first pick also chooses the road: the Fathers, the councils or history first is the seeker's road, anything else the newcomer's.
- For a Protestant reader the first pick chooses between the road's two weeks.
- The first pick is "the intent the rest of Purify reads": it is shown as Focus on "Your space is ready", it can be changed in Settings, and it is the one answer kept with the account today, since it says nothing of a reader's faith.
- Every pick is counted with its place in the order, and the finish and the notes of coming back carry the first pick. Admin, Onboarding, tallies finishes by it.

**Why it is the one to look at.**

1. It is the only question about what the reader wants. The other two are about who they are. In the video's terms it is where the reader's need is said, and everything they found hangs on that.
2. It is not an answer about faith. It is already with the account and already counted, so it can fit Purify to a reader, be followed in the numbers and be used in a letter with none of the questions of section 9 of `reader-map.md`.
3. It already decides more than it says: the first day, and for three kinds of reader the road itself.

**What is weak in it.**

1. Nine of the eleven are shelves of the library. The two that are a need (a rule of prayer, daily quiet) come ninth and tenth, below the first screen.
2. The first tap decides the most, and the cards stand in one order for everyone. Readers tend to tap from the top, so the order of the cards may be choosing first picks, and through them roads. Admin can show whether it does: if the first picks follow the order of the cards, it is the order answering and not the reader.
3. The reader is not told what the first tap does. "The order Purify puts them in" is true of three picks and of the week only.
4. "Pick as many as you like" promises more than is given: the fourth pick on does nothing.
5. The answer is paid back out of sight. After it comes "Your space is ready", and then a Today that looks the same on five roads, with the week's card low on the screen (the photos).

**Ideas, for talking over. None is begun.**

- **The need first, then the shelves.** One question before this one, of four or five plain needs (to pray each day, to understand the faith, to read the Scriptures and the Fathers, peace in a hard time, to get ready for church). Then this question arranges what is read. The need sets the tone and the one personal thing; the shelves set the week. New lines about a need want a priest's glance (suggestion 4).
- **The cards in the reader's own order.** By where they come from, the likeliest first, or the needs first for everyone.
- **Say what a pick does.** "Pick up to three: the first is where you begin." When a card is picked it names the page it brings.
- **Pay it back on the next screen.** "Your week", each day named with the pick that brought it (suggestion 1).
- **Let the picks run more of Purify:** the shortcuts on Today, the one Plus card (chosen by the pick, which says nothing of faith, in place of the road), a letter or a reminder that follows it.
- **Numbers by pick first.** Which first pick finishes, comes back and meets a lock. It is on the rows already, and it is the one way to cut the numbers that carries nothing of a reader's faith.
- **Start from where the reader came in** (13): the card for the page they came from is already picked, with a line saying why, and they can change it.

**Asked of him.** What makes it feel so important: what it should decide, or how it is asked? And what Admin, Onboarding, shows for the picks, since that says what readers choose today.

**His yes (2026-11-22, about 20:50 UTC): "all recommended and let's continue".** Read as a yes to the ideas above, each still to come to him as a drawing.

### Mock-ups 2 to 4: the question, drawn again (2026-11-22)

https://claude.ai/artifact/K7VL7cv8dDx7s88rcgp3r4 (his, private). `node docs/plans/reader-map/mock-looking-for.mjs <export>` draws the three stills and the page (`docs/plans/reader-map/mock-looking-for.html`). One reader throughout: a Catholic who has not yet been to an Orthodox church.

Each is the app's own screen on the native export, with only what is proposed changed, and each passed `checkMock` (all fifteen rules) before it was kept. The page passed the kit's check.

1. **The need comes first** (`img/mock-need.jpg`), from the second question's own screen: "What brings you here?", one answer of five, each on the app's own choice card with one of the app's own icons. Each need is one of today's eleven answers under a plainer name (to pray each day is A rule of prayer; to understand the faith is What the Orthodox believe; to read the Scriptures is The Gospels; peace in a hard time is Daily quiet; to get ready for church is The Liturgy), so each already has its page for every reader and nothing has to be written. The small line on each card is the catalogue's own.
2. **The picks say what they do** (`img/mock-picks.jpg`), from the question's own screen with two cards tapped: the line under the question becomes "Pick up to two more. They join your first week in the order you tap.", and a picked card says under its name which day it joins. His picture cards are untouched.
3. **The week, paid back** (`img/mock-week.jpg`), from the handoff's own rows: "Your first week", seven days by name with the day's number in each row's disc, why each of the reader's own days is there ("For peace in a hard time", "Your pick"), and one button, "Begin day 1". The week is the app's own rule's answer for these answers (asked of `weekFor` with a test that was then removed).

**New words, all his to change** (the page lists them): the question and its line, the five needs, the picks' line, "Day 4 of your week", "For peace in a hard time", "Your pick", "Where your week leads", "Begin day 1".

**Found while drawing, and still open.**

- **Two picks push two of the road's own pages out of the week.** For this reader the week loses "Your first Liturgy" and "The Excommunications of 1054" to make room for the two picks. That is today's rule (`weekFor` keeps six and the door). The first Liturgy is where every road outside the practicing leads, so it may deserve to stay; his to say.
- **The seeker's road.** Today a "Just curious" reader's first pick chooses between the seeker's road and the newcomer's. With the need asked first, that rule has to read the picture cards.
- **The cards' order** is not drawn. They could stand in the reader's own order.
- **The lines about a need** are plain and new: a priest's glance before they ship.

It awaits his yes or no, drawing by drawing.

## A day of the week, worked on (2026-11-22)

His word, about 21:20 UTC: "and also I want each day of the path actually worked on. right now it's just acts as a hyperlink to a page. (and a lot of the times it doesn't even switch to the screen smoothly) so we need eFh day or plan or whatever it is to really be worked on to be personalized to the user"

Brainstorm, and one fault measured. Nothing is changed.

**What a day is today** (`components/onboarding/FirstStepsNudge.tsx`, `lib/onboarding/week.ts`). He is right: it is a link.

- A card on Today: "Your first week · 3 of 7", the page's own name, a line where the app already has one, and Begin, which is a plain link to that page.
- The step is marked taken at the tap. Nothing knows whether the reader read, prayed, or left after two seconds.
- The page it opens does not know it is a day of a week: no "day 3 of 7", no end, no "done", no word about tomorrow. The reader is simply somewhere in the library.
- The next card comes the next day the reader opens Purify. Closing a card passes it; two passed in a row end the week without a word.
- Every reader meets the same page. That is the roads' own rule (`lib/onboarding/road.ts`): "no page of content knows who is reading it."
- Five of the days open a whole section's front page and not one thing: The Church's year, Find a parish, The Church's history, The councils, Start here. Five of the picks do the same: the saints' lives, the councils, Church history, Fasts and feasts, and What the Orthodox believe for the practicing. A reader who picks the councils is given, as their day, the list of councils.

**The fault he named, measured** (the export of main, a phone of 390 by 844, three readers; the script is not kept, its figures are here).

1. **Begin is under the tab bar when Today opens.** The card stands at 636 px; its button runs from 776 to 822 px; the tab bar begins at 761 px. A tap where the button is lands on the tab bar: in the first run it opened the Bible for all three readers.
2. **The card goes before the page moves.** From the tap: the card is gone from Today at 4 ms, Today's layout jumps at 12 ms, and the page's own transition only begins at 50 to 141 ms. So the reader sees the card vanish and Today jump, and then the switch, which pictures a Today that no longer has the card. The card cannot carry into its page.
3. **The cause is one line.** Begin's `onOpen` writes the step as taken at the tap (`writeWeek(stepTaken(...))`), so the card is taken off the screen before React has pictured the page being left.

The house's rules it breaks: every page switch moves, and a card that opens its own page carries its picture into it (CLAUDE.md, 2026-11-10); nothing jumps under the finger (the pre-build gate). It is in 1.9 as readers have it. The mend: the step is taken when the day is finished or once the new page stands, the card stays while the page opens and grows into it, and the card is drawn clear of the tab bar. It belongs with the work below, and its test is "the card is still there when the transition starts".

**What a day worked on could be: a beginning, a middle and an end.**

1. **It opens from its card.** The card grows into the day, in the house's motion.
2. **A beginning.** "Day 3 of 7", and one line that says why this is here for this reader, from their own answers: their need, their pick, their road.
3. **A middle: one thing, a few minutes long.** Not a section's front page. The part of the page that is today's, and the whole page one tap further for whoever wants it.
4. **One small act that makes it theirs.** Pray it once. Keep one line. Say "I went". Nothing that is Plus is promised here.
5. **An end.** "Day 3 kept", tomorrow's step by its name, and after the first day the question about a reminder (the planned test).
6. **The week seen whole.** The seven days of mock-up 4 become the week's own place: what is kept, what is today, what is ahead.

**Personal to the reader, in three layers, cheapest first.**

- **The frame.** Why it is here ("You picked the councils", "For peace in a hard time"), the time of day, their pace, their patron saint where they named one. No new teaching: the words are about the reader's own answers.
- **The portion.** How much of the page is today's, by how far along the reader is: the short way in for one who is new, more for one learning, the whole for the practicing. The rules already choose a page by level (`pickStep`); this chooses a part.
- **The bridge.** A few lines written for where the reader comes from. This is new teaching aimed at a reader, so it goes to the clergy queue, and it bends the roads' rule that no page knows who reads it. If it is ever done, it stands in the day's frame and never in the page. His decision, and a priest's.

**Where to begin, by the map.** Twenty-eight pages fill the sixty-three days of the nine weeks. Ten of them carry thirty-nine of those days, about six in every ten: Your first Liturgy (7), First Council of Nicaea (5), The Nicene Creed (4), Find a parish (4), The Gospel of John (4), Today's readings (3), The Church's year (3), Start with the Fathers (3), The Jesus Prayer (3), The Trisagion Prayers (3). Twelve pages are met on one road only. So the frame is built once for every day, and the portion and the act are made for those ten first.

**Asked of him.** What makes a day "kept": opening it, reaching its end, or the reader saying so? And may a day say something written for where the reader comes from, or only frame the same page for everyone?

**His answers (2026-11-22, about 21:30 UTC): "tapping done and unsure do recommended".** So: a day is kept when the reader taps Done. On the second question he left the choice to this chat, whose recommendation stands: a day frames the same page for every reader, from the reader's own answers; no lines are written for where a reader comes from. The bridge stays out unless he and a priest ask for it.

### Mock-ups 5 to 7: one day, worked on (2026-11-22)

https://claude.ai/artifact/RJrVoeYwVW3WNzQXpR2mW1 (his, private). `node docs/plans/reader-map/mock-day.mjs <export>` draws the three stills and the page (`docs/plans/reader-map/mock-day.html`). The same reader as mock-ups 2 to 4, on day one of their week: the lesson "The Jesus Prayer".

Each is the lesson's own page on the native export, reached as a reader reaches it (the questions, then Begin on the week's card), with only what is proposed changed, and each passed `checkMock` on the whole screen. The page passed the kit's check.

1. **It begins as a day** (`img/mock-day-begins.jpg`). The line over the title is the week's own mark, "Your first week · 1 of 7", where the page says "Lesson 3" today; under the title, "For peace in a hard time · 5 min". The lesson is untouched.
2. **The reader says when it is done** (`img/mock-day-done.jpg`). At the foot, the page's own primary button says "Done for today". The lesson's two links stay as quiet links.
3. **It ends on tomorrow** (`img/mock-day-kept.jpg`). After the tap the week's own card stands in the button's place: "Day 1 of 7, kept", "Tomorrow: Start with the Fathers" with that page's own line, and "Back to Today". The card is the one this reader tapped on Today, taken from the screen.

**Found while drawing.**

- **The page already has a middle.** This lesson has its teaching, the prayer itself, a "Try this" and its length ("5 min"). What it lacks is a beginning and an end that belong to the week. For the lessons the frame is most of the work.
- **The foot's button leads away from the week.** Today the page's one primary button is "Next lesson: The Trisagion Prayers". For this reader tomorrow is Start with the Fathers. The lessons and the week pull two ways.
- **The app already marks a lesson read** by itself ("Lesson read", seen on the third still, the app's own). The week's Done is the reader's own tap, by his answer; the two are different things and both can stand.

**New words, all his to change:** "For peace in a hard time", "Done for today", "Day 1 of 7, kept", "Tomorrow:" before a page's name, "Back to Today".

**What the stills do not show** (the page says so): the card growing into the day in the house's motion; the card clear of the tab bar on Today; how much of a section's front page is one day's; the week's own place.

They await his yes or no. With mock-ups 2 to 4 and the numbers drawing, seven drawings are waiting on him.

## Decided by recommendation, at his word (2026-11-22)

**His word, about 21:35 UTC, to seven drawings awaiting a yes or no and one open question: "unsure just recommended based off our principles and goals".** So this chat chose, by the principles below. Each choice is his to overturn, and anything built from them still comes to him to walk before it ships.

**The principles used.** His goal of the same day (know the reader, fit Purify to what they need, lead them to the Church and to Plus). The roads' own rule (no page knows who reads it; every road outside the practicing ends at a parish and a first Liturgy). His rule for Plus (met at a lock or at the pill, never brought to the reader in the questions). Every line a reader sees is true. A measured answer before a permanent one: a large fork is tested, on the website first. A fault is mended, not tested. The house's guardrails.

1. **"Your first Liturgy" stays in every week that has it.** A reader's picks may move other pages; never it, and never the road's door. *The roads' rule: it is where every road leads.*
2. **The seven drawings: yes, as one thing, "the new first week".** The need asked first, picks that say what they do, the week as the last screen, and days that begin, are kept by Done and end on tomorrow. *His goal: it is the reader's need, heard, shown and followed for seven days.*
3. **It is built as one fork and tested against today's first week,** on all readers together, the website first. Judged by day one kept; guarded by finishing the questions and coming back in the second week. *A measured answer before a permanent one; an extra question may cost finishes, and only a count can say.*
4. **Three parts are not a matter of taste and need no test.** The picks' line that promises more than is given changes to a true one. The rough switch from the week's card is mended. The card's Begin is drawn clear of the tab bar. *Every line true; a fault is mended.*
5. **Numbers begin with what needs nothing new:** by road and by first pick, from the counts that exist. The first pick says nothing of a reader's faith, so it is the first way to cut every number. *Know the reader, with the least asked of them.*
6. **The five lines about a need go to a priest before they ship.** *The editorial rule.*
7. **The seeker's road is chosen by the first picture card** (the Fathers, the councils or history) once the need is asked before the cards. *It keeps what the rule means today.*
8. **A day frames the same page for every reader.** No lines are written for where a reader comes from. *The roads' rule, and his answer of the same day.*

**Recommended the same way, and named apart because it touches his rule for Plus.** The one Plus card after the first week is a test that ends on 2027-02-09, and what it measures is his own rule against the card. Let it run to its end and let its count decide; add nothing else that brings Plus to a reader. He can end it with a word (one switch, `lib/onboarding/flags.ts`).

**A fact that sets the date of 3.** A device is in one test on a surface at a time, and the questions are held by the account's test until 2027-02-09 (`lib/ab/tests.ts`). So the new first week is built now and its test begins when that one ends or has its readers, whichever is first; or he ends the account's test early, which loses its answer.

**The order of work, as it stands now.** It replaces the first rows of the table above; rows 4 to 10 there follow unchanged.

| # | What | Size | Needs before it is built |
|---|---|---|---|
| 0 | The two faults of the week's card on Today (the rough switch, Begin under the tab bar), each with a test that fails on today's code | small | nothing: they are faults in 1.9 as readers have it |
| 1 | The road and the first pick tallied in Admin from counts that exist, drawn on the reader web there | medium | a design from the admin's own pieces |
| 2 | A line in his weekly brief for each running test | small | nothing |
| 3 | The new first week, as one fork: the need, the picks' true line, the week as the last screen, the day's frame (begins, Done, kept), the first Liturgy held, the seeker's rule | medium to large | a priest's glance at five lines; its entry in the tests' file; its place after the account's test |

## An honest rating, and what is still missing (2026-11-22)

His word, about 21:40 UTC: "how would you rate our progress and onboarding that we have right now and what can be added/revamped?"

This chat's judgement, from what it read in the code, photographed and measured on 2026-11-22. It rates how the onboarding is designed and built. It cannot rate results: how many finish, keep day one or come back is in Admin, Onboarding, and this chat has not seen it.

**The onboarding readers have today (1.9), out of ten.**

| Part | Score | Why |
|---|---|---|
| The ground it stands on: rules held by tests, counts that keep a reader unnamed, no account to begin, the look | 8.5 | Rare at this size. 30,024 sets of answers walked, none with a broken week. |
| The questions | 7 | Short, kind, asked in the reader's own terms. The third is mis-built: shelves before needs, a promise of more than three picks, the first tap choosing a road unseen. |
| What the reader gets back at once | 4 | "Your space is ready" lists settings and fades by itself. Today looks the same on five roads, and the week's card has its button under the tab bar. |
| The first week | 3.5 | Each day is a link, counted at the tap. The page does not know it is a day, its own button leads away from the week, and the switch is rough. |
| After day seven | 3 | Nothing. The week stops, or ends without a word after two days passed over. No second week, no month. |
| Knowing what works | 6 | Better than most: tests, milestones, counts by answer. Not past the questions by road, not in one picture, and too few readers for fine answers. |
| The way to Plus | 5, unproven | Honest and calm, which fits the house. Its tests run to May 2027, and no price or trial has been tested. |
| **As a whole** | **5.5** | A fine front door onto a hallway. The asking is good; the giving back is thin. |

**The work on 2.0's onboarding so far.**

| Part | Score | Why |
|---|---|---|
| Understanding and plan | 8.5 | Every claim read in the code or measured; the map held by a test; seven drawings from the app's own screens; the decisions and their reasons written. |
| Built for readers | 1 | Nothing yet, by the phase's own rule. The two faults measured on Today are still what every new reader meets. |
| The risk in it | | About ten pieces of work, one chat at a time. His words are needed for the privacy text, a price and a priest's read. The questions' test place is held until 2027-02-09. A plan this size can outgrow the hands that build it. |

**What is missing from the plan, and worth adding. Brainstorm; none is begun.**

- **A. After day seven.** The week ends on a closing moment ("Your first week is kept") and offers what comes next, by the reader's need: a second week, or a plan. A plan is where a reader runs into Plus by their own wish, so it is the honest place to meet it and keeps his rule. This is the largest hole.
- **B. Reminders that need no account.** "One a day" depends on the reader remembering. Today a reminder needs an account (`onboard.reminders.needsAccount`), so most new readers have none. A calm reminder kept on the phone itself ("Day 2 is ready") is likely the largest single help to coming back. The house's rule for notifications stands: nothing that puts a clock on the reader.
- **C. The first prayer inside the first minute.** The app's one number for onboarding is a first prayer or chapter finished. Today that is several taps and a scroll away. Day one could begin from the last screen itself.
- **D. The door, walked.** "Your first Liturgy" is on seven of the nine weeks and "Find a parish" ends four. They are where every road leads, so they should be the best two pages in the app. Neither has been walked for this.
- **E. A week that waits.** Two days passed over end the week without a word. It could pause and be there when the reader returns.
- **F. A short welcome by email, by first pick,** for a reader with an account. No series was found among the automatic sends. What a reader came for is kept with the account and says nothing of their faith.

**Not for this house, named so nobody proposes it:** a card to share one's own streak or week. Showing one's prayer is not the Church's way. A verse or a saint is what is shared.

**What this chat would cut, if the work has to be smaller.** Keep rows 0 to 3 of the order and A and B above. Leave the longer questions, the picture on the Plus sheet and the source on the counts for after.

## What a ten is, section by section (2026-11-22)

His word, about 21:43 UTC: "let's try to 10/10 each and every single section. try the best methods based on our goals."

For each section rated above: what a ten would be, written so that it can be checked; the method, chosen by his goal (know the reader, fit Purify to what they need, lead them to the Church and to Plus); the pieces, most of them already named in this file; and the number that says it was reached. Brainstorm: nothing is built, and each piece still comes to him as a drawing. A ten in results needs readers and weeks as well as work; the targets marked "from the baseline" are set once Admin's numbers are read.

### 1. The ground it stands on (8.5 now)

- **A ten is:** nothing a reader is given because of who they are exists outside one held list; a tester and the gate can walk any road on any day; no known fault is open.
- **The method:** one source and a test that fails on drift, as the reader map already works.
- **The pieces:** the ledger, parts A to C of `reader-map.md` section 4 (still his yes); "Walk as" in Testers (part E); the gate walking every road's days; the open faults closed (`next dev` and the file Tailwind reads, the downloads' test that fails, the answers moved from the sign-in record to a table only the reader can read).
- **The number:** faults open, 0; roads the gate walks, 8 of 8.

### 2. The questions (7 now)

- **A ten is:** every question changes something the reader sees on the very next screen; no answer does anything unseen; every line a reader sees is true and, where it speaks of the faith, read by a priest; it takes under ninety seconds.
- **The method:** ask for the reader's need before the library's shelves (what the largest testers found: the need, then one small thing given back, then what answers it). Keep only a question that earns its place.
- **The pieces:** the need first, picks that say what they do (mock-ups 2 and 3); the picture cards in a fair order, so that standing first is not what gets a card tapped; the seeker's rule made visible in the cards; a line of what Purify will do after each answer, as the first question already has; the card for the page a reader came from already picked (13); the EU step (mock-up 1).
- **The number:** the share who finish, held at or above the baseline with one question more; the share of first picks that are the top two cards, falling toward what chance would give.

### 3. What the reader gets back at once (4 now)

- **A ten is:** within a minute of the last answer the reader has prayed or read one thing; the first screen they land on could not be taken for anyone else's; the week's card is whole and above the tab bar.
- **The method:** the first act is the proof. An app is kept by the reader who did the thing once, on the first day, and not by the reader who was told about it.
- **The pieces:** the week as the last screen (mock-up 4), with day one beginning from it; the week's card first on Today and clear of the tab bar; a greeting and one personal thing on Today that move with time (15: the patron saint and name day, the day of the fast, the place in the week); Today's shortcuts by the reader's picks.
- **The number:** a first prayer or chapter finished on the first day (`first_act`, already counted), with a target from the baseline.

### 4. The first week (3.5 now)

- **A ten is:** each of the sixty-three days is one thing of a few minutes with a beginning and an end; none is a section's front page; the card grows into its day and nothing jumps; a day is kept by the reader's own Done; a day away costs nothing and the week waits.
- **The method:** a small loop each day: a calm call at the hour the reader chose, one short thing, and an ending that names tomorrow. Endings are what is remembered, so every day and the week itself get one.
- **The pieces:** the two faults of the week's card (row 0); the day's frame (mock-ups 5 to 7), built once for every day; one thing chosen for each of the five days that open a whole section; the ten pages that carry six days in ten worked first; the first Liturgy held in the week; the page's own button no longer leading away; reminders that need no account, at an hour the reader picks (B); a week that pauses (E); the week's own place.
- **The number:** day one kept by Done; day seven kept, of those who kept day one; both from the baseline once days are counted by Done.

### 5. After day seven (3 now)

- **A ten is:** no reader ends a week and finds nothing. Each is told the week is kept and offered their next step by name; the reader who was led to a parish is asked, once and kindly, whether they went.
- **The method:** hand the reader from a guided week to the Church's own rhythm, which is what keeps a person for years: a daily rule, the Sunday Liturgy, the fasts and the feasts. The beginnings the Church already has (a Sunday, a feast, the first day of a fast) are when a new path is offered.
- **The pieces:** a closing moment for the week; a second week by the reader's need; a small rule of their own built from what they kept; a path offered at the next fast or feast; a reading plan as the next step, which is where a reader meets Plus by their own wish (A); "I went" at the door.
- **The number:** readers back in their second week (`back_week2`, already counted) and in their fourth.

### 6. Knowing what works (6 now)

- **A ten is:** each stage has one number, its baseline is written down, all of them stand on one page, and every running test says each week: wait, version A, version B, or stop.
- **The method:** one number a stage, decided before the work; large forks only, on the website first; and five real readers watched through their first run at each release, which finds what no count of this size can.
- **The pieces:** the stages named (finished, day one kept, week kept, back in week two, a lock met, Plus); Admin's baselines read into this file; the road and the first pick tallied from counts that exist, drawn on the reader web in Admin; the line in his brief for each test; later, with the privacy page, the road and the source on the rest of the counts.
- **The number:** stages with a written baseline, 6 of 6; tests that ended with a note of what was learned.

### 7. The way to Plus (5 now)

- **A ten is:** Plus is never brought to a reader, and no reader misses it: every road passes at least one lock by its fourteenth day on the reader's own path; the sheet says everything Plus is and its price on one screen; price, trial and a lifetime plan have each been tested once.
- **The method:** worth before the ask, and the ask at the moment the reader wants more. A dear lifetime plan beside the yearly, since prices are judged against each other. Offers are tested where the money is counted, in RevenueCat, on his word each time.
- **The pieces:** the first lock on each road named on the map; the sheet with the price, the yearly saving and the trial seen at once (8, 9); one real picture at its head, tested; the plan after day seven (A); the lifetime plan (14); each offer test his to start.
- **The number:** the share of readers who meet a lock in their first fourteen days; of those, the share who tap to subscribe (`plus_pay`); purchases as a tally to watch until there are readers enough to judge by.

### The order: where the most readers are lost, first

1. Sections 4 and 3 together: the faults, the new first week and what comes back at once. This is where the scores are lowest and where every new reader passes.
2. Section 6 beside them from the start, so that each change has its number before it ships.
3. Section 5, once a reader can keep a week.
4. Section 2's remaining parts, which wait for the questions' test place (2027-02-09).
5. Section 7, whose own tests are his to start.
6. Section 1 throughout: the ledger first, since it makes every row above cheaper to build and to hold.

**Said to him with this.** A ten everywhere at once is how a plan outgrows its hands. It is reached one section at a time, each with its number, in a fresh chat.

## Row 0, done on the branch: the week's card (2026-11-22)

**His word, about 21:57 UTC, to this chat's advice to build in a fresh chat: "no. you already have the context you do it".** So this chat builds, section by section. Row 0 first.

**What was changed** (`6efad5dba`).

- **The card stays until its page moves.** A tap on Begin is now two things (`lib/onboarding/openStep.ts`): what is only counted, at once; and what takes the card off Today (the step written as taken, or Day 1 dismissed), once the card has left the screen with its page. `components/onboarding/FirstStepsNudge.tsx`.
- **The card stands first on Today while a step is up,** above the greeting (`components/today/TodayMobileV3.tsx`). This is suggestion 2, chosen at his word of the same day ("just recommended"); it moves a card he placed under the greeting in 1.8, so the stills below are his to say no to.
- The old test that made the whole suite red by its fixed date is mended too (`3e78a2622`, `lib/downloads/__tests__/log.test.ts`).

**The proof, by the fix checklist** (`docs/OPERATIONS.md`, section 5).

1. **A test that fails on the old code:** `lib/onboarding/__tests__/openStep.test.ts`, two of its five failing before the change and all passing after. And the gate's new probe, `scripts/gate/week-card.mjs`, on an export: **ten faults on the export of main, none on the export of the branch**.
2. **Typecheck 0. The whole unit suite green:** 15,567 passed, 7 skipped, none failed. Lint clean on the changed files.
3. **The web build passes** (`npm run build`: compiled, 6,527 pages).
4. **The export is cut** the store builds' way (`node scripts/gate/export.mjs`).
5. **Today, as a reader in their first week, through every mock-check rule** (`scripts/guardrail-walk.mjs --only /`, with what that reader's phone keeps): at 390 by 844, 800 by 1280 and 1032 by 1376, in English and in Arabic. Six runs, nothing failed in any.
6. **Tapped as a reader taps:** Begin, by a finger, at 390 by 844 and 360 by 740, as three readers; Begin then Back (the step is kept once the card has left, and Today has no card that day); the card's close button (it goes, and the step is passed).

**What the probe measured on the branch's export.**

| | On main | On the branch |
|---|---|---|
| The card as Today opens (a phone of 844) | from 636 px, cut by the tab bar | from 78 to 285 px, whole |
| Begin's foot | 822 px, under the tab bar (from 761) | 264 px |
| A finger on Begin | opens the Bible | opens the step |
| The card leaves Today | 4 ms after the tap, before the transition | 90 to 196 ms after it, inside the transition |
| Today moves before the transition | yes | not at all |

Stills, a new reader's Today at 390 by 844: `docs/plans/reader-map/img/today-week-card-before.jpg` and `today-week-card-after.jpg`.

**Not done, and why.** The card growing into its page (carrying its picture) is part of the day's frame, row 3. The card's close button still takes it away at once, with no motion; noted, not asked for. How this reaches readers is his word: a push to main puts it on the website at once, and the apps need new store builds.

### His answer to the stills, and mock-up 8: one lead, one Begin (2026-11-22)

**His word, about 22:38 UTC, looking at a new reader's Today: "to be honest it looks a little stacked and 2 click here is kinda immersion ruining."**

Read as: two cards one over the other, each with its own Begin, pull the eye two ways. It is true of Today as readers have it (the lead, then the week's card) and of row 0's change as well (the week's card, then the lead): moving the card up cleared the tab bar and left the two.

**Mock-up 8** (`docs/plans/reader-map/img/mock-today-lead.jpg`, by `mock-today-lead.mjs`, from the app's own Today on the branch's export; passed `checkMock`, all fifteen rules). While a step of the first week is up, it stands in the lead's own place for the hour's prayer: the lead's small line reads "Your first week · 1 of 7", its name is the step's, and its one Begin opens the step. The card's own close button stands beside the words, so a step can still be passed. The week's card is not drawn. No word is new.

**Why.** One night on the screen and one thing to do, as the lead was made to be. The step is the lead's own action, so nothing is stacked and the eye is not asked to choose. Once the step is taken or passed, the lead says the hour's prayer again, as it does today.

**If he says yes,** it replaces the card's new place in row 0 (the card first on Today): the week's card is no longer drawn on Today at all, and what row 0 mended in the card (the step kept only once the screen has moved) is kept in the lead. The probe asks the same two things of the lead.

**Open in it.** The line the card has under a step's name ("One short prayer, said slowly...") is not drawn in the lead, which has no such line for the hour's prayer either. And while a step is up, the hour's prayer is one scroll or one tab away, not in the lead.

### Mock-ups 9 to 12: the lead, four other ways (2026-11-22)

**His word, about 22:42 UTC, to mock-up 8: "can we actually revamped that design? try out different things"**

Four takes, each from the app's own Today on the branch's export for the same reader (a Catholic who has not yet been to a church and came for Daily quiet, day one), each passed by `checkMock`, all fifteen rules (`docs/plans/reader-map/mock-today-leads.mjs`, stills `img/mock-lead-a.jpg` to `-d.jpg`, page `mock-today-leads.html`, https://claude.ai/artifact/AWCrgRcY4GixPNGuq3hWec). In all four there is one Begin, the week's card is not drawn, and no word is new.

| | What it is | What it costs |
|---|---|---|
| 9. Step first | The step and its line on the night, Begin right under, the greeting and the verse after, smaller | The star's sentence and today's reading leave the lead for the seven days |
| 10. One night | The star alone as the picture, every line on one centre line, no rule | The tallest; the star no longer says in words that it opens the fast's readings |
| 11. Short | Mock-up 8 without the hour's verse and with a shorter band | The plainest; it mends the two Begins and the height only |
| 12. Your picture | The lead wears the picture of what the reader came for (`lib/onboarding/pictures.ts`), fading into the night; the step, its line, Begin, the day on one line | The greeting, the hour's verse and the star give way for the seven days; each of the eleven picks needs its picture at the lead's size (the apps carry them at the size of the questions' cards, 315 wide for this one), and four are stand-ins until his are made |

The recommendation on the page was 12 for the first week, and 9 if the greeting and the verse must stay.

**Overtaken the same hour.** His next word (below) is that he does not like the box at all. All four keep it. They stay as a record. What lasts from them: 12's idea, that the first week's Today wears the reader's own picture, and the rule that a step of the first week stands where the hour's prayer is, with the one Begin.

### His word on the welcome, and mock-up 13: no box, each thing once (2026-11-22)

**His word, about 22:55 UTC, with two pictures of his own Today: "I want a better welcome back screen honestly. (so first thing they see on the today) I don't like the black box square design and remember multiplicity optimization because the screens we have know it shows the same stuff twice which ruins immersion"**

**What Today shows twice**, read from the export as his pictures show it (a practicing reader, Sunday 22 November 2026, 17:55, day 8 of the Nativity Fast, 14 days kept):

| The thing | Where it stands now |
|---|---|
| The saint of the day | Twice: in the lead (a small picture, "Apostle Philemon and Apphia of the Seventy") and in The Church today ("Today's Saint", the same picture) |
| The fast | Three times: the star's band ("Nativity Fast · day 8 of 40"), the lead's line under the saint ("Nativity Fast, fish allowed"), and The Fast in The Church today |
| The hour's prayer | Once, in the lead. Pray, lower, lists the rest of the day's rule and not the hour's |
| A verse | For a new reader two stand one after the other: the hour's psalm verse in the lead, then the verse of the day |

The lead is 506 px high on a phone 844 high and holds three things, each laid out its own way: the fast's star, the saint, the hour's prayer. That is the box.

**Mock-up 13** (`docs/plans/reader-map/mock-welcome.mjs`; stills `img/mock-welcome-before.jpg`, `img/mock-welcome.jpg`, `img/mock-welcome-church.jpg`; page `mock-welcome.html`, https://claude.ai/artifact/VD5qJxi7vtNuTbCmbXJKnf; passed `checkMock`, all fifteen rules, and the page passed the kit's check).

- **No box.** The lead's edge, corners and side margins are gone. Its night runs the screen's whole width under the top bar and ends in the horizon the star's drawing already has. The hill under that horizon takes the page's own ground, so the page begins where the sky ends.
- **On the sky:** the date, the hour's greeting (`today.greetingEvening`, the words every other reader's lead already says) and Pascha's count under it. The star's three lines are not drawn.
- **Under the horizon, on the page's own ground:** the hour's prayer and the screen's one Begin, as they are.
- **Once:** the saint stands in The Church today. The fast stands in The Fast, which takes the star's count ("The Fast · day 8 of 40") and today's reading from the star's band.
- The lead was 506 high and is 326. The streak and the verse of the day are on the first screen.
- No word is new.

**What it costs.** For an Orthodox reader the saint and the fast leave the first screen and are one scroll down; if he wants them higher, The Church today can stand right under the streak (that moves the verse of the day down, which he set first in round 17). The star no longer says in words what it is.

**Not drawn yet.** A great feast, where the feast's name leads today and has to lead here and still be said once. The rest of the year, where the lead has the Night sky look's own sky and no star. A new reader's first week, where the day's step would stand where the hour's prayer is. Wide screens (the page is centred there, so the sky needs its own rule to stay the screen's whole width), the Light palette by eye (the sky is a night on every palette, as the lead is today, with the page's own ground under the horizon) and Arabic.

**If he says yes,** it is built in `components/today/GreetingHeader.tsx` and `NativityStarCard.tsx` (the sky, the words, the hill's fill), `lib/today/greeting.ts` (an Orthodox reader's lead no longer carries the saint and the fast) and The Church today's fast band (the count and the reading), with a test that fails on the old code for each of: the saint said once, the fast said once, the lead without its box. The mend of row 0 (a step kept only once its page has moved) is kept, and its probe and test follow the new place of the step.

### His note: a finish is a moment of its own (2026-11-22)

**His word, in the same message: "note this (unrelated to this specific task) : I want full immersion ux experiences also so when you finish there is a high quality smooth finish animation"**

Noted, and a rule in `CLAUDE.md` now. Not designed and not built. Where it meets this plan: the end of a day of the first week (mock-up 7, "It ends on tomorrow", where the tap on "Done for today" is answered by the week's card) is a finish, and so is the end of a prayer and of a lesson. What exists today at each of those ends has to be read before anything is drawn: the app marks "Lesson read" and "Prayed today" already. It is its own piece of work, and it waits for his word on when.

### The spacing of mock-up 13, measured (2026-11-22)

**His word, about 23:10 UTC, to mock-up 13: "make sure it's spaced optimally"**

Every gap on the new first screen was measured on the drawing as he first saw it. Three things were wrong, and each is changed in the drawing:

| What was measured | What it is now, and why |
|---|---|
| The words stood 18 px under the top bar, with 95 px of empty sky under them | They sit on the horizon, with the sky open over them (about 80 px). The greeting stands next to what it leads to, and the top bar is not crowded |
| The greeting was 32 px. "Good afternoon" is 243 px wide at that size and ran into the star's light on the days the star is level with it | It is the house's title size, 28 px (`--text-title`), eased down on a phone narrower than 390 (to 26 at 360), so the longest of the three greetings stays on one line beside the star |
| The streak's words started 4 px inside the page's left edge, and the rope's days 10 px inside | Both stand on the page's one left edge and one right edge, under the ends of Begin |

**The rhythm now** (a 390 phone, px between the letters' own boxes): the sky open over the date 81; date to greeting 7; greeting to Pascha's count 3; Pascha's count to the horizon 28; horizon to the hour's line 26; the hour's line to the prayer's name 3; the prayer's name to Begin 15; Begin to the streak's words 27. Three groups (the words, the hour's prayer with its Begin, the streak) with the same air between them: 28, 26, 27.

**Made sure by a probe in the script** (`docs/plans/reader-map/mock-welcome.mjs`; no page is written if a rule breaks): on phones 360 by 640, 390 by 844 and 412 by 915, with each of the hour's three greetings and the star at days 1, 8, 20, 34 and 40 of its rise:

- every line starts on the page's one edge (21 px), and Begin, the streak's arrow and the rope end on the other;
- each greeting stays on one line;
- the words never come nearer than 21 px to the star's light (at 360; 27 at 390, 43 at 412), where the rule is 8;
- the words never come nearer than 14 px to the horizon, where the rule is 12;
- Begin's foot stands at 391, above the tab bar on all three (its top at 557 on the smallest).

The lead is 326 high. `checkMock` passed again on the new drawing, all fifteen rules, and the page passed the kit's check.

**Not measured.** Other languages, where a greeting can be longer than "Good afternoon": the words keep to the left 64% of the sky, as the star's band does today, and a longer greeting takes a second line upward into the open sky. A great feast's name in the greeting's place. Wide screens. Each is for the build's own tests.

