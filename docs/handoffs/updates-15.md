# Baton: Updates 15 (the phone's voices, build 95 note 25), 2026-11-13

Rotated at its limit (200,000 tokens), as OPERATIONS section 2 says. Read this, `docs/NOW.md` and `docs/roles/fixer.md`. The plan and its record: `docs/1.9-build/notes/build-95.md`, note 25.

## His words that bind this work

- 2026-11-13 about 08:13 UTC: "I want everything fixed in v1.9 no pushing out to 2", and "Both" (the choice of voices by the phone's own voices, and the World English Bible, both in 1.9).
- 2026-11-13 about 14:29 UTC, "all recs": free for every reader; a chosen voice reads the whole Bible (Old Testament too), the saints' lives, the councils, history, theology and the Fathers' works; never the prayers (a prayer is prayed). The rest of the plan stands: a Voice row in the player's options opening a sheet from the player's own parts; Heart first where a recording exists, then the phone's voices, each with a one-line Hear it; a voice that has gone falls back to Heart (or the phone's own) and says so once; the verse lit exactly, the Words tab word by word where the phone reports words; the Kokoro parts to the Vault.
- Stills with a reason per choice go to him first, through the arbiter (session_01VuYTwdsjYL2mmq2C2JSt2A); the reader-facing part is held as a patch under `docs/1.9-build/drafts/` until his yes is relayed.

## Done (pushed)

- **5245f37a8, the engine side**, nothing a reader sees: `lib/listen/speech/` (timeline, engine, session, voiceChoice), `setSpokenTrack` and the routing in `lib/prayers/persistentAudioStore.ts`, the plugin `PurifySpeech` (android/.../speech/PurifySpeechPlugin.java, registered in MainActivity, the TTS_SERVICE query in the manifest; ios/App/App/PurifySpeechPlugin.swift, registered in PurifyBridgeViewController, four entries in project.pbxproj), the Kokoro parts in `docs/1.9-build/kept/phone-voice-kokoro/` (README lists each old path). Tests: `lib/listen/speech/__tests__/`, 43, all failing on the old code.
- **R8:** no rule needed beyond Capacitor's own (it keeps every plugin class and its @PluginMethod methods); the plugin reads nothing by reflection. The release APK walk still applies (a native plugin was added).

## Open, in order (owner: the next fixer, from this baton)

1. **The picker and the player's states, held for his yes** (patch under `docs/1.9-build/drafts/`, stills from the export):
   - The Voice row goes in the player's ••• sheet (`components/player/PlayerMore.tsx`), as a `Row` beside Sleep timer and Ambience: its name, then the voice reading. Not a sixth mark under the controls: the five were measured in 21 languages (`lib/player/__tests__/optionWords.test.ts`).
   - A `VoiceSheet` from the player's own parts (`components/ui/Sheet` with `layer="over-player"`, the Row style, `Check` from `components/ui/icons`): Heart first where the text has a recording, then `voicesFor(voices, lang)`, each with Hear it (`engine.preview`), the chosen one checked; choosing calls `chooseVoice(lang, id)` and reloads the track with that voice at the verse being read (the snapshot's captions hold the verse texts, so Heart to a phone voice needs no fetch; a phone voice to Heart needs the chapter's recording, `lib/readAloud/play.ts` startReading).
   - Names: an iPhone voice has one (Daniel, Samantha); an Android voice is an id (en-gb-x-gba-local), so label it by language (Intl.DisplayNames) and a number.
   - States to draw: the ••• sheet with the Voice row; the Voice sheet (Heart and three phone voices); Now Playing with a phone voice, cover and words, a word lit; the voice-gone line (`goneSaid`/`markGoneSaid`); no voice for the language (points to the phone's speech settings).
   - In the walk's Chromium the engine is the browser's: stub `speechSynthesis` with an init script (a few local voices, speak firing onstart, onboundary and onend on timers), so the real web side runs. Name that the voices shown are a stand-in list.
   - Every new string in all 21 catalogs; checkMock on each state at 390, 800 and 1032, five palettes, the looks, Arabic.
2. **Listen where there is no recording** (after his yes):
   - Bible: `components/bible/ReadAloud.tsx` hides ListenButton and the pill when `!hasReadAloud` (every Old Testament chapter) and on a downloaded Bible. Offer the phone's voice: pieces are the page's `verses` ({ n, text }, a server prop to ChapterReader); a downloaded Bible's are `[label, text]` with `textLang`. Use a src like `speech:bible/<book>/<chapter>` and teach `playingOf` (`lib/player/steps.ts`) to read it as a chapter (Speed and Read hang on that). The page lights by `verseAt(manifest, currentTimeNow())` in ReadAloudFollow; for a spoken chapter, light from the player's captions (each has `n`) with `lineAt`.
   - Lives, councils, history, theology, works: `components/reading/ListenHere.tsx` shows only when `useHasListen(id)`, and every list is empty today, so Listen is hidden on all of them. Pieces: the sentences `lib/listen/play.ts` startListening already cuts from `[data-mk-text]`; its lighting (`readingAt`, `sentenceOnPage`) needs timings made from the speech timeline.
   - Never on prayers.
   - Each text's language: the English Bible `en`; a downloaded Bible `textLang` (Greek is `grc`); lives `useInReadersLanguage`; councils their `lang` prop; theology, history, works `en`.
   - Found on the way (not yet fixed): ReaderDock offers English Listen over a downloaded (say Russian) page; the pill ignores a licensed version on the website.
3. **Keep each voice's pace**: the session reports it (`onPace`); the caller should keep it per voice (localStorage) and pass it as `pace` next time.

## Gotchas

- A fresh checkout has no `node_modules` (`npm ci`) and no `next-env.d.ts`: run `npx next typegen` before `npm run typecheck`, or 15 errors show in `components/admin/drop/cards.generated.ts`.
- The Java can be compiled here: `javac` 21 is installed; write stand-ins for the Android and Capacitor classes it uses (TextToSpeech, Voice, UtteranceProgressListener, AudioAttributes, Bundle, Context, Plugin, PluginCall, JSObject, JSArray) in the scratchpad. The Swift cannot: the iOS build proves it.
- The iPhone speed scale is a guess (0.5 is the voice's own; 2x maps to 0.65): to be heard on a phone.
- The plugin asks no audio focus, so the ambience plays on under the voice; a phone call during a reading is not handled yet (walk item).
- A pause takes the reading up at the word only where the phone reports words; elsewhere at the verse.

## What only a phone proves (his walk: the release APK and TestFlight)

The voices each phone has; word reports on Google's and Samsung's engines; speech with the screen off and the lock screen's controls (Android through the media session plugin, iPhone through the plugin's own); ambience under the voice; the silent switch and background speech on iPhone; R8 on the release APK.
