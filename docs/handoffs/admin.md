# Baton: Admin (the gate; Gate 2.0, after build 95's walk)

Written 2026-11-13, about 09:20 UTC, brought up to date about 12:40 UTC, by session_01VuYTwcBsPfuad62m3fX53p (Gate 2.0), at the arbiter's word: after his walk of build 95 found two faults the passed gate had not (Discover's search opening with a glitch, note 5; the "Highlighted" toast over the reader's pill, note 7), build checks that catch their kinds, prove them on the old code, and run them over every screen; findings only. The record is `docs/1.9-build/notes/gate-2.md`. The admin panel's own baton is `docs/handoffs/admin-panel.md`.

## Role and scope

Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. This baton is the gate's side: the walks, checkMock, the sweep and the release's checks.

- 1.9's gate closed for the test build (run 43374905223, iOS 43374909047, cut from `6193982d5`); build 95's walk notes are with the fixers.
- The next job is the nightly gate's runner, after 1.9 ships and not before (the arbiter, 05:53 UTC). It runs the motion walk too.
- If a fixer pushes into the export before the release, a second export is cut only on the arbiter's word, and only what changed is walked.

## Done (Gate 2.0)

- **Where the walks turned motion off**, found and said (`scripts/gate/motion.mjs`, the record): checkMock's still while it measures (kept: a colour is read where it ends), the pixel passes' stills (kept), eight feature walks that ask the browser for reduced motion (named, not changed), export-walk's ten deliberate still walks, and no walk pinning the app's own motion (the app goes still on a phone it judges slow).
- **Motion pinned and asserted** in every gate walk (`scripts/lib/motion.mjs`): the tap walk, the guardrail walk, the stripe walk, the eight probes, the motion walk. Self-test, on an export: 5 cases.
- **The four checks** (`scripts/gate/`): `layers.mjs` (14 cases), `page-edge.mjs` (18), `frames.mjs` (14), `motion.mjs` (5); their in-page measures are `inpage.mjs`.
- **The transitions check calibrated on real frames** (10:30 to 10:50 UTC, `docs/1.9-build/notes/gate-2/calibration.md`): the first full run reported 666 groups for one reader, most of them the house's own page switch. A blank is now nothing inked where the screen changes for more than a fifth of a second; a cut needs half the change by distance and along a fade through the ground; a card fails "not carried" only when the page it opens shows its picture; "misplaced" only on the screen. Findings now name their files: the file that sets a data mark (never one that reads it), the page a switch lands on (`scripts/lib/route-files.mjs`), the control's component, the box that jumped.
- **The motion walk**, `scripts/motion-walk.mjs`: the page switch into each screen, layers and edge at rest at three heights, a double tap and a hold on a verse or a paragraph on the screen, every control (up to 30) tapped and recorded frame by frame, layers twice on the way and at rest, the edge at rest; a card that opens its own page must carry its picture (CLAUDE.md). `--reduced` for the still path, `--self-test` for the four.
- **Shared:** `scripts/lib/tap.mjs` (moved out of the tap walk unchanged; its 35 cases pass), `scripts/lib/main-web.mjs`.
- **The proof on the old code** (`6193982d5`): note 5 fails (a cut, 71% of the change in one frame, then blank frames); note 7 fails (the toast drawn over the reader's pill, 364 by 59px). Stills in `docs/1.9-build/notes/gate-2/`.
- **The arbiter's item (08:11 UTC): the gate's export was not the store's.** Proved: cut the gate's recorded way, every page of the shop is a 404 and Discover has no Shop door; the store workflows write the shop and Community on. Now `node scripts/gate/export.mjs` cuts with the workflow's own switches, read at run time (`scripts/lib/store-switches.mjs`), each secret's stand-in named; `lib/build/__tests__/gateSwitches.test.ts` fails when they disagree; the walks refuse an export whose shop is a 404. The workflow's comment ("the /shop route tree itself stays web-only") is the stale part; neither is changed.
- **The run over the 128 screens at 390, both readers, on the branch tip** (`70043ef22`, 10:49 to 12:02 UTC, then the still pass to 12:22): 412 findings merged (`gate-2/run-tip.md`), 92 on the still path (`gate-2/run-tip-reduced.md`), each with its files and a still. Notes 5 and 7 pass on the tip. By cause: (1) every page switch into a cascaded page is empty 200 to 400ms, proved to be `.route-fade .cascade > *` and its two siblings waiting `--duration-route-enter` (set to zero, four switches pass); (2) a chapter waits on something more; (3) pages that fetch draw nothing while they wait; (4) pop-in cuts; (5) jumps as pages arrive, in clusters; (6) 30 cards whose picture is not carried; (7) the Terms sheet opens empty, the profile card snaps; (8) three layer meetings (the theology path's top bar, Alaska's thread map); (9) a history note's bare address 846px off the screen; (10) with motion reduced, the Prayers and You heads still slide (a specificity fault). In-page changes and eye items listed for a ruling.

## Open

| What | Owner | Next step |
|---|---|---|
| The run's findings (tip `70043ef22`) | the arbiter | Routed by the arbiter; `gate-2.md` groups them by cause, `gate-2/run-tip.md` and `run-tip-reduced.md` list each with its files and still. |
| Rulings asked | the arbiter | Meetings in passing (listed, not failed); dips a fifth of a second or less (listed); slow answers (listed); the EIKON Box's secret value (walked dark); a council's plate; in-page changes (a question, a tab, a filter, a pager: must they move?); Discover's doors (carry a picture the page does not show?). |
| Eight feature walks ask the browser for reduced motion | their owners, by the arbiter | Named in `scripts/gate/motion.mjs`; each would pin motion with `scripts/lib/motion.mjs` and run its own self-test again. |
| The nightly gate's runner | Admin | After 1.9 ships (the arbiter, 05:53 UTC). Add the motion walk to it. |
| Counting a control by its drawn reach (hit-44) | Admin | 2.0's nightly gate (the arbiter, 02:14 UTC). |
| A second export, only if a fixer pushes into the export before the release | Admin | On the arbiter's word, cut with `scripts/gate/export.mjs`; walk only what changed. |

## How the re-check ran, for the next check

1. **Setup.** In a fresh container: `npm ci` (25 seconds here), then `rm -rf .next && npx next typegen`, then `git config core.hooksPath .githooks`.
2. **The cut.**
   - Cut from exactly the head the arbiter names. If the tip has docs commits after it, `git checkout --detach <head>` for the cut, and go back to the branch after the walks.
   - The key: his word of 2026-11-13 03:32 UTC, "yes read the key" (`docs/1.9-build/BRAINSTORM.md`). It was read from purifyapp.net's own scripts into the export command's environment only, checked to be the anon role of the main web's project, and never written to a file or printed.
   - This container's safety check refused that read until his word was relayed. His word covered the re-check's export; for another check, ask the arbiter whether it stands. If the read is refused, stop and ask; never work round it.
   - Before cutting, refuse a key that is not the anon role, a tree that is not clean, or a head that is not the named one, and record the five switches (`lib/campaigns/flags.ts`, `noticesOn.ts`, `julyRows.ts`, `careOn.ts`).
   - **From Gate 2.0, cut with `node scripts/gate/export.mjs`** (it does all of the above, reads the key under his standing word "yes key always", and takes the store workflow's own switches). To cut a named head without leaving the branch: `git worktree add --detach /home/user/cut <head>`, `cp -al node_modules /home/user/cut/node_modules`, then `node scripts/gate/export.mjs --cwd /home/user/cut`; the export is `/home/user/cut/out`.
3. **The walks.**
   - Two lanes at once: the new reader (`SELLS_PLUS=1`) and the open reader, each walk in turn, `--online`.
   - First, the three tools' own self-tests on the export (each needs it); stop if one fails.
   - Then the scope the arbiter names. The probes that know no reader (web cuts, offline pictures) run once, at the end.
   - Never edit a chain while it runs: start a copy of it.
4. **Last, in order:** parts 3 to 5 (`npx vitest run $(cat scripts/gate/gate-tests.txt) $(git diff --name-only --diff-filter=AM f4679fb49 HEAD -- '*.test.ts')`), then the web build. Its known warnings: the Bible data patterns, the invest page's printed figures with no database, and the admin review queue's data folder (`lib/admin/reviewQueue.ts:59`).

Timings in this container (4 cores), about 75 minutes from the cut to the last check:
- the export: 2.5 minutes, 6,473 pages;
- the walks: 68 minutes;
- parts 3 to 5: 20 seconds;
- the web build: 3.5 minutes.

## Gotchas

New in Gate 2.0:
- **The screencast sends a frame only when the screen changes.** A gap between two frames is a dropped frame only if the screen was changing; the transitions check asks the page's own per-frame record for that. Two workers a reader, both readers at once, kept the frames dense on these 4 cores; a typecheck or a build alongside does not.
- **A reader's scroll puts the reader's bars away.** After the first touch, a walk's own scroll counts as the reader's: the pill and the tab bar go. Note 7 needs a verse already on the screen, double tapped where it stands.
- **The house's draggable sheet moves itself by inline transforms** each frame (no animation list shows it), and opens to a half rest with its foot below the screen when its content is long: the sampler counts two restyles running as motion, and the edge check carries a sheet resting low.
- **Thresholded ink lies in a fade, and the fit lies in motion:** words fade past any threshold all together, and a sheet in the middle of its rise is a share of neither screen. The blank rule asks both: under a third by the fit, and almost nothing inked.
- **A backgrounded pair in one command can lose its second half:** `(a) & (b) & wait` ran only `a` here (10:49 UTC). Start each long walk in its own background command.
- **The house's page switch is empty for 50ms at the most** (the page left goes to a fifth of itself in its first frame on purpose; the next arrives from 40ms). That is a dip, listed. A check that fails it fails every page: calibrate any new frame rule on the nine switches in `gate-2/calibration.md` first.
- **The region the blank rule reads is where the screen before and the screen after differ.** A heading that leaves and comes back in the same place is not in it, so a chapter whose heading returns before its verses is empty there until the verses come.
- **innerWidth widens only where html and body do not clip**; the apps clip both, so there a spill is cut.

New in the re-check:
- **A hold can last a frame or two.**
  - The prayer book puts a tapped chapter back under the finger in the tap's own frame; then the house's helper glides the page down to show the opened chapter.
  - Twelve looks 60ms apart caught the hold only sometimes, and the second tap took the glide for a move.
  - Since `54e4554b` every tap is followed frame by frame, and the second tap asks only the hold. A "moved ... tapped again with the browser's scroll anchoring off" line now means a real jump in WebKit.
- **A web card's short face** grows the card and never turns aria-expanded true. It is allowed by name and reason while the card ends fully in view. The keyboard half (Tab, Enter, focus inside the tall card) is `scripts/gate/card-growth.mjs`.
- **A phone's browser widens `innerWidth`** to fit what spills. Never judge sideways scroll or a cut against it; use the width asked for (the arbiter, 05:59 UTC).
- **The stop hook during an export** asks for the ~1,370 website files the export has set aside, shown as deleted, to be committed. Never: they come back when the export ends.
- **A path set inside a backgrounded chain** (`cd && R=... && (...) &`) is gone in the next command on the same line. Write paths in full.

Still standing:
- **The stand-in's Preferences.** The Android shell's stand-in has no Capacitor Preferences, so the app opens in the phone's language. `--lang` sets the browser's locale too; a probe of your own needs `locale: "ar"` on its context.
- **"Held" lines.** Since `54e4554b` the walk lists "held" only when its second tap could not tell who held the control. Count such a line as a fail at the iPad's size (the arbiter's ruling of 2026-11-11: the iPad is WebKit).
- **The walk's own tucked cards.** On John the Apostle's web at 390 and St Chrysogonus's at 320, the walk's first touch tucks the card. It then aims at the card's button, inert and unseen behind the tab bar ("covered ... Discover"). Not a fail; check `section[inert]` and opacity 0 on the card.
- **Tall cards:** `scripts/gate/tall-card.mjs` raises the card before each tap on the faded web.
- **What the walk passes over.** It skips controls drawn under 8px (the commentary marks: `scripts/gate/commentary-sheet.mjs`), and it never measures the screen at 320: run `guardrail-walk --size 320x640` for that.
- **checkMock's cut rule** reads only controls' names: `scripts/gate/web-cuts.mjs` measures every line.
- **Under load,** a checkMock fail can be a page caught mid-entrance: measure it again alone before you report it.
- **A run's chain script.** Never edit one while it runs. Never start a "keep a lane at the lowest priority" loop as a child the chain's `wait` waits on. Take every time from `date -u`.
- **The push guard** runs typecheck, eslint on the changed files and their tests on every push that is not docs only. If it fails in `.next/`, run `rm -rf .next && npx next typegen`. Never `--no-verify`.

## His words that still apply

- 2026-11-11: "ensure our next build doesn't have any similar issues or any other issues of this nature." (the pre-build gate, CLAUDE.md)
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9." (no point release for a fault)
- 2026-11-10: "when I try the latest build, I want to try everything as if it was public release." (the export in release positions)
- 2026-11-09: spend only what was asked. One export per fix round.
- 2026-11-13 03:32 UTC: "yes read the key" (the main web's public key, for the re-check's export: read into the export command only, written nowhere). From 07:32 UTC a standing word: "yes key always" (CLAUDE.md).
- 2026-11-13, after build 95's walk: "after all of these checks and all this time" (Gate 2.0's reason).
- Always: no em dashes, side stripes, sparkle or light rays; name no reader in the repo (it is public); numbers go to him only.

## Where things are

- The record: `docs/1.9-build/notes/gate-run-1.md` (final run 1, the confirm run, the final check, the re-check). State: `docs/NOW.md`. Rules: `docs/OPERATIONS.md`.
- The walks: `scripts/tap-walk.mjs`, `scripts/guardrail-walk.mjs`, `scripts/mock-check.mjs`, and from Gate 2.0 `scripts/motion-walk.mjs`. Each has a `--self-test`; the tap walk's has 35 cases, the motion walk's runs the four checks' own.
- The gate's export: `scripts/gate/export.mjs` with `scripts/lib/store-switches.mjs`. The motion pin: `scripts/lib/motion.mjs`. The record of Gate 2.0: `docs/1.9-build/notes/gate-2.md`.
- The probes, `scripts/gate/` (run from the repository's root; each reads `out/`):
  - `web-cuts.mjs [WxH]`: words cut on every saint's web.
  - `tall-card.mjs <shots>`: the four tall-card webs.
  - `card-growth.mjs [WxH] [slugs]`: a web card grown by a tap and by the keyboard, its focus inside the tall card.
  - `commentary-sheet.mjs <shots> [ar]`: Genesis 1's commentary marks and sheets.
  - `sheet-looks.mjs <shots>`: the Search sheets and the Purify profile on the five palettes and the seven light looks.
  - `offline-pictures.mjs <pages...>`: pictures with no signal.
  - `gift-states.mjs <shots>`: /gift/ in its thirteen states.
  - `history-row.mjs`: /history/'s row brought to the middle.
  - `layers.mjs`, `page-edge.mjs`, `frames.mjs`, `motion.mjs`: the four checks of Gate 2.0, each with `--self-test`; `inpage.mjs`: their measures in the page; `export.mjs`: the gate's export.
  - `gate-tests.txt`: the gate's test files (with `lib/build/__tests__/gateSwitches.test.ts`).
