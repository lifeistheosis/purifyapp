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
- Three tests have counted since 1.9's release: where the account is asked, the one Plus card after the first week, and the order of the Plus sheet (`lib/ab/tests.ts`). A fourth is planned: reminders asked after a first prayer.

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
