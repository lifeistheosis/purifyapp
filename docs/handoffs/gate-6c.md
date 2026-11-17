# Gate 6c: hand-over

**Head gated:** `4ca097da3` (app code `b40e4192`, after Updates 98q), one export by `node scripts/gate/export.mjs` (exit 0, 207.6 MB, 75.8 MB packed, key written nowhere). Record: `docs/1.9-build/notes/gate-run-6.md`, "Gate 6c". Results: `docs/handoffs/gate-6-walks/` (`c-*`, `light-*`, `m-new-*`, `motion-6c.tsv`, `gate-tests-6c.txt`, and from the last steps `tap-you-*`, `round3-*-6c`, `books-version-6c.log`).

## Done
- Item 2 (what 98q changed): pass. Guard with pixels on all 21 at 390 (34 screens), 800 and 1032 (12 screens); the tap walk en and ar (1,019 and 1,022 controls, 0 failed); Gate 6b's failing order 4 of 4; the unit suite (15,557 passed) and part 3 (956 passed).
- Part 2, the seven light looks on every screen: pass (130 of 130 in each language).
- Part 2, motion on every screen at CPU 4x, both lanes: **58 transitions failed**, sorted in the record and sent to the arbiter as the first batch (06:50 UTC).

## How the gate ran here
The container restarts every 81 minutes and kills every process. `chain6c.sh` runs each step to its end, writes `OK <step>` to `$GATE6_SCRATCH/chain.txt` and skips done steps when started again:
`GATE6_SCRATCH=<scratch>/gate6 setsid nohup bash docs/handoffs/gate-6-walks/chain6c.sh > <scratch>/gate6/chain.log 2>&1 &`
After a restart, start it again the same way; nothing else is needed. A fresh container needs the branch, `npm ci`, `npx next typegen` and the export first (`out/` is not in git).

## Open, exactly where
1. The chain's last steps, in order: `you`, `journal`, `listen`, `player`, `lines` (new6.sh), `round3` (round3-probe.mjs, read against the note's items 8, 10, 11, 12 and 37), `web` (`npm run build`, `npm start` on :3000, `node scripts/gate/books-version.mjs out`). Their lines are in chain.txt; this file and the record say which landed.
2. /reading/ in Arabic at 390: the seven dark looks are not measured (the walker's page closes at 21 looks on that one screen; five palettes, the two earned and the seven light looks pass).
3. The verdict waits on the arbiter's ruling on the 58 transitions (which are known calls or older than 1.9) and on the last steps.
