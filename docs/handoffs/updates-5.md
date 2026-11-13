# Baton: Updates 5 (the player's sound), 2026-11-13

Rotated near 400,000 tokens, as the arbiter asked. Read this, `docs/NOW.md` and `docs/roles/fixer.md`.

## Done

- **Build 95 note 11** (the ambient sounds): pushed `6f4d1b104`, accepted by the arbiter. Cause: the iPhone app's shell answers a bundled .mp3 with no HTTP status, so `fetch` saw status 0 and the player refused it. Record and proof: `docs/1.9-build/notes/build-95.md`, note 11. His iPhone proof waits on a TestFlight build cut after `6f4d1b104`.

## Held for his yes

- **Build 95 note 22** (a photograph on each sound's tile, with note 11's finding folded in: the sounds at the sheet's foot, what a playing sound adds opening above them). Built, checked, not in the app. Everything is in `docs/1.9-build/notes/build-95/22-held.patch` (15 files: the sheet, the catalog's photo records, the six JPEGs, the credits wiring, the licence record, the tests, the walk). Stills and reasons: build-95.md, under notes 22 to 24.
- **On his yes:** `git apply --index docs/1.9-build/notes/build-95/22-held.patch`, then the fix checklist: the suite, typecheck, `npm run build` (the stylesheet changes), `npm run build:android` cut the house's way (`NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk`, the public key read from purifyapp.net's scripts into that one command, role anon), then `node scripts/gate/ambience-sheet.mjs <shots>` and `SELLS_PLUS=1 node scripts/gate/ambience-sheet.mjs <shots>`. All passed on 2026-11-13. Then delete the patch file in the same commit and push through the guard.
- **His small choices beside the yes:** squarer tiles (so two sounds' volumes fit an 844px phone without a drag, at the pictures' cost); the Athos photograph for the sea instead of the Unsplash wave (Commons' review of it is pending); the Plus preview's strip wearing the photographs too.

## Waiting on his answers, then to build

- **Build 95 note 25, the choice of voices** by the phone's own voices. The plan is in build-95.md under note 25 (what a voice reads, where it is picked, free or Plus with the recommendation free, the Kokoro parts into the Vault, the native plugin, what only a phone proves). Nothing is built. On his answers: the plugin's two halves, the second player, the picker drawn from the player's own parts, stills with reasons for his yes before it ships, the fix checklist, and his walk on the release APK and TestFlight.
- Facts gathered for it: no speech engine anywhere in the app today; the dark Kokoro parts are `lib/listen/phoneVoices.ts`, `phoneVoiceChoice.ts`, `phoneVoiceDownload.ts`, `phoneVoiceEngine.ts` and `app/api/listen/phone-voice/route.ts`, with the parked settings section in `docs/1.9-build/parked/phone-voice/`; `lib/listen/__tests__/phoneVoiceDownload.test.ts` (lines 208 to 227) forbids any voice screen while the engine flag is false; the recorded Heart voice covers the 260 New Testament chapters only; no other text and no prayer is recorded.
