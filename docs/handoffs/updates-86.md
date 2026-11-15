# Baton: Updates 86 (Gate 3c group 7, and three of group 9's flashes)

Done 2026-11-15. Started by Arbiter 14. Head measured: the export of `beb478c8`. Final head of this work: `53983da4`.

## The causes, as proved

1. **EIKON's picture not carried (group 7, motion on).** The door is `components/shop/StoreDoor.tsx`, on /shop/stores/ and /shop/. Its three piece pictures wore no `data-carry`, and nothing in EIKON's room (`components/shop/eikon/EikonBoutique.tsx`) wore `data-carry-into`, so `liftFrom` had no picture to lift (lib/ui/routeMotion.ts). The live catalogue shows the door's three pieces are the room's first three, in the same order (russian-christ-flag first).
   A second cause, found on this round's own export: /shop/eikon/ was read only after it opened (`StoreClient` had no peek), so at the switch it stood in its outline (`ShopGridSkeleton`, 757 ms), nothing could take the picture, and it faded where it stood. The walk's carry record still read "carried true", because one side wearing the name satisfies it. `eikon-landing.mjs` (below) read the transition itself on `beb478c8`: only `::view-transition-old(carried)` ran, and no taker.
2. **Orders and Requests flash (group 9, reduced).** `OrdersClient` and `RequestsClient` start in `loading` with no peek, so the first frame is the loading bones (`ShopListSkeleton` / `ShopLoading`). `resolveUser()` settles signed-out a frame or two later. The walk's box sits where "Your" stands on the cart and on the page it opens, the two frames the flash check compares. `MessagesClient` starts the same way (Gate 3 saw its flash; the head did not repeat it).
3. **"Marcionism" flash (group 9, reduced).** `.theology-row:active` lights the row white (an 11% to 5% gradient, a 30% inset line and a glow; app/globals.css). With motion reduced the page cuts in about 60 ms after the tap, so the light stood for 2 frames. Gate 3c's still shows the lit row in the middle frame.

## The mend

- `beb478c8`: the door's first piece wears `pieceCarry(slug)`, and each picture in the room also takes its own piece's name (`data-carry-into`, beside the `data-carry` it already had, as `WorkCover` does). The shop's three signed pages paint Sign in in their first frame on the device when no session is kept on it (`lib/shop/signedOutAtOnce.ts`, the gift ticket's way). The server and the export's waking HTML still start with none, and the ask still runs behind it. With motion reduced, the heresies' rows that open another page (the list's rows, and the councils' rows on an error's page) keep still as they are pressed (`.theology-row-leaves`). The keyboard's chosen row still lights, and motion on is unchanged.
- `53983da4`: the door reads its room as it is shown (`fetchShopStore`), and the room paints from that read (`peekShopStore`, new in lib/shop/catalogClient.ts), so it is whole as it opens and its first piece takes the door's picture. A read that fails leaves the room to read itself, as before.
- Outside the files named in the brief, and said here: `lib/shop/catalogClient.ts` (one added export), `components/shop/StoreClient.tsx` (/shop/eikon/'s page), `components/shop/MessagesClient.tsx`, the new `lib/shop/signedOutAtOnce.ts`.

## Tests (fail on the old code)

- `lib/shop/__tests__/gate3cShopMends.test.ts`: the door's carry, the room's taker, the three pages' first frame, the room's read (4 of 5 failed on `d6450c4a`; the room-read test fails on `beb478c8`).
- `lib/theology/__tests__/heresiesPress.test.ts`: the rows, the rule, and its weight over the lit rules, Parchment's included (2 of 3 failed on the old code).

## Checklist

Both rounds: `npm run typecheck` 0, eslint clean on the changed files, `npm run test:unit` green (15,268 passed, 9 skipped, on the second), `npm run build` passed (globals.css, then a shared file). The guard passed both pushes.

## After (the export of `beb478c8`, `walk.sh`, records in `updates-86-runners/export-1/`)

- Eight runs: both readers, motion on and then reduced, twice each, one worker, `--controls 'EIKON|Orders|Requests|Messages|Marcionism'`, on /shop/stores/, the shop's five signed screens and /heresies/. **0 findings in every run**, unsure 0, errors 0.
- Each run tapped Orders, Requests and Messages 6 times and Marcionism once. Each motion-on run tapped EIKON once, and its carry record read `piece:russian-christ-flag`, taken by `piece:russian-christ-flag`, carried true (4 of 4).
- `eikon-landing.mjs` on the same export: motion on, the picture did **not** land (old side only, no taker; this is the second cause above). Reduced: the room opens with no transition, from both doors.

## Left

- **The after side of `53983da4` on an export.** It was not cut because my count was past the brief's 150,000 line for a second export. When the next export is cut: `node docs/handoffs/updates-86-runners/eikon-landing.mjs out` should pass all four lines (motion on: old and new `carried`, the taker the door's own key), and `walk.sh` should read 0 again.
- The reduced runs never reached EIKON's door (0 taps in four runs); why was not read. The probe's reduced lines cover it.
- With motion reduced, every other `.theology-row` link (the creed, the library, the related rails, the legal contents and others) still lights for the frames before its page cuts. None of them were measured as a fault, and none are in my files.
- When the room's read has not finished by the tap (a slow line, or an immediate tap), the room still opens in its outline and the picture leaves with its page, as before.
