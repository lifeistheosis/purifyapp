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
- The road into the Church is free; Plus is the deeper study beside it. Never in the questions, never in the first week, never at a point of need (the note, 3.7; his 111). **He sharpened it, 2026-11-22 18:49 UTC: "don't show the plus on the onboarding they must run into plus feature or click on the premium pill".** So the ledger gains one fact for every road: the first lock its reader meets, and about when (`docs/plans/onboarding-2.0.md`, Settled so far).

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

## 10. Mock-up 1: where a reader's answers are kept (2026-11-22)

At his "yes" to the two drawings offered, the first of them. **The page, private to him:** https://claude.ai/artifact/WSJAh3ZLSaFJWmPGkP4gxp. It waits for his yes or no; nothing is built.

- **What it is.** One step of the questions, for readers in the EU: "Where should your answers be kept?", with two answers of the same size, neither chosen: "With my account" and "On this phone only". A skip is phone only.
- **How it was made.** `docs/plans/reader-map/mock-eu-step.mjs`, on the native export of main: the walk taps Begin, Catholic and Continue, stands on the app's own second question (a Step with two ChoiceCards), and changes only what is proposed: the title's words, a line under it as Step draws its `body`, the two cards' words, and their icons (User and Lock from `components/ui/icons`). The small line "About you" is the app's own (`onboard.level.eyebrow`).
- **Checked.** `checkMock` passes all fifteen rules on the mock-up (the script exits 0 only then). The page passes `node docs/brand/kit/check.mjs --page`. By eye: the app's own icons, plain words, no Plus on the screen, one existing key and the rest new words.
- **The words, new and his to pass:** title "Where should your answers be kept?"; under it "They say something of your faith, so the choice is yours. You can change it later in Settings."; "With my account", "Purify fits you on every device you sign in on"; "On this phone only", "Nothing about your faith leaves this phone".
- **Not checked:** the wording by a lawyer; how the app knows a reader is in the EU; the other languages; the screen in Arabic by eye (checkMock's mirror rule passed).

Mock-up 2, the Catholic reader's first month, is not begun: it waits until he has seen this one.

## 11. The reader web (2026-11-22)

His word, with a picture of a branching chart from a game: "make a spider web / family tree  type of artifact for the different screens and sections and pathways".

The map, drawn. https://claude.ai/artifact/53Drdsrfn8Nmo6gFnaW5z6 (his, private until he shares it). The page is `docs/plans/reader-map/web.html`.

**What it shows.** One sheet, read from the top: the first open, the first question and its eight answers (a skip is one), the second question's three screens by the first answer, the threads from each answer to its road (they cross, which is the web), the rule's question on the two strands that are asked it, the last question and the handoff on every strand, the roads grouped by how Today looks, each road's own week page by page with the section of the app each page stands in, and the one Plus card at the foot. Ten strands: the eight roads, the Protestant road twice (its two leans), and the readers with no road. One road is lit at a time; the rest stay faint and readable. Under it, the lit road step by step: who lands there, its week with how many other roads share each page, the photo of its first card, and what comes after the week. Then the pages that hold the most threads, and what each pick brings.

**How it is made.** Never by hand. `lib/onboarding/__tests__/readerMap.test.ts` now writes the same walk twice: `reader-map.txt` to be read, and `reader-map.json` to be drawn, in the screens' own words, and it holds both to the rules. `docs/plans/reader-map/web.mjs` reads the json and nothing else, and stops on anything the rules say that it has no place for (a road reached by two reader types, a week that is not seven pages, a new screen for the second question). After a rule changes:

```
READER_MAP_WRITE=1 npx vitest run lib/onboarding/__tests__/readerMap.test.ts
node docs/plans/reader-map/web.mjs
node docs/brand/kit/check.mjs --page docs/plans/reader-map/web.html
```

`web.mjs --check` fails when the page is not what the map draws now. This is part D of the ledger in section 4 ("the map draws itself"), made early as a page; in Admin it would be the same drawing.

**Its look.** Two pieces were added to the design kit for it, by the kit's own rule that a new need is a new piece: Web (a map of ways on the night) and Choice (a small choice of equal buttons). Both are in `docs/brand/kit/pieces.css` and `docs/brand/design-kit.md`, and the page passes the kit's check on five palettes at 360, 390, 412 and 1032. The reasons for each choice are on the page itself, under "Why it is drawn this way". It awaits his yes or no.

**What it does not show.** The locks a reader runs into along a road are not on the map yet (offered before: "first lock met" for each road). The Plus card at the foot is drawn as it is today, a live test; whether his rule of the same day ("they must run into plus feature or click on the premium pill") ends that card is still his to say. The web draws each road's own week before a reader's picks arrange it; the counts beside it say how many weeks come from each.

## 12. Numbers on the web: tracking from A to B (2026-11-22)

His word (20:22 UTC): "whwe need some way to actually track data from a to b to see which one is working."

**What is counted today** (read in the code this day).

- **Tests** (`lib/ab`). A device is shown a version (`ab_exposed`: the test, the version, the kind of device) and what it then reaches is counted for thirteen days (`ab_reached`): finished the questions, made an account, opened its first step, came back in its second week, tapped the button to subscribe, bought Plus. Admin, Onboarding, shows each version's totals and where the test stands (`lib/ab/panel.ts`); a count under twenty is not shown. Two run, from 2026-11-17 to 2027-02-09: where the account is offered (judged by readers coming back in week two, about 1,100 readers a version), and Plus as locks only or also one card after the first week (judged by Plus bought, about 1,140 a version). One waits for 2027-02-10: how the Plus sheet opens from a lock. One is planned: when reminders are asked.
- **The seven counts** (`lib/analytics/moreCounting.ts`): the first prayer or chapter finished, each day of the first week opened or closed (the day's number, never which step), an account made and where, reminders set, a "Try it" opened or the subscribe button tapped with the lock behind it, a purchase on the pricing page, a small card on Today answered or closed.
- **Locks** (`lib/analytics/lockCounting.ts`): which lock is tapped, and which leads to a purchase.
- **Where a visit came from** (`lib/analytics/source.ts`, `tag.ts`), on the visit's own row.
- **The questions, by answer** (`lib/onboarding/counting.ts`, his word of 2026-10-26: "how many Roman Catholics come, how many Protestants come"). Each screen reached, each answer given, a skip, a finish, and a note from the device on its second, seventh and thirtieth day that it came back. The finish and the notes carry the reader's answers (where they come from, how familiar they are, what they came for) and the link that brought them, if it was one of ours. Admin, Onboarding, shows finishes and returns by where a reader comes from, and the link that brought the most finishers (`lib/admin/onboardingSummary.ts`). The privacy page has said so since 1.8: "a reader who answered Catholic finished" is one more on a total.

All are totals, kept to the day, with no account, no session and no device on the row.

**What is not counted.**

1. The road itself. Finishing and coming back are counted by answer, so a road can be worked out from rows that exist (all but "coming back", which no row says). Nothing tallies it yet.
2. Anything after the questions, by answer. The seven counts, the locks and Plus carry no answer: their own header says "Nothing about where a reader comes from in faith is on any of them." So the week's days, a first prayer, a lock and a purchase cannot be read by road.
3. A step by its name. The week is counted by the day's number only.
4. Where a reader came from, past the questions. The link that brought a reader is on the finish and on the notes of coming back, when it was one of ours. A visit from a social app that carried no tag is known only as a visit, and no link is on a lock or a purchase.
5. One picture. The numbers stand in separate panels, and none is on the web.

(Corrected 2026-11-22, an hour after it was written: this list said nothing was counted by answer and that the source was on no row that says how a reader fared. The questions' own counts do both, and have since 1.8. He was told in the chat.)

**The proposal** (for his yes, part by part; nothing is begun).

- **A1. The road tallied from rows that exist.** Finishes and returns on days 2, 7 and 30 already carry the answers a road is made of. Admin can add them up by road today: nothing new is sent, and the privacy page already describes these rows. "Coming back" cannot be told from "practicing" until a row says it. Small.
- **A2. The road as one word on the rows that carry no answer** (the week's days, the first prayer or chapter, what a test's readers reach, a lock tapped, Plus bought): the eight roads and "none", a closed list. Totals only, no account or device on the row, no cell under twenty shown, as now. It is a count about faith on rows that were promised to hold none, so the privacy page says it first (his word, 2026-11-22, about 20:30 UTC: "yes we can update the privacy policy"), on the same footing as the questions' counts, and the lawyer's read of section 9 covers both. It also has to be read against the rule that a row which says too much describes one person (the note, 4.2). Small in code; the words are the slow part.
- **B. The numbers drawn on the web.** The reader web of section 11, in Admin: each plate with how many reached it and what share went on, a thread's weight by its readers, and for a running test version A beside version B. Medium. With A1 alone it can show the questions, the finish and the return for each road; the week, the locks and Plus wait for A2. A design first: the mock-up below.
- **C. The source as one word on the same rows:** a closed list of the app's own named sources and his tagged links, so that a video or a page is read by who stayed and not by who visited. On Android the store can say which link an install came from; on iPhone only the store's own report for a store page can. Medium, with a line on the privacy page, and each store's rules read when it is built.
- **D. A line in his weekly brief for each running test:** wait, version A leads, version B leads, or stop. The panel already works this out.

**The limit that no tracking lifts.** A few hundred new readers a week (the note, 4.3), and by road they are fewer still: a road with thirty new readers a week shows nothing for months. So a road's numbers are counts to watch, not verdicts; a verdict comes from a test of one large fork, on all readers together, on the website first, where the readers are.

**His yes (2026-11-22, about 20:30 UTC): "everything recommended let's do it. and yes we can update the privacy policy."** Read by this chat as: the four parts above, and the six ideas marked worth taking from the video (`onboarding-2.0.md`), each still with its own drawing for his yes, and the privacy page's own sentences still his to read before they stand (legal acceptance). The order of work is in `onboarding-2.0.md`.

**The mock-up of B.** https://claude.ai/artifact/8fm48CBrL6usMQkJftyzzy (his, private). `node docs/plans/reader-map/web.mjs --numbers` writes `docs/plans/reader-map/web-numbers.html`: the same web, with a count on every plate, a thread as thick as its readers (to scale), and beside each thread the share that went on. Under it, the lit road from A to B row by row, and the roads side by side. Every number is an example made in the script from round shares (a thousand readers in an example month); none is a count, and the page says so in its title line, its caption and under each table. A count under twenty reads "too few", as in Admin today, which also shows the limit: at that size four of the eight roads cannot be read at their door. It is a drawing of the idea on a kit page, not of the Admin page itself, which would be made from the admin's own pieces. The kit's Web piece gained what it needs for this (a plate's count, a thread's weight and share).

**Draft for the privacy page, for his reading (A2 and C). Not on the page.** To stand beside the page's sentence on the seven counts:

> From 2.0, a count of a step of your first week, of a first prayer or chapter, of a lock or of Plus may also say which of eight roads through Purify you are on. Your device works that word out from your answers to the welcome questions. It is one word from a short list, the same for every reader on that road: "a reader on the Catholic road opened day three" is one more on a total, never you. No session id, no account, no device id.

> The same counts may say which of our own links brought you, as the welcome questions' counts already do.

Each needs its German, and the test that holds the page to the counts (`lib/analytics/__tests__/moreCounting.test.ts`) keeps the count shut until the sentence is there.
