# Updates 98h: hand-over

Started by Arbiter 14 at 23:48 UTC on 2026-11-15 for build 98 note 8's two long frames, from `docs/handoffs/updates-98e.md`. Code: 70d40bf2, be8d24af, 105eddc0. Every number below is from the motion walk on exports cut with `node scripts/gate/export.mjs`, in this container (software rendering), at CPU 4x, `--loaded track --now-playing` (Now Playing alone, the switches left out), three runs each. Before: the export of the head 504ab1c2 (98e's code). After: the export of 105eddc0 as first committed (2e29aa72), before it was rebased onto 6330653a, whose new commits (other chats') touch none of these files.

## Found (a Chrome trace of each, `--trace <dir>`, read by `scripts/gate/trace-frames.mjs`)

- **The tap's frame.** A 130ms task at the click, 77ms of it style: a forced restyle of 585 elements (60ms) and another of 105 (12ms). Not the sheet: the mini player left as Now Playing opened, and its class on `<html>`, `has-now-playing`, went with it; that class sets `--now-playing-h`, which every element inherits, so the whole page restyled (27 to 52ms by hand, each way). The close put it back, which was most of the close's long frame. React's own render was about 6ms.
- **Then the sheet's own root.** Removing `inert` and `pointer-events-none` from the root restyles every element in the sheet (about 5ms each at 93 elements, timed by hand); `visibility` alone is about 0.5ms, the browser's quick kind for inherited values. In the tap after the first fix: 116 elements, 16ms of a 31ms task, and the mini player's `inert` another 39 elements, 6ms.
- **The blur's first draw.** A 49ms decode of the cover at the box's size and 70ms of raster with the 42px blur off the main thread, the page waiting 55ms on the commit.

## Mended

- `components/prayers/NowPlayingBar.tsx`: the mini player stays mounted while Now Playing is open, `aria-hidden` under it (`data-under-sheet`); the sheet covers it on a phone, and on a wide screen, where the panel docks beside the dimmed page, `globals.css` hides it by a rule on itself (never on `<html>`). Not inert: the sheet over it takes the touch (checked: `elementFromPoint` at the bar's spot is the sheet from 150ms after the tap, at 390 and 1032).
- `components/player/NowPlayingSheet.tsx`: closed at rest it is out of sight, reach and hearing by `.now-playing-closed`'s visibility alone, with no `inert` or `pointer-events-none` on the root; inert only while it slides down, set on the element (no second render) and cleared at 440ms; the saved line, which sets its own `visible` when it speaks, sits in a `display: contents` holder that is inert while closed. With motion reduced, the soft picture comes two frames after the tap (one run of four had both in one 66.7ms frame).
- `lib/player/backdrop.ts`: the cover is read small (`createImageBitmap`, cropped as `object-fit: cover` crops it into the box, an eighth of its size) in an idle moment while the player stands closed, and blurred into a canvas with the same filter, the blur scaled, when it is shown after the slide. No filter is left on the screen. Where a canvas takes no filter (an older Safari), the cover keeps the CSS filter as before.

## Measures (CPU 4x, longest frame and frames over 50ms)

| | open | close | slide (ms after the tap) | blur moving |
|---|---|---|---|---|
| before, motion on | 83.3 (1), 116.7 (2), 116.6 (2) | 100 (1), 66.6 (1), 66.6 (1) | 218 to 485, 252 to 518, 250 to 517 | 0 |
| after, motion on | 33.4 (0), 16.8 (0), 33.5 (0) | 33.3 (0), 16.8 (0), 50.0 (0) | 168 to 435, 168 to 435, 154 to 421 | 0 |
| before, reduced | 83.3 (1), 100 (1) | | none | 0 |
| after, reduced | 33.5 (0), 33.3 (0), 16.8 (0) | 16.8, 16.8, 33.3 (0) | none | 0 |

The full walk (`--loaded track`): Now Playing 33.3 open and 16.7 close with motion; 16.8 reduced. The switches: 20 of 20 reduced, 20 of 20 with a sound alone, 17 of 20 with motion. The three flags are late, after the switch's picture: Discover to Bible, the dock's "1×" jumping 52px at 1281ms (on the before export too, 1336ms; Updates 98g's dock); You to Prayers, a cut at the foot at 1050ms (on the before export too, 731ms); Bible to Discover, a cut at 615ms (98e saw it once at 644ms).

## Checks

Typecheck 0; lint clean on the touched files; the unit suite green but for `lib/bible/__tests__/readerScreen.test.ts`, which failed on the head without these commits (note 2's fifth `useScrollAway()`, Updates 98g's) and passes on the rebased head with 98g's change (the player, reader and ambience tests: 36 files, 405 tests); `npm run build` (web) passes; the export; checkMock with pixels (`scripts/gate/player-looks.mjs`, each surface reached by a tap): the dock, the mini player and Now Playing at 390, 800 and 1032 on 21 palettes and looks, in English and in Arabic, 18 of 18 (the dark island allowed, as written on it); the by-eye list: no icon, word, i18n key or Plus line added, the soft picture is the track's own cover; the taps: the mini player's open button, Now Playing's close, then the mini player's Pause and Play, at 390 and 1032. `lib/player/__tests__/nowPlayingTap.test.ts` (7) fails on the head and passes; `nowPlayingReady.test.ts` and `sungLight.test.ts` read the new lines, meaning unchanged.

## Open

1. **Only a phone shows the real frames**: these are software-rendered at CPU 4x. His walk of the next build: the opening and the closing under his thumb, the soft picture's arrival after the slide (a canvas stretched from an eighth, which should look the same as the filter did), and the mini player under the sheet on a wide screen.
2. The close's longest frame is 50.0ms in one run of eight (none over): the inert set on the root as it slides down restyles the sheet. If his phone shows a hitch there, a capture listener that swallows taps while it leaves would replace it at no restyle cost.
3. The dock's cover is still not carried (Updates 98g is adding `noteCarryFrom` on the dock's open button).
4. You to Prayers' late cut at the foot (on the head too): not chased; note 14's.
