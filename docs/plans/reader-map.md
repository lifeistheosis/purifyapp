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

**The numbers, counted by the test on 2026-11-22.** The screens can give 30,024 different sets of answers (a skip counted as an answer). 3,336 of them give no road, and Purify as it always was. The rest lead to 3,857 different first weeks. Every one of them has seven pages, no page twice, and ends at its road's own door: 0 faults.

## 2. What the map shows

- **The web is small where it is decided.** Three components read the road. The 3,857 weeks come from one rule (a reader's own picks arrange the road's seven), not from 4,161 things anyone wrote. There are nine weeks written by hand (the Protestant road has two) and 34 pages they draw on.
- **Five pages come only when a reader picks them** (the lives of the saints, What the Orthodox believe, Fasts and feasts, Morning prayers, the Book of Job). **One page is in the list and in no week:** A path through the Fathers.
- **Every road outside the practicing ends at a parish or a first Liturgy.** The test holds that.
- **The second question changes with the first answer, and that is decided on the screen, not in a rule file.** The Orthodox are asked where they are now (practicing, coming back, preparing). Everyone else is asked whether they have been to an Orthodox church (not yet, going). "Prefer not to say" keeps the old question. So a Catholic is never offered "Practicing". The first writing of this map walked the rule files alone and counted 44,480 sets of answers and 4,161 weeks, some of which no screen can give; this chat told him of one such case as if readers met it, and corrected it the same day. The test now mirrors the screen and reads `OnboardingFlow.tsx`, so a change there is seen. It is the first thing the ledger should own.
- **Anyone already going to an Orthodox church is on the catechumen's road, whatever they come from.** A Catholic who has begun to attend gets the catechumen's week, not the Catholic one. A Catholic, Protestant or other Christian who skips the second question keeps their own road; an Orthodox reader who skips it has no road.
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

**F. Limits that keep it a web he can hold.** No more roads than eight without his word. A new row has its count before it ships. No row changes what a council, a saint or a prayer says (the roads' own rule, `lib/onboarding/road.ts`). A row with new teaching waits for the clergy queue. A reader's answers are kept with their account from 2.0, by the reader's own yes (his word of 2026-11-22, section 9, and the steps there).

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

## 7. The photos (2026-11-22, the mock-up phase)

His word: "we are in brainstorm mode. we are going into mock up phase. this phase requires photos for me and mock up draws, and we can make artifacts to visualize this."

**The page:** https://claude.ai/artifact/Tah94bmVtwZMogfBTuVVAz (private to him). Its source is `docs/plans/reader-map/page.html`, made from the design kit's template and from `reader-map.txt`, with 17 photos in `docs/plans/reader-map/img/`. It passes `node docs/brand/kit/check.mjs --page` (checkMock on five palettes at 360, 390, 412 and 1032, no parchment, no sideways scroll). It is 19,000 px long on a phone; whether each road should be a page of its own was asked of him.

**How the photos were taken.** `docs/plans/reader-map/shots.mjs` walks each of the eight roads from a first open on the native export of main (`b88c88b4f`, cut as the store build with Plus locked), at 390 by 844, on 6 December 2026, by tapping the questions' own answers. Nothing is put into the page. `docs/plans/reader-map/walk.json` is what each walk found. These are photos of the app as it is: no mock-up is drawn yet.

**What the photos showed.**

- The app agrees with the map: on all eight roads the first step on Today is the step the map names (the seeker's is their own pick, as the rule says).
- The one card that differs by road is low on the first screen. On a phone 844 tall its top is at 636 to 709 px and the tab bar begins near 760, so its Begin button is under the tab bar on all eight roads, and on the practicing road only its small first line shows.
- Catholic, Protestant, Christian, seeker and newcomer see the same Today above that card: the greeting follows the reader's type, not the road.

**Not photographed yet:** the Plus card on day 8, the account and reminders card, the second chance, the Protestant road's second order, and days 2 to 7 on Today.

**Mock-ups offered, none drawn:** the week's card where a new reader sees it without scrolling; "Walk as" in Settings, Testers; the reader map as a page in Admin; and what a curve gives after day seven. Each would be drawn from the app's own components on the export, changing only what is proposed, and held to `checkMock` (CLAUDE.md, "Mockups").

## 8. What the map is for (his word, 2026-11-22)

"so what I want to know the user to help enhance their experience based off their preferences and their needs to then also to help them convert to premium and learn the Orthodox church"

Read by this chat as three aims in one line: know the reader; fit the app to what they want and need; and by that fit help them learn the Church and, where it serves them, take Plus. Brainstorm only; nothing below is built.

**What the app knows of a reader today, and where it is kept**

- On the phone only: where they come from, how far along they are, whether they are coming back, and their fast (his "yes privacy", 2026-11-11). What they are looking for is kept with the account too.
- On the server: totals only. The questions' answers are counted as totals (`lib/onboarding/counting.ts`). The seven later counts (the first prayer or chapter, the week's steps, accounts, reminders, the Plus sheet's steps, purchases, the two cards on Today) carry nothing about where a reader comes from in faith, and a test holds that (`lib/analytics/moreCounting.ts`; the design note, section 11).
- So the phone can fit everything to its reader, and he can see how many readers stop at day three, but not which road they were on. That line was drawn on purpose.

**What his aim still lacks, found in the code and the note**

1. **The need.** The note's 3.3 designed a quiet row under the first question (peace, comfort in loss, someone who is ill, wanting to pray and not knowing how), kept on the device, taking the first three days of the week. The photo of the first question shows no such row.
2. **After day seven.** The road stops carrying a reader after the first week. "The month's thing" of the note's own map is in no component.
3. **What a reader does.** The app fits by what a reader says. What they open, finish or pass over changes one thing: two steps passed over in a row end the week (`lib/onboarding/week.ts`, PASSES_THAT_END).
4. **Teaching to give.** The catechism's bank holds no questions (`data/catechism/questions.json`, 0 on 2026-11-22), so Today's catechism draws nothing. Five of the seven studies a Catholic's or a Protestant's road would lead to are held back until repaired (`lib/onboarding/week.ts`, at ROAD_WEEKS; clergy queue item 5).
5. **The bridge to Plus.** One calm card after the week shows the one feature that fits the road (built). Every reading plan is Plus, and a plan is the natural month for four of the eight roads; the note's 3.7 left the first plan as his decision (one plan free, the first seven days of any plan free, or the lock as it is). No decision of his was found.
6. **By road, he cannot see.** By design, as above.

**Two rules offered for his yes.** Both are the house's own already, each said in one line.

- Know the reader on their phone; count readers only as totals. **He said no to this one the same day: "no more local. it stays on their accounts." See section 9.**
- The road into the Church is free; Plus is the deeper study beside it. Never in the questions, never in the first week, never at a point of need (the note, 3.7; his 111).

**Offered as the next thing to draw:** one reader's first month, day by day, as a page: what the phone knows, what Today gives, where they learn, where the door is, and where Plus is first shown. Week one from photos; weeks two to four drawn as proposals from the app's own screens.

## 9. On their accounts, not local (his word, 2026-11-22)

"no more local. it stays on their accounts."

Said when this chat offered the rule "Know the reader on their phone; count readers only as totals". It reverses his "yes privacy" and "yes fasting" of 2026-11-11 (call 32), by which the answers about a reader's faith (how familiar they are with Orthodox Christianity, coming back, where they come from, their fast) stay on the device and are taken off any account that held them (`lib/onboarding/accountSync.ts`, `lib/onboarding/__tests__/faithAnswers.test.ts`). A decision for 2.0, made in brainstorm. Nothing is built or changed.

**What it gives.** One reader, the same on every device. Emails and reminders that follow the road. And he can see by road: which road stays, which stops at day three, which takes Plus.

**What stands in the way today, in the app's own words.** The privacy page says: "Your answers themselves stay on your device, for making Purify yours. If you sign in, your answer to what you came for is kept with your account too; your answers about your faith, how familiar you are with Orthodox Christianity and your background, are not kept with it." (`components/legal/PrivacyText.tsx`). And 1.9 clears those answers from an account at sign-in.

**What must be true before a build keeps them.** Each is his step, or needs his word.

1. The reader is asked, in plain words, where the question is asked: that the answer is kept with their account, and what for. "Prefer not to say" stays, and nothing is required. Where a person comes from in faith is special-category data in the EU (GDPR, Article 9) and sensitive data in several US states: it needs the reader's own clear yes.
2. Readers who answered under today's promise are asked before anything of theirs leaves their phone. Nothing is moved silently.
3. The privacy page says the new thing before the build ships, and the change is listed as that page promises. The stores' data forms are changed to match (Apple's "Sensitive Info", Google Play's "religious beliefs").
4. A reader can see what is kept, change it and remove it (Settings, Your space, already shows and changes the answers), and deleting the account deletes it.
5. It is kept where only the reader can read it: a table under row-level security, not the sign-in record. Today the account's copy is `user_metadata.purify_space`, which arrives with the session and so travels with every signed-in request. A person's faith should not ride there.
6. The admin does not show one person's faith by default: totals by road, and a named reason before one person's row is opened.
7. A lawyer reads 1 to 4 once. For some readers this is dangerous to have known (a convert where conversion is punished), which is why it is asked, never required, and removable.

**What it changes in this plan.** Rule one of section 8 falls. 4F's limit becomes "kept with the account, by the reader's yes". Counts by road become possible from accounts; whether the anonymous totals also carry the road is a second decision.

**Decided the same day: "just add it in v2.0 with new terms".** So it is in 2.0's plan, and it ships together with new terms. Still brainstorm: nothing is built.

**What "with new terms" takes, in this repository.**

- The privacy page (`components/legal/PrivacyText.tsx`) and the Terms say the new thing. Their wording is his to sign off (legal acceptance is a stop condition, AGENTS.md); it is drafted for his word, as 1.9's lines were.
- The Terms' effective date moves (`lib/legal/version.ts`), so acceptance is asked again where the app asks it, and the terms email goes from Admin (`app/api/admin/email/terms`).
- New terms tell every reader. For readers in the EU they do not stand in for the reader's own yes: keeping a person's faith has to be asked for by itself, not folded into terms (GDPR, Articles 7 and 9). One plain line and a clear choice at the question does it. The lawyer's read settles the wording. Said to him in the chat.

**What 2.0 takes on for this** (a list for the plan, none of it begun): the new terms and privacy text; the line and the choice at the question; asking readers who answered before; a table under row-level security in place of the sign-in record (a migration: his sign-off on the SQL, and merging it to main runs it on production); the end of 1.9's clearing of these answers (`lib/onboarding/accountSync.ts`) and its test rewritten to the new rule (`lib/onboarding/__tests__/faithAnswers.test.ts`); the stores' data forms; and totals by road in Admin.

**EU readers are asked in their own onboarding (his word, the same day): "eu users get it in their specific onboarding".** So the reader's own yes is a step of the questions for readers in the EU, and readers elsewhere are told by the new terms. Brainstorm; none of it is built. How this chat reads it, for his yes:

- **The app has to know who is in the EU, and today it does not.** The only country in the questions is the one a priest or deacon picks for where they serve (`components/onboarding/OnboardingFlow.tsx`, `clergyWhere`). No file in `lib/` works out where a reader is. The way that keeps the most on the phone: the device's own time zone and region, read on the device, with nothing sent. A named list is needed, since Cyprus keeps an Asian time zone and the Atlantic islands and the French overseas departments are in the Union.
- **When it cannot tell, the reader is treated as in the EU.** Asking someone who did not need asking costs one tap; not asking someone who did is the fault.
- **"EU" here is the EU, Iceland, Liechtenstein, Norway, the United Kingdom and Switzerland.** The first four are the same law; the last two keep the same rule for a person's faith.
- **One more step, and only that.** After the questions about faith: keep my answers with my account, or keep them on this phone only. A reader who chooses the phone is fitted as every reader is today. Nothing else in the app differs by where a reader lives.
- **As easy to take back as to give.** Settings, Your space carries the same choice; turning it off removes the account's copy.
- **For the map and the ledger:** where a reader is becomes one more input, and it decides one row. `reader-map.txt` and its test grow by that input when it is built.
- **For the lawyer's read:** the wording of the choice, the list of countries, and age (in the EU a child's consent needs a parent's below an age each country sets between 13 and 16).

**This chat's default, his to change:** a reader with no account keeps their answers on the phone until they sign in, and from then they are kept with the account. No reader is made to make an account before the questions. Asked of him and not answered yet; this is the choice that changes least.
