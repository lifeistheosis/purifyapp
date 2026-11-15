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

## Note 5: quoting real works from inside the journal

**His words (2026-11-15, about 21:14 UTC),** with a screenshot of the same sheet with a Quote block opened ("The words you are quoting" with its cross, then "Who said it" by a speech mark) and the keyboard up: "still wanted you to be able to quote from here by linking real works from purify".

**Found (the arbiter, 21:16 UTC, from the record and the code of 78c5297e1):**

- The plan he agreed on 8 November (`docs/1.9-build/JOURNAL.md`, "In the editor: the Quote block searches the same library: Scripture, the Fathers, the saints' lives, the prayers, the chants") was built from one side only: Quote in journal, from a paragraph held on a library page or a verse's Study (`lib/journal/quoteInJournal.ts`, step 1d). The editor's own Quote (his screenshot) is a quote of one's own only, the words and "Who said it" typed by hand. It never searches the library. Not built, and not named to him: a miss.

**Plan (nothing is built until he says start):**

- The editor's Quote opens a search of Purify's own library (Scripture, the Fathers' works, the saints' lives, the prayers, the chants, the councils). The reader picks the passage, and it lands as a library quote: verbatim, cited, "Quoted from Purify's library", not editable as the source's words, with Open back to its page. A quote of one's own stays as the second choice and never wears the library's mark (`docs/editorial-standards.md`).
- As agreed on 8 November: Scripture and quotes of one's own for everyone, the rest of the library for Plus, shown with the Plus mark.
- Drawn inside the journal page in the Fable round (note 4), for his yes, then built with it. A test that fails on 78c5297e1: the editor's Quote finds a Father's passage and lays it cited.
