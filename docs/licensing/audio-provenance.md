# Audio provenance — v9.9 submission audit (2026-06-12)

Every audio file bundled under `public/audio/` was audited for documented
distribution rights ahead of the App Store submission. Policy applied:
**a track ships only if its source and license are documented here.**

## Removed (no documented rights)

All three ambience tracks were removed from the repo and from
`AMBIENCE_TRACKS` in `lib/ambience/ambience.ts`. The ambience controller
hides itself while the catalogue is empty, so no dead UI remains.

| File | Shelf label (last) | Reason removed |
| --- | --- | --- |
| `public/audio/ambience/shadows-of-evil.mp3` | Evening Strings | Filename matches a Call of Duty: Black Ops III map; presumed commercial game soundtrack. No license on file. Copyright / store-review risk. |
| `public/audio/ambience/bo2.mp3` | Still Orchestra | Filename matches Call of Duty: Black Ops II; presumed commercial game soundtrack. No license on file. Copyright / store-review risk. |
| `public/audio/ambience/campfire.mp3` | Campfire | Likely a generic fire-crackle loop, but no source or license is documented anywhere in the repo. Removed under the same policy; lowest risk of the three and the best candidate for restoration. |

Also not shipping: `valley` (64MB source, already excluded via
`.gitignore` long before this audit; never in the bundle).

## Retained

| File | What it is | Rights basis |
| --- | --- | --- |
| `public/audio/prayer-rope-anthem.mp3` | The Prayer Rope Anthem, English | First-party Purify production ("no single author is recorded for it; the anthem spread across the Orthodox world" — the recording itself is the team's). **Action: Leona to confirm the recording is team-produced or licensed before submission.** |
| `public/audio/prayer-rope-anthem-fr.mp3` | Anthem, French | Same basis as above. |
| `public/audio/prayer-rope-anthem-ar.mp3` | Anthem, Arabic | Same basis as above. Lyrics are from an unverified transcription (known issue; text-side, not rights-side). |
| `public/audio/ambience/rain.mp3` | Ambience (1.7): Rain | "Rain against the window" by cori, PDSounds record 600, **public domain**. Source: https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg (licence on that page). Acquired 2026-10-15; a 50 s loop cut from it by Homebase/tools/tts-bakeoff/ambience.py. |
| `public/audio/ambience/birds.mp3` | Ambience (1.7): Morning birds | "Reggelirigók" (morning thrushes) by Ödönke, **public domain**. Source: https://commons.wikimedia.org/wiki/File:Reggelirig%C3%B3k.ogg (licence on that page). Acquired 2026-10-15; a 60 s loop cut from it by the same script. |
| `public/audio/read/john/1.mp3` | Read-aloud (1.7): John 1, the demo reading | **First-party**: synthesised on 2026-10-15 by Homebase/tools/tts-bakeoff/chapter_audio.py with the Kokoro-82M model (Apache-2.0, github.com/thewh1teagle/kokoro-onnx, voice af_heart) reading the app's own KJV text (public domain). Its verse timings are `public/audio/read/john/1.json`. A demo until the owner picks the free voice. |
| `public/audio/ambience/bell.mp3` | Ambience (1.7): Bell and stillness | **First-party**: synthesised by Homebase/tools/tts-bakeoff/ambience.py on 2026-10-15 (a quiet room and a bell struck twice a minute). No outside material. |

## Restoring the ambience shelf

Restored in 1.7 (2026-10-15) with the three tracks in the table above. The
old floating ambience controller was retired; ambience now lives in the
reader's settings (components/bible/ReaderSettingsMenu.tsx) and plays through
lib/ambience/player.ts. The steps below still apply to any track added.

1. Source tracks with explicit licenses (CC0 / purchased license /
   first-party recordings). Freesound CC0 and paid library loops both
   qualify; "found on YouTube" does not.
2. Record each track in the Retained table above: file, source URL,
   license, date acquired, proof (receipt or license text) location.
3. Re-add entries to `AMBIENCE_TRACKS`; the controller reappears
   automatically.
4. Keep files under ~5MB or host externally (see the `valley` note in
   `lib/ambience/ambience.ts`).
