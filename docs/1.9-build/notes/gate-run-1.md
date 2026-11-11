# The pre-build gate, first run (2026-11-11)

The gate is CLAUDE.md's "No test build reaches him until it passes the
pre-build gate" and `notes/build-93.md`, "The pre-build gate". This is its
first run, by the Admin chat, of the parts it builds: 1 (the tap walk), 2
(the guardrail walk) and 4 (the words). Parts 3, 5 and 6 are other chats' and
the arbiter's.

**The export:** `npm run build:android` of `a596d963a` (built 02:47 to 02:49
UTC), walked on a phone (390 by 844, touch, dark), every route once (125
screens), online: the app read the main web as a reader's phone does (GET
only), so the pictures it streams arrived. `NODE_USE_ENV_PROXY=1 node
scripts/guardrail-walk.mjs --workers 3 --online`.

**Result:** 95 of 125 screens pass every rule. 30 do not. Nothing failed to
load. Who has each is the arbiter's to name; the file that draws it is given.

## Part 1: the tap walk

**The export:** `npm run build:android` of `4cbd5ef58`, walked on a phone (390
by 844, real touch through the DevTools protocol, dark), online as a reader's
phone is (GET only), every route once (125 screens), up to 40 controls on each
in reading order, each tap from the screen as it first stood. `NODE_USE_ENV_PROXY=1
node scripts/tap-walk.mjs --workers 3 --max 40 --online --shots <dir>`.
Fourteen screens have more than 40 controls (/bible/ 90, /calendar/ 48,
/community/ 191, /councils/ 47, /dictionary/ 96, /fasting/ 58, /history/ 113,
/reading/ 187, /reading/councils/ 66, /reading/paths/nativity/ 92, /saints/
291, /settings/ 48, /theology/ 41, /walkthroughs/job/ 50); the rest were walked
whole.

**First reading:** 1966 controls tapped, 117 failed. Looked at one by one,
four of the walk's own measures misread a phone, and were mended before
anything was given to an owner:

- A bar of tabs that stays at the top while its page goes to the part asked
  for (Alaska 1794's Story, Meaning, People, Sources) counted as moved by the
  whole distance, up to 6657px. A control on something stuck now rides a
  scroll on purpose.
- What stands above a control taken away while Chrome's scroll anchoring holds
  the control still (Saints' 35 filters, below) counted as a 732px jump. A
  move is now one the finger feels: on the screen and on the page both.
- Back was judged by the page's scroll number, which grows when a shelf is
  added above the reader and the browser keeps their place (the reading room's
  five, Prayers' two, the Bible's one). It is now judged by where what was
  tapped stands on the screen, which also finds what the number missed (the
  Bible's 33 below).
- History's timeline is drawn again once the main web answers, so 20 controls
  read as "the finger meets nothing". A control is now measured once it stands
  still, and one the page drew again is found again.

`node scripts/tap-walk.mjs --self-test` proves the mended measures on seven
cases of its own (a stuck bar, a held control, a jump, a page pulled at its
end, Back that keeps the place, Back that loses it, a control drawn again).
The old measures miss four of them.

**Second reading:** the fourteen screens that failed, walked again with the
mended walk on the same export: 404 controls, 79 failed, 35 held. The other
111 screens passed the first reading; the gate's second run walks every
screen with the mended walk.

### Moved under the finger

- **A reading plan's days** (components/plans/PlanPath.tsx, /plans/acts/):
  "Mark day N as read" moves 41px as "1 day in a row" and the day's card
  above it change. Five.
- **A reading path's days** (components/reading/PathView.tsx,
  /reading/paths/nativity/): "Mark as read" moves 24px as "1 of 40 days read"
  appears above it. Seventeen.
- **Fasting** (components/fasting/FastingTrackerClient.tsx): Kept and In part
  move 19px. Six. Already with Fable Themes, with its "1 days".
- **The prayer book** (components/prayers/PrayerBookContents.tsx, /prayers/):
  "The daily rule" moves 21px as it opens. One.
- **A saint's web** (components/saints/web/SaintWebScreen.tsx,
  /saints/adrian-of-rome/web/): the council's node moves 220px as the sheet it
  opens rises. One; to look at, since the web may lift the node above the
  sheet on purpose, and a slide that keeps what was chosen in sight is no
  jump.
- **Sign-in** (app/(auth)/layout.tsx and components/auth/OAuthButtons.tsx;
  /signin/, /set-password/ and the seven account pages that ask a reader to
  sign in): "Continue with Google" moves 24px. Nine, one cause: this export
  has no Google client ID (the store builds' workflows set it), so the tap
  writes "Google sign-in is unavailable in this build" below the button, and
  the form, centred on the screen, lifts by half the new line. A reader meets
  the lift only when Google fails or is cancelled.

### Pulled: the page grew too short at its end

- **Chants** (components/chants/ChantsHome.tsx): the Greek, Serbian, Arabic
  and Contemporary filters, 73px and 137px. Four.
- **What's new** (app/(app)/whats-new/page.tsx): Collapse all (6px) and the
  year's box (204px). Two. The page at one level replaces these boxes; it is
  walked again before it is pushed.

### Under: what opened ends under the bar at the foot

- **Community** (components/community/CommunityClient.tsx): "Read more" and
  "N replies" open below the tab bar and the page does not move with them,
  judged by Fable Theology's lib/ui/showOpened.ts. Four.

### Back does not return the reader to their place

- **The reading room** (components/reading/ReadingRoom.tsx, /reading/): back
  from a work, the page returns to its scroll, but the new "Continue reading"
  and "Because you read" shelves were drawn above first, so the work tapped
  stands 553px lower and the reader sees the shelves. When the shelves come
  after the page has returned, the browser holds the place, so it fails some
  taps and not others: four here, none of the five the first reading named.
- **The Bible** (components/mobile/BibleMobileContinue.tsx, /bible/): back
  from a book, the new "Continue reading" card stands above the list, and the
  list returns 67px lower. A new reader's first book; 33 of the 40 rows
  walked.

### Covered

- **The reading room's featured work** (components/reading/FeaturedWork.tsx):
  at the middle of the cover's link the finger meets the "2 h 43 min, Age of
  the Councils" line drawn over it. One.

### Held, to look at

- **Saints' filters** (components/saints/SaintsBrowser.tsx, /saints/): the
  Theotokos's card above the filters, 732px, goes when a filter is chosen.
  Chrome's scroll anchoring holds the chips under the finger, so the Android
  app passes. Safari gained scroll anchoring only lately (reported for Safari
  27 in 2026, not confirmed here in Apple's own notes), so an iPhone on an
  older iOS would see the chips leave the screen. Thirty-five.

### Who has each, Part 1 (the arbiter, 2026-11-11 05:30 UTC)

- **Fable Themes**: PathView, PlanPath, ChantsHome (its M4), SaintsBrowser
  (its L7: the mend must not lean on Safari's scroll anchoring), Community's
  "Read more" and "N replies", and FeaturedWork's covered link. Fasting was
  mended after this export (8a5c3cf7); the second run checks it.
- **Fable Theology**: ReadingRoom's and BibleMobileContinue's Back, and
  PrayerBookContents' 21px.
- **Updates 2**: "Continue with Google" (its M6): the error line keeps its
  room, so nothing moves when Google fails.
- **Admin**: What's new (at one level since 0c95f35f4: 18 taps, none failed).
- **Allowed by name and reason**: SaintWebScreen's council node rising with
  its sheet keeps the chosen node in sight above the sheet, which is the page
  following what opened. The walk's ALLOWED list names it, and prints it with
  its reason on every walk.

The second run walks every screen with the mended walk on a selling export
(`NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk
npm run build:android`), as he walks: a new reader with no Plus.

### The walk, mended again before the second run

A selling export sells only inside the Android app, so a walk in a plain
browser met nothing locked. The first full walk on it was stopped for that.
`SELLS_PLUS=1` now makes both walks the app on a phone, as a reader with no
Plus (`scripts/lib/sells-plus.mjs`); without it they walk as a reader for
whom nothing is locked. Both refuse an export that does not sell.

Seven more of the walk's own measures misread a phone, each found on a fail
that was the walk's and not the app's, and each mended before the fail went
to anyone:

- **Nothing was ever dead.** The app answers a reader's first touch on a
  screen (it lets the browser hold the reader's place, and loads what it
  waited to load), so every tap the walk made changed something, and no
  control could ever read as doing nothing. That is how the first run's 1,966
  taps found no dead control (Fable Theology's find). The walk now touches
  each screen once and lets it fall quiet before the tap it judges.
- **That first touch must touch nothing.** On Sign up it fell 7px from the
  agreement box's 44px reach, the browser's touch adjustment carried it onto
  the box and ticked it, the "agree first" hint went, and the terms and
  privacy links rose 26px from where the walk had aimed. It now lands only
  48px clear of any control, label or field, and the aim is taken after it.
- **A title that grows is not a jump.** The daily rule's title gains a line
  as it opens, which moved the control's top 21px while its middle stayed
  under the finger. A move is now the least of the top, the middle and the
  bottom.
- **What opens is judged from the thumb.** Community's "Read more" opens
  where the reader's thumb already is, and is judged from there.
- **A screen reader's link is not a finger's.** The reading room's featured
  work has a link drawn only for a screen reader; it is no longer tapped.
- **A finger meets a link on its words.** A link that wraps over two lines
  (About's) is aimed at the middle of its larger piece, not at the middle of
  its box, which can fall between the lines.
- **The browser's own answers count.** A form that will not send without a
  field (Sign in's) answers with the browser's message and the field taken
  to; a box ticked is the tap's answer; the page's own tab, and a choice
  already made, have nothing to do when tapped again, and are set aside.

`node scripts/tap-walk.mjs --self-test` holds all of it on 19 pages of its
own; each mend added one that fails on the walk before it.

### Third reading: the selling export, every screen

**The export:** `3e59ccfa6`, built to sell (above), walked as a reader with
no Plus, every route once (126 screens), up to 40 controls on each.
`SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs --workers 3 --max
40 --online`, 06:46 to 07:46 UTC.

**Result:** 1,960 controls tapped, 85 failed; two of them were the walk's own
(Sign up's terms and privacy links, above). Passed here after their owners'
mends: "Continue with Google" (Updates 2's M6), the chants' filters, fasting
and What's new. Passed here by the walk's own mends: the prayer book's daily
rule (a title that grows) and Community's "Read more" (the thumb). The reading
plan's and the reading path's days passed because the browser now held them:
the app lets Chrome keep a reader's place only from their first touch on a
screen (lib/ui/scrollReset.ts), and the walk now gives that touch. Fable
Themes' mend that holds them without the browser, as an iPhone needs, came
after this export (`dc3fe29d6`).

- **The Bible** (/bible/): back from a book, the row tapped returns 67px
  lower. 33. Fable Theology, mended in `549583085` (lib/ui/returnPlace.ts).
- **The reading room** (/reading/): back from a work, the work tapped
  returns as much as 567px from where it stood, once above the top of the
  screen. 7. Fable Theology, mended in the same push.
- **Community** (/community/): "3 replies" opens under the tab bar. 2. Fable
  Theology, mended in `5c300b36b` (lib/ui/showOpened.ts).
- **Plans and pricing** (/pricing/): back from "Sign in to continue", the
  page stands at the top for 2.5 seconds, then lands 30px from where it was.
  1. Fable Theology, in hand.
- **Saints' filters** (/saints/): the chips move as much as 732px as the card
  above them goes. 35. Fable Themes mended this in `dc3fe29d6`, after this
  export.
- **A saint's web** (/saints/adrian-of-rome/web/): five of the web's saints
  and councils move 21px as their card rises. The web rides up with its card
  by the owner's word (build 84, note 45); the allowance for it named only a
  council, and the nodes are named otherwise now.

### Fourth reading: every control, on the export of 28b69b784

**The export:** `28b69b784`, built to sell, walked as a reader with no Plus,
every route once (127 screens) and, for the first time, every control on each
(`--max 1000`): `SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs
--workers 3 --max 1000 --online`, 12:18 to 13:47 UTC.

**Result:** 2,773 controls tapped, 10 failed. Nine were the walk's own:

- **The first touch came after the scroll.** The walk scrolled to a control
  before its first touch, while the app still kept the browser from holding
  the reader's place. Jumping 10,000px down Community's feed, the posts on the
  way were drawn at their own height instead of the one guessed for them, and
  eight controls rose under the top bar ("covered"); the same jump put a
  saint's row deep in Saints astray for Back. A reader's finger is on the
  screen before it scrolls, so the first touch now comes first (`9cbc9acbb`;
  the self-test's /far-below/, which the walk before it cannot reach).
  Re-walked with the mend: Community's controls 114 to 124, 0 failed; Saints'
  control 202 passes.

One was the app's:

- **The reading room** (/reading/): back from "The Paschal Homily", the work
  returns 553px lower, the height of the two new shelves. Re-walked with the
  mend, it still fails. Fable Theology, mending it in lib/ui/returnPlace.ts.

The saint web's council, lifted with its card, is the one allowance used; the
five nodes that moved 21px in the third reading no longer move.

The next full walk runs with the mend, on the export the test build is cut
from.

## Part 2: the guardrail walk

### Touch: under 44 to a finger

- The sign-in form, on /signin, /signup, /forgot, /reset, /set-password and
  every /account/ page signed out (components/auth/SignInForm.tsx): the
  "Purify" link (54 by 29), "Privacy" (19 tall), "Forgot password?" (19),
  "New here? Create an account" (19). /signup's terms checkbox is 17 by 17.
- components/account/ExportLibrary.tsx: "Download Markdown" (22 tall) and
  "Download backup (JSON)" (24).
- components/bible/MultiVerseClient.tsx: "Back to the Bible" (20).
- components/community/CommunityClient.tsx: the "All" tab (18 wide), "Sign
  in" and "Try again" (39 tall), each post's avatar (38 by 38), the author's
  name and the reactions (18 tall), "Read about this day in the library"
  (20). The posts are readers' own, read from the main web.
- components/fasting/FastingTrackerClient.tsx: "Kept", "In part", "Broke" on
  every day (29 tall).
- components/prayers/PrayersTodayClient.tsx: "Chants" (43 wide, 1px short),
  and "Learn how", "Pray the Psalter", "Browse all saints", "Learn to pray"
  (20 tall).
- /reading/councils/: each council's name link (24 tall), nineteen of them.
- /theology/comma-johanneum/: "VIII · Scripture and the Fathers" (26 tall).

### Contrast (WCAG AA on the five palettes; the worst named)

- /community/ "Speak with charity..." (community.houseRules): 2.31:1 on
  Light, under 4.5 on all five.
- /councils/ancyra-314/the-twenty-five-canons/ "Source:" and its line
  ("H. R. Percival's English in Schaff and Wace"): 2.31:1, all five.
- /fasting/ "Your marks stay on this device. With Purify Plus..."
  (fasting.deviceNote): 2.31:1, all five.
- /start/ and /start/first-liturgy/ (components/start/FirstLiturgyCard.tsx
  and the steps): the step numbers, 2.05:1, all five.
- /theology/comma-johanneum/ "Doctrine" 2.31:1 (all five), "Part 1 of 4"
  3.97:1 (Dark, Candlelight, Monastery).
- /chants/paschal-canon/ the "About" and "Versions" tabs
  (components/chants/ChantDoors.tsx): 3.92:1 on Light.

### Icons and Arabic

- components/auth/PasswordInput.tsx: "Show password" is the emoji 👁, not an
  icon (glyph), and stands at the right in Arabic too (placed with right,
  not end).
- /chants/ and /chants/paschal-canon/: an icon placed with left or right.

### The three new looks (build 93)

- Empty picture: /prayers/ a round frame 51px across with nothing in it, and
  /community/ one 38px across. Not yet looked at by eye: either may be a
  shape meant to be empty, which then says so on itself
  (`data-mock-allow="picture"` with its reason).
- Dashed placeholder box: /prayers/personal/ (Your rule: the dashed nodes and
  the dashed "add" discs, `rule-node[data-dash]`, `rule-med-disc[data-add]`);
  /settings/ and /settings/reading-mode/: the earned palettes not yet earned
  drawn with a dashed outline (`set-mode-page`), the look build 93 note 4
  asked to go.
- Keyboard hint on a phone: /whats-new/ old notes ("Esc, click outside, or
  the close button", "Keyboard shortcuts hint", "a command palette ...
  Ctrl+K"). The Admin chat's, with the old notes' clean-up.

### Readers' own words

- /community/: a reader's post holds a sparkle character. Readers' own words
  are theirs (lib/ui/__tests__/noSparkle.test.ts excepts them by name); the
  walk cannot tell them from the app's, so the community's post body should
  carry `data-mock-allow="sparkle emdash" data-mock-why="a reader's own
  words"`, as the noSparkle test's own exception does in code.

### Second run, on the export of 28b69b784 (2026-11-11, 13:50 to 13:57 UTC)

The same export as the fourth reading, walked twice: as a reader with no
Plus (`SELLS_PLUS=1`) and as one for whom nothing is locked. Both read the
same: **124 of 127 screens pass every rule.** The checker carries the cut
rule (a control's name cut short) and, since `75ef54f77`, measures an Arabic
page left to right in English, so a bar that fills from the start in Arabic
is no longer read as placed with left or right.

- **/history/:** four of the atlas's links are narrower than a finger ("Arius"
  33.6px, "1054" 29, "1204" 28.9, "1453" 28.1, each 46.8 high;
  components/councils/CouncilMap.tsx as /history/ draws it), and four eras'
  names end in an ellipsis ("Imperial and conciliar Church", "Missionary and
  Byzantine expansion", "Estrangement of East and West", "Ottoman and
  post-Byzantine period"; components/history/EraJumpList.tsx). To the
  arbiter for an owner.
- **/saints/:** 29 saints' first titles cut at one line, mended after this
  export by Fable Themes (`ff901d0fe`).
- **A work's chapter button** (/saints/acepsimas-joseph-and-aithalas/
  life-of-acepsimas/): its title cut by an ellipsis, the December chat's find;
  the fix goes in the button.

Contrast on the five palettes, 44px elsewhere, rays, stripes, the sparkle,
pictures, dashed boxes, keys and mirroring: nothing on any screen.

## Part 4: the words

`lib/ui/__tests__/wordsTrue.test.ts` (green, with its WAITING list) and
`docs/1.9-build/free-and-plus.md`. The gate passes when WAITING is empty.
Today it holds:

- Updates, with the campaigns chat (build 93 note 14): the prayer wall's two
  lines, `prayers.diptychs.wallHeading` and `prayers.wall.left`.
- Admin (fresh eyes H2 and H3, approved by the arbiter at 02:49 with mends,
  being built): the FAQ's free, accounts, data and install answers and the
  About's two lines, English and German, and the sync promised on signing in
  alone in eight places.
- Admin, waiting on his yes (the arbiter's packet): the Privacy page's lines
  on signing in (A and B, the rest of "On this device vs signed in", the
  welcome answers in the field list, and Buy Me a Coffee in the third
  parties), and the website's front page strip.

## Where each part stands, after the second run (2026-11-11, 14:20 UTC)

The gate is `notes/build-93.md`, "The pre-build gate". Parts 1, 2 and 4 are
Admin's; 3 is Updates 2's and the December and January chats'; 5 is each
chat's, read by the arbiter; 6 waits on his yes.

**1. The tap walk:** the fourth reading, every control on every screen of the
export of `28b69b784`, as a reader with no Plus: 2,773 taps, one fail the
app's (the reading room's Back after "The Paschal Homily"), the other nine
the walk's own, mended (`9cbc9acbb`). The Back is mended too (Fable
Theology, `cbe99ec17`, 14:33 UTC): the room shelves that book four times,
twice between the same two books, and a place now remembers which of those
links it was. On Fable Theology's selling export with the mend, the same
walk on /reading/, every control: 185 tapped, 0 failed. Beside it,
Fable Themes' page-switch walk (`SELLS_PLUS=1 node scripts/route-motion.mjs`,
50 verdicts, every page switch a transition): 50 of 50 on Fable Themes' own
selling export of `e6c2a49d`. Both run again on the export the test build is
cut from.

**2. The guardrail walk:** the same export, as both readers: 124 of 127
screens pass every rule. Left: /history/'s atlas links and era names
(Updates), a works' chapter button (Updates 2); the saints' first titles
were mended after the export (Fable Themes, `ff901d0fe`).

*Part 2's reach, from the third run on (the arbiter, 2026-11-11 14:24 UTC):
what a tap opens.* A sheet, a menu or a dialog is a screen a reader sees,
and the guardrail walk, which measures each screen as it loads, never sees
one. From the third run the tap walk holds each distinct one it opens to
every checkMock rule, once, where it first opens (its role, its name and the
names of the controls in it make it distinct; a count in a name reads alike),
on both readers, and says what fails under the screen and the control that
opened it (`sheet:` lines, with the rest of that screen's fails); its summary
counts the distinct sheets and lists any it could not measure. A tap that goes
to another page is not asked, as that page is a screen of its own. The walk's
self-test proves it: a sheet whose Close is 24px square fails, where the walk
before the measure passed it, and the same sheet at 44 passes
(`node scripts/tap-walk.mjs --self-test`, 22 of 22).

Its first trial, on /community/, /prayers/ and /settings/ as a reader with
no Plus (14:35 to 15:05 UTC), found three that no walk had seen, all mended
the same hour: Search's Close, 38px square on every screen's Search sheet
(`hit-44`, the plate kept at 38: the arbiter's word, Admin's hand,
`2743f0288`); the bell's sheet, signed out, its "Sign in" 41px across
(Admin's own, `min-w-11`, `9f277d9cd`); and a Plus member's profile, whose
gold dust and drifting specks did not say what the app's own test allows
(`data-mock-allow="gold mirror"` with the reason, on the effect and the
frames, no change a reader sees, `2743f0288`). The trials also mended the
measure: a sheet settles before it is named and measured (a profile was
measured half-loaded), a sheet is told apart by its frame (Search counts
once though what it suggests changes with the screen), and with `--online`
both walks read the public pictures the main web keeps in its storage (a
profile picture read as missing because the walk blocked it). On a selling
export of the mended tree: 90 taps, 0 failed, 9 distinct sheets, all clean.

Two mends to the checker itself during the third run (Admin's, 16:41 UTC).
The Arabic check failed Now Playing's countdown while a recording played: the
clock ticked between the two directions, and the check read its narrower
words as a box placed with left or right (Updates' find, 16:26). The check
now measures left to right a second time after Arabic. A box passes if it
mirrors either left-to-right measure. One that moved between those two
measures and mirrors neither is listed as not measured, not as a fail. The
self-test holds a clock that ticks once between the two directions, which the
old check failed and the new one passes, and a bar that grows every frame,
which is listed. The self-test's own proof of the pixels pass was also wrong.
Its two test pictures were written with double quotes inside a style that was
itself in double quotes, so the style ended at "url(" and neither picture was
drawn. The proof had passed by reading the app's tab bar under the words
instead (the grey words read 2.33:1 there, not their own 1.30:1). It showed
once the picture measure began reading only what a reader sees (Fable Themes,
`7bd238108`). With the quoting fixed and the test standing over everything,
the light words read 19.03:1 on their dark picture and the grey 1.30:1 on
theirs. The pass's first trial (125 of 125 look words answered) was taken on
the measure before that change, so the final run's counts replace it.

**3. No saint or work without a picture:**
`lib/saints/__tests__/everySaintAPicture.test.ts` passes: every saint has a
picture or stands in its list, with what he waits for. The list had 31 at
the second run; it has 27 since Updates 2's pushes of 14:00 to 14:35 UTC,
in which St Alexander of Alexandria, St Isidora of Tabenna, St Adrian and
St Theodosius came to wear old pictures, and St Symeon the New Theologian,
St Mark of Ephesus and St Xenia of Petersburg went to the permissions list.
By 16:10 UTC it is 25, all on a permission: St Mark of Ephesus wears the
Eleon workshop's own free icon by his word of about 14:54 (3ee67b401), St
Victorinus Brollo's fresco of 1886, in the public domain (97e5102eb), and
the Prophet Micaiah, the one still searched, Luyken's scene of his witness
(608c6c7b1); St Hermione of Ephesus went to permission when her page's
icon, with no source, came down (d328d1b6a). A letter is drafted for each in
`docs/1.9-build/PERMISSION-LETTERS.md` for him to send (19 letters; 12 and 20
taken out, with why, and 21 for St Hermione, in Greek), but three: St
Gabriel of Georgia and St Lazarus of Mount Galesion have no address yet, and
Sts Zacchaeus and Alphaeus no icon. The file holds a twentieth since 15:56
UTC, letter 22, which asks no leave for a saint on the list: a note to the
BLAGO Fund, whose archive gives three wall paintings shown now as CC BY 4.0
while its image-request page says non-commercial, asking which holds (the
voices chat, `e79434407`); an answer of non-commercial, or that their leave
is needed, comes to the arbiter the same day.
Run again at 14:43 UTC on the pulled tree: passes. A work without a cover:
held by `lib/reading/__tests__/coverArt.test.ts`, which passes.

**4. The words:** `lib/ui/__tests__/wordsTrue.test.ts` passes, and its
waiting list is empty since `d86f2ec26`: the Privacy page's lines on signing
in and Buy Me a Coffee were its last, and went with his yes to call 32. The
same test holds `docs/1.9-build/free-and-plus.md` to the code: the Plus rows
the paywall draws, and what is free.

**5. Every note has its test:** build 93's twenty-one notes, with the tests
and walks that name them (each chat's; whether each fails on the old code
is for the arbiter's read):

- **1** (St Alexander's picture on Nicaea's page; Back lands at the bottom):
  lib/councils/__tests__/fatherPlate.test.ts, fatherShown.test.ts,
  pages.test.ts; lib/ui/__tests__/arrivingImage.test.ts, facePlate.test.ts,
  returnPlace.test.ts; lib/today/__tests__/saintFaces.test.ts.
- **2** (Easy Scroll fights the finger): scripts/export-walk.mjs.
- **3** (a reading look changes nothing): lib/entitlements/__tests__/
  plusAfterSignIn.test.ts; lib/reader/__tests__/plusModesGate.test.ts,
  vespersPass.test.ts; lib/settings/__tests__/litPanels.test.ts,
  readingModeGallery.test.ts; scripts/tap-walk.mjs.
- **4** (Reading mode refined): lib/reader/__tests__/earned.test.ts,
  modeSwatches.test.ts; lib/ui/__tests__/noDashedBoxes.test.ts,
  touchTargets.test.ts.
- **5** (an event's timeline): lib/history/__tests__/calmHistory.test.ts,
  thread.test.ts, threadDesign.test.ts; lib/premium/__tests__/plusTry.test.ts,
  plusTryScreens.test.ts.
- **6** (the language list off the screen): lib/i18n/__tests__/
  languageSheet.test.ts.
- **7** (the sparkle star): lib/ui/__tests__/noSparkle.test.ts; checkMock's
  sparkle rule.
- **8** (the journal's Title explanation): lib/bible/__tests__/
  verseFocus.test.ts; lib/journal/__tests__/blockForms.test.ts,
  pageEditor.test.ts, writingSheet.test.ts, waiting.test.ts (a waiting page
  lost when another opened, found mending it); lib/whatsNew/__tests__/
  tourTaps.test.ts; scripts/tap-walk.mjs, scripts/mock-journal.mjs.
- **9** (the journal and the Florilegium always there): lib/journal/__tests__/
  waysIn.test.ts; lib/nav/__tests__/oneSettings.test.ts.
- **10** (Support this work, where the money goes): lib/support/__tests__/
  supportPage.test.ts, its case on where the money goes named for the note.
- **11** (learn by heart: any verse, a quote, one's own words):
  lib/quotes/__tests__/find.test.ts; lib/remember/__tests__/items.test.ts;
  lib/sync/__tests__/kept.test.ts, learnedWordsTravel.test.ts;
  lib/widget/__tests__/remember.test.ts, sync.test.ts; scripts/learn-walk.mjs.
- **12** (every saint has an icon): lib/saints/__tests__/
  everySaintAPicture.test.ts; lib/reading/__tests__/coverArt.test.ts.
- **13** (highlight and quote any words of a Father): lib/bible/__tests__/
  readerScreen.test.ts; lib/marks/__tests__/pages.test.ts, saved.test.ts;
  lib/saints/__tests__/paragraphDoubleTap.test.ts; lib/sync/__tests__/
  marks.test.ts.
- **14** (the end of a rule): lib/community/__tests__/prayAndTalk.test.ts;
  lib/prayers/__tests__/prayerPages.test.ts, ruleEnd.test.ts.
- **15** (what opens shows itself): lib/prayers/__tests__/bookFollow.test.ts,
  prayersHome.test.ts; lib/ui/__tests__/openedParts.test.ts,
  showOpened.test.ts; scripts/opened-walk.mjs.
- **16** (Your rule's switch jumps): lib/prayers/__tests__/
  yourRulePage.test.ts; lib/ui/__tests__/underTheFinger.test.ts.
- **17** (a Father's notes and highlights as the Bible's):
  lib/marks/__tests__/pages.test.ts.
- **18** (works without a cover): lib/reading/__tests__/coverArt.test.ts.
- **19** (the Florilegium, and with it the journal "intertwined"):
  lib/florilegium/__tests__/href.test.ts, redesign.test.ts, todayLine.test.ts,
  gatheringPages.test.ts; lib/journal/__tests__/gatherings.test.ts;
  scripts/florilegium-walk.mjs, scripts/mock-journal.mjs (the journal's half,
  the campaigns and journal chat's, 8b437eba5).
- **20** (the Bible's translation as easy as the chapter): lib/bible/__tests__/
  translationBeside.test.ts.
- **21** (campaigns not in build 93; the themes do not change): two named
  cases. The themes: lib/entitlements/__tests__/plusAfterSignIn.test.ts, a
  sign-in with Plus asked again at once, so the looks change (note 3's
  cause). The campaigns, in the build and hidden by the server's no as built
  (lib/campaigns/flags.ts): lib/campaigns/__tests__/doorStates.test.ts.

**6. Fresh eyes:** proposed to him, a Fable run; his yes first.

## Who has each (the arbiter, 2026-11-11 03:07 UTC)

- **Updates 2**, with fresh eyes M6: the sign-in form's four links and /signup's
  checkbox (SignInForm.tsx), "Show password" as an icon placed with end
  (PasswordInput.tsx), and "Back to the Bible" (MultiVerseClient.tsx).
- **Updates**: Your rule's dashed nodes and "add" discs, with build 93 note 16;
  the nineteen council links on /reading/councils/, with fresh eyes M3.
  Fasting's three buttons move from its list to Fable Themes.
- **Fable Themes**, the lightest lane: ExportLibrary.tsx's two buttons;
  CommunityClient.tsx (its touch sizes, the empty 38px frame by eye, readers'
  words allowed by name on the post body, the house rules line's contrast);
  FastingTrackerClient.tsx (the three buttons and the device note, with its
  fresh-eyes look); PrayersTodayClient.tsx (Chants, the four links, the empty
  51px frame by eye); the contrast of the Ancyra canons' source line, the
  Start step numbers and ChantDoors' tabs on Light, mended at the source if
  they share one class; the chants' icons placed with start and end; the
  earned palettes drawn dashed (build 93 note 4, already its own).
- **Fable Theology**: /theology/comma-johanneum/'s chapter link and the
  contrast of "Doctrine" and "Part 1 of 4".
- **Admin**: What's new's keyboard hints, with the old notes' clean-up.

Each screen passes `scripts/guardrail-walk.mjs` again before its owner calls
it done; the gate's second run is on the export the test build is cut from.
