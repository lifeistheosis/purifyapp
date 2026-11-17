# Updates 98v: hand-over

**Job:** Gate 6c's two fails on You with days kept, /account/ (app b40e4192; `docs/handoffs/gate-6-walks/tap-you-kept.json.gz`). Started 08:47 by Arbiter 14, stopped at the token line (263,941 by get_session at 09:20, past 160,000).

## The two faults, at their cause

1. **Back to Where you left off** (the brief said the kept shelf; the tapped row, "Homilies on the Gospel of Matthew", is in Where you left off, `components/you/PickUpCard.tsx`). Opening a place makes it the newest, so the tab drawn again by Back put the Homilies on the large card on top and the row came back at 542 px where it stood at 458. `lib/ui/returnPlace.ts` looks for the tapped link between its two old neighbours, which the new order had changed, and gave up. **Mend:** on a Back arrival (`cameBack()`, asked in the layout effect that reads the device), the same places keep the order last drawn (`lib/you/you.ts`, `inOrderShown`); any other visit draws the newest first.
2. **Share moved 12 px.** KeptVerse's status line ("Picture saved"), hidden with `sr-only`, kept its `pb-3` and stood 12 px out of the foot of the card, which clips (`overflow-hidden`), so the card could be scrolled inside. The walk's `scrollIntoView` (as any focus scroll would) scrolled it 12 px; when the line appeared the overflow went and Share fell 12 px under the finger. **Mend:** its padding stands only while it says something (`components/you/KeptVerse.tsx`). Nothing visible changes.

Both reproduced on a dev server with the walk's own seeds, first touch, reach and tap (`scripts/lib/tap.mjs`): Back 542 before, 467 after (the row's own title grows after the visit, from the stand-in seed's label to the reading page's; its top is unmoved); Share 433 to 445 before, holds at 433 after.

## Commits (local; pushed only at the arbiter's word)
- `35e1e4ea` the two mends and `lib/you/__tests__/youBack.test.ts` (fails on the old code, 6 of 7; it also holds the You tab's files to no `sr-only` line with room of its own).
- `b919b4ba` `scripts/guardrail-walk.mjs` takes `--store` (as the tap walk does), so checkMock with pixels can hold You with days kept, which a new reader never draws; `docs/handoffs/updates-98v-walks/chain98v.sh`, the checks on one export, restartable.
- `31317ac6` the chain reads the export's page as `out/account/index.txt` (the export writes one shell `index.html`).

## Checks
- typecheck exit 0; unit suite 1,258 files, 15,510 passed, 9 skipped, exit 0; eslint 0 on the changed files; `npm run build` exit 0; one export by `node scripts/gate/export.mjs` exit 0 (the key printed, saved and committed nowhere).
- Tap walk, kept, English: 2 screens, 35 tapped, **0 failed** (Gate 6c's two pass).
- Tap walk, kept, Arabic: 35 tapped, **1 failed**, not mine and older than my diff: Learn by heart's sheet "احفظ الآية", its Change (غيّر) 41.9 by 46.8 px, needs 44 by 44: `components/you/PractiseSheet.tsx:128` (`h-11 px-3`, no minimum width; the PILL button at :89 has the same risk). Likely mend `min-w-11 justify-center`. Not mended: past the line.
- The new reader's tap walks, checkMock with pixels on all 21 at 390, 800 and 1032 (en, ar, new and kept) and the motion walk on /account/ in both lanes were still running at 09:56; the chain copies their JSON (gzipped) and logs to `docs/handoffs/updates-98v-walks/` when it ends, and `$W/chain.txt` says which landed. Raw: `/tmp/claude-0/-home-user-purifyapp/39d6e2e6-f006-5892-94a2-7612feaf9d8c/scratchpad/98v/`.

## Open
1. PractiseSheet's Change at 41.9 px in Arabic (above): a fresh fixer, with its own test, export and the kept walk in Arabic.
2. `components/learn/ChooseSheet.tsx:514` toggles `sr-only` on a note that keeps `mt-2`, the same shape as fault 2, inside a sheet that already scrolls. Named, not touched.
3. The arbiter's row of 09:21 (on /bible/john/1/ with motion on, a Community post link to /community/ blank 211 ms) was declined at the line, not looked at.
4. To run the chain again on a fresh container: the branch, `npm ci`, `npx next typegen`, then `W=<scratch>/98v setsid nohup bash docs/handoffs/updates-98v-walks/chain98v.sh > <scratch>/98v/chain.log 2>&1 &` (it waits for `<scratch>/unit.log` to end in `unit exit`; write that line by hand if the suite is not run again).
