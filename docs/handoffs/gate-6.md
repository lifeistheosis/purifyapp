# Gate 6: hand-over (stopped at the 200,000-token line)

**Head gated:** `3ab13437` (app code `d4399909`). Record: `docs/1.9-build/notes/gate-run-6.md`. Runners: `docs/handoffs/gate-6-walks/`.

## Done
- The export (`node scripts/gate/export.mjs`, exit 0, 207.6 MB, 75.8 MB packed, key written nowhere).
- The four tools' self-tests: pass.
- Part 3: pass (gate-tests.txt, 63 files, 956 tests).
- Part 5: pass (`notes-old.txt`; notes 1 and 10 need none; note 12's test is note 4's keyboardSlide).
- Part 4: one FAIL (the 1.9 note's item 0, "quote anything in Purify ... Free for everyone", while library quotes are Plus); the voices and the bundled note pass.
- Part 1's one logged fail, the Plus sheet's quote at 1.00:1, measured by its pixels at 5.93 to 11.26:1: the checker's own.

## Open, exactly where
1. **Part 1, the new reader's tap walk, every control:** walk the four chunks, one background command each (each under two hours; the whole list passed two hours at 100 of 130): `bash docs/handoffs/gate-6-walks/walks6.sh tap-new 1` to `4`. Chunk 1 was running in this chat's container at the stop and its log is not pushed; start from chunk 1.
2. **Part 2:** `walks6.sh guard` (390, 800, 1032, en and ar, five palettes), `walks6.sh light` (the seven light looks at 390, en and ar), `walks6.sh motion-loaded` (track and sound, both lanes, CPU 4x, then Now Playing), `walks6.sh motion-screens` (the new reader, both lanes, CPU 4x, 2 workers). Sort by gate-run-3c's and 4's rules and the brief's known calls.
3. **The new screens:** `new6.sh you`, `journal`, `listen`, `player`, `lines`; then the web build (`npm run build`, `npm start` on :3000) and `node scripts/gate/books-version.mjs out`.
4. **Round 3's five lines:** read `round3-probe.log` and `round3-words.json` (stills in the scratch dir, so run `round3-probe.mjs` again in a fresh container) against items 8, 10, 11, 12 and 37 of the note.
5. A fresh container must cut the export again from the head (`node scripts/gate/export.mjs`), then `npm ci` and `npx next typegen` first, and deepen the clone to reach `78c5297e1` if part 5 is run again (`git fetch --shallow-since=2026-11-15T00:00:00Z origin ccr-07896cf2-bo0afd`). The probes launch `/opt/pw-browsers/chromium` (the repo's Playwright has no browser of its own here) and seed `purify:onboarded` and `purify:whatsNewSeen` as the walks do.

## Faults for fixers
- **Part 4:** `data/changelog/entries.json`, `patches.json`, `docs/plans/v1.9/patch-note-1.9.json`, `patch-long-1.9.json`, and the letter in `drop.json` line 602: item 0's "quote anything in Purify into it with Quote in journal. Free for everyone." Owner: the patch notes and drop kit (Admin), the wording to his queue. Not app code.
- **The checker:** checkMock's pixel pass reads the Plus sheet's first quote at 1.00:1 where its pixels read 5.93:1 or more (`plus-sheet-probe.mjs` reproduces it). Owner: Admin (scripts/words-on-pictures.mjs). It will fail chunk 1 again until mended or allowed by name.
