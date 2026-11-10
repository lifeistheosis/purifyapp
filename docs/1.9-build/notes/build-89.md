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
