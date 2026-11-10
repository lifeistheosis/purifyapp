# Onboarding and the tailored Purify: a brainstorm

Notes only, 2026-11-10. Nothing here is built and nothing here is decided. Written
on Edgar's word of the same day: revamp the onboarding, and what the app changes
after it, so each reader gets a Purify tailored to where they come from and what
they need, to keep them and help them learn. Every claim about the app as it is
was read from the code on `ccr-07896cf2-bo0afd` on this date and carries its file.

The one sentence the whole file serves, in his words: "we explain the faith as it
is, the history as it is, and we invite everyone from all faiths and all beliefs
to learn this Eastern Orthodox faith." The road in differs. The destination does
not.

Contents:

1. The web as it is
2. What is weak
3. A revamped web
4. An A/B testing system
5. Retention per path
6. Risks
7. A phased plan
8. What waits on Edgar

---

## 1. The web as it is

### 1.1 Who is asked, and when

`components/onboarding/FirstRunGate.tsx` decides on the client, after the page
wakes. The overlay shows only on the home route (`/`, or the Windows app's home),
so a reader who lands on a deep link reads that page first.

| Way in | Who | Screens |
|---|---|---|
| `welcome` (counted as `new`) | Signed out, on the apps or the desktop website | welcome, account, then the questions |
| `account` (`signup`) | The mobile website only, and only on `/signup` (line 88 to 91). The mobile front page sends people to the store and never asks | account, then the questions |
| `level` (`signed-in`) | A signed-in account under 30 minutes old (`NEW_ACCOUNT_WINDOW_MS`, line 24), or back from a Google or Apple sign-in | the questions only |
| `returning` | A signed-in account from before this version of the questions | "We updated our onboarding", then the questions with old answers marked |
| `reminders` | Back from the sign-in that the reminders step asked for | reminders, handoff |
| none | An account that already answered this version on another device | nothing is asked; the answers are copied down (`fillSpaceFromAccount`) |

The order of screens is `lib/onboarding/flowSteps.ts:51` (`flowSteps`), tested in
`lib/onboarding/__tests__/flowSteps.test.ts`.

### 1.2 Every question, every branch, what each answer changes today

| # | Screen | Asked of | Answers | What it changes today |
|---|---|---|---|---|
| 1 | Welcome | new, signed out | Begin | Nothing. One line: "A quiet place to pray, read, and keep the Church's year." |
| 2 | Account | new, signed out | Google, Apple, email, or "Continue without an account" | An account (sync, and the only way to have reminders). Counted `signed-in` or `without` |
| 3 | "Where are you coming from?" (`WhereFrom.tsx`) | everyone | Orthodox, Catholic, Protestant, Another faith, Just curious, Prefer not to say | **Almost nothing.** The pill shows one line of promise ("We'll start you with the Church Fathers and the early councils", `lib/i18n/messages/en.json:1174` to 1179). The answer is saved and counted. No screen reads it except as a fallback (see 1.3) |
| 4 | "How familiar are you with Orthodox Christianity?" | everyone | Completely new, Learning, Practicing | The most. Sets calendar and fasting defaults for a new reader (`space.ts:101`, `defaultsFor`: new hides fasting, learning shows it plainly, practicing shows the full rule); decides the reader type (1.3); picks the head of Theology (`lib/theology/path.ts:29`, `headFor`); puts "New to Orthodoxy" first in the reading room (`components/reading/ReadingRoom.tsx:142`); shapes the Day 1 step; writes "depth" |
| 5 | "Are you a priest, a deacon, or a layman?" | Practicing only | priest, deacon, layman | A priest or deacon goes on to where they serve, jurisdiction, and in the United States a parish (`ClergySteps.tsx`), which files a request for the clergy seal. Never counted by its answer |
| 6 | "Your calendar and your fast" | Practicing only | New or Old calendar; Strict, Modified, Hidden | The calendar every date is read by, and how the fast shows on Today (`space.ts:263`, `fastView`) |
| 7 | "What are you looking for?" (`LookingFor.tsx`) | everyone | Eleven picture cards, as many as the reader likes, in tap order: saints' lives, the Fathers' writings, the Gospels, the councils, Church history, what the Orthodox believe, the Liturgy, fasts and feasts, a rule of prayer, daily quiet, study | **Only the first pick does anything**: it chooses the Day 1 step (`space.ts:182`, `dayOneFor`). Picks two to eleven are saved, synced and counted with their place, and read by nothing |
| 8 | Reminders | everyone, unless a returning reader has them on | Turn on, Not now | Morning and evening push at the default times. **Needs an account**: a signed-out reader who taps "Turn on" is told to sign in and is sent out of the flow to `/signin` (`OnboardingFlow.tsx:537`, `signInForReminders`) |
| 9 | Handoff (`HandoffSlate.tsx`) | everyone who did not skip | none | A three second slate listing calendar, fasting, focus and Day 1. Then the apps land on Today with the Day 1 card (`FirstStepsNudge.tsx`); the website goes straight to the Day 1 page (`FirstRunGate.tsx:163`) |

Skip is on every screen but the handoff (`OnboardingFlow.tsx:626`). A skip marks
the reader onboarded for good: they are not asked again until the version rises.

### 1.3 What reads the answers afterwards

The whole "transitionary" layer (his word of 2026-10-28) is one function,
`lib/onboarding/readerType.ts:19`:

- level Practicing gives `orthodox`
- level Learning gives `learning`
- level Completely new gives `new`
- no level (a skip): any background but Orthodox or Prefer not to say gives `new`
- otherwise `orthodox`

Because the level is asked of everyone straight after the background, **the
background decides the reader type only for a reader who answered it and then
skipped.** For everyone else it is read by nothing.

Everything that reads the reader type, found by search:

| Surface | File | orthodox | learning | new |
|---|---|---|---|---|
| The greeting on Today | `lib/today/greeting.ts:147`, `components/today/GreetingHeader.tsx` | the feast or saint of the day as the headline, hymns, the hour's prayer | one line naming the day, "See the day" | a psalm verse for the hour (Brenton) |
| Your first Liturgy reminder | `components/today/FirstLiturgyReminder.tsx`, `lib/today/smallLook.ts` | one quiet line | a card | a card |
| Today's Catechism | `components/catechism/CatechismToday.tsx` | one quiet line | a card with Begin | a card with Begin |

The third row is dark at present: `data/catechism/questions.json` is an empty
list, and the card draws nothing while the bank is empty. The second shows only
in the week of a Liturgy the reader has planned. So on an ordinary day the
reader type changes one thing a reader can see: the greeting.

Everything that reads the level directly: Theology's head, the reading room's
first row, Settings ("Your space"), and Day 1. Fasting is read by Today's church
rail and the greeting.

"Depth" and "focus", the older answers still written on every run
(`OnboardingFlow.tsx`, `writeDepth`, `writeFocus`), are synced to `profiles`
(`lib/profile/preferences.ts`) and read by nothing on any screen.

So a Catholic and a Protestant who both tap "Completely new" and "The Gospels"
get the same Purify to the pixel. So do a Muslim and an atheist.

### 1.4 Day 1, the only tailored destination

`dayOneFor(level, firstPick)`, eighteen keys. It does not read the background.

| First pick | Completely new | Learning | Practicing |
|---|---|---|---|
| The saints' lives | `/saints` | same | same |
| The Fathers' writings | `/reading/paths` | same | same |
| The Gospels | `/plans/gospels` | same | same |
| The councils | `/councils` | same | same |
| Church history | `/history` | same | same |
| What the Orthodox believe | `/start` | `/theology` | `/theology` |
| The Liturgy | `/start/first-liturgy` | the Trisagion prayers | `/calendar` |
| Fasts and feasts | `/calendar` | same | same |
| A rule of prayer | a simple morning rule | same | the morning prayers in full |
| Daily quiet | the Jesus Prayer lesson | same | same |
| Study | John 1 | John 1 | Job (the walk when its flag is on) |
| nothing picked | What is prayer? | John 1 | John 1 |

Seven of the eleven first picks open a section's front door, not a first thing
to do there.

### 1.5 Where a reader came in from

- **The website.** `lib/analytics/tag.ts`: a link of ours may end in
  `?via=tiktok-bio`. `components/analytics/AnalyticsTracker.tsx` reads it once,
  keeps it in `sessionStorage` (`purify:via`) for the tab, and takes it off the
  address. The onboarding counts carry it as `door` (`lib/onboarding/count.ts`),
  and the finished record keeps it for the return counts. `lib/analytics/source.ts`
  names a session's referrer for the admin (search, social, email, assistant).
- **Nothing in the flow reads the door.** It is counted, never used to choose a
  question or a start.
- **The apps do not know it at all.** Searched for an install referrer, a
  campaign parameter or any attribution library: there is none. A reader who
  taps an ad, lands on the mobile website, is sent to the store and installs
  arrives in the app with no door. The mobile front page asks nothing, so the tag
  dies at the store.

### 1.6 Where answers live

| Answer | On the device (`localStorage`, `lib/onboarding/state.ts`) | In the account | Counted |
|---|---|---|---|
| Background | `purify:background` | yes, `user_metadata.purify_space.background` (`lib/onboarding/accountSync.ts`) | as a total, to the day |
| Level | `purify:level` | yes, `purify_space.level`; also `profiles.depth` | total |
| Picks | `purify:intent`, `purify:intents` | yes, `purify_space.intent`, `.intents`; also `profiles.focus` | each pick with its place |
| Calendar, fasting | their own keys | fasting in `purify_space` | totals |
| Priest, deacon or layman, and a cleric's answers | `purify:role`, `purify:clergy` | no. Sent only inside a request for the seal | the screen as reached, never the answer |
| The finished record (day, door, background, level, first pick, return days sent) | `purify:onboarding.counted` | no | drives the day 2, 7 and 30 notes |

The counts (`lib/onboarding/counting.ts`, `lib/security/schemas.ts:634`,
`app/api/track/event/route.ts`) are rows in `analytics_events`: a name, a closed
list of words, the day and not the time. No session, no account, no device id.
Returning is said by the device itself on its day 2, 7 and 30, with the answers
it gave; the server never joins two visits. A second pair of counts
(`lib/analytics/screenCounting.ts`) says `first_open` and `came_back` on day 1,
7 and 30 for every device, onboarded or not, with the platform only.

The privacy page says exactly this (`app/(app)/privacy/page.tsx`, the paragraph
beginning "The welcome questions are counted"): the answer, the kind of device,
the link if it was one of ours, the day; "Your answers themselves stay on your
device and in your own account, for making Purify yours."

The admin reads the totals in `lib/admin/onboardingSummary.ts`: the funnel by way
in, answers, picks by place, finishes by background and door, Day 1 opens, and
returns by background and by door.

---

## 2. What is weak

Ranked by how much each costs.

**1. The first question makes a promise the app does not keep.** "We'll start you
with the Church Fathers and the early councils" (Catholic), "the Scriptures and
the early Church" (Protestant), "an introduction to Orthodox Christianity"
(another faith), "a short tour first" (just curious). Nothing after that screen
reads the answer. A Catholic who then picks "A rule of prayer" is started on a
morning rule. There is no short tour. This is the centre of the revamp: the
question is right, the web behind it is missing.

**2. "The order you tap is the order Purify puts them in" is also not kept.**
Only the first pick is read. A reader who taps five cards has told Purify five
things and gets one card on Today.

**3. One Day 1 step is a paywall.** A reader whose first pick is "The Gospels" is
sent to `/plans/gospels`, and on Android and the website every plan's Begin
opens the upgrade sheet for a reader without Plus
(`components/plans/PlanClient.tsx:48`, `:69`). Start here's fourth step, "Read a
Gospel", links to the same plan. The first thing Purify asks a brand-new reader
who wanted the Gospels to do is subscribe. The whole Bible is free one tap
away, so this is a routing fault, not a pricing one, and it is the cheapest
fix in this file.

**4. Two of the three reader types are nearly the same screen.** `learning` and
`new` differ by one line of greeting. The transitionary idea has three surfaces
on Today and stops there: the Bible, the saints, Discover, the reading room's
order, the prompts and Plus are one design for everyone.

**5. The door is thrown away.** The one honest signal of what a reader wanted
before they met a question is counted and never used, and on the apps it is not
known at all. The tarot company he named begins at the ad. Purify begins at
"Welcome".

**6. The flow can end in six taps with nothing learned.** Skip on the welcome
marks the reader done until the next version. They get the Orthodox view (the
right fallback), no Day 1 card, and no second, gentler chance to answer one
question later.

**7. The account wall comes before any value.** New readers meet "Carry your
prayers on every device" as screen two, before Purify has shown them anything
to carry. "Continue without an account" is the quietest thing on the screen. The
counts already say how many leave here (`onboarding_step` against `account`);
read them before deciding, but the shape is the classic one that loses people.

**8. Reminders send signed-out readers out of the flow.** A reader who says yes
to reminders, the single strongest retention lever the app has, is told to sign
in and routed to `/signin`. Some will not come back to the questions. On the
phones a local notification needs no account and no server.

**9. Seven of eleven Day 1 steps are a front door.** "The lives of the saints"
opens `/saints`. A new reader standing in front of every saint the Church
honours has not been given a first step. Compare "Your first Liturgy", which is
a guided thing with an end.

**10. Day 1 is one card, shown once.** Taken or dismissed, it is gone, and there
is no day 2. The week after the questions is where a reader is kept or lost, and
Purify has nothing planned for it by path.

**11. "Completely new" hides fasting and stops there.** Nothing explains words.
A Protestant reading the day's saint meets "Theotokos", "troparion", "kathisma"
with no one beside them. (Section 3.5: what exists to point at.)

**12. Nobody is asked what they need.** "Daily quiet" has the sub-line
"Stillness, and some peace from anxiety", read only by a screen reader
(`LookingFor.tsx` hides it). A reader who came because someone died, or because
they cannot sleep, has no way to say so, though the reading room already holds
collections by feeling.

**13. Two kinds of reader have no honest answer to the first question.** An
Oriental Orthodox reader (Coptic, Armenian, Ethiopian, Syriac) must tap
"Orthodox", and is then treated as Eastern Orthodox, or "Another faith", which
is wrong and a little insulting. So must a Latter-day Saint, a Jehovah's Witness
or anyone whose church is neither Catholic nor Protestant. There is no "another
Christian tradition" pill.

**14. The returning Orthodox reader has no path.** "Practicing" means "Baptized
Orthodox". Someone baptized as a child who has not been to church in ten years
has to choose between a level that assumes a rule of prayer and one that says
catechumen.

**15. Places a reader of a given background is lost today.**

- A Protestant opens the Bible to an Old Testament numbered and ordered by the
  Septuagint, with books they have never seen, and no line saying why.
- A Catholic meets 1054, the filioque and Florence in History with no bridge
  from what they were taught, and may read plain history as an attack.
- A reader of another faith or none who picks "What the Orthodox believe" is
  sent to Start here, which is good, but Today above it still speaks in feasts
  and tones.
- A reader in grief who picks "Daily quiet" gets a lesson on the Jesus Prayer.

**16. Plus is never introduced.** (Section 3.7.) A reader meets it only as a
lock. Nothing ties what they said they wanted to what Plus is.

**17. There is no way to learn which of these matter.** The counts say who came
and who came back. They cannot say whether a different question, order or first
step would have kept more of them. (Section 4.)

---

## 3. A revamped web

### 3.0 The rules it is built on

1. **One library, many roads.** No page of content knows who is reading it. A
   council, a saint, a prayer, a chapter are the same for every reader. What a
   reader's answers change is the order things are met in, the first step, a
   bridge line that points at something, whether words are explained, and the
   tone of an invitation. This is the rule that keeps tailoring from becoming
   ecumenism, and it can be held by a test.
2. **Two axes, not one.** How far along a reader is, and where they come from,
   are different facts. The app has the first (`readerTypeOf`: orthodox,
   learning, new) and it decides how Today looks. The revamp adds the second, a
   **road**, which decides what is met first. A Catholic catechumen is
   `learning` on the Catholic road. A cradle Orthodox who stopped going is
   `orthodox` on the returning road.
3. **Every question changes something the reader can see on the next screen.**
   A question that feeds only the admin is cut.
4. **Selection before prose.** Wherever a choice of what to show can do the
   work, no new sentence is written. New sentences are doctrine, are
   twenty-one translations, and wait in the queue.
5. **Everything already answered still counts.** Background, level and picks
   are on readers' devices now. The road can be worked out from them without
   asking anyone anything again.
6. **Skipped is respected, once.** A reader who skips sees the Orthodox view, as
   today, and is offered one question on Today a few days later, dismissible
   for good.

### 3.1 The door: what the app can honestly know

| Where the reader arrives | What can be known | How |
|---|---|---|
| The website, from a link of ours | The link's theme | The tag already exists (`?via=`, `lib/analytics/tag.ts`). Give tags a second word from a closed list of themes: `tiktok-fathers`, `ig-peace`, `email-councils`. A pure function reads the theme off the tag |
| The website, from anywhere else | The kind of place (search, social, an assistant) | `lib/analytics/source.ts` already names it. Too weak to tailor on. Count it, do not act on it |
| The Android app, new install | The link the install began from, if it was ours | Google Play hands a new install its referrer string (the Play Install Referrer library). A store link of ours carries the same tag. Read once on first open. A native dependency, so the R8 walk of AGENTS.md step 2a applies, and it needs a privacy line |
| The iPhone app, new install | **Nothing** | Apple gives an app no word about which page or post led to an install. Custom product pages are reported to the developer as totals in App Store Connect and never reach the app. (The one exception is Apple's own search ads, which have their own attribution; not worth building for until such ads run.) So on iOS the first screen asks |
| Any app, already installed, opening a link of ours | The tag, if the apps open our links | Not checked in this pass. Worth checking: an email link opening the app with its tag intact is the cheapest door there is |

What Purify will not do to learn the door: read the clipboard, fingerprint the
device, or add an attribution SDK. Each would make the privacy page's plainest
sentences false.

**The themes** (a closed list, the same words as the counts): `prayer`,
`scripture`, `fathers`, `councils`, `history`, `saints`, `liturgy`, `beliefs`,
`year`, `peace`, `loss`. They are the eleven answers of "What are you looking
for?" under shorter names, plus the two needs. So a door is simply a first pick
made before the reader arrived.

**The door is a hint, never a verdict.** A reader who tapped a video about the
Fathers has not said they are Catholic, and is never treated as if they had. The
door chooses the opening and pre-selects one card. It says so openly ("You came
for the Church Fathers. Begin there?"), and the reader can change it.

**Before the app: the store page and the landing.** One custom store page per
theme (both stores offer them) and, on the mobile website, one landing per theme
that shows the thing itself before the store button: the first paragraph of a
Father, the day's prayer. Today the mobile front page only sends people to the
store. A reader who has already read something is a different install.

### 3.2 The questions

Three for most readers, four for the practicing Orthodox. In order:

**Opening (no question).** With a door: the theme's own first thing, shown, with
"Begin" and under it "Two quick questions first, so Purify fits you". Without a
door: today's welcome line, then straight to the first question. No account
step here (test 1).

**Question 1: "What are you looking for?"** His pick B of round 14 stands: the
eleven picture cards, as many as the reader likes, numbered in tap order. Two
changes:

- **The order is finally used.** The first pick leads the first week, the second
  and third fill its later days, and the order sets which rows lead Discover and
  the reading room. The screen's own line ("The order you tap is the order
  Purify puts them in") becomes true.
- **A quiet row beneath the cards, the need** (3.3), drawn the way "Prefer not
  to say" is drawn on the next screen: there for the reader who wants it,
  invisible to the one who does not.

A door pre-lights its card as pick 1.

**Question 2: "Where are you coming from?"** His pick E + I stands: the pills,
the one line under them, "Prefer not to say". Three changes:

- **The line under the pill becomes a promise the app keeps**, because the road
  now exists (3.4).
- **One more pill: "Another Christian tradition".** For the Oriental Orthodox,
  and for anyone whose church is neither Catholic nor Protestant. Its line:
  "We'll start you with the Creed and the first councils."
- **Protestant sub-traditions: one split, and try not to ask it.** The road in
  truly differs between a reader from a liturgical church (Anglican, Lutheran,
  Methodist), who knows a creed, a calendar and a sacrament and for whom the
  Fathers are half familiar, and a reader from a Bible church (Baptist,
  evangelical, Pentecostal, non-denominational), for whom Scripture is the only
  door and saints, icons and the Mother of God are the hard ground. Nothing
  finer than that changes the first week. And the picks usually say it already:
  a Protestant whose first pick is the Liturgy or the Fathers is on the first
  lean, one whose first pick is the Gospels or study is on the second. So derive
  the lean from the picks, and only test asking it ("A liturgical church" or
  "A Bible church", two pills under the Protestant line) if the derived lean
  proves wrong. Catholic gets no split: an Eastern Catholic reader exists and
  would be better served by one, but is too rare to spend a screen on.

**Question 3: how far along, asked in the reader's own terms.** Today everyone
is asked "How familiar are you with Orthodox Christianity?" with the same three
answers. Ask it by road instead:

| Came from | Asked | Answers |
|---|---|---|
| Orthodox | "Where are you now?" | Practicing. Coming back after time away. Preparing to be received |
| Anyone else | "Have you been to an Orthodox church?" | Not yet. I have started going, or I am a catechumen |
| Prefer not to say | today's question, as it is | today's three |

Underneath, the level stays the three values the app already reads. "Coming
back" is `practicing` with one new mark, `returning`, which softens the
defaults (3.6). No stored answer changes shape, so nothing breaks for readers
who answered before.

**Question 4, the practicing only: calendar and fast.** As today.

**The clergy question** is asked today of every practicing reader, to find the
few who are priests or deacons. Suggest it becomes one quiet line on the rule
screen ("I am a priest or deacon") that opens the same screens. His note 54 put
it where it is, so this is his call.

**Reminders** move out of the questions to the moment after a first prayer or
reading (test 4). **The handoff** stays, and its lines become the road: "Your
first week", "Words explained: on", "Begins with: The Fathers".

**The second chance.** A reader who skipped sees, on their second or third day,
one small card on Today: "One question, so Purify can fit you." It asks
question 2 only. Dismissed once, it never returns.

### 3.3 The need

Some readers do not come to learn. They come because something hurts. Purify
has more for them than most apps, and all of it is the Church's own: the
Psalms, the Jesus Prayer, and for the bereaved the memorial days on the third,
ninth and fortieth day, which Today already keeps (`TodayDiptychs`).

The quiet row under question 1, worded as what is sought, never as a condition:

| Shown as | Counted as | Never worded as |
|---|---|---|
| Peace | `peace` | anxiety, stress, a remedy |
| Comfort in loss | `loss` | grief as a condition to be treated |
| Someone I love is ill | `illness` | healing promised |
| I want to pray and do not know how | `begin` | |

It is an overlay on whatever road the reader is on: it replaces the first three
days of the first week, and then the road carries on. It lives on the device
only, never in the account (6.3). It teaches the faith as it is: what the
Church gives a mourner is not a calming exercise, it is the prayer for the
departed. That is the difference between tailoring to a need and playing on
one.

What exists to point at, with no new words: the Jesus Prayer lesson; the
protection rule (Psalms 90 and 26) and the repentance rule (Psalm 50) in
`data/prayers/rules`; the prayers before sleep; the reading path "In sorrow and
sickness" (three days, `lib/reading/paths.ts`); the reading room's collections
by feeling, fear and grief among them (`lib/reading/feelings.ts`, marked under
the standing note, queue item 14); the Fathers on eight struggles
(`lib/fathers/struggles.ts`); those I pray for and the diptychs
(`/prayers/personal`).

What does not exist and is the one piece worth building for this road: the
rule `psalms-needs`, "in sickness, in fear, and in sorrow", is in the list as
planned and unbuilt (`lib/prayers/rules.ts:339`). It is a selection of Psalms
from Brenton, word for word. Low risk, and the selection wants a priest's
glance.

### 3.4 Roads, and the first week in place of Day 1

**The road** is one pure function beside `readerTypeOf`, from answers the
device already holds:

| Road | Who |
|---|---|
| `practicing` | Orthodox, practicing |
| `returning` | Orthodox, coming back |
| `catechumen` | Anyone who has started going or is preparing to be received. They keep the bridges of where they came from |
| `catholic` | Catholic, not yet going |
| `protestant` | Protestant, not yet going, with a lean: `liturgical` or `bible` |
| `christian` | Another Christian tradition |
| `seeker` | Just curious or Prefer not to say, whose first pick or door is the Fathers, the councils or history: the early-church seeker |
| `newcomer` | Another faith, or Just curious with any other first pick |
| the default | No answers at all: Purify as it always was |

**The first week** replaces the single Day 1 card. Seven steps for each road,
every one a page Purify already has, shown one at a time in the same card on
Today (`FirstStepsNudge`). The next step appears the next day the reader opens
the app. It is not tied to the calendar, a missed day costs nothing, nothing
counts up and nothing is lost. A reader may dismiss the week whole. The steps
are data (`road`, `key`, `href`), and a test holds every `href` to a real page,
as the Day 1 keys are held today.

The order within a week follows one shape for everyone, which is the
destination in small: **something to read, something to understand, something
to pray, somewhere to go.** Day seven of every road outside `practicing` is the
same: find a parish, and what a first Liturgy is like (`/start` step seven,
`/start/first-liturgy`). The roads differ. They all arrive at the same door.

The weeks, drawn from the inventory (each name is an existing page or path):

| Day | `catholic` | `protestant`, Bible lean | `seeker` | `newcomer` |
|---|---|---|---|---|
| 1 | Start with the Fathers, day one (the seven-day path) | John 1, with the Fathers' commentary opened once | The Apostolic Fathers (the saints' group) | Start here, step one: one short prayer |
| 2 | Nicaea, and the Creed as the council wrote it | The Apostolic Fathers: the generation after the apostles | The timeline, from Pentecost | A saint's Life, as a story |
| 3 | St Leo the Great and Chalcedon | Nicaea and the Creed | Nicaea | John 1 |
| 4 | The Jesus Prayer | What is prayer, then a simple morning rule | The Seven Councils, by their own words | What the Orthodox believe: Start here |
| 5 | The timeline to 1054, the event page as written | The Council of Carthage of 419 and the canon of Scripture (`carthage-419`) | Start with the Fathers | The Sign of the Cross, and what it means |
| 6 | Your first Liturgy | Ephesus and the Theotokos | The Trisagion prayers: the early Church's prayer, still said | The Church's year, where it stands today |
| 7 | Find a parish | Your first Liturgy, then find a parish | Your first Liturgy: the same worship, now | Your first Liturgy, as a visitor |

| Day | `practicing` | `returning` | `catechumen` | `christian` |
|---|---|---|---|---|
| 1 | Set your rule (Your rule) | A simple morning rule, short enough to keep | The Trisagion prayers | The Creed |
| 2 | Your name day and patron | Today's Gospel | The Sign of the Cross | Nicaea |
| 3 | Those you pray for (the diptychs) | The Jesus Prayer | Your first Liturgy, with its reminder | John 1, with the Fathers' commentary |
| 4 | Today's readings, with the Fathers | The Church's year, where it stands today | The Creed | Chalcedon, and who Christ is |
| 5 | The widget | Your name day and patron | The day's saint | The parting after Chalcedon, the event page as written |
| 6 | The Psalter by kathisma | Prayers before sleep | Fast days, plainly | The Trisagion prayers |
| 7 | The season's reading (the Nativity Fast plan from 1 November) | Find a parish | A simple morning rule | Your first Liturgy, then find a parish |

A Protestant on the liturgical lean walks the Catholic week with day one and
day five exchanged for John 1 with its commentary and Carthage. The reader's own
second and third picks replace days four and five where they differ from the
road's.

Notes that bind the table:

- **The theology studies on the filioque, the papacy, original sin, theosis and
  the Theotokos are not in any week.** They are five of the seven originals that
  fail the provenance audit (queue item 5). The Catholic and Protestant roads
  would naturally lead to them, and must not until they are repaired. The
  councils' pages and the history rewritten in 1.7 carry those days instead.
- **The apologetics page on sola scriptura** (`lib/apologetics/topics.ts`) is
  the obvious second step for a Protestant. Its review status was not checked
  in this pass. Check it before any road points at it.
- **Each day's card needs a title and one line**, in twenty-one languages. Most
  can reuse the page's own title key. Lines that frame ("the generation after
  the apostles") are new framing and go to the queue.
- **After the week: the month.** One thing to continue. For the Fathers' roads,
  the reading paths, which are free. For the Scripture roads, a reading plan,
  and every plan is Plus (3.7). For `practicing`, their rule and the season.

### 3.5 Words explained, and the Bible

**The glossary exists and nobody is led to it.** `/dictionary` holds 100 terms
(`data/dictionary/terms.json`), with theosis linked to its topic page and
Theotokos to her page and to Ephesus. It is English only, and no page links a
word to it. The only inline gloss in the app is `GlossedText`
(`lib/bible/glossary.ts`), which explains 61 archaic English words inside the
commentary.

- **"Words explained"**: a setting in Your space, on for `new` and `learning`,
  off for `orthodox`, changed by the reader at will. When on, the first time a
  dictionary term appears on Today, a saint's page or a prayer's introduction,
  it carries a quiet dotted underline. A tap opens the app's own sheet with the
  dictionary's entry and its links. Built by widening `GlossedText`, not by a
  new component.
- **English only at first**, because the dictionary is. Say so in the plan and
  do not draw underlines in a language that has no entry to show.
- **The 100 entries become doctrine in a more visible place.** Their review
  status was not checked in this pass. They go to the queue as one item before
  they are surfaced on Today.
- **Words that look shared and are not** (original and ancestral sin, the
  Dormition and the Assumption, "saint" itself for a Protestant) are the most
  useful entries for a Catholic or Protestant reader and the most delicate. Not
  in the first build. With a priest.

**The Bible.** The default text is the same for everyone and should stay so:
Brenton's Septuagint and the King James New Testament, the public-domain pair
(`lib/bible/translations.ts:108`). Licensed New Testaments are listed only
where the licence is configured. The road changes three things around the text:

| | What changes | By road |
|---|---|---|
| Where the Bible first opens | Today it opens where the reader last was, or at the shelf | `protestant`, `christian`, `newcomer`: John 1. `catholic`, `returning`, `practicing`: today's Gospel. `seeker`: today's Gospel, with one line that the Greek can be shown beside it |
| The Fathers' notes | The commentary loads when a verse's notes are opened; there is no switch | On non-Orthodox roads, the first chapter opened shows once, in the app's own tip style, that the Fathers' commentary is one tap under a verse. For the Protestant reader this is the bridge itself: Scripture first, then how the Church that received it read it |
| Why this Old Testament | Nothing is said. The Septuagint's order, numbering and extra books are met cold | On non-Orthodox roads, the first Old Testament book opened shows once a card that leads to the answer the FAQ already gives (`lib/i18n/messages/en.json:1456` to 1460). Existing words first; a fuller page is new text for the queue |

### 3.6 The map: what the app does differently on each road

| | `practicing` | `returning` | `catechumen` | `catholic` | `protestant` | `christian` | `seeker` | `newcomer` |
|---|---|---|---|---|---|---|---|---|
| **Today's greeting** | The feast or saint as the headline, hymns, the hour's prayer (as now) | The same, with the learning line beneath | The day named in one line (as now) | A verse for the hour (as now), and under it the day's saint with their century | A verse for the hour | A verse for the hour | The day's saint with their century, leading | A verse for the hour |
| **Fasting on Today** | The reader's own choice | Shown plainly | Shown plainly (as now) | Hidden (as now), offered after the week | Hidden | Hidden | Hidden | Hidden |
| **First week** | Setting up | Coming home | Learning the services | The Fathers and the councils | The Scriptures and the early Church | The Creed and the first councils | The early Church in order | An introduction |
| **The month's thing** | Their rule; the season's plan | John in 21 days | The Gospels | The reading paths through the Fathers | John in 21 days | The Gospels | The reading paths; the councils shelf | Start here, all seven steps |
| **The Bible opens at** | Today's readings | Today's Gospel | Today's Gospel | Today's Gospel | John 1 | John 1 | Today's Gospel, the Greek offered | John 1 |
| **Words explained** | Off | Off | On | On | On | On | On | On |
| **Saints shown first** | The saint of the day, their patron | Their patron, the saint of the day | The saint of the day | The saints of the West before the schism (Leo, Gregory the Dialogist, Ambrose, Hilary, Cassian, Irenaeus, Cyprian: all in the app; the group is a new filter in `lib/saints/groups.ts`) | The Apostles and the Apostolic Fathers (both groups exist) | Athanasius, Cyril, the Cappadocians (the group exists) | The Apostolic Fathers, then by century (the filter exists) | The Theotokos pinned as now, then Lives that read as stories |
| **Tone of first prompts** | Brief, the Church's own terms, nothing explained | A welcome with no reproach. Never "it has been a while" | Plain, a term explained once | A historian's: what happened, in order, with its source. Never "you were taught" | Chapter and verse first, then the Father who read it | Plain and exact about the councils | Dates, places, sources. And one step a week that turns from the past to the Church that is | "Read" and "see" before "pray". Nothing assumes a prayer life |
| **Reminders offered** | Morning and evening; the eve of a feast and the start of a fast (the copy exists in `lib/push/copy.ts`, no sender uses it) | One a day, evening, by default | Morning and evening | The next step of the week | The day's reading | The next step of the week | The next step of the week | None by default; offered after the week |
| **Plus is first shown** | Day 8 | Week 3 | Week 3 | Day 8 | Day 8 | Week 3 | Day 8 | Locks only, the first month |

"Saints shown first" needs one honest caution. Blessed Augustine is venerated in
the Orthodox Church and his theology is received with reservations the West
does not share. A "saints of the West" row that leads with him says something.
Which names lead that row is a priest's call.

### 3.7 Plus: when, and how

Today Plus is met only as a lock, never inside the questions and never on a
timer, and the rule is written down (`components/billing/UpgradeModal.tsx:53`).
Keep all of that. Four additions:

1. **Never in the questions, never in the first week, never at a point of
   need.** The first week of every road is free end to end. That is not true
   today: the Gospels pick leads to a locked plan (section 2, item 3).
2. **One calm introduction after the first week**, a card on Today that shows
   the one Plus feature that fits what this reader said they wanted, opening its
   Try it screen (`components/billing/PlusTry.tsx`, which "shows and never
   grants"). Shown once. Dismissed, it is gone. Never where Plus is not sold
   (`lib/entitlements/entitlements.ts`: iOS has all of Plus free today, so an
   iPhone sees no card).
3. **The feature that fits the road:**

| Road | Shown | Why |
|---|---|---|
| `practicing` | The Psalter by kathisma; Remember the verse; sync | The reader who already prays daily, and the one most likely to subscribe |
| `protestant`, `christian` | Cross-references and word study | Bible study tools, in terms this reader already values |
| `catholic`, `seeker` | History in full dress; the Florilegium | The reader who came for the Fathers and the councils |
| `returning`, `catechumen` | Reading plans | A habit to keep |
| `newcomer`, and anyone who named a need | Nothing | They meet the locks where the locks are, and nothing more |

4. **The first plan.** Every reading plan is Plus, and a plan is the natural
   month for four of the eight roads. Three choices, all his: one plan free for
   everyone (John in 21 days is the obvious one); the first seven days of any
   plan free; or leave the lock and never lead a new reader to a plan before
   their second week. This is a question about what Plus is, so it is not a
   test to start without his word.

Price, trial and which plan leads are 4.4 and his decision.

### 3.8 What this does not do

- It does not make a Catholic Purify, a Protestant Purify, or an anxious
  person's Purify. There is one Purify, entered by eight doors.
- It does not hide anything from anyone. Every page stays one tap from every
  reader, and Discover stays one design for all, as he set on 2026-10-28.
- It does not guess. A road comes from what the reader said. No answer, no
  road.
- It does not write a word of comparative theology. Those bridges are the last
  phase and wait for a priest.

---

## 4. An A/B testing system

Purify has none today. Searched: no variant, bucket or experiment code, no flag
library; the flags that exist are on or off for everyone (`lib/walkthroughs/flags.ts`,
`lib/community/flags.ts` and their kin). RevenueCat's offerings are read as
`current` and nothing else (`lib/billing/revenuecat.ts`, `revenuecatWeb.ts`); no
placement, targeting, experiment or subscriber attribute is used.

His point about the tarot company is right in kind and wrong in scale for now.
They spent a million dollars because they had the traffic to spend it on. Purify's
1.5 letter went to 2,186 accounts. The system below is built for small numbers:
few tests, one at a time, big differences only.

### 4.1 Assignment: stable per device, naming nobody

- **A seed that never leaves the device.** On first open the device draws a
  random number and keeps it (`purify:ab.seed`, `localStorage`). It is never
  sent, never copied to the account, and is not a device id for anyone but the
  device.
- **An arm per test, worked out from the seed.** `arm = hash(seed + test id) mod
  arms`. The same device always gets the same arm of a test, and its arm in one
  test says nothing about its arm in another.
- **A registry in the repo, not a dashboard.** One file, `lib/ab/tests.ts`: each
  test's id, its arms, the share of readers in it, the date it began, the one
  outcome it is judged by, and the date it ends. A test is added, changed and
  ended by a commit, so every test is reviewed like code and there is a record
  of what ran when. A unit test refuses a registry entry with no end date and no
  named outcome.
- **Worked out on the device, after the page wakes.** The apps are a static
  export with no server, so there is nowhere else to decide. This limits where a
  test can live: only on surfaces already drawn after hydration (the welcome
  overlay, the Day 1 card, a sheet, the paywall). A test on server-drawn content
  would flash one arm and then the other. That limit is acceptable: every test
  in 4.5 sits on such a surface.
- **Who is never in a test.** The same exclusions the counts already keep
  (`lib/onboarding/count.ts`, `countingAllowed`): automation, a device that has
  opened the admin, a device in Testers mode. Testers mode gains an arm picker,
  so Edgar can see each arm on his own phone.
- **Two devices, two arms.** A reader with a phone and a laptop may see both
  arms. Carrying the arm in the account would fix it and would also tie a test
  arm to a person. Not worth it: accept the noise.

### 4.2 Exposure and outcome counts that fit the privacy page

The counts already work the way a test needs: totals, closed lists, the day and
not the time, the device reporting its own return. A test adds one word to rows
the device already sends.

- **Exposure.** `ab_exposed {test, arm, platform}`, sent once per device, and
  only when the screen that differs is actually shown. Assigned but never
  reached is not exposed. This is the denominator.
- **Outcome.** The existing events gain one optional prop, `ab`, a word from a
  closed list built from the registry (`"day1-guided:b"`). `onboarding_finished`,
  `onboarding_dayone`, `onboarding_returned`, `lock_tapped` and `plus_bought`
  carry it. The finished record on the device (`FinishedRecord`,
  `lib/onboarding/counting.ts:125`) keeps the arm, as it already keeps the door,
  so the day 2, 7 and 30 notes say it without the server joining anything.
- **One test per row, ever.** A row that carried a background, a door, a
  platform, a day and three test arms would start to describe one person on a
  quiet day. So a device is in at most one onboarding test and one Plus test at
  a time, and a row carries at most one `ab` word. The schema enforces it by
  shape: `ab` is a single enum, not a list.
- **Small cells are not shown.** The admin's test panel does not print a cell
  under 20. "Three Catholics on Android in arm B came back" is close to a
  description of three people.
- **The seed is never an event prop.** The schema has no field that could take
  it (`lib/security/schemas.ts`, `.strict()` on every shape), and a test holds
  that line.

**This needs a new privacy line before any test runs.** The page describes each
count it keeps, and its own rule is "Add an event by adding a member here and a
line to /privacy" (`schemas.ts:629`). A draft, for his word: "Sometimes two
readers are shown a different version of the same screen, so we can learn which
one helps. Which version a device shows is decided on the device by a random
number that never leaves it. A count may then also say which version it was, and
nothing else is added: no session id, no account, no device id."

### 4.3 How many readers a test needs

For 80% power at the usual 5% threshold, per arm:

| What is measured | From | To | Readers per arm |
|---|---|---|---|
| Finishing the questions | 60% | 70% | about 350 |
| Finishing the questions | 60% | 66% | about 1,000 |
| Opening Day 1 | 40% | 48% | about 600 |
| Back on day 2 | 30% | 36% | about 1,000 |
| Back on day 7 | 20% | 25% | about 1,100 |
| Back on day 7 | 20% | 23% | about 2,900 |
| Back on day 30 | 10% | 13% | about 1,800 |
| Buying Plus, of those exposed | 2% | 3% | about 3,800 |
| Buying Plus, of those exposed | 2% | 2.5% | about 13,800 |

The baselines are placeholders. The real ones are already in the admin
(`lib/admin/onboardingSummary.ts`: `began`, `finished`, `returned`); read them
before the first test and replace this table. What the table says whatever the
baselines turn out to be:

- **Only large differences are findable.** With a few hundred new readers a
  week, a test of a ten point change in finishing takes two or three weeks. A
  three point change in day 7 return takes months. So test bold changes (a
  different first screen, the account step moved), never a button's wording.
- **Plus cannot be tested on purchases yet.** Thousands of exposed readers per
  arm are needed and Plus is sold on Android and the website only. Judge Plus
  tests on the step before the purchase (the sheet opened, the trial begun) and
  treat purchases as a tally to watch, not a verdict.
- **Rules that keep a small test honest.** Decide the one outcome and the number
  of readers before it starts (the registry holds both). Do not stop early
  because it looks good on Wednesday. Run whole weeks, since Sunday readers are
  not Tuesday readers. Do not run a test across a great feast or a fast's first
  week and compare it with ordinary time. One test per surface at a time.
- **A guard on every test.** Each names a second number that must not fall:
  for an onboarding test, day 7 return; for a Plus test, day 30 return. A change
  that sells more and keeps fewer loses.
- **A result is a note.** When a test ends, its outcome goes in
  `docs/1.9-build/notes/` with the counts, the loser's code is deleted, and the
  registry entry is closed. No test becomes a permanent fork.

### 4.4 RevenueCat's own experiments, for the offer

The price, the trial and which plan leads are tested with RevenueCat's
Experiments, not with the system above, for three reasons: RevenueCat already
knows who bought and for how much, so nothing new is counted; it measures what
the house counts cannot (trial to paid, renewals, refunds); and the paywall
needs no change to take part, because an experiment works by handing a different
`current` offering to the readers enrolled, and `getPlusPackages` already reads
`current`.

What to know before the first one (check each against RevenueCat's
documentation at build time; their plans and limits change):

- **It assigns by app user id**, which at Purify is always the Supabase user id
  (`revenuecat.ts:64` to 78). A signed-out reader is not in an experiment until
  they sign in at the paywall. Fine: nobody buys signed out.
- **It tests the offer, and can steer the paywall.** An offering can carry a
  small block of metadata. The paywall can read one word from it (which plan is
  shown first, whether the trial line leads) and draw itself accordingly, still
  from the house's own components. Never RevenueCat's hosted paywall:
  `presentPlusPaywall` exists in `lib/billing/revenuecatUi.ts` and is called by
  nothing, and should stay that way, since a hosted sheet is outside every house
  guardrail.
- **Never send a reader's background to RevenueCat.** Its targeting can pick an
  offering by a custom attribute. Setting "protestant" on a subscriber would put
  special-category data, tied to an account and a payment, in a processor's
  hands. If an offer is ever matched to a reader, match it to the lock they
  tapped, which RevenueCat need not be told: the app chooses what to show.
- **Whether Web Billing can be in an experiment** has to be confirmed. If it
  cannot, offer tests are Android only for now.
- **Every price or trial change is his decision** (stop conditions: "pricing or
  subscription terms"), each store has its own rules for showing a trial, and
  the paywall already refuses to say "7 days free" where the store will not give
  it (`revenuecat.ts:178`). An experiment changes none of that.

Beside RevenueCat, both stores test the page a reader installs from, and that
is the true top of the funnel: Google Play's store listing experiments and
custom store listings, and the App Store's product page optimization and custom
product pages. One custom page per ad theme is how "start from where the reader
came in" begins before the app is even installed (section 3.1).

### 4.5 The first five tests

Ranked by likely effect on retention and on Plus. Each changes one thing.

| # | Test | Arms | Judged by | Guard | Why it ranks here |
|---|---|---|---|---|---|
| 1 | **Value before the account** | A: the account step second, as now. B: no account step in the questions; the account is offered when it is first useful (turning on reminders on the website, saving a first verse, the end of the first week) | finishing the questions | day 7 return; accounts made by day 7 | The largest drop in most flows is the sign-up wall, and it stands before everything else here. If B keeps more readers and loses few accounts, every later test has more readers to work with |
| 2 | **A first step, not a front door** | A: Day 1 as now (seven of eleven open a section). B: Day 1 is one guided thing with an end, chosen by path (section 3.4), followed by a card for each of the next six days | opening Day 1; back on day 2 | day 7 return | The week after the questions is where the app has nothing planned. This is the test of the whole "tailored" idea in its cheapest form |
| 3 | **Start from the door** | A: "Welcome to Purify", then the questions in today's order. B: the first screen answers the door or asks what brought the reader, and the first tailored thing is shown before any question about them (section 3.2) | finishing the questions | day 7 return | His own example. Costs more to build than 1 and 2, and needs doors that mean something (tagged links, the Play referrer) to be worth running |
| 4 | **Reminders asked in their moment** | A: asked in the questions, as now. B: asked after the reader finishes their first prayer or reading ("Shall Purify remind you tomorrow?"), and on the phones kept without an account | reminders turned on | day 7 and day 30 return | Reminders are the strongest lever on day 30. Asking after a first good experience usually wins over asking cold. The no-account part is a fix and ships to both arms on the phones |
| 5 | **Plus introduced, not only met as a lock** | A: locks only, as now. B: after the first week, one calm card on Today showing the Plus feature that fits the reader's own first pick, with its Try it screen (`components/billing/PlusTry.tsx`) | the upgrade sheet opened; a trial begun | day 30 return; purchases as a tally | Lowest because the numbers are smallest and iOS cannot sell. Still worth running early because it takes longest to read |

After those, the first RevenueCat experiment, on his word: the yearly plan first
with its trial against the monthly plan first, judged by trial to paid, not by
taps.

---

## 5. Retention per path

### 5.1 What each period is for

The same three jobs on every road. What differs is the thing done.

| Period | The job | The sign it was done |
|---|---|---|
| **The first day** | One finished thing in the first sitting: a prayer prayed to its end, a chapter read, a lesson closed. Not a tour of the app | The first step of the week was opened |
| **The first week** | A reason to open the app tomorrow that is the reader's own. Three or more of the seven steps, and reminders on | Steps opened; reminders on; back on day 7 |
| **The first month** | One standing thing: a rule, a plan, a path through the Fathers, a Liturgy planned | Back on day 30; the standing thing begun |

By road, what the standing thing is, and where each road is most likely lost:

| Road | Day one | The week | The month | Where it is lost |
|---|---|---|---|---|
| `practicing` | Their rule set, the calendar right | The app replaces what they used before for the day's readings and prayers | Their rule, daily; the season's reading | If the calendar or the rule is wrong for their parish on day one, they leave and do not say why. The rule screen is the whole first impression |
| `returning` | One short prayer, prayed | Three evenings | A plan begun; a parish found | Shame. Any line that counts what they have missed. The road's tone is the retention feature |
| `catechumen` | The Trisagion, or the first Liturgy guide | The guide's checklist; the reminder set for Sunday | The Gospels; fast days understood | They are taught by their parish, and Purify must fit beside the catechesis, not compete with it |
| `catholic` | A page of a Father | Nicaea, Leo, the Jesus Prayer | The reading paths | The first sentence that reads as an attack on Rome, or the first that pretends there is no difference |
| `protestant` | John 1, with a Father under one verse | The canon, the Creed, a first prayer | John in 21 days | The first unexplained word, and the first page where a saint is addressed in prayer with no word on why. Words explained is this road's retention feature |
| `christian` | The Creed | Nicaea and Chalcedon | The Gospels | A page that states the parting after Chalcedon carelessly. The event page as rewritten in 1.7 is the only thing to point at |
| `seeker` | A primary source, read | The timeline; a council | The paths; the councils shelf | They finish the history and have no reason to stay. One step each week turns toward the living Church |
| `newcomer` | One short thing understood | Start here, three steps | Start here, all seven | Today. It speaks in feasts and tones from the first morning. The verse greeting helps; words explained helps more |
| any, with a need | The one prayer or psalm that meets it | The same prayer, three evenings | The road they are on, resumed | Being sold to while it hurts, or being handed a lesson when they asked for comfort |

### 5.2 How each is measured

**What is already counted** (and already split by background, level, first pick
and door, since the device's finished record carries them):

| Question | Count that answers it | Where |
|---|---|---|
| Who began, who finished, where they left | `onboarding_step`, `onboarding_skipped`, `onboarding_finished` | `lib/onboarding/count.ts` |
| Did they take the first step | `onboarding_dayone` with its key | the same |
| Did they come back on day 2, 7, 30, by background and by door | `onboarding_returned` | the same; the admin sums it in `lib/admin/onboardingSummary.ts` (`returned`, `byBackground`, `byDoor`) |
| Did any device come back on day 1, 7, 30 | `first_open`, `came_back` | `lib/analytics/screenCounting.ts` |
| Did they turn reminders on | `onboarding_answer` for `reminders` | `lib/onboarding/counting.ts:57` |
| What kind of screen they left on | `screen_closed` | `lib/analytics/screens.ts` |
| Which lock they met, and which sold | `lock_tapped`, `plus_bought` | `lib/analytics/lockCounting.ts` |

So retention by background on day 2, 7 and 30 can be read today, before
anything is built. That reading is phase 0 of the plan, and it should decide
which road is built first: the one with the most readers and the worst return.

**What the roads need added.** Four small things, all in the existing shape
(a total, a closed list, the day, no reader):

| Addition | What it is | Why it is needed |
|---|---|---|
| `road` on the finished record and on the return notes | One word from the closed list of roads, worked out on the device | Background, level and first pick are already on the row, and the road is mostly derivable from them. Carrying the word saves the admin from re-deriving it and keeps the definition in one place. It adds no fact the row did not hold, except the returning mark and the lean |
| The week's steps | `onboarding_dayone` already counts one step by its key. Let it count each of the seven, with the step's number | The first week is the whole bet. Without this nobody knows whether readers leave at step one or step four |
| `need` among the answers | One word of four (3.3) | To know whether the need row is used at all, and whether those readers return. If its totals stay tiny it should not be shown in the admin by background (4.2, small cells) |
| A day 7 note of how the week went | On the day 7 return the device already speaks. Add how many of the seven steps it opened, 0 to 7, and whether reminders are on | Ties the lever (reminders, steps) to the outcome (the return) with no join on the server |

Two that are worth having and can wait: a total of first Liturgies planned (the
guide's plan is kept on the device in `lib/start/liturgyPlan.ts`), since for
the roads outside the Church it is the outcome that matters most; and a total
of the month's standing thing begun.

**Each addition is a new line on the privacy page**, or one new sentence that
covers them: the paragraph today lists "each screen reached, each answer given,
a skip, a finish" and the return notes. It does not name the Day 1 open, which
is counted now (`onboarding_dayone`). That small gap should be closed in the
same sentence, on his word.

**What will not be measurable, and should not be chased.** Whether one reader
did step three and then came back, as a row about that reader: the counts are
built so that row cannot exist. The day 7 note above gets the same answer as a
total. Time spent per reader, sessions per reader, a reader's path through
pages: none, by design. If a question can only be answered by following a
person, it is the wrong question for Purify.

---

## 6. Risks

### 6.1 Doctrinal accuracy

- **Tailoring multiplies the framing, and framing is where error enters.** Six
  paths means six sets of bridge lines, glossary entries and first-week cards.
  Under `docs/editorial-standards.md` every such line is editorial framing: AI
  may draft it into the review queue only, and nothing ships unreviewed except
  under an owner exception recorded in the queue.
- **No priest reviews Purify yet** (his standing note of 2026-10-16, queue item
  8). Comparative statements (what Rome teaches, what the Reformers taught, how
  the Orthodox Church answers) are the most disputable text the app could
  carry, and they would ship under that note or wait. Recommendation: the
  comparative text waits for a priest. Everything else in the plan can ship
  without it, because it only points at what Purify already has.
- **Build from what exists, and say less.** The safest tailored line is a
  selection, not a sentence: which council, which Father, which chapter comes
  first. A selection cannot misstate doctrine. Where words are needed, prefer
  the source's own (a canon, a Father in a public-domain translation, cited) to
  a summary of it.
- **Never state another tradition's teaching in Purify's voice without a
  source.** "Catholics believe" and "Protestants believe" are claims about
  living communities with their own documents. If a bridge line needs one, it
  cites the document (a council, a confession) and quotes it.
- **The glossary is doctrine.** A definition of theosis or Theotokos is a
  doctrinal statement in one sentence. Each entry: the term, its Greek, one
  plain sentence, and a cited source where the app already carries one (the
  Third Council for Theotokos; St Athanasius, On the Incarnation 54, as
  corrected in the queue's item 6, for theosis). The whole list goes to the
  queue as one item.
- **No invented patristic text, ever.** A first-week card that wants a Father's
  word takes it from the texts the app holds, by script, the way
  `data/plans/sayings.json` does and is tested.
- **The seven original theology studies fail the provenance audit** (queue item
  5: 16 quotations verify, 52 do not). No path should lead a new reader to
  those until they are repaired. The six added on 2026-07-26 pass.

### 6.2 Ecumenism

His rule: tailor to a wide audience "without actually being ecumenist". What
that means in the build:

- **The background changes the order and the bridge, never the content.** The
  same council page, the same saint, the same prayer for every reader. No
  softened version of 1054 for Catholics, no Deuterocanon tucked away for
  Protestants. A test should hold it: a content page takes no background prop.
- **No "we all believe the same" line anywhere.** Common ground is stated as
  history ("the Church of the first thousand years", "the councils both East
  and West received"), never as a present unity that does not exist.
- **No shared-prayer framing and nothing that reads as a recognition of other
  communions' sacraments or orders.** The app says what the Orthodox Church
  teaches and leaves a reader's own standing to their own conversation with a
  priest.
- **The opposite failure is as real: polemic.** A Catholic greeted with a list
  of Roman errors on day one leaves, and has not been taught anything. The
  heresies page (`lib/heresies/conciliar.ts`) names what councils condemned, in
  the councils' words; that is the register. History as it is, in order, with
  sources, is neither softened nor a weapon.
- **"Another faith" is not one path in doctrine.** A Jewish reader, a Muslim
  reader and a Hindu reader need different bridges, and each bridge is delicate.
  Do not write them. One road for all three: Start here, the Gospels, the
  Creed, a first Liturgy.
- **The invitation is to come and see.** Every path's last step is the same:
  a parish and a priest. The app teaches; it does not receive anyone into the
  Church, and should say so plainly where it matters (the first Liturgy guide
  already points a reader to the priest).

### 6.3 Privacy

- **A reader's religious background is special-category data** (GDPR Art. 9;
  the UK GDPR the same). So is anything that reveals it. Today it is in three
  places: on the device; in the reader's account, as
  `user_metadata.purify_space.background` on Supabase's servers
  (`lib/onboarding/accountSync.ts`); and in the counts as a total with no
  reader in it.
- **The counts are the strongest part.** No session, no account, no device id,
  the day and not the time, a closed list. That is close to truly anonymous,
  which is outside the GDPR altogether. Keep every new count to the same shape,
  and keep cells small in number of words (4.2).
- **The account copy is the weak part.** It is personal data, special category,
  on a server, tied to an email. It is there with a plain purpose (a second
  device starts from the same answers), the reader gave it themselves, and
  "Prefer not to say" is one tap away. But Art. 9 asks for explicit consent,
  and the page never asks: the screen says "So Purify can start you in the
  right place" and the answer is synced silently at the end. Two honest fixes,
  either enough:
  1. **Keep the background on the device only.** Stop writing it to
     `purify_space`. A second device asks the one question again, or starts on
     the default. Smallest change, strongest position, and it matches what a
     reader would expect of the word "private".
  2. **Or ask.** One line under the pills, shown only to a signed-in reader:
     "Keep this answer with my account, so my other devices start the same way",
     off by default.
  Recommendation: the first. The background is needed where the app is drawn,
  and the app is drawn on the device.
- **A need is sensitive too.** "Anxiety" or "grief" beside an account is
  health-adjacent data. So the need (section 3.3) is worded as what the reader
  is looking for ("Peace", "Comfort in loss"), never as a condition, lives on
  the device only, is never written to the account, and is counted as a total
  like every other answer.
- **Nothing about background or need goes to a third party.** Not to
  RevenueCat as an attribute, not to an ad network as an audience, not into a
  push provider's tags, not into an email segment. A "Catholics" mailing list
  would be exactly the profiling Art. 9 exists to stop. Tailored push is chosen
  on the device from words the device holds.
- **The door is not sensitive by itself, but it can become so.** A tag such as
  `tiktok-catholic-ad` on a row, or kept beside an account, says the same
  thing the answer does. Tags name a post or a theme (`tiktok-fathers`), as
  `lib/analytics/tag.ts` already requires that they never name a person.
- **The privacy page has no section on legal basis or special-category data at
  all.** Searched: no "GDPR", "legal basis", "consent" for these answers. With
  readers in the EU (the page is translated into German) this is worth a
  lawyer's hour before the tailoring grows, whichever fix above is chosen. This
  is not legal advice; it is a flag that the question needs someone qualified.
- **New privacy lines this plan needs**, each for his word: the test line
  (4.2); the Play install referrer, if used ("on Android, the store tells the
  app which of our links you installed from"); the need question; and any
  change to where the background is kept.
- **Minimization as a habit.** Every new question must change something a
  reader can see. A question that feeds only the admin is a survey, and should
  be dropped or asked as one, openly, later.

### 6.4 Manipulation

- **Tailor to a real need, never play on fear.** A reader who says they came
  for peace is shown the Psalms and the Jesus Prayer. They are never shown a
  count of days missed, a warning about their soul, or a lock placed where the
  need is sharpest.
- **Never claim to treat anything.** Not anxiety, not depression, not grief,
  not sleep. No "reduces anxiety", no "clinically", no before and after. The
  stores refuse health claims without evidence, and the claim would be false:
  Purify offers the Church's prayers, which are not a treatment. The existing
  sub-line "Stillness, and some peace from anxiety" is at the edge of this and
  should be reworded when the screen is next touched ("Stillness, and a quiet
  mind" says the same without naming a condition).
- **A reader in distress is pointed outward.** Where the need path is entered,
  one quiet line: prayer is not a substitute for a doctor or for help in a
  crisis, and a priest can be spoken to. Wording for the queue. No hotline
  numbers hard-coded for the whole world without checking each.
- **The paywall rules already written stay the law** (`UpgradeModal.tsx:53` to
  58): "there is no countdown, no scarcity, and no subscriber count. Those
  would each need a fact the product does not have, and inventing one is a lie
  told to somebody about to pay." A test arm may never break it. Nor the push
  rule (`lib/push/doctrine.ts`): no clock put on the reader.
- **No guilt streaks.** A first week of cards is an invitation each day, and a
  missed day says nothing. The prayer rope came down in 1.6; nothing here
  brings a counter of devotion back by another door.
- **No fake personalization.** The handoff slate may only list things that are
  true of this reader's Purify. Today it lists real settings. If the revamp
  adds "Built for you" lines, each must name something that is actually
  different.
- **A/B testing is itself a risk to trust.** Testing which wording gets more
  grieving people to subscribe is the tarot company's game. The rule: tests
  choose between two honest versions, every test has a retention guard, and no
  test targets the need path's paywall at all.
- **Plus is never sold at the point of need.** No lock on a prayer for the
  departed, on the Psalms a grieving reader was sent to, or on the first week
  of any path. (The Gospels plan breaks this today: section 2.)

### 6.5 The stores' rules

- **Health claims.** Covered above. Both stores act on them, and "anxiety" in a
  listing or an ad for a non-medical app invites review.
- **Data safety and privacy labels.** Google's Data safety form and Apple's
  privacy labels both have a line for religious beliefs. If the background is kept in the account, it is "collected" in
  their sense and must be declared, linked to the user. If it stays on the
  device and only anonymous totals leave, the declaration is lighter. Check the
  current forms against what the build does before each store submission.
- **Subscriptions.** Apple requires the billed amount to be the most prominent
  price and the trial's terms to be plain; `KeptPaywall.tsx` is written to
  that. Any paywall arm must pass the same reading. No arm may hide the close
  control or the restore link.
- **Purchases must be reachable.** A tailored Purify that hides Plus features
  from some readers would break the owner's rule that "a Plus feature is never
  hidden" (`usePlusFeatures.ts:6`) and confuse review. Tailoring changes order
  and emphasis; the lock stays where it is.
- **Ads.** If ads are bought by theme, Meta's and Google's ad policies forbid
  copy that asserts a personal attribute ("Are you Catholic?", "Struggling with
  anxiety?"). Themes are addressed to an interest ("The Church Fathers, in
  their own words"), which is also the more dignified voice.
- **Children.** A questionnaire about religion raises the stakes if the
  audience includes minors. Whatever age rating and terms the app has now, the
  revamp should not lower them or add anything aimed at children.
- **The Play install referrer** is a Google library that reads a string from
  the store. It is allowed and common; it still needs its privacy line.
- **App Review reads onboarding.** A first run that demands an account before
  showing anything is a known review complaint on iOS (accounts must not be
  required for features that do not need one). Test 1 moves in the direction
  review prefers.

### 6.6 The house guardrails

- **Mockups** for any of this are drawn from the app's own components, rendered
  from the native export, and must pass `checkMock`
  (`scripts/mock-check.mjs`) before they are sent: contrast on all five
  palettes, 44px targets, glyph icons from `components/ui/icons`, palette
  tokens, no side stripes, Arabic mirroring, no em dashes. Sample text is plain
  words, never an AI-written reading of a verse, and Plus is never promised to
  every reader in a drawing.
- **No light rays.** A "your space is ready" moment is exactly where a sunburst
  gets drawn. Light is a soft pool or nothing; `lib/ui/__tests__/noRays.test.ts`
  holds the app to it.
- **White light, never yellow** for a lit answer (his word of 2026-10-28, kept
  in `WhereFrom.tsx` and `LookingFor.tsx`).
- **No em dashes** in any reader-facing line, and the voice is "Edgar, the
  Purify Team".
- **Twenty-one languages.** Every new string is a key in all of
  `lib/i18n/messages/*.json`. A path with forty new lines is eight hundred and
  forty strings, and translated doctrine is doctrine. This alone is a reason
  to tailor by selection and order before tailoring by prose.
- **The native rule.** Everything here is decided on the device after the page
  wakes; nothing reads a cookie or a session on the server, and nothing is
  handed to a page as a prop that it could fetch.
- **Counting rules.** A new event is a member of `trackEventSchema`, a closed
  list, a test, and a line on `/privacy`, in the same change.
- **One branch.** All of it on `ccr-07896cf2-bo0afd` until 1.9 merges. Raising
  `ONBOARDING_VERSION` asks every reader the questions again, which he has done
  once on purpose (1.5.2); it should be done at most once for this revamp, at
  the end, not once per phase.
- **Spend only what was asked.** Each phase below is sized so it can be said
  yes or no to alone.

---

## 7. A phased plan

Sizes are for the build and its tests, by the way this repo has gone: **S** is a
day or two, **M** about a week, **L** two weeks or more. None includes his
review rounds, mockups passing `checkMock`, translation into twenty-one
languages, or a store build, each of which this repo's history says is as long
again as the code. Every phase stands alone and can be said no to.

| # | Phase | What is built | Size | Needs |
|---|---|---|---|---|
| 0 | **Read what is already counted** | Nothing. Open the admin's onboarding panel and write down: where the flow is left (the account step above all), the share who skip, the finish rate, and day 2, 7 and 30 return by background and by door. Replace the placeholder baselines in 4.3. Pick the first road by the numbers | An hour of his | Nothing |
| 1 | **Keep the promises** | The road (`roadOf`, pure, tested). The first week in place of Day 1, on four roads first: `catholic`, `protestant`, `newcomer`, `practicing`, each step an existing page. Picks two and three used. The Gospels pick no longer lands on a locked plan. The handoff names the week. Readers who already answered get their road without being asked again | M | His word on the weeks' order. New framing lines to the queue; until they clear, a step shows the page's own title and no line. The week's step count needs the privacy sentence (5.2), or ships uncounted |
| 2 | **The A/B system** | `lib/ab` (seed, arm, registry), the `ab` word in the schema, `ab_exposed`, the admin's test panel with the small-cell rule, an arm picker in Testers mode | M | The privacy line (4.2), his word. No test runs before it is on the page |
| 3 | **The account and the reminders, each in its moment** | Test 1: the account step out of the questions. Test 4: reminders asked after a first prayer or reading. On the phones, reminders that need no account (local notifications: a native dependency, so the R8 walk on a real device) | M to L | His word on moving the account step. A store build to carry the native change |
| 4 | **The remaining roads and the questions' new shape** | `returning`, `catechumen`, `christian`, `seeker`. The "Another Christian tradition" pill. Question 3 asked by road. The second-chance card on Today. Raises the questions' version once, at the end, so everyone is asked the new shape one time | M | His picks on wording (mockups under the mockup rule). The returning road's lines to the queue |
| 5 | **The door** | Themes on link tags; the themed opening screen on the website (test 3). The Play install referrer on Android. One landing per theme on the mobile website. Custom store pages, made by him in the two consoles | M, plus his console work | The privacy line for the install referrer. A store build. Meaningful only once ads or tagged posts run by theme |
| 6 | **Words explained, and the Bible's three bridges** | The setting; the dotted underline and the sheet, from `GlossedText`; where the Bible first opens by road; the one-time commentary tip; the one-time Old Testament card reusing the FAQ's words; the "saints of the West before the schism" group | M | The dictionary's 100 entries reviewed as a queue item. A priest's word on which saints lead the Western row |
| 7 | **The need** | The quiet row under question 1; the three-day overlay; the `psalms-needs` rule built from Brenton; the anxiety sub-line reworded; the outward-pointing line | M | A priest's glance at the psalm selection. The wording of every line on this road through the queue. The privacy sentence for `need`. No test may touch this road's paywall |
| 8 | **Plus, introduced** | The one card after the first week, by road (3.7, test 5). Then the first RevenueCat experiment | S for the card; the experiment is set up in RevenueCat's dashboard | His decisions: the first plan (free, seven days free, or locked), and any price or trial arm |
| 9 | **The bridges in words** | "Coming from Rome", "Coming from the Reformation", the words that look shared and are not, a fuller "Why this Old Testament" | L, mostly writing and review | **A priest.** Not before. Also the repair of the five theology studies that fail the audit, which is its own piece of work |

**What to build first for the biggest effect: phases 0, 1 and 3.** Phase 1 makes
the two sentences the questions already say true, fixes the one step that lands
on a paywall, and lights up for every reader who has already answered, with no
new question, no new prose that must wait, and no native change. Phase 3 goes
after the two places a reader is most likely lost before Purify has shown them
anything: the account wall and the reminders detour. Phase 0 costs an hour and
tells him whether that guess is right before a line is written.

**On testing phase 1.** It could wait for phase 2 and ship as an arm. With
Purify's numbers, that is weeks of waiting to learn whether keeping a promise is
better than breaking one. Ship it to everyone, and compare before with after
through the counts' own version number (`COUNT_VERSION`, already on every row).
A before-and-after reading is weaker than a test and is enough for this. Save
the tests for the questions that are truly open: the account, the reminders,
the door, Plus.

---

## 8. What waits on Edgar, on a priest, and on the privacy page

**Edgar's word:**

1. Whether the eight roads are the right eight, and which four go first.
2. The order of each first week (3.4). These are his to arrange; the tables are
   a first proposal.
3. Moving the account step out of the questions (test 1), and the clergy
   question to a quiet line.
4. The new pill, "Another Christian tradition", and question 3 asked by road.
5. Where the reader's background is kept: on the device only (recommended), or
   in the account with a plain yes (6.3).
6. The first reading plan: free, seven days free, or locked as now (3.7).
7. Any price, trial or plan-order experiment in RevenueCat (4.4).
8. Each new privacy sentence below, and the letter that tells readers the page
   changed, as its "Changes to this page" promises.
9. Raising the questions' version, which asks every reader again. Once.
10. Whether ads will run by theme at all. The door phase is only worth its
    cost if they do.

**A priest's review** (none reviews Purify yet, by his standing note of
2026-10-16; until one does, each of these either waits or ships marked under
that note, and that choice is his):

1. Every framing line on a first-week card that is more than the page's title.
2. The dictionary's 100 entries, before words are explained on Today.
3. Which saints lead "the saints of the West before the schism".
4. The psalm selection for sickness, fear and sorrow, and every line on the
   need road, the outward-pointing one above all.
5. The returning road's lines, where a careless word about confession or
   absence does harm.
6. All of phase 9.

**New privacy lines** (each a sentence on `/privacy` in the same change as its
code, and named in the next letter):

1. Tests: two versions of a screen, chosen by a number that never leaves the
   device (the draft is in 4.2).
2. The first week's steps and the day 7 note, with the Day 1 open that is
   counted today and not yet named.
3. The need, as a total.
4. On Android, the store telling the app which of our links an install began
   from.
5. Where the background is kept, if that changes.

And one thing that is not a line but a question for someone qualified: the page
has no section on the legal basis for holding a reader's religious background,
which the GDPR treats as special-category data. An hour with a lawyer before
the tailoring grows is cheap beside the alternative.

---

*A brainstorm on Edgar's word of 2026-11-10. Sections 1 to 8 are notes only.*

---

## 9. As built (2026-11-10, his word the same day)

His word, about 03:25 UTC: "start working on and implement the revised on
boarding system with new sections or new screens". The arbiter's frame: one
flag, off for readers; phases 1, 3 (the account only), 4, then 2; build to the
recommendations where his word is pending (his questions 105 to 112); stills to
him before any push.

**Where it is.** Pushed to the branch on his "ok to all" of 2026-11-10 (about
04:13 UTC, on the stills: https://claude.ai/artifact/79rbBLRqbTpjsxydwRQLYc),
in five commits: the Arabic fixes on their own, the rules, the screens, the
two cards on Today, and the A/B system. The patch that held the work while it
waited was deleted in the same push.

**The flag.** `lib/onboarding/flags.ts`: `ROADS_LIVE = false`. On while Testers
mode is on (Settings, Testers, "First open"), and in a build made with
`NEXT_PUBLIC_ONBOARDING_ROADS=1`. There is no "test build" in the code to key
on: the test APK and the store AAB are one workflow, which this work does not
touch.

**What was built, and where it differs from the notes above.**

| Notes | Built |
|---|---|
| The road (3.4) | `lib/onboarding/road.ts`, `roadOf`, the eight roads. The Protestant lean is read from the first pick and never asked |
| The first week (3.4) | `lib/onboarding/week.ts`, in the Day 1 card (`FirstStepsNudge.tsx`). All eight roads, not four. The first pick leads the week, picks two and three take days four and five |
| A step shows a title and one line | A title, and a line only where the app already says one about that page. A council, a saint or an event stands on its own name. No framing line was written |
| "A reader may dismiss the week whole" | Closing a step passes it over; two closed in a row end the week |
| Practicing, days 6 and 7: the Psalter plan, the season's plan | Both are Plus, so neither is in a week: the Psalter itself, and the reading paths |
| The seeker's and Protestant's "Apostolic Fathers" | St. Ignatius of Antioch's page. The saints' list cannot be opened on a group from a link |
| The newcomer's "a saint's Life, as a story" | St. Mary of Egypt, for his word |
| The account moved (test 1) | No account step and no reminders step for a signed-out new reader. One card on Today after a first step offers both (`RoadCards.tsx`, `KeepCard`). Not as a test: the frame built it outright behind the flag |
| Reminders with no account on the phones | Not this round: it needs a native dependency |
| Question 3 by road (3.2) | Built. "Prefer not to say" keeps the old question |
| The clergy question a quiet line | Built, on the rule's screen |
| The second chance (3.2) | Built (`SecondChanceCard`): the question's own screen, with a close |
| Background on the device only (6.3) | With the flag on it is not written to the account and not filled from it. Copies already in accounts are not removed |
| The A/B system (4) | `lib/ab`: built first with an empty registry and its sender off. Then, on his word the same day, the first test, its learning rule, its panel and its picker: section 10 |
| Counts (5.2) | Nothing new is counted. The week's first step counts as the Day 1 open where it is one of Day 1's own steps. The new pill's answer is left off every row |
| The questions' version | Not raised |

**Added on his OK:** "Preview as signed out" in Settings, Testers (his
question 137), since an admin is always signed in and could not otherwise walk
the signed-out way through on their own phone. It survives "First open" and
ends with "Back to my own".

**The words, in 21 languages (his "sure" of 2026-11-10, about 04:32 UTC):**
the line under "Just curious" said "a short tour first" where there is no
tour. It reads "We'll start you with a few small steps into the faith." now,
in every language from that language's own wording of Start here. The other
new reader-facing strings (the new pill and its line, the two questions and
their answers, the clergy line, the week's three, the second-chance card) are
in all 21 too, each from the words that language already uses for the same
things. Left in English on purpose: the nine page names on the week's cards,
which stand as the pages themselves name them, and the three Testers strings,
which only an admin sees. A reader of each language should still look them
over before the flag flips; a translation pass is the edit that looks right
and is not.

**Not behind the flag:** the answer cards and the handoff's lines were set
`text-left` and would not turn in Arabic; `checkMock` caught it and they are
`text-start` now, in their own commit. And `markOnboarded` keeps the day the
questions ended, which only the flag reads.

**Checked before the push:** typecheck 0; unit 9,999 passed (new:
`road.test.ts`, `week.test.ts`, the roads in `flowSteps.test.ts`, the preview
in `testers.test.ts`, `lib/ab/__tests__`); lint 0 errors; `build:android` and
`build:ios` green with the flag off, and `build:android` green with it on;
`checkMock` passes on all eleven screens and cards of the stills.

**To see it on a phone:** Settings, Testers, "First open" walks the new
questions, with nothing counted and nothing synced; "Preview as signed out"
first, to walk them as a reader with no account. To light it for readers, on
his word: `ROADS_LIVE` in `lib/onboarding/flags.ts`.

---

## 10. The first test, as built: the account's place (2026-11-10)

His word, about 04:36 UTC: "sure. ensure you have a A/B test based around
this. a self learning criterion etc". The design went to the arbiter in plain
lines and came back "go". The wider system (one testing system for all of
Purify, seven new counts, the Terms paragraph) is a separate page waiting on
his OK, https://claude.ai/artifact/94eopwRhoMrd991kvz1mg6, and none of it is
built.

**The question.** Where a new reader with no account is offered one.
`lib/ab/tests.ts`, `ACCOUNT_PLACE`, two versions:

- `card`: as built. No account in the questions; the card on Today after a
  first step of the week.
- `end`: the account step as the last question, after "What are you looking
  for?"; then the reminders if they signed in; then the handoff. No card.

A reader who is signed in already is in neither.

**When it runs.** Only while the roads are lit for readers (`gate: "roads"`),
so not before release and never in Testers mode. Its days are set in the
release commit with `ROADS_LIVE`: the first day the day of release, the last
twelve weeks on. A unit test refuses lit roads with any other span.

**The criterion.**

- Judged by `back_week2`: the device opened Purify again in its second week,
  days 7 to 13 after it was shown its version. Not "day 7 or later": while the
  shares move, one version's devices are newer than the other's, and an open
  end would lean against whichever is gaining.
- Must not get clearly worse: `finished`, `account`, `plus_bought`. Clearly
  worse is 19 chances in 20 that a version is a fifth or more behind the
  other. A version that is cannot be given more than an equal share.
- Every milestone is something in a device's first two weeks after it was
  shown (`lib/ab/milestones.ts`), and nothing is read of a device until its
  fourteenth day has passed. So like is compared with like.

**Self-learning** (`lib/ab/bandit.ts`, pure and exact, no random draw). Equal
shares until each version has 200 devices past their two weeks. Then each
version's share is the chance it is the best on the judge (Thompson sampling,
worked out on a grid so the same counts always give the same shares). No
version under 20%. Settled when each has 1,100, one is ahead 19 in 20 and is
not held: every new device gets it. Past its last day unsettled: back to
`card`, the version that was built.

**The device** (`lib/ab/device.ts`). It draws a seed once and keeps it; its
version is worked out from the seed against the shares as they stand that day,
and kept for good. It is counted as shown at one moment for both versions, as
it leaves "What are you looking for?", the last screen they share. It says each
milestone once.

**The shares** come from `/api/ab/weights`: one public setting, the same for
every device, worked out at most once an hour. A device asks with no cookie and
no sign-in, and uses equal shares if it has none.

**The rows.** Two, in `analytics_events`, on the server's closed list
(`lib/security/schemas.ts`), held to the registry and the milestones:

- `ab_exposed`: the test, the version, the kind of device, the day.
- `ab_reached`: the test, the version, the milestone, the kind of device, and
  one day: the day the device was shown its version, which the row is filed
  under (`app/api/track/event`). So a row still holds the day and not the time,
  as the privacy page says of every count, and holds no second date.

No account, no device id, no session id, and the seed is in neither.

**Accounts.** The arbiter's ruling: a sign-in from the card counts as the
answer the account step has always counted, `onboarding_answer` "account:
signed in" (`lib/onboarding/count.ts`, `countAccountFromCard`), since the page
already says each answer is counted.

**What he sees.** Admin, Reach, Onboarding, under the charts
(`components/admin/tabs/AbTests.tsx`, from `lib/ab/panel.ts`): the question,
one sentence on where it stands, and for each version how many were shown, how
many are past two weeks, the judge and each guard as a count and a rate, and
today's share. Nothing under 20 is shown. Before release it reads "Not
running. It starts when the revised onboarding is lit for readers, at release."

**To look at each version before release:** Settings, Testers, "A test's
version to look at", then "Preview as signed out" and "First open".

**One thing he should expect.** The `end` version will very likely make
clearly more accounts than the card: it asks everyone, the card asks only those
who took a first step. If so the panel will read "Held: card is clearly behind
on accounts", and the card will not be favoured even if it brings more readers
back. That is the guardrail doing its job, and the trade is then his to
weigh: more accounts, or more readers kept.

**The honest pace.** A device counts two weeks after it is shown. Learning
starts at 200 devices a version, settling needs 1,100. At a few hundred new
readers a week, of whom only those with no account are in it, a settled
answer is two to three months away, and may not come inside twelve weeks.


## 11. The wider system and the seven counts, as built (2026-11-10)

His word, about 04:40 UTC: "allow fable to cook up on the A/B test system and
ensure its applicable to other parts of our system too. we need to track
certain things also". Then "we can change terms if we need to implement new
tracking system of course", and "finalize all of this and let's get going".
The plain page he was sent is the record of the proposal
(https://claude.ai/artifact/94eopwRhoMrd991kvz1mg6); this section is the
record of what was built.

### The system, for any screen

The first test's machinery (section 10) already took any test. Three things
were added to `lib/ab/tests.ts`, each held by `lib/ab/__tests__/tests.test.ts`:

- **More surfaces.** A test may live on the welcome questions, Today, the Plus
  sheet, plans, reminders, the theme picker, or be an "offer".
- **One test judged on readers coming back at a time.** Two such tests on two
  screens would each move the thing the other is judged by, and neither could
  be read. The registry refuses the pair. Two tests on one screen at one time
  were refused already.
- **An offer names his word.** A test on a price, a trial or what Plus
  includes carries `word`, the day he said yes to that one test. Without it
  the registry refuses the test. None is registered.

### The next three tests: on record, none built

`AB_PLANNED` in the same file holds them in his order, and his panel lists
them under the first test ("The tests after it, in order. None is built.").
They are not in `AB_TESTS`, so no device can be given one.

1. **Reminders in their moment.** On the account card as built, or in one line
   after a first finished prayer or chapter. It waits for more than its turn:
   a reminder today is kept with an account (`components/profile/PushOptIn.tsx`
   is the server's push, for a signed-in reader, and the apps hold no local
   notifications). For a reader with no account the second version would be
   the account card under another name, which is the first test again. It is
   worth running once a phone can remind without an account, which this round
   was told not to build.
2. **The Plus sheet's order.** The tapped feature first, or the plans first.
   Same price, same words, same close.
3. **Plus, introduced once.** Locks only, or one calm card on Today after the
   first week. The card is his item 111 and is not built.

Why none is built now: they run one at a time, the first test may take twelve
weeks, and a second version built today would sit unused while the screens
around it change. Each is built two weeks before its turn and ships in the
store build before that turn, since both versions must be in an app the
stores reviewed.

### The seven counts

All in `lib/analytics/moreCounting.ts` (the rules, pure) and
`lib/analytics/moreCount.ts` (the sending). Each is a total in
`analytics_events` through `/api/track/event`, on the server's closed list
(`lib/security/schemas.ts`), kept to the day and not the time, with no
account, no device id, no session id and no page. Nothing about where a
reader comes from in faith is on any of them, and a test holds that.

| Count | The row | The decision it serves | Where it is sent from |
| --- | --- | --- | --- |
| The first prayer or chapter | `first_act`: prayer or chapter; 0, 1, 2 to 6, or 7 and more days after first open | What Today leads with; the early sign for every later test | `components/analytics/AnalyticsTracker.tsx`, once for a device |
| The first week's steps | `week_step`: the day of the seven; opened or passed | Whether seven is right, and which day to mend | `components/onboarding/FirstStepsNudge.tsx` |
| Accounts, by where | `account_made`: questions, card, signup or plus | Which moment is worth asking at | marked where the reader leaves to sign in, sent by `FirstRunGate.tsx` when an account under half an hour old is met |
| Reminders | `reminders_set`: on or off; questions, card or settings | Whether reminders keep readers, and where to ask | `OnboardingFlow.tsx`, `RoadCards.tsx`, `PushOptIn.tsx` |
| The Plus sheet, step by step | `plus_step`: the lock; tried or pay | Which part of Plus to rework first | `components/billing/UpgradeModal.tsx` |
| A purchase on the pricing page | `pricing_bought`: yearly or monthly | Completes the count of purchases, which today sees only the sheet's | `PlusPaywall.tsx`, `WebPaywall.tsx` |
| The two cards on Today | `today_card`: keep or second; answered or closed | Whether each earns its place | `RoadCards.tsx` |

Two words on rows that already exist: `first` on `screen_closed` (the device's
first day, so the screen new readers leave from is seen apart), and
`reminders` on `came_back` (was the device reminded when it came back).

The purchase on the pricing page is a row of its own, not a new lock on the
sheet's count, because the list of locks is the sheet's own and a test holds
the two equal. Its sentence is the second half of the Plus sheet's.

In the billing components the change is count calls only. Nothing a reader
sees or pays is touched, and `docs/audit/findings.yaml` was read first.

### The switch, and the words

**Nothing here is sent.** `MORE_COUNTS_SENDING` is `false`, every sender passes
through it, and the two added words ride only when it is on. The server
accepts the seven names, so the website can go out before the apps, and
receives none.

`PRIVACY_SENTENCES` in `moreCounting.ts` holds the eight sentences in English
and German as they were put to him (seven for the counts, and one naming the
first step opened, which is counted today and which the page omits).
`lib/analytics/__tests__/moreCounting.test.ts` refuses the switch on while
`/privacy` lacks any one of them, in either language. So a count cannot go
live ahead of its sentence.

At release, on his yes to the words (his page's items 140 and 141): the eight
sentences into `app/(app)/privacy/page.tsx` in both languages, the Terms
paragraph into the Terms, the switch on, and the 1.9 letter lists the changes
as the privacy page promises.

### What differs from the page he read

- The pricing page's purchase is its own row, as above. The sentence he read
  is unchanged.
- The reminders test is on record and not built, for the reason above. The
  arbiter had accepted building it now; this is a change of recommendation,
  said to the arbiter at the push.
- The guardrails of the three later tests are written against what the system
  measures (a device's first two weeks), not "back on day 30".

### The account card's word on reminders (the arbiter's check, 2026-11-10)

The signed-out account card on Today carried the questions' line "Reminders
reach this device through your account. Sign in, and they turn on." Checked
against the record, a reminder has been seen to arrive only on iPhone (the
owner's word of 2026-10-14). On Android, Google accepts the server's sends,
yet he had none on his own phone that day, and no Android phone has been seen
receiving since the repair of F-43 went live with 1.6. On the website no
browser has been seen to subscribe (F-40). So the card now says the line only
on iPhone (`lib/onboarding/reminderPromise.ts`, one line per platform, held by
its test); elsewhere it speaks of the account alone. Turn a platform on there
when a reminder is seen arriving on it.

Not decided here, because it is older than the roads and wider than the card:
the offer to turn reminders on, which the questions, the account page and
this card after a sign-in make on every platform, and which the live 1.8
makes today. That is F-21 and his item 89.

### The words are on the pages, and the counts are on (2026-11-10, about 08:25 UTC)

His "all recs" covered his page's item 140: yes to the eight privacy
sentences and the Terms paragraph as written. So, in one change:

- `/privacy` carries the eight sentences in English and in German, in two
  paragraphs after the line for tests, in the order he read them.
- The Terms carry the paragraph in section 2, "What Purify is". The Terms
  page is in English only, so there is no German there. Its date and version
  are not touched: they move on release day (his 96). The lawyer still reads
  the paragraph (his 113).
- `MORE_COUNTS_SENDING` is `true`. The test now refuses it true without every
  sentence on the page, so a sentence cannot be taken off while its count is
  sent, and it holds the Terms paragraph word for word (`TERMS_PARAGRAPH`).

Before release nothing is counted on the live site: the page, the server's
list and the apps ship together with 1.9. A test build from this branch sends
the new rows to the live server, which does not know their names yet and
refuses them.

No new line in the app's own languages came with this: the privacy page is
written in English and German only, and the counts show a reader nothing.

For the 1.9 letter's "Changes to this page", given to the arbiter for Admin:
"The privacy page now names eight more things Purify counts, each as a total
and never a person: a first prayer or chapter, the steps of a first week,
where an account is made, reminders turned on or off, the steps of the Plus
sheet, a device's first day, the two small cards on Today, and the first
step opened. The Terms now say that two readers may at times be shown
different versions of a screen."

One thing for Admin's item 141: its new "How long we keep it" paragraph
lists the kept counts by name, and should cover these as well.

## 12. Lit on the branch for the test builds (2026-11-10, about 15:50 UTC)

His word: "Remember, when I try the latest build, I want to try everything as
if it was public release. So I want to see everything they see so we could
test out the bugs accurately." So, on the arbiter's yes:

- `ROADS_LIVE` is `true` (`lib/onboarding/flags.ts`). Every reader of a build
  from the branch meets the new onboarding, not only a tester.
- The first test has its days (`lib/ab/tests.ts`, `ACCOUNT_PLACE`):
  2026-11-10 to 2027-02-02, twelve weeks. A fresh install with no account is
  given one of its two versions by chance and keeps it.

Why on the branch and not for one build: the Android build has no setting
that lights it for a single build, and adding one is a change to the audited
workflow. The branch is the release candidate, so the test build, the test
web and the release are now the same thing.

What changes at release: the two days are set again to the day of release
and twelve weeks on (a test holds the span, not the date, so the checklist
has to carry it: `OWNER-STEPS.md`, R0c). "Roads off" is the one line turned
back.

What a true run needs: Testers mode off ("Back to my own"), then a fresh
install or the app's data cleared. In Testers mode nothing is counted and the
device is in no test. To see the other version: a fresh install gives a new
chance at it; Testers mode's "A test's version to look at" shows either at
will.

Found on the way: two older tests took for granted that where a reader comes
from is copied to and from the account, which the new onboarding stops (his
108). They hold in both states now (`a2333e5ac`).

## 13. In 1.9 on his "everything in 1.9", and the roadmap after it (2026-11-10)

His words: "Again, not off at release. I want everything in version 1.9"
(about 15:50 UTC), then "rec yes to all" to the arbiter's timeline, "A now, B
after" (about 16:45 UTC). So three things from this area's later list went
into 1.9, and the rest became the start of the roadmap for 1.9.1 and after.

### Built into 1.9

**Readers who already answered are asked once (his 110).** The questions'
version is 4 while the new onboarding is lit and 3 with it off
(`lib/onboarding/state.ts`), so it follows the one flag. A reader who is
back, with an account or without one, is greeted "We updated our
onboarding", finds their earlier answers marked, and is asked once
(`FirstRunGate.tsx`, `finishedEarlierVersion`). Three things hold for that
reader because they are not new: they are never taken into the first test;
the streak's rope and its evening card never wait behind the week's card
(`lib/onboarding/useDayOne.ts`, `streakWaits`: for a new reader they do, and
for this reader that would have hidden the evening warning on seven days);
and the week's steps are called "Your next step". The counts' version is 6
with the flag. No new words.

Found on the way: ten scripts and two smoke tests stood for "a reader who
has answered" by the number 3, and would all have met the questions. They
use 99 now, which no version reaches. A new script does the same.

Held by `lib/onboarding/__tests__/askedAgain.test.ts` and
`node scripts/asked-again-walk.mjs`. Not checked from here: a real phone with
a real reader's months of data. His install over the app he has is that check.

**Plus, introduced once (his 111).** One card on Today a week after a new
reader's questions, with the one Plus feature that fits their road, opening
its Try it (`lib/onboarding/plusIntro.ts`, `RoadCards.tsx`, `PlusIntroCard`).
The words are the feature's own, as the Plus sheet says them; none was
written. Never a reader who is back, never where Plus is not sold, never the
newcomer's road, never while a step of the week is up. Once.

| Road | The feature |
|---|---|
| practicing | Remember the verse |
| returning, catechumen | Reading plans |
| catholic, seeker | History in full |
| protestant, christian | Cross-references |
| newcomer | none |

It runs as a test against Purify as it is (`lib/ab/tests.ts`,
`PLUS_INTRODUCED`: judged by Plus bought, readers coming back guarded,
1,140 a version to tell 2 in 100 from 4 in 100). SHUT behind
`PLUS_INTRO_LIVE` (`lib/onboarding/flags.ts`) until he has seen its stills;
its days are set when it is lit. In Testers mode an admin who picks "card"
sees it at once. It never runs beside the Plus sheet's order (the registry's
new rule, `apart`). A purchase is rare, so this test may well end unsettled,
and then Purify stays as it is.

Held by `lib/onboarding/__tests__/plusIntro.test.ts` and
`node scripts/plus-intro-walk.mjs`.

**The Plus sheet's order** is next, the same way: built, shut, stills first.

### The roadmap after 1.9, as put to him

Sizes are working days of build, tests and stills, not his review rounds.

| # | What | Size | Risk | Only he, or who |
|---|---|---|---|---|
| 6 | Reminders that need no account on the phones | 4 to 5 days, then a walk on a real Android phone and a real iPhone | High for a date: a new native part, and the Android build is shrunk | Both phone walks |
| 7 | The reminders test (after a first prayer, or on the account card) | 1.5 days, after 6; it cannot start until the first test ends | Low | Nothing |
| 8 | The door: Purify opening by the ad or link a reader came from | 5 days, a privacy sentence, a second native part on Android, his store pages | Medium; worth nothing until ads run by theme | Whether they will; the sentence; the store pages |
| 9 | Two fuller sentences for a reminder that could not be turned on | Half a day with 20 languages | Low | His phone walk first, then yes to the words |
| 10 | Words explained (about 100 terms) and the Bible's three bridges | 5 to 7 days | Doctrinal | Every entry read by him or a priest |
| 11 | The road for a reader who comes with a need | 5 days | High: pastoral, close to health data, his 129 | Every line with a priest; the lawyer for the sentence |
| 12 | The bridges in words (Rome, the Reformation, the Old Testament) | Two weeks or more, mostly writing | The highest here | A priest |
| 13 | Framing lines on the first week's cards | A few days of writing | Doctrinal | The editorial queue |
| 14 | Comparing the kinds of reader in the numbers | 2 days | Sensitive data | The lawyer (113) |
| 15 | Removing the faith-background copies already in accounts | 1 day, a change to live data, its SQL signed | Live data | He, after the lawyer |
| 16 | A first price or trial experiment | Hours, in RevenueCat's dashboard | A price | His word for that one test |

Not code, still open: a reminder seen arriving on an Android phone (F-21,
his 89); a native reader for the 20 translations and the German privacy
sentences; his hour in Admin, Onboarding (114).
