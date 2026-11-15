# Build 98: his notes

Build 98 (Android build run 98, id 43747286418, from c8c2d6ace; the app code 78c5297e1), cut at his word (2026-11-15 about 18:30 UTC: "finalize the build and send it"), on the android-release page from 18:39 UTC (app-release.apk, app-release.aab, app-debug.apk). Android only: no iPhone build until he says the build is finished after his critiques (his word, about 18:33 UTC). Named to him with it: the differences until the merge (campaigns, the profile's empty status line, Bible versions, the links to the 86 new works, patrons 162 now and 270 after), the calls he may overrule (the verse landing's 2 s focus dim; a one-screen chapter's Community section only on a scroll), and the gap (See all's list unmeasured with checkMock at 800, 1032 and in ar).

Brainstorm mode is on (his word, 2026-11-15 about 20:54 UTC): notes and plans only. Each note below has his words, word for word, then, once looked into, what was found and the plan. Nothing from them is built until he says start.

## Note 1: the voices

**His words (2026-11-15, about 21:00 UTC),** with a screenshot of the Voice sheet opened over a text with no recording (the phone's own voices only: Voice 1 in American English chosen, Voice 1 to 5 in Australian English, Voice 2 to 7 in American English, each with "Hear it"; no Heart row, no download state): "So we're gonna agree on a voice, like the voices to choose, but also I don't see the new voices added, and also when I click hear it, it doesn't make the distinct player that we talked about."

**Found (the arbiter, 21:07 UTC, from the code of 78c5297e1 and the record):**

- No Heart on that sheet: it lists Heart only where the text has its recording (`components/player/VoiceSheet.tsx`, `lib/listen/speech/voiceChoice.ts`), and only the New Testament has one so far (16.3 hours). A work, a life, a council, a study and an event have none, so the sheet lists only the phone's own voices (`lib/listen/speech/engine.ts`), the ones he found robotic on 14 November (15:50: "quality over quantity").
- "The new voices": none were added. The extra voices for Plus to download, each with a sample (his word, 2026-11-10 about 20:41), were moved to 2.0 by his "rec voices" of 2026-11-11 about 14:24, after a phone was measured making that speech at 0.07 to 0.08 of speaking speed. 1.9 carries Heart, recorded, and from 13 November the phone's own voices for every text without a recording.
- The distinct player: not built. Build 97 note 5's plan (a voice downloaded, not downloaded and downloading drawn distinct, and a sample that shows it is playing) waits on the Fable round (NOW, Waiting on him 1), which waits on his answer on the voices (Waiting on him 10). The arbiter did not name that to him with build 98. That was a miss, and it is named to him now.
- A cost of "Heart only" that the 14 November recommendation did not weigh: Heart speaks English only, and the app is in 19 languages (`lib/i18n/locales.ts`). With the phone's voices dropped everywhere, a page in Spanish, Russian, Arabic or any of the other 16 would have no voice at all until 2.0.

**Plan (his answer decides it; nothing is built until he says start):**

- Recommended: Heart is 1.9's one voice for English, recorded for every English text (the lives, councils, theology and history first, then the Old Testament and the Fathers' works; the recording priced first for his yes, Waiting on him 10). The phone's voice stays only where Heart cannot read, the other 18 languages, and is never offered beside Heart in English.
- With one voice to a language there is nothing to choose, so in 1.9 the Voice sheet and its Hear it go, and with them build 97 note 5's faults (a sample with no sign of playing, no download mark). Heart's recordings still download per text, as Listen offline does now.
- 2.0, as planned on 11 November: the Plus voices, recorded ahead and downloaded by choice, with the Voice sheet drawn again with a sample player that shows it is playing and distinct downloaded, not downloaded and downloading marks.
- If he wants a choice of voices in 1.9 instead: two more of the best recorded voices, made ahead the way Heart is, which triples the recording, and the sheet's design round now (Waiting on him 1). Not recommended: it moves the drop day for a feature, not a fault.

**Samples sent (the arbiter, 2026-11-15, 22:15 UTC),** at his word about 22:11 ("send voice samples here"): John 1:1-5 in the King James Version, the app's own text (`data/bible/john/1.json`), read by seven voices of the same engine Heart comes from (Kokoro 82M, Apache-2.0), made on the arbiter's container on CPU at no cost with `kokoro-onnx` 1.32.0 and the full `kokoro-v1.0.onnx` model of its release: 1 Heart (American woman, the voice in the app), 2 Bella (American woman), 3 Nicole (American woman, soft), 4 Emma (British woman), 5 Michael (American man), 6 Fenrir (American man), 7 George (British man). The engine's makers grade Heart A, Bella A-, Nicole and Emma B-, Michael and Fenrir C+, George C. Kept in `notes/build-98/voice-samples/`. Any voice but Heart means recording every text again in it, the New Testament's 16.3 hours included.

**His choice (2026-11-15, about 22:52 UTC):** "1 (3 for premium) 4 5 6", read as Heart free for every reader and Emma, Michael and Fenrir for Plus (asked of him to confirm). What it takes, from `docs/1.9-build/notes/voices-fable.md`: the phone cannot make these voices as it reads (0.07 to 0.08 of speaking speed, 11 November), so each is recorded ahead for every English text and downloaded by choice; recording on a rented GPU is cheap (at the planned 20x, the lives, councils, theology and history, 81 hours of sound, are about 4 GPU hours, under $5, per voice; the Fathers' works, 544 hours, about 27 GPU hours, under $25, per voice), and needs his account with prepaid credit and the storage key typed into that machine, never a chat; the app's side (the picker with samples, files per voice, the signed route for Plus with its tests, offline per voice) was estimated at 28 to 36 hours of work, medium to high risk (Plus, a new secret, a new route). The week's model limit reads allowed_warning until 2026-11-20 08:00 UTC. The Voice sheet (Heart, the three with the Plus mark, a sample that shows it is playing, downloaded, not downloaded and downloading drawn distinct) joined Fable round 3 at 22:53. The phone's voices leave English; for the other 18 languages, which no recorded voice speaks, they stay unless he says otherwise.

## Note 2: one way to listen, the Bible's

**His words (2026-11-15, about 21:05 UTC),** with a screenshot of On the Incarnation (St. Athanasius the Great) on his phone: the cover, the title and "On the Incarnation of the Word", a Listen pill under them, Chapter 1, and floating at the foot over the words, above the tab bar, the work's pill (the arrow back, "On the Incarnation", the arrow on, a hairline, the sound button): "make the listen system the same as the Bible listening system (UI/ux) one so there isn't a floating button".

**Found (the arbiter, 21:07 UTC, from the code of 78c5297e1):**

- The Bible listens from its own foot pill: the arrows, the chapter, a hairline, the sound, then Listen (`components/bible/MobileChapterPill.tsx`). While anything plays, that pill is the reader's dock, one card for the player and the chapter, which draws in to a small pill as the reader reads on (`components/bible/ReaderDock.tsx`; his pick of 2026-11-06, "B, but when you scroll, it turns into C"), and the mini player steps aside (`lib/player/pagePlayer.ts`). No Listen button stands in the page on a phone.
- Every other text read aloud does it another way. Listen is a button in the page under the title (`components/reading/ListenHere.tsx`, drawn by `components/saints/SaintLife.tsx`, `components/saints/WritingReader.tsx`, `components/councils/CouncilSections.tsx`, `components/theology/StudyPartText.tsx` and `components/history/EventArticle.tsx`), and while it plays the mini player (`components/prayers/NowPlayingBar.tsx`) floats over the tab bar. On a work and a council the work's pill floats at the foot as well (`components/saints/MobileWorkPill.tsx`), with no Listen in it, so while it plays two bars stand one over the other: the fault the Bible's dock was made to end (bug 5 of the 1.9 walk through Plus).

**Plan (nothing is built until he says start):**

- One way to listen on every text, the Bible's, on a phone and a tablet: Listen in the foot pill beside the sound; while it plays, the dock (the player over the text's own row), drawing in to the small pill as the reader reads on; no Listen button in the page, and no mini player stacked over it.
- A work and a council: their pill becomes the Bible's pill and dock, with their own parts' arrows and names. A life, a study's part and an event: the same pill and dock, with the text's own arrows where it has parts and its name alone where it has none.
- Built from the Bible's own components (`ReaderDock`, `MobileChapterPill`), so the look is the one he picked; the one new arrangement is a text with no parts to turn. Before it reaches a test build: stills of a work and a life, at rest and playing, rendered from the export, passed through `checkMock`, each choice with its reason, for his yes.
- Tests that fail on 78c5297e1: none of the five texts draws Listen in the page on a phone, and with something playing each shows one bar, the dock, never two.

## Note 3: the chants door

**His words (2026-11-15, about 21:12 UTC),** with a screenshot of the card on Prayers (a white disc with a play mark; "Sung prayer", "Chants", "Hymns to listen to and pray with, the words lit as they are sung."): "I wanted this design revamped it doesn't fit its purpose".

**Found (the arbiter, 21:16 UTC, from the code of 78c5297e1):**

- The card is `FeatureBand` (`components/mobile/SoftTiles.tsx`), which its own comment calls "the meditation-app 'Daily Calm' idiom", drawn on Prayers on a phone (`components/mobile/PrayersMobile.tsx`, by "The heart of prayer") and on a computer (`app/(app)/prayers/page.tsx`).
- It is a door to the chants library (`/chants`), but the white play disc says a tap will play something, and a tap plays nothing: it opens a page. Nothing on it shows a chant, its words or the singers. A borrowed meditation-app band, not a door made for sung prayer.
- No earlier note of his on this card was found in the record; the gate only measured its contrast (2026-11-11 and 2026-11-13).

**Plan (nothing is built until he says start):**

- The door drawn for what it is, the way into the library of sung prayer: what is inside shown (the chants' own pictures, the Prayer Rope Anthem first, as its comment intends), the name, and no play mark unless a tap really plays. A destination takes a form of its own, pictures or a card, as his rule on pills has it (build 89 note 10).
- Drawn in the Fable round from the app's own parts (the chants pages' covers and tiles), checkMock passing, each choice with its reason, for his yes; then a fixer applies it on both Prayers pages.

## Note 4: the journal revamped, and the freeze when typing starts

**His words (2026-11-15, about 21:13 UTC),** with two screenshots of a journal entry's sheet at 4:13 on his clock (Close, "Sunday, November 15", Done; "Epistle · Ephesians 2:14-22" and Open; Reflection, Prayer and Question; Title; "Write what is on your heart, or pray in your own words."; Verse, Quote, Highlight and More at the foot; in the second, the keyboard up and the four tools standing on it): "I wanted this system and design revamped and when you click to type it still had a freeze frame bug".

**Found (the arbiter, 21:16 UTC, from the record and the code of 78c5297e1):**

- The revamp is build 97 note 2's plan: the writing as its own page, not a sheet; one calm surface (the day and its reading, the kind, the title, the words), one Done, and everything else behind one quiet control. It was to be drawn first in a Fable round of stills (NOW, Waiting on him 1), asked of him at 15:59 on the 14th and again since. No yes came, so nothing was drawn, and build 98 has the same sheet. That should have been named to him with build 98.
- The freeze is the fault of build 97 note 2 ("a jump and a flash for the typing"). The jump inside the page was mended on 14 November (Updates 52). What is left is native (Updates 52, item 4, `docs/handoffs/updates-52.md`): the app has no keyboard plugin, and the window is padded by the keyboard's height in one step at the start of the keyboard's slide (the safe-area plugin's insets listener with no WindowInsetsAnimation callback; MainActivity's EdgeToEdge), so the page is resized at once while the keys are still sliding. It holds, then jumps, and the window's own ground can show under the foot. The native mend waited on his screen recording (Waiting on him 14); his word now is enough to make it.

**Plan (nothing is built until he says start):**

- The revamp: the Fable round draws the journal as its own page first (with note 5's quoting in it), stills at phone width from the app's own components, checkMock passing, each choice with its reason, for his yes; then a fixer builds it. A Fable run costs real compute, so it starts only at his word.
- The freeze: a fixer makes the native mend, so the page follows the keyboard frame by frame as the keys slide (a WindowInsetsAnimation callback setting the padding with the keyboard, not in one step), and removes the scrim's one-frame blink Updates 52 saw. The new page, and every sheet with a field, passes the keyboard walk on the export. Only a phone shows the freeze, so the proof is his walk of the next test build, and that limit is named to him with it.

**Done (Updates 98c, 2026-11-15, a0bf82c95 and fa3af57df; the walk's finding 99e82874f).** The freeze, one native mend with note 12. The safe-area plugin's patch (`patches/@capacitor-community+safe-area+8.0.1.patch`) gives the plugin a `WindowInsetsAnimationCompat` callback (`KeyboardSlide`) on the same window its listener pads: while the keyboard slides, the listener leaves the room at the window's foot where it stands, `onProgress` (which Android runs on every frame of the slide, before that frame is laid out and drawn) sets it to the keys' height in that frame, and at the slide's end the listener settles it as before. It follows the app's own keyboard coming and the room already made going; another app's keyboard met coming back still gets none (build 95 note 14); a slide turned back half way is ended by the next; a slide that loses its end hands back to the listener after 2 s with no frame, so no page is ever left short. No new keep rule: R8 keeps a class the code names. The scrim's one-frame 0px blink (Updates 52, item 4) is gone: its strip is measured from the panel's own top (`scrimStrip`, lib/ui/useDraggableSheet.ts). Proof: compiled here with javac 21 against android.jar 36 and androidx.core 1.17.0; **CI run 43770272198** (Android build, run number 99, publish false, a compile check only, nothing uploaded, not a build for him) **success** on fa3af57df, its signed release AAB and APK built under R8. Tests that fail on 78c5297e1: lib/ui/__tests__/keyboardSlide.test.ts (6 of 6) and lib/ui/__tests__/scrimStrip.test.ts (3 of 3); returnKeyboard.test.ts follows the new padding lines. On the export: `NATIVE=1 DOWN=1 node scripts/keyboard-sheet-walk.mjs out journal frames` (a new mode: a resize on every frame of the slide, 18 frames on the ease-out curve, in and out) ok, the field held at 247.4 and the edge at 12.8 throughout; the same in `step` ok; `living frames` ok (edge 110.6 held, field 266.3); every write to the scrim's strip recorded, none 0px. Typecheck 0, the whole suite green (1,232 files), lint clean.

**What his walk of the next build must check (only a phone shows these frames), on the release APK, not the debug one (R8, AGENTS.md ritual 2a):** (1) The journal on a light palette and on a dark one: tap into a page's words; the keys rise and the foot (Verse, Quote, Highlight, More) rises with them in one motion: no hold, no jump, no dark band under the foot at any moment; Done or Back: the foot goes down with the keys the same way. (2) Search (note 12): tap the field: no stutter, the round plate and "Search Purify" ride up with the keys and are never missing for a frame. (3) For the living on Prayers' own page, a sheet taller than the keys leave: its top edge stays while the field shows. (4) Coming back from another app with its keyboard up: no screen drawn short. (5) Tap a field and press Back at once, the keys turning back half way: the screen settles at the right height, and after the keys have gone no page is left short. (6) Android 15 or 16, the back gesture on the keys held part way: the page follows the keys; held still past two seconds, the room settles where the listener puts it (named, not a fault). Limits: on Android 10 and older the slide is androidx's own stand-in, so keys and room may not move exactly together (as before, no worse); WebView 140 to 143 still change the page's bottom safe area at the slide's start (as before).

## Note 5: quoting real works from inside the journal

**His words (2026-11-15, about 21:14 UTC),** with a screenshot of the same sheet with a Quote block opened ("The words you are quoting" with its cross, then "Who said it" by a speech mark) and the keyboard up: "still wanted you to be able to quote from here by linking real works from purify".

**Found (the arbiter, 21:16 UTC, from the record and the code of 78c5297e1):**

- The plan he agreed on 8 November (`docs/1.9-build/JOURNAL.md`, "In the editor: the Quote block searches the same library: Scripture, the Fathers, the saints' lives, the prayers, the chants") was built from one side only: Quote in journal, from a paragraph held on a library page or a verse's Study (`lib/journal/quoteInJournal.ts`, step 1d). The editor's own Quote (his screenshot) is a quote of one's own only, the words and "Who said it" typed by hand. It never searches the library. Not built, and not named to him: a miss.

**Plan (nothing is built until he says start):**

- The editor's Quote opens a search of Purify's own library (Scripture, the Fathers' works, the saints' lives, the prayers, the chants, the councils). The reader picks the passage, and it lands as a library quote: verbatim, cited, "Quoted from Purify's library", not editable as the source's words, with Open back to its page. A quote of one's own stays as the second choice and never wears the library's mark (`docs/editorial-standards.md`).
- As agreed on 8 November: Scripture and quotes of one's own for everyone, the rest of the library for Plus, shown with the Plus mark.
- Drawn inside the journal page in the Fable round (note 4), for his yes, then built with it. A test that fails on 78c5297e1: the editor's Quote finds a Father's passage and lays it cited.

**Done (Updates 98c, 2026-11-15, a0bf82c95, fa3af57df and 99e82874f).** The editor's Quote (the sheet's Quote tool, components/journal/PageBlocks.tsx) opens a search of Purify's library (components/journal/LibraryQuote.tsx, lib/journal/libraryQuote.ts), built from the editor's own parts so it moves unchanged into the journal's own page Fable round 3 is drawing: the Verse tool's SearchField and rows, More's Plus mark, the house's icons. A verse found lands as its card (as a verse's Quote in journal lays it); a page of the library opens to its passages, with the same field to find the words in them; the passage tapped lands as a library quote exactly as Quote in journal lays one (`libraryBlock`): verbatim, the source named (a work with its Father: "St. Athanasius the Great, On the Incarnation"), "Quoted from Purify's library", not editable as the source's words, Open back to its section (`#s<n>`) inside the app. Words of your own stay its last row, the second choice, laying a quote of one's own with no library mark. Scripture and one's own words for everyone; the Fathers' works, the saints' lives, the prayers, the chants and the councils wear the Plus mark without Plus and open the upgrade named for the journal. **What was used, and why:** the pages come from the app's own search (app/search-corpus.json and lib/search/match.ts); the corpus names pages, not passages, so a work's passages come from its own file (app/saints-data/, lib/saints/writingClient.ts, carried in the apps), and every other page's from the page itself (the paragraphs of its main, fetched with a relative address as the website serves it and the apps carry it). A search of every passage's words across the library was not built: it would need the whole text of the works on the phone at once. Words: reused study.theology.searchLibrary, search.nothingFound, common.back, common.loading, journal.page.fromLibrary; new journal.page.quoteOwn ("Words of your own") and journal.page.quoteFind ("Find the words") in all 21 languages, the 20 translations mine and unreviewed. The test that fails on 78c5297e1: lib/journal/__tests__/libraryQuote.test.ts (the editor's Quote finds On the Incarnation with the app's own search and lays a passage of it cited, word for word, kept as a library quote through the page's save). On the export: `node scripts/quote-library-walk.mjs out` (Write, Quote tapped with a touch, "Incarnation", the work's passages, "became man", a passage laid; Words of your own) (its result is in the next commit, from the export of 99e82874f). Not walked: a life, a prayer, a chant or a council opened to its passages (the same code reads each page's main); the Plus mark seen locked (the gate's export locks nothing without SELLS_PLUS=1).

## Note 6: the Bible versions will not download

**His words (2026-11-15, about 21:23 UTC),** with a screenshot of the Translation sheet at 4:23 on his clock (King James Version (1611) chosen; World English Bible saying "Could not download. Check your connection and try again."; the Russian Synodal 7.5 MB, the Greek Septuagint and Patriarchal text 8.8 MB, the Serbian of Karadžić and Daničić 5.8 MB and the Arabic Van Dyck below, each with a download mark): "its not letting me download any of the Bible version".

**Found (the arbiter, 21:25 UTC, probed and read):**

- No download can work in build 98. The apps fetch a version from the website (`lib/bible/downloads/store.ts`, `/bibles/<id>/`, kept out of the apps by `scripts/native-build.mjs`), and the main web runs 1.8 until the merge: it answers every one 404 (probed 21:25 UTC: `en-web`, `ru-synodal`, `grc-lxx-patriarchal`, `sr-danicic-karadzic`, `ar-van-dyck`, each `index.json` 404 in under a second). Build 95 note 21 found the same, and "Bible versions" was named to him with build 98 among the differences until the merge, but in a list, not plainly enough to save him the walk.
- The words are wrong, a fault in the app. With the website answering in under a second, the sheet should say "Not available to download right now. Try again later." (build 95 note 21's mend, Updates 12, `7ec49b1c`: a failed fetch asks whether the website answers at all, a no-cors HEAD, before it says offline). His phone said "Check your connection". So that mend does not hold on a phone: the reach question fails in the app's web view, or the app asks another address. Its test passes with a stand-in fetch, which is why nothing caught it.
- And so the download path is unproved on a phone. Nothing has downloaded a version end to end in the app since the versions were made, because the main web has never had them.

**Plan (nothing is built until he says start):**

- A fixer finds why the phone takes a 404 for no connection (the address the app asks, the reach question in the web view), mends it, and adds a test that fails on 78c5297e1.
- Proof before the merge, since there is no test web: the web build of the branch run locally answers each of the seven versions 200 with the app's CORS header (curl with the app's origin); and a walk of the export as the app, against those files, downloads every version, reads it offline, and deletes it.
- After the merge, before the store builds: each version's `index.json` and a book probed on purifyapp.net, and one download on his phone.
- Named to him plainly now: the versions download only once 1.9 is on the website.

**Done (Updates 98b, 2026-11-15, `579e30eeb`), the words; the walk past the first version open.** Cause, proved in Chromium against purifyapp.net from https://localhost: the main web's 404 carries `Cross-Origin-Resource-Policy: same-origin`, so the no-cors HEAD to the Bible's own address was refused as no signal is. The question is now asked of the website's icon (`REACH_PATH`, `cross-origin` on every version of the website). store.test.ts fails on 78c5297e1. The branch's web build run here answers all seven 200 with `Access-Control-Allow-Origin: *`; `scripts/gate/bible-downloads-local.mjs` downloaded the World English Bible, read it offline and removed it; the other six wait on the walk (docs/handoffs/updates-98b.md, open 3). Only after the merge: purifyapp.net probed, one download on his phone.

## Note 7: the version chosen in the books sheet

**His words (2026-11-15, about 21:30 UTC),** with a screenshot of the books sheet at 4:24 on his clock ("Luke 10" and its cross; Search the Bible; The New Testament, the Gospels with Luke open on its 24 chapters and 10 lit, then Acts and the Pauline Epistles; Today's readings, Reading plans and Your journal at its foot): "incorporate the change Bible version with this screen".

**Found (the arbiter, 21:33 UTC, from the code of 78c5297e1):**

- On a phone the version is changed from two other places: the line under the chapter's title (`components/bible/TitleTranslation.tsx`, build 93 note 20, his "as easy as switching your chapter"), which opens a sheet of its own, and the reader's ••• sheet (`components/bible/ReaderMoreSheet.tsx`). Both show the same rows (`components/bible/TranslationList.tsx`). The books sheet (`components/bible/MobileChapterSheet.tsx`, opened from the pill's name) has no version in it.

**Plan (nothing is built until he says start):**

- One sheet for where and what you read: the books sheet carries the version being read at its head, by the chapter ("Luke 10", then "King James Version" with its small chevron). A tap turns the same sheet to the versions (the same `TranslationList` rows, downloads with them), and a choice keeps the reader's verse (`lib/bible/keepPlace.ts`) and turns the sheet back to the books.
- The line under the chapter's title opens this same sheet on its versions, so there is one sheet, not two.
- Drawn from the app's own parts, stills from the export through checkMock, each choice with its reason, for his yes; then built, with a test that fails on 78c5297e1 (the books sheet offers the version).

## Note 8: Now Playing opens smoothly

**His words (2026-11-15, about 21:31 UTC),** with two screenshots at 4:30 on his clock: the mini player over Morning prayers (The Prayer Rope Anthem, English, Pause and the cross) and Now Playing open on Cover (the Trinity icon, The Prayer Rope Anthem, English, 2 MB with the download mark, 0:10 of 2:06, back 15, Pause, on 15, next, then Loop, Ambience, Sleep timer and Read): "make the music player opening more smooth".

**Found (the arbiter, 21:33 UTC, from the code of 78c5297e1):**

- Now Playing (`components/player/NowPlayingSheet.tsx`) is built only when it is opened: the tap mounts the whole screen (the large cover, its words view, the controls) and two frames later slides it up over 380 ms. So the slide starts while the phone is still building and decoding the picture, which is where a stutter at the start comes from.
- The grey, blurred copy of the picture behind it (`filter: blur(42px)` on a layer 8rem wider than the screen on every side) fades in over 700 ms inside the panel that is sliding. Its own comment says it is drawn once "once the sheet is up", but it moves and fades during the slide, the costliest thing an Android web view can be asked to move.
- Nothing carries over from the mini player: its disc and the cover are two pictures, so the screen rises from the foot as a separate thing, where the house's way is that a card carries its picture into what it opens.

**Plan (nothing is built until he says start):**

- First measure the opening on the export at a phone's speed (the motion walk's frame times: the longest frame, any blank frame), before and after.
- Then: Now Playing kept built and ready while anything is loaded, so a tap only slides it; the blurred backdrop drawn once the slide has ended, not during it; and the mini player's picture carried up into the cover's place as the screen rises, on the house curve, the controls following. Reduced motion: no movement, as everywhere.
- Proof: the motion walk with no long or blank frame on opening and closing, and his walk of the next build, since only a phone shows the real frames.

## Note 9: the saved line in Now Playing moves the whole screen

**His words (2026-11-15, about 21:41 UTC),** with two screenshots of Now Playing on Cover at 4:41 on his clock, The Prayer Rope Anthem paused at 0:41: in the first, the check mark by the title and under it "The Prayer Rope Anthem (English) is saved to listen offline" and Remove, the cover's top at about 332 and the title's at about 1170 (of 2000 in his screenshot); in the second, no line, "2 MB" and the download mark, the cover's top at about 370 and the title's at about 1250: "optimize the small text that appears here. it moves the whole UI and it doesn't move well".

**Found (the arbiter, 21:43 UTC, from the code of 78c5297e1):**

- The line is `SaveOfflineNote` (`components/player/SaveOffline.tsx`), "the one line about saving, over the player's controls": saving's progress, a wait for Wi-Fi or a signal, a failure, or, once the check is tapped, the saved recording with Remove. It stands in the page's flow with no height of its own when silent (`min-h-0`), so when it speaks it adds two lines, and the Cover view, whose parts are centred, moves the cover and the title up by about 40 and 80 of his screenshot's pixels; when it goes, they fall back. Nothing eases either way: it is a jump.
- Its words repeat the title just above it ("The Prayer Rope Anthem (English) is saved..."), which is why it takes two lines at phone width.

**Plan (nothing is built until he says start):**

- The line never moves anything: its room is kept under the title whether it speaks or not, it says what it says in one line at 360 px, and it fades in and out on the house's curve (reduced motion: no fade).
- Shorter words that do not repeat the title, from the existing keys first ("Saved to listen offline", Remove), in all 21 languages, held to one line in the longest of them and in Arabic.
- The same for every state the line has (saving, waiting for Wi-Fi or a signal, failed), and for the Words view.
- A test that fails on 78c5297e1: the cover's and the title's boxes stay where they are as the line appears and goes, at 360, 390 and 412, and in Arabic.

**Done in part (Updates 98b, 2026-11-15, `579e30eeb`).** The line keeps one line of room always, says each state in one line without the title, fades on the house curve. savedLine.test.ts fails on 78c5297e1. `scripts/gate/saved-line.mjs` on build 98's export: the title moved 37 to 56 px; on mine nothing moved at 360, 390 and 412. Open: the Wi-Fi wait and the saved words overflow 360 in twelve languages (docs/handoffs/updates-98b.md, open 1), and the walk's Arabic pass (open 2).

## Note 10: the prayer campaigns are still not there

**His words (2026-11-15, about 21:42 UTC):** "and I STILL don't see the prayer campaigns."

**Found (the arbiter, 21:44 UTC, from `lib/campaigns/flags.ts` on the branch and the record):**

- Build 98 carries the campaign pages (`CAMPAIGNS_OPENING` is "testers" on the branch), but an app shows their doors only when the website says yes (`lib/campaigns/useCampaignsOpen.ts`). The main web runs `main`, where the switch is still closed, so it says no to every account, his too, and build 98 shows nothing. No build can show them before the merge, because the website side (the routes, and the SQL he signed) only reaches the main web with it.
- He chose this on 2026-11-11 ("I won't make the test web just make it public. im tryna get v1.9 out as soon as possible"): the test web would have shown them in a test build; without it, the release-day order in `flags.ts` stands in for it. It was named with build 98 among the differences until the merge, and with build 95 (note 2) before, both times in a list. He has now walked two builds expecting them. The arbiter should have said it on its own line, in plain words, with the day he will see them.
- An app follows the website with no new store build, so build 98, already on his phone, shows campaigns for his account the moment the merge is live.

**Plan (no build change; his word decides the order):**

- Release day, in `flags.ts`'s order: the merge carries campaigns at "testers", so the main web shows them to his account alone and runs his signed SQL; he walks them on his phone (build 98 or the next); one line opens them for every reader, at his word and once the words that are his, a lawyer's and a priest's are settled (items 113 and 129); then the stores.
- Until then, every message that sends him a test build names campaigns on its own line: "not until 1.9 is on the website".
- If he wants them on his phone before release day, the only true way is the test web, which he declined on 11 November; it would take his steps on Render and a day of setup. Not recommended: it moves the drop day for a look he gets on release day anyway.

## Note 11: the profile revamped

**His words (2026-11-15, about 21:53 UTC),** with two screenshots at 4:53 on his clock: Profile (the round picture with the cross, "Purify", his account's email address under it, Edit; Member since May 2026, Last signed in 3 hours ago, Plan Purify Plus; Your Community profile, "Your handle, status, badges and how your card looks."; Patron saint, its note about the feast morning, and the Holy Apostle James, Son of Zebedee, Feast April 30) and the You tab under its fresco (the picture, "Purify", "Your profile" and its chevron, eight round badges, 9 days with the week's dots, "This week · 3 verses kept · 2 notes written", Where you left off with Morning prayers, Homilies on the Gospel of Matthew and Luke 10, then A verse you kept): "can your revamp the your profile screen".

**Found (the arbiter, 21:55 UTC, from the code of 78c5297e1):**

- "Your profile" on You opens Profile (`app/(app)/account/(signed)/profile/page.tsx`, `components/profile/ProfileTabClient.tsx`). On a phone it is three things: `ProfileHero` (the picture, the name, the sign-in address, Edit, and three facts in a list: member since, last signed in, the plan), a row to the Community profile, and the patron saint (`PatronSaintPicker`). A computer adds the stats, the activity and the settings links.
- It reads as an account's record, not as who the reader is: the sign-in address stands under the name, large, on a screen people screenshot and share; "Last signed in" means nothing to a reader; the plan is a row of text; and what is the reader's own (the patron saint, the badges, the days kept, the Community card) is split between this page, You and the Community profile, a tap apart.
- You is in round 3 of the fifteen screens (the Bible's opening, You, Plus), which waits with the Fable round (NOW, Waiting on him 1). Profile was not in it.

**Plan (nothing is built until he says start):**

- Profile joins the Fable round beside You, drawn as one design, so the two read as one place: who the reader is first (the picture, the name, the patron saint and the badges), the life they keep (the days, the week) and the Community card, with the account's facts (the address, the plan, sign-in) moved behind Edit or into Settings, not on the face of the page.
- Stills at phone width from the app's own components, checkMock passing on all five palettes and in Arabic, each choice with its reason, for his yes; then a fixer builds it with a test that fails on 78c5297e1.

## Note 12: the search still stutters as it opens

**His words (2026-11-15, about 22:00 UTC),** with a screenshot of Search at 4:54 on his clock (Search; Look in: Everything, Bible, Saints, Prayers, Reading; Today: Ephesians 2:14-22 · Luke 10:25-37, St. Paisius Velichkovsky, The Ninth Hour; the round plate and "Search Purify" above the keyboard): "when click the search there's still a random screen stutter that makes it not smooth".

**Found (the arbiter, 22:03 UTC, from the record and the code of 78c5297e1):**

- The page's half was mended for build 95 note 5 (Updates 4, `8f03f670`: Discover was cut away and the screen's words faded in on a dark ground) and is held by `lib/search/__tests__/searchMotion.test.ts` and `scripts/search-motion-walk.mjs`.
- What is left is the cause named then and not mended, the same as note 4's freeze: the field takes the focus, the keyboard rises, and the app's window is made shorter by the keyboard's whole height in one step (the safe-area plugin's padding, no WindowInsetsAnimation callback). The frame in which the window shrinks is drawn before the page is laid out at its new size (build 95 note 5: "the field is missing from that one frame"), so the screen stutters once while the keys slide. A browser cannot show it; only a phone does, which is why every walk passed.

**Plan (nothing is built until he says start):**

- One native mend for note 4 and this note: the window follows the keyboard frame by frame as the keys slide, not in one step, so no frame is drawn at the wrong size. One fixer holds both.
- The search's own walk and test run again on the export, so the page's half stays mended; the proof of the native half is his walk of the next build, named to him with it.

**Done (Updates 98c, 2026-11-15, a0bf82c95).** The native mend of note 4 takes this note: the window follows the keys frame by frame, so no frame is drawn at the wrong size. The page's half stays mended: on the export `node scripts/search-motion-walk.mjs` ok (gone within 600ms at +266ms; the tab bar on its way back while it fades; a row of the day chosen fades as its page comes; with Purify's motion off, there at once and gone at once) and its `--self-test` ok (2 as they should be). The proof of the native half is his walk of the next build, item (2) under note 4.

## Note 13: a chant's words follow the singing once it starts

**His words (2026-11-15, about 22:02 UTC),** with a screenshot of The Prayer Rope Anthem's page at 5:02 on his clock (the Trinity icon, "Performer not known", "English · Hymn"; Words, About and Versions with Words chosen; lines from the middle of the song in view, none lit; the page's player at 0:07 of 2:06, playing): "it should automatically follow  the lyrics one started".

**Found (the arbiter, 22:04 UTC, from the code of 78c5297e1 and a probe):**

- The words are `ChantWords` in `LiveCaptions` (`components/player/LiveCaptions.tsx`, look "page"), in their own scrolling box between the doors and the page's player. Following is built: while the version plays and its timing is known, the line being sung rises to a third of the way down, unless the reader has scrolled in the last few seconds. The timing is in the apps (`CHANT_TIMING`, `lib/chants/media.ts`), and the main web serves it too (probed 22:03 UTC, `/chant-timing/prayer-rope-anthem/en.json` 200), so this is not the website.
- What his screenshot shows: playing at 0:07, the box still where it was left, in the middle of the song, and no line lit. Following moves the words only when a line is being sung and the reader has not scrolled for a while, so in the opening seconds before the first line nothing moves, and a box scrolled before Play stays there. Pressing Play does not bring the words to where the singing is. Not yet reproduced on the export: a fixer reproduces it first.

**Plan (nothing is built until he says start):**

- When a version starts (Play, a seek, the next version), the words go at once, on the house curve, to the line being sung, or to the first line in the opening before any is sung, wherever the box had been scrolled; then they follow line by line. A reader's own scroll pauses the following for its few seconds, and it comes back by itself. Reduced motion: the words move without gliding.
- Reproduced first on the export (the Anthem, Words, the box scrolled to the middle, Play), then mended, with a test that fails on 78c5297e1: from Play, the first line comes into view within a moment and the sung line stays in view to the end. The same in Now Playing's Words view, which shares the code.

**Done (Updates 98b, 2026-11-15, `579e30eeb`).** Play, a seek and another version bring the words to the line being sung, or the first in the opening, wherever the box was (lib/player/meetSinging.ts, LiveCaptions.tsx, Now Playing's Words view too). meetSinging.test.ts fails on 78c5297e1. `scripts/gate/chant-follow.mjs`: build 98's export FAULT 4 of 4, mine ok 4 of 4, motion on and off.

## Note 14: a stutter switching tabs while something is loaded in the player

**His words (2026-11-15, about 22:04 UTC),** with a screenshot of the foot of Luke 10 on a phone: the reader's dock (the Trinity icon, The Prayer Rope Anthem with its progress, Play; Luke 10 with its arrows, Listen and the sleep timer) above the tab bar (Today, Bible chosen, Discover, Prayers, You): "also there's a small stutter when switching between these screens".

**Found (the arbiter, 22:05 UTC, from the code of 78c5297e1):**

- While anything is loaded, the foot of the screen changes hands at every switch to or from the Bible: on the Bible the reader's dock is the player (`components/bible/ReaderDock.tsx`), and everywhere else the mini player is (`components/prayers/NowPlayingBar.tsx`). The mini player leaves by vanishing (`if (!visible) return null`, the moment the Bible says it is the player for everything, `lib/player/pagePlayer.ts`) and comes back the same way, with no move of its own, while the page itself moves in the page switch. Two bars that are one thing to the reader cut out and in under a moving page: that is the stutter.
- The motion walk (`scripts/motion-walk.mjs`) never had anything loaded in the player, so no tab switch with the dock or the mini player was ever measured. Every walk passed without seeing it.

**Plan (nothing is built until he says start):**

- The dock and the mini player read as one surface at the foot: at a switch, one turns into the other in the page switch itself (one name for both in the View Transitions, so the bar morphs from one form to the other on the house curve), and the room each page keeps at its foot changes with the move, not before it. Reduced motion: they simply change, with no blank between.
- The motion walk gains a pass with a track loaded, and one with a sound playing alone: every tab switch, both ways, failing a cut, a blank frame or a box that jumps. A test that fails on 78c5297e1.

**Done in part (Updates 98a, 2026-11-15, d44ec371 and ecc3c870).** The mini player no longer leaves a page that is the player for everything: it stays mounted, unseen under a class the page writes in the commit that brings it (`lib/player/pagePlayer.ts`, `hosts-player`), keeps no room there, and the dock and the bar wear one View Transitions name (`foot-player`, house curve, in `app/globals.css` "One surface at the foot"). Proof: `lib/player/__tests__/footSurface.test.ts` fails 6 of 6 on 78c5297e1 and passes on the fix; typecheck 0; lint clean; web build and the export pass; the unit suite green once two chant tests that read `useOwnPlayer`'s old source word for word were moved to its new body (`lib/chants/__tests__/chantPage.test.ts`, a file outside the brief, its meaning unchanged); the push guard passed. The walk's new pass (`scripts/motion-walk.mjs --loaded track|sound`): with a track loaded the dock and the bar now change under one name on all 8 switches to or from the Bible (none had it on build 98); reduced motion 20 of 20 on both. **Not proved:** the walk's own check of the foot player's box flags those 8 switches with 50 to 78% of the box's change in one frame 250 to 400ms after the tap (the frame judge itself finds no cut or blank there), so the end of the change is not yet shown smooth; and with a sound playing alone, build 98 shows the page jumping 56px about 240ms after the tap on every switch into the Bible (the bar's room given back after the switch's picture), while the after pass did not start (the Bible pill's sound button not found in time) and its one-surface count wrongly expects a player on the Bible, where the pill is the surface. checkMock with pixels not run. Open items and where: `docs/handoffs/updates-98a.md`.

## His go, and who holds what (2026-11-15, 22:08 UTC)

**His words (about 22:06 UTC):** "ensure this is a new build and if not fix all of these issues and come back to me with a new link to redownload for android". He walked build 98, the newest (the journal's words in his note 4 screenshot reached the app on 2026-11-14 at 18:39 UTC, after his walk of build 97). Brainstorm mode ends: every plan above is started.

- **Updates 98a** (player): notes 2, 14 and 8. The Bible's pill and dock on every text read aloud; the dock and the mini player as one surface across tab switches, and the motion walk's playing pass; Now Playing's opening.
- **Updates 98b** (lines and the Bible's sheets): notes 9, 13, 6 and 7. Now Playing's saved line; a chant's words following from Play; the Bible downloads' words and their proof before the merge; the version in the books sheet.
- **Updates 98c** (the keyboard and the journal's quotes): notes 4 (the freeze) and 12, one native mend; note 5, the editor's Quote searching Purify's library.
- **Fable round 3** (stills only, for his yes, on a held branch): the journal as its own page with note 5's quoting in it (build 97 note 2, notes 4 and 5), the chants door (note 3), You and Profile as one design (round 3's You, note 11), the Bible's opening and Plus (round 3), a plan's own page (build 97 note 7).
- **Asked of him:** note 1, the voices (rec: Heart for English, the phone's voice for the other 18 languages, the Voice sheet out of 1.9).
- **No build change:** note 10, campaigns, which appear for his account when the merge is live.
- **Then:** his yes on the stills; a fixer applies them; the pre-build gate on one export; build 99 to the android-release page, its number named to him, with campaigns and the Bible downloads named on their own lines as waiting for the merge.
