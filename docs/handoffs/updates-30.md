# Baton: Updates 30 (a fixer: the running line, the profile card's jumps, 1.9)

Written 2026-11-13 about 22:20 UTC by Updates 30 (session_01VuYTwaU4gCScoEEbAtVbNz), reporting to Arbiter 3 (session_01VuYTwajSPo1Rq2R34jWrk6), rotated at its context budget (200,000 tokens). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton; `docs/handoffs/updates-25.md` and `docs/handoffs/updates-18.md` (Open 3 to 6) hold the lists item 3 below works from.

## Role and scope

Mend what the arbiter routes, each fault with a test that fails on the old code, proved on an export cut by `scripts/gate/export.mjs`. Nothing changes how a screen looks at rest without his yes: such a mend is held as a patch and named to the arbiter. One export per round.

## The arbiter's calls (2026-11-13, carried)

- Community's thread rail (`community-rail`) is a thread's connector, not a side stripe; it stays. Its removal stays held as `docs/1.9-build/drafts/community-thread-rail.patch`, applied only on his word relayed by the arbiter.
- checkMock with pixels on every word (`--pixels always`) belongs to the pre-build gate on the final export. Each round measures by colour everywhere, with pixels where words sit on pictures.

## Done (three rounds; the pushed hashes are in the last lines of this file)

1. **The running line keeps its words while it folds** (`components/saints/MobileWorkPill.tsx`, `RunningLine`): Updates 25's held patch, applied (round 1), then mended (round 2): in the render that turns to a new chapter, its open state and minutes are still the last chapter's, and the patch took the new chapter's words there ("Homily 2 of 11 · 6 min left" as it folded, seen frame by frame). `foldingWords` (pure, exported) takes nothing in that render. Test: the running line's case in `lib/bible/__tests__/runningLineGround.test.ts` (behaviour, fails on both older versions). Walk: Next from the top and from 70% down (with a short pull up, which brings the pill back) on `/councils/ancyra-314/the-twenty-five-canons/` and `/saints/john-chrysostom/homilies-on-1-thessalonians/`: all pass, two runs each; the line shows one set of words and one place through the fold.
2. **The profile card grows on a transform** (`components/community/profile/ProfileViewer.tsx`): placed by its top (`top-full`) and lifted by its own height (`-translate-y-full`; centred on a wide screen by `md:top-1/2 md:-translate-y-1/2`), the dialog `items-start`. Its top never moves in layout, so a height change is never a layout shift; it rests where it did. The hook (`lib/ui/useDraggableSheet.ts`) is untouched. Probe at 390 and 1032: the card itself reports no shift (it reported 240px, then 46, 40, 34 and 28px a frame).
3. **The status line comes with the feed** (server, reaches the apps from the merge): `lib/community/authorStatus.ts` reads `profiles.status_text` for the writers in a list, one read per list, none for a private profile (buildProfile's rule), none before the columns exist; `app/api/community/posts/route.ts` and `app/api/community/posts/[id]/replies/route.ts` add `author_status`; `ProfileSeed.status`; the seeds in `CommunityClient.tsx`; `seedProfile` and the hover card draw it from the first frame. No migration. Test: `lib/profile/__tests__/profileCardGrows.test.ts`.
4. **A profile effect's specks are placed by a transform** (`components/community/profile/ProfileEffect.tsx`, `app/globals.css` `.pfx`): each speck stands at the layer's top and is placed by `translate` from `1cqh` (the layer is a size container) and `100%` (its own height); the same place. Where container units are unknown, `top` and `bottom` as before. The specks had moved in layout with the card's height: 44, 60 and 63px "jumps" on the tap that opens Purify's card. Test: `lib/profile/__tests__/specksPlaced.test.ts`.

Proof, on the export of `55edbf29f` (round 3): the gate's Community walk (`scripts/motion-walk.mjs --only /community/ --max 30 --online`), both readers: no speck and no card jump left. The profile probe with the posts answered as the merge will answer them (`STATUS=1`, the main web's statuses stood in): opening Purify's and Anoubius's cards reports no layout shift at all, and each rests at 68 to 844 with its status line.

## Open, in order

1. **Item 3, not started:** causes 7, 8 and 9 and the shop item's zero-length transform (`docs/handoffs/updates-18.md` Open 3 to 6). Cause 7 starts at `components/saints/LazyWritingReader.tsx` (a blank `min-h-[70vh]` while a Father's work comes; a skeleton is a new loading look: ask the arbiter whether it needs his yes). Cause 8's council plate is stills for his yes first.
2. **Community, after round 3, both readers (8 fails each):**
   - "More options" jumps 30px when a profile with a status comes (Purify, Anoubius): the status line, mended on the server; it passes from the merge. Before it the walk keeps failing it. Named in the record.
   - **Found, not mended: a writer's changed name.** A post carries the name its writer had when posting (`author_name`); the card shows the profile's name now. ivan.rizevski's card: the name `h2` "IvanTheHumbleSinner" moves 62px sideways when the profile comes. The same read as the status could give the profile's own name for the seed (buildProfile's `who.name`, `lib/profile/server.ts`), the feed keeping the snapshot. A server change: ask the arbiter.
   - **One- and two-frame flashes near the screen's foot**, 200 to 330ms after a tap (90 or 150 by 30px at y 690 to 840): on "Purify", "2 replies", "Supporter", varying run to run. "2 replies" and "Supporter" do not open the card, so likely older than this chat; not looked at.
   - Older, not routed: "Ask a Priest" and "Anoubius" blank while the main web answers; the switch into Community (misplaced, a jump or a blank by run).
3. **checkMock of round 3** (the card open on `/community/`, and `/community/`, 390, 800, 1032, English and Arabic, 22 palettes): see the last lines.

## Gotchas

- **Chrome runs ResizeObserver after a full lifecycle.** A sheet that grows lays out at its new height first, and the browser's layout-shift entries see that frame even though it is never drawn (the "phantom"), before a ResizeObserver hold puts the old height back. So a growing sheet must be pinned by its top (its start never moves), and anything inside placed by a share of its height or by its bottom must be placed by a transform.
- **The pill's Next is `visibility: hidden` when scrolled down**; a short pull up brings it back. `updates-30-walks/probe-next.mjs <out> <page> [still] [fraction]` scrolls to the fraction, pulls up 160px and taps the Next a finger can reach (the thing at its centre); `LINE=1` prints the running line's words and place frame by frame, `LINE=2` every frame, `RUNS=n`.
- `updates-30-walks/probe-profile.mjs <out> [name]`: every layout shift (the card, inside it, the page), `W=1032 H=800` for the centred card, `STATUS=1` for the posts as the merge serves them (statuses from the main web's profile API).
- `updates-30-walks/touched-check.mjs`: Updates 21's checkMock runner with `--out` and a `profile:<page>:<name>` spec (opens the card from a writer's name and measures `[data-profile-card]`).
- The export from a worktree (`git worktree add --detach <dir> HEAD`, `cp -al node_modules`, `node scripts/gate/export.mjs` there) keeps the main checkout free; move it with `git -C <dir> checkout --detach <hash>` for the next round. About 3 minutes.
- The web build runs TypeScript: do not add files to the checkout while it runs.

## His words that still apply

- 2026-11-13 (relayed): "in-page changes that move content ... move as page switches do; a filter or a count may change at once."
- 2026-11-10: "No side stripes" (CLAUDE.md), and "Every page switch is a transition".
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## The record

Round 1, on the export of `6577ae3d2` (cut 21:47 UTC): typecheck 0; unit 14,735 pass (9 skipped); eslint clean on the changed files; checkMock by colour, pixels where words sit on a picture, 22 palettes, new reader: the council and Chrysostom pages at 390, 800 and 1032, English and Arabic, 12 of 12 pass (5 minutes). Probes as above. Pushed as `babef7ff` (21:58 UTC).

Rounds 2 and 3, on the exports of `dd46e39da` and `55edbf29f` (cut 22:09 and 22:13 UTC): typecheck 0 (both); eslint clean on the changed files; unit 14,743 pass (9 skipped) on `55edbf29`; the web build green on both (server routes in round 2, the stylesheet in round 3); the gate's Community walk, both readers, 30 controls, on both exports (above); the running line and card probes (above). checkMock (same terms) on round 3: `/community/` at 390, 800 and 1032, English and Arabic, 6 of 6 pass; the card open (`profile:/community/:Purify`) passes at 1032 in English and Arabic; at 390 and 800 it was not measured: the runner's 150s limit closed the page under the pixels pass (the banner's words), in both languages. Next round: rerun those four with `--limit 400`. Not run: `--pixels always` (the gate's).

Pushed: `babef7ff` (round 1), `65cb6047` (round 2, rebased from `dd46e39d`), `55994265` (round 3, rebased from `55edbf29`) and `8d2302e7` (this baton), 22:40 UTC. Updates 30 rotates here at its budget.
