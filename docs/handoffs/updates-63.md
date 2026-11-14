# Baton: Updates 63 (the ambience sheet, opened while a reading plays, 1.9)

Written 2026-11-14. Past the brief's 150,000 line once the mend was in, so the second export (the after side, checkMock and the taps) was not cut here: the next checks chat runs it, as below.

## Role and scope

Fixer (docs/roles/fixer.md), from Arbiter 13's brief: build 97 note 10, his "the ambience window opening up while playing someone is playing is a little buggy overrall the ambience system needs optimizing", then "not the sound but the ui". Changed components/player/AmbienceSheet.tsx and lib/ambience/sheet.ts; added lib/ambience/warmPhotos.ts, lib/ambience/__tests__/warmPhotos.test.ts and scripts/ambience-open-walk.mjs; one prop in components/player/NowPlayingSheet.tsx (what opening the sheet over the Words view needs, below). Not touched: lib/ui/useDraggableSheet.ts, the house Sheet and its scrim, RouteTransition, routeMotion, the shop, the profile, Updates 59's ready-ahead, the sound.

## The measure (before), with the walk

`node scripts/ambience-open-walk.mjs --out <export> [--no-blur] [--motion reduce] [--json <file>] [--check]`: 390x844, CPU 4x, motion on, John 1 playing (a stretch of silence stands in for the recording; the words are lit by its timings, as on a phone). The sheet opened from the reader's ••• sheet then Reader settings (while a reading plays the pager's sound button gives way to the dock), from the player's ••• sheet over its Words view and its Cover view, and from the Prayers bar; then each control over the Words view. Every frame read after its paint, every time from the touch itself (the event's own time; the walk's first run measured boxes after starting the clock, and its questions to a slowed page counted 0.4 to 0.7s as the app's). What each window waits on comes from Chromium's trace and the long animation frames.

On the export cut from 515ff5b5 (gate export, 205.2 MB):

| Sheet over | opened: frames in 1.5s, dropped, longest | closed | photographs at the sheet's first frame |
|---|---|---|---|
| the reader | 80, 13, 200ms | 86, 6, 83ms | loaded, none shown; all shown at 258ms |
| the player's Words view | 36, 53, 234ms | 32, 58, 167ms | loaded, none shown; all shown at 455ms |
| the player's Cover view | 82, 10, 134ms | 88, 5, 84ms | shown |
| Prayers | not in the before run (the scene was added after; the after run measures it) | | |

- **Words view.** The same with the scrim's blur taken away (`--no-blur`: 36 frames, 55 dropped opened; 40, 51 closed), so the blur is not the cost there. The cost is the words' glow: every frame the clock subscriber in components/player/LiveCaptions.tsx restyles each word of the lit line (opacity, text-shadow) behind the sheet (main thread over Words: style 627 to 716ms and script 938 to 1277ms in the window, against 299 and 762 over Cover). Over Words the sheet stood still for about 280ms after the click (the ••• sheet still at rest at 300ms), then rose in steps of up to 172px.
- **Over the reader** the blur is the cost (13 dropped with it, 1 without; the compositor's draw 338ms against 69). That is the shared house sheet (lib/ui/useDraggableSheet.ts sizes the blurred strip as the sheet rises); under (b) it was left, and on a phone's GPU a blur is far cheaper than under this software renderer.
- **The controls** (over Words, from the touch): a tile shows Loading at 64ms (Rain) and 115ms (Birds), Playing at 330 and 448ms; a playing tile stopped answers at 103 and 110ms; the sleep timer at 45 and 54ms. Each is one or two frames after its click ran (the click ran 70 to 136ms after the touch, on a main thread the glow kept busy). As a sound begins the sheet grows 322px, but frames of 100ms made its 300ms glide show in two steps (302px, then 20px). The tiles stand still on the screen through every tap (the 3px is the press's own scale). **The volume tapped at 30% showed no change within 1.5s** in the walk (the value read 0.3 by the next tap): not looked into; components/ui/Slider.tsx is shared, so it is named, not mended (open 3).

## Done, with hashes

- **6bdd2fda, the mend.** (1) The photographs are decoded before the sheet first rises: lib/ambience/warmPhotos.ts loads and decodes the six once the app is idle (from the sheet's host, mounted on every screen) and at the latest when the sheet is asked to open; once loaded, a new image of the same address is whole when made, and useArrivingImage marks it before the first paint. (2) Under a sheet over the player, the lit words rest: `active={words && !covered}` on the Words view's LiveCaptions in NowPlayingSheet.tsx (covered: the ambience over the player, its ••• sheet, the sleep sheet, the voice sheet); uncovered, they ease to the line being read, the path a reader already takes coming back from Cover. Reduced motion is unchanged.
- **The checklist.** typecheck exit 0. eslint on the six changed files exit 0. lib/ambience/__tests__/warmPhotos.test.ts: 4 tests, all pass; with the old AmbienceSheet.tsx and sheet.ts the host-and-opener test fails, with the old NowPlayingSheet.tsx the words test fails (and on the old tree the module does not exist). Whole suite: 1197 files passed, 1 skipped; 15,155 tests passed, 9 skipped. The walk's `--check` was written from the before numbers; it was not run on an after export here (open 1).

## Open, each with its owner

1. **The after side** (the next checks chat): one export from the head (`node scripts/gate/export.mjs`), then `node scripts/ambience-open-walk.mjs --check` (expect PASS: every photograph shown at the sheet's first frame in every opening; at least 60 frames in 1.5s opening and closing over the Words view; Prayers measured), the same with `--motion reduce` (the sheet dissolves; read the numbers, nothing should move), and the before numbers above set beside the after ones. `--check` on the before export fails (cut one from 515ff5b5 to see it). Then checkMock `{ pixels: true }` on the sheet at rest and a tile loading and playing at 390, 800 and 1032, en and ar, with a runner on mockrun60's model (docs/handoffs/updates-60-runners/), or `node scripts/gate/ambience-sheet.mjs` (its guard does that, and every tap); and the four walks only if the house sheet changed (it did not).
2. **The blur over the reader** (the arbiter): 13 dropped frames with it, 1 without, on this software renderer; the shared sheet's, so a phone measure decides whether it needs anything.
3. **The volume's late answer** (the arbiter): the slider tapped at 30% showed no change in 1.5s in the walk. components/ui/Slider.tsx is shared; read why before anyone mends it.
4. **Web build**: not run; no CSS, server or shared file changed (NowPlayingSheet is the player's alone).

## Gotchas

- Time every tap from the touch (the walk records the pointer's own time); a box read after the clock starts is the walk's cost, not the app's.
- Over the reader while a reading plays there is no sound button on the pager: the walk opens the sheet from Reader settings.
- Run-to-run spread on this container is about 10 frames in a window (Cover opened: 10 dropped, then 24 in the next run); compare scenes within one run.
