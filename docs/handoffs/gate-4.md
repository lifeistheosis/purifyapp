# Baton: Gate 4 (the motion half of the final check, on f0b9ff348)

Done 2026-11-15, partial. The sort: `docs/1.9-build/notes/gate-run-4.md`. Runs and stills: `docs/handoffs/gate-4-walks/` (`mw-*` motion on, `mwr-*` reduced; `*-full` the full walk, `t-*` and `tr-*` the targeted runs).

- Measured: the new reader only, both lanes, with no network. Counts there: FAULT 9 (6 motion on, 3 reduced), ALLOWED 45, OTHER 4, NOT REPEATED 4, UNSURE 2.
- Six FAULT groups; 1 and 2 can share a fixer.
- The walk mend `01dd428d`: `--controls` now marks every control, so the reduced lane reaches named controls past its six. That is why EIKON's door had 0 reduced taps before.
- **Left:** Gate 3 and 3c walked `--online`, and these runs did not. The online chain (the open reader on 54 screens and the new reader on the 33 network screens, both lanes, twice each; `eikon-landing.mjs`; /set-password/ four times) was started at 10:47 UTC in this chat's container and not read. A next gate runs it from one export, reads it with the same lists (in the sort's first paragraph), and adds the open reader's lines, EIKON (both lanes) and /set-password/'s numbers. The theology "The Symbol of the Faith" row and the journal's begin row had 0 taps; why was not read.
