# The Vault: the Kokoro voice parts (kept 2026-11-13)

The on-phone voice built for 1.9 on 2026-11-11 ran Kokoro 82M inside the web
view. Measured, it spoke at 0.07 to 0.08 of speaking speed on a stand-in for a
mid-range phone (`docs/1.9-build/notes/voices-fable.md`), so it never shipped.
On 2026-11-13 the owner put the choice of voices in 1.9 by the phone's own
voices instead (build 95 note 25, "Both", then "all recs"), and the arbiter
sent these parts here: nothing made is deleted (CLAUDE.md, "The Vault").

Every file is renamed `.kept` (or was `.parked`), so no build, typecheck or
test reads it. Where each one lived:

| Kept here | It was |
|---|---|
| `phoneVoices.ts.kept` | `lib/listen/phoneVoices.ts`: the Kokoro voices and `decidePhoneVoice`, the server's Plus rule |
| `phoneVoiceChoice.ts.kept` | `lib/listen/phoneVoiceChoice.ts`: the stored choice (its pattern lives on in `lib/listen/speech/voiceChoice.ts`) |
| `phoneVoiceDownload.ts.kept` | `lib/listen/phoneVoiceDownload.ts`: the model's download, checked file by file |
| `phoneVoiceEngine.ts.kept` | `lib/listen/phoneVoiceEngine.ts`: the Blob-returning seam |
| `phone-voice-route.ts.kept` | `app/api/listen/phone-voice/route.ts`: a Plus voice's file after the server's check |
| `phone-voice-manifest.mjs.kept` | `scripts/phone-voice-manifest.mjs`: the owner's upload list (OWNER-STEPS V8) |
| `data-phone-voices-README.md` | `data/listen/phone-voices/README.md` |
| `tests/*.test.ts.kept` | `lib/listen/__tests__/`: their tests, with the two that forbade any voice screen while the engine was dark |
| `settings-*` | `docs/1.9-build/parked/phone-voice/`: the parked Settings section, its preview, its stills script and its twenty English words |

To bring one back: rename it to its old path, and its imports resolve again.
The phone's voices that replaced them: `lib/listen/speech/`.
