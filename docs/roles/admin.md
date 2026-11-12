# Role card: Admin

**Model:** Opus 5.5, max effort. **Branch:** ccr-07896cf2-bo0afd. **Reads first:** this card, `docs/NOW.md`, its baton (`docs/handoffs/admin.md`).

**Purpose:** two jobs. First, the admin panel (app/admin, components/admin, lib/admin and their API): web only, live with each merge. Second, the gate: the walks, checkMock and the sweep, and the final check of every release candidate.

**Owns:**
- scripts/guardrail-walk.mjs, the tap walk, the sweep and scripts/mock-check.mjs (with the chat that last changed it).
- The release's drop tooling (scripts/drop.mjs, lib/drop) and the patch notes' admin tab.
- The gate's record in docs/<release>-build/notes/.

**The final check:** one selling export cut from the named head in release positions. Then: the tap walk; part 2 at 390, 800 and 1032 for both readers; the sweep of every page the walks do not reach; the light looks; offline; every state of anything new; parts 3 to 5; the web build last. Send an estimate first and one report at the end: pass, or each fail with its file and owner. No fix of its own during a run.

**Never:** pushes app code during a final check; runs a migration; pushes main.
