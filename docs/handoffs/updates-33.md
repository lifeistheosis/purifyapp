# Baton: Updates 33, the apply chat (notes 29, 17 and 9 to apply; round 1 of the fifteen screens pushed)

Written 2026-11-14 about 03:20 UTC by Updates 33 (session_01VuYTweFvnCTuQ8EEanrK4x), rotated past 200,000 tokens after round 1's push, a natural break. Card: `docs/roles/fixer.md`. Report to Arbiter 5 (session_01VuYTwbxkc5zCaxq1PZcq3P); Arbiter 4 is archived.

## Role and scope

Apply his "yes to all" (2026-11-13 about 20:47 UTC): notes 29, 17 and 9, each from its patch, each with the fix checklist (OPERATIONS section 5) and its own push. Round 1 of the fifteen screens is pushed (below).

## Done since the last baton

- **Round 1 of the fifteen screens, pushed** (`fbc6d2e6..ebe13a23`: code `7f19d566` to `e1dfd24b`, the record `ebe13a23`): Updates 29's held patch as it was, then ten faults the checks found on the round's own export, each mended with a test that fails on the old code. The record is under note 25 in `docs/1.9-build/notes/build-95.md`; the redesign README's table says pushed.

## Open, in order (each with the fix checklist)

1. **Note 29**, `docs/1.9-build/drafts/build-95-note-29-applied.patch`: applies cleanly on the round 1 head (proved with `git am --3way` in a worktree at about 02:30 UTC).
2. **Note 17**, `docs/1.9-build/drafts/build-95-note-17.patch`: applies cleanly after note 29.
3. **Note 9**, `docs/1.9-build/drafts/build-95-note-9.patch` (three commits): its second commit stops on one line of `docs/brand/design-kit.md`, the Figure line; keep both texts: "a picture from the app, or a short film of it (a `<video>`, muted and looping, filmed on the export), rounded as the app's cards are, with a caption that names where it comes from. A still of a screen at a phone's width wears `.k-phone` too: ...". Apply the commit's other two files with `git apply --exclude=docs/brand/design-kit.md`, write the merged line, `git add`, `git am --continue`.
4. Named to the arbiter for routing (the first is on round 1's card, so an apply chat's; the other two predate the round):
   - The verse to learn's "Show the words" (`components/today/RememberCard.tsx`) moves 10px under the finger in the first frames of its tap; at rest nothing above it changes (a probe measured the button at 623.6px before and after). The same on an export of the branch without round 1 (`fbc6d2e6`), so it was there before; it is round 1's card. Reproduce: `node scripts/tap-walk.mjs <export> --only / --max 60 --store purify:bookmarks=... --store purify:remember=...` (the stores are in the record's walk; John 3:16 kept).
   - Offline, Today's Listen (its timings stream from the main web unless saved) and Community's Try again change nothing a reader sees; with `--online` both pass.
   - A still of the reading filter over the whole page in Arabic flags the reading list's screen-reader lines behind the sheet (white kept on Light): checkMock pairs Dark's and Light's painted elements by their place in a list, and that page is long; the sheet itself passes.

## Gotchas

- **Run the whole suite after every mend, not the nearest tests.** Updates 29's last mend passed its nearest 197 files and failed `todayMirror.test.ts`; two of mine failed tests that held the old form (`gateRunThreePictures`, `tourLook`).
- **A share class is not always the share drawn.** The palettes remap faint classes in `app/globals.css` (Monastery, Councils and Cappadocian draw /42 to /52 at 55; Light draws a tray's /50 at 75; the dark looks draw up to /60 at 62, Mosaic 66; the light looks up to /68 at 72 to 78). Raising /50 to /55 changed nothing on the warm three and lowered Light in a tray. Read the remap before choosing a share, and know which looks are dark (Night sky, Dawn, Incense, Holy Mountain, Forest, Mosaic, Damask: no reading mode) and which light (the rest: parchment).
- **Tune a share on the export you have, then cut one export.** Inject the candidate rule with a step `{eval: "...appendChild(style)..."}` in a plan line for `docs/1.9-build/redesign/tools/shots-every.mjs`; if it passes there it passes after the rebuild (the probe and the final stills agreed on every rule tuned this way). Scratch scripts of mine that do this: none kept; the pattern is one line.
- **The export walk's own browser**: `PW_CHROMIUM=/opt/pw-browsers/chromium node scripts/export-walk.mjs out --sections N` (without it Playwright looks for a headless shell this container lacks). The mock scripts read `out/`: a symlink to the moved export works; remove it before any commit.
- **The tap walk runs offline by default**: Today's Listen and Community's Try again fail there as "nothing" (they need the main web); `--online` reads the main web. `--store key=value` sets a state; `--max 60` for Today with its cards.
- A whole-page still of a sheet measures the page behind it too: `selector: '[role=dialog][aria-modal="true"]'` measures the sheet itself.
- Never `git reset --hard`; worktrees for proving patches; one export at a time in the main checkout (about 2.5 minutes); `npm ci` with Node 24 (`export PATH=/opt/node24/bin:$PATH`) if `node_modules` is missing after a restart.

## His words that still apply

- "yes to all" (2026-11-13 about 20:47 UTC): every design page, every answer.
- "I want everything fixed in v1.9 no pushing out to 2" (2026-11-13 about 08:13 UTC).
- "yes key always" (2026-11-13): the main web's public anon key read into one export command, never printed, written or committed.

## Where things are

- The patches: `docs/1.9-build/drafts/build-95-note-29-applied.patch`, `build-95-note-17.patch`, `build-95-note-9.patch`.
- The runner: `docs/1.9-build/redesign/tools/shots-every.mjs <export> <out> <plan.json> --jobs=3`.
- Round 1's rules: `docs/1.9-build/redesign/README.md`, "Round 1, in short"; its tests: `lib/ui/__tests__/fifteenScreens.test.ts`.
