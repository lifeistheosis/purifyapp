# Baton: Updates 68 (the six links' carry walk: round 4's four FAILs read and mended)

Written 2026-11-14 by Updates 68 (session_01VuYTwcnMK8h6TUgPt4egRU), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ); the report goes to the arbiter. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. The one item: Updates 65's check 4 (`scripts/carry-links-walk.mjs`, 3 passed, 4 failed, 2 said). Two exports, `node scripts/gate/export.mjs`, the main web's key read by the script into that one command, role anon, not printed, not saved. Checked only what was touched (his word, 13:57).

## Done: 1770c657 (rebased from a165296e onto 90d3ac55, docs only between)

- **2a, 2b, 2c: the walk was wrong.** Add to cart opens the cart drawer (BuyBar, `openCartDrawer`), the shop layout keeps it open over whatever page the router brings, and the walk pushed /shop/cart/ under it. On the export of cdb67306 every finger landed in the drawer (`elementFromPoint`; the drawer not inert, at left 0): 2a on a drawer paragraph, 2b on the drawer's set button, 2c on a picture of the drawer's set, which opened byzantine-three-beam-wall-cross, not the bump's greek-christ-flag. The walk now goes on to the cart by the drawer's own link, as a reader does (the link closes it), and a FAIL says where the finger landed when it was not the link.
- **3: the app was wrong** (`components/nav/RouteTransition.tsx`, QueryRoute's return, that condition only). React starts the browser's transition whenever a commit it may picture puts a `<ViewTransition>` in the page, whatever the boundary asks for (react-dom `trackEnterViewTransitions`, line 14377 of Next's compiled react-dom-client in this install). QueryRoute's mark is mounted only on the export's page for a piece, so it was put in on every way into that page from another. Probed on the export of cdb67306, motion reduced: /shop/eikon/ to /shop/ 0, /shop/ to /shop/eikon/ 0, /shop/eikon/ to a piece 1, a piece to /shop/ 0, /shop/ to a piece 1, each started by React's commit (only `tab-bar` animated). From one piece to another the mark was already there, which is why the piece walk's reduced case passed. Now the boundary is put in only where the screen can move (`if (!canMove()) return mark;`). Nothing changes with motion on.
- **Test, failing on the old code:** `lib/shop/__tests__/shopHomeCarry.test.ts`, "with motion reduced, the way into a piece's page on the export stays still". With RouteTransition.tsx put back, 1 of 13 fails; on the new code 13 of 13, and 84 of 84 with `lib/ui/__tests__/routeMotion.test.ts` (Updates 62's strings there unchanged).
- **Checks:** typecheck 0; the whole suite 15,168 passed, 9 skipped by design, 0 failed (1,197 files, 1 skipped); eslint 0 on the three changed files; the push guard passed (22s).

## The walk, before and after

| Step | cdb67306 (before) | 1770c657 (after) |
|---|---|---|
| 1 EIKON's first piece | PASS | PASS: 1 transition, pictured, carried |
| 2a the cart's row | FAIL: the finger in the open drawer | PASS: 1, pictured, carried |
| 2b the set on the cart | FAIL: the same | PASS: 1, pictured, carried |
| 2c the bump on the cart | FAIL: opened the drawer set's piece | PASS: 1, pictured, carried |
| 2d the drawer's row | PASS | PASS: opened, drawer closed, nothing carried |
| 2e the set in the drawer | PASS | PASS: the same |
| 3 reduced, EIKON | FAIL: 1 transition | PASS: 0 |
| 4 the saint's rail, 5 the thank-you bump | SAID | SAID |

Totals: 3 passed, 4 failed, 2 said, exit 1; then **7 passed, 0 failed, 2 said, exit 0**.

## Open

| What | Owner | Next step |
|---|---|---|
| `npm run build` (web) | the next round's checks | Not run: past the brief's 150,000 line once the walk was in. The change is client-only (a `"use client"` file the root layout mounts); both exports compiled and prerendered it; no CSS, no server file. |
| `scripts/piece-switch-walk.mjs` on this head | the next round's checks | It walks the same QueryRoute. Expect 4 of 4, as on 7bbb3fc6f: with motion on the mark is as before; reduced, piece to piece never inserted it. Not run (the same line). |

## Gotchas

- While an export builds, `git status` shows about 1,450 deleted files: the website-only trees `scripts/native-build.mjs` moves out and puts back at the end. A stop hook reads them as uncommitted. Never commit them.
- A `<ViewTransition>` that a transition commit inserts starts a transition even when it says "none". A boundary that comes and goes with the page must not come in on a page switch unless motion is on. The bridge's own mark is safe: it is mounted once, and the new test holds it there.
- `go()` (`scripts/lib/shell-server.mjs`) is a router push. It changes the page under anything the layout keeps open, like the cart drawer, so a walk that adds to the cart closes the drawer or goes through it.
- `get_session`'s `used_tokens` read 91,266 and did not move. Count your own.

## Where things are

`scripts/carry-links-walk.mjs <out> [--json <f>]`. The before run's JSON (each finger's landing, the drawer's state) and the reduced probe were in this session's scratchpad. The numbers above are the record.
