# Baton: Admin (the gate; after 1.9's re-check)

Written 2026-11-13, about 06:20 UTC, by session_01VuYTweFNHsJxnX7YJmTvEN (Admin 2), at the arbiter's word (05:53 UTC): the re-check passed and the gate is closed for 1.9's test build. The admin panel's own baton is `docs/handoffs/admin-panel.md`.

## Role and scope

Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. This baton is the gate's side: the walks, checkMock, the sweep and the release's checks.

- 1.9's gate is closed for the test build: Android run 43374905223 and iOS run 43374909047, cut from `6193982d5`.
- The next job is the nightly gate's runner, after 1.9 ships and not before (the arbiter, 05:53 UTC).
- If a fixer pushes into the export before the release, a second export is cut only on the arbiter's word, and only what changed is walked.

## Done since the last baton

- `5f56967b`: the arbiter's ruling of 02:14 UTC in the tap walk. Every node of a saint's web may be lifted, kept in sight above the card it opened and moved in a glide; otherwise the walk says "hidden" or "cut". Also the arbiter's addition of 02:30: a "held" control is tapped again with scroll anchoring off.
- The targeted re-check: cut from `3b17a0aca` at 04:36 UTC, a pass (the arbiter, 05:53 UTC). Record: `docs/1.9-build/notes/gate-run-1.md`, "Re-check" (`452f0ffe`).
- `54e4554b`: the walk's own fault, found in the re-check, mended.
  - Holds are found frame by frame (`followFrames`, `holdOf`).
  - The second tap asks only whether what stands above the control moved it on the screen.
  - The card growth is allowed by the arbiter's ruling of 05:19 UTC.
  - Self-test: 35 cases.
- `68d7693b`: `scripts/gate/card-growth.mjs`, a web card grown by a tap and by the keyboard.
- The arbiter's question on sideways spill (05:59 UTC): no gate tool judges spill or a cut against `innerWidth`, and none measures page-level spill at all.

## Open

| What | Owner | Next step |
|---|---|---|
| The nightly gate's runner | Admin | After 1.9 ships (the arbiter, 05:53 UTC); it is scheduled in `docs/NOW.md`. |
| Counting a control by its drawn reach (hit-44) | Admin | 2.0's nightly gate (the arbiter, 02:14 UTC). For 1.9, Genesis 1's hand walk is the sample. |
| A page spilling sideways: no gate tool measures it | Admin | Named to the arbiter in the re-check's report. If it is wanted for the nightly gate: measure content past the width asked for, never `innerWidth`. On phones and in the apps the page clips sideways overflow (`overflow-x: clip`, app/globals.css), so there a spill is cut, not scrolled. |
| A second export, only if a fixer pushes into the export before the release | Admin | On the arbiter's word; walk only what changed. |

## How the re-check ran, for the next check

1. **Setup.** In a fresh container: `npm ci` (25 seconds here), then `rm -rf .next && npx next typegen`, then `git config core.hooksPath .githooks`.
2. **The cut.**
   - Cut from exactly the head the arbiter names. If the tip has docs commits after it, `git checkout --detach <head>` for the cut, and go back to the branch after the walks.
   - The key: his word of 2026-11-13 03:32 UTC, "yes read the key" (`docs/1.9-build/BRAINSTORM.md`). It was read from purifyapp.net's own scripts into the export command's environment only, checked to be the anon role of the main web's project, and never written to a file or printed.
   - This container's safety check refused that read until his word was relayed. His word covered the re-check's export; for another check, ask the arbiter whether it stands. If the read is refused, stop and ask; never work round it.
   - Before cutting, refuse a key that is not the anon role, a tree that is not clean, or a head that is not the named one, and record the five switches (`lib/campaigns/flags.ts`, `noticesOn.ts`, `julyRows.ts`, `careOn.ts`).
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
- 2026-11-13 03:32 UTC: "yes read the key" (the main web's public key, for the re-check's export: read into the export command only, written nowhere).
- Always: no em dashes, side stripes, sparkle or light rays; name no reader in the repo (it is public); numbers go to him only.

## Where things are

- The record: `docs/1.9-build/notes/gate-run-1.md` (final run 1, the confirm run, the final check, the re-check). State: `docs/NOW.md`. Rules: `docs/OPERATIONS.md`.
- The walks: `scripts/tap-walk.mjs`, `scripts/guardrail-walk.mjs`, `scripts/mock-check.mjs`. Each has a `--self-test`; the tap walk's has 35 cases.
- The probes, `scripts/gate/` (run from the repository's root; each reads `out/`):
  - `web-cuts.mjs [WxH]`: words cut on every saint's web.
  - `tall-card.mjs <shots>`: the four tall-card webs.
  - `card-growth.mjs [WxH] [slugs]`: a web card grown by a tap and by the keyboard, its focus inside the tall card.
  - `commentary-sheet.mjs <shots> [ar]`: Genesis 1's commentary marks and sheets.
  - `sheet-looks.mjs <shots>`: the Search sheets and the Purify profile on the five palettes and the seven light looks.
  - `offline-pictures.mjs <pages...>`: pictures with no signal.
  - `gift-states.mjs <shots>`: /gift/ in its thirteen states.
  - `history-row.mjs`: /history/'s row brought to the middle.
  - `gate-tests.txt`: the gate's test files.
