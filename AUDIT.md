# Purify — Audit

**Date.** 2026-05-23
**Method.** Code + content review of the working tree at `projects/orthoapp`, including the in-progress credibility sprint (Playwright + axe smoke suite, Lighthouse CI, GitHub Actions, jsx-a11y, `/privacy`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, 90-day analytics retention docs).
**Lens.** Re-application of the prior C1-C10 rubric, tightened, plus an additional V1-V5 pass simulating a clergy reviewer (Fr. Andrew Stephen Damick / Fr. Josiah Trenham / an SVS or HCHC professor).

## Headline

**71/100 (C1-C10) + 41/50 (V1-V5).**

The prior audit gave Purify 82-86/100 on a looser 0-5 rubric. The drop to 71 is the cost of a tighter bar and a doubled scoring range (0-10), not a regression in the code. The technical lens lands at 71%; the clergy lens lands higher at 82%. That asymmetry is the right shape: Purify is stronger on voice, doctrine, and liturgical accuracy than it is on test coverage, perf budgets, and scholarly apparatus.

## Scoring scale

- Part A (C1-C10): each 0-10, total /100. Prior 0-5 scores reported alongside for delta.
- Part B (V1-V5): each 0-10, total /50. Reported separately, not folded into Part A.

A score below 8 does not mean "bad." It means an exacting reviewer would notice.

## Part A — C1-C10

| ID  | Criterion                | Score | Prior (0-5) | One-line rationale                                                                                                |
| --- | ------------------------ | ----- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| C1  | Content depth            | 6/10  | 4/5         | Full canon + 36 saints / 68 works + 366 calendar days. Missing Hours, Compline, Typika, full Apostolic Fathers, Philokalia. |
| C2  | Source transparency      | 7/10  | 4/5         | Editor + series + vol cited (NPNF Schaff standard). No DOIs, no source URLs, no publication years.               |
| C3  | UX / design polish       | 7/10  | 4/5         | Cardo polytonic Greek, restrained palette, 21:1 contrast, deliberate typography. Live mobile UX not verified this pass. |
| C4  | Performance / tech       | 6/10  | n/a         | Server-first Next 16, optimal font loading. No image-pipeline policy, no route-segment error boundaries, 52 client components unaudited. |
| C5  | Privacy + compliance     | 8/10  | 4/5         | Privacy page audited line-by-line vs `app/api/track/route.ts` — accurate. Retention cron documented, not provably scheduled. |
| C6  | Tests                    | 6/10  | 4/5         | 7 smoke specs (3 meaningful, 4 shallow). Axe + Lighthouse in CI. Pascha algorithm has zero coverage. CI currently red on a known lint error. |
| C7  | Architecture doc         | 8/10  | 4/5         | Stack + routes + data layers + rendering strategy mapped. Missing links to `lib/calendar/orthodox.ts` and the calendar data JSONs. |
| C8  | Contributor posture      | 8/10  | 4/5         | Strict content rules (PD only, citations, **no LLM-generated saint bios**). Missing `MAINTAINERS.md` + private security/doctrinal contact. |
| C9  | Distinctiveness          | 8/10  | n/a         | Patristic-Bible interleave + Greek interlinear + dual calendar reckoning + no-trackers posture. No audio, no PWA install/offline. |
| C10 | Accessibility            | 7/10  | 3/5         | WCAG 2.1 AA enforced (axe + LHCI 0.95 error). No skip link, no axe-on-interaction-state, 52 client components keyboard-unverified. |
|     | **Total**                | **71** | 82-86 (loose) |                                                                                                                   |

## Part B — V1-V5 (clergy-vetter lens)

| ID  | Criterion                                   | Score | One-line rationale                                                                                                                 |
| --- | ------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Doctrinal precision                         | 9/10  | No softening, no jurisdictional caricature, no false irenicism. Implicit deference; no explicit "we defer to X" paragraph.         |
| V2  | Liturgical accuracy                         | 9/10  | 6/6 sampled feasts (Theophany synaxis, Annunciation, Dormition, Cross, Entrance, Nativity) correct. Both calendars first-class.    |
| V3  | Tone + voice                                | 9/10  | Believing-author register throughout. No startup tropes. No emoji. Liturgical cadence. The site's strongest dimension.             |
| V4  | Language register                           | 7/10  | Strong English (Hapgood/Jordanville). No Greek transliteration policy. No Slavonic glosses. Patristic excerpts unmodernized. |
| V5  | Citation density (contentious topics)       | 7/10  | Intentional silence on papacy, Filioque, jurisdictional disputes. Defensible — but unstated. A vetter wants the silence to be principled. |
|     | **Total**                                   | **41/50** |                                                                                                                                |

## Top 5 gaps, ordered by ROI on clergy endorsement

1. **Finish the pre-existing `setState-in-effect` lint debt** so CI is actually green. `components/profile/ProfileSyncStatus.tsx:43` is the last failing file; the in-progress sprint already converted its two siblings to `useSyncExternalStore`. **Without green CI, the test suite is theatrical.** Half a day.

2. **Verify the 90-day pg_cron schedule on live Supabase + publish proof.** The privacy page promises 90-day retention. The cron is documented in `docs/operations/analytics-retention.md` and the SQL exists in `supabase/migrations/20260521_analytics.sql`, but the schedule must be activated in the Supabase SQL console and is not provably running. Run it, screenshot it, link the screenshot from `/privacy`. **Trust degrades when promises are unverifiable.**

3. **Add a "doctrinal stance + what we don't do" paragraph** to `/about` or `/faq`. Names who Purify defers to on contested questions and states the silence on inter-jurisdictional polemics is principled. **Turns V1 + V5 from 9/7 to 10/9. Half a day.**

4. **Ship Hours, Compline, and Typika prayer texts** (all public-domain Jordanville / Hapgood). The single largest content gap a clergy reader will look for after the Morning + Evening Rule. **Two-week content sprint.**

5. **Cover `lib/calendar/orthodox.ts` (Pascha algorithm) with unit tests** asserting canonical Pascha dates for both calendars across 2024-2030. Today: zero coverage on the highest-stakes math in the codebase. **A reviewer who finds this loses confidence in everything else.** Half a day.

Bonus: run `npm run build && npx lhci autorun` against a deploy preview and paste the four URL scores into this file. Makes C3/C4 concrete instead of code-inferred.

## What this audit did not measure

- Live visual screenshots and mobile-device UX walkthrough.
- Production Lighthouse scores against the deployed site (configured thresholds verified; live runs not surfaced).
- Accessibility of dynamic interaction states (axe runs against rendered static pages only).
- Pascha algorithm correctness across years (no test exists yet).
- API.Bible FUMS token + copyright display in the rendered page (only code path verified).
- Cross-tradition liturgical accuracy beyond the six major feasts.
- Slavonic / Russian-tradition coverage (saint depth, hymn texts, tradition-specific fasting rules).

## Methodology

Long-form per-criterion reasoning, evidence quotes, file paths, and dissenting considerations live in the private audit workbook at `~/.claude/plans/purify-audit-v6.md`. This file is the public summary; the workbook is what a future reviewer should diff against when re-auditing.

## Reproducibility

A reviewer applying the same rubric in 3 months should land within ±5 points on Part A and ±3 on Part B, provided they:

1. Read `tests/smoke/*.spec.ts` for assertion quality (not file presence).
2. Run `npm run lint` and note the exit code.
3. Cross-check every claim in `/privacy` against `app/api/track/route.ts`.
4. Spot-check at least six liturgical feasts against the OCA + GOARCH calendars.
5. Score against the realistic Orthodox-PWA ceiling, not against the field.

If the next reviewer scores significantly differently, the disagreement is more interesting than the score.
