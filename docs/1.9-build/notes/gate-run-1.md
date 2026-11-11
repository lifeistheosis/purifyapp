# The pre-build gate, first run (2026-11-11)

The gate is CLAUDE.md's "No test build reaches him until it passes the
pre-build gate" and `notes/build-93.md`, "The pre-build gate". This is its
first run, by the Admin chat, of the parts it builds: 2 (the guardrail walk)
and 4 (the words). Part 1, the tap walk, is next. Parts 3, 5 and 6 are other
chats' and the arbiter's.

**The export:** `npm run build:android` of `a596d963a` (built 02:47 to 02:49
UTC), walked on a phone (390 by 844, touch, dark), every route once (125
screens), online: the app read the main web as a reader's phone does (GET
only), so the pictures it streams arrived. `NODE_USE_ENV_PROXY=1 node
scripts/guardrail-walk.mjs --workers 3 --online`.

**Result:** 95 of 125 screens pass every rule. 30 do not. Nothing failed to
load. Who has each is the arbiter's to name; the file that draws it is given.

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

- Part 1, the tap walk (Admin): next.
- Part 3, no saint or work without a picture (Updates 2, the December chat).
- Part 5, every walk note with its own test (each chat; the arbiter reads).
- Part 6, the fresh-eyes Fable walk (his yes first).
