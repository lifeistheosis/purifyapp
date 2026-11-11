# Parked: the on-phone voice's Settings section

Taken out of the 1.9 apps on 2026-11-11 by the arbiter's word, after the
owner's decision of the same day ("rec voices"): 1.9 ships the recorded Heart
voice, and a native engine in both apps is for 2.0, which reworks this
section anyway. Nothing made is deleted (CLAUDE.md, "The Vault"), so it waits
here, outside `app/`, `components/` and the catalogues, where no build reads it.

- `VoiceSection.tsx.parked`: the section (the download row with its size,
  the voices as rows with a sample to hear and the Plus mark). It was
  `components/settings/VoiceSection.tsx`.
- `VoicePreview.tsx.parked`: the build-only preview that drew it for stills.
- `mock-phone-voice.mjs.parked`: the script that photographed four states and
  held them to checkMock. The first pass failed contrast on Light (mended in
  the section) and was not sent.
- `words.en.json`: its twenty English words, as they stood in
  `lib/i18n/messages/en.json`. Not yet approved, not translated.

What stays in the repository and is called by nothing: the list of voices
and the server's rule (`lib/listen/phoneVoices.ts`), the route
(`app/api/listen/phone-voice`), the download job
(`lib/listen/phoneVoiceDownload.ts`), the engine's seam
(`lib/listen/phoneVoiceEngine.ts`) and the reader's choice
(`lib/listen/phoneVoiceChoice.ts`). The measures and the 2.0 plan are in
`docs/1.9-build/notes/voices-fable.md`.
