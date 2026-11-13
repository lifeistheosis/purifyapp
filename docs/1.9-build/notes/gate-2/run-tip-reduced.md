# Gate 2.0: the reduced-motion pass over the branch tip

The shorter pass down the still path: `70043ef22`, the same export, the new reader, the app's motion pinned to its still path (a phone it judges slow) and the browser asking for less motion, six controls a screen, three workers, 12:04 to 12:22 UTC. A cut is allowed here; anything that moves fails. Stills in `tip-reduced/`. The edge finding below was measured before the edge check's fix and is withdrawn (see its note).

Totals: new reader, motion reduced: 128 screens, 524 taps, 99 findings, 0 unsure, 0 screens not walked, 0 controls in error; for the eye 6 slow answers, 90 dips.
For the eye, not failed: 2 crossings of two layers in passing.

### Layers that meet (2)

1. tap a "1 of 9 The Holy Trinity" (went to /theology/path/trinity/): div[data-mobile-topbar=true][data-screen-edge=top][data-overlay] "The Holy Trinity" meets div[data-step-room]: 373 by 46px at 9,2 (button "Back" drawn over span)
   - seen by: new reader, motion reduced; on 3 screens: /theology/ /theology/doctrine/ /theology/path/christ/
   - file: components/nav/MobileTopBar.tsx | app/(app)/theology/path/[subject]/page.tsx
   - still: `001-theology-c2-layers-0.jpg`
2. at rest: div[data-mobile-topbar=true][data-screen-edge=top][data-overlay] "Christ, God made man" meets div[data-step-room]: 390 by 51px at 0,0 (div[data-mobile-topbar=true][data-screen-edge=top][data-overlay] "Christ, God made man" drawn over span)
   - seen by: new reader, motion reduced; on 1 screen: /theology/path/christ/
   - file: components/nav/MobileTopBar.tsx | app/(app)/theology/path/[subject]/page.tsx
   - still: `002-theology_path_christ-rest422-layers-0.jpg`

### The page's edge (1)

3. tap a "IV 451 The Council of Chalcedon One and " (went to /councils/chalcedon/): span "The Estrangement of the Non-Chalcedonian": words, cut at the right edge by 16px
   - seen by: new reader, motion reduced; on 3 screens: /councils/ /heresies/apollinarianism/ /theology/doctrine/
   - file: in components/layout/AppFrame.tsx, app/page.tsx (its box carries data-route-content)
   - still: `003-councils-c5-edge-0.jpg`
   - note: Withdrawn: the measure's fault. The title is cut to one line by its own box with an ellipsis (Tailwind's truncate); the edge check now clips words by their own box first (scripts/gate/inpage.mjs, self-test case added).

### Page switches: blank (3)

4. the page switch from /: 2 frames with nothing drawn where the screen changes (at most 1% of it inked, 0% of the screen before and after together) for 283ms, from 69ms after the tap
   - seen by: new reader, motion reduced; on 2 screens: /email/unsubscribe/ /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/email/unsubscribe/page.tsx
   - still: `004-email_unsubscribe-arrival-blank-0.jpg` (frames at -318ms, 88ms, 351ms after the tap)
5. tap a "St. Gregory the Great, Morals on the Boo" (went to /saints/gregory-the-dialogist/morals-on-the-book-of-job/): 11 frames with nothing drawn where the screen changes (at most 2% of it inked, 7% of the screen before and after together) for 309ms, from 177ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `005-fathers-on_anger-c4-blank-0.jpg` (frames at 167ms, 265ms, 486ms, 633ms after the tap)
6. tap a "St. John Chrysostom, Homilies on the Act" (went to /saints/john-chrysostom/homilies-on-acts/): 11 frames with nothing drawn where the screen changes (at most 1% of it inked, 1% of the screen before and after together) for 214ms, from 173ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `006-fathers-on_anger-c5-blank-0.jpg` (frames at 160ms, 279ms, 386ms, 448ms after the tap)

### Page switches: jump (21)

7. tap a "Community" (went to /community/): div jumped 84px in one frame (from 21,258 to 21,342), 208ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 5 screens: /campaigns/ /campaigns/detail/ /campaigns/mine/ /campaigns/new/ /campaigns/rules/
   - file: lands on app/(app)/community/page.tsx; the control: in components/campaigns/CampaignsClosed.tsx (its box carries data-campaigns-closed)
   - still: `007-campaigns-c0-jump-2.jpg` (frames at -321ms, 233ms, 264ms after the tap)
8. tap a "1 Thessalonians 5:9-13, 24-28 Epistle" (went to /bible/1-thessalonians/5/): span jumped 52px in one frame (from 0,582 to 0,530), 359ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /bible/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleAppointedToday.tsx (its box carries data-bible-readings)
   - still: `008-bible-c4-jump-2.jpg` (frames at 253ms, 368ms, 380ms after the tap)
9. tap a "Back to Community" (went to /community/): div jumped 84px in one frame (from 21,258 to 21,342), 262ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /community/moderate/
   - file: lands on app/(app)/community/page.tsx
   - still: `009-community_moderate-c1-jump-2.jpg` (frames at 257ms, 267ms, 289ms after the tap)
10. tap a "Back to the Bible" (went to /bible/): div "Bible Plus Read Codex Sinaiticus, Matthe" jumped 51px in one frame (from 0,51 to 0,0), 179ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /bible/multi/
   - file: lands on app/(app)/bible/page.tsx
   - still: `010-bible_multi-c1-jump-0.jpg` (frames at 172ms, 228ms after the tap)
11. tap a "Ephesians 4:26-27, King James Version" (went to /bible/ephesians/4/): span jumped 52px in one frame (from 0,582 to 0,530), 496ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /reading/collections/anger/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `011-reading_collections_anger-c3-jump-2.jpg` (frames at 423ms, 512ms, 616ms after the tap)
12. tap a "James 1:19-20, King James Version" (went to /bible/james/1/): span jumped 52px in one frame (from 0,582 to 0,530), 294ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /reading/collections/anger/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `012-reading_collections_anger-c4-jump-2.jpg` (frames at 215ms, 296ms, 314ms after the tap)
13. tap a "Luke 13:31-35 Gospel" (went to /bible/luke/13/): span jumped 52px in one frame (from 0,582 to 0,530), 399ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /bible/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleAppointedToday.tsx (its box carries data-bible-readings)
   - still: `013-bible-c3-jump-2.jpg` (frames at 358ms, 455ms, 571ms after the tap)
14. tap a "Psalm 135" (went to /chants/psalm-135/): div "Psalm 135 Psalm 135 Sung by Eikona Engli" jumped 51px in one frame (from 0,51 to 0,0), 148ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `014-chants-c1-jump-0.jpg` (frames at 137ms, 184ms, 192ms after the tap)
15. tap a "Psalms 4:4, Brenton’s Septuagint" (went to /bible/psalms/4/): span jumped 52px in one frame (from 0,582 to 0,530), 329ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /reading/collections/anger/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `015-reading_collections_anger-c2-jump-2.jpg` (frames at 319ms, 346ms, 365ms after the tap)
16. tap a "Read it in Purify" (went to /saints/basil-the-great/on-the-holy-spirit/): span jumped 52px in one frame (from 0,582 to 0,530), 412ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /prayers/bows/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/prayers/MetanyGuide.tsx (its box carries data-metany-rule)
   - still: `016-prayers_bows-c4-jump-0.jpg` (frames at 404ms, 424ms after the tap)
17. tap a "St. Athanasius the Great, Against the He" (went to /saints/athanasius-the-great/against-the-heathen/): span jumped 52px in one frame (from 0,582 to 0,530), 281ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /apologetics/atheism/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `017-apologetics_atheism-c2-jump-1.jpg` (frames at 276ms, 288ms, 298ms after the tap)
18. tap a "St. Augustine of Hippo, Sermons on Selec" (went to /saints/augustine-of-hippo/sermons-on-selected-lessons/): span jumped 52px in one frame (from 0,582 to 0,530), 338ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `018-fathers-on_anger-c3-jump-1.jpg` (frames at 320ms, 339ms, 353ms after the tap)
19. tap a "St. Gregory the Great, Morals on the Boo" (went to /saints/gregory-the-dialogist/morals-on-the-book-of-job/): span jumped 52px in one frame (from 0,582 to 0,530), 604ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `019-fathers-on_anger-c4-jump-2.jpg` (frames at 486ms, 606ms, 617ms after the tap)
20. tap a "St. John Chrysostom, Homilies on the Act" (went to /saints/john-chrysostom/homilies-on-acts/): span jumped 52px in one frame (from 0,582 to 0,530), 409ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `020-fathers-on_anger-c5-jump-2.jpg` (frames at 398ms, 440ms, 448ms after the tap)
21. tap a "St. John of Damascus, An Exact Expositio" (went to /saints/john-of-damascus/exact-exposition-of-the-orthodox-faith/): span jumped 52px in one frame (from 0,582 to 0,530), 250ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /apologetics/atheism/
   - file: the box that jumped: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill); lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `021-apologetics_atheism-c5-jump-1.jpg` (frames at 240ms, 251ms, 268ms after the tap)
22. tap a "The Mother of God “Ever-Virgin Mary” The" (went to /saints/theotokos/): div "The Most Holy Theotokos The Most Holy Th" jumped 51px in one frame (from 0,51 to 0,0), 275ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /saints/
   - file: lands on app/(app)/saints/[slug]/page.tsx
   - still: `022-saints-c2-jump-0.jpg` (frames at 236ms, 315ms, 327ms after the tap)
23. tap a "Words and history" (went to /chants/psalm-135/): div "Psalm 135 Psalm 135 Sung by Eikona Engli" jumped 51px in one frame (from 0,51 to 0,0), 138ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /chants/
   - file: lands on app/(app)/chants/[slug]/page.tsx
   - still: `023-chants-c3-jump-0.jpg` (frames at -321ms, 140ms, 154ms after the tap)
24. the page switch from /: div "What Plus opens Cross-references A verse" jumped 52px in one frame (from 18,657 to 18,605), 857ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /gift/
   - file: lands on app/(app)/gift/page.tsx
   - still: `024-gift-arrival-jump-0.jpg` (frames at 854ms, 869ms after the tap)
25. the page switch from /: div jumped 84px in one frame (from 21,258 to 21,342), 164ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /community/
   - file: lands on app/(app)/community/page.tsx
   - still: `025-community-arrival-jump-1.jpg` (frames at 160ms, 175ms, 192ms after the tap)
26. the page switch from /: li "Saints 1" jumped 170px in one frame (from 265,208 to 95,208), 381ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /shop/category/all/
   - file: lands on app/(app)/shop/category/[category]/page.tsx
   - still: `026-shop_category_all-arrival-jump-0.jpg` (frames at 363ms, 395ms, 405ms after the tap)
27. the page switch from /: section "Your space What you told us when you arr" jumped 131px in one frame (from 17,236 to 17,367), 173ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); lands on app/(app)/settings/page.tsx
   - still: `027-settings-arrival-jump-1.jpg` (frames at 161ms, 175ms, 203ms after the tap)

### Page switches: misplaced (21)

28. tap a "Community" (went to /community/): div drawn first at 21,258 then at 21,342 with nothing moving it there, 200ms after the tap
   - seen by: new reader, motion reduced; on 5 screens: /campaigns/ /campaigns/detail/ /campaigns/mine/ /campaigns/new/ /campaigns/rules/
   - file: lands on app/(app)/community/page.tsx; the control: in components/campaigns/CampaignsClosed.tsx (its box carries data-campaigns-closed)
   - still: `028-campaigns-c0-misplaced-0.jpg` (frames at -321ms, 233ms, 264ms after the tap)
29. tap a "1 Thessalonians 5:9-13, 24-28 Epistle" (went to /bible/1-thessalonians/5/): div "v 9 of 28 · 1 min left 1 Thessalonians 5" drawn first at 0,-1083 then at 0,-935 with nothing moving it there, 227ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleAppointedToday.tsx (its box carries data-bible-readings)
   - still: `029-bible-c4-misplaced-0.jpg` (frames at 171ms, 253ms, 368ms after the tap)
30. tap a "Back to Community" (went to /community/): section "Speak with charity. Shared lines come ve" drawn first at 0,197 then at 0,120 with nothing moving it there, 222ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /community/moderate/
   - file: lands on app/(app)/community/page.tsx
   - still: `030-community_moderate-c1-misplaced-0.jpg` (frames at 209ms, 231ms, 247ms after the tap)
31. tap a "Canon I of Constantinople" (went to /councils/first-constantinople/the-seven-canons/): div "Canon I The Seven Canons The Faith of th" drawn first at 0,-717 then at 0,0 with nothing moving it there, 290ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/councils/CouncilWords.tsx, app/(app)/heresies/[slug]/page.tsx (its box carries data-council-words)
   - still: `031-heresies_apollinarianism-c2-misplaced-0.jpg` (frames at 259ms, 306ms, 329ms after the tap)
32. tap a "Council of Ancyra (314), The Twenty-Five" (went to /councils/ancyra-314/the-twenty-five-canons/): section "Canon V The Twenty-Five Canons As many, " drawn first at 0,-436 then at 0,0 with nothing moving it there, 228ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /councils/ancyra-314/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `032-councils_ancyra-314-c4-misplaced-0.jpg` (frames at -321ms, 284ms, 303ms after the tap)
33. tap a "Ephesians 4:26-27, King James Version" (went to /bible/ephesians/4/): div "v 26 of 32 Ephesians 4 Ephesians Chapter" drawn first at 0,-144 then at 0,-2913 with nothing moving it there, 289ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `033-reading_collections_anger-c3-misplaced-0.jpg` (frames at 257ms, 322ms, 423ms after the tap)
34. tap a "Hymns on the Nativity St. Ephraim the Sy" (went to /saints/ephraim-the-syrian/hymns-on-the-nativity/): article[data-presence-work][data-presence-author][data-presence-sections=19] "Hymn I Hymns on the Nativity Ephraim, Hy" drawn first at 21,168 then at 21,356 with nothing moving it there, 206ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /reading/paths/nativity/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/PathView.tsx (its box carries data-path-day)
   - still: `034-reading_paths_nativity-c5-misplaced-0.jpg` (frames at 181ms, 220ms, 227ms after the tap)
35. tap a "James 1:19-20, King James Version" (went to /bible/james/1/): div "v 19 of 27 James 1 Listen James Chapter " drawn first at 0,-426 then at 0,-2037 with nothing moving it there, 188ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `035-reading_collections_anger-c4-misplaced-0.jpg` (frames at 171ms, 215ms, 296ms after the tap)
36. tap a "Luke 13:31-35 Gospel" (went to /bible/luke/13/): div "v 31 of 35 Luke 13 Listen Luke Chapter 1" drawn first at 0,-3996 then at 0,-3862 with nothing moving it there, 307ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /bible/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: in components/mobile/BibleAppointedToday.tsx (its box carries data-bible-readings)
   - still: `036-bible-c3-misplaced-0.jpg` (frames at 278ms, 311ms, 358ms after the tap)
37. tap a "Psalms 4:4, Brenton’s Septuagint" (went to /bible/psalms/4/): div "v 4 of 8 Psalms 4 Psalms Chapter 4 Brent" drawn first at 0,-517 then at 0,-370 with nothing moving it there, 291ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /reading/collections/anger/
   - file: lands on app/(app)/bible/[book]/[chapter]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `037-reading_collections_anger-c2-misplaced-0.jpg` (frames at 244ms, 319ms, 346ms after the tap)
38. tap a "Read it in Purify" (went to /councils/first-nicaea/the-twenty-canons/): div "Canon XX The Twenty Canons Forasmuch as " drawn first at 0,-50 then at 0,0 with nothing moving it there, 352ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /prayers/bows/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/prayers/MetanyGuide.tsx (its box carries data-metany-rule)
   - still: `038-prayers_bows-c2-misplaced-0.jpg` (frames at 338ms, 404ms, 422ms after the tap)
39. tap a "Read" (went to /saints/john-chrysostom/paschal-homily/): article[data-presence-work][data-presence-author][data-presence-sections=1] "The Paschal Homily The Sermon The Catech" drawn first at 21,237 then at 21,356 with nothing moving it there, 281ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /reading/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: in components/reading/FeaturedWork.tsx (its box carries data-stage-part)
   - still: `039-reading-c2-misplaced-0.jpg` (frames at 271ms, 287ms, 302ms after the tap)
40. tap a "St. Athanasius the Great, Against the He" (went to /saints/athanasius-the-great/against-the-heathen/): article[data-presence-work][data-presence-author][data-presence-sections=3] "Part III Against the Heathen Chapter 35 " drawn first at 21,86 then at 21,-10591 with nothing moving it there, 261ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `040-apologetics_atheism-c2-misplaced-0.jpg` (frames at 255ms, 276ms, 288ms after the tap)
41. tap a "St. Augustine of Hippo, Sermons on Selec" (went to /saints/augustine-of-hippo/sermons-on-selected-lessons/): article[data-presence-work][data-presence-author][data-presence-sections=97] "Sermon 13 Sermons on Selected Lessons of" drawn first at 21,86 then at 21,-762 with nothing moving it there, 332ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `041-fathers-on_anger-c3-misplaced-0.jpg` (frames at 320ms, 339ms, 353ms after the tap)
42. tap a "St. Basil the Great, The Hexaemeron, Hex" (went to /saints/basil-the-great/hexaemeron/): article[data-presence-work=The Hexaemeron][data-presence-author][data-presence-sections=2] "The Fitting Beginning The Hexaemeron Hex" drawn first at 21,168 then at 21,356 with nothing moving it there, 321ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `042-apologetics_atheism-c4-misplaced-0.jpg` (frames at 316ms, 338ms, 344ms after the tap)
43. tap a "St. Gregory the Great, Morals on the Boo" (went to /saints/gregory-the-dialogist/morals-on-the-book-of-job/): article[data-presence-work][data-presence-author][data-presence-sections=35] "Book 5 Morals on the Book of Job on Job " drawn first at 21,86 then at 21,-108834 with nothing moving it there, 579ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `043-fathers-on_anger-c4-misplaced-1.jpg` (frames at 486ms, 606ms, 617ms after the tap)
44. tap a "St. John Chrysostom, Homilies on the Act" (went to /saints/john-chrysostom/homilies-on-acts/): article[data-presence-work][data-presence-author][data-presence-sections=55] "Homily 31 Homilies on the Acts of the Ap" drawn first at 21,86 then at 21,-8219 with nothing moving it there, 393ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /fathers-on/anger/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `044-fathers-on_anger-c5-misplaced-1.jpg` (frames at 386ms, 398ms, 440ms after the tap)
45. tap a "St. John of Damascus, An Exact Expositio" (went to /saints/john-of-damascus/exact-exposition-of-the-orthodox-faith/): article[data-presence-work][data-presence-author][data-presence-sections=99] "Book I Chapter 3 Proof that there is a G" drawn first at 21,86 then at 21,-2585 with nothing moving it there, 247ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /apologetics/atheism/
   - file: lands on app/(app)/saints/[slug]/[work]/page.tsx; the control: components/citations/SourceLine.tsx
   - still: `045-apologetics_atheism-c5-misplaced-0.jpg` (frames at 240ms, 251ms, 268ms after the tap)
46. tap a "The Synodical Letter of 382" (went to /councils/first-constantinople/the-synodical-letter/): div "Our confession of the Faith The Synodica" drawn first at 0,-887 then at 0,0 with nothing moving it there, 172ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /heresies/apollinarianism/
   - file: lands on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/councils/CouncilWords.tsx, app/(app)/heresies/[slug]/page.tsx (its box carries data-council-words)
   - still: `046-heresies_apollinarianism-c3-misplaced-0.jpg` (frames at 156ms, 197ms, 221ms after the tap)
47. the page switch from /: article "ANNOUNCEMENT P Purify · 9d · Discussion " drawn first at 9,698 then at 9,617 with nothing moving it there, 353ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /community/
   - file: lands on app/(app)/community/page.tsx
   - still: `047-community-arrival-misplaced-0.jpg` (frames at 341ms, 361ms, 379ms after the tap)
48. the page switch from /: span "Purify Plus" drawn first at 194,153 then at 194,285 with nothing moving it there, 134ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /settings/
   - file: lands on app/(app)/settings/page.tsx
   - still: `048-settings-arrival-misplaced-0.jpg` (frames at -322ms, 141ms, 161ms after the tap)

### Page switches: flash (3)

49. tap a "Orders" (went to /shop/orders/): something drawn for 2 frames and gone, 60 by 30px at 30,150, 136ms after the tap
   - seen by: new reader, motion reduced; on 4 screens: /shop/cart/ /shop/orders/detail/ /shop/requests/ /shop/sell/application/
   - file: lands on app/(app)/shop/orders/page.tsx
   - still: `049-shop_cart-c3-flash-0.jpg` (frames at 125ms, 136ms, 164ms after the tap)
50. tap a "Requests" (went to /shop/requests/): something drawn for 2 frames and gone, 90 by 60px at 0,150, 139ms after the tap
   - seen by: new reader, motion reduced; on 3 screens: /shop/cart/ /shop/orders/detail/ /shop/sell/application/
   - file: lands on app/(app)/shop/requests/page.tsx
   - still: `050-shop_cart-c2-flash-0.jpg` (frames at 121ms, 139ms, 163ms after the tap)
51. the page switch from /: something drawn for 1 frame and gone, 390 by 30px at 0,360, 86ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /florilegium/begin/beatitudes/
   - file: lands on app/(app)/florilegium/begin/[starter]/page.tsx
   - still: `051-florilegium_begin_beatitudes-arrival-flash-0.jpg` (frames at -321ms, 86ms, 98ms after the tap)

### In the page (no page switch; a sheet's opening among them): blank (2)

52. tap button "Try it": 18 frames with nothing drawn where the screen changes (at most 6% of it inked, 5% of the screen before and after together) for 302ms, from 115ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /pricing/
   - file: on app/(app)/pricing/page.tsx; the control: components/billing/KeptPaywall.tsx
   - still: `052-pricing-c1-blank-0.jpg` (frames at -321ms, 255ms, 417ms, 1068ms after the tap)
53. tap button[tab] "Ask a Priest": 27 frames with nothing drawn where the screen changes (at most 5% of it inked, 8% of the screen before and after together) for 455ms, from 181ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /community/
   - file: on app/(app)/community/page.tsx; the control: components/community/FeedTabs.tsx
   - still: `053-community-c2-blank-0.jpg` (frames at -328ms, 195ms, 635ms, 1096ms after the tap)

### In the page: jump (15)

54. tap button "Dismiss": article "Verse of the Day · Gospel how often woul" jumped 178px in one frame (from 21,559 to 21,381), 96ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 2 screens: / /signout/
   - file: on app/page.tsx; the control: in components/onboarding/RoadCards.tsx (its box carries data-road-card)
   - still: `054-home-c5-jump-0.jpg` (frames at -323ms, 116ms after the tap)
55. tap a "October 2026": div "No fast No fast scheduled for this day." jumped 56px in one frame (from 77,654 to 21,654), 110ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section)
   - still: `055-calendar-c5-jump-0.jpg` (frames at 96ms, 127ms, 145ms after the tap)
56. tap a "Old": div "Friday fast Wednesday/Friday year-round " jumped 27px in one frame (from 21,654 to 21,681), 94ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /calendar/
   - file: the box that jumped: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section); on app/(app)/calendar/page.tsx; the control: in components/calendar/PhoneCalendar.tsx (its box carries data-cal-section)
   - still: `056-calendar-c3-jump-0.jpg` (frames at -315ms, 99ms, 112ms after the tap)
57. tap button "Apostles 21": span jumped 43px in one frame (from 34,613 to 34,570), 171ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `057-saints-c4-jump-0.jpg` (frames at -677ms, 200ms, 216ms after the tap)
58. tap button "Contents 12": h2 "On this device vs signed in" jumped 561px in one frame (from 21,238 to 21,799), 86ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /privacy/
   - file: the box that jumped: in components/legal/LegalPage.tsx (its box carries data-legal-text); on app/(app)/privacy/page.tsx; the control: in components/legal/LegalContents.tsx (its box carries data-legal-contents)
   - still: `058-privacy-c3-jump-0.jpg` (frames at -323ms, 104ms, 249ms after the tap)
59. tap button "Equals to the Apostles 5": div "“Equal-to-the-Apostles” St. Mary Magdale" jumped 37px in one frame (from 21,692 to 21,729), 112ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /saints/
   - file: on app/(app)/saints/page.tsx
   - still: `059-saints-c5-jump-0.jpg` (frames at -322ms, 127ms, 139ms after the tap)
60. tap button "Find a word": button "Archimandrite A senior rank for a priest" jumped 84px in one frame (from 12,595 to 12,679), 334ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /dictionary/
   - file: the box that jumped: in components/search/CommandPalette.tsx (its box carries data-search-body); on app/(app)/dictionary/page.tsx; the control: components/search/SearchField.tsx
   - still: `060-dictionary-c1-jump-0.jpg` (frames at 320ms, 337ms, 355ms after the tap)
61. tap button "Next: Canon I": article[data-council-reader][data-work-reader] "Canon I The Twenty-Five Canons With rega" jumped 270px in one frame (from 21,356 to 21,86), 115ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /councils/ancyra-314/the-twenty-five-canons/
   - file: the box that jumped: components/councils/CouncilReader.tsx; on app/(app)/councils/[slug]/[document]/page.tsx; the control: in components/bible/MobileChapterPill.tsx, components/saints/MobileWorkPill.tsx (its box carries data-reader-pill)
   - still: `061-councils_ancyra-314_the-twenty-five-canons-c5-jump-0.jpg` (frames at -322ms, 124ms after the tap)
62. tap button "Not yet, just reading": div "Which kind of church is it? The parish's" jumped 77px in one frame (from 21,51 to 21,128), 91ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /start/first-liturgy/
   - file: on app/(app)/start/first-liturgy/page.tsx
   - still: `062-start_first-liturgy-c3-jump-0.jpg` (frames at -319ms, 96ms, 108ms after the tap)
63. tap button "Try again": div "What Plus opens Cross-references A verse" jumped 52px in one frame (from 18,527 to 18,579), 79ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /gift/
   - file: on app/(app)/gift/page.tsx
   - still: `063-gift-c2-jump-1.jpg` (frames at -324ms, 105ms, 123ms after the tap)
64. tap button "Try it": div "Purify Plus and Pro are tied to your acc" jumped 121px in one frame (from 0,512 to 0,633), 401ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /pricing/
   - file: on app/(app)/pricing/page.tsx; the control: components/billing/KeptPaywall.tsx
   - still: `064-pricing-c1-jump-1.jpg` (frames at 388ms, 417ms, 428ms after the tap)
65. tap button "Yes, I am going": div "Which kind of church is it? The parish's" jumped 77px in one frame (from 21,51 to 21,128), 98ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /start/first-liturgy/
   - file: on app/(app)/start/first-liturgy/page.tsx
   - still: `065-start_first-liturgy-c2-jump-0.jpg` (frames at -322ms, 114ms, 124ms after the tap)
66. tap button[radio] "Completely new": div "Fasting on Today The full rule, a plain " jumped 26px in one frame (from 17,494 to 17,520), 94ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /settings/
   - file: the box that jumped: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live); on app/(app)/settings/page.tsx; the control: in components/reader/ReadingModeChips.tsx, components/settings/ReadingModeGallery.tsx, components/settings/SettingsClient.tsx (its box carries data-live)
   - still: `066-settings-c5-jump-0.jpg` (frames at -312ms, 126ms after the tap)
67. tap input: p "By creating an account you agree to the " jumped 27px in one frame (from 21,745 to 21,718), 88ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /signup/
   - file: on app/(auth)/signup/page.tsx
   - still: `067-signup-c5-jump-0.jpg` (frames at -323ms, 106ms, 253ms after the tap)
68. tap summary "November 1 update": details "July 19 updates" jumped 187px in one frame (from 21,811 to 21,624), 77ms after the tap: something above it changed size at once
   - seen by: new reader, motion reduced; on 1 screen: /whats-new/
   - file: the box that jumped: in app/(app)/whats-new/page.tsx (its box carries data-changelog); on app/(app)/whats-new/page.tsx; the control: in app/(app)/whats-new/page.tsx (its box carries data-changelog)
   - still: `068-whats-new-c5-jump-0.jpg` (frames at -323ms, 96ms, 108ms after the tap)

### In the page: misplaced (2)

69. tap button "Chant": div "Pray with chant Tap play to hear part of" drawn first at 0,520 then at 0,269 with nothing moving it there, 124ms after the tap
   - seen by: new reader, motion reduced; on 4 screens: /prayers/after-meals/ /prayers/evening/ /prayers/hours/compline/ /prayers/morning/
   - file: on app/(app)/prayers/[planId]/page.tsx; the control: in components/prayers/PrayerRuleReader.tsx (its box carries data-prayer-reader)
   - still: `069-prayers_after-meals-c5-misplaced-0.jpg` (frames at -321ms, 127ms, 140ms after the tap)
70. tap button "Play": div "Cover Words Psalm 135 Eikona 8.6 MB Psal" drawn first at 0,844 then at 0,0 with nothing moving it there, 123ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /chants/
   - file: on app/(app)/chants/page.tsx
   - still: `070-chants-c2-misplaced-0.jpg` (frames at 121ms, 150ms, 178ms after the tap)

### In the page: flash (1)

71. tap button "Try again": something drawn for 2 frames and gone, 330 by 420px at 30,450, at the corner, 105ms after the tap
   - seen by: new reader, motion reduced; on 1 screen: /gift/
   - file: on app/(app)/gift/page.tsx
   - still: `071-gift-c2-flash-0.jpg` (frames at -324ms, 105ms, 127ms after the tap)

### With the app's motion reduced: moves (21)

72. tap button "Open cart": with the app's motion reduced, aside "Cart": translate over 300ms
   - seen by: new reader, motion reduced; on 19 screens: /shop/ /shop/ambassador/ /shop/cart/ /shop/category/all/ /shop/checkout/cancelled/ /shop/checkout/success/ ...
   - file: on app/(app)/shop/page.tsx
   - still: `072-shop-c5-moves-0.jpg` (frames at -321ms, 132ms, 416ms after the tap)
73. tap a "/account" (went to /account/): with the app's motion reduced, div[data-you-who-place=out] "Private on this device · no account need": transform over 800ms; div "0 days Keep today: one prayer or one cha": transform over 600ms
   - seen by: new reader, motion reduced; on 2 screens: /about/ /privacy/
   - file: lands on app/(app)/account/(you)/page.tsx
   - still: `073-about-c2-moves-0.jpg` (frames at -323ms, 235ms, 1275ms after the tap)
74. tap a "Get Purify Plus" (went to /pricing/): with the app's motion reduced, a "Get Purify Plus": scale over 150ms
   - seen by: new reader, motion reduced; on 2 screens: /plan/ /premium/
   - file: lands on app/(app)/pricing/page.tsx
   - still: `074-plan-c4-moves-0.jpg` (frames at -321ms, 159ms, 268ms after the tap)
75. tap a "Get Purify Pro" (went to /pricing/): with the app's motion reduced, a "Get Purify Pro": scale over 150ms
   - seen by: new reader, motion reduced; on 2 screens: /plan/ /premium/
   - file: lands on app/(app)/pricing/page.tsx
   - still: `075-plan-c5-moves-0.jpg` (frames at -322ms, 136ms, 235ms after the tap)
76. tap a "Explore" (went to /shop/): with the app's motion reduced, div: transform over 0ms
   - seen by: new reader, motion reduced; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/page.tsx
   - still: `076-shop_icons_byzantine-three-beam-wall-cross-c1-moves-0.jpg` (frames at -339ms, 186ms, 397ms after the tap)
77. tap a "Messages" (went to /shop/messages/): with the app's motion reduced, div: transform over 0ms
   - seen by: new reader, motion reduced; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/messages/page.tsx
   - still: `077-shop_icons_byzantine-three-beam-wall-cross-c4-moves-0.jpg` (frames at -316ms, 152ms, 331ms after the tap)
78. tap a "Orders" (went to /shop/orders/): with the app's motion reduced, div: transform over 0ms
   - seen by: new reader, motion reduced; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/orders/page.tsx
   - still: `078-shop_icons_byzantine-three-beam-wall-cross-c3-moves-0.jpg` (frames at -319ms, 155ms, 351ms after the tap)
79. tap a "Prayers" (went to /prayers/): with the app's motion reduced, figure "Pray without ceasing. 1 Thessalonians 5:": transform over 800ms; div "Your rule Choose prayers from the prayer": transform over 600ms
   - seen by: new reader, motion reduced; on 1 screen: /account/developer/
   - file: lands on app/(app)/prayers/page.tsx; the control: in components/nav/MobileTabBar.tsx (its box carries data-tab-bar)
   - still: `079-account_developer-c5-moves-0.jpg` (frames at -321ms, 247ms, 1305ms after the tap)
80. tap a "Requests" (went to /shop/requests/): with the app's motion reduced, div: transform over 0ms
   - seen by: new reader, motion reduced; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/requests/page.tsx
   - still: `080-shop_icons_byzantine-three-beam-wall-cross-c2-moves-0.jpg` (frames at -320ms, 162ms, 336ms after the tap)
81. tap a "You" (went to /account/): with the app's motion reduced, div[data-you-who-place=out] "Private on this device · no account need": transform over 800ms; div "0 days Keep today: one prayer or one cha": transform over 600ms
   - seen by: new reader, motion reduced; on 1 screen: /campaigns/
   - file: lands on app/(app)/account/(you)/page.tsx; the control: in components/nav/MobileTabBar.tsx (its box carries data-tab-bar)
   - still: `081-campaigns-c5-moves-0.jpg` (frames at -322ms, 406ms, 1407ms after the tap)
82. tap button "Back" (went to /): with the app's motion reduced, div: transform over 0ms
   - seen by: new reader, motion reduced; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/page.tsx; the control: in components/layout/AppFrame.tsx (its box carries data-app-chrome)
   - still: `082-shop_icons_byzantine-three-beam-wall-cross-c0-moves-0.jpg` (frames at -315ms, 164ms after the tap)
83. tap button "Collapse all": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /whats-new/
   - file: on app/(app)/whats-new/page.tsx; the control: in app/(app)/whats-new/page.tsx (its box carries data-changelog)
   - still: `083-whats-new-c4-moves-0.jpg` (frames at -324ms, 147ms, 334ms after the tap)
84. tap button "Expand all": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /whats-new/
   - file: on app/(app)/whats-new/page.tsx; the control: in app/(app)/whats-new/page.tsx (its box carries data-changelog)
   - still: `084-whats-new-c3-moves-0.jpg` (frames at -322ms, 436ms, 779ms after the tap)
85. tap summary "Is this Orthodox?": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `085-faq-c2-moves-0.jpg` (frames at -321ms, 189ms, 332ms after the tap)
86. tap summary "November 1 update": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /whats-new/
   - file: on app/(app)/whats-new/page.tsx; the control: in app/(app)/whats-new/page.tsx (its box carries data-changelog)
   - still: `086-whats-new-c5-moves-1.jpg` (frames at -323ms, 125ms, 324ms after the tap)
87. tap summary "Which Bible do you use, and why?": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `087-faq-c4-moves-0.jpg` (frames at -322ms, 133ms, 317ms after the tap)
88. tap summary "Which jurisdiction is this aligned with?": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `088-faq-c3-moves-0.jpg` (frames at -321ms, 135ms, 330ms after the tap)
89. tap summary "Why use the King James for the New Testa": with the app's motion reduced, span: rotate over 200ms
   - seen by: new reader, motion reduced; on 1 screen: /faq/
   - file: on app/(app)/faq/page.tsx
   - still: `089-faq-c5-moves-0.jpg` (frames at -322ms, 141ms, 307ms after the tap)
90. the page switch from /: with the app's motion reduced, div: transform over 0ms
   - seen by: new reader, motion reduced; on 1 screen: /shop/icons/byzantine-three-beam-wall-cross/
   - file: lands on app/(app)/shop/icons/[slug]/page.tsx
   - still: `090-shop_icons_byzantine-three-beam-wall-cross-arrival-moves-1.jpg` (frames at -337ms, 172ms, 1631ms after the tap)
91. the page switch from /: with the app's motion reduced, div[data-you-who-place=out] "Private on this device · no account need": transform over 800ms; div "0 days Keep today: one prayer or one cha": transform over 600ms
   - seen by: new reader, motion reduced; on 1 screen: /account/
   - file: lands on app/(app)/account/(you)/page.tsx
   - still: `091-account-arrival-moves-0.jpg` (frames at -322ms, 256ms, 1277ms after the tap)
92. the page switch from /: with the app's motion reduced, figure "Pray without ceasing. 1 Thessalonians 5:": transform over 800ms; div "Your rule Choose prayers from the prayer": transform over 600ms
   - seen by: new reader, motion reduced; on 1 screen: /prayers/
   - file: lands on app/(app)/prayers/page.tsx
   - still: `092-prayers-arrival-moves-0.jpg` (frames at -320ms, 210ms, 1245ms after the tap)
