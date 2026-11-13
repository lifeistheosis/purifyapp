# Baton: Updates 22 (a fixer: the calendar's earned red, the misplaced check, the in-page faults, 1.9)

Written 2026-11-13 by Updates 22, reporting to Arbiter 2 (session_01VuYTwbacb8geNS4VjyJwQh), rotated at its context budget (200,000 tokens). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton. `docs/handoffs/updates-21.md` and `docs/handoffs/updates-20-inpage-sorted.md` hold the list this round worked from.

## Role and scope

Mend what the arbiter routes, each fault with a test that fails on the old code, proved by the gate's walks on an export cut by `scripts/gate/export.mjs`. Nothing changes how a screen looks at rest without his yes. His ruling (2026-11-13): in-page changes that move content move as page switches do; a filter or a count may change at once.

## Done (hashes)

- `e396208f` **The calendar's feast red on Cappadocian.** The red lifted a hair (214 78 62 to 219 83 66, OKLab L +0.014, hue and chroma kept) and the names given the full red on that palette: 4.6:1 on a feast day's cell (were 4.38 numbers, 3.77 names). The red is used only by the calendar. Proved on the export of `968347b3`: /calendar/ passes contrast on all 22 palettes at 800, 1032 and 390, English and Arabic. Test `lib/ui/__tests__/calendarRubricEarned.test.ts` (3 of 5 fail on the old code).
- `0ad69980` **The misplaced check reads a new box's place on the page** (the arbiter's call): each new box carries the scroll of every scrolled box it stands in and of the page, unless it stands in a fixed layer (a sticky row may be either). Self-test, four new cases: carried by the page passes; moved against the glide fails; left behind fails; a bar fixed to the screen passes. On the old check the carried label failed and the left-behind one passed.
- `f6dda724` **The rest of Gate 2.0's in-page faults** by `lib/ui/inPageMove.ts`: Community (replies open and arrive, Read more), a plan's day marked, Today's Dismiss (the card folds away) and "2 more", the prayer book's chapters, the pagers and tabs (a study's parts, the first liturgy's steps, the saints' web views), Job's order, pricing's Try it (the screen read first, `readTryScreen`), the florilegium's Begin, the disclosures (legal Contents, More details, Settings' goal, Start from), /premium/'s two links (`components/ui/GlideLink.tsx`), the two lines a tap shows (Buy now, /signup/), the gift's Try again. A part that leaves folds away and a part that comes is let down (`app/globals.css`, `:only-child`). Tests: `inPageMove.test.ts`, 13 new, each failing on the old code.
- Checks on the export of `968347b3` (the same app as `f6dda724`; only a gate script came in on the rebase): typecheck 0, lint clean, unit 14,611 pass, web build green; checkMock by colour on /calendar/, /settings/, /signup/, /premium/, /gift/, /prayers/, /florilegium/, /shop/request/, /prayers/personal/ at 390, 800, 1032, en and ar, 22 palettes: 48 of 54 pass, the 6 fails are below (not made by this round).
- Held as patches (after the export, so not pushed): `docs/handoffs/updates-22-premium-earned.patch` (`e743689e`) and `docs/handoffs/updates-22-replies-after-move.patch` (`9f14c2bb`). Apply with `git apply`, then the fix checklist.

## The walks

The motion walk (`scripts/motion-walk.mjs`, `--online --workers 2`) on the export of `968347b3`:

- **New reader, 24 screens:** every control this round changed passes: /plans/acts/ 19 tapped, 0 failed; the prayer book 29, 0; Comma Johanneum's reader 13, 0; the first liturgy 5, 0; the saints' web 11, 0; Job's order 12, 0; /pricing/ 16, 0; the legal texts 25, 0; /shop/request/ 11, 0; /prayers/personal/ 7, 0; /premium/ 7, 0; /signup/ 11, 0; What's new 11, 0; Alaska 14, 0 (the new misplaced check); Today 30, its one fail the Paschal Homily's blank (cause 7); the shop item 30 with Buy now passing, its 8 fails the cards' uncarried pictures and blanks (causes 7 and 8); Settings 28, its 14 fails all First focus and Familiarity (ALLOWED under his ruling; the goal tile passes); "Before you read" passes, its one fail "Next: 1 Chronicles 2"'s blank (a page switch). Community 30, 8 failed: the profile card (item 3), blanks on "Ask a Priest" and a name while the main web answers (not this round's controls), and **"0 replies": cut 55% at 180ms, its empty answer landing while the opening moved: mended in the held replies patch.**
- **Open reader, 4 screens:** the florilegium 12, 0 (Begin); /plans/acts/ 19, 0 (Mark day N); /gift/ 8, 0 (Try again); Alaska 13, 1: People's map label "Kodiak" drawn at 125, then 54 on the screen as the page scrolled 165. The map is sticky (`components/history/EventThread.tsx:217`): the label rode the page 71px until the map stuck. The check's sticky case takes all of the page's carry or none, not part: **next, accept a part between none and all in a sticky row, with a self-test case** (the arbiter's call).
- **The council's "Next: Canon I"** re-walked: still a 270px jump with a blank (the reader pill's Next is a button; `ab4adfd3` mended five ways in by link). Open.
- checkMock's pixels pass was not run on this round: nothing at rest changed on a picture (the colour pass measured every word not on a picture).

## Open, in the arbiter's order

0. **Apply the two held patches, export, walk /community/ (both readers) and checkMock /premium/ at 1032 on Councils and Cappadocian, push.** Then the council's Next (open above) and the sticky-row reading of the misplaced check.
1. **Found by this round's checkMock, not made by it:**
   - /premium/ at 1032: "or $199 / year" reads 4.42:1 on Councils and 4.40 on Cappadocian on the plan cards' lit head, as Candlelight's did on 2026-11-12. **Mended and held as a patch, not pushed** (it came after the export): `docs/handoffs/updates-22-premium-earned.patch` (`git apply`), the two palettes draw a plan card's faint shares at 62 (4.57:1 at Pro's lightest point), with its test `premiumPlanCardEarned.test.ts` (3 of 3 fail on the old code). Next: apply, export, checkMock /premium/ at 1032 on both palettes, push.
   - /shop/request/ at 800 and 1032 in Arabic: the cart button ("Open cart", `CartFab`) is placed by right, not end (checkMock's mirror). Not in this round's files.
2. **Item 3, the profile card's 240px** (`components/community/profile/ProfileViewer.tsx`, `lib/ui/useDraggableSheet.ts`, `smoothHeight`, which only this card uses). Not started. The panel is pinned to the foot and its height is handed over by a CSS height transition (`transitions("resize")` in the reflow effect), so its top moves in layout every frame and the layout-shift API reports it (the steep head of the house curve makes the first frame large). Next step: keep the panel's top in layout (lay it out at its cap, `max-h-[92dvh]`, and rest it shifted down by cap minus content through `paint`), so the growth is a transform. **What the feed needs from the server for the status row:** the feed's posts carry their author's handle, name, avatar, verification, tier and cosmetics, which seed the card (`seedProfile`, `status: null`); the status line (`ProfileCard.tsx`, `profile.status`) comes only with `/api/community/profile`, and drops the ⋯ row 30 to 51px when it lands. The posts' author fields (`app/api/community/posts/route.ts`) need the profile's `status` beside the others, and `ProfileSeed` and `seedProfile` need to carry it. A server change: it reaches the apps only from the merge.
3. **Now Playing's two faults** (bg-black/55 on Light; the docked player not mirrored in Arabic): NOW gives them to Updates 23, the apply chat; not touched here.
4. **Item 4, causes 7, 8 and 9 and the shop item's zero-length transform; the council's plate as stills for his yes, no build:** not started; Updates 18's notes stand (`docs/handoffs/updates-18.md`).

## Gotchas

- **A fresh container has no `node_modules` and no `next-env.d.ts`:** `npm ci`, then `npx next typegen`, or the typecheck fails on 15 `.webp` imports.
- **A component that runs its own height transition inside a move** (the saints' fold, the prayer book) must stand it down while `html[data-in-page]` stands: the move's new picture is live, and a transition under it fights the picture.
- **Older tests pin exact code:** six did here (the prayer book's hold, the try screens' lines, the sign-up box, the gift's button, the rule's start, the plan's mark). Keep the code to their rule where it still holds; widen a test only where the rule changed (the plan's mark now inside the move).
- `PlusTry.tsx` wraps React's `lazy` so a screen read before it is shown is drawn whole, and one React has begun to read stays on its way (never mounts twice).
- The machine has 4 cores: a web build and a motion walk at once make the screencast miss frames ("unsure").

## His words that still apply

- 2026-11-13 (relayed): "in-page changes that move content ... move as page switches do; a filter or a count may change at once."
- 2026-11-10: "Every page switch is a transition" (CLAUDE.md).
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## Where things are

- The helper `lib/ui/inPageMove.ts`; its rules `lib/ui/__tests__/inPageMove.test.ts`; the gliding link `components/ui/GlideLink.tsx`; the misplaced check `scripts/gate/inpage.mjs` (`carriersOf`, `scrolledBy`), its self-test `node scripts/gate/frames.mjs --self-test`.
- The held mend: `docs/handoffs/updates-22-premium-earned.patch`.
- checkMock runner: `docs/handoffs/updates-21-walks/touched-check.mjs` (`--out <export copy> --only ... --pixels never`).
