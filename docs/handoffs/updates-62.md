# Baton: Updates 62 (the piece page's cut, from one piece to another on the export)

Written 2026-11-14 by Updates 62 (session_01VuYTwdRmqjHoYqhobRCM1n), a fixer started by Arbiter 13 (session_01VuYTwcZXdzaoyK25DeVxvh); the report goes to the arbiter.

## Role and scope

Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Item 1 of the brief: `docs/handoffs/updates-46.md` Open 2, the export's page for a piece cut from one piece to another. Item 2 (Updates 46's Open 1, the six links) was not started: no room. One export (of `05f5590c`, the head at the start), the main web's anon key read by `node scripts/gate/export.mjs` into that one command, role anon, not printed, not saved. Checked only what was touched (his word, 13:57).

## Done

- **Reproduced on the export, every frame from the tap to 1.5 s after** (`scripts/piece-switch-walk.mjs`, new; real touch, 390 by 844, the shell's server reading the main web; the Virgin of Vladimir's page and the prayer rope, through "Complete the prayer corner"): **1 of 4 passed.** A to B and B to A: 0 View Transitions, a cut, the card's picture not carried. In the frames the address turned at 112 ms while the piece being left stayed on screen under the new address until 614 ms, then changed in place; no frame had a transition running. Back (the top bar's chevron): the chevron's own transition started and was dropped at once (the popstate check took a step back to the same path for a sheet closing), so a cut too. Reduced: still (the pass).
- **The mend** (addc72c6):
  - `lib/ui/routeMotion.ts`: `namedByQuery` and `pageOf`. One map names the pages addressed by their query and the parameter that says which: `shop/icons/detail` by `slug`. Anything else in such a page's query, and every other page's query, is not a page switch. `samePage` is untouched, so the tour, the outline's grace, the journal and What's new keep their meaning.
  - `components/nav/RouteTransition.tsx`: `QueryRoute`, mounted only on such a page and inside a Suspense boundary of its own (`useSearchParams`; no other page reads its query). It is the bridge's own way for the query: a mark that asks React for a picture only while the piece is changing, and a layout effect that settles first, lets a step back go on (`arrived`), then `takeNav` (two pieces stand side by side: `swap`, as `/shop/icons/a` to `/shop/icons/b` is on the website), `beginNav`, `quietEntrance`, `carryIn`. Reduced motion pictures nothing. The popstate check compares `pageOf`, so a step back from one piece to another is held, not dropped.
  - `components/shop/ProductDetailFromQuery.tsx`: the body keyed by the piece, so the piece being opened arrives as itself in the same commit as its address (its outline with its picture, `data-carry-into="piece:<slug>"`, which the card's picture lands in), not the piece being left until the new one is read.
- **Tests that fail on the old code** (9 fail with the three source files put back, all pass on the new): `lib/ui/__tests__/routeMotion.test.ts` ("a page addressed by its query": the rule, the mark, the effect's order; the popstate line; `setSettled` once in each), `lib/shop/__tests__/shopHomeCarry.test.ts` (the keyed body). The walk script fails on the old export (above). samePage's users' tests run again green: `loadingGrace`, `readerWay`, `addressOpening`, `lib/journal`, `lib/whatsNew` (580 of 580 with the two above).
- Checks on the mend: typecheck 0; the whole suite 15,152 passed, 9 skipped by design, 0 failed (1,195 files, 1 skipped); eslint 0 on the changed files (the React compiler asked for the ref prop to be named `queryRef`, done); the web build 0 (6,526 pages; run before the rename, which changes one identifier).

## Open

| What | Owner | Next step |
|---|---|---|
| The after side on an export | the next checks chat | Cut `node scripts/gate/export.mjs` at addc72c6 or later. Then `NODE_USE_ENV_PROXY=1 node scripts/piece-switch-walk.mjs out --json <f> --shots <d>`: expect 4 of 4 (A to B and B to A each with `::view-transition-old/new(root)` and `(carried)`, back with `(root)`, reduced with 0 transitions). Read the forward films' `states` too: the address and the new piece's outline in one frame, then the body. |
| checkMock `{ pixels: true }` on the piece page | the next checks chat | On that export, `node docs/handoffs/updates-46-runners/mockrun46.mjs out <jsonl> 4` with `piece@<w>@<lang>@<g>` for w in 390, 800, 1032, lang en and ar, g in 0, 1, 2 (18 runs). The pixels of a piece's page did not change (only how it arrives), so this is the floor, not the proof; the proof is the walk. |
| Item 2: six links that hold their picture with no data-carry | a fixer | `docs/handoffs/updates-46.md` Open 1, not started. |
| Back from one piece to another lands in the piece's outline | the arbiter, if it matters | With the body keyed, the piece behind comes back as its outline and then its body, so the picture does not travel back into its card (the set is not in the outline); the page itself moves back. The website keeps the piece behind whole (the router's own cache of the page). Seen in the code, not filmed. |

## Gotchas

- **The piece page did not remount on a query change.** Next keeps the page and hands it the new query, and `useAsyncData` keeps the old answer on screen while it asks again; that is why the piece being left stayed under the new address. The key is what makes the new piece arrive.
- `get_session`'s `used_tokens` read 91,370 at the start and the same throughout; count your own.
- The walk's taps need the pieces to be read from the main web; it picks the first piece on /shop/ and walks from its page.

## His words that still apply

"fix those things. try and take into account usage also" (2026-11-14, 16:28). "only do a check on the things you worked on" (2026-11-14, 13:57).

## Where things are

`scripts/piece-switch-walk.mjs <out> [--json <f>] [--shots <dir>]`. The before run's JSON and frames were in this session's scratchpad; the numbers above are the record.
