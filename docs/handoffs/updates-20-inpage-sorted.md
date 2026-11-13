# Gate 2.0, "In the page": cuts and jumps sorted under the owner's ruling

Source: `docs/1.9-build/notes/gate-2/run-tip.md` (the run on `70043ef22`), "In the page: cut (60)" from line 972 (findings 242 to 301) and "In the page: jump (94)" from line 1215 (findings 302 to 395). The file's counts match the headings: 60 and 94.

The ruling (2026-11-13): an in-page change that moves content (a tab, a pager's Next, a question or an answer opening, a card dismissed, a section expanding, a "more" that reveals rows) moves as a page switch does, so a cut or a jump there is a FAULT. A filter or a count may change at once (a filter chip, a count, a radio in Settings, a toggle that only changes a value or a label, the chants' filters): ALLOWED. A sheet, a menu or a full-screen layer opening is OTHER.

Each line: screen | control | kind | size or detail | line in run-tip.md | readers ("both" = both readers, in one finding or two merged). Controls were read in the code (read only) and, where unclear, in the finding's still in `gate-2/tip/`.

## Counts

| | cuts | jumps | lines after merging the two readers |
|---|---|---|---|
| FAULT | 36 | 38 | 73 (364 and 365 merged) |
| ALLOWED | 24 | 48 | 68 (320/321, 328/329, 336/337, 351/352 merged) |
| OTHER | 0 | 6 | 6 |
| UNSURE | 0 | 2 | 2 |
| total | 60 | 94 | 149 |

Likely mended since the run: none. No baton (Updates 13, 14, 18) names an in-page control or its exact cause as done. Updates 18's walk on `823d24e0` still saw Today's Dismiss, "For today's saints · 2 more" and a plan's "Mark day N as read"; Updates 18 lists the gift's "Try again" (run-tip 384) as open.

## FAULT

### /calendar/ (11, all jumps)
Choosing a day is read as a tab: the house already fades the chosen day's panel in; what fails is its fast row landing 56px sideways a frame later (the new day's row has no fast icon). The chevron turns the month: a pager.
- /calendar/ | a "Monday, November 2" (a day in the grid) | jump | the chosen day's "No fast" row 56px sideways (77,654 to 21,654) at 119ms | L1233 | both
- /calendar/ | a "Monday, November 9" | jump | the same row 56px sideways at 191ms | L1237 | both
- /calendar/ | a "October 2026" (the month's back chevron: the month turns) | jump | the same row 56px sideways at 185ms | L1241 | both
- /calendar/ | a "Saturday, November 14, Feast" | jump | 56px sideways at 144ms | L1249 | both
- /calendar/ | a "Saturday, November 7" | jump | 56px sideways at 128ms | L1253 | both
- /calendar/ | a "Sunday, November 1" | jump | 56px sideways at 144ms | L1257 | both
- /calendar/ | a "Sunday, November 8, Feast" | jump | 56px sideways at 163ms | L1261 | both
- /calendar/ | a "Thursday, November 12" | jump | 56px sideways at 126ms | L1265 | both
- /calendar/ | a "Thursday, November 5" | jump | 56px sideways at 124ms | L1269 | both
- /calendar/ | a "Tuesday, November 10" | jump | 56px sideways at 144ms | L1273 | both
- /calendar/ | a "Tuesday, November 3, Feast" | jump | 56px sideways at 113ms | L1277 | both

### /community/ (9: 5 cuts, 4 jumps)
The replies open in place under their post (aria-expanded), and "Read more" unfolds a post: sections expanding.
- /community/ | button "0 replies" | cut | 100% of the change in one frame at 110ms | L1006 | both
- /community/ | button "1 reply" | cut | 98% at 114ms | L1010 | both
- /community/ | button "2 replies" | cut | 52% at 128ms | L1030 | both
- /community/ | button "4 replies" | cut | 52% at 118ms | L1034 | open
- /community/ | button "Read more" | cut | 57% at 132ms | L1114 | both
- /community/ | button "0 replies" | jump | the next post (ANNOUNCEMENT) 29px down at 161ms | L1281 | both
- /community/ | button "1 reply" | jump | the next post 127px down at 1024ms, as the replies arrive | L1285 | both
- /community/ | button "2 replies" | jump | the next post 215px down at 102ms | L1309 | both
- /community/ | button "4 replies" | jump | the next post (FEAST DAY) 315px down at 182ms | L1329 | both

### /faq/ (9, all cuts)
Questions opening.
- /faq/ | summary "How do I install this on my phone, and h..." | cut | 52% at 102ms | L1178 | both
- /faq/ | summary "Is this Orthodox?" | cut | 100% at 105ms | L1182 | both
- /faq/ | summary "The fasting rule on the calendar looks d..." | cut | 51% at 101ms | L1186 | both
- /faq/ | summary "What is Today's Catechism?" | cut | 53% at 114ms | L1190 | open
- /faq/ | summary "Where are the Russian saints?" | cut | 60% at 102ms | L1194 | open
- /faq/ | summary "Where did the daily prayer texts come fr..." | cut | 50% at 136ms | L1198 | both
- /faq/ | summary "Which Bible do you use, and why?" | cut | 50% at 100ms | L1202 | open
- /faq/ | summary "Which jurisdiction is this aligned with?" | cut | 55% at 116ms | L1206 | open
- /faq/ | summary "Why use the King James for the New Testa..." | cut | 52% at 106ms | L1210 | both

### /plans/acts/ (5, all jumps)
Named by the arbiter among the in-page faults under his ruling (NOW, Updates 20's row).
- /plans/acts/ | button "Mark day 1 as read" | jump | the days section 41px down at 116ms | L1473 | open | not mended: still in Updates 18's walk on 823d24e0
- /plans/acts/ | button "Mark day 2 as read" | jump | "1 Acts 1 Today" 42px down at 82ms | L1477 | open | same
- /plans/acts/ | button "Mark day 3 as read" | jump | 42px down at 217ms | L1481 | open | same
- /plans/acts/ | button "Mark day 4 as read" | jump | 42px down at 94ms | L1485 | open | same
- /plans/acts/ | button "Mark day 5 as read" | jump | 42px down at 100ms | L1489 | open | same

### /history/alaska-mission/ (4, all cuts)
The parts row: the record put these to him as "the history tabs". In the code they are links that scroll the page to the part at once (`components/history/EventPartsNav.tsx`, `go()`: `window.scrollTo` with no behavior); the house glides such scrolls with `scrollBehavior()` (`lib/ui/motion.ts`). `adc34c78`/`6fa528bb` changed this row for the layers, not this.
- /history/alaska-mission/ | a "Meaning" | cut | 87% at 160ms | L990 | both
- /history/alaska-mission/ | a "People" | cut | 80% at 112ms | L994 | both
- /history/alaska-mission/ | a "Sources" | cut | 85% at 110ms | L998 | both
- /history/alaska-mission/ | a "Story" | cut | 99% at 102ms | L1002 | both

### /theology/comma-johanneum/read/ (4, all cuts)
The study reader's pager.
- /theology/comma-johanneum/read/ | button "Next" (data-reader-next) | cut | 94% at 177ms | L1094 | both
- /theology/comma-johanneum/read/ | button "Part 2 of 4: The Codex Fuldensis preface" | cut | 98% at 120ms | L1102 | both
- /theology/comma-johanneum/read/ | button "Part 3 of 4: The Council of Carthage, 48" | cut | 97% at 136ms | L1106 | both
- /theology/comma-johanneum/read/ | button "Part 4 of 4: The Latin Fathers" | cut | 97% at 183ms | L1110 | both

### /start/first-liturgy/ (4: 2 cuts, 2 jumps)
The guide's first answer opens its next step (`components/start/liturgy/GuideSteps.tsx`, StepIntro): a pager.
- /start/first-liturgy/ | button "Not yet, just reading" | cut | 100% at 110ms | L1098 | both
- /start/first-liturgy/ | button "Yes, I am going" | cut | 100% at 120ms | L1154 | both
- /start/first-liturgy/ | button "Not yet, just reading" | jump | "Which kind of church is it?" 77px down at 91ms | L1501 | both
- /start/first-liturgy/ | button "Yes, I am going" | jump | the same 77px at 100ms | L1561 | both

### /prayers/ (4, all jumps)
The prayer book's chapters open one at a time. By design the chapter above shuts at once so the tapped one stays under the finger (header of `components/prayers/PrayerBookContents.tsx`); a mend keeps that.
- /prayers/ | button "I The daily rule" | jump | chapter II 90px up at 204ms | L1441 | both
- /prayers/ | button "II Before & after daily life Upon waking" | jump | chapter III 321px up at 88ms | L1445 | both
- /prayers/ | button "III The Church year The Prayer of St. Ep..." | jump | chapter II 278px up at 84ms | L1449 | both
- /prayers/ | button "IV Devotional The Jesus Prayer, Psalm 50" | jump | chapter II 278px up at 119ms | L1453 | both

### / (Today; also seen on /signout/) (3: 1 cut, 2 jumps)
A card dismissed; a "more" that reveals rows.
- / | button "Dismiss" (a road card, RoadCards.tsx) | cut | 100% at 125ms | L986 | both | not mended: still in Updates 18's walk on 823d24e0
- / | button "Dismiss" | jump | the verse of the day 178px up at 104ms | L1225 | both | same
- / | button "For today's saints · 2 more" (ChurchTodayRail.tsx) | jump | "Read all 4 Listen" 27px down at 117ms | L1229 | both | same

### /plan/ and /premium/ (2, cuts)
Anchors to #plus and #pro: the page scrolls to the plans at once (the same mechanism as Alaska's parts row).
- /plan/ /premium/ | a "See Purify Plus" | cut | 100% at 160ms | L974 | both
- /plan/ /premium/ | a "See Purify Pro" | cut | 100% at 153ms | L978 | both

### /florilegium/ (also /florilegium/gathering/) (2: 1 cut, 1 jump)
The row gives way to the naming form in place (FlorilegiaHub.tsx): a section opening.
- /florilegium/ | button "Begin a new gathering" | cut | 100% at 111ms | L982 | open
- /florilegium/ | button "Begin a new gathering" | jump | "Begin with a gathering" 103px down at 93ms | L1221 | open

### /pricing/ (2: 1 cut, 1 jump)
Try it turns the page into the feature's own screen in place (components/billing/PlusTry.tsx); its preview replaces its skeleton at once.
- /pricing/ | button "Try it" | cut | 54% at 431ms | L1146 | new
- /pricing/ | button "Try it" | jump | "Purify Plus and Pro are tied to your account" 121px down at 402ms | L1549 | new

### /bible/1-chronicles/1/ (2: 1 cut, 1 jump)
- /bible/1-chronicles/1/ | summary "Before you read" | cut | 99% at 105ms | L1174 | both
- /bible/1-chronicles/1/ | summary "Before you read" | jump | the chapter's article 234px down at 84ms | L1581 | both

### /whats-new/ (2, jumps)
- /whats-new/ | summary "November 1 update" | jump | "July 19 updates" 187px up at 141ms | L1585 | both
- /whats-new/ | summary "September 1 update" | jump | "June 14 updates" 145px down at 80ms | L1589 | both

### The legal texts' Contents row (3 screens, 1 each, cuts)
Folded "Contents" opening its list in place (components/legal/LegalContents.tsx, aria-expanded).
- /privacy/ | button "Contents 12" | cut | 61% at 125ms | L1066 | both
- /terms/ | button "Contents 17" | cut | 59% at 115ms | L1070 | open
- /shop/policies/ | button "Contents 8" | cut | 58% at 103ms | L1074 | both

### /settings/ (1 line, 2 findings, jump)
c28 is the Councils palette's goal tile (aria-expanded, components/settings/ReadingModePages.tsx), not a palette pick: its line "Read every council's page to the end to earn Councils..." opens under the row (seen in both stills). A disclosure, not a Settings radio.
- /settings/ | button "John Chapter 1 1In the beginning was the" (c28) | jump | what is below 47px down at 90ms (open: the Reader font row) and 83ms (new: the Candlelight at Vespers row) | L1465, L1469 | both

### One each
- /shop/request/ | button "More details Size, kind, budget, a date," (aria-expanded) | cut | 59% at 111ms | L1090 | both
- /prayers/personal/ | button "Start from Morning prayers" (RuleHead) | cut | 76% at 132ms: the empty part fills with its rows at once | L1118 | both
- /saints/adrian-of-rome/web/ | button[tab] "Timeline" (Web and Timeline in the top bar) | cut | 91% at 187ms | L1170 | both
- /walkthroughs/job/1/ | button "Job offers sacrifices for his children a..." (Put it in order: the tapped moment joins the order above) | jump | the next choice 79px down at 88ms | L1461 | both
- /councils/ancyra-314/the-twenty-five-canons/ | button "Next: Canon I" (the reader pill's Next) | jump | the council reader 270px up at 168ms (the opening's cover goes) | L1497 | both | not marked: the same box and size as the page-switch jump `ab4adfd3` mended, but that commit names five ways in by link, and this Next is a button; a re-walk settles it
- /gift/ | button "Try again" | jump | "What Plus opens" 52px down at 94ms | L1545 | both | open: Updates 18's cause 3 list (the gift) names run-tip 384

## ALLOWED

### /saints/: the century filter (CenturyTimeline), its count line appearing above the list
- /saints/ | button "1st c., 1 saint" | cut | 51% at 118ms | L1026 | both
- /saints/ | button "1st c., 1 saint" | jump | 37px | L1305 | both
- /saints/ | button "2nd c., 6 saints" | jump | 37px | L1317 | both
- /saints/ | button "3rd c., 14 saints" | jump | 37px | L1321, L1325 | both
- /saints/ | button "4th c., 58 saints" | cut | 87% at 147ms | L1038 | both
- /saints/ | button "4th c., 58 saints" | jump | 37px | L1333 | both
- /saints/ | button "5th c., 30 saints" | cut | 90% at 141ms | L1042 | both
- /saints/ | button "5th c., 30 saints" | jump | 37px | L1337 | both
- /saints/ | button "6th c., 5 saints" | jump | 37px | L1341 | both
- /saints/ | button "7th c., 10 saints" | cut | 55% at 174ms | L1046 | open
- /saints/ | button "7th c., 10 saints" | jump | 37px | L1345 | both
- /saints/ | button "8th c., 6 saints" | cut | 53% at 127ms | L1050 | both
- /saints/ | button "8th c., 6 saints" | jump | 37px | L1349 | both
- /saints/ | button "9th c., 9 saints" | cut | 54% at 177ms | L1054 | new
- /saints/ | button "9th c., 9 saints" | jump | 37px | L1353, L1357 | both
- /saints/ | button "10th c., 2 saints" | cut | 51% at 119ms | L1014 | both
- /saints/ | button "10th c., 2 saints" | jump | 37px | L1289, L1293 | both
- /saints/ | button "11th c., 3 saints" | cut | 60% at 128ms | L1018 | both
- /saints/ | button "11th c., 3 saints" | jump | 37px | L1297 | both
- /saints/ | button "12th c., 4 saints" | cut | 53% at 140ms | L1022 | new
- /saints/ | button "12th c., 4 saints" | jump | 37px | L1301 | both

### /saints/: the kind filter chips (FilterPill, with counts)
- /saints/ | button "Apostles 21" | jump | a span 43px up | L1369 | both
- /saints/ | button "Apostolic Fathers 7" | jump | 37px | L1373 | both
- /saints/ | button "Cappadocian Fathers 3" | jump | 37px | L1381 | both
- /saints/ | button "Church Fathers 26" | jump | 37px | L1385 | both
- /saints/ | button "Desert & Monastics 57" | jump | 37px | L1401 | both
- /saints/ | button "Equals to the Apostles 5" | jump | 37px | L1405 | both
- /saints/ | button "Fathers of the Councils 31" | jump | 37px | L1413, L1417 | both
- /saints/ | button "Hierarchs 68" | jump | 37px | L1429 | both
- /saints/ | button "Holy Rulers 9" | jump | 37px | L1433 | both
- /saints/ | button "Holy Women 27" | jump | 37px | L1437 | both
- /saints/ | button "Martyrs 73" | jump | 37px | L1493 | both
- /saints/ | button "Stylites 5" | jump | 37px | L1517 | both
- /saints/ | button "The Bodiless Hosts 1" | jump | span "0" 29px | L1521 | both
- /saints/ | button "Wonderworkers 27" | jump | 37px | L1557 | both

### /chants/: the chants' filters
- /chants/ | button "Contemporary" | jump | 191px | L1393 | both
- /chants/ | button "Greek" | jump | 64px | L1425 | both
- /chants/ | button "Serbian" | jump | 63px | L1509 | both

### /settings/: First focus (FirstFocus.tsx, one answer; its "Your Day 1" line appears under the row). The arbiter's "Settings' radios (26 to 48px)": the 48px is this.
- /settings/ | button "A rule of prayer" | cut | 86% | L1058 | both
- /settings/ | button "A rule of prayer" | jump | the Reading section 48px | L1361 | both
- /settings/ | button "Church history" | cut | 85% | L1062 | both
- /settings/ | button "Church history" | jump | 48px | L1389 | both
- /settings/ | button "Daily quiet" | cut | 85% | L1078 | both
- /settings/ | button "Daily quiet" | jump | 48px | L1397 | both
- /settings/ | button "Fasts and feasts" | cut | 85% | L1082 | both
- /settings/ | button "Fasts and feasts" | jump | 48px | L1409 | both
- /settings/ | button "Study" | cut | 87% | L1122 | both
- /settings/ | button "Study" | jump | 48px | L1513 | both
- /settings/ | button "The councils" | cut | 87% | L1126 | both
- /settings/ | button "The councils" | jump | 48px | L1525 | both
- /settings/ | button "The Fathers' writings" | cut | 86% | L1130 | both
- /settings/ | button "The Fathers' writings" | jump | 48px | L1529 | both
- /settings/ | button "The Gospels" | cut | 83% | L1134 | both
- /settings/ | button "The Gospels" | jump | 48px | L1533 | both
- /settings/ | button "The Liturgy" | cut | 86% | L1138 | both
- /settings/ | button "The Liturgy" | jump | 48px | L1537 | both
- /settings/ | button "The saints' lives" | cut | 85% | L1142 | both
- /settings/ | button "The saints' lives" | jump | 48px | L1541 | both
- /settings/ | button "What the Orthodox believe" | cut | 86% | L1150 | both
- /settings/ | button "What the Orthodox believe" | jump | 48px | L1553 | both

### /settings/: Familiarity radios (button[radio])
- /settings/ | button[radio] "Completely new" | cut | 78% | L1158 | both
- /settings/ | button[radio] "Completely new" | jump | "Fasting on Today" 26px | L1565 | both
- /settings/ | button[radio] "Learning" | cut | 77% | L1162 | both
- /settings/ | button[radio] "Learning" | jump | 26px | L1569 | both
- /settings/ | button[radio] "Practicing" | cut | 80% | L1166 | both
- /settings/ | button[radio] "Practicing" | jump | 45px | L1573 | both

### Two more choices that change a value
- /calendar/ | a "Old" (the reckoning, New or Old: a two-way choice like Settings' radios) | jump | the day's fast row 27px down as its head gains the second date | L1245 | both
- /florilegium/begin/beatitudes/ | button "Keep this gathering" | cut | 100% at 106ms: the button gives way to the "In your gatherings" row in its place; nothing below moved (no jump found) | L1086 | open

## OTHER: a sheet, a menu, or not a content move

- /prayers/after-meals/ and four more prayer pages (after meals, the Theotokos akathist, evening, compline, morning) | button "Chant" | jump | the "Pray with chant" sheet itself 251px up at 257ms | L1217 | both | a sheet (aria-haspopup dialog, the chant picker, components/player/PrayWith.tsx; the still shows it rising): a sheet that jumps as it rises is in the brief's sheet scope, as the profile card's snap is
- /community/ | button "Anoubius" | jump | the profile card 240px at 891ms | L1365 | both | a sheet (ProfileViewer.tsx): cause 4's second half, open (Updates 14 item 2; Updates 18's cause 3 list)
- /community/ | button "ivan.rizevski" | jump | the profile card 116px at 1180ms | L1457 | both | the same sheet
- /community/ | button "Purify" | jump | the profile card 240px at 954ms | L1505 | both | the same sheet
- /councils/ | button "256–1672 Move through the years" | jump | a row of the atlas 25px at 1889ms | L1313 | new | a full-screen layer (MapAtlas.tsx, role dialog) moving as it plays; not the page
- /dictionary/ | button "Find a word" | jump | a word in the search's list 84px down at 381ms | L1421 | open | the search screen, a full-screen dialog (CommandPalette.tsx), laying out its list as it opens

## UNSURE

Both are a short line that a tap shows or takes away. Question that settles them: is a line that answers a tap (a hint or a warning) a label that may change at once, or content that must move?
- /shop/icons/byzantine-three-beam-wall-cross/ | button "Buy now" | jump | the foot bar 27px up as "Please agree to the Terms and shipping & refund policy first" appears under its buttons (BuyBar.tsx, startCheckout with the box unticked) | L1377 | both
- /signup/ | input (the "I agree to the Terms of Service and Privacy Policy" box, seen in the still) | jump | ticking it takes away the line "Agree to the Terms and Privacy Policy first" under Continue with Google; the lines below 27px up at 89ms | L1577 | both
