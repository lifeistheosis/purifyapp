# Build 89 on his phone (notes)

Android build 89, from `4ab8e9cc` on `ccr-07896cf2-bo0afd` (the first build
that says 1.9), installed from the `android-release` page on 2026-11-10.
Brainstorm mode is on (his word: "Okay, so brainstorm mode on. I'm going over
the app right now. I'm gonna send you a bunch of things to fix or revise."):
each note says what he saw, then the cause found in the code and the fix
planned. Nothing here is built until he says start.

What build 89 cannot show, so not bugs (the build talks to the live 1.8
website and database until release day): the five Bibles' downloads, journal
sharing and Stop sharing, readers' things on Psalms 113 to 115 before the
release-day SQL, the new sync slices, the 1.9 counts. It also predates 85, 10,
80, the covers pack, 79, 88, 8 and the 1.9 tour.

## His notes

**Start, his word, 2026-11-10 (about 01:55 UTC):** "But that's everything for now, right? Obviously, I can have more critiques ... You could start working on the fixes, right? While I do my thing, and when I come back, you could just update me on the status." Given out the same minute: Admin, notes 9, 14, 13 and 11; Updates (after 79), notes 8, 10 and 7; Updates 2 (after 88 and the 1.9 tour), notes 1 and 5, then 12, then 3 once its icons are found and his OK is in; Fable 5.2 on the Theology pages, note 2, then 4, then 6 with the Florilegium of 12. Every redesign sends one still to him through the arbiter before it is pushed.

### 1. No side stripes (2026-11-10)

What he saw: the grey bar down the left of the reading room's editorial summary ("Editorial summary · Summarized by the editorials, not St. Gregory Palamas's words") and of the councils' quotes under "In the council's own words" (`build-89/01-stripe-editorial-summary.png`, `build-89/01-stripe-council-words.png`). His words: "the line on the left is a vibe-coded AI slob guardrail that gets hit, and it gets detected through impeccable, which is an AI slob detector. So add this to our guardrails because it's implemented throughout certain sections, and we cannot have this." The rule is in CLAUDE.md.

Where it is (a first count by source, 2026-11-10): one-sided borders in about 21 files. Side stripes on content: the heresies page, the commentary sheet, the study rail, Plus's cross-references preview, the florilegia hub, the saints' voice band, the theology study parts and topic reader, the apologetics reader. Dividers that may be true dividers: the calendar grid, admin tabs, the shop's sub-tabs, the player sheet, press-to-copy. Quotes styled by a shared rule (a blockquote or typography style) are not in that count, so the export walk finds them by computed style.

Planned fix (on his start): every side stripe on content comes out, and the quote or note stands on its own type (indent, italic serif, the citation under it, the label above), drawn from the app's own components and checked with `checkMock` on all five palettes; a test over app/, components/ and lib/ in the shape of `lib/ui/__tests__/noRays.test.ts`, plus `checkMock`'s `stripe` on every screen of the export, with an allowlist naming each true divider and why.

### 2. The four Theology pages, revamped by Fable 5.2 (2026-11-10)

What he saw: the pages behind Theology's four buttons, Doctrine (`app/(app)/theology/doctrine/page.tsx`), Topics (`app/(app)/topics/page.tsx`), Heresies (`app/(app)/heresies/page.tsx`) and Apologetics (`app/(app)/apologetics/page.tsx`): an eyebrow, a giant headline sentence, a lede and a list under hairlines (`build-89/02-theology-*.png`). The four buttons themselves (`components/theology/TheologyLibrary.tsx`, `build-89/02-theology-the-four-buttons.png`) are the revamped look he likes. His words: "So these sections need to get revamped. I let Opus 5.5 try and revamp it, and as you can tell, it still looks like the old version, and it still looks AI like vibe coded slop ... I want you to give this to Fable, and the newest model Fable, before Fable works on it, right? Send a message to it to activate it, so I can change the effort to max ... after we confirm that I've changed the effort, then you're gonna tell Fable to revamp it using our style, what style we've been using. And I want to make it very clear that the 4 buttons that you see, those are the revamped version. So the buttons look nice. I'm talking about the pages within those buttons that it links you to."

Plan: a Fable 5.2 chat (session_01VuYTwbjdKohi9QuNXgkgAP, created at effort Max) gets its brief once he confirms the effort. It revamps the four pages in the house style, renders one still of each from the export with `checkMock` passing, and the stills go to him before the change is pushed.

### 3. A cover on every book in the reading room, and an icon on each feeling (2026-11-10)

What he saw: works on the plain plate in the reading room's rows (St John Cassian's Institutes and Conferences and On the Incarnation of the Lord, St Celestine's Letter to the Synod of Ephesus), and the How you feel doors (Love, Anger, Hatred) with no picture (`build-89/03-covers-*.png`). His words: "So I want every single book in reading to actually have a cover photo. As you can see, there's some books in there that are attributed to councils. Like, you can easily do the icon of the council, right? So yeah, just fill it up, fill all of it. Make sure it's attributed or related to the text, like the author, right? Or the historical context. And in terms of the how you feel section, so like love, anger, hatred, we can also attribute an icon that is attributable to that specific feeling. So, you know, if there's an icon on love, icon on anger, hatred, so all these things, or an icon attributed to a saint that is also attributed to that specific emotion, that would help. And yes, ensure it's an Eastern Orthodox canonical saint."

Where it is: `lib/reading/authorCovers.ts` (each cover's Commons source, checked by the rules in its header; 15 subjects found nothing that passed in 1.7.2 and keep the plate), `scripts/fetch-author-covers.mjs`, `docs/licensing/COVER_ICONS.md`; the feelings row is `lib/reading/feelings.ts`.

Planned fix (on his start): every work on the plate gets a cover, the author's icon first (old Orthodox icons, frescoes and mosaics; for a Latin Father with none, an old Western painting, as the rule already allows), a council's own icon for a council's texts, and for a work with no author, the event or place it belongs to. Each feeling's door gets an icon of a canonical Orthodox saint known for that struggle or virtue, or an icon of the virtue itself, each with its reason, listed for his OK before it ships. Public domain only, through the same checks. The covers pack (being built) carries these maps too, if it costs little, so a cover found after 1.9 goes live from the website without a store build.

### 4. Every page switch moves (2026-11-10)

What he saw: tapping a card on Prayers' Practices (The Hours, Akathists, Learn to pray, Your rule; `build-89/04-transitions-practices.png`) brings the next page up at once. His words: "Can you improve the UX experience when clicking these buttons? Because it just instantly pulls up the page. Like, there's no clean UX experience, transitioning from page to page. Also, I want that to be the standard too with every single page switch. I want there to be a UX experience, or a UX addition to make transition smoother." The standard is in CLAUDE.md.

Where it is: the app already tunes the View Transitions crossfade (`app/globals.css`, 420ms on the house curve, none under reduced motion), but only the reader's focus mode calls it (`components/reader/ReaderPrefs.tsx`); route changes in Next 16 are instant. The Android WebView (Chromium) and WKWebView on iOS 18 support same-page view transitions; older iPhones fall back to the cut.

Planned fix (on his start): read Next 16's own guide in `node_modules/next/dist/docs` first, then every route change runs as a view transition: forward settles in, back returns, tabs cross-fade, on the house curve, under about 350ms so it never slows a reader; a card whose picture leads to its own page carries the picture into the page's header (Practices, the reading room's covers, the saints, the four Theology buttons); reduced motion and the reader's own Motion setting keep the cut; checked in the export on Android and on an iPhone, and held by a test that the route wiring stays in place.

### 5. The Florilegium's hub: the same side stripe, and a typed arrow (2026-11-10)

What he saw: the line down the left of each gathering card's quoted line (`build-89/05-stripe-florilegium.png`). His words: "I just caught the vibe coded AI design also here with the line." It is `components/florilegium/FlorilegiaHub.tsx` (border-s-2), already on note 1's list, and Updates flagged it the same night. Seen beside it in the same picture: "Begin a new gathering" ends in a typed arrow (→), which the glyph rule forbids (icons come from `components/ui/icons`).

Planned fix (on his start): with note 1's sweep; the arrow becomes the house's own icon.

### 6. The Florilegium's starters, and where they lead (2026-11-10)

What he saw: the row "Begin with a gathering" on the Florilegium hub (The Prologue of John, The Beatitudes, The Song of the Theotokos; `build-89/06-florilegium-starters.png`). His words: "The UX experience on these need to get fixed also, like these, this section and like where it leads to."

Where it is: `components/florilegium/FlorilegiaHub.tsx` with `lib/florilegium/starters.ts`. The row's title is an uppercase eyebrow; a tile opens a bare sheet (StarterSheet) with the reference, Keep, and the passage a verse a line; Keep makes it the reader's own gathering and stays on the sheet; a kept tile only gains a small tick beside its reference, with no word for what the tick means.

Planned fix (on his start), as one piece of design with notes 2 and 4: the row gets a real title in the house's type, not an eyebrow; a tile opens its passage as a page or a full sheet that carries the tile's icon in (note 4), with the passage set to read, one clear action to keep it, and once kept, a plain line saying it is in the reader's gatherings with a way to open it; the tick becomes words a reader understands. Drawn from the app's own components, `checkMock` on all five palettes, one still to him before it ships.

### 7. The prayer page: its buttons, Easy Scroll with a tick, and no marks on every prayer (2026-11-10)

What he saw: Evening prayers (`build-89/07-prayer-page.png`): the white Begin pill, the Share pill and the round bookmark under the title, and while praying a circle (Mark prayed) and a bookmark under every single prayer. His words: "So for this section, I also wanted the system here revamped. So I don't like the share button like that. I don't like the bookmark button like that. And I don't like the beginning button looking like that. So it just looks unoptimized overall. And also I wanted a scroll system, a new scroll system implemented. So I wanted it to, it's called Easy Scroll. That's what it's we're gonna call it. It pretty much helps you scroll to the next section easily, and it with like an easy swipe. So yeah, it's like a smoother system to scroll. We could implement this in other sections, but I'd say we could start off with the prayers for now, so it's easier. So, and also add a haptic feedback when they scroll to each section, right? ... And also, I don't like the bookmark button just being there in every single individual prayer in the prayers. I don't like that. Like while you're praying, there's like a circle and a bookmark button in each freaking line. I don't like that. That ruins the immersion. And yeah, the overall design could be revamped, but I do like the highlighting. The highlighting is clean, right? Don't get me wrong, I like the text."

Where it is: the prayer reader (`components/prayers/PrayerRuleReader.tsx`, `components/prayers/service/PrayerStep.tsx`, `components/prayers/mine/MyRuleReader.tsx`); the app already carries `@capacitor/haptics` and a soft tick (`lib/ui/softTick.ts`, `lib/ui/scrollTicks.ts`), so no new native dependency.

Planned fix (on his start), as one design with notes 2, 4 and 6:
- The head of the page: one primary way in (Begin) in the house's own button, Share and Save as quiet glyph controls at 44px (or one menu), drawn from the app's components, not the three mismatched pills.
- Easy Scroll (his name): in the prayers first, a short swipe carries the reader to the start of the next prayer and settles there; a prayer taller than the screen scrolls freely inside before the next swipe moves on; a soft haptic tick on arriving at each prayer in the apps; reduced motion keeps plain scrolling, and a setting can turn it off. Other sections later, on his word.
- No circle and no bookmark under each prayer: a prayer counts as prayed as the reader passes it (Easy Scroll knows where they are), one quiet Amen at the end marks the whole rule, and saving a single prayer moves to the long-press menu. The prayer-rule check-offs keep working and keep syncing.
- Kept as they are, his word: the text and the highlighting.

### 8. The prayer book: the screen follows a chapter as it opens (2026-11-10)

What he saw: on the Prayers tab, opening a chapter of the prayer book (Devotional, near the foot of the screen) unfolds it, but the screen stays where it was, so the new page opens under the tab bar and out of sight (`build-89/08-prayer-book-shut.png`, `08-prayer-book-open.png`). His words: "So for this section, when you open it, it bugs out for a little bit and it doesn't open optimized. So for example, if you open it, I like the animation that it has, that it moves, right? The individual like box, but I don't like how it doesn't move the screen also down in a smooth way, right? So if it like opens, right, you notice that it doesn't move with the actual opening. So I want you to fix that."

Where it is: `components/prayers/PrayerBookContents.tsx`. By design (build 87's walk, section 48) the tapped chapter is held where the finger left it while the page above shuts and its own page folds open under it (`.book-fold`, 240ms, held by FOLD_HOLD_MS); nothing then brings the opened page into view.

Planned fix (on his start): keep the fold he likes and the hold that stops the jump; as the page opens, the screen glides with it on the same curve and in the same time, carrying the chapter's title up toward the top (below the header, clear of the tab bar and the safe areas) so its first prayers are in sight when the fold ends; a chapter already in view is not moved; reduced motion opens it in place at once. Checked in the export at 360 and 390 wide, opening each chapter from the foot of the screen.

### 9. Your rule opens on the right part of the day, with no switch (2026-11-10)

What he saw: opening Your rule from Prayers' Practices shows Morning, then slides over to Evening a moment later (`build-89/09-your-rule.png`). His words: "So when you open the your rule, it switches from morning to like night. I want it to just automatically go to wherever it's at in the day, because it kind of ruins the immersion, right? The clean immersion that it has. It makes it look as if like it was bugged and then it just loaded in."

Where it is: `components/prayers/mine/MyRuleBuilder.tsx`. The part is decided after the page mounts (the clock, the address and the kept rule are the device's, so the export cannot bake them): `part` is null until then, and the control then slides to the part the hour gives (`ruleIdForHour`), or to the part that holds prayers.

Planned fix (on his start): the page's first paint is already on the right part. Until the device has answered, neither half of the control is lit and neither part's list is drawn (the space is kept, so nothing moves); when the answer comes, the control is set with no slide and the list appears with the page's own fade. The slide stays for a reader's own tap. The rule for which part opens is unchanged. Checked in the export, opened at a morning hour and at an evening hour.

### 10. All prayers: not a row of floating pills, and a tick as it scrolls (2026-11-10)

What he saw: Prayers' All prayers row (Morning prayers, Evening prayers, The Hours, and on) drawn as outlined pills (`build-89/10-all-prayers-pills.png`). His words: "I want this revamped. I pretty much want haptic feedback when you scroll, and I also want it like the design a little better. I don't just want floating pills. Like, I'm kind of getting sick of the like floating pills, because a lot of vibe coded apps also use that. So it's kind of like a guardrail. Like, don't get me wrong, it's good in certain scenarios and certain cases, but yeah, just not here." The rule is in CLAUDE.md.

Where it is: `components/mobile/PrayersMobile.tsx` (`prayers.allPrayers`). The click as a row scrolls already exists for the Bible's chapter strip and the saints' timeline (`lib/ui/scrollTicks.ts`), so no new native dependency.

Planned fix (on his start), with the design pass of notes 2, 4, 6 and 7: each prayer in the row becomes a small piece in the house style (its own icon or art, its name, its length) in place of a pill, drawn from the app's components and checked with `checkMock`; the row clicks under the finger as each passes the middle, through `scrollTicks`; reduced motion and the browser stay silent, as the strip already does.

### 11. For the living: the sheet revamped, and no box on a tapped field (2026-11-10)

What he saw: the sheet that adds a name to pray for (Name, Relationship, Note "max 500 chars", Nameday "MM-DD", Tags "comma-separated", Cancel, Save), with a thick white ring round the tapped Name field (`build-89/11-for-the-living.png`). His words: "I want you to revamp this system It just doesn't really look good, and there's still that like white box that appears. I want that to be a standard also. A lot of times when you click something and you have to search, it appears a white box or a red box. like outline. I don't like that." The rule is in CLAUDE.md.

Where it is: `components/prayers/Diptychs.tsx` (the fields' `focus-visible:ring-2`), and app/globals.css, where text fields keep the keyboard's ring even after a tap ("since it marks where typing goes"), with an older red ring the owner already caught on 2026-09-27.

Planned fix (on his start):
- The focus standard, everywhere: a tapped field lights its own fill and a fine edge in the palette's ink, with the caret; no thick white ring, no red; the keyboard's ring stays for keyboard users. A sweep of every field and search box, held by a test.
- The sheet, in the house style from the app's components: the name first; the relationship offered as a few common words to tap, or typed; the nameday chosen from a month and day, or by naming the saint whose feast it is, never typed as "MM-DD"; tags as a small choice, or dropped if nothing reads them; the note's limit shown only as it nears; Save as the house's own button. `checkMock` on all five palettes, one still to him before it ships.

### 12. Plus's Try it: show each feature where it is sold, and the Florilegium redesigned (2026-11-10)

What he saw: on the Plus sheet's walk through the features (1 of 12), Cross-references in both Testaments only drops the reader into the Bible at John 1; Greek word study opens nothing; reading plans jumps to the plans page with a cut and a load; the Supporter mark and the Discord status (the desktop app's) lead nowhere (`build-89/12-plus-try-*.png`). His words: "The cross-reference button doesn't do anything. It just takes you to the Bible, which is something we don't want, right? We want each feature to be explained thoroughly, experienced thoroughly, so they can actually understand why it's better to have plus, right? We're trying to sell them on each individual feature. And it's the same with the Greek. The Greek doesn't pull up anything. And the reading plan button, like, it actually does move you to the reading plan section, but I want it to be like a better UX experience. Same thing with the other one, like it just automatically cuts and there's like a weird load, so fix that. And the year mark and the Discord status one just doesn't even lead you to anything. Like, I want each one visualized, explained, and like focused on selling it to the user. And I also want the floor religium, like entire like design revamped. I just don't like that."

Where it is: the rows are `lib/premium/plusRows.ts` (word study, palettes, cross-references, journal, offline, ambience, compare, plans, remember, florilegium, sync, history, profile, the supporter mark, the Discord frames); the previews are `components/billing/plusTry/`. Compare's preview (85, 9dd0cde) is the model: real verses, in the sheet, held by a test.

A first look: a preview exists in code for every row (TryCrossRefs, TryWordStudy, TryPlans, TryMark, TryDiscord, TryFlorilegium and the rest), so what he saw may be partly a fault in build 89 (a preview falling back to its plain card, or its words not loading in the app) rather than a preview never built. Find that out first, on the export and on a phone.

Planned fix (on his start), with the design pass of notes 2, 4, 6, 7 and 10:
- Every row's Try it is the feature itself, small and live inside the sheet, from real words the app carries: a verse with its cross-references beside it; a Greek word tapped to its lemma, parsing and meaning; a plan's first day; and so on. Nothing leaves the sheet to drop the reader somewhere else; where a row opens a page, it moves there with note 4's transition and no load.
- The Supporter mark shown on a profile as others see it, and the Discord status shown as it appears in Discord, each with a plain line on what it is.
- Each preview says in one plain line what the reader gains, never pressure; a test holds every row to a working preview.
- The Florilegium (hub, a gathering, the starters of note 6, the lapsed reader's view of 10) redesigned as one piece in the house style.

### 13. Search's Look in row: the glow and shade behind the pictures are cut off (2026-11-10)

What he saw: on the Search screen, the soft glow and shade behind the Look in tiles (Everything, Bible, Saints, Prayers, Reading) stop at a hard edge above and below the row (`build-89/13-search-look-in.png`). His words: "And I'm not sure if you could see that, but the glow and the shade in the back of the photos actually cut out. So fix that."

Where it is: `components/search/CommandPalette.tsx` (`search.lookIn`). A row that scrolls sideways clips everything outside its box, top and bottom too, so a tile's shadow and the lit tile's glow are cut at the row's edge.

Planned fix (on his start): the row gets room inside itself for the glow and the shade (padding above and below, taken back with a negative margin so nothing else moves), and room at its ends, so every tile's light falls off softly; the same check on every sideways row that wears a shadow (the reading room's rows, the Florilegium's starters, Today's cards), checked by eye in the export on all five palettes.

### 14. Your rule: "In which prayers" drawn like "Add prayers one by one" (2026-11-10)

What he saw: on Your rule, "Add prayers one by one" is a row (its icon at the left, the title and line beside it, the arrow at the right), while "In which prayers" under Those you pray for stacks its icon on top and its arrow under the words (`build-89/14-your-rule-rows.png`). His words: "So on this section, as you can see, the add prayers one by one looks different than the in which prayers. That's a UI bug. I want both to look the same. Realistically, I want the in which prayers to look like the add prayers one by one. So fix that UI bug."

Where it is: "Add prayers one by one" in `components/prayers/mine/MyRuleBuilder.tsx`; "In which prayers" (`community.wallAddWhen`) in `components/prayers/mine/RememberedIn.tsx` (also used by `components/prayers/Diptychs.tsx` and `components/community/AddToPrayersSheet.tsx`).

Planned fix (on his start): "In which prayers" takes the same row as "Add prayers one by one", by using the one shared row rather than a second drawing of it, so the two cannot drift apart again; checked in the export with `checkMock`, and the other places that use RememberedIn looked at in the same pass.
