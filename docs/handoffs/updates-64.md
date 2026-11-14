# Baton: Updates 64 (the links to a piece off /shop/ that held their picture with no carry)

Written 2026-11-14 by Updates 64 (session_01VuYTwcXmyQ1hifP7F9kDEx), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ); the report goes to the arbiter. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. The one item: `docs/handoffs/updates-46.md` Open 1. No export (the brief's word): the walk is for the round's checks. Checked only what was touched (his word, 13:57).

## Done

- **Five links now carry their picture into the piece's page, 7f9c9579 (rebased from aa3895fd onto 1885b45f, the same code).** The one-line mend of Updates 46's item 1, `data-carry={pieceCarry(slug)}` on the element that is the picture:
  - `components/shop/SaintIconsRail.tsx` (a saint's page; web only, it renders nothing in the apps) and `components/shop/eikon/EikonBoutique.tsx` (/shop/eikon/): the attribute on the picture's frame, nothing else.
  - `components/shop/CartClient.tsx` (the cart's rows), `components/shop/OrderBump.tsx` (the cart and the thank-you page), `components/shop/SetFinish.tsx` (the set on the cart): the link is the frame, and routeMotion's `pictureOf` looks only inside a link, so the picture is wrapped in `<span data-carry className="absolute inset-0 overflow-hidden rounded-[inherit]">` (SoftTiles' way): the same box and the same clip, no pixel changed (`.shop-vitrine` is a background only, `app/globals.css`).
  - In SetFinish the name (text) link finds the same piece's picture too (`pictureOf`, a link with no element inside takes its parent's), so a tap on the name carries it as well.
- **The set offered in the cart drawer closes the drawer as a piece opens (a fault found on the way, same commit).** SetFinish's links had no close, so in the drawer they opened the piece's page under the open drawer (on a phone the drawer covers the screen: the tap seemed to do nothing). SetFinish takes `onOpenPiece`; the drawer passes its `close`, as its rows do.
- **Left, and why: the drawer's rows (`components/shop/CartDrawer.tsx`), and the set's pictures inside the drawer.** The drawer starts its 300ms slide away on the tap (`onClick={close}`), before the page being left is pictured (React's ViewTransition takes the old page when the route commits): a picture lifted there leaves from wherever the slide has taken it, not from under the finger; and on the way back `carryBack` finds the same link again and flies the picture into the closed drawer, past the screen's edge. A comment on the row says so; the test holds it.
- **No duplicate names.** `data-carry` is only a key: the view-transition name is worn by the tapped link's picture alone (`liftFrom`, after `setDown`) and by its one taker, and on the way back by the head and the nth link's picture. A piece both in the rows and an offer, or the rail beside the saint's own icon (a different key), cannot give two elements the name in one picture.
- **Test, failing on the old code:** `lib/shop/__tests__/shopHomeCarry.test.ts`, two new blocks: each of the five files' links holding a picture names it `pieceCarry(<its slug>)`; the drawer's rows close it and carry nothing; the drawer passes `onOpenPiece={close}` to the set, whose links call it and whose carry is off when it closes a sheet. On the old code 2 of 11 failed (the names; the set's close); on the new 11 of 11.
- **Checks:** typecheck 0; the whole suite 15,162 passed, 9 skipped by design, 0 failed (1,196 files, 1 skipped), and the push guard's stylesheet tests, typecheck, eslint and related tests on the push; eslint 0 on the eight changed files; `node --check scripts/carry-links-walk.mjs` parses. No web build (no CSS, no shared file).

## Open

| What | Owner | Next step |
|---|---|---|
| The walk on the round's export | the round's checks chat | `NODE_USE_ENV_PROXY=1 node scripts/carry-links-walk.mjs out --json <f>`. Expect PASS on 1 (EIKON), 2a (the cart's row), 2b/2c (the set and the bump, whichever the cart shows; an absent one is SAID), 2d (the drawer's row: opened, closed, nothing carried), 2e (the set in the drawer, when it shows: the same, the close mend), 3 (reduced, 0 transitions); 4 and 5 are SAID. |
| The drawer's pictures carry | the arbiter, if he wants it | The mend is the drawer closing with the page's commit, not the tap (its links lose `onClick={close}`; the drawer closes on a change of path). That changes the drawer's motion and when the tab bar comes back: a visible change, so his word first. |
| The saint's rail walked | a web walk, if wanted | Web only (`isNativeClient` renders nothing in the shell), so no export shows it; held by the test. |

## Gotchas

- `pictureOf` looks inside the tapped link only (`querySelector`), never at the link itself: a link that is its own frame needs a child to wear `data-carry`.
- `children.length === 0` counts elements, not text: a text-only link takes its parent's `[data-carry]`. Harmless in the six (the parent holds the same piece or nothing).
- On /shop/cart/ the closed drawer's rows are in the page too, after the cart's (the shop layout renders the drawer after `{children}`), so the nth link found on the way back is stable.
- `get_session`'s `used_tokens` read 91,238 at the start and did not move; count your own.

## Where things are

`scripts/carry-links-walk.mjs <out> [--json <f>]`, built on `scripts/piece-switch-walk.mjs`'s recorder and `scripts/lib/` (the shell's server, the main web, real touch).
