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
