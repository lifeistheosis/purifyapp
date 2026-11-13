# Gate 2.0: the run over the branch tip, motion on, both readers

Every finding of the motion walk on `70043ef22` (the branch tip at 10:45 UTC, 2026-11-13), cut with the store workflow's own switches (`scripts/gate/export.mjs`, 6,473 pages), at 390 by 844, each reader in its own lane with two workers, reading the main web: the new reader (selling, the Android shell's stand-in) 10:49 to 12:01 UTC, the open reader 10:51 to 12:02 UTC. Merged across the two readers: each finding once, with who saw it, the screens it was seen on, its files and one still (in `tip/`, the frames side by side: the frame before, the moment, and after). Grouped by cause in `../gate-2.md`, "The run over the 128 screens".

A page switch is a tap that changed the address, or the switch into a screen from the front door. "In the page" is every other tap: a question opening, a tab, a filter, a choice, a sheet rising; the brief's transitions check covers page switches and sheets, and the rest is listed for a ruling.

Totals: new reader: 128 screens, 1373 taps, 412 findings, 2 unsure, 0 screens not walked, 0 controls in error; for the eye 137 slow answers, 649 dips; open reader: 128 screens, 1365 taps, 430 findings, 0 unsure, 0 screens not walked, 0 controls in error; for the eye 140 slow answers, 647 dips.
For the eye, not failed: 21 crossings of two layers in passing.

### Layers that meet (3)

1. tap a "1 of 9 The Holy Trinity" (went to /theology/path/trinity/): div[data-mobile-topbar=true][data-screen-edge=top][data-overlay] "The Holy Trinity" meets div[data-step-room]: 373 by 46px at 9,2 (button "Back" drawn over span)
   - seen by: new reader, open reader; on 4 screens: /theology/ /theology/comma-johanneum/ /theology/doctrine/ /theology/path/christ/
   - file: components/nav/MobileTopBar.tsx | app/(app)/theology/path/[subject]/page.tsx
   - still: `001-theology-c2-layers-0.jpg`
2. at rest: div[data-mobile-topbar=true][data-screen-edge=top][data-overlay] "Christ, God made man" meets div[data-step-room]: 390 by 51px at 0,0 (div[data-mobile-topbar=true][data-screen-edge=top][data-overlay] "Christ, God made man" drawn over span)
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: components/nav/MobileTopBar.tsx | app/(app)/theology/path/[subject]/page.tsx
   - still: `002-theology_path_christ-rest422-layers-0.jpg`
3. at rest: nav[data-event-parts=true] "Parts of this account" meets div[data-thread-map] "Kodiak": 348 by 65px at 21,60 (div[data-thread-map] "Kodiak" drawn over nav[data-event-parts=true] "Parts of this account")
   - seen by: open reader; on 1 screen: /history/alaska-mission/
   - file: components/history/EventPartsNav.tsx | components/history/EventThread.tsx
   - still: `003-history_alaska-mission-rest4796-layers-0.jpg`

### The page's edge (2)

4. tap a "IV 451 The Council of Chalcedon One and " (went to /councils/chalcedon/): span "The Estrangement of the Non-Chalcedonian": words, cut at the right edge by 16px
   - seen by: new reader, open reader; on 7 screens: /councils/ /heresies/apollinarianism/ /history/alaska-mission/ /theology/ /theology/comma-johanneum/ /theology/doctrine/ ...
   - file: in components/layout/AppFrame.tsx, app/page.tsx (its box carries data-route-content)
   - still: `004-councils-c5-edge-0.jpg`
   - note: Withdrawn: the measure's fault. The title is cut to one line by its own box with an ellipsis (Tailwind's truncate); the edge check now clips words by their own box first (scripts/gate/inpage.mjs, self-test case added).
5. tap a "1782 Philokalia" (went to /history/philokalia-published/): p "Paisius born at Poltava in 1722, monk on": words, cut at the right edge by 846px
   - seen by: new reader, open reader; on 1 screen: /history/alaska-mission/
   - file: in components/layout/AppFrame.tsx, app/page.tsx (its box carries data-route-content)
   - still: `005-history_alaska-mission-c12-edge-0.jpg`

### Page switches: blank (135)

6. the page switch from /: 22 frames with nothing drawn where the screen changes (at most 3% of it inked, 7% of the screen before and after together) for 381ms, from 219ms after the tap
   - seen by: new reader, open reader; on 24 screens: /account/data/ /account/eikon-box/ /account/notifications/ /account/profile/ /account/profile/edit/ /account/security/ ...
   - file: lands on app/(app)/account/(signed)/data/page.tsx
   - still: `006-account_data-arrival-blank-0.jpg` (frames at 194ms, 583ms, 600ms, 1126ms after the tap)
7. tap a "Apologetics Defense · 3" (went to /apologetics/): 17 frames with nothing drawn where the screen changes (at most 5% of it inked, 25% of the screen before and after together) for 344ms, from 250ms after the tap
   - seen by: new reader, open reader; on 4 screens: /heresies/ /theology/ /theology/doctrine/ /topics/
   - file: lands on app/(app)/apologetics/page.tsx; the control: in components/theology/WayPage.tsx (its box carries data-way-rest)
   - still: `007-heresies-c26-blank-0.jpg` (frames at 244ms, 420ms, 594ms, 1010ms after the tap)
8. tap a "Doctrine Treatise · 14" (went to /theology/doctrine/): 18 frames with nothing drawn where the screen changes (at most 4% of it inked, 18% of the screen before and after together) for 354ms, from 301ms after the tap
   - seen by: new reader, open reader; on 4 screens: /apologetics/ /heresies/ /theology/ /topics/
   - file: lands on app/(app)/theology/doctrine/page.tsx; the control: in components/theology/WayPage.tsx (its box carries data-way-rest)
   - still: `008-apologetics-c5-blank-0.jpg` (frames at 284ms, 460ms, 656ms, 1201ms after the tap)
9. tap a "Topics Reference · 5" (went to /topics/): 10 frames with nothing drawn where the screen changes (at most 2% of it inked, 19% of the screen before and after together) for 427ms, from 387ms after the tap
   - seen by: new reader, open reader; on 4 screens: /apologetics/ /heresies/ /theology/ /theology/doctrine/
   - file: lands on app/(app)/topics/page.tsx; the control: in components/theology/WayPage.tsx (its box carries data-way-rest)
   - still: `009-apologetics-c6-blank-0.jpg` (frames at 358ms, 540ms, 815ms, 1062ms after the tap)
10. tap a "Christ Flag, Greek" (went to /shop/icons/detail/): 64 frames with nothing drawn where the screen changes (at most 0% of it inked, 3% of the screen before and after together) for 1275ms, from 304ms after the tap
   - seen by: new reader, open reader; on 3 screens: /shop/ /shop/category/all/ /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `010-shop-c17-blank-1.jpg` (frames at 277ms, 922ms, 1579ms, 1979ms after the tap)
11. tap a "Heresies Dossier · 21" (went to /heresies/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 23% of the screen before and after together) for 342ms, from 267ms after the tap
   - seen by: new reader, open reader; on 3 screens: /apologetics/ /theology/doctrine/ /topics/
   - file: lands on app/(app)/heresies/page.tsx; the control: in components/theology/WayPage.tsx (its box carries data-way-rest)
   - still: `011-apologetics-c7-blank-0.jpg` (frames at 257ms, 409ms, 609ms, 1223ms after the tap)
12. tap a "Orthodox Cross Beanie" (went to /shop/icons/detail/): 67 frames with nothing drawn where the screen changes (at most 0% of it inked, 2% of the screen before and after together) for 1250ms, from 214ms after the tap
   - seen by: new reader, open reader; on 3 screens: /shop/ /shop/category/all/ /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `012-shop-c20-blank-0.jpg` (frames at 192ms, 789ms, 1463ms, 1988ms after the tap)
13. tap a "Virgin of Vladimir Icon With Hand Carved" (went to /shop/icons/detail/): 72 frames with nothing drawn where the screen changes (at most 0% of it inked, 4% of the screen before and after together) for 1227ms, from 271ms after the tap
   - seen by: new reader, open reader; on 3 screens: /shop/ /shop/category/all/ /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `013-shop-c8-blank-0.jpg` (frames at 247ms, 877ms, 1498ms, 1820ms after the tap)
14. tap a "Christ Flag, Russian" (went to /shop/icons/detail/): 70 frames with nothing drawn where the screen changes (at most 0% of it inked, 4% of the screen before and after together) for 1317ms, from 257ms after the tap
   - seen by: new reader, open reader; on 2 screens: /shop/ /shop/category/all/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `014-shop-c11-blank-0.jpg` (frames at 237ms, 896ms, 1574ms, 1940ms after the tap)
15. tap a "Discover" (went to /discover/): 16 frames with nothing drawn where the screen changes (at most 2% of it inked, 7% of the screen before and after together) for 272ms, from 444ms after the tap
   - seen by: new reader, open reader; on 2 screens: /about/ /account/
   - file: lands on app/(app)/discover/page.tsx; the control: in components/nav/MobileTabBar.tsx (its box carries data-tab-bar)
   - still: `015-about-c8-blank-0.jpg` (frames at 412ms, 444ms, 716ms, 1024ms after the tap)
16. tap a "Eastern Orthodox Ring" (went to /shop/icons/detail/): 66 frames with nothing drawn where the screen changes (at most 0% of it inked, 4% of the screen before and after together) for 1200ms, from 285ms after the tap
   - seen by: new reader, open reader; on 2 screens: /shop/ /shop/category/all/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `016-shop-c14-blank-0.jpg` (frames at 262ms, 944ms, 1484ms, 1911ms after the tap)
17. tap a "St. Gregory the Great, Morals on the Boo" (went to /saints/gregory-the-dialogist/morals-on-the-book-of-job/): 46 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 1405ms, from 278ms after the tap
   - seen by: new reader, open reader; on 2 screens: /fathers-on/anger/ /reading/collections/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `017-fathers-on_anger-c4-blank-0.jpg` (frames at 272ms, 306ms, 1683ms, 2905ms after the tap)
18. tap a "St. John Cassian, The Institutes, Book 8" (went to /saints/john-cassian/institutes/): 27 frames with nothing drawn where the screen changes (at most 5% of it inked, 27% of the screen before and after together) for 469ms, from 295ms after the tap
   - seen by: new reader, open reader; on 2 screens: /fathers-on/anger/ /reading/collections/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `018-fathers-on_anger-c2-blank-0.jpg` (frames at 272ms, 318ms, 764ms, 1281ms after the tap)
19. tap a "St. John Chrysostom, The Paschal Homily" (went to /saints/john-chrysostom/paschal-homily/): 30 frames with nothing drawn where the screen changes (at most 4% of it inked, 12% of the screen before and after together) for 527ms, from 323ms after the tap
   - seen by: new reader, open reader; on 2 screens: / /signout/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `019-home-c19-blank-0.jpg` (frames at 303ms, 323ms, 850ms, 1292ms after the tap)
20. tap a "⇤ 2 Kings" (went to /bible/2-kings/1/): 14 frames with nothing drawn where the screen changes (at most 6% of it inked, 20% of the screen before and after together) for 289ms, from 536ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `020-bible_1-chronicles_1-c11-blank-0.jpg` (frames at 502ms, 536ms, 825ms, 1401ms after the tap)
21. tap a "1 Chronicles 29 ch" (went to /bible/1-chronicles/1/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 19% of the screen before and after together) for 244ms, from 374ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `021-bible-c19-blank-0.jpg` (frames at 366ms, 389ms, 619ms, 1492ms after the tap)
22. tap a "1 Esdras 9 ch" (went to /bible/1-esdras/1/): 15 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 248ms, from 604ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `022-bible-c21-blank-0.jpg` (frames at 589ms, 625ms, 852ms, 1561ms after the tap)
23. tap a "1 John 5:7 The Comma itself, in its Trin" (went to /bible/): 16 frames with nothing drawn where the screen changes (at most 3% of it inked, 6% of the screen before and after together) for 262ms, from 568ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/theology/TopicReader.tsx (its box carries data-study-scripture)
   - still: `023-theology_comma-johanneum-c8-blank-0.jpg` (frames at 552ms, 568ms, 830ms, 1240ms after the tap)
24. tap a "1 John 5:8 The earthly witnesses, water," (went to /bible/): 13 frames with nothing drawn where the screen changes (at most 3% of it inked, 8% of the screen before and after together) for 272ms, from 367ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/theology/TopicReader.tsx (its box carries data-study-scripture)
   - still: `024-theology_comma-johanneum-c9-blank-0.jpg` (frames at 350ms, 367ms, 639ms, 1044ms after the tap)
25. tap a "1 Kings 22 ch" (went to /bible/1-kings/1/): 15 frames with nothing drawn where the screen changes (at most 2% of it inked, 19% of the screen before and after together) for 261ms, from 394ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `025-bible-c17-blank-0.jpg` (frames at 384ms, 420ms, 655ms, 1372ms after the tap)
26. tap a "1 Maccabees 16 ch" (went to /bible/1-maccabees/1/): 12 frames with nothing drawn where the screen changes (at most 3% of it inked, 2% of the screen before and after together) for 257ms, from 361ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `026-bible-c27-blank-0.jpg` (frames at 347ms, 361ms, 619ms, 1502ms after the tap)
27. tap a "1 Samuel 31 ch" (went to /bible/1-samuel/1/): 13 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 253ms, from 442ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `027-bible-c15-blank-0.jpg` (frames at 424ms, 463ms, 695ms, 1400ms after the tap)
28. tap a "2 Chronicles ⇥" (went to /bible/2-chronicles/1/): 15 frames with nothing drawn where the screen changes (at most 5% of it inked, 5% of the screen before and after together) for 240ms, from 450ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `028-bible_1-chronicles_1-c12-blank-0.jpg` (frames at 435ms, 450ms, 690ms, 1402ms after the tap)
29. tap a "2 Chronicles 36 ch" (went to /bible/2-chronicles/1/): 15 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 251ms, from 329ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `029-bible-c20-blank-0.jpg` (frames at 312ms, 348ms, 580ms, 1288ms after the tap)
30. tap a "2 Kings 25 ch" (went to /bible/2-kings/1/): 12 frames with nothing drawn where the screen changes (at most 2% of it inked, 19% of the screen before and after together) for 231ms, from 394ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `030-bible-c18-blank-0.jpg` (frames at 352ms, 423ms, 626ms, 1346ms after the tap)
31. tap a "2 Maccabees 15 ch" (went to /bible/2-maccabees/1/): 8 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 316ms, from 389ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `031-bible-c28-blank-0.jpg` (frames at 351ms, 407ms, 705ms, 1377ms after the tap)
32. tap a "2 Samuel 24 ch" (went to /bible/2-samuel/1/): 14 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 239ms, from 394ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `032-bible-c16-blank-0.jpg` (frames at 378ms, 431ms, 633ms, 1394ms after the tap)
33. tap a "3 Maccabees 7 ch" (went to /bible/3-maccabees/1/): 13 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 213ms, from 332ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `033-bible-c29-blank-0.jpg` (frames at 317ms, 343ms, 544ms, 1178ms after the tap)
34. tap a "Acts 17:27-28 He is not far from every o" (went to /bible/): 10 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 275ms, from 429ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `034-apologetics_atheism-c15-blank-0.jpg` (frames at 407ms, 447ms, 704ms, 1093ms after the tap)
35. tap a "An Exact Exposition of the Orthodox Fait" (went to /saints/john-of-damascus/exact-exposition-of-the-orthodox-faith/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 3% of the screen before and after together) for 326ms, from 300ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/paths/nativity/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/PathView.tsx (its box carries data-path-day)
   - still: `035-reading_paths_nativity-c7-blank-0.jpg` (frames at 268ms, 300ms, 627ms, 1237ms after the tap)
36. tap a "Apollinarianism 4th century" (went to /heresies/apollinarianism/): 19 frames with nothing drawn where the screen changes (at most 4% of it inked, 14% of the screen before and after together) for 316ms, from 395ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `036-theology_path_christ-c5-blank-0.jpg` (frames at 377ms, 525ms, 711ms, 1288ms after the tap)
37. tap a "Apollinarianism A Christ with a human bo" (went to /heresies/apollinarianism/): 17 frames with nothing drawn where the screen changes (at most 5% of it inked, 21% of the screen before and after together) for 334ms, from 291ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `037-heresies-c15-blank-0.jpg` (frames at 257ms, 340ms, 624ms, 1206ms after the tap)
38. tap a "Arianism That the Son is the highest of " (went to /heresies/arianism/): 12 frames with nothing drawn where the screen changes (at most 3% of it inked, 18% of the screen before and after together) for 347ms, from 391ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `038-heresies-c10-blank-0.jpg` (frames at 365ms, 391ms, 738ms, 1238ms after the tap)
39. tap a "Back to the Bible" (went to /bible/): 15 frames with nothing drawn where the screen changes (at most 3% of it inked, 26% of the screen before and after together) for 273ms, from 259ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/multi/
   - file: lands on app/(app)/bible/page.tsx
   - still: `039-bible_multi-c1-blank-0.jpg` (frames at 243ms, 280ms, 532ms, 959ms after the tap)
40. tap a "Browse all saints →" (went to /saints/): 13 frames with nothing drawn where the screen changes (at most 2% of it inked, 27% of the screen before and after together) for 240ms, from 331ms after the tap
   - seen by: new reader, open reader; on 1 screen: /prayers/today/
   - file: lands on app/(app)/saints/page.tsx
   - still: `040-prayers_today-c18-blank-0.jpg` (frames at 313ms, 377ms, 571ms, 1239ms after the tap)
41. tap a "Canon I of Constantinople" (went to /councils/first-constantinople/the-seven-canons/): 24 frames with nothing drawn where the screen changes (at most 5% of it inked, 34% of the screen before and after together) for 462ms, from 305ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/councils/CouncilWords.tsx, app/(app)/heresies/[slug]/page.tsx (its box carries data-council-words)
   - still: `041-heresies_apollinarianism-c2-blank-0.jpg` (frames at 284ms, 362ms, 767ms, 1171ms after the tap)
42. tap a "Choose what email you get" (went to /signin/): 23 frames with nothing drawn where the screen changes (at most 5% of it inked, 7% of the screen before and after together) for 449ms, from 273ms after the tap
   - seen by: new reader, open reader; on 1 screen: /email/unsubscribe/
   - file: lands on app/(auth)/signin/page.tsx
   - still: `042-email_unsubscribe-c1-blank-0.jpg` (frames at 252ms, 690ms, 721ms, 1200ms after the tap)
43. tap a "Colossians 1:16-17 He is before all thin" (went to /bible/): 16 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 269ms, from 327ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `043-apologetics_atheism-c14-blank-0.jpg` (frames at 314ms, 366ms, 596ms, 996ms after the tap)
44. tap a "Commentary on the Gospel of Luke St. Cyr" (went to /saints/cyril-of-alexandria/commentary-on-luke/): 30 frames with nothing drawn where the screen changes (at most 4% of it inked, 2% of the screen before and after together) for 591ms, from 392ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/paths/nativity/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/PathView.tsx (its box carries data-path-day)
   - still: `044-reading_paths_nativity-c16-blank-0.jpg` (frames at 335ms, 392ms, 982ms, 1581ms after the tap)
45. tap a "Continue reading 1 Chronicles 2 Next cha" (went to /bible/1-chronicles/2/): 15 frames with nothing drawn where the screen changes (at most 6% of it inked, 5% of the screen before and after together) for 238ms, from 499ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `045-bible_1-chronicles_1-c9-blank-0.jpg` (frames at 470ms, 499ms, 737ms, 1521ms after the tap)
46. tap a "Council of Ancyra (314), The Twenty-Five" (went to /councils/ancyra-314/the-twenty-five-canons/): 22 frames with nothing drawn where the screen changes (at most 5% of it inked, 30% of the screen before and after together) for 444ms, from 324ms after the tap
   - seen by: open reader; on 1 screen: /councils/ancyra-314/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `046-councils_ancyra-314-c4-blank-0.jpg` (frames at 303ms, 324ms, 768ms, 1159ms after the tap)
47. tap a "Deuteronomy 34 ch" (went to /bible/deuteronomy/1/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 241ms, from 394ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `047-bible-c11-blank-0.jpg` (frames at 383ms, 409ms, 635ms, 1455ms after the tap)
48. tap a "EIKON" (went to /shop/eikon/): 20 frames with nothing drawn where the screen changes (at most 0% of it inked, 15% of the screen before and after together) for 356ms, from 267ms after the tap
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/[store]/page.tsx
   - still: `048-shop_icons_byzantine-three-beam-wall-cross-c7-blank-0.jpg` (frames at 252ms, 280ms, 622ms, 2008ms after the tap)
49. tap a "Esther 10 ch" (went to /bible/esther/1/): 11 frames with nothing drawn where the screen changes (at most 2% of it inked, 19% of the screen before and after together) for 322ms, from 377ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `049-bible-c26-blank-0.jpg` (frames at 345ms, 402ms, 699ms, 1245ms after the tap)
50. tap a "Eunomianism That the Son is unlike the F" (went to /heresies/eunomianism/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 24% of the screen before and after together) for 343ms, from 252ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `050-heresies-c12-blank-0.jpg` (frames at 238ms, 277ms, 595ms, 1220ms after the tap)
51. tap a "Eutychianism 5th century" (went to /heresies/eutychianism/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 15% of the screen before and after together) for 335ms, from 330ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `051-theology_path_christ-c7-blank-0.jpg` (frames at 304ms, 481ms, 664ms, 1204ms after the tap)
52. tap a "Eutychianism Heresies" (went to /heresies/eutychianism/): 20 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 345ms, from 224ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in components/theology/RelatedRail.tsx (its box carries data-related)
   - still: `052-heresies_apollinarianism-c7-blank-0.jpg` (frames at 212ms, 372ms, 569ms, 1088ms after the tap)
53. tap a "Eutychianism That Christ's humanity was " (went to /heresies/eutychianism/): 16 frames with nothing drawn where the screen changes (at most 4% of it inked, 22% of the screen before and after together) for 320ms, from 366ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `053-heresies-c17-blank-0.jpg` (frames at 340ms, 392ms, 686ms, 1214ms after the tap)
54. tap a "Exodus 40 ch" (went to /bible/exodus/1/): 12 frames with nothing drawn where the screen changes (at most 4% of it inked, 19% of the screen before and after together) for 230ms, from 434ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `054-bible-c8-blank-0.jpg` (frames at 427ms, 463ms, 664ms, 1507ms after the tap)
55. tap a "Ezra 10 ch" (went to /bible/ezra/1/): 15 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 258ms, from 338ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `055-bible-c22-blank-0.jpg` (frames at 330ms, 359ms, 596ms, 1275ms after the tap)
56. tap a "Five Tomes Against Nestorius, Book V: th" (went to /saints/cyril-of-alexandria/five-tomes-against-nestorius/): 28 frames with nothing drawn where the screen changes (at most 7% of it inked, 30% of the screen before and after together) for 463ms, from 425ms after the tap
   - seen by: new reader, open reader; on 1 screen: /topics/the-eucharist/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `056-topics_the-eucharist-c6-blank-0.jpg` (frames at 369ms, 445ms, 888ms, 1374ms after the tap)
57. tap a "Genesis 50 ch" (went to /bible/genesis/1/): 19 frames with nothing drawn where the screen changes (at most 6% of it inked, 18% of the screen before and after together) for 313ms, from 407ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `057-bible-c7-blank-0.jpg` (frames at 386ms, 425ms, 721ms, 1579ms after the tap)
58. tap a "Homilies on the First Epistle to the The" (went to /saints/john-chrysostom/homilies-on-1-thessalonians/): 28 frames with nothing drawn where the screen changes (at most 3% of it inked, 31% of the screen before and after together) for 490ms, from 313ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/CoverRow.tsx (its box carries data-reading-row)
   - still: `058-reading-c28-blank-0.jpg` (frames at 221ms, 350ms, 803ms, 1306ms after the tap)
59. tap a "Hymns on the Nativity St. Ephraim the Sy" (went to /saints/ephraim-the-syrian/hymns-on-the-nativity/): 18 frames with nothing drawn where the screen changes (at most 5% of it inked, 5% of the screen before and after together) for 297ms, from 277ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/paths/nativity/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/PathView.tsx (its box carries data-path-day)
   - still: `059-reading_paths_nativity-c9-blank-0.jpg` (frames at 258ms, 277ms, 574ms, 1264ms after the tap)
60. tap a "Iconoclasm That the holy images are idol" (went to /heresies/iconoclasm/): 18 frames with nothing drawn where the screen changes (at most 4% of it inked, 22% of the screen before and after together) for 334ms, from 262ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `060-heresies-c21-blank-0.jpg` (frames at 245ms, 285ms, 596ms, 1150ms after the tap)
61. tap a "John 1:1-3 In the beginning was the Word" (went to /bible/): 15 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 262ms, from 411ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `061-apologetics_atheism-c12-blank-0.jpg` (frames at 395ms, 431ms, 672ms, 1083ms after the tap)
62. tap a "John 10:30 Cyprian pairs this directly w" (went to /bible/): 16 frames with nothing drawn where the screen changes (at most 3% of it inked, 8% of the screen before and after together) for 274ms, from 327ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/theology/TopicReader.tsx (its box carries data-study-scripture)
   - still: `062-theology_comma-johanneum-c10-blank-0.jpg` (frames at 308ms, 327ms, 601ms, 1015ms after the tap)
63. tap a "Joshua 24 ch" (went to /bible/joshua/1/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 253ms, from 340ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `063-bible-c12-blank-0.jpg` (frames at 320ms, 367ms, 593ms, 1455ms after the tap)
64. tap a "Judges 21 ch" (went to /bible/judges/1/): 14 frames with nothing drawn where the screen changes (at most 2% of it inked, 19% of the screen before and after together) for 231ms, from 494ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `064-bible-c13-blank-0.jpg` (frames at 483ms, 510ms, 725ms, 1435ms after the tap)
65. tap a "Judith 16 ch" (went to /bible/judith/1/): 11 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 326ms, from 459ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `065-bible-c25-blank-0.jpg` (frames at 441ms, 507ms, 785ms, 1405ms after the tap)
66. tap a "Leviticus 27 ch" (went to /bible/leviticus/1/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 253ms, from 345ms after the tap
   - seen by: new reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `066-bible-c9-blank-0.jpg` (frames at 336ms, 364ms, 597ms, 1316ms after the tap)
67. tap a "Macedonianism That the Holy Spirit is a " (went to /heresies/macedonianism/): 16 frames with nothing drawn where the screen changes (at most 5% of it inked, 25% of the screen before and after together) for 271ms, from 338ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `067-heresies-c11-blank-0.jpg` (frames at 272ms, 338ms, 609ms, 1193ms after the tap)
68. tap a "Manichaeism Two eternal principles, ligh" (went to /heresies/manichaeism/): 13 frames with nothing drawn where the screen changes (at most 4% of it inked, 22% of the screen before and after together) for 381ms, from 409ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `068-heresies-c9-blank-0.jpg` (frames at 380ms, 409ms, 790ms, 1293ms after the tap)
69. tap a "Marcellianism In fighting Arius, a Word " (went to /heresies/marcellianism/): 10 frames with nothing drawn where the screen changes (at most 5% of it inked, 25% of the screen before and after together) for 252ms, from 452ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `069-heresies-c13-blank-0.jpg` (frames at 377ms, 452ms, 704ms, 1275ms after the tap)
70. tap a "Marcionism Two gods, the just maker of t" (went to /heresies/marcionism/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 22% of the screen before and after together) for 297ms, from 408ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `070-heresies-c3-blank-0.jpg` (frames at 407ms, 474ms, 705ms, 1255ms after the tap)
71. tap a "Matthew 28:19 The baptismal Trinitarian " (went to /bible/): 16 frames with nothing drawn where the screen changes (at most 3% of it inked, 6% of the screen before and after together) for 266ms, from 269ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/theology/TopicReader.tsx (its box carries data-study-scripture)
   - still: `071-theology_comma-johanneum-c11-blank-0.jpg` (frames at 253ms, 269ms, 535ms, 913ms after the tap)
72. tap a "Monothelitism 7th century" (went to /heresies/monothelitism/): 13 frames with nothing drawn where the screen changes (at most 4% of it inked, 12% of the screen before and after together) for 289ms, from 399ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `072-theology_path_christ-c8-blank-0.jpg` (frames at 393ms, 533ms, 688ms, 1233ms after the tap)
73. tap a "Monothelitism Heresies" (went to /heresies/monothelitism/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 331ms, from 229ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in components/theology/RelatedRail.tsx (its box carries data-related)
   - still: `073-heresies_apollinarianism-c8-blank-0.jpg` (frames at 216ms, 375ms, 559ms, 1110ms after the tap)
74. tap a "Monothelitism That Christ has only one w" (went to /heresies/monothelitism/): 16 frames with nothing drawn where the screen changes (at most 5% of it inked, 18% of the screen before and after together) for 266ms, from 403ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `074-heresies-c20-blank-0.jpg` (frames at 340ms, 403ms, 669ms, 1243ms after the tap)
75. tap a "Montanism A new prophecy claiming to com" (went to /heresies/montanism/): 18 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 333ms, from 307ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `075-heresies-c4-blank-0.jpg` (frames at 291ms, 325ms, 640ms, 1188ms after the tap)
76. tap a "Nehemiah 13 ch" (went to /bible/nehemiah/1/): 11 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 253ms, from 417ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `076-bible-c23-blank-0.jpg` (frames at 407ms, 447ms, 670ms, 1361ms after the tap)
77. tap a "Nestorianism 5th century" (went to /heresies/nestorianism/): 20 frames with nothing drawn where the screen changes (at most 3% of it inked, 15% of the screen before and after together) for 336ms, from 356ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `077-theology_path_christ-c6-blank-0.jpg` (frames at 338ms, 498ms, 692ms, 1213ms after the tap)
78. tap a "Nestorianism That Christ is two persons " (went to /heresies/nestorianism/): 14 frames with nothing drawn where the screen changes (at most 4% of it inked, 18% of the screen before and after together) for 376ms, from 292ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `078-heresies-c16-blank-0.jpg` (frames at 276ms, 310ms, 669ms, 1185ms after the tap)
79. tap a "Next: 1 Chronicles 2" (went to /bible/1-chronicles/2/): 29 frames with nothing drawn where the screen changes (at most 4% of it inked, 19% of the screen before and after together) for 519ms, from 388ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill)
   - still: `079-bible_1-chronicles_1-c4-blank-0.jpg` (frames at 376ms, 440ms, 907ms, 1438ms after the tap)
80. tap a "Novatianism A church of the pure that re" (went to /heresies/novatianism/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 21% of the screen before and after together) for 327ms, from 233ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `080-heresies-c7-blank-0.jpg` (frames at 206ms, 253ms, 560ms, 1103ms after the tap)
81. tap a "Numbers 36 ch" (went to /bible/numbers/1/): 12 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 298ms, from 470ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `081-bible-c10-blank-0.jpg` (frames at 449ms, 479ms, 769ms, 1379ms after the tap)
82. tap a "On atheism 16 min The fool hath said in " (went to /apologetics/atheism/): 23 frames with nothing drawn where the screen changes (at most 5% of it inked, 21% of the screen before and after together) for 363ms, from 311ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/
   - file: lands on app/(app)/apologetics/[slug]/page.tsx; the control: app/(app)/apologetics/page.tsx
   - still: `082-apologetics-c2-blank-0.jpg` (frames at 296ms, 328ms, 673ms, 996ms after the tap)
83. tap a "On deism 11 min A maker who withdrew, ag" (went to /apologetics/deism/): 20 frames with nothing drawn where the screen changes (at most 3% of it inked, 16% of the screen before and after together) for 339ms, from 508ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/
   - file: lands on app/(app)/apologetics/[slug]/page.tsx; the control: app/(app)/apologetics/page.tsx
   - still: `083-apologetics-c3-blank-0.jpg` (frames at 489ms, 534ms, 848ms, 1351ms after the tap)
84. tap a "On deism Apologetics" (went to /apologetics/deism/): 17 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 354ms, from 279ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/apologetics/[slug]/page.tsx; the control: in components/theology/RelatedRail.tsx (its box carries data-related)
   - still: `084-apologetics_atheism-c19-blank-0.jpg` (frames at 268ms, 435ms, 633ms, 1139ms after the tap)
85. tap a "On sola scriptura 14 min The Scriptures " (went to /apologetics/sola-scriptura/): 22 frames with nothing drawn where the screen changes (at most 4% of it inked, 22% of the screen before and after together) for 352ms, from 297ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/
   - file: lands on app/(app)/apologetics/[slug]/page.tsx; the control: app/(app)/apologetics/page.tsx
   - still: `085-apologetics-c4-blank-0.jpg` (frames at 272ms, 309ms, 649ms, 1058ms after the tap)
86. tap a "Open Security" (went to /signin/): 19 frames with nothing drawn where the screen changes (at most 4% of it inked, 0% of the screen before and after together) for 422ms, from 359ms after the tap
   - seen by: new reader, open reader; on 1 screen: /email/change/
   - file: lands on app/(auth)/signin/page.tsx
   - still: `086-email_change-c1-blank-0.jpg` (frames at 336ms, 761ms, 781ms, 1311ms after the tap)
87. tap a "Origenism The pre-existence of souls and" (went to /heresies/origenism/): 12 frames with nothing drawn where the screen changes (at most 4% of it inked, 11% of the screen before and after together) for 319ms, from 335ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `087-heresies-c19-blank-0.jpg` (frames at 293ms, 357ms, 654ms, 1148ms after the tap)
88. tap a "Paulianism 3rd century" (went to /heresies/paulianism/): 17 frames with nothing drawn where the screen changes (at most 4% of it inked, 15% of the screen before and after together) for 348ms, from 347ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `088-theology_path_christ-c3-blank-0.jpg` (frames at 333ms, 529ms, 695ms, 1270ms after the tap)
89. tap a "Paulianism That Jesus was a man in whom " (went to /heresies/paulianism/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 20% of the screen before and after together) for 274ms, from 455ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `089-heresies-c8-blank-0.jpg` (frames at 403ms, 455ms, 729ms, 1311ms after the tap)
90. tap a "Pelagianism Salvation by human will with" (went to /heresies/pelagianism/): 17 frames with nothing drawn where the screen changes (at most 4% of it inked, 21% of the screen before and after together) for 314ms, from 301ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `090-heresies-c18-blank-0.jpg` (frames at 282ms, 323ms, 615ms, 1180ms after the tap)
91. tap a "Photinianism 4th century" (went to /heresies/photinianism/): 14 frames with nothing drawn where the screen changes (at most 3% of it inked, 12% of the screen before and after together) for 321ms, from 498ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `091-theology_path_christ-c4-blank-0.jpg` (frames at 469ms, 640ms, 819ms, 1269ms after the tap)
92. tap a "Photinianism Christ a man and no more, S" (went to /heresies/photinianism/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 24% of the screen before and after together) for 335ms, from 259ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `092-heresies-c14-blank-0.jpg` (frames at 241ms, 280ms, 594ms, 1185ms after the tap)
93. tap a "Pray the Psalter →" (went to /bible/psalms/1/): 8 frames with nothing drawn where the screen changes (at most 4% of it inked, 9% of the screen before and after together) for 213ms, from 577ms after the tap
   - seen by: new reader, open reader; on 1 screen: /prayers/today/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `093-prayers_today-c17-blank-0.jpg` (frames at 505ms, 577ms, 790ms, 1554ms after the tap)
94. tap a "Prayer Rope with Cross & Tassel $29.95" (went to /shop/icons/detail/): 106 frames with nothing drawn where the screen changes (at most 0% of it inked, 0% of the screen before and after together) for 1892ms, from 210ms after the tap
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `094-shop_icons_byzantine-three-beam-wall-cross-c11-blank-0.jpg` (frames at 187ms, 1162ms, 2101ms, 2816ms after the tap)
95. tap a "Prayer Rope with Cross & Tassel" (went to /shop/icons/detail/): 16 frames with nothing drawn where the screen changes (at most 0% of it inked, 0% of the screen before and after together) for 297ms, from 322ms after the tap
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `095-shop_icons_byzantine-three-beam-wall-cross-c23-blank-0.jpg` (frames at 285ms, 441ms, 619ms, 1073ms after the tap)
96. tap a "Previous chapter ← 2 Kings 25" (went to /bible/2-kings/25/): 19 frames with nothing drawn where the screen changes (at most 5% of it inked, 18% of the screen before and after together) for 476ms, from 436ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `096-bible_1-chronicles_1-c10-blank-0.jpg` (frames at 417ms, 436ms, 911ms, 1395ms after the tap)
97. tap a "Previous: 2 Kings 25" (went to /bible/2-kings/25/): 21 frames with nothing drawn where the screen changes (at most 5% of it inked, 24% of the screen before and after together) for 358ms, from 457ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill)
   - still: `097-bible_1-chronicles_1-c2-blank-0.jpg` (frames at 426ms, 457ms, 815ms, 1391ms after the tap)
98. tap a "Psalm 14:1 The fool hath said in his hea" (went to /bible/): 17 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 297ms, from 251ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `098-apologetics_atheism-c11-blank-0.jpg` (frames at 243ms, 275ms, 548ms, 933ms after the tap)
99. tap a "Psalm 19:1 The heavens declare the glory" (went to /bible/): 14 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 310ms, from 378ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `099-apologetics_atheism-c17-blank-0.jpg` (frames at 342ms, 409ms, 688ms, 1059ms after the tap)
100. tap a "Psalms 4:4, Brenton’s Septuagint" (went to /bible/psalms/4/): 31 frames with nothing drawn where the screen changes (at most 5% of it inked, 29% of the screen before and after together) for 575ms, from 563ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `100-reading_collections_anger-c2-blank-0.jpg` (frames at 538ms, 581ms, 1139ms, 1676ms after the tap)
101. tap a "Quartodecimanism Keeping Pascha on the f" (went to /heresies/quartodecimanism/): 16 frames with nothing drawn where the screen changes (at most 5% of it inked, 29% of the screen before and after together) for 322ms, from 265ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `101-heresies-c5-blank-0.jpg` (frames at 254ms, 294ms, 587ms, 1173ms after the tap)
102. tap a "Read it in Purify" (went to /councils/first-nicaea/the-twenty-canons/): 10 frames with nothing drawn where the screen changes (at most 6% of it inked, 16% of the screen before and after together) for 299ms, from 393ms after the tap
   - seen by: new reader, open reader; on 1 screen: /prayers/bows/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/prayers/MetanyGuide.tsx (its box carries data-metany-rule)
   - still: `102-prayers_bows-c2-blank-0.jpg` (frames at 344ms, 393ms, 692ms, 1287ms after the tap)
103. tap a "Read where it's from" (went to /councils/ancyra-314/the-twenty-five-canons/): 15 frames with nothing drawn where the screen changes (at most 4% of it inked, 28% of the screen before and after together) for 386ms, from 603ms after the tap
   - seen by: new reader, open reader; on 1 screen: /councils/ancyra-314/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: components/councils/CouncilWords.tsx
   - still: `103-councils_ancyra-314-c6-blank-0.jpg` (frames at 516ms, 603ms, 989ms, 1395ms after the tap)
104. tap a "Read where it's from" (went to /saints/cyprian-of-carthage/on-the-unity-of-the-church/): 15 frames with nothing drawn where the screen changes (at most 1% of it inked, 2% of the screen before and after together) for 281ms, from 577ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/theology/PassageTools.tsx
   - still: `104-theology_comma-johanneum-c4-blank-0.jpg` (frames at 560ms, 577ms, 858ms, 1482ms after the tap)
105. tap a "Romans 1:19-20 The invisible things of G" (went to /bible/): 17 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 280ms, from 320ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `105-apologetics_atheism-c13-blank-0.jpg` (frames at 310ms, 337ms, 600ms, 1027ms after the tap)
106. tap a "Romans 2:14-15 They shew the work of the" (went to /bible/): 16 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 281ms, from 314ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `106-apologetics_atheism-c16-blank-0.jpg` (frames at 299ms, 325ms, 595ms, 1016ms after the tap)
107. tap a "Ruth 4 ch" (went to /bible/ruth/1/): 14 frames with nothing drawn where the screen changes (at most 2% of it inked, 19% of the screen before and after together) for 215ms, from 748ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `107-bible-c14-blank-0.jpg` (frames at 730ms, 762ms, 963ms, 1686ms after the tap)
108. tap a "Sabellianism One God who appears in turn" (went to /heresies/sabellianism/): 20 frames with nothing drawn where the screen changes (at most 4% of it inked, 24% of the screen before and after together) for 372ms, from 273ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `108-heresies-c6-blank-0.jpg` (frames at 259ms, 291ms, 645ms, 1194ms after the tap)
109. tap a "Saints The lives of the saints, with the" (went to /saints/): 9 frames with nothing drawn where the screen changes (at most 3% of it inked, 3% of the screen before and after together) for 322ms, from 1021ms after the tap
   - seen by: new reader, open reader; on 1 screen: /discover/
   - file: lands on app/(app)/saints/page.tsx
   - still: `109-discover-c4-blank-0.jpg` (frames at 951ms, 1021ms, 1343ms, 1845ms after the tap)
110. tap a "Sermons on the Nativity St. Leo the Grea" (went to /saints/leo-the-great/sermons-on-the-nativity/): 18 frames with nothing drawn where the screen changes (at most 2% of it inked, 4% of the screen before and after together) for 287ms, from 324ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/paths/nativity/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/PathView.tsx (its box carries data-path-day)
   - still: `110-reading_paths_nativity-c21-blank-0.jpg` (frames at 280ms, 324ms, 611ms, 1220ms after the tap)
111. tap a "St. Athanasius the Great, Against the He" (went to /saints/athanasius-the-great/against-the-heathen/): 42 frames with nothing drawn where the screen changes (at most 7% of it inked, 18% of the screen before and after together) for 785ms, from 345ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `111-apologetics_atheism-c2-blank-0.jpg` (frames at 324ms, 367ms, 1131ms, 3112ms after the tap)
112. tap a "St. Augustine of Hippo, Confessions, Boo" (went to /saints/augustine-of-hippo/confessions/): 33 frames with nothing drawn where the screen changes (at most 6% of it inked, 33% of the screen before and after together) for 572ms, from 400ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `112-heresies_apollinarianism-c6-blank-0.jpg` (frames at 371ms, 400ms, 973ms, 1386ms after the tap)
113. tap a "St. Augustine of Hippo, Sermons on Selec" (went to /saints/augustine-of-hippo/sermons-on-selected-lessons/): 42 frames with nothing drawn where the screen changes (at most 3% of it inked, 29% of the screen before and after together) for 810ms, from 375ms after the tap
   - seen by: new reader, open reader; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `113-fathers-on_anger-c3-blank-0.jpg` (frames at 354ms, 375ms, 1185ms, 1584ms after the tap)
114. tap a "St. Basil the Great The Fathers" (went to /saints/basil-the-great/): 20 frames with nothing drawn where the screen changes (at most 2% of it inked, 22% of the screen before and after together) for 436ms, from 561ms after the tap
   - seen by: new reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/page.tsx
   - still: `114-apologetics_atheism-c21-blank-0.jpg` (frames at 531ms, 703ms, 997ms, 1856ms after the tap)
115. tap a "St. Basil the Great, The Hexaemeron, Hex" (went to /saints/basil-the-great/hexaemeron/): 11 frames with nothing drawn where the screen changes (at most 4% of it inked, 18% of the screen before and after together) for 218ms, from 433ms after the tap
   - seen by: open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `115-apologetics_atheism-c4-blank-0.jpg` (frames at 403ms, 459ms, 651ms, 1525ms after the tap)
116. tap a "St. Cyril of Jerusalem, The Catechist of" (went to /saints/cyril-of-jerusalem/the-catechist-of-jerusalem/): 16 frames with nothing drawn where the screen changes (at most 6% of it inked, 18% of the screen before and after together) for 346ms, from 344ms after the tap
   - seen by: new reader, open reader; on 1 screen: /topics/the-eucharist/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `116-topics_the-eucharist-c5-blank-0.jpg` (frames at 327ms, 366ms, 690ms, 1294ms after the tap)
117. tap a "St. Ignatius of Antioch, Epistle to the " (went to /saints/ignatius-of-antioch/epistle-to-the-ephesians/): 14 frames with nothing drawn where the screen changes (at most 6% of it inked, 18% of the screen before and after together) for 370ms, from 398ms after the tap
   - seen by: new reader, open reader; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `117-fathers-on_anger-c7-blank-0.jpg` (frames at 361ms, 436ms, 768ms, 1352ms after the tap)
118. tap a "St. Ignatius of Antioch, Epistle to the " (went to /saints/ignatius-of-antioch/epistle-to-the-smyrnaeans/): 22 frames with nothing drawn where the screen changes (at most 6% of it inked, 18% of the screen before and after together) for 372ms, from 443ms after the tap
   - seen by: new reader, open reader; on 1 screen: /topics/the-eucharist/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `118-topics_the-eucharist-c2-blank-0.jpg` (frames at 419ms, 480ms, 816ms, 1416ms after the tap)
119. tap a "St. John Cassian, The Conferences, Confe" (went to /saints/john-cassian/conferences/): 23 frames with nothing drawn where the screen changes (at most 6% of it inked, 17% of the screen before and after together) for 550ms, from 481ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `119-reading_collections_anger-c11-blank-0.jpg` (frames at 312ms, 481ms, 1031ms, 1612ms after the tap)
120. tap a "St. John Chrysostom, Homilies on the Act" (went to /saints/john-chrysostom/homilies-on-acts/): 54 frames with nothing drawn where the screen changes (at most 5% of it inked, 20% of the screen before and after together) for 940ms, from 313ms after the tap
   - seen by: new reader, open reader; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `120-fathers-on_anger-c5-blank-0.jpg` (frames at 283ms, 367ms, 1253ms, 3055ms after the tap)
121. tap a "St. John Chrysostom, Homilies on the Epi" (went to /saints/john-chrysostom/homilies-on-ephesians/): 38 frames with nothing drawn where the screen changes (at most 3% of it inked, 19% of the screen before and after together) for 666ms, from 253ms after the tap
   - seen by: new reader, open reader; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `121-fathers-on_anger-c6-blank-0.jpg` (frames at 215ms, 273ms, 919ms, 1995ms after the tap)
122. tap a "St. John Chrysostom, Homilies on the Epi" (went to /saints/john-chrysostom/homilies-on-hebrews/): 45 frames with nothing drawn where the screen changes (at most 5% of it inked, 19% of the screen before and after together) for 838ms, from 466ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `122-reading_collections_anger-c8-blank-0.jpg` (frames at 345ms, 466ms, 1304ms, 3086ms after the tap)
123. tap a "St. John Chrysostom, Homilies on the Epi" (went to /saints/john-chrysostom/homilies-on-romans/): 48 frames with nothing drawn where the screen changes (at most 6% of it inked, 20% of the screen before and after together) for 931ms, from 287ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `123-apologetics_atheism-c10-blank-0.jpg` (frames at 269ms, 387ms, 1218ms, 2123ms after the tap)
124. tap a "St. John of Damascus, An Exact Expositio" (went to /saints/john-of-damascus/exact-exposition-of-the-orthodox-faith/): 43 frames with nothing drawn where the screen changes (at most 6% of it inked, 19% of the screen before and after together) for 712ms, from 372ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `124-apologetics_atheism-c5-blank-0.jpg` (frames at 348ms, 394ms, 1085ms, 1537ms after the tap)
125. tap a "St. Justin Martyr, The First Apology, Ch" (went to /saints/justin-martyr/first-apology/): 19 frames with nothing drawn where the screen changes (at most 5% of it inked, 18% of the screen before and after together) for 373ms, from 287ms after the tap
   - seen by: new reader, open reader; on 1 screen: /topics/the-eucharist/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `125-topics_the-eucharist-c4-blank-0.jpg` (frames at 273ms, 314ms, 660ms, 1262ms after the tap)
126. tap a "St. Justin Martyr, The Second Apology, C" (went to /saints/justin-martyr/second-apology/): 18 frames with nothing drawn where the screen changes (at most 6% of it inked, 17% of the screen before and after together) for 295ms, from 403ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `126-apologetics_atheism-c8-blank-0.jpg` (frames at 358ms, 440ms, 699ms, 1305ms after the tap)
127. tap a "The Creed, line by line Nicaea, 325 · Co" (went to /theology/creed/): 15 frames with nothing drawn where the screen changes (at most 3% of it inked, 28% of the screen before and after together) for 327ms, from 560ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/creed/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-creed)
   - still: `127-theology-c5-blank-0.jpg` (frames at 534ms, 560ms, 887ms, 1157ms after the tap)
128. tap a "The Ecumenical Councils" (went to /councils/): 3 frames with nothing drawn where the screen changes (at most 1% of it inked, 21% of the screen before and after together) for 210ms, from 374ms after the tap
   - seen by: new reader; on 1 screen: /dictionary/
   - file: lands on app/(app)/councils/page.tsx
   - still: `128-dictionary-c14-blank-0.jpg` (frames at 371ms, 477ms, 584ms, 886ms after the tap)
129. tap a "The Eucharist" (went to /topics/the-eucharist/): 18 frames with nothing drawn where the screen changes (at most 4% of it inked, 18% of the screen before and after together) for 307ms, from 343ms after the tap
   - seen by: new reader, open reader; on 1 screen: /dictionary/
   - file: lands on app/(app)/topics/[slug]/page.tsx
   - still: `129-dictionary-c12-blank-0.jpg` (frames at 312ms, 390ms, 651ms, 1110ms after the tap)
130. tap a "The First Apology St. Justin Martyr" (went to /saints/justin-martyr/first-apology/): 20 frames with nothing drawn where the screen changes (at most 2% of it inked, 0% of the screen before and after together) for 662ms, from 518ms after the tap
   - seen by: new reader, open reader; on 1 screen: /reading/paths/nativity/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/PathView.tsx (its box carries data-path-day)
   - still: `130-reading_paths_nativity-c3-blank-0.jpg` (frames at 501ms, 518ms, 1180ms, 1620ms after the tap)
131. tap a "The Holy Trinity 7 citations from the Fa" (went to /topics/the-holy-trinity/): 11 frames with nothing drawn where the screen changes (at most 4% of it inked, 5% of the screen before and after together) for 228ms, from 475ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/topics/[slug]/page.tsx; the control: components/theology/TheologyHub.tsx
   - still: `131-theology-c3-blank-1.jpg` (frames at 442ms, 581ms, 703ms, 1088ms after the tap)
132. tap a "The Holy Trinity" (went to /topics/the-holy-trinity/): 16 frames with nothing drawn where the screen changes (at most 1% of it inked, 19% of the screen before and after together) for 348ms, from 284ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/
   - file: lands on app/(app)/topics/[slug]/page.tsx; the control: in components/theology/TopicReader.tsx (its box carries data-study-related)
   - still: `132-theology_comma-johanneum-c14-blank-0.jpg` (frames at 276ms, 324ms, 633ms, 1015ms after the tap)
133. tap a "The Incarnation The eternal Son of God, " (went to /topics/the-incarnation/): 17 frames with nothing drawn where the screen changes (at most 4% of it inked, 17% of the screen before and after together) for 304ms, from 354ms after the tap
   - seen by: new reader, open reader; on 1 screen: /theology/path/christ/
   - file: lands on app/(app)/topics/[slug]/page.tsx; the control: components/theology/StepView.tsx, components/theology/StudyShelves.tsx
   - still: `133-theology_path_christ-c2-blank-0.jpg` (frames at 329ms, 387ms, 658ms, 1017ms after the tap)
134. tap a "The Incarnation Topics" (went to /topics/the-incarnation/): 17 frames with nothing drawn where the screen changes (at most 3% of it inked, 20% of the screen before and after together) for 301ms, from 242ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/topics/[slug]/page.tsx; the control: in components/theology/RelatedRail.tsx (its box carries data-related)
   - still: `134-heresies_apollinarianism-c9-blank-0.jpg` (frames at 235ms, 380ms, 543ms, 965ms after the tap)
135. tap a "The Synodical Letter of 382" (went to /councils/first-constantinople/the-synodical-letter/): 17 frames with nothing drawn where the screen changes (at most 5% of it inked, 19% of the screen before and after together) for 283ms, from 390ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/councils/CouncilWords.tsx, app/(app)/heresies/[slug]/page.tsx (its box carries data-council-words)
   - still: `135-heresies_apollinarianism-c3-blank-0.jpg` (frames at 359ms, 429ms, 672ms, 1239ms after the tap)
136. tap a "Three-Beam Byzantine Wall Cross $14.99" (went to /shop/icons/detail/): 17 frames with nothing drawn where the screen changes (at most 4% of it inked, 18% of the screen before and after together) for 350ms, from 243ms after the tap
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `136-shop_icons_byzantine-three-beam-wall-cross-c12-blank-0.jpg` (frames at 232ms, 385ms, 593ms, 903ms after the tap)
137. tap a "Three-Beam Byzantine Wall Cross" (went to /shop/icons/detail/): 66 frames with nothing drawn where the screen changes (at most 0% of it inked, 1% of the screen before and after together) for 1172ms, from 263ms after the tap
   - seen by: new reader; on 1 screen: /shop/category/all/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `137-shop_category_all-c29-blank-0.jpg` (frames at 234ms, 854ms, 1435ms, 1764ms after the tap)
138. tap a "Tobit 14 ch" (went to /bible/tobit/1/): 12 frames with nothing drawn where the screen changes (at most 2% of it inked, 1% of the screen before and after together) for 222ms, from 433ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleBooks.tsx (its box carries data-bible-books)
   - still: `138-bible-c24-blank-0.jpg` (frames at 415ms, 433ms, 655ms, 1368ms after the tap)
139. tap a "Valentinianism A hidden fullness of aeon" (went to /heresies/valentinianism/): 17 frames with nothing drawn where the screen changes (at most 4% of it inked, 19% of the screen before and after together) for 369ms, from 295ms after the tap
   - seen by: new reader, open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `139-heresies-c2-blank-0.jpg` (frames at 259ms, 295ms, 664ms, 1166ms after the tap)
140. tap a "Wisdom 13:1-5 By the greatness and beaut" (went to /bible/): 17 frames with nothing drawn where the screen changes (at most 3% of it inked, 23% of the screen before and after together) for 285ms, from 306ms after the tap
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/bible/page.tsx; the control: in components/apologetics/ApologeticsReader.tsx (its box carries data-answer-part)
   - still: `140-apologetics_atheism-c18-blank-0.jpg` (frames at 293ms, 323ms, 591ms, 997ms after the tap)

### Page switches: cut (14)

141. the page switch from /: 52% of the change in one frame (509ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 11 screens: /account/eikon-box/ /email/unsubscribe/ /settings/ /walkthroughs/job/1/ /calendar/ /campaigns/new/ ...
   - file: lands on app/(app)/calendar/page.tsx
   - still: `141-account_eikon-box-arrival-cut-0.jpg` (frames at 341ms, 509ms, 1803ms after the tap)
142. tap a "Privacy" (went to /privacy/): 58% of the change in one frame (593ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 3 screens: /signup/ /account/notifications/ /signin/
   - file: lands on app/(app)/privacy/page.tsx
   - still: `142-signup-c2-cut-0.jpg` (frames at 513ms, 593ms, 877ms after the tap)
143. tap a "4 Can the pure perish?" (went to /walkthroughs/job/4/): 59% of the change in one frame (685ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /walkthroughs/job/
   - file: lands on app/(app)/walkthroughs/[book]/[chapter]/page.tsx
   - still: `143-walkthroughs_job-c6-cut-0.jpg` (frames at 578ms, 685ms, 1130ms after the tap)
144. tap a "Christ Flag, Greek" (went to /shop/icons/detail/): 68% of the change in one frame (1579ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /shop/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `144-shop-c17-cut-0.jpg` (frames at 1556ms, 1579ms, 1979ms after the tap)
145. tap a "Midday prayers ~5 min" (went to /prayers/midday/): 51% of the change in one frame (413ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /prayers/
   - file: lands on app/(app)/prayers/[planId]/page.tsx; the control: in components/prayers/PrayerBookContents.tsx, components/saints/WritingReader.tsx (its box carries data-chapter)
   - still: `145-prayers-c21-cut-0.jpg` (frames at 392ms, 413ms, 3057ms after the tap)
146. tap a "On the Arrival of the Egyptians, St. Gre" (went to /saints/gregory-theologian/on-the-arrival-of-the-egyptians/): 65% of the change in one frame (475ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /reading/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/CoverRow.tsx (its box carries data-reading-row)
   - still: `146-reading-c15-cut-0.jpg` (frames at 465ms, 475ms, 1506ms after the tap)
147. tap a "Prayer Rope with Cross & Tassel" (went to /shop/icons/detail/): 53% of the change in one frame (641ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
   - still: `147-shop_icons_byzantine-three-beam-wall-cross-c23-cut-0.jpg` (frames at 619ms, 641ms, 1004ms after the tap)
148. tap a "Sign in to continue" (went to /signin/): 54% of the change in one frame (358ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /pricing/
   - file: lands on app/(auth)/signin/page.tsx
   - still: `148-pricing-c15-cut-0.jpg` (frames at 307ms, 358ms, 634ms after the tap)
149. tap a "Sign in" (went to /signin/): 68% of the change in one frame (467ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /shop/orders/detail/
   - file: lands on app/(auth)/signin/page.tsx
   - still: `149-shop_orders_detail-c6-cut-0.jpg` (frames at 447ms, 467ms, 918ms after the tap)
150. tap a "St. John Chrysostom, Homilies on the Epi" (went to /saints/john-chrysostom/homilies-on-romans/): 52% of the change in one frame (436ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `150-apologetics_atheism-c10-cut-0.jpg` (frames at 292ms, 436ms, 2455ms after the tap)
151. tap a "The Holy Trinity 7 citations from the Fa" (went to /topics/the-holy-trinity/): 51% of the change in one frame (162ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/topics/[slug]/page.tsx; the control: components/theology/TheologyHub.tsx
   - still: `151-theology-c3-cut-0.jpg` (frames at -321ms, 162ms, 1088ms after the tap)
152. tap a "Wine and oil" (went to /fasting/): 63% of the change in one frame (405ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /prayers/today/
   - file: lands on app/(app)/fasting/page.tsx
   - still: `152-prayers_today-c2-cut-0.jpg` (frames at 385ms, 405ms, 1041ms after the tap)
153. tap a "Words and history" (went to /chants/psalm-135/): 63% of the change in one frame (356ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `153-chants-c3-cut-0.jpg` (frames at 295ms, 356ms, 901ms after the tap)
154. the page switch from /discover/: 52% of the change in one frame (293ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /
   - file: lands on app/page.tsx
   - still: `154-home-arrival-cut-0.jpg` (frames at 147ms, 293ms, 847ms after the tap)

### Page switches: jump (42)

155. tap a "Community" (went to /community/): div jumped 84px in one frame (from 21,258 to 21,342), 250ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 5 screens: /campaigns/ /campaigns/detail/ /campaigns/mine/ /campaigns/new/ /campaigns/rules/
   - file: lands on app/(app)/community/page.tsx; the control: in components/campaigns/CampaignsClosed.tsx (its box carries data-campaigns-closed)
   - still: `155-campaigns-c0-jump-1.jpg` (frames at 201ms, 284ms, 297ms after the tap)
156. tap a "1 Thessalonians 5:9-13, 24-28" (went to /bible/1-thessalonians/5/): button[data-read-aloud-play=true] "Listen" jumped 48px in one frame (from 251,676 to 299,676), 426ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 2 screens: / /signout/
   - file: the box that jumped: components/bible/ReadAloud.tsx; lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/today/ChurchTodayRail.tsx, components/today/HistoryDayBand.tsx (its box carries data-today-band)
   - still: `156-home-c23-jump-0.jpg` (frames at 309ms, 510ms, 537ms after the tap)
157. tap a "Open Purify" (went to /prayers/today/): div "Wine and oil" jumped 198px in one frame (from 219,158 to 21,202), 262ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 2 screens: /plan/ /premium/
   - file: lands on app/(app)/prayers/today/page.tsx
   - still: `157-plan-c3-jump-0.jpg` (frames at 211ms, 294ms, 334ms after the tap)
158. tap a "Read all 4" (went to /bible/1-thessalonians/5/): div[data-reader-chrome=true][data-reader-pill=true][data-screen-edge=bottom] "Chapter switcher" jumped 76px in one frame (from 0,650 to 0,574), 415ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 2 screens: /signout/ /
   - file: the box that jumped: components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx; lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/today/ChurchTodayRail.tsx
   - still: `158-signout-c26-jump-0.jpg` (frames at 283ms, 444ms, 470ms after the tap)
159. tap a "1 Thessalonians 5:9-13, 24-28 Epistle" (went to /bible/1-thessalonians/5/): button[data-read-aloud-play=true] "Listen" jumped 48px in one frame (from 251,676 to 299,676), 393ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: the box that jumped: components/bible/ReadAloud.tsx; lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleAppointedToday.tsx (its box carries data-bible-readings)
   - still: `159-bible-c4-jump-0.jpg` (frames at 264ms, 434ms, 445ms after the tap)
160. tap a "Back to Community" (went to /community/): div jumped 84px in one frame (from 21,335 to 21,419), 382ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/moderate/
   - file: lands on app/(app)/community/page.tsx
   - still: `160-community_moderate-c1-jump-0.jpg` (frames at 311ms, 399ms, 423ms after the tap)
161. tap a "Back to the Bible" (went to /bible/): div[data-carried=forward] "Bible Plus Read Codex Sinaiticus, Matthe" jumped 51px in one frame (from 0,51 to 0,0), 164ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /bible/multi/
   - file: lands on app/(app)/bible/page.tsx
   - still: `161-bible_multi-c1-jump-1.jpg` (frames at 159ms, 226ms, 243ms after the tap)
162. tap a "Canon I of Constantinople" (went to /councils/first-constantinople/the-seven-canons/): article[data-council-reader][data-work-reader] "Canon I The Seven Canons The Faith of th" jumped 270px in one frame (from 21,356 to 21,86), 386ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /heresies/apollinarianism/
   - file: the box that jumped: components/councils/CouncilReader.tsx; lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/councils/CouncilWords.tsx, app/(app)/heresies/[slug]/page.tsx (its box carries data-council-words)
   - still: `162-heresies_apollinarianism-c2-jump-1.jpg` (frames at 221ms, 428ms, 453ms after the tap)
163. tap a "Chat Talk about the faith, and share wha" (went to /community/): div jumped 84px in one frame (from 21,335 to 21,419), 278ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /discover/
   - file: lands on app/(app)/community/page.tsx
   - still: `163-discover-c13-jump-0.jpg` (frames at 269ms, 287ms, 313ms after the tap)
164. tap a "Council of Ancyra (314), The Twenty-Five" (went to /councils/ancyra-314/the-twenty-five-canons/): article[data-council-reader][data-work-reader] "Canon V The Twenty-Five Canons As many, " jumped 270px in one frame (from 21,356 to 21,86), 413ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /councils/ancyra-314/
   - file: the box that jumped: components/councils/CouncilReader.tsx; lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `164-councils_ancyra-314-c4-jump-0.jpg` (frames at 289ms, 444ms, 463ms after the tap)
165. tap a "Ephesians 4:26-27, King James Version" (went to /bible/ephesians/4/): span[data-running-line][data-open] "v 25 of 32" jumped 25px in one frame (from 134,661 to 159,661), 1002ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /reading/collections/anger/
   - file: the box that jumped: components/bible/ChapterVerseStatus.tsx, components/saints/MobileWorkPill.tsx; lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `165-reading_collections_anger-c3-jump-0.jpg` (frames at 996ms, 1016ms, 1032ms after the tap)
166. tap a "James 1:19-20, King James Version" (went to /bible/james/1/): span[data-running-line][data-open] "v 19 of 27" jumped 27px in one frame (from 134,661 to 161,661), 1083ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /reading/collections/anger/
   - file: the box that jumped: components/bible/ChapterVerseStatus.tsx, components/saints/MobileWorkPill.tsx; lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `166-reading_collections_anger-c4-jump-0.jpg` (frames at 1077ms, 1085ms, 1102ms after the tap)
167. tap a "Matthew 28:19-20" (went to /bible/matthew/28/): span jumped 25px in one frame (from 0,570 to 0,545), 632ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /history/alaska-mission/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `167-history_alaska-mission-c11-jump-0.jpg` (frames at 612ms, 646ms, 670ms after the tap)
168. tap a "Proverbs 16:32, Brenton’s Septuagint" (went to /bible/proverbs/16/): span jumped 37px in one frame (from 0,582 to 0,545), 453ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `168-reading_collections_anger-c9-jump-0.jpg` (frames at 452ms, 475ms, 486ms after the tap)
169. tap a "Psalm 117 Arabic · Psalm · 5:55" (went to /chants/psalm-117/): div[data-carried=forward] "Psalm 117 Psalm 117 Sung by Choir of Bei" jumped 51px in one frame (from 0,51 to 0,0), 493ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `169-chants-c8-jump-0.jpg` (frames at 427ms, 553ms, 570ms after the tap)
170. tap a "Psalm 135 Arabic · Psalm · 4:13" (went to /chants/psalm-135/): div[data-carried=forward] "Psalm 135 Psalm 135 Sung by Eikona Engli" jumped 51px in one frame (from 0,51 to 0,0), 200ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `170-chants-c9-jump-0.jpg` (frames at 177ms, 254ms, 270ms after the tap)
171. tap a "Psalm 135" (went to /chants/psalm-135/): div[data-carried=forward] "Psalm 135 Psalm 135 Sung by Eikona Engli" jumped 51px in one frame (from 0,51 to 0,0), 182ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `171-chants-c1-jump-0.jpg` (frames at 177ms, 243ms, 262ms after the tap)
172. tap a "Read all 4" (went to /bible/1-thessalonians/5/): span jumped 77px in one frame (from 0,582 to 0,505), 1134ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `172-home-c26-jump-0.jpg` (frames at 1127ms, 1144ms, 1156ms after the tap)
173. tap a "Read it in Purify" (went to /councils/first-nicaea/the-twenty-canons/): article[data-council-reader][data-work-reader] "Canon XX The Twenty Canons Forasmuch as " jumped 270px in one frame (from 21,356 to 21,86), 303ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/bows/
   - file: the box that jumped: components/councils/CouncilReader.tsx; lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/prayers/MetanyGuide.tsx (its box carries data-metany-rule)
   - still: `173-prayers_bows-c2-jump-1.jpg` (frames at 209ms, 365ms, 344ms after the tap)
174. tap a "Read where it's from" (went to /councils/ancyra-314/the-twenty-five-canons/): article[data-council-reader][data-work-reader] "Canon V The Twenty-Five Canons As many, " jumped 270px in one frame (from 21,356 to 21,86), 471ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /councils/ancyra-314/
   - file: the box that jumped: components/councils/CouncilReader.tsx; lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: components/councils/CouncilWords.tsx
   - still: `174-councils_ancyra-314-c6-jump-1.jpg` (frames at 374ms, 499ms, 516ms after the tap)
175. tap a "Reading plans" (went to /plans/): section "MORE PLANS The Psalter by kathisma 20 da" jumped 354px in one frame (from 21,192 to 21,546), 314ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /bible/
   - file: lands on app/(app)/plans/page.tsx; the control: in components/mobile/BibleStudyRow.tsx (its box carries data-bible-study)
   - still: `175-bible-c5-jump-0.jpg` (frames at 182ms, 343ms, 384ms after the tap)
176. tap a "Settings Light mode, reading, the calend" (went to /settings/): section "Your space What you told us when you arr" jumped 133px in one frame (from 17,234 to 17,367), 292ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /account/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); lands on app/(app)/settings/page.tsx; the control: in components/mobile/YouMobile.tsx (its box carries data-you-rows)
   - still: `176-account-c9-jump-0.jpg` (frames at 184ms, 357ms, 408ms after the tap)
177. tap a "Shop Orthodox icons, faithful to the tra" (went to /shop/): div jumped 153px in one frame (from 0,565 to 0,412), 815ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /discover/
   - file: lands on app/(app)/shop/page.tsx
   - still: `177-discover-c12-jump-0.jpg` (frames at 812ms, 832ms, 847ms after the tap)
178. tap a "St. Gregory the Great, Morals on the Boo" (went to /saints/gregory-the-dialogist/morals-on-the-book-of-job/): span jumped 30px in one frame (from 0,570 to 0,540), 1176ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx
   - still: `178-fathers-on_anger-c4-jump-1.jpg` (frames at 1118ms, 1222ms, 1273ms after the tap)
179. tap a "St. John of Damascus, An Exact Expositio" (went to /saints/john-of-damascus/exact-exposition-of-the-orthodox-faith/): span[data-running-line][data-open] "Chapter 3 of 14" jumped 27px in one frame (from 118,661 to 145,661), 1232ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /apologetics/atheism/
   - file: the box that jumped: components/bible/ChapterVerseStatus.tsx, components/saints/MobileWorkPill.tsx; lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `179-apologetics_atheism-c5-jump-1.jpg` (frames at 1218ms, 1237ms, 1253ms after the tap)
180. tap a "Start a conversation" (went to /community/): div jumped 84px in one frame (from 21,270 to 21,354), 300ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/community/page.tsx
   - still: `180-bible_1-chronicles_1-c13-jump-1.jpg` (frames at 288ms, 308ms, 321ms after the tap)
181. tap a "The Mother of God “Ever-Virgin Mary” The" (went to /saints/theotokos/): div[data-carried=forward] "The Most Holy Theotokos The Most Holy Th" jumped 51px in one frame (from 0,51 to 0,0), 232ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: lands on app/(app)/saints/[slug]/page.tsx
   - still: `181-saints-c2-jump-0.jpg` (frames at 196ms, 298ms, 312ms after the tap)
182. tap a "The Paschal Canon Greek · Hymn · 29:18" (went to /chants/paschal-canon/): div[data-carried=forward] "The Paschal Canon The Paschal Canon Sung" jumped 51px in one frame (from 0,51 to 0,0), 154ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `182-chants-c17-jump-0.jpg` (frames at 147ms, 217ms, 237ms after the tap)
183. tap a "The Prayer Rope Anthem Contemporary · Hy" (went to /chants/prayer-rope-anthem/): div[data-carried=forward] "The Prayer Rope Anthem The Prayer Rope A" jumped 51px in one frame (from 0,51 to 0,0), 232ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `183-chants-c18-jump-0.jpg` (frames at 198ms, 303ms, 339ms after the tap)
184. tap a "The Synodical Letter of 382" (went to /councils/first-constantinople/the-synodical-letter/): article[data-council-reader][data-work-reader] "Our confession of the Faith The Synodica" jumped 270px in one frame (from 21,356 to 21,86), 299ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /heresies/apollinarianism/
   - file: the box that jumped: components/councils/CouncilReader.tsx; lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/councils/CouncilWords.tsx, app/(app)/heresies/[slug]/page.tsx (its box carries data-council-words)
   - still: `184-heresies_apollinarianism-c3-jump-1.jpg` (frames at 226ms, 370ms, 359ms after the tap)
185. tap a "Today's prayer" (went to /prayers/today/): div "Wine and oil" jumped 198px in one frame (from 219,158 to 21,202), 198ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/
   - file: lands on app/(app)/prayers/today/page.tsx; the control: in components/prayers/PrayerBookContents.tsx, components/saints/WritingReader.tsx (its box carries data-chapter)
   - still: `185-prayers-c24-jump-0.jpg` (frames at 175ms, 215ms, 228ms after the tap)
186. tap a "Words and history" (went to /chants/psalm-135/): div[data-carried=forward] "Psalm 135 Psalm 135 Sung by Eikona Engli" jumped 51px in one frame (from 0,51 to 0,0), 225ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `186-chants-c3-jump-1.jpg` (frames at 175ms, 295ms, 356ms after the tap)
187. tap button "Begin" (went to /bible/acts/1/): div[data-reader-chrome=true][data-reader-pill=true][data-screen-edge=bottom] "Chapter switcher" jumped 76px in one frame (from 0,650 to 0,574), 503ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: the box that jumped: components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx; lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/plans/PlanTodayCard.tsx
   - still: `187-plans_acts-c2-jump-0.jpg` (frames at 361ms, 529ms, 557ms after the tap)
188. the page switch from /: a "Open Security" jumped 75px in one frame (from 21,188 to 21,263), 143ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /email/change/
   - file: lands on app/(app)/email/change/page.tsx
   - still: `188-email_change-arrival-jump-0.jpg` (frames at 106ms, 167ms, 185ms after the tap)
189. the page switch from /: div "Download Markdown Download backup (JSON)" jumped 362px in one frame (from 21,268 to 21,630), 118ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /account/export/
   - file: lands on app/(app)/account/export/page.tsx
   - still: `189-account_export-arrival-jump-0.jpg` (frames at 110ms, 142ms, 153ms after the tap)
190. the page switch from /: div "What Plus opens Cross-references A verse" jumped 52px in one frame (from 18,657 to 18,605), 795ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /gift/
   - file: lands on app/(app)/gift/page.tsx
   - still: `190-gift-arrival-jump-0.jpg` (frames at 771ms, 821ms, 837ms after the tap)
191. the page switch from /: div "Wine and oil" jumped 198px in one frame (from 219,158 to 21,202), 452ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/today/
   - file: lands on app/(app)/prayers/today/page.tsx
   - still: `191-prayers_today-arrival-jump-0.jpg` (frames at 326ms, 491ms, 532ms after the tap)
192. the page switch from /: div jumped 84px in one frame (from 21,335 to 21,419), 203ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /community/
   - file: lands on app/(app)/community/page.tsx
   - still: `192-community-arrival-jump-1.jpg` (frames at 193ms, 220ms, 238ms after the tap)
193. the page switch from /: li "Saints 1" jumped 170px in one frame (from 265,208 to 95,208), 427ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /shop/category/all/
   - file: lands on app/(app)/shop/category/[category]/page.tsx
   - still: `193-shop_category_all-arrival-jump-0.jpg` (frames at 424ms, 438ms, 454ms after the tap)
194. the page switch from /: section "All Ask a Priest Discussion Sign in to s" jumped 24px in one frame (from 0,144 to 0,120), 671ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /community/
   - file: lands on app/(app)/community/page.tsx
   - still: `194-community-arrival-jump-1.jpg` (frames at 608ms, 729ms, 747ms after the tap)
195. the page switch from /: section "MORE PLANS The Psalter by kathisma 20 da" jumped 360px in one frame (from 21,192 to 21,552), 142ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /plans/
   - file: lands on app/(app)/plans/page.tsx
   - still: `195-plans-arrival-jump-0.jpg` (frames at 102ms, 169ms, 190ms after the tap)
196. the page switch from /: section "Your space What you told us when you arr" jumped 131px in one frame (from 17,236 to 17,367), 322ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); lands on app/(app)/settings/page.tsx
   - still: `196-settings-arrival-jump-1.jpg` (frames at 235ms, 444ms, 477ms after the tap)

### Page switches: misplaced (5)

197. tap a "Community" (went to /community/): article "ANNOUNCEMENT P Purify · 9d · Discussion " drawn first at 9,698 then at 9,617 with nothing moving it there, 624ms after the tap
   - seen by: new reader, open reader; on 4 screens: /campaigns/ /campaigns/detail/ /campaigns/new/ /campaigns/rules/
   - file: lands on app/(app)/community/page.tsx; the control: in components/campaigns/CampaignsClosed.tsx (its box carries data-campaigns-closed)
   - still: `197-campaigns-c0-misplaced-0.jpg` (frames at 623ms, 636ms, 653ms after the tap)
198. tap a "Read it in Purify" (went to /councils/third-constantinople/the-canons-of-trullo/): div[data-carried=forward] "Canon XC The Canons of the Council in Tr" drawn first at 0,-265 then at 0,-113 with nothing moving it there, 1510ms after the tap
   - seen by: new reader, open reader; on 1 screen: /prayers/bows/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/prayers/MetanyGuide.tsx (its box carries data-metany-rule)
   - still: `198-prayers_bows-c3-misplaced-1.jpg` (frames at 1232ms, 1549ms, 1601ms after the tap)
199. tap a "St. Augustine of Hippo, Confessions, Boo" (went to /saints/augustine-of-hippo/confessions/): article[data-presence-work=Confessions][data-presence-author][data-presence-sections=13] "Book VII Confessions Chapter 1 1Deceased" drawn first at 21,64 then at 21,356 with nothing moving it there, 1043ms after the tap
   - seen by: open reader; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `199-heresies_apollinarianism-c6-misplaced-1.jpg` (frames at 1039ms, 1055ms, 1071ms after the tap)
200. tap a "Start a conversation" (went to /community/): article "ANNOUNCEMENT P Purify · 9d · Discussion " drawn first at 9,645 then at 9,564 with nothing moving it there, 1332ms after the tap
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: lands on app/(app)/community/page.tsx
   - still: `200-bible_1-chronicles_1-c13-misplaced-0.jpg` (frames at 1323ms, 1348ms, 1386ms after the tap)
201. the page switch from /: article "ANNOUNCEMENT P Purify · 9d · Discussion " drawn first at 9,721 then at 9,618 with nothing moving it there, 563ms after the tap
   - seen by: open reader; on 1 screen: /community/
   - file: lands on app/(app)/community/page.tsx
   - still: `201-community-arrival-misplaced-0.jpg` (frames at 539ms, 567ms, 608ms after the tap)

### Page switches: flash (6)

202. tap a "Origenism The pre-existence of souls and" (went to /heresies/origenism/): something drawn for 1 frame and gone, 120 by 30px at 30,840, at the corner, 685ms after the tap
   - seen by: open reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx; the control: in app/(app)/heresies/page.tsx (its box carries data-century)
   - still: `202-heresies-c19-flash-1.jpg` (frames at 669ms, 685ms, 678ms after the tap)
203. tap a "Psalm 50: Repentance Psalms 50:1-19" (went to /florilegium/begin/psalm-50/): something drawn for 1 frame and gone, 300 by 30px at 60,840, at the corner, 780ms after the tap
   - seen by: open reader; on 1 screen: /florilegium/gathering/
   - file: lands on app/(app)/florilegium/begin/[starter]/page.tsx; the control: components/florilegium/FlorilegiaHub.tsx
   - still: `203-florilegium_gathering-c6-flash-0.jpg` (frames at 813ms, 780ms, 829ms after the tap)
204. tap a "Shop" (went to /shop/): something drawn for 1 frame and gone, 240 by 90px at 30,750, at the corner, 560ms after the tap
   - seen by: open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/page.tsx
   - still: `204-shop_icons_byzantine-three-beam-wall-cross-c6-flash-0.jpg` (frames at 549ms, 560ms, 577ms after the tap)
205. tap a "The Third Letter of St. Cyril to Nestori" (went to /councils/ephesus/the-third-letter-of-cyril/): something drawn for 1 frame and gone, 120 by 150px at 150,360, 248ms after the tap
   - seen by: open reader; on 1 screen: /reading/councils/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/reading/CoverRow.tsx (its box carries data-reading-row)
   - still: `205-reading_councils-c13-flash-0.jpg` (frames at 226ms, 248ms, 261ms after the tap)
206. tap a "Valentinianism A hidden fullness of aeon" (went to /heresies/valentinianism/): something drawn for 1 frame and gone, 270 by 300px at 60,450, 645ms after the tap
   - seen by: new reader; on 1 screen: /heresies/
   - file: lands on app/(app)/heresies/[slug]/page.tsx
   - still: `206-heresies-c2-flash-1.jpg` (frames at 683ms, 645ms, 693ms after the tap)
207. the page switch from /: something drawn for 1 frame and gone, 90 by 90px at 150,210, 873ms after the tap
   - seen by: new reader; on 1 screen: /community/moderate/
   - file: lands on app/(app)/community/moderate/page.tsx
   - still: `207-community_moderate-arrival-flash-0.jpg` (frames at 851ms, 873ms, 865ms after the tap)

### Page switches: a card's picture not carried (30)

208. tap a "Virgin of Vladimir Icon With Hand Carved" (went to /shop/icons/detail/): the card's picture (1789517132387-ibkk7-image-removebg-preview-4.png) is on /shop/icons/detail/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 2 screens: /shop/ /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
209. tap a "1 of 9 The Holy Trinity" (went to /theology/path/trinity/): the card's picture (trinity.jpg) is on /theology/path/trinity/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/TheologyHub.tsx (its box carries data-path-head)
210. tap a "Basil the Great" (went to /saints/basil-the-great/): the card's picture (basil-the-great.v1.avif) is on /saints/basil-the-great/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/saints/[slug]/page.tsx; the control: in components/theology/TheologyHub.tsx (its box carries data-theology-head)
211. tap a "EIKON Icons for the life of prayer. EIKO" (went to /shop/eikon/): the card's picture (1789568248952-fldn3-image-removebg-preview-6.png) is on /shop/eikon/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /shop/stores/
   - file: lands on app/(app)/shop/[store]/page.tsx
212. tap a "Gregory the Theologian" (went to /saints/gregory-theologian/): the card's picture (gregory-theologian.v1.avif) is on /saints/gregory-theologian/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/saints/[slug]/page.tsx; the control: in components/theology/TheologyHub.tsx (its box carries data-theology-head)
213. tap a "I · 325 First Council of Nicaea" (went to /councils/first-nicaea/): the card's picture (pl0C4m3Xpda9qtIkjivXQMzHHdPSFXmkra3jwJ4kg0JmMfX68nTXg4R28JOE9jOjNH5JPu+3hLmyGFGWhjgztSj9QT0IJDxXta4w6zVqfpFDii4ZWi921NQhML26js6xBKAzjCA6sqaYraHx8oFXcTkSo7MhAAAA) is on /councils/first-nicaea/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
214. tap a "I 325 First Council of Nicaea The bishop" (went to /councils/first-nicaea/): the card's picture (pl0C4m3Xpda9qtIkjivXQMzHHdPSFXmkra3jwJ4kg0JmMfX68nTXg4R28JOE9jOjNH5JPu+3hLmyGFGWhjgztSj9QT0IJDxXta4w6zVqfpFDii4ZWi921NQhML26js6xBKAzjCA6sqaYraHx8oFXcTkSo7MhAAAA) is on /councils/first-nicaea/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
215. tap a "II · 381 First Council of Constantinople" (went to /councils/first-constantinople/): the card's picture (hGyCa9+r+14k0LwEJn6OvjAIvYIz+4axlVLEfjV4R2WjjRrhDhMuWHngLYP9zxBghZPdg3Ksv3JHbqDc9bfUmDlEdgPmeY4N3GQkuWOcFJwKWIUERQKhBmGOlC4kPOduTKebkqAA=) is on /councils/first-constantinople/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
216. tap a "II 381 First Council of Constantinople O" (went to /councils/first-constantinople/): the card's picture (hGyCa9+r+14k0LwEJn6OvjAIvYIz+4axlVLEfjV4R2WjjRrhDhMuWHngLYP9zxBghZPdg3Ksv3JHbqDc9bfUmDlEdgPmeY4N3GQkuWOcFJwKWIUERQKhBmGOlC4kPOduTKebkqAA=) is on /councils/first-constantinople/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
217. tap a "IIChrist, God made man" (went to /theology/path/christ/): the card's picture (christ-pantocrator.v2.jpg) is on /theology/path/christ/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
218. tap a "III · 431 The Council of Ephesus" (went to /councils/ephesus/): the card's picture (8ytKceQS4ZCrKQXsLAtmGqKfomOoi006vAtzqaMOz3H8sN4o0iRLlP3Dg4QTmNHT8IhGXeeyTcbZdkalRv8cqqY2LiTQAA=) is on /councils/ephesus/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
219. tap a "III 431 The Council of Ephesus The Virgi" (went to /councils/ephesus/): the card's picture (8ytKceQS4ZCrKQXsLAtmGqKfomOoi006vAtzqaMOz3H8sN4o0iRLlP3Dg4QTmNHT8IhGXeeyTcbZdkalRv8cqqY2LiTQAA=) is on /councils/ephesus/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
220. tap a "IIIThe Theotokos" (went to /theology/path/theotokos/): the card's picture (theotokos-of-vladimir.jpg) is on /theology/path/theotokos/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
221. tap a "IThe Holy Trinity Where you left off" (went to /theology/path/trinity/): the card's picture (trinity.jpg) is on /theology/path/trinity/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
222. tap a "IV · 451 The Council of Chalcedon" (went to /councils/chalcedon/): the card's picture (IqROUNov0unxHHjS7TZeSFyi3goHMhjyjZSol4nhiNRgAA=) is on /councils/chalcedon/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
223. tap a "IV 451 The Council of Chalcedon One and " (went to /councils/chalcedon/): the card's picture (IqROUNov0unxHHjS7TZeSFyi3goHMhjyjZSol4nhiNRgAA=) is on /councils/chalcedon/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
224. tap a "IVThe Church and the Holy Spirit" (went to /theology/path/church/): the card's picture (pentecost.jpg) is on /theology/path/church/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
225. tap a "IXThe last things" (went to /theology/path/last-things/): the card's picture (last-judgment.jpg) is on /theology/path/last-things/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
226. tap a "Prayer Rope with Cross & Tassel $29.95" (went to /shop/icons/detail/): the card's picture (prayer-rope-blessing-cross-tassel.png) is on /shop/icons/detail/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
227. tap a "Three-Beam Byzantine Wall Cross $14.99" (went to /shop/icons/detail/): the card's picture (byzantine-three-beam-wall-cross.png) is on /shop/icons/detail/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/detail/page.tsx
228. tap a "V · 553 Second Council of Constantinople" (went to /councils/second-constantinople/): the card's picture (iCCk25ziciswCOXtBx+QS94NdcdfdHH6TStd+mXpB+eqYYXo4gAAA==) is on /councils/second-constantinople/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
229. tap a "V 553 Second Council of Constantinople J" (went to /councils/second-constantinople/): the card's picture (iCCk25ziciswCOXtBx+QS94NdcdfdHH6TStd+mXpB+eqYYXo4gAAA==) is on /councils/second-constantinople/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
230. tap a "VI · 681 Third Council of Constantinople" (went to /councils/third-constantinople/): the card's picture (hdv4hxi3Y8bodPqDMzJqQR74G35j6dYiN5Z9AtbhmzAWDs8aIrOj+qVx4ATIorr1w3rgv3XB0WPUNztuOgYbryrlZ7yME7cvlHzVu9rgJC+cwZTXqMXlLnqBZN2SaD2v0MSvTl3BCV1GpdfyBAuaqLAFaBIG6Ub5mWIAAAA==) is on /councils/third-constantinople/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
231. tap a "VI 681 Third Council of Constantinople T" (went to /councils/third-constantinople/): the card's picture (hdv4hxi3Y8bodPqDMzJqQR74G35j6dYiN5Z9AtbhmzAWDs8aIrOj+qVx4ATIorr1w3rgv3XB0WPUNztuOgYbryrlZ7yME7cvlHzVu9rgJC+cwZTXqMXlLnqBZN2SaD2v0MSvTl3BCV1GpdfyBAuaqLAFaBIG6Ub5mWIAAAA==) is on /councils/third-constantinople/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
232. tap a "VII · 787 Second Council of Nicaea" (went to /councils/second-nicaea/): the card's picture (qQHgYw9Z13KKeATnOoxrqr1GqWZygMPbczVNVjFztRchqBSl0TLYKVMhsqq2P44dlFA4jG1BSNX7WvwlAVFU3Xjh0ccP4Iz26R+txYkgAAA==) is on /councils/second-nicaea/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/councils/[slug]/page.tsx; the control: in components/theology/TheologyLibrary.tsx (its box carries data-theology-councils)
233. tap a "VII 787 Second Council of Nicaea The hol" (went to /councils/second-nicaea/): the card's picture (qQHgYw9Z13KKeATnOoxrqr1GqWZygMPbczVNVjFztRchqBSl0TLYKVMhsqq2P44dlFA4jG1BSNX7WvwlAVFU3Xjh0ccP4Iz26R+txYkgAAA==) is on /councils/second-nicaea/ and was not carried into it (no View Transition carried it; it ran (tab-bar), (root))
   - seen by: new reader, open reader; on 1 screen: /councils/
   - file: lands on app/(app)/councils/[slug]/page.tsx
234. tap a "VIIIScripture and the Fathers" (went to /theology/path/scripture/): the card's picture (three-hierarchs.v2.jpg) is on /theology/path/scripture/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
235. tap a "VIIThe holy icons" (went to /theology/path/icons/): the card's picture (triumph-of-orthodoxy.jpg) is on /theology/path/icons/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
236. tap a "VISalvation and theosis" (went to /theology/path/salvation/): the card's picture (anastasis.jpg) is on /theology/path/salvation/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)
237. tap a "VThe Mysteries and worship" (went to /theology/path/mysteries/): the card's picture (mystical-supper.jpg) is on /theology/path/mysteries/ and was not carried into it (no View Transition carried it; it ran (root), (tab-bar))
   - seen by: new reader, open reader; on 1 screen: /theology/
   - file: lands on app/(app)/theology/path/[subject]/page.tsx; the control: in components/theology/PathPlates.tsx (its box carries data-path-plates)

### In the page (no page switch; a sheet's opening among them): blank (4)

238. tap a "Terms": 13 frames with nothing drawn where the screen changes (at most 5% of it inked, 0% of the screen before and after together) for 233ms, from 222ms after the tap
   - seen by: open reader; on 1 screen: /account/data/
   - file: on app/(app)/account/(signed)/data/page.tsx; the control: components/legal/LegalLink.tsx
   - still: `238-account_data-c7-blank-0.jpg` (frames at 188ms, 428ms, 456ms, 592ms after the tap)
239. tap button "Anoubius": 34 frames with nothing drawn where the screen changes (at most 3% of it inked, 12% of the screen before and after together) for 649ms, from 331ms after the tap
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `239-community-c16-blank-0.jpg` (frames at 312ms, 393ms, 980ms, 1882ms after the tap)
240. tap button "Next: Canon I": 15 frames with nothing drawn where the screen changes (at most 5% of it inked, 29% of the screen before and after together) for 497ms, from 194ms after the tap
   - seen by: new reader, open reader; on 1 screen: /councils/ancyra-314/the-twenty-five-canons/
   - file: on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill)
   - still: `240-councils_ancyra-314_the-twenty-five-canons-c5-blank-0.jpg` (frames at -319ms, 457ms, 692ms, 1092ms after the tap)
241. tap button[tab] "Ask a Priest": 35 frames with nothing drawn where the screen changes (at most 5% of it inked, 7% of the screen before and after together) for 825ms, from 170ms after the tap
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx; the control: components/community/FeedTabs.tsx
   - still: `241-community-c2-blank-0.jpg` (frames at -315ms, 170ms, 996ms, 1794ms after the tap)

### In the page: cut (60)

242. tap a "See Purify Plus": 100% of the change in one frame (160ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 2 screens: /plan/ /premium/
   - file: on app/(app)/plan/page.tsx
   - still: `242-plan-c1-cut-0.jpg` (frames at 98ms, 160ms, 171ms after the tap)
243. tap a "See Purify Pro": 100% of the change in one frame (153ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 2 screens: /plan/ /premium/
   - file: on app/(app)/plan/page.tsx
   - still: `243-plan-c2-cut-0.jpg` (frames at 99ms, 153ms, 168ms after the tap)
244. tap button "Begin a new gathering": 100% of the change in one frame (111ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 2 screens: /florilegium/ /florilegium/gathering/
   - file: on app/(app)/florilegium/page.tsx; the control: components/florilegium/FlorilegiaHub.tsx, components/florilegium/FlorilegiumPickerSheet.tsx
   - still: `244-florilegium-c2-cut-0.jpg` (frames at -322ms, 111ms, 2103ms after the tap)
245. tap button "Dismiss": 100% of the change in one frame (125ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 2 screens: / /signout/
   - file: on app/page.tsx; the control: in components/onboarding/RoadCards.tsx (its box carries data-road-card)
   - still: `245-home-c5-cut-0.jpg` (frames at -394ms, 125ms after the tap)
246. tap a "Meaning": 87% of the change in one frame (160ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /history/alaska-mission/
   - file: on app/(app)/history/[slug]/page.tsx; the control: in components/history/EventPartsNav.tsx (its box carries data-event-parts)
   - still: `246-history_alaska-mission-c5-cut-0.jpg` (frames at -320ms, 160ms, 520ms after the tap)
247. tap a "People": 80% of the change in one frame (112ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /history/alaska-mission/
   - file: on app/(app)/history/[slug]/page.tsx; the control: in components/history/EventPartsNav.tsx (its box carries data-event-parts)
   - still: `247-history_alaska-mission-c6-cut-0.jpg` (frames at -328ms, 112ms, 511ms after the tap)
248. tap a "Sources": 85% of the change in one frame (110ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /history/alaska-mission/
   - file: on app/(app)/history/[slug]/page.tsx; the control: in components/history/EventPartsNav.tsx (its box carries data-event-parts)
   - still: `248-history_alaska-mission-c7-cut-0.jpg` (frames at -324ms, 110ms, 499ms after the tap)
249. tap a "Story": 99% of the change in one frame (102ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /history/alaska-mission/
   - file: on app/(app)/history/[slug]/page.tsx; the control: in components/history/EventPartsNav.tsx (its box carries data-event-parts)
   - still: `249-history_alaska-mission-c4-cut-0.jpg` (frames at -319ms, 102ms, 515ms after the tap)
250. tap button "0 replies": 100% of the change in one frame (110ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `250-community-c15-cut-0.jpg` (frames at -324ms, 110ms, 263ms after the tap)
251. tap button "1 reply": 98% of the change in one frame (114ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `251-community-c21-cut-0.jpg` (frames at -325ms, 114ms, 1059ms after the tap)
252. tap button "10th c., 2 saints": 51% of the change in one frame (119ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `252-saints-c27-cut-0.jpg` (frames at -320ms, 119ms, 1048ms after the tap)
253. tap button "11th c., 3 saints": 60% of the change in one frame (128ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `253-saints-c28-cut-0.jpg` (frames at -319ms, 128ms, 1049ms after the tap)
254. tap button "12th c., 4 saints": 53% of the change in one frame (140ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `254-saints-c29-cut-0.jpg` (frames at -314ms, 140ms, 1072ms after the tap)
255. tap button "1st c., 1 saint": 51% of the change in one frame (118ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `255-saints-c18-cut-0.jpg` (frames at -324ms, 118ms, 1048ms after the tap)
256. tap button "2 replies": 52% of the change in one frame (128ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `256-community-c29-cut-0.jpg` (frames at -132ms, 128ms, 1331ms after the tap)
257. tap button "4 replies": 52% of the change in one frame (118ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `257-community-c24-cut-0.jpg` (frames at -293ms, 118ms, 1302ms after the tap)
258. tap button "4th c., 58 saints": 87% of the change in one frame (147ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `258-saints-c21-cut-0.jpg` (frames at -324ms, 147ms, 1067ms after the tap)
259. tap button "5th c., 30 saints": 90% of the change in one frame (141ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `259-saints-c22-cut-0.jpg` (frames at -293ms, 141ms, 1073ms after the tap)
260. tap button "7th c., 10 saints": 55% of the change in one frame (174ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `260-saints-c24-cut-0.jpg` (frames at -274ms, 174ms, 1107ms after the tap)
261. tap button "8th c., 6 saints": 53% of the change in one frame (127ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `261-saints-c25-cut-0.jpg` (frames at -321ms, 127ms, 1064ms after the tap)
262. tap button "9th c., 9 saints": 54% of the change in one frame (177ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `262-saints-c26-cut-0.jpg` (frames at -320ms, 177ms, 1091ms after the tap)
263. tap button "A rule of prayer": 86% of the change in one frame (172ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `263-settings-c19-cut-0.jpg` (frames at -48ms, 172ms, 488ms after the tap)
264. tap button "Church history": 85% of the change in one frame (121ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `264-settings-c15-cut-0.jpg` (frames at -117ms, 121ms, 457ms after the tap)
265. tap button "Contents 12": 61% of the change in one frame (125ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /privacy/
   - file: on app/(app)/privacy/page.tsx; the control: in components/legal/LegalContents.tsx (its box carries data-legal-contents)
   - still: `265-privacy-c3-cut-0.jpg` (frames at -315ms, 125ms, 476ms after the tap)
266. tap button "Contents 17": 59% of the change in one frame (115ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /terms/
   - file: on app/(app)/terms/page.tsx; the control: in components/legal/LegalContents.tsx (its box carries data-legal-contents)
   - still: `266-terms-c2-cut-0.jpg` (frames at -310ms, 115ms, 474ms after the tap)
267. tap button "Contents 8": 58% of the change in one frame (103ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /shop/policies/
   - file: on app/(app)/shop/policies/page.tsx; the control: in components/legal/LegalContents.tsx (its box carries data-legal-contents)
   - still: `267-shop_policies-c7-cut-0.jpg` (frames at -346ms, 103ms, 469ms after the tap)
268. tap button "Daily quiet": 85% of the change in one frame (134ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `268-settings-c20-cut-0.jpg` (frames at -29ms, 134ms, 479ms after the tap)
269. tap button "Fasts and feasts": 85% of the change in one frame (152ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `269-settings-c18-cut-0.jpg` (frames at -96ms, 152ms, 507ms after the tap)
270. tap button "Keep this gathering": 100% of the change in one frame (106ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /florilegium/begin/beatitudes/
   - file: on app/(app)/florilegium/begin/[starter]/page.tsx; the control: components/florilegium/StarterPage.tsx
   - still: `270-florilegium_begin_beatitudes-c2-cut-0.jpg` (frames at -318ms, 106ms after the tap)
271. tap button "More details Size, kind, budget, a date,": 59% of the change in one frame (111ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /shop/request/
   - file: on app/(app)/shop/request/page.tsx
   - still: `271-shop_request-c9-cut-0.jpg` (frames at -323ms, 111ms, 431ms after the tap)
272. tap button "Next": 94% of the change in one frame (177ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/read/
   - file: on app/(app)/theology/[topic]/read/page.tsx; the control: in components/theology/StudyReader.tsx (its box carries data-reader-next)
   - still: `272-theology_comma-johanneum_read-c7-cut-0.jpg` (frames at -228ms, 177ms, 568ms after the tap)
273. tap button "Not yet, just reading": 100% of the change in one frame (110ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /start/first-liturgy/
   - file: on app/(app)/start/first-liturgy/page.tsx
   - still: `273-start_first-liturgy-c3-cut-0.jpg` (frames at -322ms, 110ms, 119ms after the tap)
274. tap button "Part 2 of 4: The Codex Fuldensis preface": 98% of the change in one frame (120ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/read/
   - file: on app/(app)/theology/[topic]/read/page.tsx; the control: in components/theology/StudyReader.tsx (its box carries data-part-segments)
   - still: `274-theology_comma-johanneum_read-c3-cut-0.jpg` (frames at 93ms, 120ms, 347ms after the tap)
275. tap button "Part 3 of 4: The Council of Carthage, 48": 97% of the change in one frame (136ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/read/
   - file: on app/(app)/theology/[topic]/read/page.tsx; the control: in components/theology/StudyReader.tsx (its box carries data-part-segments)
   - still: `275-theology_comma-johanneum_read-c4-cut-0.jpg` (frames at 124ms, 136ms, 372ms after the tap)
276. tap button "Part 4 of 4: The Latin Fathers": 97% of the change in one frame (183ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /theology/comma-johanneum/read/
   - file: on app/(app)/theology/[topic]/read/page.tsx; the control: in components/theology/StudyReader.tsx (its box carries data-part-segments)
   - still: `276-theology_comma-johanneum_read-c5-cut-0.jpg` (frames at 144ms, 183ms, 413ms after the tap)
277. tap button "Read more": 57% of the change in one frame (132ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `277-community-c14-cut-0.jpg` (frames at -324ms, 132ms, 500ms after the tap)
278. tap button "Start from Morning prayers": 76% of the change in one frame (132ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /prayers/personal/
   - file: on app/(app)/prayers/personal/page.tsx; the control: components/prayers/mine/RuleHead.tsx
   - still: `278-prayers_personal-c2-cut-0.jpg` (frames at -316ms, 132ms, 523ms after the tap)
279. tap button "Study": 87% of the change in one frame (130ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `279-settings-c21-cut-0.jpg` (frames at -107ms, 130ms, 508ms after the tap)
280. tap button "The councils": 87% of the change in one frame (148ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `280-settings-c14-cut-0.jpg` (frames at -146ms, 148ms, 487ms after the tap)
281. tap button "The Fathers' writings": 86% of the change in one frame (189ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `281-settings-c12-cut-0.jpg` (frames at -337ms, 189ms, 551ms after the tap)
282. tap button "The Gospels": 83% of the change in one frame (131ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `282-settings-c13-cut-0.jpg` (frames at -168ms, 131ms, 598ms after the tap)
283. tap button "The Liturgy": 86% of the change in one frame (127ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `283-settings-c17-cut-0.jpg` (frames at -37ms, 127ms, 468ms after the tap)
284. tap button "The saints' lives": 85% of the change in one frame (128ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `284-settings-c11-cut-0.jpg` (frames at -332ms, 128ms, 469ms after the tap)
285. tap button "Try it": 54% of the change in one frame (431ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader; on 1 screen: /pricing/
   - file: on app/(app)/pricing/page.tsx
   - still: `285-pricing-c4-cut-0.jpg` (frames at 426ms, 431ms after the tap)
286. tap button "What the Orthodox believe": 86% of the change in one frame (141ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `286-settings-c16-cut-0.jpg` (frames at -53ms, 141ms, 479ms after the tap)
287. tap button "Yes, I am going": 100% of the change in one frame (120ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /start/first-liturgy/
   - file: on app/(app)/start/first-liturgy/page.tsx
   - still: `287-start_first-liturgy-c2-cut-0.jpg` (frames at 112ms, 120ms after the tap)
288. tap button[radio] "Completely new": 78% of the change in one frame (119ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `288-settings-c5-cut-0.jpg` (frames at -320ms, 119ms, 480ms after the tap)
289. tap button[radio] "Learning": 77% of the change in one frame (103ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `289-settings-c6-cut-0.jpg` (frames at -329ms, 103ms, 444ms after the tap)
290. tap button[radio] "Practicing": 80% of the change in one frame (140ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `290-settings-c7-cut-0.jpg` (frames at -322ms, 140ms, 501ms after the tap)
291. tap button[tab] "Timeline": 91% of the change in one frame (187ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /saints/adrian-of-rome/web/
   - file: on app/(app)/saints/[slug]/web/page.tsx; the control: in components/nav/MobileTopBar.tsx (its box carries data-mobile-topbar)
   - still: `291-saints_adrian-of-rome_web-c2-cut-0.jpg` (frames at 143ms, 187ms, 593ms after the tap)
292. tap summary "Before you read": 99% of the change in one frame (105ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `292-bible_1-chronicles_1-c8-cut-0.jpg` (frames at -327ms, 105ms, 450ms after the tap)
293. tap summary "How do I install this on my phone, and h": 52% of the change in one frame (102ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `293-faq-c15-cut-0.jpg` (frames at -320ms, 102ms, 396ms after the tap)
294. tap summary "Is this Orthodox?": 100% of the change in one frame (105ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `294-faq-c2-cut-0.jpg` (frames at -314ms, 105ms, 321ms after the tap)
295. tap summary "The fasting rule on the calendar looks d": 51% of the change in one frame (101ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `295-faq-c8-cut-0.jpg` (frames at -310ms, 101ms, 357ms after the tap)
296. tap summary "What is Today's Catechism?": 53% of the change in one frame (114ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `296-faq-c13-cut-0.jpg` (frames at -310ms, 114ms, 462ms after the tap)
297. tap summary "Where are the Russian saints?": 60% of the change in one frame (102ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `297-faq-c10-cut-0.jpg` (frames at -318ms, 102ms, 378ms after the tap)
298. tap summary "Where did the daily prayer texts come fr": 50% of the change in one frame (136ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `298-faq-c9-cut-0.jpg` (frames at -321ms, 136ms, 481ms after the tap)
299. tap summary "Which Bible do you use, and why?": 50% of the change in one frame (100ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `299-faq-c4-cut-0.jpg` (frames at -306ms, 100ms, 411ms after the tap)
300. tap summary "Which jurisdiction is this aligned with?": 55% of the change in one frame (116ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `300-faq-c3-cut-0.jpg` (frames at -314ms, 116ms, 390ms after the tap)
301. tap summary "Why use the King James for the New Testa": 52% of the change in one frame (106ms after the tap), outside reduced motion: an instant cut, not a transition
   - seen by: new reader, open reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `301-faq-c5-cut-0.jpg` (frames at -322ms, 106ms, 348ms after the tap)

### In the page: jump (94)

302. tap button "Chant": div "Pray with chant Tap play to hear part of" jumped 251px in one frame (from 0,647 to 0,396), 257ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 5 screens: /prayers/after-meals/ /prayers/akathists/theotokos/ /prayers/evening/ /prayers/hours/compline/ /prayers/morning/
   - file: on app/(app)/prayers/[planId]/page.tsx; the control: in components/prayers/PrayerRuleReader.tsx (its box carries data-prayer-reader)
   - still: `302-prayers_after-meals-c5-jump-0.jpg` (frames at 224ms, 261ms, 279ms after the tap)
303. tap button "Begin a new gathering": section "Begin with a gathering The Prologue of J" jumped 103px in one frame (from 21,402 to 21,505), 93ms after the tap: something above it changed size at once
   - seen by: open reader; on 2 screens: /florilegium/ /florilegium/gathering/
   - file: the box that jumped: in components/florilegium/FlorilegiaHub.tsx (its box carries data-florilegium-hub); on app/(app)/florilegium/page.tsx; the control: components/florilegium/FlorilegiaHub.tsx, components/florilegium/FlorilegiumPickerSheet.tsx
   - still: `303-florilegium-c2-jump-1.jpg` (frames at -322ms, 111ms, 120ms after the tap)
304. tap button "Dismiss": article "Verse of the Day · Gospel how often woul" jumped 178px in one frame (from 21,559 to 21,381), 104ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 2 screens: / /signout/
   - file: on app/page.tsx; the control: in components/onboarding/RoadCards.tsx (its box carries data-road-card)
   - still: `304-home-c5-jump-1.jpg` (frames at -394ms, 125ms after the tap)
305. tap button "For today's saints · 2 more": div "Read all 4 Listen" jumped 27px in one frame (from 38,661 to 38,688), 117ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 2 screens: / /signout/
   - file: the box that jumped: in components/today/ChurchTodayRail.tsx, components/today/HistoryDayBand.tsx (its box carries data-today-band); on app/page.tsx; the control: components/today/ChurchTodayRail.tsx
   - still: `305-home-c25-jump-0.jpg` (frames at 112ms, 129ms, 149ms after the tap)
306. tap a "Monday, November 2": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 119ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `306-calendar-c8-jump-0.jpg` (frames at 100ms, 132ms, 142ms after the tap)
307. tap a "Monday, November 9": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 191ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `307-calendar-c15-jump-0.jpg` (frames at 166ms, 223ms, 245ms after the tap)
308. tap a "October 2026": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 185ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section)
   - still: `308-calendar-c5-jump-0.jpg` (frames at 181ms, 211ms, 228ms after the tap)
309. tap a "Old": div "Friday fast Wednesday/Friday year-round " jumped 27px in one frame (from 21,654 to 21,681), 95ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section)
   - still: `309-calendar-c3-jump-0.jpg` (frames at -312ms, 106ms, 121ms after the tap)
310. tap a "Saturday, November 14, Feast": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 144ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `310-calendar-c20-jump-0.jpg` (frames at 104ms, 163ms, 174ms after the tap)
311. tap a "Saturday, November 7": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 128ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `311-calendar-c13-jump-0.jpg` (frames at 111ms, 149ms, 174ms after the tap)
312. tap a "Sunday, November 1": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 144ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `312-calendar-c7-jump-0.jpg` (frames at 118ms, 155ms, 170ms after the tap)
313. tap a "Sunday, November 8, Feast": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 163ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `313-calendar-c14-jump-0.jpg` (frames at 157ms, 196ms, 202ms after the tap)
314. tap a "Thursday, November 12": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 126ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `314-calendar-c18-jump-0.jpg` (frames at 102ms, 140ms, 151ms after the tap)
315. tap a "Thursday, November 5": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 124ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `315-calendar-c11-jump-0.jpg` (frames at 112ms, 140ms, 159ms after the tap)
316. tap a "Tuesday, November 10": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 144ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `316-calendar-c16-jump-0.jpg` (frames at 114ms, 161ms, 183ms after the tap)
317. tap a "Tuesday, November 3, Feast": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 113ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-grid)
   - still: `317-calendar-c9-jump-0.jpg` (frames at 90ms, 143ms, 148ms after the tap)
318. tap button "0 replies": article "ANNOUNCEMENT Purify · 9d · Discussion Pu" jumped 29px in one frame (from 9,495 to 9,524), 161ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `318-community-c10-jump-0.jpg` (frames at -320ms, 210ms, 238ms after the tap)
319. tap button "1 reply": article "ivan.rizevski · 3d · Discussion Scrollin" jumped 127px in one frame (from 9,611 to 9,738), 1024ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `319-community-c21-jump-1.jpg` (frames at 1012ms, 1061ms, 1059ms after the tap)
320. tap button "10th c., 2 saints": div "“Metanoeite (Repent)” St. Nikon the Meta" jumped 37px in one frame (from 21,553 to 21,590), 104ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `320-saints-c27-jump-1.jpg` (frames at -320ms, 119ms, 127ms after the tap)
321. tap button "10th c., 2 saints": div "“Metanoeite (Repent)”St. Nikon the Metan" jumped 37px in one frame (from 21,553 to 21,590), 130ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `321-saints-c27-jump-1.jpg` (frames at -311ms, 144ms, 154ms after the tap)
322. tap button "11th c., 3 saints": div "“The New Theologian” St. Symeon the New " jumped 37px in one frame (from 21,553 to 21,590), 104ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `322-saints-c28-jump-1.jpg` (frames at -319ms, 128ms, 134ms after the tap)
323. tap button "12th c., 4 saints": div "“The Bulgarian” St. Theophylact of Ohrid" jumped 37px in one frame (from 21,553 to 21,590), 118ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `323-saints-c29-jump-1.jpg` (frames at -314ms, 140ms, 153ms after the tap)
324. tap button "1st c., 1 saint": div "“The Theologian” Holy Apostle and Evange" jumped 37px in one frame (from 21,553 to 21,590), 105ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `324-saints-c18-jump-1.jpg` (frames at -324ms, 118ms, 127ms after the tap)
325. tap button "2 replies": article "N · 5d · Discussion My struggle with lus" jumped 215px in one frame (from 9,495 to 9,710), 102ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `325-community-c29-jump-1.jpg` (frames at -132ms, 128ms, 149ms after the tap)
326. tap button "256–1672 Move through the years": span "Council of Antioch (268) Antioch on the " jumped 25px in one frame (from 92,750 to 92,725), 1889ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /councils/
   - file: on app/(app)/councils/page.tsx
   - still: `326-councils-c22-jump-0.jpg` (frames at 1882ms, 1893ms, 1904ms after the tap)
327. tap button "2nd c., 6 saints": div "“Theophorus, Disciple of John” St. Ignat" jumped 37px in one frame (from 21,553 to 21,590), 107ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `327-saints-c19-jump-0.jpg` (frames at -322ms, 121ms, 131ms after the tap)
328. tap button "3rd c., 14 saints": div "“Disciple of the Disciple” St. Irenaeus " jumped 37px in one frame (from 21,553 to 21,590), 153ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `328-saints-c20-jump-0.jpg` (frames at -319ms, 171ms, 184ms after the tap)
329. tap button "3rd c., 14 saints": div "“Disciple of the Disciple”St. Irenaeus o" jumped 37px in one frame (from 21,553 to 21,590), 114ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `329-saints-c20-jump-0.jpg` (frames at -321ms, 129ms, 146ms after the tap)
330. tap button "4 replies": article "FEAST DAY Purify · 4d · Discussion Today" jumped 315px in one frame (from 9,486 to 9,801), 182ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `330-community-c24-jump-4.jpg` (frames at -349ms, 278ms, 344ms after the tap)
331. tap button "4th c., 58 saints": div "“Father of Monasticism” St. Anthony the " jumped 37px in one frame (from 21,553 to 21,590), 124ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `331-saints-c21-jump-1.jpg` (frames at -324ms, 147ms, 159ms after the tap)
332. tap button "5th c., 30 saints": div "“Teacher of Silence” St. Arsenius the Gr" jumped 37px in one frame (from 21,553 to 21,590), 126ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `332-saints-c22-jump-1.jpg` (frames at -293ms, 141ms, 155ms after the tap)
333. tap button "6th c., 5 saints": div "“The Great” St. Justinian the Great Empe" jumped 37px in one frame (from 21,553 to 21,590), 131ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `333-saints-c23-jump-0.jpg` (frames at -355ms, 160ms, 170ms after the tap)
334. tap button "7th c., 10 saints": div "“The Confessor” St. Maximus the Confesso" jumped 37px in one frame (from 21,553 to 21,590), 133ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `334-saints-c24-jump-0.jpg` (frames at -319ms, 154ms, 167ms after the tap)
335. tap button "8th c., 6 saints": div "“Defender of the Holy Icons” St. John of" jumped 37px in one frame (from 21,553 to 21,590), 113ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `335-saints-c25-jump-1.jpg` (frames at -321ms, 127ms, 142ms after the tap)
336. tap button "9th c., 9 saints": div "“The Great” St. Photius the Great Patria" jumped 37px in one frame (from 21,553 to 21,590), 160ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `336-saints-c26-jump-0.jpg` (frames at -324ms, 177ms, 186ms after the tap)
337. tap button "9th c., 9 saints": div "“The Great”St. Photius the GreatPatriarc" jumped 37px in one frame (from 21,553 to 21,590), 143ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `337-saints-c26-jump-1.jpg` (frames at -320ms, 177ms, 167ms after the tap)
338. tap button "A rule of prayer": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 117ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `338-settings-c19-jump-1.jpg` (frames at -48ms, 172ms, 191ms after the tap)
339. tap button "Anoubius": div[data-profile-card=true] "Anoubius @i.am.lowly Status: Death to th" jumped 240px in one frame (from 0,270 to 0,30), 891ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: the box that jumped: components/community/profile/ProfileViewer.tsx; on app/(app)/community/page.tsx
   - still: `339-community-c16-jump-1.jpg` (frames at 885ms, 909ms, 925ms after the tap)
340. tap button "Apostles 21": span jumped 43px in one frame (from 34,613 to 34,570), 168ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `340-saints-c4-jump-0.jpg` (frames at -320ms, 194ms, 242ms after the tap)
341. tap button "Apostolic Fathers 7": div "“Theophorus, Disciple of John” St. Ignat" jumped 37px in one frame (from 21,692 to 21,729), 120ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `341-saints-c6-jump-0.jpg` (frames at -328ms, 135ms, 149ms after the tap)
342. tap button "Buy now": div[data-foot-bar=true] "$14.99 Special Order Add to cart Buy now" jumped 27px in one frame (from 0,619 to 0,592), 91ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: on app/(app)/shop/icons/[slug]/page.tsx
   - still: `342-shop_icons_byzantine-three-beam-wall-cross-c15-jump-0.jpg` (frames at -315ms, 112ms, 124ms after the tap)
343. tap button "Cappadocian Fathers 3": div "“Father of Monasticism” St. Basil the Gr" jumped 37px in one frame (from 21,692 to 21,729), 99ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `343-saints-c7-jump-0.jpg` (frames at -333ms, 121ms, 140ms after the tap)
344. tap button "Church Fathers 26": div "“Pillar of Orthodoxy” St. Athanasius the" jumped 37px in one frame (from 21,692 to 21,729), 174ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `344-saints-c8-jump-0.jpg` (frames at -329ms, 204ms, 209ms after the tap)
345. tap button "Church history": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 81ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `345-settings-c15-jump-1.jpg` (frames at -117ms, 121ms, 139ms after the tap)
346. tap button "Contemporary": li "The Prayer Rope Anthem Contemporary · Hy" jumped 191px in one frame (from 21,681 to 21,490), 110ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: on app/(app)/chants/page.tsx
   - still: `346-chants-c14-jump-0.jpg` (frames at -325ms, 126ms, 141ms after the tap)
347. tap button "Daily quiet": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 106ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `347-settings-c20-jump-1.jpg` (frames at -29ms, 134ms, 151ms after the tap)
348. tap button "Desert & Monastics 57": div "“Father of Monasticism” St. Anthony the " jumped 37px in one frame (from 21,692 to 21,729), 130ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `348-saints-c10-jump-0.jpg` (frames at -314ms, 147ms, 168ms after the tap)
349. tap button "Equals to the Apostles 5": div "“Equal-to-the-Apostles” St. Mary Magdale" jumped 37px in one frame (from 21,692 to 21,729), 113ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `349-saints-c5-jump-0.jpg` (frames at -312ms, 129ms, 154ms after the tap)
350. tap button "Fasts and feasts": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 113ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `350-settings-c18-jump-1.jpg` (frames at -96ms, 152ms, 158ms after the tap)
351. tap button "Fathers of the Councils 31": div "“Pillar of Orthodoxy” St. Athanasius the" jumped 37px in one frame (from 21,692 to 21,729), 128ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `351-saints-c12-jump-0.jpg` (frames at -329ms, 147ms, 156ms after the tap)
352. tap button "Fathers of the Councils 31": div "“Pillar of Orthodoxy”St. Athanasius the " jumped 37px in one frame (from 21,692 to 21,729), 171ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `352-saints-c12-jump-0.jpg` (frames at -302ms, 223ms, 323ms after the tap)
353. tap button "Find a word": button "Archimandrite A senior rank for a priest" jumped 84px in one frame (from 12,595 to 12,679), 381ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /dictionary/
   - file: the box that jumped: in components/search/CommandPalette.tsx (its box carries data-search-body); on app/(app)/dictionary/page.tsx; the control: components/search/SearchField.tsx
   - still: `353-dictionary-c1-jump-7.jpg` (frames at 370ms, 397ms, 405ms after the tap)
354. tap button "Greek": li "The Paschal Canon Greek · Hymn · 29:18" jumped 64px in one frame (from 21,617 to 21,553), 83ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: on app/(app)/chants/page.tsx
   - still: `354-chants-c11-jump-0.jpg` (frames at -320ms, 100ms, 115ms after the tap)
355. tap button "Hierarchs 68": div "“Pillar of Orthodoxy” St. Athanasius the" jumped 37px in one frame (from 21,692 to 21,729), 121ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `355-saints-c9-jump-0.jpg` (frames at -329ms, 137ms, 152ms after the tap)
356. tap button "Holy Rulers 9": div "“Equal-to-the-Apostles” St. Constantine " jumped 37px in one frame (from 21,692 to 21,729), 109ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `356-saints-c16-jump-0.jpg` (frames at -320ms, 125ms, 135ms after the tap)
357. tap button "Holy Women 27": div "“Ever-Virgin Mary” The Most Holy Theotok" jumped 37px in one frame (from 21,692 to 21,729), 109ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `357-saints-c15-jump-0.jpg` (frames at -322ms, 131ms, 143ms after the tap)
358. tap button "I The daily rule": section[data-chapter=daily-life] "II Before & after daily life Upon waking" jumped 90px in one frame (from 21,678 to 21,588), 204ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/
   - file: the box that jumped: components/prayers/PrayerBookContents.tsx, components/saints/WritingReader.tsx; on app/(app)/prayers/page.tsx; the control: components/prayers/PrayerBookContents.tsx
   - still: `358-prayers-c19-jump-0.jpg` (frames at 202ms, 214ms, 244ms after the tap)
359. tap button "II Before & after daily life Upon waking": section[data-chapter=church-year] "III The Church year The Prayer of St. Ep" jumped 321px in one frame (from 21,824 to 21,503), 88ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/
   - file: the box that jumped: components/prayers/PrayerBookContents.tsx, components/saints/WritingReader.tsx; on app/(app)/prayers/page.tsx; the control: components/prayers/PrayerBookContents.tsx
   - still: `359-prayers-c26-jump-0.jpg` (frames at -134ms, 106ms, 115ms after the tap)
360. tap button "III The Church year The Prayer of St. Ep": section[data-chapter=daily-life] "II Before & after daily life Upon waking" jumped 278px in one frame (from 21,734 to 21,456), 84ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/
   - file: the box that jumped: components/prayers/PrayerBookContents.tsx, components/saints/WritingReader.tsx; on app/(app)/prayers/page.tsx; the control: components/prayers/PrayerBookContents.tsx
   - still: `360-prayers-c27-jump-0.jpg` (frames at -204ms, 102ms, 113ms after the tap)
361. tap button "IV Devotional The Jesus Prayer, Psalm 50": section[data-chapter=daily-life] "II Before & after daily life Upon waking" jumped 278px in one frame (from 21,734 to 21,456), 119ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /prayers/
   - file: the box that jumped: components/prayers/PrayerBookContents.tsx, components/saints/WritingReader.tsx; on app/(app)/prayers/page.tsx; the control: components/prayers/PrayerBookContents.tsx
   - still: `361-prayers-c28-jump-0.jpg` (frames at -291ms, 154ms, 168ms after the tap)
362. tap button "ivan.rizevski": div[data-profile-card=true] "IvanTheHumbleSinner @reader245413 About " jumped 116px in one frame (from 0,270 to 0,154), 1180ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: the box that jumped: components/community/profile/ProfileViewer.tsx; on app/(app)/community/page.tsx
   - still: `362-community-c22-jump-0.jpg` (frames at 1179ms, 1225ms, 1253ms after the tap)
363. tap button "Job offers sacrifices for his children a": div "Messengers arrive one after another with" jumped 79px in one frame (from 21,426 to 21,505), 88ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /walkthroughs/job/1/
   - file: the box that jumped: in components/walkthrough/Synthesis.tsx (its box carries data-walk-step); on app/(app)/walkthroughs/[book]/[chapter]/page.tsx; the control: components/walkthrough/Synthesis.tsx
   - still: `363-walkthroughs_job_1-c7-jump-0.jpg` (frames at -307ms, 100ms, 113ms after the tap)
364. tap button "John Chapter 1 1In the beginning was the": div "A a Reader font The face of the body tex" jumped 47px in one frame (from 17,688 to 17,735), 90ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/ReadingModePages.tsx
   - still: `364-settings-c28-jump-0.jpg` (frames at -318ms, 113ms, 121ms after the tap)
365. tap button "John Chapter 1 1In the beginning was the": div "Candlelight at Vespers Purify Plus On by" jumped 47px in one frame (from 17,527 to 17,574), 83ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /settings/
   - file: on app/(app)/settings/page.tsx
   - still: `365-settings-c28-jump-0.jpg` (frames at -325ms, 109ms, 114ms after the tap)
366. tap button "Mark day 1 as read": section[data-plan-path] "The days 1 of 28 days read Acts 1 2 Acts" jumped 41px in one frame (from 21,377 to 21,418), 116ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: the box that jumped: components/plans/PlanPath.tsx; on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `366-plans_acts-c3-jump-3.jpg` (frames at -329ms, 137ms, 150ms after the tap)
367. tap button "Mark day 2 as read": li "1 Acts 1 Today" jumped 42px in one frame (from 17,369 to 17,411), 82ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: the box that jumped: in components/plans/PlanPath.tsx (its box carries data-plan-path); on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `367-plans_acts-c5-jump-2.jpg` (frames at -310ms, 100ms, 111ms after the tap)
368. tap button "Mark day 3 as read": li "1 Acts 1 Today" jumped 42px in one frame (from 17,325 to 17,367), 217ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: the box that jumped: in components/plans/PlanPath.tsx (its box carries data-plan-path); on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `368-plans_acts-c7-jump-2.jpg` (frames at -329ms, 245ms, 251ms after the tap)
369. tap button "Mark day 4 as read": li "1 Acts 1 Today" jumped 42px in one frame (from 17,325 to 17,367), 94ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: the box that jumped: in components/plans/PlanPath.tsx (its box carries data-plan-path); on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `369-plans_acts-c9-jump-2.jpg` (frames at -333ms, 129ms, 135ms after the tap)
370. tap button "Mark day 5 as read": li "1 Acts 1 Today" jumped 42px in one frame (from 17,325 to 17,367), 100ms after the tap: something above it changed size at once
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: the box that jumped: in components/plans/PlanPath.tsx (its box carries data-plan-path); on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `370-plans_acts-c11-jump-2.jpg` (frames at -325ms, 144ms, 151ms after the tap)
371. tap button "Martyrs 73": div "“Theophorus, Disciple of John” St. Ignat" jumped 37px in one frame (from 21,692 to 21,729), 133ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `371-saints-c13-jump-0.jpg` (frames at -309ms, 158ms, 168ms after the tap)
372. tap button "Next: Canon I": article[data-council-reader][data-work-reader] "Canon I The Twenty-Five Canons With rega" jumped 270px in one frame (from 21,356 to 21,86), 168ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /councils/ancyra-314/the-twenty-five-canons/
   - file: the box that jumped: components/councils/CouncilReader.tsx; on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill)
   - still: `372-councils_ancyra-314_the-twenty-five-canons-c5-jump-1.jpg` (frames at -319ms, 194ms, 457ms after the tap)
373. tap button "Not yet, just reading": div "Which kind of church is it? The parish's" jumped 77px in one frame (from 21,51 to 21,128), 91ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /start/first-liturgy/
   - file: on app/(app)/start/first-liturgy/page.tsx
   - still: `373-start_first-liturgy-c3-jump-1.jpg` (frames at -322ms, 110ms, 119ms after the tap)
374. tap button "Purify": div[data-profile-card=true] "Purify @purify Status: v1.8 is finally h" jumped 240px in one frame (from 0,270 to 0,30), 954ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: the box that jumped: components/community/profile/ProfileViewer.tsx; on app/(app)/community/page.tsx
   - still: `374-community-c6-jump-0.jpg` (frames at 908ms, 977ms, 1013ms after the tap)
375. tap button "Serbian": li "Psalm 135 Serbian · Psalm · 7:09" jumped 63px in one frame (from 21,553 to 21,490), 106ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /chants/
   - file: on app/(app)/chants/page.tsx
   - still: `375-chants-c12-jump-0.jpg` (frames at -331ms, 125ms, 146ms after the tap)
376. tap button "Study": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 94ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `376-settings-c21-jump-1.jpg` (frames at -107ms, 130ms, 147ms after the tap)
377. tap button "Stylites 5": div "“The First of the Pillar-Saints” St. Sym" jumped 37px in one frame (from 21,692 to 21,729), 115ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `377-saints-c11-jump-0.jpg` (frames at -308ms, 131ms, 138ms after the tap)
378. tap button "The Bodiless Hosts 1": span "0" jumped 29px in one frame (from 345,580 to 347,551), 105ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `378-saints-c17-jump-0.jpg` (frames at -330ms, 122ms, 133ms after the tap)
379. tap button "The councils": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 113ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `379-settings-c14-jump-1.jpg` (frames at -146ms, 148ms, 159ms after the tap)
380. tap button "The Fathers' writings": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 132ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `380-settings-c12-jump-1.jpg` (frames at -337ms, 189ms, 216ms after the tap)
381. tap button "The Gospels": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 101ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `381-settings-c13-jump-1.jpg` (frames at -168ms, 131ms, 146ms after the tap)
382. tap button "The Liturgy": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 94ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `382-settings-c17-jump-1.jpg` (frames at -37ms, 127ms, 144ms after the tap)
383. tap button "The saints' lives": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 85ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `383-settings-c11-jump-1.jpg` (frames at -332ms, 128ms, 142ms after the tap)
384. tap button "Try again": div "What Plus opens Cross-references A verse" jumped 52px in one frame (from 18,527 to 18,579), 94ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /gift/
   - file: on app/(app)/gift/page.tsx
   - still: `384-gift-c2-jump-1.jpg` (frames at -318ms, 118ms, 138ms after the tap)
385. tap button "Try it": div "Purify Plus and Pro are tied to your acc" jumped 121px in one frame (from 0,512 to 0,633), 402ms after the tap: something above it changed size at once
   - seen by: new reader; on 1 screen: /pricing/
   - file: on app/(app)/pricing/page.tsx
   - still: `385-pricing-c1-jump-1.jpg` (frames at 393ms, 414ms, 426ms after the tap)
386. tap button "What the Orthodox believe": section "Reading These apply everywhere, not only" jumped 48px in one frame (from 17,568 to 17,616), 114ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: components/settings/FirstFocus.tsx
   - still: `386-settings-c16-jump-1.jpg` (frames at -53ms, 141ms, 146ms after the tap)
387. tap button "Wonderworkers 27": div "“Father of the Monks of Palestine” St. H" jumped 37px in one frame (from 21,692 to 21,729), 122ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `387-saints-c14-jump-0.jpg` (frames at -335ms, 148ms, 158ms after the tap)
388. tap button "Yes, I am going": div "Which kind of church is it? The parish's" jumped 77px in one frame (from 21,51 to 21,128), 100ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /start/first-liturgy/
   - file: on app/(app)/start/first-liturgy/page.tsx
   - still: `388-start_first-liturgy-c2-jump-1.jpg` (frames at -323ms, 112ms, 120ms after the tap)
389. tap button[radio] "Completely new": div "Fasting on Today The full rule, a plain " jumped 26px in one frame (from 17,494 to 17,520), 84ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `389-settings-c5-jump-1.jpg` (frames at -320ms, 119ms, 132ms after the tap)
390. tap button[radio] "Learning": div "Fasting on Today The full rule, a plain " jumped 26px in one frame (from 17,494 to 17,520), 80ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `390-settings-c6-jump-1.jpg` (frames at -329ms, 103ms, 111ms after the tap)
391. tap button[radio] "Practicing": div "Fasting on Today The full rule, a plain " jumped 45px in one frame (from 17,494 to 17,539), 107ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `391-settings-c7-jump-1.jpg` (frames at -322ms, 140ms, 157ms after the tap)
392. tap input: p "By creating an account you agree to the " jumped 27px in one frame (from 21,745 to 21,718), 89ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /signup/
   - file: on app/(auth)/signup/page.tsx
   - still: `392-signup-c5-jump-0.jpg` (frames at -323ms, 120ms, 251ms after the tap)
393. tap summary "Before you read": article "1Adam, Seth, Enos, Verse actions, 1 Chro" jumped 234px in one frame (from 21,329 to 21,563), 84ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /bible/1-chronicles/1/
   - file: on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `393-bible_1-chronicles_1-c8-jump-1.jpg` (frames at -327ms, 105ms, 119ms after the tap)
394. tap summary "November 1 update": details "July 19 updates" jumped 187px in one frame (from 21,811 to 21,624), 141ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /whats-new/
   - file: the box that jumped: in app/(app)/whats-new/page.tsx (its box carries data-changelog); on app/(app)/whats-new/page.tsx; the control: in app/(app)/whats-new/page.tsx (its box carries data-changelog)
   - still: `394-whats-new-c5-jump-0.jpg` (frames at -324ms, 157ms, 170ms after the tap)
395. tap summary "September 1 update": details "June 14 updates" jumped 145px in one frame (from 21,594 to 21,739), 80ms after the tap: something above it changed size at once
   - seen by: new reader, open reader; on 1 screen: /whats-new/
   - file: the box that jumped: in app/(app)/whats-new/page.tsx (its box carries data-changelog); on app/(app)/whats-new/page.tsx; the control: in app/(app)/whats-new/page.tsx (its box carries data-changelog)
   - still: `395-whats-new-c8-jump-0.jpg` (frames at -326ms, 107ms, 113ms after the tap)

### In the page: misplaced (9)

396. tap button "4 replies": div "R Rav3nn. · 3d Me too, we are on the sam" drawn first at 72,462 then at 72,351 with nothing moving it there, 1054ms after the tap
   - seen by: new reader, open reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `396-community-c24-misplaced-0.jpg` (frames at 1029ms, 1059ms, 1071ms after the tap)
397. tap button "Every day of the plan": div "1 Acts 1 Today 2 Acts 2 3 Acts 3 4 Acts " drawn first at 21,574 then at 21,510 with nothing moving it there, 268ms after the tap
   - seen by: new reader, open reader; on 1 screen: /plans/acts/
   - file: on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `397-plans_acts-c13-misplaced-0.jpg` (frames at -320ms, 312ms, 350ms after the tap)
398. tap button "Find a word": button "Antimension A cloth signed by the bishop" drawn first at 17,476 then at 17,526 with nothing moving it there, 295ms after the tap
   - seen by: open reader; on 1 screen: /dictionary/
   - file: on app/(app)/dictionary/page.tsx; the control: components/search/SearchField.tsx
   - still: `398-dictionary-c1-misplaced-0.jpg` (frames at 284ms, 311ms, 303ms after the tap)
399. tap button "Mark day 1 as read": p[data-plan-streak] "1 day in a row" drawn first at 21,356 then at 21,315 with nothing moving it there, 111ms after the tap
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `399-plans_acts-c3-misplaced-0.jpg` (frames at -329ms, 137ms, 150ms after the tap)
400. tap button "Mark day 2 as read": p[data-plan-streak] "1 day in a row" drawn first at 21,297 then at 21,256 with nothing moving it there, 103ms after the tap
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `400-plans_acts-c5-misplaced-0.jpg` (frames at 100ms, 111ms, 125ms after the tap)
401. tap button "Mark day 3 as read": p[data-plan-streak] "1 day in a row" drawn first at 21,253 then at 21,212 with nothing moving it there, 219ms after the tap
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `401-plans_acts-c7-misplaced-0.jpg` (frames at -329ms, 245ms, 251ms after the tap)
402. tap button "Mark day 4 as read": p[data-plan-streak] "1 day in a row" drawn first at 21,253 then at 21,212 with nothing moving it there, 114ms after the tap
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `402-plans_acts-c9-misplaced-0.jpg` (frames at -333ms, 129ms, 135ms after the tap)
403. tap button "Mark day 5 as read": p[data-plan-streak] "1 day in a row" drawn first at 21,253 then at 21,212 with nothing moving it there, 103ms after the tap
   - seen by: open reader; on 1 screen: /plans/acts/
   - file: on app/(app)/plans/[id]/page.tsx; the control: in components/plans/PlanPath.tsx (its box carries data-plan-path)
   - still: `403-plans_acts-c11-misplaced-0.jpg` (frames at -325ms, 144ms, 151ms after the tap)
404. tap button "Try it": mark "λόγου" drawn first at 136,657 then at 200,655 with nothing moving it there, 914ms after the tap
   - seen by: new reader; on 1 screen: /pricing/
   - file: on app/(app)/pricing/page.tsx
   - still: `404-pricing-c1-misplaced-0.jpg` (frames at 906ms, 921ms, 932ms after the tap)

### In the page: flash (8)

405. tap a "Privacy Policy": something drawn for 1 frame and gone, 270 by 30px at 0,840, at the corner, 364ms after the tap
   - seen by: open reader; on 1 screen: /account/security/
   - file: on app/(app)/account/(signed)/security/page.tsx; the control: components/legal/LegalLink.tsx
   - still: `405-account_security-c8-flash-0.jpg` (frames at 362ms, 364ms, 390ms after the tap)
406. tap a "shipping & refund policy": something drawn for 1 frame and gone, 330 by 30px at 30,840, at the corner, 252ms after the tap
   - seen by: new reader; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: on app/(app)/shop/icons/[slug]/page.tsx
   - still: `406-shop_icons_byzantine-three-beam-wall-cross-c18-flash-0.jpg` (frames at 275ms, 252ms, 287ms after the tap)
407. tap a "Terms": something drawn for 2 frames and gone, 90 by 30px at 30,90, 346ms after the tap
   - seen by: open reader; on 1 screen: /account/data/
   - file: on app/(app)/account/(signed)/data/page.tsx; the control: components/legal/LegalLink.tsx
   - still: `407-account_data-c7-flash-1.jpg` (frames at 324ms, 346ms, 374ms after the tap)
408. tap button "Pick a chapter, currently 1 Chronicles 1": something drawn for 2 frames and gone, 300 by 30px at 30,840, at the corner, 413ms after the tap
   - seen by: new reader; on 1 screen: /bible/1-chronicles/1/
   - file: on app/(app)/bible/[book]/[chapter]/page.tsx
   - still: `408-bible_1-chronicles_1-c6-flash-0.jpg` (frames at 395ms, 413ms, 474ms after the tap)
   - note: Unsure: a 30px strip at the screen's foot while the chapter sheet settles; not seen by eye in the frames.
409. tap button "Purify": something drawn for 2 frames and gone, 210 by 60px at 90,810, 335ms after the tap
   - seen by: new reader; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx
   - still: `409-community-c11-flash-0.jpg` (frames at 313ms, 335ms, 401ms after the tap)
410. tap button "Share as a picture": something drawn for 2 frames and gone, 120 by 30px at 30,210, 728ms after the tap
   - seen by: new reader; on 1 screen: /signout/
   - file: on app/(auth)/signout/page.tsx
   - still: `410-signout-c20-flash-0.jpg` (frames at 706ms, 728ms, 767ms after the tap)
411. tap button "Try again": something drawn for 2 frames and gone, 330 by 420px at 30,450, at the corner, 118ms after the tap
   - seen by: new reader, open reader; on 1 screen: /gift/
   - file: on app/(app)/gift/page.tsx
   - still: `411-gift-c2-flash-0.jpg` (frames at -318ms, 118ms, 141ms after the tap)
412. tap summary "Will there be akathists, audio, accounts": something drawn for 1 frame and gone, 30 by 840px at 270,30, 287ms after the tap
   - seen by: new reader; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `412-faq-c11-flash-0.jpg` (frames at 275ms, 287ms, 259ms after the tap)
