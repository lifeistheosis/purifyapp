# Updates 98b: handoff

Fixer for build 98 notes 6, 7, 9 and 13, started by Arbiter 14 on 2026-11-15 about 22:06 UTC. Branch
`ccr-07896cf2-bo0afd`. Build 98's app code is `78c5297e1`; its own export (from the release's
`app-release.apk`, sha256 77095ac9...2240 as the release lists it) was the "old" side of every walk.

## Done

- **Note 6, the honest words** (`579e30eeb`). Cause, proved in Chromium against purifyapp.net from
  https://localhost: the main web answers a missing Bible 404 with `Cross-Origin-Resource-Policy:
  same-origin`, so the app's no-cors HEAD to the Bible's own address is refused exactly as no signal is
  ("GET cors bible: REJECTED", "HEAD no-cors bible: REJECTED", "HEAD no-cors icon: resolved opaque").
  The reach question now asks `REACH_PATH`, the website's icon, whose answer every version of the
  website makes `cross-origin` (next.config.ts PICTURE_SOURCES; live probe: /icon-192.png 200 and
  /favicon.ico 404, both `cross-origin`). Test: `lib/bible/downloads/__tests__/store.test.ts` (two tests
  fail on 78c5297e1).
- **Note 9, the saved line** (`579e30eeb`). `SaveOfflineNote` keeps one line of room always, one line in
  every state, words that never repeat the title (`downloads.savedToListen`, `downloads.saving` first;
  four new keys `player.offline.waitWifi`, `waitSignal`, `failedSome`, `failedChant`, each taken from that
  language's own existing sentence, in all 21), fade on the house curve, none with motion off. Tests:
  `lib/player/__tests__/savedLine.test.ts` (3 of 3 fail on 78c5297e1); walk `scripts/gate/saved-line.mjs`.
- **Note 13, the words meet the singing** (`579e30eeb`). `lib/player/meetSinging.ts` and
  `LiveCaptions.tsx`: Play, a seek, another version bring the words to the line being sung (or the
  first, in the opening) wherever the box was; a reader's scroll still pauses, and the following comes
  back by itself, now in the opening too. Tests: `lib/player/__tests__/meetSinging.test.ts` (fails on
  78c5297e1); walk `scripts/gate/chant-follow.mjs`.

## Proof (2026-11-15, on the gate export of 579e30eeb and on build 98's own export)

- `chant-follow.mjs`: build 98 FAULT 4 of 4 (after Play the sung line out of view in 10 of 28 looks; after a
  seek, out of view, box left at 0); mine ok 4 of 4, motion on and off.
- `saved-line.mjs`: build 98 FAULT (title moved 37 to 56 px, cover shrank 300.5 to 283 at 360, the line 37
  to 56 px tall); mine: nothing moved at 360, 390 and 412, the line one line (21 px).
- Note 6: the branch's web build run here (with the main web's public anon key in that one command's
  environment, never printed or saved) answers all seven `/bibles/<id>/index.json` 200 with
  `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin`.
  `bible-downloads-local.mjs`: World English Bible downloaded in 1 s, read offline (John 1, 51 verses),
  removed and offered again; 79 requests all 200.
- Typecheck 0 (after `npx next typegen`; a fresh checkout lacks next-env.d.ts), lint clean, the whole
  suite 1231 files and 15357 tests green, web build green, export green.

## Open, and exactly where

1. **Note 9, width at 360** (`saved-line.mjs`, its every-language step): the Wi-Fi wait with Use mobile
   data and Cancel overflows the line's 301 px in bg, de, el, fil, fr, ka (388 px), pl, ro, ru, uk, ur; the
   saved words with Remove overflow in el (328) and uk (304). Mend in `SaveOfflineNote`: a shorter choice
   key for mobile data (new key, all 21) or one choice beside the words while waiting; shorter
   `downloads.savedToListen` is shared, so a player-only key for el and uk. Then rerun the walk.
2. **Note 9, the Arabic pass of the walk**: in Arabic the page plays the Arabic version, so the walk must
   seed `prayer-rope-anthem/ar` (and its file in the "Disc" store) as it seeds `/en`. Walk fault, not app.
3. **Note 6, the walk past the first version**: after one download the next "Download ..." rows are not
   found (only 2 offered), and the manage label for the Russian did not match its download label. Read
   the sheet's rows (TranslationList, BibleRow) and scroll the sheet; then all seven down, offline, off.
   Only after the merge: each version's index.json and a book probed on purifyapp.net, one download on
   his phone (the main web answers 404 with "same-origin" until then; the words now say "Not available").
4. **Note 7** (the version in the books sheet, one sheet with TitleTranslation): not started.
5. **Stills for his yes** (books sheet, its versions view, Now Playing with the saved line, 390 and
   Arabic, through checkMock with pixels) and **checkMock with pixels** at 390/800/1032 on the touched
   screens: not run.
