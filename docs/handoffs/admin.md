# Baton: Admin (the gate; 1.9's targeted re-check)

Written 2026-11-13, about 02:45 UTC, by session_01VuYTwbteJqs1UmDUwqRvzC. That chat rotated past 600,000 tokens at the arbiter's word (02:14 UTC), so the re-check could not risk an auto-compaction mid-run (`docs/OPERATIONS.md` section 2). The admin panel's own baton is `docs/handoffs/admin-panel.md`.

## Role and scope

Card: `docs/roles/admin.md`. Branch `ccr-07896cf2-bo0afd`. This baton is the gate's side: the walks, checkMock, the sweep and the release's checks. The next job is 1.9's targeted re-check. Cut its export only on the arbiter's word, once every fix has landed. During a run there is no fix of your own and no app code pushed, and main is never pushed.

## Done since the last baton

- The final check: cut 2026-11-12 20:45 UTC from `3e65f51ff` (code `05aee81e1`), closed 02:14 UTC as "not a pass". Six fails, the arbiter's rulings and every count: `docs/1.9-build/notes/gate-run-1.md`, "Final check".
- `84c416b30`: `scripts/guardrail-walk.mjs --size WxH` (800x1280 is a 10-inch Android tablet, 1032x1376 the largest iPad).
- `a2280caf1`: `scripts/tap-walk.mjs --size`, `--store key=value` (what the reader has chosen) and `--lang`. A control's chosen state is now part of a sheet's key.
- `b6b97b2e5`: `--lang` also sets the phone's language (see the gotchas).
- This push:
  - the final check's record;
  - `scripts/guardrail-walk.mjs --light` (the seven light looks in place of the five palettes);
  - `scripts/gate/`, the probes the walks cannot do, listed under "Where things are".

## Open

| What | Owner | Next step |
|---|---|---|
| Fails 1 and 6 (calendar date on Light; the prayer book at 1032) | Updates | They land them; the arbiter says when. |
| Fails 2 to 5 (councils' Fathers; Search's esc key; the Greek word sheet's Close; the webs' cut tags) | Updates 2 and its successor | The same. |
| The walk's allowance for the webs' lifted saints | Admin, before the re-check | Arbiter's ruling (02:14 UTC). In `scripts/tap-walk.mjs`, `ALLOWED` names only a council node (`control: /^button "[IVXL]+ /`). Extend it to every node of a saint's web, by name and reason: a tapped node kept in sight above the card it opened. Keep failing a node that ends hidden (not wholly between the top bar's foot and the card's top). Also keep failing a node that moves with an instant cut outside reduced motion: sample its place over frames after the tap; a whole move in one frame is a cut. Add self-test cases both ways (allowed glide; hidden end; cut). |
| Updates 2's walk mend `db29a0470` (Community's thread was the measure) | Updates 2 lands it | Accepted by the arbiter. The re-check's /community/ walk uses it. |
| The targeted re-check | Admin | On the arbiter's word: the steps below. One report: pass, or each fail with its file and owner. |
| Counting a control by its drawn reach (hit-44) | Admin | 2.0's nightly gate (arbiter, 02:14). For 1.9, Genesis 1's hand walk is the sample. |
| The nightly gate's runner | Admin | After 1.9's check. The arbiter schedules it (`docs/NOW.md`). |

## The targeted re-check, step by step

1. **Setup.** `git pull --rebase origin ccr-07896cf2-bo0afd`, `git config core.hooksPath .githooks`; in a fresh container `npm ci`, then `rm -rf .next && npx next typegen`.

2. **The export.** Selling, in release positions:
   - Command: `NODE_USE_ENV_PROXY=1 NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk NEXT_PUBLIC_SUPABASE_URL=https://avbqyvjgcrucjwevwixt.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY="$(tr -d '\n' < <your scratchpad>/keys.txt)" npm run build:android`
   - The anon key is the main web's public one, the key every page of purifyapp.net ships in its scripts. Read it from there into your scratchpad. Never print it or commit it.
   - While the export runs, never commit (about 1,370 website-only files show as deleted), and never run typecheck or the unit tests.
   - Read the switches at the head: `CAMPAIGNS_OPENING` "testers" and `PICTURES_IN_STORE_BUILDS` false (`lib/campaigns/flags.ts`), `CAMPAIGN_NOTICES` true, `JULY_GROUPS_GO` true, `CARE_NOTE_SEND` true.

3. **Both readers, everywhere.** The new reader is `SELLS_PLUS=1` before the command (the walks refuse an export that does not sell); the open reader is without it. Add `--online` so the walks read the main web, as a phone with a signal does.

4. **The six fails at their widths.**
   1. `node scripts/guardrail-walk.mjs --online --size 800x1280 --only /calendar/`, then at 1032x1376.
   2. `node scripts/tap-walk.mjs --online --max 1000 --workers 2 --only "/councils/first-nicaea/,/councils/first-constantinople/,/councils/ephesus/,/councils/chalcedon/,/councils/second-constantinople/,/councils/third-constantinople/,/councils/second-nicaea/" --shots <dir> --json <file>`
   3. The Search sheet:
      - `--size 800x1280 --only "/calendar/,/journal/,/prayers/"`;
      - `--size 1032x1376 --only "/calendar/,/journal/,/prayers/,/saints/"`.
   4. John 1 with the interlinear on, as a sample, both readers:
      - English: `--max 40 --only /bible/john/1/ --store purify:interlinear=1`;
      - Arabic: the same with `--lang ar`.
      - Every word opens its own sheet: 847 controls, three hours a walk if run whole.
   5. The webs' tags: `node scripts/gate/web-cuts.mjs 390x844`, then `320x640`. Pass is "0 with words cut" at both. Then the tap walk on the six webs at 390 (Athanasius, the Martyrs of Nicomedia, John the Apostle, Irenaeus, Ambrose, Anthony) and St Chrysogonus's at 320.
   6. `--size 1032x1376 --only /prayers/`, both readers. Pass is no line under "held under the finger by the browser's scroll anchoring alone".

5. **St. Xenia's page** (her profile is being refined): `/saints/xenia-of-petersburg/`.
   - `guardrail-walk` at 390, both readers, and again with `--light`;
   - the tap walk at 390, both readers.

6. **The councils.**
   - With no signal: `node scripts/gate/offline-pictures.mjs /reading/councils/ /reading/councils/ancyra-314/ /councils/first-nicaea/` and the other six councils' pages, then `/history/`.
   - Then `guardrail-walk` on the same ten without `--online`.

7. **/community/** with the mended walk: the tap walk at 390, both readers.

8. **Last, in order:**
   - Parts 3 to 5: `npx vitest run $(cat scripts/gate/gate-tests.txt) $(git diff --name-only --diff-filter=AM f4679fb49 HEAD -- '*.test.ts')`.
   - The web build: `npm run build`. Known warnings only: the Bible data patterns, and the invest page's printed figures with no database.

## Gotchas

- **The stand-in's Preferences.** `asAndroidShell` (`scripts/lib/sells-plus.mjs`) makes the page think it is the Android app, and it has no Capacitor Preferences. The app therefore opens in the phone's language, whatever the cookie and the key say. `--lang` now sets the browser's locale too. A probe of your own needs `locale: "ar"` on its context.
- **Scroll anchoring.** The tap walk prints "held under the finger by the browser's scroll anchoring alone" when only Chrome holds a control in place. By the arbiter's ruling of 2026-11-11 (SaintsBrowser, L7), a mend must not lean on it: the iPad is WebKit. Count such a line as a fail at the iPad's size.
- **The walk's own tucked cards.** On a saint's web whose card shows short on load (John the Apostle at 390, St Chrysogonus at 320), the walk's first touch on the empty web tucks the card away. It then aims at the card's button, inert and unseen behind the tab bar ("covered ... Discover"). Not a fail. Check with `section[inert]` and opacity 0 on the card.
- **Tall cards.** By `05aee81e1`, a tap on the faded web lowers the tall card as a backdrop does. Nothing else may answer.
  - `scripts/gate/tall-card.mjs` raises the card again before each tap and re-aims, because the web moves.
  - It leaves out points inside a pinned bar's own reach: on Anthony's web a faded saint at y 52 lies inside the Web and Timeline switch's reach, drawn to y 69.
- **What the walk passes over.** It skips controls drawn under 8px, which includes the commentary marks (11 to 15 by 5, with a 44 reach); `scripts/gate/commentary-sheet.mjs` walks them. It also never measures the screen at 320; run `guardrail-walk --size 320x640` for that.
- **What checkMock's cut rule misses.** It reads only controls' names, so a `truncate` line inside a node is not seen. `scripts/gate/web-cuts.mjs` measures every line's given width against its words'.
- **Under load.** A checkMock fail measured under load can be a page caught mid-entrance. Measure it again alone before you report it: twice in the final check (St Ephrem's work, Matthew 1 at 320) it passed alone.
- **A run's chain script.**
  - Never edit a bash chain while it runs: bash reads it as it goes.
  - Never start a "keep lane B at the lowest priority" loop as a child the script's `wait` waits on, if the loop waits for "lanes done": it stalled the final check eight minutes.
  - Take every time from `date -u`.
- **The push guard** runs typecheck, eslint on the changed files and their tests on every push that is not docs only. If it fails in `.next/`, run `rm -rf .next && npx next typegen`. Never `--no-verify`.

## His words that still apply

- 2026-11-11: "ensure our next build doesn't have any similar issues or any other issues of this nature." (the pre-build gate, CLAUDE.md)
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9." (no point release for a fault)
- 2026-11-10: "when I try the latest build, I want to try everything as if it was public release." (the export in release positions)
- 2026-11-09: spend only what was asked. One export per fix round.
- Always: no em dashes, side stripes, sparkle or light rays; name no reader in the repo (it is public); numbers go to him only.

## Where things are

- The record: `docs/1.9-build/notes/gate-run-1.md` (final run 1, the confirm run, the final check). State: `docs/NOW.md`. Rules: `docs/OPERATIONS.md`.
- The walks: `scripts/tap-walk.mjs`, `scripts/guardrail-walk.mjs`, `scripts/mock-check.mjs`. Each has a `--self-test`.
- The probes, `scripts/gate/` (run from the repository's root; each reads `out/`):
  - `web-cuts.mjs [WxH]`: words cut on every saint's web.
  - `tall-card.mjs <shots>`: the four tall-card webs.
  - `commentary-sheet.mjs <shots> [ar]`: Genesis 1's commentary marks and sheets.
  - `sheet-looks.mjs <shots>`: the Search sheets and the Purify profile on the five palettes and the seven light looks.
  - `offline-pictures.mjs <pages...>`: pictures with no signal.
  - `gift-states.mjs <shots>`: /gift/ in its thirteen states.
  - `history-row.mjs`: /history/'s row brought to the middle.
  - `gate-tests.txt`: the gate's test files.
