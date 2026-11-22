# Hand-over: the email revamp, stage 1

2026-11-21. One capped worker chat, started by the arbiter at the owner's choice ("One fresh chat, capped").

## What was made

One design of the 1.9 release email in the new look, in `docs/plans/v1.9/email-revamp/`: the email's HTML, its stills, the seven screens of the app it shows, the scripts that made them, and a README with the reason for each choice. Nothing under `lib/`, `app/`, `components/`, `android/`, `ios/` or `supabase/` was changed. Nothing was sent to anyone.

**His page:** https://claude.ai/artifact/KFjrCn4eUBg33ptSJMhHDD (private to him). It waits for his yes or no.

## What was checked

- `node docs/plans/v1.9/email-revamp/make.mjs --check` passes: checkMock's 15 rules at 360, 390, 412 and 1032 on five palettes, no sideways scroll, every link 44 px or more, the HTML 15 KB, each picture under 100 KB, only Dark's colours, no em dash, and every word still said with pictures off.
- `node docs/brand/kit/check.mjs --page` passes on his page.
- Not checked: any real mail app. Not run: the unit tests, since no code they read was touched.

## Faults and oddities found, not mended

1. `docs/plans/v1.9/store/cards/cards.mjs` cannot open the translations list on the export of main `6700c2e65`: `getByRole("button", { name: /KJV/ }).first().click()` opens nothing there (the first match is hidden and the list opens to a touch), and the list's dialog is named "John 1", not "Translation". `shots.mjs` here taps the visible button instead. The Bibles card would fail if it were made again from that export.
2. The email says "Seven more Bibles" (with the World English Bible); the social card says "Six more Bibles". Each follows its own source. He may want them to agree.
3. In a container `node scripts/release.mjs email` writes its links to `purifyapp.onrender.com`. I did not check what the main web's sender writes.
4. The email's plain-text part leads each point with an emoji; the HTML has none. The design has none.

## His words

- 2026-11-21 06:53 UTC, after the page and "Yes or no?": "sure let's just finalize this and send it out tonight"
- 2026-11-21 13:40 UTC, after this chat asked (1) "Do you lift my cap so I build stage 2 here now? Or should the arbiter take it?" and (2) "If it is built and checked tonight, do I have your word to push to main so you can send the test to yourself?": "do that now"
- 2026-11-21 19:23 UTC, after this chat asked for his word on main and on the look's number, and said no test send exists for a release: "test send to my email only (lifeistheosis@gmail.com)"
- 2026-11-21 19:34 UTC, with the two questions on main and the look still open: "can you scan the admin panel and do a revision on it?. brainstorm mode on. and find any sections that aren't really optimal for my admin panel ux experience"
- 2026-11-21 19:46 UTC, after this chat's first admin notes, made from the code alone: "I need you to use the admin panel to see the design"
- 2026-11-21 19:46 UTC, after this chat said the preview showed the layout but none of his data: "just use example data for yourself"
- 2026-11-21 21:19 UTC, after eight admin notes and two questions ((1) "Which do you feel most? I would start with 1 and 2 ... I would draw it first for your yes." (2) the word for main, and the look at 3 or 2): "do all"
- 2026-11-21 22:14 UTC, after this chat asked "Do I have your word to push to main? It deploys the website, and would carry the email work and these three fixes.": "yes oush"

"yes oush" is read as: yes, push. It is his word for main, for the email work and the three admin mends. He did not answer 3 or 2, so the look stays as built and tested, at 3.
- 2026-11-22 16:23 UTC, with a screenshot of purifyapp.onrender.com/admin showing the site's 404 page ("This page is not in our index."): "I can't login to the admin panel"
- 2026-11-22 17:02 UTC, with two PDFs attached ("Purify App Growth Framework" and "Enterprise Growth Strategy & Financial Model"): "this is for v2.0 and some goals we have"
- 2026-11-22 17:09 UTC, after this chat read one of the two documents as planning a separate Catholic track: "its Eastern Orthodox based app with different LEARNING CURVES (targeting onboarding)"
- 2026-11-22 17:19 UTC, after this chat said 1.9's roads are the learning curves already: "ensure each section that's given to the user Is fully mapped out to we can control this spiderweb type of system we are going to create"
- 2026-11-22 17:30 UTC, after the reader map and the ledger proposed for 2.0: "we are in brainstorm mode. we are going into mock up phase. this phase requires photos for me and mock up draws, and we can make artifacts to visualize this."
- 2026-11-22 17:52 UTC, after the first page of the mock-up phase: "so what I want to know the user to help enhance their experience based off their preferences and their needs to then also to help them convert to premium and learn the Orthodox church"
- 2026-11-22 17:55 UTC, after this chat offered the rule "Know the reader on their phone; count readers only as totals": "no more local. it stays on their accounts."
- 2026-11-22 17:59 UTC, after this chat listed what must happen before a build keeps a reader's answers with their account: "just add it in v2.0 with new terms"
- 2026-11-22 18:01 UTC, after this chat said new terms alone do not cover readers in the EU, who need their own yes at the question: "eu users get it in their specific onboarding"
- 2026-11-22 18:04 UTC: "and I remember we had issues dropping purify in china and that we need some type of license for China can you look into that? (also we needed a LLC to get it)"
- 2026-11-22 18:08 UTC, after the note on China: "that's fine no mainland china"
- 2026-11-22 18:14 UTC, after this chat offered two drawings (1, the EU step in onboarding; 2, the Catholic reader's first month) and asked "Which one first?": "yes"

"yes" is read as: go, in the order given. The first is drawn now; the second waits until he has seen the first.
- 2026-11-22 18:30 UTC, after mock-up 1: "Okay, first, I want to talk to you about the actual onboarding itself, because there was another company, they spent $1 million on A/B testing. And the majority of it went to the paywall design and the onboarding design and the different screens that each user sees. So ask a bunch of questions about that, give a bunch of suggestions, recommendations, and yeah."
- 2026-11-22 18:49 UTC, after twelve suggestions and twelve questions on onboarding and the paywall: "don't show the plus on the onboarding they must run into plus feature or click on the premium pill"
- 2026-11-22 19:00 UTC: he typed "/plugin marketplace add taoufik123-collab/claude-watch" and "/plugin install watch@claude-watch", with a YouTube link (video qK7WYCMvjUw), was told "/plugin isn't available in this environment.", and asked: "why"
- 2026-11-22 19:11 UTC, with four pictures of TikTok's own video analysis (the cross, 28s; an icon, 11.6s; the 1.9 video, 20s; the Pantocrator, 9.9s): "real quick which one of these are good for promo?" Answered in chat from the pictures alone: the 1.9 video, the only one about the app and the one passed on far more than the rest; the two short icon videos for reach; not the cross, which almost nobody finishes; and a warning that on all four people leave at about the same early moment whatever the length, so paid views buy little yet. Nothing was built and nothing was spent.
- 2026-11-22 19:14 UTC, after the answer on his four TikTok videos: "should I promo my top videos? or recent new ones" Answered in chat: the top ones, chosen by how many watch to the end, pass it on and follow (not by views), still true of the app, and matched to what he wants back (followers, or installs through the link); a new video is left for two or three days first, since his own graphs show a video does most of its work on its first day. He was asked for the analysis of his top two or three of all time. Nothing was built and nothing was spent.
- 2026-11-22 19:35 UTC, with a picture of a branching chart from a game (a start, grouped boxes, lines that fork, endings with pictures): "make a spider web / family tree  type of artifact for the different screens and sections and pathways" Made: the reader web, https://claude.ai/artifact/53Drdsrfn8Nmo6gFnaW5z6, drawn by `docs/plans/reader-map/web.mjs` from `docs/plans/reader-map.json`, which the reader map's own test now writes from the rules. The game's look was not copied: the form (a branching chart, one path lit) is his ask, the look is the kit's. Two pieces were added to the kit for it (Web, Choice). It passes the kit's check, and its reasons are on the page. The whole of it is section 11 of `docs/plans/reader-map.md`. It awaits his yes or no.

"do all" is read by this chat as: mend all eight admin notes, on the branch. It names neither 3 nor 2 and is not read as his word to push to main.

The second is read by this chat as: lift the cap and build stage 2 here now. It is NOT read as his word to push to main: that is asked again, alone, when the work is checked.

The first is read by this chat as his yes to the design and his ask to start stage 2 and send tonight. Stage 2 was not started here: this chat is at its cap, and a send needs code in `lib/email`, the pictures on the main web (a push to main, which deploys) and the first-send guard. This chat asked him whether to lift the cap.

## The count

About 32 tool calls of the 60. I cannot read my tokens; my own estimate is near the 150,000 cap, so I stopped here. One native export was built (about 5 minutes on this machine). No other chats, no subagents, no scheduled tasks.

## What stage 2 needs

His yes on this design first. Then, each at his word: the pieces in `lib/email/kit.ts` and the release letter in `lib/email/kitLetters.ts`, the pictures in `public/email/`, `READER_EMAIL_LOOK` raised (the first email in the new look goes to him alone), the tests, the kit's email folder, and the other emails. The list is in the README, "What stage 2 would change".

## Stage 2, built on the branch (2026-11-21, after his "do that now")

Not on main. Nothing deployed, nothing sent.

**What changed**

- `lib/email/kit.ts`: the sans letter's pieces (`openingSans`, `hero`, `pointCard`, `paraSans`, `closingLine`, `buttonSans`, `signOffSans`) and `shell`'s `sans` option. With `sans` off, every older letter is drawn byte for byte as before (the kit's own test still holds them to the builder).
- `lib/email/kitLetters.ts`: a release letter with points is drawn as the design (`releaseLetter`). The Sunday email, the monthly note and the shop email are untouched.
- `lib/whatsNew/releaseEmail.ts`: 1.9's hero and six screens, with their words.
- `public/whats-new/1.9/email-*.jpg`: the seven pictures (the website's alone; the apps' export prunes them by name).
- `lib/email/look.ts`: `READER_EMAIL_LOOK` is "3".
- Tests: `lib/email/__tests__/kitLetters.test.ts` (four new, for look 3) and `campaignBodies.test.ts` (one brought to the new markup).

**What was checked**

- `npm run typecheck`: 0 errors. `npx vitest run lib/email lib/whatsNew lib/admin`: 166 files, all pass. eslint on the changed files: clean.
- `node scripts/release.mjs email` writes the new letter (15.8 KB). Drawn at 390 wide it is the design he saw, 2 px shorter: the sender keeps the kit's own Unsubscribe button (13 px words), where the design drew 14 px.
- The website's production build (`npm run build`): the first run FAILED at its type check, on one line of the new test (`name: null`), since mended (typecheck is 0). A line here said "exit 0" for a few minutes; that was wrong, read from the shell and not from the build. The second run, on the mended code (`d4db4a9c2`), passed: the build's own exit was 0, with 6,527 pages generated and no type error.
- Not checked: any real mail app. The kit's own email folder (`docs/brand/kit/email/`) does not hold look 3 yet.

**What he must know before a send**

1. **A send he presses in Admin is not held by the first-send guard** (`lib/email/look.ts`): the release email goes to every account that has not said stop. The panel has no "send to me only" for a release. So nothing in the code shows him the new letter in his own inbox first.
2. **Raising the look to "3" holds the next automatic email instead.** That is the Sunday email of 22 November: it would go to him alone, and readers wait until he says on the desk that he has seen it. The Sunday email itself did not change.
3. **Every list send refuses without `EMAIL_POSTAL_ADDRESS` on the server** (`lib/email/consent.ts`). I cannot read whether it is set on the main web.
4. The pictures are on the main web only after a push to main.

## The test send (2026-11-21, at his "test send to my email only")

Built on the branch; not on main, so it does not exist on the main web yet.

- `app/api/admin/email/campaign/test/route.ts`: POST `{ kind }`. Admin only. It sends the draft as it would go to the signed-in admin's own address and no other (the address is the session's, never one the request names), with "[Test]" before the subject. It starts no campaign and no job and records no mailing, so the real send can still go. Refused without the postal address, like every list email.
- `components/admin/email/CampaignCard.tsx`: a "Send a test to me" button under the draft.
- `lib/email/__tests__/campaignTestSend.test.ts` holds it to one address.
- It goes to the address of the admin account he is signed in with. He named lifeistheosis@gmail.com; if he signs in to Admin with another address, the test goes there.
- Checked: typecheck 0, eslint clean, `npm run test:unit` 15,530 pass and 1 fails. The one failure is `lib/downloads/__tests__/log.test.ts` ("lights the bell for an end not yet seen"), which fails the same way with my changes set aside: not mine, not mended.
- Not checked: the route against the real sender. That can only be tried on the main web, after a push to main.

## Ready for main, not pushed (2026-11-21)

Main moved today, from `6700c2e65` to `b89b56b11` ("Ease the database"), by another hand. On a local line from `b89b56b11` (a worktree in this chat's scratchpad, branch `email-look-3-for-main`, pushed nowhere) the three code commits apply cleanly: `07617e006`, `4b19845ca`, `2ea506f6f`, with the branch-only docs left out. 16 files: `lib/email` (the look, its tests), `lib/whatsNew/releaseEmail.ts`, the test-send route and its button, and the seven pictures. There: typecheck 0; `npx vitest run lib/email lib/whatsNew lib/admin` 165 files, all pass. The website build was run on the branch (passed), not on that line.

A push to main deploys the main web. It waits for his word, asked plainly. The scratchpad does not outlast the container: if it is gone, cherry-pick the three commits onto main again.

**If he says yes, in order:** push the line to main (`PURIFY_ALLOW_MAIN=1`, at his word only); `node scripts/release.mjs live` or `curl` purifyapp.net until the deploy serves; `curl -I https://purifyapp.net/whats-new/1.9/email-today.jpg` is 200; he opens Admin, Email, the release draft, presses "Send a test to me", and looks at it in Gmail, Apple Mail and Outlook; only then does he press the real send.

## The admin panel, looked at (2026-11-21, brainstorm only; nothing changed)

Seen through `/admin/shell-preview` on a local `next dev` (the real shell, no sign-in, every API answering 403, so layouts and empty states but none of his data), at 390 by 844 and 1440 by 900: Home, Traffic, Money, Users, Orders, Catalogue, Releases, Content. Notes given to him in the chat; none acted on.

**A fault found, not mended:** `next dev` fails on the branch with "Parsing CSS source code failed" at `app/globals.css`, because Tailwind reads `docs/handoffs/updates-98q.md`, which holds a Tailwind class name written with a placeholder in angle brackets inside it (the fast colours' background class, with the word kind in angle brackets where the fast's name goes), and writes it as a class. This note first quoted that text itself and so broke the dev server a second time; never write it out in a file Tailwind reads. The production build only warns. For the look I set that one doc aside locally and put it back; it was not changed or committed. Also: `/admin/shell-preview?tab=x` and `#tab=x` on a first load both stay on Home; only a tap in the menu switches the page.

**Looked at again on example numbers** (his word: "just use example data for yourself"). The chart gallery (`/admin/charts-preview`, its own sample data), then Home and Money with invented figures answered to the page inside this chat's own browser (Playwright, `/api/admin/overview`, `stats`, `traffic`, `hourly-goals`, `money`). Nothing was saved, nothing is in the repo, and no picture of invented money was sent to anyone. Traffic did not draw: my example for it was incomplete, which is my example's fault and not the panel's. The dev server's fault above is still there for the next chat; the one doc was set aside for the run and put back.

## The admin panel: three small mends on the branch (2026-11-21, at his "do all")

Of the eight notes given to him, three were mended, three turned out wrong when the code was read, and two wait for a plan.

**Mended, on the branch, not on main:**
- `components/admin/AttentionStrip.tsx`: a band holding more than three things opens folded behind its headline, with a 44px "Show all N" button. Nothing is dismissed; with three or fewer it is as before.
- `components/admin/tabs/HomeTab.tsx`: on a phone "Still waiting on you" comes before the timeline's list; on a wide screen it stays beside it.
- `components/admin/tabs/MoneyOverviewTab.tsx`: on a phone each of the three lines stands under its name.
- `lib/admin/__tests__/phoneWalk20261121.test.ts` holds all three. Typecheck 0, eslint clean, `npx vitest run lib/admin components` 112 files pass. Seen in the shell preview at 390 wide on example numbers; not seen on the main web or on his phone.

**Wrong on reading the code, and said so to him:**
- The status band is drawn only while something is wrong (its own header says so). It stood on every page in the preview because every check fails there.
- Home's week bars are drawn to scale from zero. They looked alike because my example days were alike.
- The phone's bottom bar and the folded Tools line are his own: the bar follows the pages he opens most (`lib/admin/rail.ts`), and the Tools line is the rail "as he picked it" (`lib/admin/pages.ts`).

**Waiting for a plan and his yes:** Releases' length on a phone; Traffic's seven tabs running off a phone's edge (a scrolling row by design).

## Pushed to main (2026-11-21, at his "yes oush")

`b89b56b11..b88c88b4f` on main: five commits, 20 files (the release letter in look 3 and its tests, 1.9's seven pictures, the test send and its button, the three admin mends and their test). The branch-only docs were left out. Before the push, on that exact line: typecheck 0; `npx vitest run lib/email lib/whatsNew lib/admin components` 166 files pass; `npm run build` exit 0 with 6,527 pages; then the push guard's own checks passed.

**The way back:** `b89b56b11` is the commit main held before.

`READER_EMAIL_LOOK` is "3" on main: he did not choose between 3 and 2. So the next automatic list email (the Sunday email of 22 November) goes to him alone, and readers' automatic emails wait until he says on the owner's desk that he has seen the look. A send he presses himself is not held.

## Two documents for 2.0 (2026-11-22; brainstorm only, nothing built)

His words: "this is for v2.0 and some goals we have", with two PDFs: "Purify App Growth Framework" (one page) and "Enterprise Growth Strategy & Financial Model" (two pages, marked confidential).

**They are not in this repository, and neither are their figures or their plans.** This repository is public (GitHub's own answer on 2026-11-22: `private=false`), and the second document is marked confidential. He has the originals; a chat that plans 2.0 asks him for them. This chat's reading of them (what they ask for, the sums checked, the risks) is in the chat itself, not here.

**What the app already has toward goals of that kind** (from the code, which is public already):

- First run already asks a reader's background and how far along they are (`lib/onboarding/`). The answers stay on the device and are not in the account (`state.ts`, `accountSync.ts`), and they are counted as plain totals with no session, account or address (`counting.ts`, his word of 2026-10-26).
- Purify Plus's introduction already changes with that answer (`lib/onboarding/plusIntro.ts`).
- The admin's menu already reorders itself by the pages he opens (`lib/admin/rail.ts`, `railFromUsage`).
- The Traffic figures are daily buckets (`analytics_daily_buckets`, `app/api/admin/traffic/route.ts`): a month's "visitors" is its days added up, so a reader who comes every day is counted every day, and a sign-up rate over that falls as returning readers grow. No split of new readers from returning ones exists yet.
- Lifecycle emails are in code (`lib/email/lifecycle.ts`, `lib/email/retention/`); whether they are switched on was not checked.
- The owner's own projection is `lib/owner/projection.ts`. The word churn does not appear in `lib/owner/`; whether it models readers leaving was not read.

**For whoever plans 2.0, three cautions that need no figures:** anything that keeps a reader's religious background on the server is sensitive personal data and needs a lawyer's read first (today it stays on the device, on purpose); doctrinal content of any kind goes to the clergy queue and is public domain only (`docs/editorial-standards.md`); and a survey may never stand between a reader and cancelling. **On the first of these he decided, 2026-11-22: "no more local. it stays on their accounts."** It reverses his "yes privacy" of 2026-11-11, and the privacy page promises the opposite today; what must be true before a build does it is `docs/plans/reader-map.md`, section 9.

**His clarification (2026-11-22):** "its Eastern Orthodox based app with different LEARNING CURVES (targeting onboarding)". So the framework's tracks are not separate teachings: Purify teaches one faith, and a reader's background sets where they start. This chat first read the framework's table as a separate Catholic content track. That reading was wrong, and the table's wording invites it (it lists a tradition's own teaching under each track). Whoever builds from the document reads "track" as "learning curve".

**That system is 1.9's roads, already live** (`lib/onboarding/flags.ts`, `ROADS_LIVE = true`). The welcome questions ask background and level (`flowSteps.ts`). The reader's type decides how Today looks (`readerType.ts`: orthodox, learning, new). The road decides the first week (`road.ts`: practicing, returning, catechumen, catholic, protestant, christian, seeker, newcomer; `week.ts`: seven steps a road, all free, each a page the app already has). The rule that keeps it one faith is in `road.ts`: no page of content knows who is reading it; a road changes the order and the first step, never what a page says. Three tests count since release day (`lib/ab/tests.ts`: account-place, plus-introduced, plus-sheet-order).

**What the framework asks beyond the roads, as this chat reads it:** wording and presentation that change with the reader (against the rule above as it stands; a glossary every reader can open would keep it); introductory lessons written for a background (new teaching, so the clergy queue); and reminders and win-back messages that follow the road (the road is on the device, so either the device sends them or the road goes to the server, with the cautions above). Asked of him: whether 2.0 builds on the eight roads or regroups them, and what a curve is after week one.

**Found on the way: the repository is public.** Asked of him in the chat, whether that is meant. Until he says, nothing confidential is written into it. The audit's open findings (`docs/audit/findings.yaml`) are readable by anyone while it is.

## The reader map (2026-11-22, at his "ensure each section ... is fully mapped out")

- `docs/plans/reader-map.md`: the plan. Its section 1 is the map of what a reader is given today; its sections 4 and 5 are the ledger proposed for 2.0, waiting for his yes.
- `docs/plans/reader-map.txt`: the listing, written from the rules (the questions, the type, the road, the nine first weeks, what each pick brings, the Plus card, the count).
- `lib/onboarding/__tests__/readerMap.test.ts`: walks all 30,024 sets of answers the screens can give, holds each to a whole week ending at its road's door, and fails when the written map is not the rules' own. A test only; no app code changed. On the branch, not on main.
- Counted that day: 3,336 sets of answers with no road, 3,857 different first weeks, 0 faults; ten components read a reader's answers, three of them the road.
- **A correction, the same day.** The map's first writing walked the rule files alone (44,480 sets, 4,161 weeks) and this chat told him "a Catholic who taps practicing lands on the Orthodox practicing road". No screen offers a Catholic that answer: the second question differs by the first answer, on the screen itself (`components/onboarding/OnboardingFlow.tsx`). The test now mirrors the screen and reads that file; the figures above are the corrected ones; he was told.

## The mock-up phase, begun (2026-11-22)

- The first page, private to him: https://claude.ai/artifact/Tah94bmVtwZMogfBTuVVAz ("Purify reader map"). The eight roads, photos of the real app (the questions, Today's greeting by type, each road's card on day 1), each road's seven days as rows that open the live pages, and the reason for each choice. Source and photos: `docs/plans/reader-map/`. The plan's section 7 (`docs/plans/reader-map.md`) says how the photos were taken and what they showed.
- Photos only. No mock-up is drawn; four were offered and he was asked which comes first.
- The native export used for the photos is in this chat's scratchpad and does not outlast the container; `shots.mjs` says how to cut it again.

## China, looked into (2026-11-22, at his question)

`docs/plans/china-availability.md`. In short: Purify is on Apple's store in the United States, Hong Kong, Taiwan and Macau, and not in China mainland (asked of the public store that day). Apple's own help says an app with religious content needs China's Internet Religious Information Permit; by news reports of China's 2022 rule that licence goes only to organizations set up in mainland China, and overseas organizations and those they set up there may not hold it. The LLC does not open it. One web-fetch helper read three pages for this (about 45,000 tokens); the law's translated text could not be opened.

**The repository being public is the house's own rule, not a fault.** `docs/OPERATIONS.md`, section on numbers: "The repository is public." This chat asked him about it three times before reading that line; the question is closed. What follows from it stands: no numbers, no keys, nothing confidential in these files.

- **Mock-up 1, 2026-11-22:** the EU step, "Where should your answers be kept?", private to him at https://claude.ai/artifact/WSJAh3ZLSaFJWmPGkP4gxp. Made from the app's own question screen on the export (`docs/plans/reader-map/mock-eu-step.mjs`), checkMock passing all fifteen rules. It waits for his yes or no; `docs/plans/reader-map.md`, section 10. Mock-up 2 (the Catholic reader's first month) is not begun.
