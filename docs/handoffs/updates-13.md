# Baton: Updates 13 (a fixer: the motion faults Gate 2.0 found, 1.9)

Written 2026-11-13 by session_01VuYTwdymwDBfDw9cMsyNAH (Updates 13), at the arbiter's word (session_01VuYTwdsjYL2mmq2C2JSt2A), rotated at its context budget (200,000 tokens) with causes 1, 2 and 6 done and pushed. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`.

## Role and scope

Mend the faults of Gate 2.0's run over the branch tip (`docs/1.9-build/notes/gate-2.md`, "The run over the 128 screens"; each finding with its screens, files and a still in `gate-2/run-tip.md` and `run-tip-reduced.md`), in the arbiter's order, each with a test that fails on the old code, proved by Gate 2.0's own walks on an export cut by `scripts/gate/export.mjs`, pushed as each passes. Nothing changes how a screen looks at rest; anything that would goes to the arbiter as stills for his yes first. They are faults, so they go in 1.9 (CLAUDE.md: no point release for a fault).

## Done, with hashes (pushed 2026-11-13 about 14:40 UTC)

- **Cause 1, a page switch left the screen empty** (`c3ae2dd4`): in a page that arrived in a View Transition (`.route-fade[data-carried]`) the rows, the opening words and a saint's head start at 0ms (app/globals.css); where the wrapper still fades they wait as before. Test: `lib/ui/__tests__/routeMotion.test.ts`, fails on the old stylesheet.
- **Cause 2, reduced motion that still moved** (`925ef03f`, tests held `497b86d8`, `a1a8d469`): the Prayers and You still rules name their entrances (one class lost to two); `motion-reduce:transition-none` on 20 class lists (the cart drawer, the cart's foot bar, the Plus and Pro buttons, the chevrons of the questions, of What's new and of the chapter screen and profile, presses and hover lifts). Test: `lib/ui/__tests__/stillMeansStill.test.ts` (every still rule weighed, every class list in app/ and components/ read; 4 rules and 20 lists failed on the old code).
- **Cause 6, the page's edge** (`8a79a423`): `[overflow-wrap:anywhere]` on the history's list of sources (`components/history/EventArticle.tsx`). Test: `lib/history/__tests__/longWords.test.ts`, fails on the old code.

**The walks** (export of `bf3d3093`, the same code, cut by `scripts/gate/export.mjs`; self-tests all pass; both readers 12:46 to 13:57 UTC, 128 screens each, 1,373 and 1,365 taps; still path 14:00 to 14:18 UTC, 524 taps):
- Page switches with frames of nothing: 135 in Gate 2.0's run, **41** now. The 41 are all cause 7's: Fathers' works, shop items, sign in, the EIKON store, a lesson, four chapters and a council at 214 to 271ms.
- With motion reduced, moves: 21, **7** now, all one thing on one screen: "div: transform over 0ms" on the shop item page (/shop/icons/byzantine-three-beam-wall-cross/), on every tap there; Gate 2.0 found it unsure. A zero-length animation, no movement seen; find what starts it.
- Findings, open reader: 430 then, 307 now. Dips (a fifth of a second or less) rose, 647 to 822: blanks that became short.
- Cards not carried: Gate 2.0's 30 cards, grouped 48 now, the same sections (councils, theology, shop, saints) and the Prayers tab's hours card, which changes with the hour (the Sixth Hour at 13:00 UTC).

**Owed from this round** (the next chat's first export covers them): the edge walk on an export carrying `8a79a423` (`--only /history/alaska-mission/,/history/philokalia-published/`); checkMock with pixels at 390, 800 and 1032, the five palettes, the fifteen looks and Arabic, on the touched screens (nothing changes at rest: only the still path's transitions and the entrances' start). Typecheck 0, the whole unit suite (14,503) and the web build passed; lint clean on the changed files (one old warning in ProfileDanger.tsx line 45, not this round's).

## Open, in the arbiter's order, with what is known

1. **Jumps as pages arrive (42; arbiter's item 3).** Measure each on the export before mending: a short probe that logs, every frame from the tap, the box of the one that jumps and what stands above it. Known so far, by reading:
   - **The council reader jumps 270px at a canon** (`components/councils/CouncilReader.tsx`, five ways in). Cause, by reading, to confirm: the book's cover (`components/reading/OpeningCover.tsx`, about 270px) stands over the section the book opened on (`useOnOpening` in `components/saints/useWorkPlace.ts`). On a page switch the page renders before Next writes the new address to `window.location` (its history update runs after the commit), so `targetNow` reads the old address, no `#s<n>`, takes "first", and `onOpeningNow` keeps that as the chapter opened on; then the hash arrives, the chapter is the canon's, the cover is no longer "here" and goes: the article jumps up by the cover. A mend reads the address being opened, not the one being left.
   - **The route box snaps up 51px** (`div[data-carried=forward]`, five chants, the Theotokos, "Back to the Bible"): the new page is first drawn 51px down, then at 0. 51px is the apps' back bar (`components/nav/NativeBackBar.tsx`, `topbar-safe`), present on the page left and not on the page arriving (`shouldShowBack`, `lib/nav/backBar.ts`: chant pages and saints own their bar). Not proved: find on the export which frame has both the new page and the old bar, and why.
   - **The chapter pill rises 76px**, Listen moves 48px sideways, the verse count 25px (`MobileChapterPill.tsx`, `ReadAloud.tsx`, `ChapterVerseStatus.tsx`): parts of the pill that arrive after the chapter. Not read yet.
   - **Community's head grows 84px** as the feed loads (six ways in), its first post drawn 80px from its place; **lists that load and push the page**: Reading plans 354 to 360px, Export 362px, Settings' "Your space" 131px, Today's prayer's fasting line 198px, the shop 153px, a shop category's row 170px sideways, Change email's "Open Security" 75px, /gift/'s "What Plus opens" 52px. Each: give the late part its room from the first frame.
2. **Sheets (arbiter's item 4):** the Terms sheet rises with "Loading..." before its words (`components/legal/LegalLink.tsx`); the Purify profile card snaps 240px taller as its rows arrive (`components/community/profile/ProfileViewer.tsx`). Not read yet.
3. **Layers that meet (arbiter's item 5):**
   - **Alaska's mission, a real fault:** the parts row (`components/history/EventPartsNav.tsx`, `.history-era-head`: sticky at `--history-sticky-top`, z-10) and the thread map (`components/history/EventThread.tsx` line ~217: sticky at `--history-sticky-top + 0.5rem`, z-10, later in the page) pin at the same line, so the map covers the row, the row's pill showing 1px at the map's sides, and the map slides over the pinned row on the way. The least visible mend (nothing changes at rest): the row hides while the map is pinned (a passive scroll listener with one rect read a frame, or an IntersectionObserver). Pinning the map under the row instead changes the look at rest: stills for his yes first.
   - **The theology path's top bar over its step room: by reading, the check's miss, not the app's.** The step room (`app/(app)/theology/path/[subject]/page.tsx`, `.step-room` in app/globals.css) is the page's backdrop on a phone: `position: fixed`, `z-index: 0`, aria-hidden, behind the page, 70% of the screen tall; the overlay bar over its picture is the house's designed bar over a picture, as on a saint's page. The layers check counts a fixed box under 85% of the screen as a floating layer (`scripts/gate/inpage.mjs`, `GROUND = 0.85`). Put to the arbiter for a ruling (a fixed backdrop behind the page's own words as a ground) with stills `gate-2/tip/001-*` and `002-*`; do not change the design or the check without it.
4. **Pages that fetch draw nothing; pop-in cuts; a chapter's extra wait (arbiter's item 7).** Not started. Re-read `run-tip.md` "Page switches: blank" and "cut" on the new run first: cause 1's mend removed the shared 260ms wait, so what is left is each page's own.
5. **A card's picture not carried (30; arbiter's item 8).** Not started. The rule and the wiring: `lib/ui/routeMotion.ts` ("A picture that leads to its own page"), `data-carry` / `data-carry-into`.
6. **The eight feature walks that ask for reduced motion (arbiter's item 9),** named in `scripts/gate/motion.mjs`: run each with motion on as well (pin with `scripts/lib/motion.mjs`). Not started.
7. **Rulings waiting on him, relayed by the arbiter (do not act before):** in-page changes (must a tab, a pager, a question opening move as a page switch does); Discover's doors (carry a picture into a head the page does not show); a council's plate (does a styled box read as an empty picture).

## Gotchas

- **The export in a worktree** keeps the main checkout free: `git worktree add --detach /home/user/cut <head>`, `cp -al node_modules /home/user/cut/node_modules`, `(cd /home/user/cut && rm -rf .next && npx next typegen)`, then `NODE_USE_ENV_PROXY=1 node scripts/gate/export.mjs --cwd /home/user/cut`; the export is `/home/user/cut/out`. About five minutes.
- **The walks are timed:** run nothing heavy beside them (no typecheck, suite or build). Two readers at once, each in its own background command; the self-tests first (four minutes).
- **`:where()` weighs nothing.** A still rule must name what its entrance names (`lib/ui/__tests__/stillMeansStill.test.ts` weighs every one).
- **Tailwind's transform transitions need `motion-reduce:transition-none`** (or `motion-safe:` on the transition); the same test reads every class list in app/ and components/.
- **A carried route** (`.route-fade[data-carried]`, set by `quietEntrance` in `lib/ui/routeMotion.ts` when a View Transition brings the page) has no wrapper fade; nothing in it may wait for one.
- The commit's Claude-Session line is the chat's own session, never the arbiter's.

## His words that still apply

- 2026-11-10: "Every page switch is a transition" (CLAUDE.md): no instant cut, a card carries its picture into its page, reduced motion stays still.
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9." (a fault goes into the release)
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always" (the main web's public anon key for an export, read into the command alone).

## Where things are

- Gate 2.0's record and findings: `docs/1.9-build/notes/gate-2.md`, `gate-2/run-tip.md`, `gate-2/run-tip-reduced.md`, stills in `gate-2/tip/` and `gate-2/tip-reduced/`.
- The walks: `scripts/motion-walk.mjs` (`--self-test`, `--reduced`, `--only`), the checks in `scripts/gate/`.
- This round's tests: `lib/ui/__tests__/routeMotion.test.ts` (cause 1), `lib/ui/__tests__/stillMeansStill.test.ts` (cause 2), `lib/history/__tests__/longWords.test.ts` (cause 6).
