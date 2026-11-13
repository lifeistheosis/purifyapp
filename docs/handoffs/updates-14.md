# Baton: Updates 14 (a fixer: the motion faults Gate 2.0 found, 1.9)

Written 2026-11-13 by session_01VuYTwdt67sQ146pyR6KYSs (Updates 14), at the arbiter's word (session_01VuYTwdsjYL2mmq2C2JSt2A), rotated at its context budget (200,000 tokens) with part of causes 3 and 4 and all of cause 5 done. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton, `docs/handoffs/updates-13.md` (its gotchas still hold), Gate 2.0's record (`docs/1.9-build/notes/gate-2.md`, the findings in `gate-2/run-tip.md`).

## Role and scope

Mend Gate 2.0's findings on the tip in the arbiter's order, each with a test that fails on the old code, proved by Gate 2.0's walks on an export cut by `scripts/gate/export.mjs`, pushed as each passes. Nothing changes how a screen looks at rest; anything that would goes to the arbiter as stills for his yes first. Faults go in 1.9.

## The one mechanism behind most of cause 3 (proved this round)

**A page switch is a View Transition, and react-dom flushes a render that an effect asks for only once the transition's picture is ready** (`node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js`, `startViewTransition`: `spawnedWorkCallback` runs in `transition.ready.then`). So anything a page draws only after a layout or passive effect (the day, the reader's session, a measured fit, a value from storage) is not in the picture: it lands in the live page a moment later and what is under it jumps. "Read before the first paint in a layout effect" is not before the picture. The mend is to know it in the render itself on the device: `useSyncExternalStore(noSubscribe, () => true, () => false)` as an "on the device" flag (false on the server and while a page wakes from its HTML, so nothing is baked into the export), or an at-once store such as `useTodayAtOnce`.

**And Next writes a new address to the window after the page arriving has rendered** (its history update is an insertion effect in the commit), so a page that reads `window.location` as it renders reads the address of the page being left. `lib/nav/addressOpening.ts` (`hashFor(pathname)`) answers the address being opened, from the tap (noted in `components/nav/RouteTransition.tsx`).

## Done this round, with hashes (pushed 2026-11-13; see the report for the walk)

- `85aa56fc` **Gate 2.0's checks.** (1) The jump rule passes a layout shift inside a View Transition's own swap (from its update to `ready`, recorded in the page by `scripts/gate/inpage.mjs`, `window.__gateSwaps`): the route box's 51px "snap" on five chants, the Theotokos and the Bible was the back bar of the page being left, under the old page's picture (measured: update 230 to 335ms, shift 344ms, ready 351ms; the stills show the old page). A shift after `ready` still fails. Self-test cases `swap` (failed on the old rule as the chants did) and `swapjump` (fails on both). (2) The layers check counts a fixed box behind the page (z-index 0 or below, inside aria-hidden) as the page's ground, at the arbiter's ruling (the theology path's step room). Self-test: the backdrop passes (failed on the old rule), the same box raised to z-index 4 still fails.
- `9e193a63` **The council reader's 270px jump** (five ways in): the book read the old address as it rendered (proved: the kept place read at 228ms at the heresy's address, the cover drawn at 415ms and gone at 525ms). Now `targetNow(owner, slug, pathname)` reads `hashFor(pathname)`. Test `lib/nav/__tests__/addressOpening.test.ts`.
- `7b9c2ce5` **The day and the session in the render.** `useToday` is now `useTodayAtOnce` (21 screens: Reading plans' season card pushed "More plans" 354px; Today's prayer's fasting line 198px). Settings' account section (131px) and Community's composer row (84px, the Sign in box replacing a 42px placeholder) read `readLocalSessionUser()` in the render. Test `lib/ui/__tests__/arrivesWhole.test.ts`.
- `08f88c2e` **Alaska's mission** (cause 5): the parts row fades out of the way (200ms, still when motion is reduced, no taps) while the thread map's box stands over it; nothing changes elsewhere. Test `lib/history/__tests__/partsUnderMap.test.ts`.
- `cb2678b3` **The Terms rise with their words** (cause 4, first half): `LegalLink` fetches its text 700ms after it is on the page and at the first touch (`preloadLegal`), and `LegalSheet` draws a fetched text in its first frame. Test `lib/legal/__tests__/legalSheetRises.test.ts`.
- `7867cac8` **The frame probe**, `scripts/gate/probe.mjs`: one screen, one tap or `--push`, every frame's address, pushState, the View Transition's update and ready, layout shifts, storage reads, watched boxes, nodes added and removed; `--cpu 4` slows the page as a walk's load does (the council's cover showed only so).

- `7b249041` **Alaska's row, again:** the walk of 7867cac8 still found the row and the map meeting at rest (Alaska's mission and the Philokalia, the open reader): the row looked for the map once as it mounted, and the map is drawn after it. Now asked inside each read.

**The walks** (Gate 2.0's motion walk, both readers, 2 workers each, `--online`, on the export of `7867cac8` cut by `scripts/gate/export.mjs`; 18 screens: the council and heresy pages, Community's ways in, Reading plans, Settings, You, Today's prayer's ways in, the chants, the Bible's multi-verse page, the theology path, the two history accounts, Sign in; 330 and 329 taps; then the two history accounts again on `7b249041`, the open reader, 50 taps):
- Gone on these screens: the council's 270px jump; the chants' and the Bible's 51px route box; Reading plans 354px; Settings' "Your space" 131px; Today's prayer's 198px; the theology path's two layer meetings; Alaska's and the Philokalia's meeting at rest (after `7b249041`); the Philokalia's line off the page's edge (the edge walk Updates 13 owed: none on either screen).
- Left, page switches: Community still settles after it arrives (its filter section moves up 31 to 77px at 450 to 690ms, its posts drawn 77 to 158px low first; the 84px composer jump is gone): its feed or head shrinks a placeholder; the shop from Discover 153px at about 1.2s; from a history account into a chapter, Listen 48px sideways and the next-chapter strip 91 to 162px (the chapter pill, below); 19 cards not carried (cause 8); 2 to 4 blanks (cause 7).
- In the page, for the ruling: the chants' filters (64 to 191px) and Settings' radios (26 to 48px) move what is under them at once.

Tests updated because they pinned a line this round changed, each still holding its intent: `lib/ui/__tests__/routeMotion.test.ts` (the lift is still the first thing a capturing tap does), `lib/reading/__tests__/openingCover.test.ts` (the hook's call gained the path), `lib/history/__tests__/calmHistory.test.ts` (the row's class list is now in `cn(...)`).

## Open, in the arbiter's order, with what is known

1. **Cause 3, the rest** (each probed on the export of fa6b1b53 with `scripts/gate/probe.mjs`; all land after `ready`, so real):
   - **The chapter pill** (`components/bible/MobileChapterPill.tsx`): from Today's "Read all 4" or a plan's Begin, the pill rises 76px at about 880ms (`div.md:hidden` 650 to 574): its `bottom` is `--pill-lift`, which includes `--readings-flow-h`, set late by the readings' flow bar; give the flow bar's height from the first render (where is it set? grep `--readings-flow-h`). Listen moves 48px sideways (x only, 251 to 299) at about 920ms: the pill's `fit` (measured in layout effects, `frameWidth` from a ResizeObserver) re-lays it after the picture; and the pill's fade (`span.pill-fade`) grows in steps of up to 77px. The verse count (`ChapterVerseStatus.tsx`) moves 25px at about a second. The same shapes on a Father's work (`components/saints/MobileWorkPill.tsx`: "Chapter 3 of 14" 27px, a span 30px).
   - **Community's settling** (above): probe `/discover/` "Chat" with `--watch 'section'` and find what shrinks above the filter row.
   - **The gift page** (`components/gifts/OrderGiftClient.tsx`): "What Plus opens" moves up 52px at 580ms as `/api/gifts/order` answers; the loading state holds a 48px invisible pill and a 16px skeleton, the answer for a signed-out reader differs. Read which branch the walk gets, then make the loading shape the signed-out shape (the device knows it is signed out: `readLocalSessionUser()`).
   - Not yet probed: the shop 153px (`/shop/`, at 815ms; my probe with `--online` saw no shift, so it depends on the catalog's timing), a shop category's row 170px sideways, Export's "Download Markdown" 362px (find its path: not `/account/data/export/`), Change email's "Open Security" 75px, Community's filter row 24px at 671ms.
2. **Cause 4, the second half: the Purify profile card** snaps 240px taller as its rows arrive (`components/community/profile/ProfileViewer.tsx`, 688 lines; it shows the seed from the feed while the profile loads, `seedProfile`). Not read further. The mend should keep the rows' room while loading, or grow the sheet in the house's motion; a height that changes at rest is not a fix.
3. **Cause 7, pages that fetch draw nothing** (41 blank switches in Updates 13's walk): not started. Re-read `run-tip.md` "Page switches: blank" against a fresh walk first; this round's mends may have moved some.
4. **Cause 8, pictures not carried** (theology path plates, councils, saints from the theology hub, shop cards, the EIKON door): not started. Wiring: `lib/ui/routeMotion.ts` ("A picture that leads to its own page"), `data-carry` / `data-carry-into`.
5. **Cause 9, the eight feature walks with motion on as well** (named in `scripts/gate/motion.mjs`): not started.
6. **The shop item's "transform over 0ms"** (seven, still path, `/shop/icons/byzantine-three-beam-wall-cross/`): not started; probe it with `--reduce` and `--watch` on the moving div.
7. **Owed:** checkMock with pixels at 390, 800 and 1032 on the five palettes, the fifteen looks and Arabic, on the screens this round and Updates 13 touched (Settings, Community, Reading plans, Today's prayer, a council's document, the history account page, the legal sheet). Nothing changes at rest, but the checklist asks it.
8. **Rulings waiting on him** (do not act before the arbiter relays them): in-page changes; Discover's doors; a council's plate.

## Gotchas (new this round; Updates 13's still hold)

- **A fresh container has no `node_modules` and no `next-env.d.ts`:** `npm ci` (about 25 seconds), then `npx next typegen` before `npm run typecheck`, or 15 errors about `.webp` modules in `components/admin/drop/cards.generated.ts` appear that are not the code's.
- **The export in the worktree:** `git worktree add --detach /home/user/cut <head>`, `cp -al node_modules /home/user/cut/node_modules`, typegen there, `NODE_USE_ENV_PROXY=1 node scripts/gate/export.mjs --cwd /home/user/cut` (about two minutes). Keep a baseline with `cp -al /home/user/cut/out /home/user/out-base` before cutting again.
- **A self-test plant must make the browser report what the app makes it report:** the swap case passed on the old rule until the page stood in the flow under the bar (`.screen` is absolute in the self-test page). Prove each new case both ways.
- **Source-reading tests pin exact lines:** after the suite, run `npx vitest run lib/ui/__tests__ lib/history/__tests__ ...` for the folders whose tests read the files you touched; `vitest related` does not see them.

## His words that still apply

- 2026-11-10: "Every page switch is a transition" (CLAUDE.md).
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".
