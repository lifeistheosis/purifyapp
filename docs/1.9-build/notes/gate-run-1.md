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

## Not yet run

- Part 3, no saint or work without a picture (Updates 2, the December chat).
- Part 5, every walk note with its own test (each chat; the arbiter reads).
- Part 6, the fresh-eyes Fable walk (his yes first).

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
