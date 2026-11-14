# Baton: Gate 2 (the pre-build gate on the head, 2026-11-14)

Written 2026-11-14 about 14:05 UTC by Gate 2 (session_01VuYTwadHYxDDuqX3APffp1) at its line of 200,000 tokens. The record is `docs/1.9-build/notes/gate-run-2.md`.

## Role and scope

Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. The pre-build gate (CLAUDE.md, parts 1 to 5) on one export of the head, for a test build of the night's fixes; from 13:57 UTC, at the owner's word, only what changed since the last passing gate (`3b17a0aca`), plus the motion walk over its routes and the items owed on 2026-11-14. It names faults and mends no app code.

## Done

- The export: `node scripts/gate/export.mjs` of `a8a35dde7` (code `4c6a0484`), store switches, key read and written nowhere; the three self-tests passed.
- Part 1, every control on all 129 screens, both readers; no signal on the ten council and history pages; part 2 at 390, 800 and 1032, both readers; the stripe walk; parts 3 to 5 (262 files, 3,309 tests); part 5 against build 95's own code, 26 of 26 notes proved; the offline lines, the toast, the patron sheet whole, /reading/ in English at three widths, Search's strip and the saints' grid reduced, the shop's motion walk.
- Records: `a11986c5`, then the final one with this baton.
- Six faults named (the record's 1 to 4, 6 and 7; 5 withdrawn): the Translation sheet on the earned palettes, a sold-out card's Save under its link, Buy now moving 27px, /plans/acts/ held only by the browser, Today's date line at 1032, and the Virgin of Vladimir card's picture not carried.

## Open

| What | Owner | Next step |
|---|---|---|
| The six faults | the arbiter | Route to a fixer; each has its screen, file and numbers in the record. A second export, on the arbiter's word, walks only what changed. |
| The motion walk over all its routes | the next Admin chat | Cut the export the same way from the head the arbiter names, then two lanes, each in its own command: `[SELLS_PLUS=1] NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --online --json <file> --shots <dir>`, then `--reduced`. About 75 minutes, then the still pass. |
| /reading/ in Arabic (390, 800, 1032, the 21) and /settings/reading-mode/ (1032, the five and the two earned) | the next Admin chat | Running in this container at the hand-over; results stay here. To run again: the probe is checkMock `{ pixels: true, palettes: [...PALETTES, ...EARNED, ...LOOKS] }` on `body`, opened as the guardrail walk opens a screen, with `locale: "ar"`, the `purify_locale` cookie and `CapacitorStorage.purify_locale`. One run takes 75 to 81 minutes here: run the six side by side. |
| Fault 4 for the open reader, walked again alone | the next Admin chat | `NODE_USE_ENV_PROXY=1 node scripts/tap-walk.mjs out --only /plans/acts/ --workers 1 --max 1000 --online`. |
| The web build | the next Admin chat | `npm run build`, last. |

## Gotchas

- **checkMock's pixel pass is slow on long pages:** it brings every word over a picture to the middle of the screen, once a palette. /reading/ on the 21 takes about 80 minutes a run; a sheet measured at each scroll step repeats the whole pass each time. For a sheet, make the phone as tall as the list and measure once.
- **A probe that holds a timer can hold the app's own:** holding every 1,500ms timer to keep the toast also held the speech engine's 1.5s wait for voices, and Listen never answered. Keep a copy of the toast instead (a MutationObserver, the moment it is drawn).
- **A control at y 764 is "in view" but under the tab bar:** `scrollIntoViewIfNeeded` leaves it there and a tap meets the bar. Centre it first.
- **Settings' patron row is drawn only for a signed-in reader** (`/api/profile/patron-saint` answers); the walks are signed out and never reach the sheet.
- **A probe in the scratchpad cannot import `playwright`:** import `/home/user/purifyapp/node_modules/playwright/index.mjs`.
- **The clone is shallow** (about 50 commits): `git fetch --shallow-since=<date> origin <branch>` reaches `6193982d5` and `f4679fb49` for parts 3 to 5.
- **Each tracked wait ends at two hours:** re-arm it beside a longer run, or the container may be reclaimed.
- **Four browsers beside a live feed** gave one "under" on /community/ that did not repeat alone: measure a lone fail again by itself before naming it.

## His words that still apply

- 2026-11-14, by the arbiter at 13:57 UTC: "only do a check on the things you worked on".
- 2026-11-11: "ensure our next build doesn't have any similar issues or any other issues of this nature."
- 2026-11-13 07:32 UTC: "yes key always".
- 2026-11-09: spend only what was asked.

## Where things are

- The record: `docs/1.9-build/notes/gate-run-2.md`. The last passing gate: `docs/1.9-build/notes/gate-run-1.md`, "Re-check ... a pass". The gate's baton: `docs/handoffs/admin.md`.
- The tools: `scripts/gate/export.mjs`, `scripts/tap-walk.mjs`, `scripts/guardrail-walk.mjs`, `scripts/stripe-walk.mjs`, `scripts/motion-walk.mjs`, `scripts/gate/offline-pictures.mjs`, `docs/handoffs/updates-40-runners/rec.mjs`.
