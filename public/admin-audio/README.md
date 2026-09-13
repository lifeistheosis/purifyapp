# Admin panel sound effects

Sounds for the admin dashboard. Nothing here is reachable by a reader.

## Why this folder is not in the app

`public/` is copied wholesale into the static export, so anything left in it
ships to every reader in the Android and iOS bundles whether or not a single
line of shipped code references it. `scripts/native-build.mjs` therefore stashes
this folder out of the export the same way it stashes `app/admin`, and the
Android build prints `stashed public/admin-audio` when it does.

Verified 2026-09-01: after `npm run build:android`, `out/admin-audio/` does not
exist and the folder is restored here afterwards.

If you add a file here, it costs readers nothing. If you move one to any other
part of `public/`, it costs every reader its full size on every install.

## Why these are files and not base64

`lib/admin/clickSample.ts` inlines a 1.2KB WAV as base64 and explains why. That
reasoning does not carry to a 56KB recording: base64 inflates by a third, the
result lands inside a JS chunk that cannot be cached or replaced independently
of a deploy, and it would be parsed on every admin page load whether or not
sound is even switched on. Small transients get inlined; recordings get a file.

## Provenance — NOT CONFIRMED

| File | Source | Licence |
|---|---|---|
| `register.mp3` | `freesound_community-cash-register-purchase-87313.mp3`, supplied by the owner | **Unconfirmed** |

This is the same open question `lib/admin/clickSample.ts` records for the reel
click, and this repo has form: the ambience MP3s were pulled over exactly this.
Freesound's community packs are usually CC0, but a filename does not prove a
licence.

What makes it tolerable for now, and it is a difference of degree and not of
kind: this file sits behind admin authentication, is never served to a reader,
and is excluded from both app bundles, so it is not being redistributed to the
public the way a bundled ambience track was.

Confirm the licence before that changes. If it cannot be confirmed,
`lib/admin/sound.ts` still carries `synthChaChing`, the oscillator register this
replaced, and deleting this file falls back to it automatically.
