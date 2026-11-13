# Baton: Updates 31 (a fixer: the last faults of 1.9)

Written 2026-11-13 about 23:55 UTC by Updates 31 (session_01VuYTwZVmq1NTz1N2aYeCeR), reporting to Arbiter 3 (session_01VuYTwajSPo1Rq2R34jWrk6), then Arbiter 4 (session_01VuYTwcgDURTqVoLw8nQD9m), rotated at its context budget (200,000 tokens). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton; `docs/handoffs/updates-18.md` (Open 3 to 5) for causes 7, 8 and 9.

## Role and scope

Mend what the arbiter routes, each fault with a test that fails on the old code, proved on an export cut by `scripts/gate/export.mjs`. Nothing changes how a screen looks at rest without his yes: such a mend is held as a patch and named to the arbiter. One export per round.

## The arbiter's calls (2026-11-13, carried)

- A writer's changed name: the feed shows the writer's current name wherever the profile is readable, from the same read as author_status; a private profile keeps the post's own name. A server change, no migration. **Done** (below).
- The first launch's screens stay as they are (his no to round 2's redesign); only their faults are mended.
- "Ask a Priest" and a reader's name blank while the main web answers, and the switch into Community, are the main web's pre-merge state unless found otherwise.
- From Updates 30: Community's thread rail is a connector, not a side stripe (its removal held as `docs/1.9-build/drafts/community-thread-rail.patch`); `--pixels always` belongs to the pre-build gate.
- Beside this chat: Updates 26 (the looks and Settings), Updates 28 (the Fast, the Journal, the ambience, the emails), Updates 29 (round 1, notes 29, 17, 9). In the 21 catalogues and `app/globals.css` keep both changes.

## Arbiter 4's next round (22:57 UTC, delivered late, after the container's restart; not started)

Reports go to **Arbiter 4, session_01VuYTwcgDURTqVoLw8nQD9m** (Arbiter 3 handed over at 22:47). One export and the fix checklist; each needs a test that fails on the code now. Details and commands: `docs/handoffs/updates-28.md` (0fc5adf0), "Open" item 1.

1. The ambience sheet: two taps move a tile 7px and 9px against the limit of 4 ("The sea: takes Rain's place" and "Bell and stillness: stops"); suspected `useHoldStill` in `components/player/AmbienceSheet.tsx` as the per-sound volumes close. Shown by `scripts/gate/ambience-sheet.mjs` run alone.
2. The Plus preview's strip: a tap on The sea moves its tile 13.3px (`SELLS_PLUS=1 scripts/gate/ambience-sheet.mjs`).
3. checkMock with pixels fails the Plus preview at 390 only (English 94, Arabic 111) on John 1's verses in its window, for example 2.41 to 3.08:1 on Councils. First find whether it predates b5d9edb3 (the photographs); mend it either way.
4. The arbiter's call, not his: round 1's small-line rule (sentence case, never capitals spaced out; his "yes to all", 20:47) applies to the account and order email shell (`lib/email/theme.ts`, `EMAIL_THEMES.night`): its small line and micro labels to sentence case, the wordmark in the kit's own letters. Run the kit's check, then republish the after stills on https://claude.ai/artifact/Gcumt9ReKxJ6Yhy2Drh9Um (source `docs/1.9-build/drafts/emails-round-3/shell/`; read it with the Artifact tool first).

For a rebase: Updates 33 (round 1) raises the small lines in ProfileCard, ProfileViewer and CommunityClient to /55; whoever pushes second keeps both.

## Done (one round, on the export of de5a90f6, cut 22:55 UTC)

1. **The first launch's picture cards** (`70956fb0`): an answer's name on "What are you looking for?" (`components/onboarding/LookingFor.tsx`) wears `.words-halo`, the page's own ground at its letters. Before (round 2's before export): "The Fathers' writings" 3.2:1 on Light, 4.2:1 on Candlelight; "What the Orthodox believe" 4.0:1 on Light. Test: `lib/ui/__tests__/wordsOnPictures.test.ts` (WORN). checkMock with the pixels on the dialog, 22 palettes: no card name fails at 390, 800 or 1032, English and Arabic.
2. **"Learn how to pray it"** (`5f9b95e9`): the typed arrow out of its words in all 21 catalogues ("→" even in Urdu). Its siblings (Prayers' quick ways in, the same PILL) carry no arrow, so no icon was added. Test: `lib/prayers/__tests__/learnHowToPrayIt.test.ts`. Tapped on the export in English and Arabic: 47px pill, leads to `/prayers/learning/jesus-prayer/`.
3. **A writer's current name** (`5c6641d5`, server, reaches the apps from the merge): `lib/community/authorStatus.ts` is now `authorsNow` (statuses and names, one read of profiles: `handle, display_name, status_text, profile_private`), `nameOf` in both lists (`app/api/community/posts/route.ts`, `.../[id]/replies/route.ts`). The name is `profiles.display_name` (sign-up writes the account's name or the email's first part; a change of name writes both), masked by `censorName`, cut to 80, as `identity()` gives the card. Test: `lib/profile/__tests__/profileCardGrows.test.ts`. Probe (`updates-31-walks/probe-profile.mjs`, `NAMES=1` stands in the merge's posts): ivan's card heading moves 62px with today's feed (116 to 54 at 1287ms) and not at all with the names. The walk also found "alexthomas20100714" whose card says "Alexios" (83px): the same fault, the same mend.
4. **The open card's checkMock** at 390 and 800, English and Arabic, `--limit 400`, pixels, 22 palettes: 4 of 4 pass (162 to 184s each).
5. **The shop item's zero-length transform** (`42553c00`, gate tool): EIKON's scroll-driven story (always on by design) read "transform over 0ms" on every tap in the reduced pass. `scripts/gate/inpage.mjs` now lists a scroll-driven animation only in a frame where its progress changed ("with the scroll"). Self-test in `scripts/gate/frames.mjs` (two cases; the still one fails on the old record with the shop item's own words). Reduced walk of the shop item: 6 tapped, 0 failed.
6. **The flashes on Community:** not reproduced. Three walks on this export (30 and 60 controls as the open reader, 30 as the new reader; "2 replies" tapped three times): no flash. The early "More options" jumps (125 to 167ms) are the second tap on Purify, its profile answered from cache while the card still rises near the foot: the status line again (Updates 30's server change, from the merge), a 30px row at the foot, which is the size and place of the flashes Updates 30 saw. Nothing mended; the gate's walk should watch for them.

## Open, in order

1. **Held, for his yes: the first launch's dialogs under a look** (`docs/1.9-build/drafts/onboarding-dialog-look-ground.patch`, committed `86b819a7`). `html[data-look] .lm-hero { background: transparent !important }` clears the questions' and the second chance's full-screen dialogs (OnboardingFlow, RoadCards, both `lm-hero`): on all fifteen looks Today shows through them; at 390 the heading reads 2.08 to 2.99:1 and its line 1.13 to 1.39:1. A reader meets it when the questions or the second chance open while wearing a look (looks are new in 1.9). The patch gives a dialog on lm-hero the look's own ground (`var(--color-night)`), with a test; a still on Linen with the rule injected looks right (clean neutral, no parchment). Updates 26 holds the looks: say which chat applies it.
2. **Found, not routed: typed arrows elsewhere.** Many catalogue lines still end in a typed "→" (Prayers' "Open today's prayer →" and kin), and some components draw one in JSX (`components/prayers/PrayerBookIndex.tsx` line 105, `PrayNow.tsx` 128 and 159, `PrayersDayCard.tsx` 67, `app/(app)/prayers/page.tsx` 193). In Arabic they point the wrong way. Ask the arbiter whether it is one sweep and whose.
3. **Cause 9** (updates-18 Open 5): the eight feature walks (asked-again, faith-answers, learn, legal-sheet, plus-intro, plus-order, questions-top, reminders) each call `page.emulateMedia({ reducedMotion: "reduce" })` after `openPhone`. Run each with motion on and pinned (`scripts/lib/motion.mjs`: `motionOptions`, `pinMotion` before the first page, `assertMotion` on each screen), keeping a reduced pass where the walk tests the still path. Then run all eight on an export.
4. **Cause 7** (Open 3): pages that fetch arrive with their shape. A Father's work in the apps draws a blank `min-h-[70vh]` (`components/saints/LazyWritingReader.tsx` line 56). **Arbiter 3's call (22:41, delivered late; Updates 31's report said otherwise before it saw it):** arriving with its shape is a fault fix, not a new look, when it uses the loading form the app already has (the house's own skeleton, `components/ui/Skeleton.tsx`, `SkeletonText`); use it and push it with its checks. Only a loading form that would have to be drawn new is held for his yes. The shop item arrives blank too (the reduced walk: "the switch into it: blank, moves"; `ShopDetailSkeleton` exists in `components/shop/ShopStates.tsx`).
5. **Cause 8** (Open 4): pictures carried, 19 left; the council's plate is stills for his yes first.
6. Still from the main web until the merge: "Ask a Priest" blank, Anoubius's and Yish's cards blank while the profile comes, the switch into Community (blank, misplaced).

## Gotchas

- **A fresh container has no `node_modules` and no `next-env.d.ts`.** `npm ci` (about 25s), then `npx next typegen`, or typecheck fails with 15 errors on `components/admin/drop/cards.generated.ts` (image modules).
- **The container can restart mid-measure** (it did here, exit 137, about 23:30 UTC): the scratchpad and the worktree survived; re-run only what the JSON does not hold, one heavy process at a time.
- **checkMock on the first launch measures the page under the dialog** unless the selector is the dialog: `updates-31-walks/touched-check.mjs` uses `[role=dialog]` for `first:` specs and fails a run whose first launch is not in the asked language (the Android shell's run listed English words in an Arabic run).
- **The live feed changes the walk's controls** ("2 replies" one hour, "4 replies" the next; the Supporter mark fell past 30 controls). `--max 60` reaches further.
- The export from a worktree, as Updates 30 said: `git worktree add --detach <dir> HEAD`, `cp -al node_modules`, copy `next-env.d.ts`, `node scripts/gate/export.mjs` there; the web build runs there after it (`nice -n 19 npm run build`).

## His words that still apply

- 2026-11-13 (relayed): "in-page changes that move content ... move as page switches do; a filter or a count may change at once."
- 2026-11-10: "No side stripes" (CLAUDE.md), and "Every page switch is a transition".
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## The record

Round 1, on the export of `de5a90f6` (cut 22:55 UTC): typecheck 0 (after `next typegen`); unit 14,770 pass (9 skipped); eslint clean on the changed files; the web build green (routes and catalogues). checkMock (pixels where words sit on pictures, 22 palettes): `/prayers/` at 390, 800 and 1032, English and Arabic: 6 of 6 pass; the open card 4 of 4 pass; the first launch's dialog (Arabic checked: lang ar, dir rtl) passes at 800 and 1032 in both languages, and at 390 fails only its heading and line on the 15 looks in both (open item 1); no card name fails anywhere. Taps: the pill and a picture card (picked, numbered 1, a second tap takes it out), English and Arabic. Walks: Community three times (above); the shop item's reduced walk. The frame check's self-test passes (and fails on the old record).
