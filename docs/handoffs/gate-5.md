# Baton: Gate 5 (the check of what changed since Gate 4's export)

Done 2026-11-15, wrapped up at the arbiter's word (18:32 UTC). The record: `docs/1.9-build/notes/gate-run-5.md`. Runners and records: `docs/handoffs/gate-5-walks/`.

- The export: `1276bf701` (app code `78c5297e1`), exit 0, the key written nowhere.
- No fault found. Motion walk: 8 walks, 0 errors, every named control reached and passing, every arrival passing; the replies' Try again 8 of 8 still; Updates 97's probe on the build reads as its patch did. Tap walk: 256 of 256 per reader. checkMock: the two offline screens 12 of 12 clean.
- **Left:** See all's checkMock at 800 and 1032 in English and all three widths in Arabic. At 800 the browser closed under the pixel pass twice, with the list opened intact before it; the cause is not read. `guard5.sh seeall` now runs each spec in its own process with a 20-minute cap. A next try could measure the list's first screen rather than the whole body, which is a change to what is measured and needs the arbiter's word.
- **Not run:** step 5 (`npm run test:unit`, `npm run build`).
