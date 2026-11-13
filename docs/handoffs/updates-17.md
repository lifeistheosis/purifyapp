# Baton: Updates 17 (the voices: the picker, Listen everywhere, two faults, a phone call), 2026-11-13

Rotated at its limit (200,000 tokens), as OPERATIONS section 2 says, before the export and the stills. Read this, `docs/NOW.md` and `docs/roles/fixer.md`. The plan and its record: `docs/1.9-build/notes/build-95.md`, note 25; the engine before this: `docs/handoffs/updates-15.md`.

## His words that bind this work

- 2026-11-13 about 08:13 UTC: "I want everything fixed in v1.9 no pushing out to 2", and "Both".
- 2026-11-13 about 14:29 UTC, "all recs": the phone's voices free for every reader, reading the whole Bible, the saints' lives, the councils, history, theology and the Fathers' works, never the prayers.
- The arbiter's brief (session_01VuYTwdsjYL2mmq2C2JSt2A): stills with one line of reason per choice first, for his yes, the reader-facing part parked as a patch; push what changes nothing a reader sees.

## Built, tested, held as two patches (nothing pushed yet)

Written on `7edb6245`; both patches checked to apply on `a72981cd` (the first by `git am`, the second by `git apply --check` on top). With both applied: typecheck 0, eslint clean on every changed file, and the whole suite green (14,542 passed, 9 skipped, 1,127 files). Not yet run: the web build, the export, checkMock and the taps (next, below). The local commits are also kept on a local branch, `updates-17-work`, in this container only.

1. **`docs/1.9-build/drafts/updates-17-pushable.patch`** (three commits, `git am`): changes nothing a reader sees, so it is pushed once the fix checklist passes.
   - *A phone call, Siri or another app taking the sound pauses the voice at its word* (item 4). Android: the plugin holds the audio focus for media speech while reading; a moment's loss (a call, the assistant, an alarm) stops the voice and says so, the gain after says it may go on; a loss for good leaves it paused for the reader; not over a call; the focus let go on stop and at the end; a notification or navigation prompt (may-duck) is left to the phone. iPhone: the audio session's interruption stops a reading and its end says whether it may go on (shouldResume). The session pauses the player at the word and takes it up there when told it may; a reader's Pause during the call wins. Tests failing on the old code: 3 in `lib/listen/speech/__tests__/session.test.ts`; the contract in `nativeSpeech.test.ts` now holds both halves to it (it held Android to asking no focus). The Java compiled here against stand-ins (javac 21; the stand-ins are quick to rewrite, see Updates 15's gotcha); the Swift is proved by the iOS build.
   - *No English Listen over a page it does not read* (item 3, Updates 15's two faults). The dock offered Listen over a downloaded Bible's page (a Russian page read in English): the pill now hands its rule to the dock. The website's pill offered it over a licensed translation (NIV, NKJV, NLT): ChapterScreen gives the pill the toolbar's rule. 3 tests fail on the old code (readerDock, readerScreen).
   - *The voices' lib, no screen yet*: `lib/listen/speech/spoken.ts` (a spoken text's address, `speech:bible/<book>/<chapter>[?in=<bible>]`, `speech:<listen id>?lang=`; the Septuagint's Greek asked of a Modern Greek voice), `voices.ts` (the phone's voices, asked once, names a reader can read: Android's ids as "Voice 1" in their language), `speak.ts` (which voice reads; Heart with no engine woken where a recording exists and nothing else is chosen; each voice's pace kept, the baton's item 3; the end told), `context.ts` (read again in another voice at the verse being read, from the player's own words), `pageText.ts`, `sheet.ts`; `playingOf` knows a spoken chapter; `lib/readAloud/play.ts` `listenToChapter`, `rollOn.ts`. 13 tests in `spoken.test.ts`.
2. **`docs/1.9-build/drafts/build-95-note-25-voices.patch`** (one commit, on top of the first; `git apply -3`): everything a reader sees, held for his yes.
   - The **Voice row** in the player's ••• (`components/player/PlayerMore.tsx`), between Sleep timer and Ambience, its value the voice reading (Heart while the recording plays); a new icon `components/ui/icons/Voice.tsx` (a head and the sound of speaking, in the set's stroke).
   - The **Voice sheet** (`components/player/VoiceSheet.tsx`, mounted once in RootFrame like the ambience sheet; over the player from the row): Heart first where the text has its recording, then the phone's voices for the text's language, each its name over its language, the one reading checked, each phone voice with Hear it (the first words of the verse being read, in that voice; the reading pauses first and goes on if the sheet closes without a choice). Choosing reads what is playing again in that voice at the verse being read. The gone line ("The voice you chose is no longer on this phone, so Daniel reads."), also once in Now Playing. The none state, from a page's Listen ("This phone has no voice for Serbian yet." and "One can be added in the phone's speech settings."). A foot line: "Your phone's own voices read without a connection."
   - **Listen everywhere** (item 2): the Bible's pill, the dock and the computer's toolbar offer Listen on every chapter where the device can speak (the Old Testament, a downloaded Bible's page in its own language, read from the page's own words, the verse lit where it stands, rolling on into the next chapter, previous and next in Now Playing opening the chapter's page); never over a licensed translation, nor a downloaded page that only says where its verses stand. ListenHere on the lives, councils, history, theology and works reads the page's paragraphs from that part to the end of the page, in the page's language, the paragraph lit and its sentence washed. Never the prayers (a test walks every prayer file).
   - Ten new strings in all 21 catalogs (`player.voice*`, after `player.read`); Serbian names Heart "Харт".
   - Tests: `lib/listen/speech/__tests__/voiceSheet.test.ts` (8, failing on the old code, one driving a change of voice through the real player at verse 3), and eight source-reading tests updated to the new rules.

## Next, in order (the next fixer)

1. `git am docs/1.9-build/drafts/updates-17-pushable.patch` on the head (rebase if it moved). Then the fix checklist for it: typecheck, the whole suite, eslint on the changed files, `npm run build` (ChapterScreen, a shared file, changed), `npm run build:android`, checkMock with pixels on the Bible chapter (the pill, and the dock with something playing, on a downloaded Bible's page: no Listen) at 390, 800 and 1032 on the five palettes and the looks and in Arabic; tap the dock's controls. Then pull --rebase, push, and NOW's line.
2. `git apply -3 docs/1.9-build/drafts/build-95-note-25-voices.patch`, `npm run build:android` (the key from purifyapp.net's own scripts, his standing word), and the stills from the export, at 390 and twice the pixels, the dark palette first, never parchment. The walk's Chromium has no plugin, so the engine is the browser's: stub `speechSynthesis` with an init script (`getVoices()` returning local voices: Daniel en-GB, Samantha en-US, Karen en-AU, Milena ru-RU, Melina el-GR, and none for Serbian; `speak()` firing onstart, onboundary for each word every 250ms, onend), and say in the report that the voices shown are a stand-in list. Route `https://purifyapp.net/bibles/**` to `public/bibles/` for a downloaded Bible. The stills:
   - the ••• sheet with the Voice row (Genesis 1 read by a phone voice; and John 1 with Heart);
   - the Voice sheet over the player: Heart and three phone voices, one checked;
   - Now Playing with a phone voice, the cover view and the words view with a word lit;
   - the gone line (set `purify:listen.voice` to `{"en":"gone-voice"}` before Listen on Genesis 1);
   - the none state (the Serbian Bible's John 1, Listen);
   - Listen newly shown: Genesis 1's pill, a downloaded Bible's page (the Russian), a saint's life.
   Then checkMock with pixels on each state at 390, 800 and 1032, the five palettes, the looks, Arabic; every new control tapped.
3. Save the stills under `docs/1.9-build/notes/build-95/25-voices-*.png`, refresh the patch if anything changed, and report to the arbiter: the stills with a reason per choice first (below), then the hashes, the tests, the checklist.

## The reasons, one a choice (for the stills' report)

- **The Voice row in •••, between Sleep timer and Ambience**: the player's settings in words, where a reader looks for how it plays; not a sixth mark under the controls, whose five were measured to fit in 21 languages.
- **The sheet from the player's own parts** (the sheet, the rows of the sleep timer's, the check): nothing new to learn, one look with the player.
- **Heart first where a recording exists**: the voice readers already know; the phone's voices after it.
- **Each voice's name over its language**: a reader chooses by language and accent; Android gives ids, not names, so they are "Voice 1, Voice 2" under their language.
- **Hear it reads the verse being read**: the voice heard on the very text, and no sample sentence is written for it (no invented text).
- **Choosing goes on at the verse being read**: no reading starts over.
- **The foot line**: says why these voices are free and work with no signal.
- **The gone line**: says plainly a change the reader would otherwise only hear.
- **The none state**: says what is missing and where a voice is added, never a Listen that does nothing.
- **Listen on every text**: the same pill and words readers know, now on the Old Testament, the downloaded Bibles, the lives, councils, history, theology and works; never the prayers.
- **The Voice mark**: a head and the sound of speaking, in the set's stroke; no sparkle, no pill.

## Gotchas

- A fresh checkout has no `node_modules` (`npm ci`) and no `next-env.d.ts` (`npx next typegen`). Typecheck needs `npm run typecheck` (4 GB heap); a bare `npx tsc` runs out of memory.
- ReaderDock had a function named `listen`; the prop is `listen` now and the function `listenNow`.
- The roll-on into the next chapter for a phone voice is told by the voice's own end (`onSpokenEnd`), since its clock does not stop exactly at its length.
- `whenPageVerses` waits up to 8 seconds for a page opening as a reading rolls on into it; a downloaded book file slower than that ends the roll-on quietly.

## What only a phone proves (his walk: the release APK and TestFlight)

A call during a reading on both phones (paused at the word, going on after the call), Siri on the iPhone, another app's music taking the sound (paused for good), the voices each phone has and their names, Hear it, a chosen voice removed in the phone's settings (the gone line), and Listen on a Serbian page on a phone without a Serbian voice (the none state).
