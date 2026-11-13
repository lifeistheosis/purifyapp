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

And a check of what is asked of the website (the arbiter's yes, 16:59 UTC).
The picture rule judges only a picture a reader can see (the arbiter, 15:45),
so it could not name Theology's council marks. With no signal they showed only
their blurred preview, because they asked the website for
/history/media/<council>.v1.jpg while the apps carry the .v1.avif
(lib/media/carried.ts; Fable Theology's find, their mend to come). The
guardrail walk now notes every picture a screen asks of the website, lazy ones
included. It names any the export carries, at the same address or under the
same name in another format, as "carried". A picture the export does not carry
is the website's by design (lib/media/streamed.ts) and is not named. The
check's self-test (`node scripts/guardrail-walk.mjs --self-test`) names a
council asked for as a JPEG and a lazy one below the fold. It leaves alone
one offered as the carried AVIF first, and a picture the export does not
carry. With the check emptied, it fails on three of its five cases. On
Theology's four screens of the export of 967849535 it names seven councils'
JPEGs, on /theology/, /theology/creed/, /theology/path/christ/ and
/heresies/apollinarianism/.

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

## Final run 1 (2026-11-11 20:27 to 2026-11-12 02:06 UTC): not a pass

The arbiter's call (20:25 UTC): one selling export, built as the release
would be; both walks, both readers, with the pixels pass; the gift's claim
screens; parts 3 to 5; the web build last; one report. The arbiter closed it
at 02:08 UTC as "final run 1, not a pass". Its eleven fails are routed below,
and a confirm run follows on the head that mends them.

**The export:** `npm run build:android` of `f4679fb49` (it holds
`0e442bfcc`), selling: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1`, and the new
reader walked with `SELLS_PLUS=1`. The switches stood in their release-day
order (lib/campaigns/flags.ts): CAMPAIGNS_OPENING "testers",
PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true,
CARE_NOTE_SEND true. Parts 3 to 5 and the web build ran on `6d51bf716`, the
export's head with one website-only file (a profile's share picture).

**Part 1, the tap walk:** every control on every screen and every sheet, at
phone size with touch, reading the main web.
- New reader, no Plus: 128 screens, 2,881 controls, 2 failed; 110 distinct
  sheets, 1 failed.
- Open reader: 128 screens, 2,873 controls, 4 failed; 109 sheets, 3 failed.
- /gift/ in the eight states no walk reaches, since a walk has no order:
  signed out; ready, claimed on arrival; on its way; Plus running; Pro;
  claimed before by this reader; claimed by someone else; no orders. A
  stand-in answered for /api/gifts/order and its claim. Every control was
  tapped and checkMock with pixels held each state: all eight pass, and
  their words fail in one (fail 11).

**Part 2, checkMock with pixels on every screen, five palettes:** the new
reader 125 of 128 screens clean, the open reader 122 of 128. The walks wore
the five palettes only. The seventeen looks, worn by the open reader on
sixteen main screens: 15 measured, 12 clean, and the three fails were all on
light looks; /reading/ was cut by the run's own time limit. On the arbiter's
word (02:08 UTC) the seven light looks (Desert, Jordan, Blush, Roses,
Lavender, Olive, Stone) are measured on all 128 screens, because the dark
looks read like the dark palettes, which passed.

**The fails, by owner (the arbiter's routing, 02:08 UTC).**

Updates:
1. /history/, both readers: the row after 451 jumps 333px when it is brought
   to the middle, and rests under the tab bar (three tries of three). The two
   rows above it hold 270px while undrawn and draw at 361px
   (app/globals.css, .history-cv).
2. The atlases, Where they met and Where it happened: the dot between a date
   and a place reads 2.65:1 on every palette (.atlas-row-line i, at 0.3
   white).
3. /reading/councils/, both readers: seven council pictures asked of the
   website as JPEG while the export carries each as AVIF, so a reader with no
   signal sees none (lib/councils/books.ts).
4. /gift/, both readers: "Try again" is 85 by 36 (OrderGiftClient.tsx).
5. /prayers/: "The Hours" reads 2.99:1 on Candlelight against its need of
   3:1, its picture following the hour (SoftTiles.tsx).
9. Today, on the light looks: the hour card's line reads 4.28:1 over its
   picture (PrayNowCard.tsx).
10. /history/alaska-mission/, on the light looks: "Kodiak" reads 4.44:1 on
    the map door (CouncilMap.tsx).
11. /gift/, a line that is not true: a buyer whose parcel's recipient claimed
    the month with the label is told no order was found, over that same order
    listed as already claimed (OrderGiftClient.tsx, the ticket's none line
    and "Your other orders").

Updates 2:
6. /pricing/, both readers: "Purify Plus" reads 4.47:1 on Candlelight
   (KeptPaywall.tsx).
7. /florilegium/ and its gathering: the references read 4.41 to 4.49:1 on
   Light, and 4.26 to 4.33:1 on the light looks (GatheringRow.tsx,
   GatheringPages.tsx).
8. /community/, the Purify profile sheet: "@purify" read 2.84:1 on Black in
   one walk and 10.14:1 in the other, by where the drifting specks stood
   (ProfileCard.tsx).

For Updates 2 to judge: a reader's profile sheet, once, held an svg white on
Light outside any dark island. Four tries afterwards found nothing (0.1, 0.3,
1.5 and 5 seconds after the tap, transitions stilled as checkMock stills
them); the sheet turns into a dark island when that reader's banner arrives,
so it was most likely measured across that change (ProfileViewer.tsx).

**No look stands unanswered.** Words over a picture: 863 and 872 in the two
guardrail walks, of which 756 and 765 were answered by their pixels; 947 and
946 in the sheets, of which 827 and 828. The rest were answered by eye from
stills on Dark and Light:
- the guardrail walks' 107 each, on four screens: Community (a reader's letter
  under their picture, shown only when there is no picture), Reading mode (the
  verse digits inside the small page pictures, allowed by name), and the
  walkthroughs and Job's ("Walking with Job" stands beside or under its
  picture). All read.
- the sheets' 120 and 118: the atlas years on the map (112 and 110), right at
  rest though one still caught a year mid-roll, and the Eras sheet (8),
  clear.
- the open walk's one control for the eye: Settings' Serif choice takes; the
  preview and a saint's work move between DM Sans and Lora.

**Allowances:** two new since the third run, each with its reason: the atlas
year's digit columns ("a year's digits keep their order in Arabic",
MapAtlas.tsx) and a reader's own words in the profile ("a reader's own
words", readersWords.ts). None stands without a reason.

**Not fails:** a saint's web lifts the chosen council above its sheet (the
arbiter's allowance of 2026-11-11), and five "Mark day as read" buttons on a
plan are held under the finger by the browser's scroll anchoring.

**Parts 3 to 5:** 62 files, 932 tests, all pass. **The web build:** passes,
6,525 pages.

**The seven light looks on all 128 screens** (02:09 to 02:36 UTC, the open
reader, pixels, the same export, three shards): 128 measured, 120 clean,
none left unmeasured; /reading/ clean, its 328 words over pictures each read
by its pixels. No new fault. Every fail is one of the eleven: fail 9 on Today
and on /signout/ (the same card), fail 7 on the florilegium's two screens,
fail 10 on /history/alaska-mission/, and, not of the looks, fail 3 on
/reading/councils/ancyra-314/ as well as /reading/councils/ (the same
lib/councils/books.ts), with fail 4 as before. Words over a picture: 798, of
which 691 read by their pixels and 107 left for the eye on the four screens
answered above. Patmos and Linen, the two light looks that passed on the
sixteen screens, were not worn, by the arbiter's word.

**The confirm run** (the arbiter, 02:08 UTC), when Updates and Updates 2
report: a new selling export in the same positions; the guardrail walk on
all 128 screens, both readers, five palettes, pixels; the tap walk on every
screen the mends touch, both readers (the history row brought to the middle,
the atlases, /reading/councils/ and /reading/councils/ancyra-314/ with no
signal, /gift/ in all eight states with the claim by a recipient, /prayers/,
/pricing/, /florilegium/, Community's sheets, Today and /signout/,
/history/alaska-mission/); the light looks on those screens; parts 3 to 5;
the web build last; one report.

## Confirm run (2026-11-12 05:39 to 09:27 UTC): not a pass

The arbiter's call (05:37 UTC): the full gate on the export the test build
would be cut from, run in parallel shards. The arbiter closed it at 09:31 UTC
as "confirm run, not a pass". Three fails in the gate's reach and seven
groups beyond it are routed below, and a final check follows on the head that
mends them.

**The export:** `npm run build:android` of `872724aa3` (it holds
`059cbc794`), selling: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1`, and the new
reader walked with `SELLS_PLUS=1`. The switches stood in their release-day
order, read at that head: CAMPAIGNS_OPENING "testers",
PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true,
CARE_NOTE_SEND true. Parts 3 to 5 and the web build ran on the same head.
Every walk skipped a new reader's welcome before measuring.

**Part 1, the tap walk,** both readers at once:
- New reader, no Plus: 128 screens, 2,860 controls, 1 failed; 112 distinct
  sheets, 1 failed (the same one).
- Open reader: 128 screens, 2,875 controls, 2 failed; 111 sheets, 2 failed
  (the same two).
- The four choices left for the eye were each tapped and the page loaded
  again: Interlinear by default (a chapter then opens with its Greek), Clicks
  as you scroll, the calendar's New, and This week's readings (the new reader
  is shown the Plus sheet instead). Each is kept.
- /gift/ in thirteen states: final run 1's eight, the four with orders the
  arbiter named (on its way; on its way with one claimed by its recipient;
  every gift claimed; one claimed), and every gift claimed with no plan
  running. All thirteen pass, and an order on the account is never called
  not found. The present's form stands below the orders for every signed-in
  reader with no plan running, and is absent while a plan runs, as
  a8610c746 meant.
- The row after 451 on /history/ stays where it is brought: final run 1's
  fail 1 holds mended.

**Part 2, checkMock with pixels on all 128 screens, five palettes:** both
readers 128 of 128 clean. **The seven light looks on all 128 screens:** 128 of
128 clean. The words left for the eye are the ones answered in final run 1.

**No signal:** /reading/councils/, /reading/councils/ancyra-314/, the seven
ecumenical councils' pages and /history/, each scrolled to its end: every
picture drawn from the app, none asked of the website. checkMock with no
signal: three of the ten clean; the seven councils' pages fail (fail 3).

**Beyond the 128.** The walks take one page for each route, so a page that
shares its route with the sampled one is never measured, and the export has
2,409 pages. Admin measured 998 more with checkMock and pixels, the open
reader on the five palettes: every page except the Bible's chapters after
each book's first (1,283). That sweep found most of this run's fails, and on
the arbiter's word (09:31 UTC) it stays in the gate from now on.

**The fails, by owner (the arbiter's routing, 09:31 UTC).**

In the gate's reach:
1. The Search sheet, both readers: the day's saint, "St. John the Merciful,
   Patriarch", ended in an ellipsis (SearchRows.tsx). Updates 2, mended in
   f2919bec1 and 2b723abaf after this export.
2. Community, the Purify profile sheet, open reader: its status read 4.47:1
   on Monastery (ProfileCard.tsx). Updates 2.
3. The seven ecumenical councils' pages, with signal and without: the kicker
   ("First Ecumenical Council" to "Seventh") read 2.46 to 3.57:1 over the
   council's picture (app/(app)/councils/[slug]/page.tsx). Ancyra, the page
   the 128 take for that route, has no picture there. Updates.

Beyond the 128:
4. Saints' webs, 87 of the 117 the 128 do not reach: long names cut on the
   web and on their cards, five kinds cut in St Athanasius's row, and the
   kinds, years, dots and eras under 4.5:1 over the web's lines, mostly on
   Candlelight and Monastery (components/saints/web/). Updates 2.
5. The Bible's chapter picker in thirteen books of the New Testament: the
   book's name cut (ReaderDock.tsx). Updates.
6. The seven ecumenical councils' shelves in the reading room: the minutes
   read 4.17 to 4.49:1 on Light (CouncilShelf.tsx). Updates.
7. Third Constantinople's shelf: St Agatho's letter's title cut at its fourth
   line (WorkCover.tsx). Updates 2.
8. St Paul's missions: "Antioch" on the map read 3.89:1 on Light and
   Candlelight (EventThread.tsx). Updates.
9. Psalm 117's chant: the words view's "Transliteration" and "Both" read
   3.39:1 on Light (ChantWords.tsx). Updates 2.
10. An edition's em dashes with no allowance by name: the pre-communion
    prayers and five councils' documents (lib/ui/__tests__/editionDashes.test.ts
    says how the works and the Bible's rail carry theirs). Updates.
11. Measured under load and not again: two of St Cyril's works on Dark, which
    passed when measured alone. Left as measured.

**Allowances:** none new since final run 1.

**Parts 3 to 5:** 72 files, 993 tests, all pass. **The web build:** passes,
6,525 pages.

**For the drop, not the build** (the arbiter, 09:31 UTC): the Purify
account's own profile status in production still says "v1.8 is finally
here!". It is live data, not in the repo, so a release-day step asks the
owner to change it.

**The final check** (the arbiter, 09:31 UTC), when Updates and Updates 2
report, on the new head: a new selling export; part 2 on all 128 screens,
both readers; the sweep on all 998 pages with pixels, five palettes, in
shards; the seven light looks on every family the mends touch; a tap walk on
every screen they touch, both readers (the Search sheet from Saints and from
Everything, the Purify sheet, the seven council pages, the chapter picker in
the thirteen books, the shelves, Third Constantinople's reading room, St
Paul's missions, Psalm 117's chant, the pre-communion prayers, the council
documents, and the webs of St Athanasius, the Twenty Thousand Martyrs and St
John the Apostle); parts 3 to 5; the web build last. Part 1 is not repeated
whole: it passed on 872724aa3 but for the Search row, and this round changes
no control.

## Final check (2026-11-12 20:42 to 2026-11-13 02:12 UTC): not a pass

The arbiter's call (20:20 UTC, cut at its word of 20:43 from `05aee81e1`): a
new selling export; part 2 on all 128 screens, both readers, at 390, 800x1280
and 1032x1376; the sweep of the 996 pages the walks do not reach, with pixels,
five palettes, in shards; the seven light looks on every family the mends
touched; offline on the councils, Ancyra 314 and /history/; a tap walk on every
screen whose controls changed since `872724aa3`, both readers, at 390 and at 320,
800 and 1032 where named; /gift/ in its thirteen states; the four tall-card
webs with the faded web tapped; parts 3 to 5; the web build last. The arbiter
closed it at 02:14 UTC as "not a pass".

**The export:** `npm run build:android` of `3e65f51ff` (its code is
`05aee81e1`), selling: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1` with
`NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk`, and the new reader walked with
`SELLS_PLUS=1`. The switches stood in their release-day order: CAMPAIGNS_OPENING
"testers", PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true,
JULY_GROUPS_GO true, CARE_NOTE_SEND true. The container restarted at about
21:30 UTC and stopped the run; it resumed on the same export, keeping what had
finished (part 2 at 390 for the new reader, and the open reader's first shard).
Parts 3 to 5 and the web build ran on `b6b97b2e5`: since `05aee81e1` only the
admin panel (web only), docs, CI, the push guard and its test, and the walk's
mend below. No app code.

**Part 2, checkMock with pixels, five palettes:** at 390 both readers 128 of
128 clean; at 800 and at 1032 both readers 127 of 128 (fail 1). The words left
for the eye are the ones answered before, and on the wide calendar the dot
between New and Old, which wears the Old link's own ink (5.14 to 6.06:1) and is
hidden from a screen reader.

**The sweep:** 996 pages, open reader, 995 clean. St Ephrem's On the
Transfiguration failed under load ("Editorial summary" 4.24:1 on Dark) and
passes measured again alone. **The seven light looks:** 363 pages in the
touched families, all clean; the Search sheet from Saints and from a page that
searches everything, and the Purify profile sheet, clean on the five palettes
and the seven looks.

**No signal:** /reading/councils/, Ancyra 314, the seven ecumenical councils'
pages and /history/, each scrolled to its end: every picture drawn from the
app, none asked of the website. checkMock with no signal, ten of ten: the
confirm run's council kicker is mended.

**Part 1, the tap walk,** both readers at once, touch:
- 390, 83 screens: 2,225 and 2,219 controls, 30 failed each, the same lines
  in both (the councils' Fathers, fail 2; five webs' lifted saints, allowed
  since by the arbiter; John the Apostle's tucked card, the walk's own). 190
  distinct sheets each, none failed.
- 320 (the nineteen books' first chapters and St Chrysogonus's web): 374 and
  373 controls, one failed each (St Chrysogonus's tucked card, the walk's
  own). checkMock at 320 on the same twenty: clean for both readers.
- 800 (calendar, journal, prayers) and 1032 (those and /saints/): the Search
  sheet's key hint (fail 3); for the new reader at 1032, fail 6. The century
  timeline passes at 1032.
- John 1 with the interlinear on, both readers, in English and in Arabic.
  Every Greek word is a control that opens its own sheet, 847 controls on the
  page, about three hours a walk. Stopped at 01:41 UTC and walked as a sample:
  the ten controls before the words and the first thirty words, each language,
  each reader. Every word's sheet fails one rule (fail 4).
- Genesis 1 in Arabic: fifteen controls and four sheets each, none failed. Its
  commentary sheet, which the walk does not reach (each verse's mark is drawn
  11 to 15 by 5 pixels with its 44 reach round it, and the walk passes over
  anything under 8): walked by hand, both readers, in English and in Arabic.
  Each of the nine marks opens its verse's sheet, every sheet clean on the five
  palettes and the first on the seven looks, and each control in it changes
  the sheet.
- /gift/ in thirteen states: all pass. /history/'s row brought to the middle
  stays at 371px from 0 to 1000 ms.
- The four tall-card webs (Irenaeus, Ambrose, John the Apostle, Anthony), both
  readers: every control of the faded web in reach was tapped, the card stood
  tall again before each. Each tap lowered the card, as `05aee81e1` says a tap
  on the empty web does, and nothing under it answered. On Anthony's web one
  faded saint stands inside the Web and Timeline switch's own reach, so a
  finger there is the switch's and it was left out.

**Mended in the walk during the run** (`b6b97b2e5`): `--lang` sets the phone's
language too. The Android shell's stand-in has no Capacitor Preferences, so the
app opened in the device's language and the new reader's Arabic walks were in
English. Every Arabic walk above ran after the mend.

**The fails, by owner (the arbiter, 02:14 UTC):**
1. /calendar/ at 800 and 1032, both readers, on Light: today's date in the
   day's tone, 3.58:1 (components/calendar/CalendarCell.tsx). Updates.
2. The seven ecumenical councils' pages at 390, both readers: the Fathers move
   14 to 106px under the finger as the card above the row takes the chosen
   Father's height (components/councils/CouncilFathers.tsx). Updates 2.
3. The Search sheet at 800 and 1032, both readers: an "esc" key drawn on a
   touch screen (components/search/CommandPalette.tsx). Updates 2.
4. John 1 with the interlinear on: every word's sheet keeps its Close 8.6px
   off its place in Arabic, set with "-mr-2" where "-me-2" mirrors
   (components/bible/WordPopover.tsx). Updates 2.
5. Saints' webs: the place and date under a node cut with an ellipsis, on 17
   webs at 390 ("Constantinople, 381" loses its year) and on 44 at 320
   ("Great Persecution" on 14). checkMock's cut rule reads only controls'
   names, so it was measured line by line
   (components/saints/web/WebConstellation.tsx). Updates 2.
6. /prayers/ at 1032, the new reader: the prayer book's chapters II and III
   stay under the finger only by the browser's scroll anchoring (296px), seen
   twice. By the arbiter's ruling of 2026-11-11 a mend must not lean on
   Safari's anchoring, and the iPad runs WebKit
   (components/prayers/PrayerBookContents.tsx with lib/ui/showOpened.ts).
   Updates.

**The arbiter's rulings (02:14 UTC):**
- The webs' lifted saints: the allowance of 2026-11-11 extends to every node,
  by name and reason: a tapped node kept in sight above the card it opened. It
  must move in the house glide and end fully in view. The walk still fails a
  node that ends hidden, or that moves with an instant cut outside reduced
  motion.
- Community's thread under the tab bar, seen once in the first start: the
  measure, not the screen (Updates 2's `db29a0470` is accepted).
- The walk's reach: for 1.9, Genesis 1's hand walk of the commentary marks
  stands as the sample, and the arbiter names it to the owner. Counting a
  control by its drawn reach (hit-44) goes into 2.0's nightly gate.

**Not fails:** John the Apostle's web at 390 and St Chrysogonus's at 320. The
walk's first touch on the empty web tucks the card away, as a reader's would,
and the card's button it then aims at is inert and unseen behind the tab bar.

**Allowances new since the confirm run,** by name and reason: "target" on a
word in its own line (GlossedText.tsx and VerseRow.tsx, `13e85f3ff`); "emdash"
on the councils' documents and their notes as their editions print them
(CouncilSections.tsx) and on the prayer's own words (PrayerStep.tsx), as the
arbiter ruled for the confirm run's fail 10. None in the walks or checkMock.

**Parts 3 to 5:** 91 files, 1,300 tests, all pass. **The web build:** passes,
6,525 pages.

**What follows** (the arbiter, 02:14 UTC): a targeted re-check by a fresh
Admin chat (`docs/handoffs/admin.md`), cut only on the arbiter's word once
every fix has landed.
