# Fable round 3: the hand-over

Session session_01VuYTwZzdQrU9XZZ1P8snyX, started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at his word of 2026-11-15 about 22:06 UTC. Stills only, for his yes.

## Done

- Seven screens drawn, one version each, from the app's own export: the journal as its own page (with the library Quote and the keyboard up), the chants door, You and Profile as one design, the Bible's opening, Plus, a plan's own page, and the Voice sheet (added by the arbiter at 22:52 UTC).
- The page: https://claude.ai/artifact/RUdzkvpzsGNLqGpEqMMr51 (private to him). Each screen has its reasons and one yes or no question.
- The whole proposal as a diff: `docs/1.9-build/redesign/round-3/held.patch`, against `ccr-07896cf2-bo0afd` at a96345f91. The held branch `held/round-3` was local to the designer's machine and was never pushed; the patch is the durable copy.
- Checked: 64 proposed stills pass checkMock with pixels on five palettes (390, Arabic, 800, 1032); the held branch's typecheck is 0; the page passes at 360, 390, 412 and 1032.
- The record: `docs/1.9-build/redesign/round-3/README.md` (the files by screen, what meets Updates 98a, 98b, 98c and 98f, what a fixer must know), `found.txt` (what he should know before he answers), `checked.txt`.

## Open

- His yes or no, a screen at a time. On a yes, that screen's part of `held.patch` is cut out as `docs/1.9-build/redesign/<screen>/change.patch` with its `spec.md`, and a fixer builds it.
- Not checked, and why: the full unit suite was not run on the combined held branch (each builder ran its own files' tests; seven of 98c's keyboard tests need `npm ci` after its patch); the web build (`npm run build`) and the iOS export were not run; no phone was walked, so the keyboard's behaviour and the page transitions are proved on dev and the export's stills only; signed-in Plus states (the price dock, the Plus mark by the name) are not in the stills, which are of a reader not signed in or a stand-in session.
- The Voice sheet stands on stand-ins for Emma, Michael and Fenrir (no audio in the app yet).
- `AccountAuthGate.tsx` is changed in the You and Profile proposal so a kept session enters with the page: a fixer reads that with care before it ships.

## Exactly where

- Round folder: `docs/1.9-build/redesign/round-3/` (plans.mjs, pics.mjs with pics.json, page.py, check.mjs, held.patch, the three builders' still lines, measured.txt).
- To stand the proposal up again: `git checkout -b held/round-3 a96345f91 && git apply docs/1.9-build/redesign/round-3/held.patch`, then the README's "Rebuilding the page".
