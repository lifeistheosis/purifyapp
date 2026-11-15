# Baton: Updates 90 (the empty arrivals, /account/'s reduced flash, the reduced presses)

Done 2026-11-15. Started by Arbiter 14. The mend: `2eb10be5`. The walk's runner and its eight records: `docs/handoffs/updates-90-runners/` (`walk.sh`, `screens.txt`, `controls.txt`, `*.json.gz`), on one export of `2eb10be5`.

## The causes, as proved

1. **The empty arrivals.** Twelve pages that read their address on the device each stood behind their own `<Suspense fallback={null}>`, which the export needs for `useSearchParams`. In react-dom 19.2.4, `shouldRemainOnPreviousScreen` keeps the page being left during a transition only while `shellBoundary` is null, and `pushPrimaryTreeSuspenseHandler` makes any boundary with no current fiber (a new one) the shell. So in a switch React drew the new boundary's empty fallback while the page's script loaded. On the client `useSearchParams` only reads context (next 16.4.6, `navigation.js`), so the boundary is needed in the export's render alone. Next adds no boundary of its own where a segment has no `loading.tsx` (`layout-router.js`, `LoadingBoundary`).
   - The campaigns door (`CampaignsGate`) also drew an empty `min-h-[60vh]` box while `useCampaignsDoor` asked the server.
   - The pages: /campaigns/detail/, /email/change/, /email/first-week/, /email/unsubscribe/, /bible/multi/ (also proved by Updates 89 on afa7603e), /shop/request/, /shop/orders/detail/, /shop/ambassador/, /shop/checkout/cancelled/, /shop/checkout/success/, /shop/messages/detail/, /florilegium/gathering/.
2. **/account/'s reduced flash.** It was neither the `(you)/loading.tsx` outline nor the sign-in gate. Gate 3c's still (`docs/handoffs/gate-3c-walks/mwr-open-1-account-arrival-flash-0.png`) shows the middle frame. It holds the You tab's own waiting outline: two boxes 178 and 230px high under the bar, which are `YouMobile`'s `reader.state === "unknown"` branch. The loading outline begins with a 16:9 plate and a 168px box. With no session kept, `useReader` drew that branch until `resolveUser()` answered, a frame or two later, then drew Sign in. The walk's box at 30,420 lies inside the 178px box.
3. **The reduced presses.** Every `.theology-row` link lights on `:active`, with no exemption for reduced motion, exactly as "Marcionism" did. Blink keeps a tapped control `:active` for at least 150 ms, so a row that stays on its page shows a whole press. A row whose page cuts in about 60 ms shows the light for only the frames before the cut. The page-opening rows:
   - the creed;
   - the library (two);
   - the way;
   - the study shelves;
   - the recent studies;
   - the related rails (two);
   - a topic's verses and studies;
   - the path's steps;
   - an apologetics reading's verses;
   - the legal documents.

## The mend (`2eb10be5`)

- `components/layout/ArrivalBoundary.tsx` is the one rule. The boundary is drawn in the page's HTML and while it wakes, so the first render matches. A page mounted by a switch has none, so React holds the page being left until the new one can draw whole, in the house's motion. The choice is made once, at the first render. All twelve pages wear it. For /bible/multi/, the wait falls to the route's own `bible/loading.tsx`, as Updates 89 suggested.
- The campaigns door (`holdForCampaignsDoor`, `lib/campaigns/useCampaignsOpen.ts`):
  - A door mounted by a switch suspends on the server's first answer of the page load, for 600 ms at most (the signed pages' bound), so React holds the page being left.
  - Past the bound, or in the page's HTML, it says "Loading…" (`common.loading`, an existing key) where the empty box stood.
  - After the first answer it never suspends again, so Try again asks on a page already drawn.
- `YouMobile`: a reader with no session kept is signed out before the first paint, as the shop's signed pages already treat such a reader (`lib/shop/signedOutAtOnce.ts`). The ask still runs, and a signed-in answer stands.
- `theology-row-leaves` is on all 13 page-opening rows, at the end of the class, as the heresies wear it. The rule in `globals.css` is Updates 86's, unchanged. The keyboard's ring stays, and motion on is unchanged.
- Outside the files the brief named, said here: `components/mobile/YouMobile.tsx`, the You page's own component, which is where the flash came from. Also the rows' files under `components/theology/`, `components/legal/LegalPage.tsx` and `components/apologetics/ApologeticsReader.tsx`.

## Tests that fail on the old code

- `lib/campaigns/__tests__/doorHold.test.ts`: 4 of 4 fail on the old code. They cover: asks once and holds until the answer; holds 600 ms at most, then draws; never holds after the first answer; a closed build holds nothing.
- `lib/ui/__tests__/arrivalBoundary.test.ts`: no page behind an empty boundary of its own, and the twelve wear the rule. This fails on the old code. Its other three tests pin the two boundaries left in components and the rule's own render, in the HTML and after a switch.
- `lib/ui/__tests__/youSignedOutAtOnce.test.ts`: fails on the old code.
- `lib/theology/__tests__/rowsThatLeave.test.ts`: every `theology-row` link leaves (fails on the old code). The rows that stay are buttons that change their own page.
- Updated to the new source:
  - `doorStates.test.ts` (the gate's states; fails on the old gate);
  - `closed.test.ts` (the gate's pattern);
  - `florilegium/redesign.test.ts` (the gathering's boundary);
  - two full class strings in `theology/leaf.test.ts`.

## Checklist

- `npm run typecheck` 0.
- `npm run test:unit`: 1219 files, 15,295 passed, 9 skipped. The first run had 8 failures in four older tests that pinned the old source; they were updated as above.
- eslint on the changed files: clean.
- `npm run build` (web): passed.
- Push guard: passed.
- One export of `2eb10be5` (`node scripts/gate/export.mjs`, exit 0).
- checkMock with pixels: not run. No drawing changed except the door's waiting line, which is a plain status line in the house's classes.

## After: the walk on that export

`walk.sh`: both readers, motion on and then `--reduced`, two runs each, one worker. `--only` covered the twelve pages, /account/ and five theology screens. `--controls` named the creed's, library's, legal and verse rows, plus "Open Security" and "Choose what email you get".

| line | before | now (8 runs) |
|---|---|---|
| switch into /campaigns/detail/ | blank 7 of 8 | 0 of 8 |
| switch into /email/change/ | blank 2 of 4, motion on | 0 of 8 |
| switch into /email/first-week/, /email/unsubscribe/ | 0 of 8 and 1 of 8 | 0 of 8 each |
| switch into /bible/multi/ and the seven other pages | (Updates 89: /bible/multi/ empty, 2 of 2) | 0 of 8 each |
| /account/, reduced | flash, 3 of 4 | 0 of 4 |
| the creed's rows ("The Symbol of the Faith", "The Niceno-Constantinopolitan Creed", "The Creed, line by line"), reduced | lit before the cut | 0 of 4, each tapped in every run |
| "Open Security", "Choose what email you get" | 0 of 8 (Updates 83) | 0 of 8 |

- Every run walked 18 of 18 screens: 0 errors, 0 unsure.
- The four reduced runs: 0 findings.
- Each motion-on run had 2 findings, both "layers in passing" on arrival at /councils/first-nicaea/the-symbol-of-the-faith/ from the creed's row. The work's top bar plates meet its progress line, and its chapter pill meets the tab bar. These are crossings for the eye under Gate 3c's rule 4, not a blank or a flash. They come from `MobileTopBar` and `MobileWorkPill`, not my files, and motion on was not changed here.
- /set-password/, two more runs (motion on, the open reader, the lane of Updates 83's one blank; records `setpw-*.json.gz`): run 3 clean; run 4 **blank, 22 frames** (at most 3% inked), the same as Updates 83's. **Now seen twice in that lane, so it is a fault (repeated).**

## Left

- **/set-password/'s arrival blank, now repeated** (1 of 8 for Updates 83, 1 of 2 here). It is not one of my twelve pages, and its cause is not proved. The likely one: the gate's hold (`lib/auth/signedHold.ts`, 600 ms) ends before the session read answers on a cold client, so the gate draws its waiting line, which is nearly empty, for 22 frames. To prove it, time `resolveUser()` against `HOLD_MS` on the first visit. Left to Updates 83's line, because the brief left that file alone unless a cause was proved there.
- **The reduced pass reached only the creed's rows.** It takes six controls a screen, so the library's "The Creed" row, "Terms of Service" on /privacy/, "Psalm 14:1" on /apologetics/atheism/ and "2 Peter 1:3-4" on /theology/theosis/ were tapped only with motion on (0 findings). They share the creed rows' class and rule, and the creed rows read 0 of 4 reduced. A walk with a higher control limit, or a probe, would measure them reduced.
- **Rows that stay lit:** the fasting days and the legal contents. Both are buttons that change their own page and stay on screen, so the press shows its full time. The journal's "begin" row opens the writer in place; whether the writer covers the row before the press ends was not measured.
- **Not changed:**
  - `RouteTransition`'s `QueryRoute` and `ReadingRoom`'s `AddressSync` keep their empty boundaries. Neither wraps a page, and both draw nothing.
  - A cold start on one of the twelve pages still shows the HTML's empty boundary until it wakes, as before. It is not a switch.
- **The door's line:** an answer that comes just after the 600 ms bound draws "Loading…" briefly before the campaign.
