# Baton: Updates 70 (an ambience tile's "Loading" under 4.5:1, 1.9)

Written 2026-11-14 by Updates 70 (session_01VuYTwZrAS6WwLUZ3YWsPe2), a fixer started by Arbiter 14. Item: the pre-build gate's rule 2 on the ambience sheet with a tile mid-loading (updates-67.md Open 1). Touched: components/player/AmbienceSheet.tsx (the tile's state line, and the tile's `loading` prop, which had no other use), lib/ambience/__tests__/loadingRatio.test.ts (new), docs/handoffs/updates-67-runners/tileloading67.mjs. get_session read 200,761 once the mend was pushed, past the brief's 200,000 stop line, so step 3 (the second export's walks) was not run.

## Cause, proved

A loading tile is lit (`bg-paper text-night`) and its state line is `opacity-70` with `motion-safe:animate-pulse`. Tailwind's `@keyframes pulse` sets an opacity of 0.5 at 50%, whatever the line's own, so the line went 0.7, 0.5, 0.7 every 2s. From the stylesheet's tokens: at 0.5, 20 of the 21 palettes are under 4.5:1 (Mosaic least, 3.22; only Linen holds, 4.81); at 0.7 all 21 hold (Mosaic least, 5.96); the least opacity that holds all 21 is 0.6125 (Mosaic). No stock pulse on the words can pass.

## Before: export 1, cut from 2440af06e (exit 0, the key the anon role, not printed or saved)

- **Motion on, measured where it lands: FAIL in all six.** Readings at opacity 0.500 to 0.578 (the lower part of the breath; each run began with the line at 0.512 to 0.520). 390 en: Dark 3.58, Light 4.36, Incense 3.62, Holy Mountain 3.40, Forest 3.49, Damask 3.69. 800 en: Dark 3.56, Cappadocian 4.23, Night sky 4.03, Dawn 3.59, Incense 3.43, Holy Mountain 3.92, Mosaic 3.44, Stone 4.08, Damask 3.48. 1032 en: Dark 3.57, Light 4.47, Night sky 4.46, Dawn 3.83, Incense 3.34, Holy Mountain 3.72, Forest 4.25, Mosaic 3.24, Stone 4.16, Damask 4.17. 390 ar: Dark 3.57, Light 4.36, Incense 4.10, Holy Mountain 3.57, Forest 3.40, Jordan 4.29, Damask 3.59. 800 ar: Dark 3.58, Light 4.34, Dawn 3.67, Incense 3.35, Holy Mountain 3.86, Mosaic 3.22, Stone 4.31. 1032 ar: Dark 3.56, Councils 4.34, Cappadocian 3.63, Night sky 3.69, Dawn 4.06, Lavender 4.32, Olive 4.16, Mosaic 3.64.
- **Motion on, the pulse held at its faintest (PULSE=faint, 0.5, 1s into each breath): FAIL in all six,** 20 palettes each, the same in every run and equal to the tokens' arithmetic to the hundredth: Dark 3.56, Light 4.27, Black 3.98, Candlelight 3.52, Monastery 3.41, Councils 3.41, Cappadocian 3.38, Night sky 3.69, Dawn 3.59, Incense 3.34, Holy Mountain 3.38, Forest 3.39, Jordan 4.19, Blush 4.14, Roses 4.16, Lavender 4.13, Olive 4.14, Mosaic 3.22, Stone 4.06, Damask 3.44.
- **Motion off: PASS in all six** (data-motion reduce, the line at 0.7, no animation): the fault was the pulse alone.

## Done, with hashes (pushed 3bf8389b..8a3193e2)

- **94e94a1c, the mend.** The pulse is off the words; "Loading" is drawn as "Playing" is, at 0.7 in every frame, motion on or off. The line keeps its place and its classes otherwise. By the tokens, after: Dark 7.13, Light 6.95, Black 8.52, Candlelight 6.67, Monastery 6.52, Councils 6.49, Cappadocian 6.42, Night sky 7.42, Dawn 7.10, Incense 6.33, Holy Mountain 6.48, Forest 6.51, Jordan 6.73, Blush 6.67, Roses 6.69, Lavender 6.65, Olive 6.66, Mosaic 5.96, Stone 6.55, Damask 6.62, Linen 8.16. That drawing (0.7, no animation) is what export 1 measured with motion off: PASS in all six.
- **The test,** loadingRatio.test.ts: renders the sheet with a sound loading, reads the state line's faintest frame (its opacity, its ink's share, every keyframe of any animation on it, from app/globals.css or Tailwind's theme) over the lit tile's paper on all 21 palettes. **Fails on the old code** with the 20 palettes above ("Loading at 0.5 of the ink (opacity-70: 0.7; motion-safe:animate-pulse: @keyframes pulse to 0.5)"), **passes on the new.**
- **8a3193e2, the runner** (it could not run reduced, which the brief asks for: the native app ignores the browser's reducedMotion, lib/ui/motionPreference.ts; and it printed 12 failures of 20): MOTION=on|off pins purify.motion; PULSE=faint holds the line's animations at their faintest frame; each line names data-motion and the line's opacity and animations; every failure is printed.
- **Checks.** typecheck exit 0 (and the guard's on the rebased tree, 1m 20s). eslint exit 0 on the three files. lib/ambience/__tests__ with the two other tests that read the sheet: 13 files, 86 tests passed. Push guard: every check passed (1m 37s). No CSS or shared file: no web build.

## Open, with owners

1. **Step 3 on an export of 8a3193e2 or later** (the arbiter routes it). Export 2 was cut from 8a3193e2c in this container as the line was crossed (exit 0, the key the anon role, not printed or saved; 205.2 MB in 7,372 files); its walks were not run. Run `MOTION=on node docs/handoffs/updates-67-runners/tileloading67.mjs out`, then with `PULSE=faint`, then `MOTION=off`, and `node scripts/gate/ambience-sheet.mjs`. Expected: PASS in all six each, the line at 0.7 with no animation.
2. **The whole unit suite** (`npm run test:unit`) on the head: not run here; the guard ran the related tests.
3. **By eye** (the owner): "Loading" no longer breathes. A breath back needs its own keyframe in app/globals.css (not held here) that never goes under 0.62, such as 0.7 up to 1 and back.

## Gotchas

- While an export builds, git shows the web-only files as deleted: never `git pull --rebase --autostash` then, or the stash puts them back mid-build.
- A runner reduces the native app's motion with localStorage `purify.motion` = off; `reducedMotion: "reduce"` does nothing under the native user agent.
