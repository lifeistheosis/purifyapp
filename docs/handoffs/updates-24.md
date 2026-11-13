# Baton: Updates 24 (a fixer: the held patches, the sticky case, the cart in Arabic, 1.9)

Written 2026-11-13 about 20:20 UTC by Updates 24 (session_01VuYTwbcav3jzTWqxJJUMWN), reporting to Arbiter 3 (session_01VuYTwajSPo1Rq2R34jWrk6), rotated at its context budget (200,000 tokens). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton. `docs/handoffs/updates-22.md` and `docs/handoffs/updates-18.md` hold the lists this round worked from.

## Role and scope

Mend what the arbiter routes, each fault with a test that fails on the old code, proved on an export cut by `scripts/gate/export.mjs`. Nothing changes how a screen looks at rest without his yes. His ruling (2026-11-13): in-page changes that move content move as page switches do; a filter or a count may change at once.

## Done (hashes)

- `ea902a0e` **Community's replies move in after the opening's move** (Updates 22's held patch): `afterMoves()` in `lib/ui/inPageMove.ts`. Test `inPageMove.test.ts` (fails on the old code). Works as written (the probe below: the replies land in a second move at 501ms, after the first ends at 498ms). It does not mend the walk's "0 replies" (Open, 1).
- `de7a9737` **/premium/: the plan cards' faint shares on Councils and Cappadocian** (Updates 22's held patch). Test `premiumPlanCardEarned.test.ts` (3 of 3 fail on the old code). checkMock by colour on the export of `99ce873f`: /premium/ at 1032, 800 and 390, English and Arabic, 22 palettes: 6 of 6 pass.
- `63960bc8` **The misplaced check reads a box in a sticky box against that box** (the arbiter's call): `scripts/gate/inpage.mjs` (`carriersOf`'s `held`, `placeOf`; the sampler's `held` account), `scripts/gate/frames.mjs` (the line names the sticky box and how it moved; three self-test cases). Self-test 23 of 23; on the old check the three sticky cases were all wrong. Alaska's People on the open reader: "Kodiak" read in `div[data-thread-map]`, the map 71px on the screen, the label 0px in it, three runs of three (`docs/handoffs/updates-24-walks/probe-held.mjs`). A sticky box itself is still read as carried or stuck (all or none).
- `992cd3cb` **The cart button and back-to-top placed by the end** (item 2): `CartFab` end-6 and its count -end-1, `ScrollToTop` end-7, the stack rule `html.has-cart-fab .back-to-top` by `inset-inline-end`. Back-to-top shares that corner on the website, so mirroring the cart alone would have split the pair in Arabic. Test `cartFabMirror.test.ts` (3 of 3 fail on the old code). Its round's state is in "Round 2" below.
- Checks for round 1 (on `99ce873f`): typecheck 0, unit 14,614 pass (9 skipped), lint clean, web build green.

## Round 2 (item 2)

Cut and checked at the end of this chat: see the last lines of this file for what ran. If they say "not run", run them: the export of the head, checkMock by colour on /shop/request/ at 390, 800 and 1032 in English and Arabic (`SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node docs/handoffs/updates-21-walks/touched-check.mjs --out <export copy> --only /shop/request/ --pixels never`), the web build (CSS changed), and the cart tapped at 1032 (`--size 1032x800` on the motion walk; the button is hidden below md).

## Open, in the arbiter's order

1. **"0 replies" on Community, both readers: 55% of the change in one frame at 190 to 199ms. Waiting on the arbiter's call.** The held replies patch was aimed at a cause that was not this one. An empty thread opens 28px (a hairline and padding; `SkeletonList rows={0}`), the posts below glide 28px, and the house curve's first moving frame covers about 10px of it. The cut measure (`scripts/gate/frames.mjs`, the distance share) reads a short glide of words as half the change, because a shifted line of words is far from both the screen before and the screen after. The strip: three frames, before, still before, then 10px down. Two ways: a glide allowance in the cut rule, with a self-test case (a gate change, the arbiter's call), or an empty thread that opens another way (a look change, his yes). The strip also shows **a thin vertical line at the card's start edge while the thread opens**: check it against the stripe rule with the replies open (checkMock measures the card only at rest).
2. **checkMock cannot measure /community/:** the browser closed on all 6 runs (390, 800 and 1032, en and ar, with pixels and without) on the export of `99ce873f`. Not looked into.
3. **The council's "Next: Canon I"** (270px jump with a blank). Read, not started. Every way to a section of a work goes through `useGoToChapter` (`components/saints/useWorkPlace.ts:164`), which sets `window.location.hash = #sN`: the pill's Prev and Next (`components/saints/MobileWorkPill.tsx:175, 207`), the foot's `KeepReading` and the contents sheet, for the councils (`components/councils/CouncilReader.tsx`) and every Father's work alike. The section switches at once, and `useLanding` scrolls to its top a moment later, which is the jump. The plan: take the step with `movePageUntil(() => { location.hash = ... }, awaitArrival(KEY))` and have the landing call `arrive(KEY)` once it has scrolled, so the new section is pictured already at its top. The picture is held for HOLD_MS (320ms) at most, so the landing must come inside that. One mend for every work reader, so walk a Father's work as well as a council. The old commit `ab4adfd3` (the ways in by link) is not in this shallow clone.
4. **The profile card's 240px** (Updates 22's item 2, its plan stands: keep the panel's top in layout, the growth a transform). This round's walks: Purify and Anoubius 240px, ivan.rizevski 116px, both readers. The status row needs the profile's `status` in the feed's author fields (`app/api/community/posts/route.ts`, then `ProfileSeed` and `seedProfile`): a server change that reaches the apps only from the merge; say so in the record. No migration: if one seems needed, stop and tell the arbiter.
5. **Causes 7, 8 and 9 and the shop item's zero-length transform; the council's plate as stills for his yes, no build:** not started. Updates 18's notes stand (`docs/handoffs/updates-18.md`, Open 3 to 6).

Also seen on Community, both readers, not this round's: the switch into it (a blank of 457 to 495ms, and an article placed 81px), "Ask a Priest" and a reader's name blank while the main web answers.

## Gotchas

- **checkMock with pixels (`--pixels auto`) runs about 8 minutes a screen and width on 22 palettes; by colour (`--pixels never`) about 1.** Updates 22's contrast faults were found by colour.
- **The motion walk does not print the sticky account.** `docs/handoffs/updates-24-walks/probe-held.mjs <export>` taps Alaska's People with the gate's sampler and prints `held` and `misplaced`; `probe-replies.mjs <export> "<label>"` prints a Community tap's View Transitions and the card's height frame by frame. A scratch script imports Playwright by its full path (`/home/user/purifyapp/node_modules/playwright/index.mjs`), as ESM does not find it from another folder.
- **To check while the export runs:** a worktree with `cp -al node_modules` (hard links, instant) takes the typecheck and the suite while the export stashes the website's trees in the main checkout. Never the web build at the same time as an export in one checkout.
- **A push can be refused by another chat's push between the pull and the push** ("cannot lock ref"): pull --rebase again and push.
- A fresh container has no `node_modules`: `npm ci`, then `npx next typegen`.

## His words that still apply

- 2026-11-13 (relayed): "in-page changes that move content ... move as page switches do; a filter or a count may change at once."
- 2026-11-10: "Every page switch is a transition" (CLAUDE.md).
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## Round 2's record

On the export of `06707208` (the cart's commit before its rebase; pushed as `992cd3cb`, the same files): typecheck 0; unit 14,678 pass (9 skipped); checkMock by colour on /shop/request/ at 1032, 800 and 390, English and Arabic, 22 palettes: 6 of 6 pass, the mirror rule included (the fault was at 800 and 1032 in Arabic). The cart tapped at 1032 (new reader, `--size 1032x800`): it opens in 152 to 166ms with no transition fault. The web build: green.

**New, not made by this round:** at 1032 in the native shell, once the cart is open, the tab bar is drawn over the cart drawer: `aside "Cart"` meets `nav[data-tab-bar]` "Primary", 122 by 77px at 632,717 (the layers check at rest). The drawer's placement and the tab bar are unchanged by the mend, which moved only the floating button (the same side in English). Open, for the arbiter to route.
