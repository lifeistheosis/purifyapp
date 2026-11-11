# Build 93 on his phone (notes)

Android build 93 (run 42912297514, from `8abb0fc88` on `ccr-07896cf2-bo0afd`),
the test build of 2026-11-10 evening: the release build, R8-shrunk, talking to
the main web (the test web is not set up yet). It holds the plugin-trap mend
(F-51) for the notification-bar player and for the "is Purify blocked" check,
and the headphone-button receiver.

What build 93 cannot show, so not bugs (it talks to the live 1.8 website):
campaigns, journal sharing, the new sync, the Bibles' downloads, the 1.9
counts, the Psalms move.

He is walking it under his word of 2026-11-11 about 00:56 UTC, "rec for all and
finalize this build", so each note here is a fix for 1.9 unless it asks for
something new, which goes to his page as a call. Each note says what he saw, in
his words with his screenshots, and who has it.

## His notes

### 1. St Alexander's picture is missing on Nicaea's page, and Back lands at the bottom (2026-11-11 about 01:13 UTC)

His words: "So, image 1 is the first council of Nicaea. Image 2 is me clicking
on St. Alexander the Great, his profile photo. Also, you could clearly see that
his photo isn't loaded. And when I go to image 3, right, when I click back to
go back to the first council of Nicaea, it scrolls all the way down. Well, it
actually doesn't scroll, it just randomly places you at the bottom of the first
council of Nicaea, which is an issue because it should be placing you at the
top of the page of first council of Nicaea."

Screenshots: `build-93/01a-nicaea-fathers-row.png` (the Holy Fathers row, St
Alexander's circle empty), `01b-alexander-page.png` (his own page, with an
icon), `01c-back-lands-mid-page.png` (Back from his page lands deep in the
council's text, not where he was).

What the code says (the arbiter, read only):
- St Alexander's icon, `/saints/icons/alexander-of-alexandria.jpg`, has no
  source, licence or attribution recorded (`lib/saints/iconRights.ts`: a
  contemporary painted icon, his name in Latin letters, not found on Commons).
  The council's row (`components/councils/CouncilFathers.tsx`) draws only
  pictures whose rights are recorded, so it draws an empty circle, while his
  own page still shows the unrecorded icon. So two faults: an empty circle
  where the plate should stand, and a picture with no recorded rights on his
  page.
- Back: the app starts the step back itself so the page transition can run
  (`docs/1.9-build/notes/transitions-fable.md`, point 3); the scroll put back
  on the council's page is wrong.

Who has it:
- Updates 2 (icons): a public-domain icon of St Alexander of Alexandria, or the
  plate, the same picture on his page and in every row; and never an empty
  circle anywhere: where no cleared picture exists, the plate.
- Fable Theology (built the page transitions): Back returns a page to where the
  reader left it (here, the top of Nicaea's page), on every page with a way
  back, with a test.

### 2. Easy Scroll on the prayers still fights the finger (2026-11-11 about 01:19 UTC)

His words: "The smooth scroll on the prayers is still buggy. Like it when I try and scroll down, it scrolls back up. When I try and scroll down, it just keeps on scrolling, so it's still buggy. And I guess it's just not refined for like UX experience"

History: build 89 note 7 (Easy Scroll, `3be66d8c1`), build 90 note 6 (a stop at every verse, `4639fa9e8`, Updates). Two faults now: a swipe down is pulled back up, and a swipe down runs on.

Who has it: Updates (built both rounds). The bar, on the arbiter's word under his "finalize this build": the scroll never fights the finger. Find what pulls the page back and what lets it run on, on the export with real touch, at three sizes, swiping down and up. If a fix that feels like the phone's own scroll is proven there within about three hours, ship it; if not, 1.9 ships the phone's own scroll on the prayers with no snapping, keeping what readers gain from it (the verse at the reading place lit, the click as each new prayer arrives, each prayer counted as it is passed), and the snapping waits for 1.9.1 and his word.

### 3. Reading mode: tapping a look changes nothing (2026-11-11 about 01:20 UTC)

His words: "So this screen actually doesn't do anything. When I click on the stuff, it doesn't change anything."

Screenshot: `build-93/03-reading-mode-dawn-not-applied.png`: You, Reading mode, "These apply everywhere, not only in the Bible and the Fathers."; Dawn (Night) carries the check, yet the screen stays Dark. The looks are 1.9's Plus themes (`lib/reader/readingModes.ts`); build 93 is the release build on the main web, and he walks it as a new reader would.

Who has it: Fable Themes (built the looks and the picker). A tap must always visibly do something: a reader with Plus wears the look at once, everywhere the subtitle promises; a reader without Plus sees the house's Plus preview or sheet, never a check with no change. Find which happened here and why, fix it, and hold it with a test and a walk on the export as a reader with Plus and as one without.

### 4. The reader's Reading mode section: refine it and its design (2026-11-11 about 01:21 UTC)

His words: "Refine this section and refine the design also."

Screenshot: `build-93/04-reading-mode-chips.png`: the reader's settings, "Reading mode": a grid of radio-dot boxes (Dark, Light, True black, Candlelight, Monastery), the earned palettes in dashed boxes with a count ("Councils 0 of 19", "Cappadocian 0 of 3"), Cappadocian alone on its row, and "See all" under it (`components/reader/ReadingModeChips.tsx`).

Who has it: Fable Themes, with note 3 (the same looks). His rules for it: minimal, photos over words (each mode shown as itself, as the Reading mode page's small pages already do), no dashed placeholder boxes, no orphan on a row, floating pills only where they belong, 44px to the touch, the house's motion. A still before and after goes to the arbiter with the push, for his next walk.

### 5. An event's timeline: the click as you scroll, and a better design (2026-11-11 about 01:24 UTC)

His words: "Remember, on this section, I wanted you to add haptic feedback and make the design more... I feel like you can make the design better on this. It's good, but..."

Screenshot: `build-93/05-history-1054-timeline.png`: Discover, history, 1054, Story: the map (a grey sea and land, one white dot), then the timeline, each event's year printed twice (a year at the left, the same date again over the words: "867" and "867", "1014" and "c. 1014 · Rome").

Who has it: Updates (built the history pages' rows and top, build 89 note 15 and build 90 note 4), after Easy Scroll. What it asks: the click as each event reaches the reading place, from the house's own `lib/ui/scrollTicks.ts` as the chapter strip and the saints' timeline already have, off when the reader turns the clicks off; and a refined design under his standing rules (minimal, photos over words, one year per event, the map naming its place in the house's look, the event's own period pictures where `EventPictures` has them, no side stripes, 44px, the house's motion, checkMock on five palettes). A still before and after with the push.

### 6. Settings, Language: the list opens off the screen (2026-11-11 about 01:25 UTC)

His words: "clear design flaw here"

Screenshot: `build-93/06-language-list-off-screen.png`: the language list opens as a floating panel that starts past the left edge, so the names are off the screen and only the check shows.

Already mended after build 93: `209c3ad64` (Updates 2, 2026-11-10 22:31, "The language list opens whole on the screen, its last languages in reach"; build 93 is from `8abb0fc88`, 22:10, so it does not have it; `build-90/c17-language-list-390.png` is the mended list). But the mended list is still a floating dropdown over the page, scrolled part way, with the page showing round it.

Who has it: Updates 2 (LocaleMenu). On the arbiter's word under his standing rules: the language opens the house's own sheet from the foot of the screen, every language by its own name with its English name beside it, the reader's own language checked and in view when it opens, Arabic and Urdu mirrored, 44px rows, the house's motion, never a floating panel. A still with the push.

### 7. The sparkle star is AI slop: replace it everywhere (2026-11-11 about 01:27 UTC)

His words: "I made it very clear to not use this icon widget design of that like star, because that is a vibe coded AI slop detected design. So anywhere where it's used, replace it with a new design."

Screenshot: `build-93/07-whats-new-sparkle.png`: Settings, "What's new", a four-point sparkle in the row's icon tile.

Where it is (the arbiter, by search on the branch): the `Sparkle` icon (`components/ui/icons/Sparkle.tsx`, "Four-point spark for the verse highlight toggle") in `components/community/NotificationsInbox.tsx`, `components/community/profile/ProfileViewer.tsx`, `components/journal/PageBlocks.tsx`, `components/journal/TodayPage.tsx`, `components/saints/ParagraphRow.tsx`, `components/settings/SettingsClient.tsx`, `components/billing/plusTry/TryProfile.tsx`, `components/bible/VerseRow.tsx`, `components/shop/PrayerCornerSet.tsx`, `components/shop/CartSignals.tsx`; the ✦ glyph in `components/calendar/FeastPanel.tsx` and `components/calendar/Colophon.tsx`. Not sparkles: the five-point `Star` of bookmarks and ratings, and the eight-point `Octogram`. `lib/community/symbols.ts` names ✨ only to draw what readers type, which stays.

A standing guardrail from now (CLAUDE.md, "No sparkle star"). Who has it: Admin (free until the note freeze): each place gets an icon from `components/ui/icons` that names what the row or control is, chosen per place and listed in the record; the `Sparkle` icon leaves the set; `lib/ui/__tests__/noSparkle.test.ts` fails on the icon and the glyphs in app/, components/ and lib/ (readers' own text excepted by name); `checkMock` gains a `sparkle` rule with its self-test. Stills of the changed rows with the push.

### 8. The journal: a tap on Title brings an explanation, and it feels buggy (2026-11-11 about 01:28 UTC)

His words: "say 1,000. Refine the journal section because when I click title or anything, so just a quick explanation of how it works. Honestly, just buggy"

Screenshot: `build-93/08-journal-composer.png`: the day's page (Tuesday, November 10, Gospel Luke 12:42-48), Reflection, Prayer, Question, Title, Add to a notebook, the words, and the bar Verse, Quote, Highlight (its sparkle goes with note 7), More.

What the code says (the arbiter): the 1.9 tour's first stop is "the journal's page for the day" (`1ad21aa9d`, Updates 2), so a tap on Title or the words most likely met the tour's explanation instead of the field.

His second message, a minute later, with `build-93/08b-journal-blocks.png` (two empty "The words you are quoting / Who said it" blocks, the verse search open at the foot): "Honestly, that same bug happens in each of these sections. I want all of it refined, and I want all of them to actually be unique in their context and their use."

Who has it:
- Updates 2 (built the 1.9 tour): the tour never takes a tap meant for the page; a tap on a field goes to the field, and the tour steps aside or ends. Small, first.
- The prayer campaigns chat (Fable), once campaigns are done for 1.9: the journal's page refined whole. Walk every block (Verse, Quote, Highlight, More and what it holds) as a new reader and as an updater on the export, mend every rough edge (a tap that brings an explanation, a block added twice, focus, the keyboard, Done), and give each block a form of its own that fits what it holds and how it is used (a verse looks and reads as Scripture with its place, a Father's words as a quotation with its source, a highlight as the marked text), under his standing rules (minimal, photos over words, no sparkle, no side stripes, pills only where they belong, no box around a tapped field, 44px, the house's motion, checkMock on five palettes). The journal was built by the previous arbiter chat and last touched by Updates (stop sharing), whose lines stay as they are. Stills before and after.

### 9. The journal and the Florilegium, always there to choose (2026-11-11 about 01:30 UTC)

His words: "Ensure the journal and anything related to that specific journal UI, like the florigelium, ensure it's all available to be chosen on the settings page."

Screenshots: `build-93/09a-your-journal.png` (Your journal, reached from the Bible tab: the day, its readings, "Nothing written yet", Write) and `09b-you-page.png` (You: a verse you kept, What you have kept, Your rule, Settings).

What the code says (the arbiter): You shows a journal tile only once something is written (`components/you/KeptShelf.tsx`, `newestNote ? <Tile href="/journal"> : null`), and the Florilegium (`app/(app)/florilegium`) has no way in from You at all. Read as: on You, the page with Settings, the journal and the Florilegium are always there to open, written in or not, beside what is kept; and both are found from Settings' search.

Who has it: the prayer campaigns chat, with note 8, so the journal's page, its way in and the Florilegium are designed together under his standing rules. If the chat reads his words as a setting to choose what You shows, it says so with its plan and the arbiter asks him.

### 10. Support this work: say where the money goes (2026-11-11 about 01:31 UTC)

His words: "Go on certain things. The support this work section is pretty much useless. You can explain how and where the profits would go in reference to, you know, store and subscription usage. So explain that it goes into sourcing products, tithing to the church, running maintenance, etc., and that they could support through either the subscription or buying a product from the store."

Screenshot: `build-93/10-support-this-work.png` (`components/support/SupportBody.tsx`).

Found by the arbiter, and wrong today whatever the rewrite: "Nothing in this app is locked behind a payment." (`ui.theSaintsTheScripturesWith`) is not true since Purify Plus (the journal, the looks, plans and more are Plus); and "a small community that sources the texts, reviews them" should say only what is done (sourced and checked against their printed editions; no priest reviews Purify at present).

Who has it: Admin (knows the shop, Plus and their money), after the sparkle sweep. The page says plainly where what Purify earns goes (sourcing the shop's products, a tithe to the Church, running and maintaining the app: its servers, its recordings and the work on it) and the two ways to support it (Purify Plus, or something from the EIKON shop), in the house's voice, signed as the house signs, in all 21 languages. Risk rules: it is Purify's own giving from what it earns, never "a part of your purchase goes to charity" and never called a donation (that wording can bring charity-sale rules in some US states, and the stores do not let an app raise money for a charity through its purchases); no figure or receiver for the tithe until his answer (asked in the chat, 2026-11-11); the free core stays named as free. A still with the push.

His answer, 2026-11-11 about 01:34 UTC: "editing the settings. Well, you don't have to be too specific on the percentages. Just make it clear that, like, where the profits are going." So: no percentage and no named parish; the line says plainly that part of what Purify earns is given to the Church, as Purify's own giving.

### 11. Learn by heart: switch the verse any time, learn a quote too, or your own (2026-11-11 about 01:32 UTC)

His words: "Allow you to switch the learn the verse whenever you want. Also allow a learn the quote. And for this example, so it's not just scripture based, it could be realistically any of the quotes that are popular, or maybe they want to pick a custom quote, allow them to do that, or a custom verse."

Screenshot: `build-93/11-learn-by-heart.png` (You: "A verse you kept", Isaiah 53:5, Learn by heart and Share; `components/you/KeptVerse.tsx`, `components/you/PractiseSheet.tsx`, `components/today/RememberCard.tsx`).

Who has it: Fable Theology, after the Back fix (note 1), since it holds the Fathers' words to their editions. What it asks: the reader chooses what they learn and changes it whenever they like: a verse (any kept verse, or any verse), a quote (the Fathers' and the councils' words the app carries, each with its author, work and place), or their own words (a verse or a quote typed in, shown as theirs). The editorial line holds: a "popular quote" is offered as a Father's only when the app's own "Who said it" finds it in a text we carry (`lib/quotes/find.ts`), with the book's own words and place; a line it cannot find may still be learned, as the reader's own text, never under a saint's name by us. Under his standing rules (minimal, photos over words, no sparkle, 44px, the house's motion, checkMock). Plan and time to the arbiter first.

### 12. Every saint has an icon (2026-11-11 about 01:35 UTC)

His words: "Ensure every single saint has a icon photo."

Screenshot: `build-93/12-thomas-on-the-plate.png`: the saints' list, the Holy Apostle Thomas on the plate ("HA").

Where it stands: 30 saints have no sourced picture (`notes/build-90.md`, the icons record): St Thomas among the nine copied files taken off (2026-11-10); St Mark of Ephesus, St Symeon the New Theologian, St Hosius, St Theodosius with no old icon that passes; seven modern saints on the plate by his word of 2026-11-10, "modern saints on the plate until a painter or monastery gives written permission" (St Paisios, St Porphyrios, St Silouan, St Justin Popović, St Cleopas, St Sofian, St Dumitru Stăniloae); and December's four whose only icons show their deaths (call 30, quiet or plate).

His new word is the goal: no saint on the plate. Who has what:
- Updates 2: every saint with an old public-domain icon anywhere gets it, every plate looked at again, St Thomas first (an apostle, painted on every iconostasis), at Commons' pace; then the list of saints left with no public-domain icon, each with the best modern icon found, its painter or monastery, and where they can be written to.
- The December chat: the four martyrs take a detail of their own icon that shows the saints and not the killing (both of his words kept: an icon for every saint, and no killing on a first picture).
- Admin, from Updates 2's list: a short letter per painter or monastery asking written permission to show that icon in the app and on the website with their credit, for him to send himself; a fee, if asked, comes to him.
- Until a permission arrives in writing, that saint keeps the plate (his rule of 2026-11-10 stands for modern icons).

### 13. In a Father's work, highlight and quote any words, not only the whole paragraph (2026-11-11 about 01:37 UTC)

His words: "allow you to quote sentences and highlight whichever section or whichever word you want in the actual work itself, so it doesn't just highlight the whole paragraph."

Screenshot: `build-93/13-works-highlight-paragraph.png` (St Cyprian, On the Mortality, chapter 2: a tapped paragraph drawn in a thin box, and the sheet "Highlight paragraph", seven colours, copy, link, keep, note; another app's floating video at the top right is hidden in the copy kept here).

Who has it: the Fable voices chat, as the first part of its plan (highlight and share on every historical text, no spend, fits 1.9), started now on the arbiter's go while the voices themselves wait for his call. What it asks: the reader selects any words (a word, a sentence, a run across lines) in a Father's work, and in the lives, councils, theology and history the plan names, and highlights them, quotes them, keeps them, shares them as a picture or writes a note on them; a whole paragraph stays one tap away. A highlight is kept by its place in the text so it survives a mended typo; it syncs once his sign-off on the annotations migration is in (its SQL to him in the chat), and stays on the phone until then. The tapped paragraph is shown the house's quiet way, not in a box. His standing rules throughout.
