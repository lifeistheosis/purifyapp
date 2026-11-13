# Baton: Updates 2 (a fixer)

Written 2026-11-13, about 02:20 UTC, by session_01VuYTwdk3C8grkpfDPo8LHF. That chat stopped near 700,000 tokens, on the arbiter's word (`docs/OPERATIONS.md` section 2), so fails 4 and 5 go to a fresh fixer.

## Role and scope

A fixer: card `docs/roles/fixer.md`, branch `ccr-07896cf2-bo0afd`. This chat held the Search sheet (`components/search/`), the saints' webs (`components/saints/web/`), the councils' Fathers (`components/councils/CouncilFathers.tsx`), the gate's tap walk (`scripts/tap-walk.mjs`) and checkMock's pixel measure (`scripts/words-on-pictures.mjs`, `scripts/mock-check.mjs`).

## Done and pushed

The last round, pushed 2026-11-13 02:17 UTC (`4c5f5c4f3..e88068504`, the push guard passed):

- `e0319e71c`: a council's Father tapped in the row stays under the finger (`useHeldPlace` on the tapped face, `useNoShrink` on the card under it). 186 taps on the seven councils at 390, 800 and 1032: a face moves at most 0.4px (before, up to 103.7). Test: `lib/ui/__tests__/underTheFinger.test.ts`.
- `d70a01deb`: the walk judges what a tap opened once it has arrived and the page is at rest (the community sighting was the measure, the arbiter's ruling).
- `cb114387b`: the Search sheet's esc key is drawn only for a fine pointer (`hidden ... pointer-fine:block`, `components/search/CommandPalette.tsx`). Touch at 800 and 1032: not drawn; a mouse: drawn. Test: `lib/ui/__tests__/keyHints.test.ts`.
- `e88068504`: the walk waits for a part still filling (aria-busy) as long as `lib/ui/showOpened.ts` follows one (12s), then up to 4s for rest. A walk on a loaded machine had read Community's "4 replies" half way through its glide (1377px, bar at 761). The self-test's slow reply fails on the old wait and passes on the new; `lib/ui/__tests__/showOpened.test.ts` holds the two times equal.

Held for all four on one export (from `cb114387b`'s code): checkMock with pixels, 22 palettes and looks, on the seven councils and the open Search sheet, at 390, 800 and 1032, in English and Arabic: 0 fails. Tap walk on the seven councils at the three widths: 0 fails. Unit suite 14092 passed, typecheck 0, lint clean, web build exit 0.

Earlier on 2026-11-12, all pushed: the inert web behind a tall card (`05aee81e1`); the webs' names, key and contrast (`01448b5bc`, `7000d0133`, `aab44ae11`, `db52182e2`, `52cf1fe18`, `9c6da11f4`); the tablet fails 10 to 12 (`63187783f`); two checker mends (`31f7d07f4`, `70021052f`).

## Open (owner: the fresh fixer, unless named)

1. **Fail 4: John 1 with the interlinear on, the "Word details" sheet.** Admin's measure: every Greek word's sheet fails the mirror rule, its Close 8.6px off its mirrored place in Arabic. `components/bible/WordPopover.tsx:407` has `-mr-2` where `-me-2` mirrors. Next: that change; a test that fails on the old code; the export; checkMock with pixels on the open sheet in Arabic and English at 390, 800 and 1032 on the 22; tap its Close. The interlinear is the stored key `purify:interlinear` = `1` (`lib/bible/interlinear.ts`): `node scripts/tap-walk.mjs out --only /bible/john/1/ --store purify:interlinear=1 --lang ar --online`.
2. **Fail 5: the saints' webs cut a node's place and date with an ellipsis.** Admin's measure: at 390 on 17 webs ("Constantinople, 381" loses its year), at 320 on 44 ("Great Persecution", "Chalcedon, 451"). `components/saints/web/WebConstellation.tsx:116`, `TAG_CLASS`, holds the tag to one line with `truncate`. Next: let the tag show whole (the least change: its own lines, as the names already break at 320), then probe all 118 webs at 390, 360 and 320 that no name, tag or card name is cut or touches another saint's circle, and checkMock with pixels on the webs at 390 and 320 on the 22.
3. **The re-check** (owner: a fresh Admin): fails 2 and 3 on the head that carries them, with the walk at `e88068504` or later.

## Gotchas

- The arbiter's 07:17 rule (2026-11-12) let the Search sheet's line under a name keep its ellipsis, as a preview. It does not cover the webs' place and date: the arbiter routes those as fail 5.
- Walk on a quiet machine, one heavy job at a time. A web build plus six browsers on four cores starved the frames, and the walks misread what they saw. Slowing the CPU in the browser (6x, 30x) did not reproduce it.
- If checkMock fails a faint glyph on a picture, suspect the measure first: endless motion between its two shots (`31f7d07f4`), a hyphen's own box (`70021052f`).
- A native build wipes `out/` and sets the website-only trees aside: never commit or walk while it runs.
- `git commit --amend` is refused here: make a new commit. The guard needs `git config core.hooksPath .githooks`; give `git push` ten minutes.
- This chat's exports came from a scratch wrapper that is gone with its container: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk` (the selling export), placeholder Supabase keys, and the shop set aside during the build. Walks then read the main web with `--online`.

## His words that still apply

- 2026-11-11, the pre-build gate: "ensure our next build doesn't have any similar issues or any other issues of this nature."
- 2026-11-11: "on drop day, that's going to be the finalized build with no bugs."
- 2026-11-09: "You used a lot of credits on that. So like try not to do that next time."

## Where things are

- Fails and owners: `docs/NOW.md`; the final check's record: `docs/1.9-build/notes/gate-run-1.md`.
- Tools: `scripts/tap-walk.mjs` (`--only`, `--size 800x1280`, `--lang ar`, `--store key=value`, `--online`, `--self-test`), `scripts/mock-check.mjs` (checkMock, `--self-test`), `scripts/guardrail-walk.mjs` (every screen through checkMock), `scripts/rtl-walk.mjs` (English left to right in Arabic and Urdu).
