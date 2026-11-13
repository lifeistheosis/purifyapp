# Build 95: his walk notes

The 1.9 test build cut on 2026-11-13 from 6193982d5 after the pre-build gate passed (Android run 43374905223, build 95; iOS run 43374909047). He walks it as a new reader. Every note here gets a test that fails on the old code (the gate's part 5).

## Note 1 (withdrawn: the old build): the language list opens off the left edge

His word, 2026-11-13 07:06 UTC, with a screenshot from his Android phone (Settings, Language, the "English" picker tapped): "are we serious?"

What the screenshot shows: the list opens with its end at the picker's end and runs off the screen's left edge. Every language name is off the screen, and only the chosen row's check shows. The list lies over the rows beneath it.

The same fault was named and mended once before in 1.9 (components/i18n/LocaleMenu.tsx, the comment above its layout effect: "in Settings, with the picker after the globe, it opened off the left edge and its names could not be seen at 390px"). The gate's walks passed it, so the mend holds in the walks' browser and not on his phone. Why the gate missed it is part of this note's fix: a test that fails on the old code, and a walk that sees what he saw.

**Withdrawn, 2026-11-13 07:08 UTC.** He was walking build 93 (2026-11-10), not build 95. The arbiter had kept build 95 as a run artifact (publish off), so the release page he downloads from (android-release) still held build 93. His next two screenshots settle it: Settings' What's new with the four-point sparkle, and the Amen button, both build 93 notes mended since (What's new wears TimelineList at 6193982d5; no Amen button since 3ed50d182, build 93 note 14; the language list since 209c3ad64, all in build 95). Build 95 was published to the release page at 07:04 UTC (run 43382387529, the same app; its one native change is the email-picture prune). The arbiter's fault, not the app's: a test build is now always published to the release page, and the page's date is checked before he is told (docs/OPERATIONS.md section 5).

## Note 2 (not a fault, but not named to him beforehand): no prayer campaigns

His word, 2026-11-13 07:10 UTC, on build 96 (the page's build, the same app): "okay one thing on the new build I don't see the prayer campaigns"

As built. The app shows campaigns' doors only when the website says so (lib/campaigns/useCampaignsOpen.ts). The build talks to the main web, which runs main, where the switch says closed until the merge (lib/campaigns/flags.ts, "Release day, in order"). With no test web (his choice, 2026-11-11), the release-day order stands in: (1) the merge carries "testers", so the website answers for his account alone and the campaign SQL runs; (2) the store builds go to internal testing and he walks campaigns on his phone, signed in; (3) one line opens them to every reader, at his word, after the lawyer's and the priest's words (items 113 and 129); (4) the stores go public. CLAUDE.md says anything a test build cannot match is named to him before he walks it. This was not named: the arbiter's miss, noted here.

## Note 3: the Fast, clearly outdated

His word, 2026-11-13 07:26 UTC, on build 96, with a screenshot of the Fast ("Keep the fast, day by day"): "so 2 things, the fast and the notebook design and system needs to be refined + smoother (notebook is not really optimized + some visual and ux bugs) and the fast is clearly outdated"

The screenshot shows two bordered tiles of uneven height, each with a 0 (the left one says "fasting days kept. Begin whenever you're ready."). Then Today's card has three outlined pills (Kept, In part, Broke), and the recent days repeat the three pills on every row. It predates the approved look (2026-11-13, "yes look"). A redesign in that look, with reasons, for his yes or no.

## Note 4: the journal (his "notebook"), not optimized, with visual and UX bugs

Same words. The journal (app/(app)/journal, components/journal/) needs its bugs found and mended, and a refinement that makes it smoother, in the approved look, for his yes or no. His own screenshots of the bugs are asked for, so the ones he saw are the first fixed.

## Note 5: Discover's search opens with a visual fault, not smoothly

His word, 2026-11-13 07:28 UTC, on build 96, with a screenshot of Discover (the "Search Purify" field above the cards): "pressing the search created a weird visual bug and isn't smooth when transitioning to that acreen"

Tapping Discover's search field must open the Search sheet in the house's motion, with no glitch on the way (CLAUDE.md, "Every page switch is a transition"). To reproduce at phone size with touch and motion on, find the fault, mend it, and give it a test that fails on the old code.

## Note 6: the journal's bugs, in his words

His word, same message: "the journal bugs you were asking is that whenever you click on a different section in the journal UI the typing pad pops up automatically and it's buggy when it pops up and the overrall journal system is clunky and visuals aren't really that good. even the image system and the quoting system"

1. Choosing another section of the journal opens the keyboard by itself. It should open only when the reader taps where they write.
2. When the keyboard opens, it opens badly: the page jumps or glitches.
3. The whole journal is clunky, and its look is weak, the picture and quoting systems included. This joins note 4's refinement, for his yes.

## Note 7: the Bible's "Highlighted" toast overlaps another bar

His word, 2026-11-13 07:29 UTC, on build 96, with a screenshot of John 1:5 in the reader just after highlighting a verse: "ui overlalping"

The "Highlighted / Undo" toast stands over the tab bar, and a second floating bar shows behind it: its rounded edge and a white button peek out above the toast, under the verse. Two floating layers drawn on top of each other. One must give way: either the other bar steps aside while the toast shows, or the two stack with their own space. Reproduce at 390 with touch and motion on, mend it, and give it a test that fails on the old code.

## Note 8: the opening animation is buggy

His word, 2026-11-13 07:34 UTC, on build 96, with a screenshot of the app's opening (the starry night, the glowing cross, the bright rim of the horizon): "the animation is buggy"

To reproduce on a phone-sized export with motion on, recorded frame by frame from launch until the first screen is in place. Find the fault (a stutter, a jump, a flash, a broken hand-off to the first screen) and mend it. Animate only what a phone draws cheaply (transform and opacity, not filters or shadows), keep reduced motion still, and add a test that fails on the old code. His phone was at 3% battery when he saw it, which can mean a battery saver. The animation must hold there too.

## Note 9 (asked): hold a Discover section to move it, with haptics

His word, 2026-11-13 07:36 UTC, on build 96, with a screenshot of Discover's sections (Saints, Reading, Orthodox History, Councils, Theology, Chants, the calendar): "allow the user to hold down each section and the haptic feedback hits and they can move each section according to their wants (and every time it switches a section a haptic feedback hits)"

Asked during the release's making, so it goes into 1.9 (CLAUDE.md, "A release ships finished"). Hold a section and the card lifts, with a tick. Drag it, and the others slide aside on the house curve, with a tick at each change of place. Drop it, and the order is kept on this device. A tap still opens the section. Those who cannot drag can move a section without dragging (a move up or move down choice, for a keyboard or a screen reader). There is a way back to the first order. Reduced motion stays still. The app's haptics already exist (@capacitor/haptics, lib/ui/softTick.ts), so no new native dependency. A short clip with its reasons goes to him for his yes before it ships.

## Note 10 (a reader's ask, sent by him): edit and remove your own posts and replies

He sent, 2026-11-13 07:38 UTC, a screenshot of a reader's Discussion post in Community (two likes, no replies; the reader is not named here, since the repository is public): "Some things which should be added imo. We should have the ability to remove or edit our comments under replies and posts".

A reader's report during the release's making, so it goes into 1.9 (CLAUDE.md, "A release ships finished"). A reader can edit and remove what they wrote, posts and replies alike. An edited one says so. A removed reply leaves the thread readable. Moderation keeps what it needs to keep for reports, as the privacy lines say. Any change to the database's rules is a migration, safe to run twice, signed by him before the merge.

## Note 11 (a reader's report, sent by him): the ambient sounds "do not currently work"

He sent, 2026-11-13 07:40 UTC, a screenshot of a reader's Discussion post from 15 days ago (six likes; the reader is not named here). The reader is new, an inquirer into the Faith: "when I went to play the ambient selections, it said that they do not currently work. Has this always been the case? Is this feature that new, or could it just be a temporal bug?"

A reader's report during the release's making, so it goes into 1.9. Checked at once: all six sound files answer 200 on the main web (/audio/ambience/*.mp3), so the files are there. The sheet's own failure line (ambience.failed, components/player/AmbienceSheet.tsx) is what he met. To find why a sound fails to start on a reader's phone (the app and the website, Android and iPhone), mend it, and give it a test that fails on the old code.

## Note 12: the badges move when one is chosen

His word, 2026-11-13 07:43 UTC, on build 96, with two screenshots of a profile sheet's Badges (Verified chosen, then Bug Hunter): "badge UI moving"

What the two show: the chosen badge's card at the foot changes height, two lines for Verified and three for Bug Hunter ("Found a real bug and told us. Since October 2026"), so what stands below it moves. Under Bug Hunter's card a light grey pill also appears with no words readable on it: a button whose label cannot be seen, or a placeholder. Choosing a badge must not move the sheet. The card keeps one height, or changes it in the house's motion with nothing jumping, and every control shows its words at 4.5:1. To reproduce at 390 with touch and motion on, mend it, and give it a test that fails on the old code.

## Note 13: the profile, even smoother

His word, 2026-11-13 07:44 UTC, on build 96, with a screenshot of a reader's profile sheet (About, Badges and Posts as three boxed tabs; About me; Member since): "make the profile system even smoother"

With note 12, in the same sheet. Switching tabs moves in the house's motion, the old content handing to the new with no jump. The sheet's height follows its content smoothly, never snapping. Dragging the sheet down follows the finger and lets go cleanly. Pictures and words arrive without a flash. Reduced motion stays still. Any change to how the sheet looks (the tabs' form, for one) comes to him as stills with reasons, for his yes, before it ships.

## Note 14: coming back to the app, the screen moves

His word, 2026-11-13 about 07:46 UTC, on build 96: "whenever I ran out of purify and tab back in there's always a UI moving issue. for example. when my keyboard is open on another app and I switch into purify the UI shows up weird then it fixes itself"

Every return to Purify from another app shows the page out of place for a moment before it settles; "always", so the keyboard is his example and not the only case. With the keyboard up in another app, the screen Purify shows on return is laid out wrong, then corrects itself.

Done is: a return shows the page exactly as it was left, with nothing moving after the first frame, on Android and iPhone, with and without another app's keyboard, on every main screen and with a sheet open. Purify's own keyboard, opened by one of Purify's fields, still moves what it should.

Leads to read, not conclusions: the handlers that run on every return (`components/native/statusBar.ts`, lookSoon; `components/theme/AppThemeController.tsx`, apply; `components/native/NativeBridge.tsx`, refreshNativeIfMoved), the keyboard frame in `lib/ui/viewport.ts`, and how the Android activity takes another app's keyboard (no `windowSoftInputMode` in the manifest, no Keyboard settings in `capacitor.config.ts`). The walks run Chromium, so the test stands in for the return (the page hidden while its window shrinks, then shown at full size) and the report names what only a phone can prove.

With Updates 7.

## Note 15 (asked): share every work

His word, 2026-11-13 about 07:50 UTC, with two screenshots of The Paschal Homily's sheets: the cover's sheet (About this book alone) and the reading sheet (Reader settings, Bookmark this section, About this book, Search Purify): "allow every single work to be sharable by adding a share button here and here"

Done is:
- A Share row in both sheets, on every work in the library, and in every reader that opens on the same cover and sheet.
- It opens the phone's share sheet (and copies the link where there is none) with the work's title and a clean link to the work on purifyapp.net: never `https://localhost` (`shareCurrentLink` in `lib/site.ts`, as `components/ui/ShareButton.tsx` does), and nothing about the reader in it. From the reading sheet the link opens at the section being read, if the website can.
- The link's preview shows the work's title and picture (the page's metadata).
- A work new in 1.9 has no page on the main web until the merge, so its link, shared from the test build, opens to nothing until then. Named to him before he walks.
- Drawn with the sheet's own row and the `Share` icon from `components/ui/icons`, existing i18n keys first, in every locale, mirrored in Arabic.
- His first screenshot shows a rule under About this book with nothing after it: if it is a divider before an empty group, it goes.
- Stills of both sheets, with one line of reason per choice, to him for his yes before it ships.

With Updates 8.

## Note 16 (asked): the sea theme goes, and the Holy Mountain is reworked or goes

His word, 2026-11-13 about 07:52 UTC: "remove the sea theme from the app and the mountain either needs a rework or it gets removed"

The themes are the reading modes of `lib/reader/readingModes.ts`, a Plus feature ("Nineteen reading modes, from Candlelight to the Holy Mountain"). The mountain is Holy Mountain (`athos`, "The peak of Athos over the sea at dusk"). Two of the Land and sea family show the sea, Galilee ("The sea by night, and the light lying on the water") and Patmos ("A white wall, and the sea beyond it"), so the arbiter asked him which he means, and whether Fable reworks the mountain (a Fable run is checked with him first, CLAUDE.md).

His answers, 2026-11-13 about 07:54 UTC, to the arbiter's two questions: which sea theme, "Both" (Galilee and Patmos go); and the Holy Mountain, "Fable reworks it" (one version, as stills with reasons; his no removes it).

The looks are new in 1.9 (readers have not had them), and Fire (2026-11-10) is the way a look comes out: `RETIRED_THEMES` in `lib/reader/readingModes.ts` and `PREPAINT_RETIRED` in `lib/reader/prepaint.ts` send a stored look to its nearest kept one, and its picture is kept in `docs/1.9-build/kept/`, never deleted. The counts readers see ("Nineteen reading modes" in three lines, every locale) follow the code. Galilee and Patmos: with Updates 9. The Holy Mountain's rework: with Fable 5.2, the Holy Mountain.

His word on the whole family, 2026-11-13 about 07:57 UTC, sent with note 17: "also honest in. the land and sea all the colors are nice it's just the designs at the bottom that dont look good and darker colors usually fits purify well (but the flowers fit the light themes)"

So the fault in the Land and sea family is the picture at the foot of the screen (the scenes in `public/themes/`), not the colours, which he likes. The Fable chat's job became the foot pictures of the four land looks that stay (Holy Mountain, Forest, Desert, Jordan): for each, one reworked picture or none, with the reason, and an honest word on whether the two light ones (Desert, Jordan) belong, since in his words the darker colours suit Purify and the flowers suit the light looks. His yes or no for each. Galilee and Patmos still come out, as he answered.

## Note 17 (asked): the patron saint chooser, reworked

His word, 2026-11-13 about 07:57 UTC, with a screenshot of Settings, The calendar, Patron saint, open: "patron saint chooser design needs a rework"

The screenshot: the chooser is the generic searchable dropdown (`components/ui/SearchSelect.tsx` through `components/profile/PatronSaintPicker.tsx`). A "Search by name" field over a long list of bare names, opened over the Language section and running to the foot of the screen, with the page's own words showing under its last row. The apostles all stand under H, as "Holy Apostle ...", not under their own names. No pictures.

Done is: one chooser, wherever a patron is chosen (Settings, the profile tab, the account's data page), drawn from the app's own pieces (the house sheet, the saints' own rows with their pictures), found and sorted by each saint's own name, whole on the screen with the keyboard up, Back closing it. Stills with reasons for his yes before it ships. With Updates 10.

## Notes 18 and 19 (asked): the reading mode chooser as a scroller; Settings' words, clean and clear

His word, 2026-11-13 about 07:59 UTC, with three screenshots of Settings: Reading ("These apply everywhere, not only in the Bible and the Fathers.") with the Reading mode cards wrapped in rows (Dark, Light, True black, Candlelight, Monastery, Holy Mountain, then Councils "0 of 19" and Cappadocian "0 of 3"); "Candlelight at Vespers" ("On by itself at sunset, when the Church's day begins, and off in the morning") and "Candlelight keeps the season" ("Its soft light takes the colour of the Church's long fasts, violet or deep blue"); "Show my supporter mark" ("A small cross beside your name in the community while your Plus or Pro subscription is active. It tells other readers which you hold; turn it off to keep that to yourself."):

"reading mode chooser here should be a clean scroller with haptic feedback rather than stacks. also I noted in the settings there is alot of overexplaning and ambiguity also with the title names. make it clean clear and simplified."

Note 18, done is: one clean row of the modes that scrolls sideways and settles one card at a time, a light haptic tick as each card arrives (`lib/ui/scrollTicks.ts`, `lib/ui/softTick.ts`), the chosen one in view on open, the earned and Plus ones in the same row with their state, mirrored in Arabic, still under reduced motion. Stills and a short screen recording from the export, with reasons, for his yes.

Note 19, done is: every title and line in Settings says plainly what the control is, a line only where the title cannot say it alone, one short sentence, nothing untrue about Plus, Pro or what is free. A table of every title and line, before and after, for his yes; then every locale carries the new words. With Updates 11.
