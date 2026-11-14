# Baton: Updates 67 (the ambience sheet closing over the player's Words view, 1.9)

Written 2026-11-14 by Updates 67 (session_01VuYTwZng5gLb5UQJXXrdFX), a fixer started by Arbiter 14. Item: build 97 note 10, his "not the sound but the ui", the close over Words that Updates 63's mend made worse (round 4: 26 frames in 1.5s, 68 dropped, longest 233ms). Touched: components/player/NowPlayingSheet.tsx, components/player/AmbienceSheet.tsx, lib/ambience/sheet.ts, their tests, scripts/ambience-open-walk.mjs. Not touched: lib/ui/useDraggableSheet.ts, the house Sheet and its scrim, LiveCaptions, the sound.

## Cause, proved

`covered` (NowPlayingSheet.tsx) turned false with the store's `open`, at the tap, while the house sheet keeps the sheet on the screen for its close (300ms, 160 with motion off) before dropping it. So the words woke mid-close and their glow was restyled every frame behind the falling sheet. The walk now reads the first restyle of the words after each tap: before the mend they woke **100ms** after the tap (motion on; the sheet moved 136 to 336ms and was gone at 369ms) and **130ms** reduced (gone at 288ms).

## Done, with hashes

- **b5678921** (walk mend): the Prayers scene starts Rain first and finds the bar's button by its name's start (the bar draws it only while a sound plays, labelled "Ambience, Rain playing"); each window says when the words woke and when the sheet left; the Words view is read once with nothing over it.
- **a4a41ae3** (walk mend): a long frame's `scripts` is a frozen array; sorting it in place threw in the page and lost the entry.
- **638c7d94** (the mend): the sheet's content says when it is drawn (a layout effect, from its first frame until the house sheet drops it); `useAmbienceLeaving()` is true while it is closed and still drawn; the words take `active={words && !covered && !ambienceLeaving}`. Kept out of the store's `state`, so no other screen redraws; only a change of the answer draws (the sheet's first frame changes nothing).
- **fa1e4b00**: docs/handoffs/updates-67-runners/tileloading67.mjs, a tile mid-loading held to checkMock (below).
- **32bdd085** (walk mend): the checks were handed the failures array, not a function, so the first failing check crashed the walk with no FAIL line.

## Checks

- lib/ambience/__tests__/leaving.test.ts: 4 tests, **all fail on the old code, all pass on the new**; warmPhotos.test.ts's words test follows the new line (fails on the old). typecheck exit 0. Whole suite: 1198 files passed, 1 skipped; 15,170 tests passed, 9 skipped. eslint clean on the six files. Push guard passed (31s). No CSS or shared file: no web build.
- Exports: before, cut from d5d4e64e9 (= b5678921 before the rebase; app code identical to round 4's 7bbb3fc6f); after, cut from 638c7d947 (also has Updates 68's 1770c657). Both exit 0, the key the anon role, never printed.
- checkMock with pixels, a tile mid-loading (`node docs/handoffs/updates-67-runners/tileloading67.mjs out`, on the after export): **FAIL in all six**, 390, 800 and 1032, en and ar: only contrast, only the tile's "Loading" / "جارٍ التحميل", 3.34 to 4.50:1 against 4.5:1, on 5 to 8 palettes each (Dark every time). Not from this mend (the tile is untouched); the state was never checked before. Open 1.

## The walk, before and after (390x844, CPU 4x; frames in 1.5s / dropped / longest)

| | before, motion on | after, motion on | before, reduced | after, reduced |
|---|---|---|---|---|
| Words opened | 70 / 22 / 217 | 60 / 33 / 300 | 69 / 23 / 200 | 67 / 26 / 250 |
| **Words closed** | 73 / 15 / 50 | 68 / 22 / 100 | 67 / 18 / 50 | **53 / 43 / 84** |
| the words woke at | 100ms (sheet gone 369) | **417ms (gone 369)** | 130ms (gone 288) | **304ms (gone 245)** |
| Words closed, during the sheet only | 14 / 5 / 34 | 19 / 3 / 50 | 6 / 5 / 50 | 12 / 7 / 84 |
| Cover closed, during the sheet only | 18 / 11 / 133 | 16 / 3 / 50 | 10 / 5 / 67 | 10 / 3 / 67 |
| Words view, nothing over it | 65 / 29 / 117 | 57 / 34 / 84 | 43 / 47 / 100 | 68 / 23 / 67 |
| Prayers opened / closed | 88 / 4, 88 / 3 | 87 / 4, 90 / 2 | 89 / 3, 91 / 1 | 86 / 5, 91 / 1 |
| `--check` | PASS | **PASS** | PASS | **FAIL (1)**, Words closed 53 |

Photographs: all six shown at the sheet's first frame in every opening of all four runs. The after reduced run crashed at its check (32bdd085 mends that); its verdict above is the rule applied to its numbers. **Round 4's 26 frames did not reproduce here:** the same app code passed at 73. Compare within a run.

## Open, with owners

1. **"Loading" on a tile is under 4.5:1** (a fixer, components/player/AmbienceSheet.tsx:362; the arbiter routes it). The state label is `opacity-70`, and while a sound loads it also has `motion-safe:animate-pulse`, which takes it to half of that and back every 2s; checkMock reads it somewhere in the pulse, hence 3.3 to 4.5:1. Playing (no pulse) passes. A mend keeps the words at full contrast and lets something else say "loading" (or pulses within 4.5:1); prove it with tileloading67.mjs on an export, motion on and reduced. Not mended here: both of this round's exports were spent, so it could not be proved.
2. **The close's floor counts the Words view's own glow** (the arbiter). The sheet is gone by about 370ms (245 reduced); the other 1.1s of the window is the Words view as it always is while a reading plays, which on its own ran 43 to 68 frames in 1.5s across these four runs. 33 of the after reduced run's 43 dropped frames came after the sheet had gone. Either the close's check counts frames until the sheet has gone, or the glow itself is worked on (note 1's owner). A lead for that owner: LiveCaptions is a memo of its props, so `active` changing redraws every row, though no row reads it (from the wake: 13 to 18 frames in 400ms, longest 50ms).
3. **By eye** (the owner, on a phone): the words still come back to the line being read in place, as they did, but now as the sheet leaves rather than under its scrim. If the reading moved on a line while the sheet was open, the words step to it then. A glide there would be LiveCaptions', not touched.
4. **The other sheets over the player** (its ••• sheet, sleep, voice) wake the words at their tap the same way; not measured, not mended (the arbiter).
5. The walk's volume tap reads the slider's box once (Updates 65's note): not touched.

## Gotchas

- While the native export builds, git shows about 1,457 web-only files as deleted (scripts/native-build.mjs moves them aside and puts them back). Never commit them.
- The walk's `--check` covers the whole 1.5s window; read a close with its "the sheet gone at" and "the words woke at".
- `node -e` with a scene name breaks on its apostrophe; put such scripts in a file.

## Where things are

The walk's JSON and logs were in this session's scratchpad (walk1-on, walk1-reduce, walk2-on, walk2-reduce); the numbers above are the record. The runner: docs/handoffs/updates-67-runners/tileloading67.mjs.
