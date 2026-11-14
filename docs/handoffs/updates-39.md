# Baton: Updates 39 (a fixer: the last faults of 1.9, round 5)

Written 2026-11-14 by Updates 39 (session_01VuYTwe6kdGExPQKvqgSoKm), reporting to Arbiter 6 (session_01VuYTwchyeBnvHi6J8tiR9X). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. One export, of a6b360ca7 (the same code as 81e9df301 after the rebase). Rotated at its line with the items below left.

## Done (each with a test that fails on the old code)

1. **The shop's two screens, every checkMock rule (Open 1), 2328cfde6.** Found with the dev probe (below) and more than the baton listed: the set's greens (3.91 to 4.44:1 on Light and six light looks), the sidebar's "+ $4.99 standard shipping" (3.40 to 3.98:1, at 800 and 1032 only), the All chip's count (4.33:1 on Mosaic), See all 39.4px, the buy bar's box 17px, the set's piece names cut at two lines, the save heart and the set's plus signs placed with right and left, the spec values and the stock line `text-right`, the foot's two doors padded on one side; and with a cart, the drawer's greens, its Remove 41 by 17, its names 20px and cut, the in-cart and demand greens typed. Greens deepen on Light and the light looks only (`[html[data-reading-mode=parchment]_&]:`), Dark untouched. On the export: **45 runs, 0 failures** (both pages, 390, 800, 1032, English and Arabic, the 21 in three groups, plus the drawer open with the set and the piece page with the set). Taps: the box ticked from 12px outside it, Buy now's foot still Buy now's, See all from 1.5px past its words, Remove from 10px above, the heart at the card's left in Arabic. Test: `lib/shop/__tests__/shopScreensHeld.test.ts` (16 of 16 fail on the old components).
2. **The saints' century bars named to the jump rule (Open 4), 5ab4156bf.** The browser names the bar, not the count: it grows from its foot, 13 to 56px, its top moving 43px. Both carry `data-mock-allow="jump"` and a why; `inpage.mjs` reads it off the shifted element alone; `frames.mjs` honours it only with motion reduced and says it. Self-test: named bar passes reduced (said), unnamed fails, named with motion on fails, a 40px push beside it fails; the named case MISSED on the old judge. Test: `lib/saints/__tests__/centuryJumpNamed.test.ts` (3 of 3).
3. **checkMock's Arabic pass pairs by `data-mock-pair` (named by Updates 36), 81e9df301.** Self-test passes; with the same two new fixtures the old tool fails its self-test (one part not compared, its box passing; the other failing three pieces that mirror).
4. **Search's strip, reduced, on the export: 5 of 5 pass** (Open 2).
5. 48540a0b6: noSideStripes and mockPair follow the moved lines.

Suite 15,019 passed before 48540a0b6 (the 3 failures were those two guards, then 11 of 11); typecheck 0; lint clean; web build 0; the guard passed the push.

## Open

1. **The saints' grid jumps 37px with motion reduced** (owner: the next fixer). Found once the bar was named: the judge reports only the worst shift, and under it the "N saints" line (SaintsBrowser.tsx, `isFiltering ? <p className="mt-10 ...">`) appears above the grid, which moves from mt-10 to mt-4 below it: 3 of 3 recordings fail at 54 to 79ms ("The Apostle to the Nations" card, 21,692 to 21,729). Motion on passes 2 of 2. Proposed mend, least visible: the grid stands at mt-10 in both states and the line sits in the gap above it (`relative` wrapper, the line `absolute bottom-full start-0 mb-2.5`); the unfiltered page is untouched. Then a new export, the reduced recording three or more times (`node rec.mjs out /saints/ 'button[aria-pressed]' reduce 3 1`) and checkMock with pixels on /saints/.
2. **The motion walk on /shop/, the piece's picture carried** (Open 4b): not run. `NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --only /shop/ --online`.
3. **checkMock with pixels owed (Open 3):** /reading/ at 390, 800, 1032, the 21, English and Arabic; /settings/reading-mode/ at 1032 English on group 0. Not run.
4. **Named, not mended (other screens):** /shop/cart/ has the same kinds: its agree box 17px (CartClient.tsx:413), `text-right` (CartClient.tsx:261); `text-left` in CheckoutSuccessClient.tsx:161. Not measured this round.

## Gotchas

- **The dev probe** finds checkMock faults without an export, in minutes: `BUILD_TARGET=android` with the store switches (NEXT_PUBLIC_SHOP_ENABLED=1, COMMUNITY=1, SITE_URL=https://purifyapp.net, placeholder Supabase values) `next dev -p 3100`, the page opened with `localStorage["purify:force-native"]="1"`, NATIVE_UA, and the main web routed live (scripts/lib/main-web.mjs). It is not proof (the export is), and its scroll can leave a shift below the screen unseen, as the grid's was.
- checkMock reads the cart drawer even closed (always in the page, inert, off screen); its offers draw only when it opens (`purify:cart-open`), since its catalogue is fetched then. mainWeb aborts every POST.
- In the export a link carries its trailing slash (`/shop/category/all/`).

## The runner (scratch, this session's)

`mockrun.mjs <out> <jsonl> <conc> <route@width@lang@group[@set|@open]>...` as Updates 38's, plus a cart seeded with the set (`set`) or seeded and the drawer opened (`open`). `rec.mjs <out> <route> <selector> <on|reduce> <times> [nth] [--online]`: one tap recorded and judged by frames.mjs on a fresh phone each time.

His words that still apply: "A release ships finished" (2026-11-11), "Spend only what was asked" (2026-11-09).
