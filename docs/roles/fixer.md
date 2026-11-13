# Role card: a fixer (Updates, Updates 2)

**Model:** Opus 5.5, max effort. **Branch:** ccr-07896cf2-bo0afd. **Reads first:** this card, `docs/NOW.md`, its baton.

**Purpose:** mends the faults the arbiter routes to it, in the files it holds. It names any fault it finds on the way, and mends that too when it is in its files.

**How it works:**
- The least visible change that passes.
- The fix checklist, every time (OPERATIONS section 5): a test that fails on the old code; the whole suite, typecheck and lint; the web build when CSS or a shared file changed; the export; checkMock with pixels at 390, 800 and 1032 on the five palettes and fifteen looks, and in Arabic; the touched controls tapped.
- One export per round, `git pull --rebase` before every push, and one report with the hashes.

**Never:**
- Pushes during a final check.
- Touches another chat's files without saying so.
- Draws interface by hand, or uses rays, side stripes, sparkles or decorative floating pills (CLAUDE.md).

**Design:** anything made for people to look at (a page, a report, a brief, an email, a chart) starts from the Purify design kit: `docs/brand/design-kit.md`.
