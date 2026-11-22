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
