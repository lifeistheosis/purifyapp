# The reader map: every section a reader is given, mapped

His word, 2026-11-22: "ensure each section that's given to the user Is fully mapped out to we can control this spiderweb type of system we are going to create". Said of 2.0's learning curves ("its Eastern Orthodox based app with different LEARNING CURVES (targeting onboarding)"), which build on 1.9's roads (`docs/1.9-build/notes/onboarding-fable.md`).

**Status.** Section 1 is done: the map of what a reader is given today is written from the rules and held by a test. Sections 4 and 5 are a proposal for 2.0. Nothing of them is built, and nothing is built without his yes.

## 1. The map today (1.9, the roads live)

The whole listing is `docs/plans/reader-map.txt`. It is written by `lib/onboarding/__tests__/readerMap.test.ts` from the rule files and is never edited by hand. When a rule changes, that test fails until the map is written again, so a change to what a reader is given is read as a difference in the map.

The questions ask where a reader comes from, how far along they are, their rule (the practicing only) and what they are looking for (up to three picks, in the order tapped). From the answers the app works out two things:

- **The reader's type** (orthodox, learning, new), from how far along they are. It decides how Today looks.
- **The road** (practicing, returning, catechumen, catholic, protestant, christian, seeker, newcomer), from that and from where they come. It decides the first week: seven pages, one a day, all free, each a page the app already has.

**Ten places in the app show something different by who is reading.** Found by search on 2026-11-22 (every file outside the rules that reads the type, the road, the level or the week). The last column is from the design note (1.3 and 9) and was not read again in the components that day.

| Where | File | Reads | What changes |
|---|---|---|---|
| The questions | `components/onboarding/OnboardingFlow.tsx` | the road | the third question's answers |
| The first week on Today | `components/onboarding/FirstStepsNudge.tsx` | the road, the picks | seven steps, one a day |
| The cards on Today | `components/onboarding/RoadCards.tsx` | the road, the week | the account and reminders card, the second chance, the one Plus card |
| Today's greeting | `components/today/GreetingHeader.tsx` | the type | the feast or saint, the day in one line, or a verse |
| Today's church rail | `components/today/ChurchTodayRail.tsx` | the level's fasting view | the fast shown, softened or hidden |
| The first Liturgy reminder | `components/today/FirstLiturgyReminder.tsx` | the type | a line or a card |
| Today's catechism | `components/catechism/CatechismToday.tsx` | the type | a line or a card |
| The reading room | `components/reading/ReadingRoom.tsx` | the level | its first row |
| Theology | `components/theology/TheologyHub.tsx` | the level | its head |
| Settings, Your space | `components/settings/SettingsClient.tsx` | every answer | shows the answers, and changes them |

**The numbers, counted by the test on 2026-11-22.** The questions can make 44,480 different sets of answers. 3,336 of them give no road, and Purify as it always was. The rest lead to 4,161 different first weeks. Every one of them has seven pages, no page twice, and ends at its road's own door: 0 faults.

## 2. What the map shows

- **The web is small where it is decided.** Three components read the road. The 4,161 weeks come from one rule (a reader's own picks arrange the road's seven), not from 4,161 things anyone wrote. There are nine weeks written by hand (the Protestant road has two) and 34 pages they draw on.
- **Five pages come only when a reader picks them** (the lives of the saints, What the Orthodox believe, Fasts and feasts, Morning prayers, the Book of Job). **One page is in the list and in no week:** A path through the Fathers.
- **Every road outside the practicing ends at a parish or a first Liturgy.** The test holds that.
- **The level is read before the background.** A reader from any background who says they are practicing is on the practicing road or the road back. Whether a practicing Catholic or Protestant reads that question as about their own church is worth a count.
- **The design note's own map (3.6) planned ten things by road.** In the code the road decides three (the third question, the first week, the Plus card) and the level or type decides the greeting and the fast. For the others (the month's thing, where the Bible opens, words explained, the saints shown first, reminders by road, the tone of the first prompts) no component reads the road.
- **The one Plus card comes after the first week on every road.** The note planned week three for some.

## 3. Where control is missing today

1. Until today the map was a table in a note of 1,830 lines. The note says what was planned; the code says what was built. `reader-map.txt` now says what is built, for the weeks, the roads, the types, the questions and the Plus card. What each of the ten places draws is still told by reading its component.
2. Nothing stops an eleventh place. Any component may read a reader's answers and show something different.
3. No section has one row that says who gets it, when, whether it is free, where its words come from, who reviewed them, and how it is counted. Those facts are in six files and a note.
4. He cannot see a road as its reader sees it without walking the questions in Testers mode.
5. The counts are by background and level as far as `lib/onboarding/counting.ts` shows (not read in full), not by road. A road that loses its readers on day three looks like every other.

## 4. The proposal for 2.0: one ledger, and nothing off it

For his yes, part by part.

**A. One ledger.** Every section given to a reader because of who they are is one row in one file: its name, where it shows, who gets it (roads, types, levels), when (which day or week), what it opens, free or Plus, where its words come from (the catalogue, a page's own name, or text the clergy queue has passed), how it is counted, and its switch. A learning curve in 2.0 is then a set of rows, not code spread through the screens.

**B. Nothing off the ledger.** A test reads `app/`, `components/` and `lib/` and fails when anything outside the ledger's own readers looks at a reader's answers, the way `noSparkle` and `noSideStripes` hold the app. The ten places above become the named list. An eleventh needs a row.

**C. Every row whole.** The same test fails a row with no count, no switch, a page that does not exist, a Plus page in a free week, or words that are neither the app's own nor passed by the queue. (`week.test.ts` already holds each step to a page that exists and is free.)

**D. The map draws itself.** `reader-map.txt` is written from the ledger. In Admin, a page "Reader map": choose a road and see that reader's first month day by day; choose a section and see who gets it; beside each row, how many reached it and how many went on. The counts stay totals with no account, as now.

**E. Walk as.** Settings, Testers gains "Walk as": open the app as any road, on any day of its curve. The pre-build gate walks every road's rows.

**F. Limits that keep it a web he can hold.** No more roads than eight without his word. A new row has its count before it ships. No row changes what a council, a saint or a prayer says (the roads' own rule, `lib/onboarding/road.ts`). A row with new teaching waits for the clergy queue. A reader's background stays on the device unless he and a lawyer say otherwise.

## 5. Size and order

Sizes are this chat's judgement, not measured.

| Part | Size | Needs |
|---|---|---|
| A and C: the ledger and its test, holding only what exists today | small | his yes |
| B: nothing off the ledger | small | A |
| D, the file: the map written from the ledger | small | A |
| E: walk as | medium | his yes, a design |
| D, the page in Admin, with counts by road | medium to large | counts by road (a new closed list, and the privacy page read again), a design, his yes |
| New rows for 2.0's curves | by the row; new teaching is the slow part | the clergy queue |

## 6. Asked of him

1. Is the ledger (A to C) a yes?
2. What must he see for each road first: the reader's first month as a page, or the numbers that show where each road loses its readers?
