# Gate 6b: hand-over (stopped at the 200,000-token line, 18:00 UTC)

**Head gated:** `358974c69` (app code `d4399909`), then `256705ea` mends the light walk (a script, outside the export). Record: `docs/1.9-build/notes/gate-run-6.md`, "Gate 6b". Walk results: `docs/handoffs/gate-6-walks/` (`tap-new-1..4`, `g-*`, `l-*`, `gate-tests-6b.txt`, `plus-numbers-6b.txt`).

## Done
- Mend A `1878d8d9`: the 1.9 note's item 0 true (Scripture for everyone, the rest of the library in Plus) in the four note files; the note piece waits in the kit for his eye.
- Mend B `358974c6`: the pixel pass's misread on the Plus sheet (two causes, both the checker's); checkMock's self-test catches it (old fails, new passes).
- The export (`node scripts/gate/export.mjs`, exit 0, 207.6 MB, 75.8 MB packed, key written nowhere) and the four self-tests: pass.
- Part 1: pass (130 screens, 3,024 controls, 0 failed). Part 3: pass (956 tests).
- Part 2: guardrail six runs (one fault, one to read); motion with a track and a sound, 80 of 80 switches, and Now Playing's timings.
- The arbiter has the first batch (the fault and the finding).

## Open, exactly where
1. A fresh container: `git fetch origin ccr-07896cf2-bo0afd && git checkout -B ccr-07896cf2-bo0afd origin/ccr-07896cf2-bo0afd`, `npm ci`, `npx next typegen`, `node scripts/gate/export.mjs`.
2. **Part 2, light:** `bash docs/handoffs/gate-6-walks/walks6.sh light` (now starts; about 35 minutes a run, two runs).
3. **Part 2, motion on every screen:** `walks6.sh motion-screens` (two runs).
4. **The new screens:** `new6.sh you`, `journal`, `listen`, `player`, `lines`; then `npm run build`, `npm start` on :3000, `node scripts/gate/books-version.mjs out`.
5. **Round 3's five lines:** `node docs/handoffs/gate-6-walks/round3-probe.mjs out <dir>`, read against items 8, 10, 11, 12 and 37.
6. Each part is its own background command under two hours; a part over two hours (guard was 3 h 17 m for six runs) runs a size at a time.

## Faults for fixers
- **App, low:** `/prayers/today/`, palette on Light: the fasting rule's dot, `lib/calendar/fastDot.ts` `FAST_DOT.fish` `bg-sage` (and `fast-free`'s `bg-emerald-400`), shown by `components/prayers/PrayersDayCard.tsx` and `TodayMasthead.tsx`: a fixed colour without the allowance by name `/fasting/` carries. Seen on a fish day.
- **To read:** `/shop/category/all/` at 390 in Arabic: the category chips 2px off their mirror, all together, only where the rail scrolls (`components/shop/CategoryChips.tsx`, `components/ui/ScrollRail.tsx`). Probe the rail's `scrollLeft` both ways round before calling it app code.
