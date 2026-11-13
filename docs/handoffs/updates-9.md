# Baton: Updates 9 (looks out, the shop follows the look, contrast and the foot), 2026-11-13

Rotated after one auto-compaction (OPERATIONS 2.2), at the arbiter's word: "Write your baton and stop". Read this, `docs/NOW.md` and `docs/roles/fixer.md`.

## Done

- **Note 16**, Galilee and Patmos out: `701ed3dc`. Kept looks for a stored choice (Forest, Linen), kept folders, every count in the 21 catalogs. Held by `lib/reader/__tests__/retiredThemes.test.ts`.
- **Note 20**, the shop follows the look: `f35ed66f`. Every fixed ground named with its reason in `lib/ui/__tests__/lookSurfaces.test.ts`.
- **The round after note 20**: `9b826f8c` (the last-words walk measures only words a reader sees; the Plus sheet's small print at 65 and its Arabic hero line at 80 on paper; the picture sheet's tabs at 80 on paper; the chants door's two lines at 70; the front page's verse band on each look's own ground), `c87493ff` (the verse's citation 44 tall), `6b9d2a71` (the record). Proved on a fresh export and the built website; the record is in `docs/1.9-build/notes/build-95.md`, "Routed to Updates 9 after note 20".

## Open

1. **Desert comes out** (his "all recs", 2026-11-13 about 14:29 UTC). Owner: the chat that applies his yeses, with the Fable chat's land-looks patch, which touches the same files. What I would do, the way `701ed3dc` took the sea's two out:
   - **Its kept look: Roses** (`rose`). By ground and ink in OKLab, the measure `retiredThemes.test.ts` uses: Roses 0.0484, Stone 0.0530, Olive 0.0569, Blush 0.0592, Lavender 0.0898, Linen 0.1006, Jordan 0.1124. Desert is #efe2d9 ground, #361f17 ink, #6f2c16 rust; Roses #eceae4, #392327, #91213e: a warm page, a warm brown ink and a red rubric. Blush is fourth by this measure. Light stays light, and the Holy Mountain stands in for nothing while it is reworked.
   - **Code:** `RETIRED_THEMES` with its reason (`lib/reader/readingModes.ts`); `PREPAINT_RETIRED` and `PREPAINT_LOOKS_LIGHT` (`lib/reader/prepaint.ts`); its rules out of `app/globals.css` (`--scene-desert` at about line 12606, its token block, its foot); `scripts/theme-pictures.mjs` (`desert()`, `"desert.svg"` into `KEPT` and `KEPT_DRAWINGS`); `public/themes/desert.svg`.
   - **Kept folder:** `docs/1.9-build/kept/desert-look/`, as `galilee-look/`: `desert.svg` by `git mv`, `desert.css` (its rules as they stood; a bare `--scene-x` line goes inside `:root {}` or it breaks the next rule when a still injects it), `words.json` (`settings.paletteDesert`, `settings.paletteDesertHint` in the 21 languages), `README.md` with his words on one line (a test reads it), a still.
   - **Counts:** sixteen reading modes, fourteen looks. `plus.palettes.title`, `plus.palettes.body`, `premium.plus.readingModes.sub` and `plus.active.modes` in all 21 catalogs; `lib/premium/plans.ts` (its comment at line 39 too); `lib/premium/__tests__/plans.test.ts` (WORDS `{4, 15, 17}` and the 21-catalog count test); `components/settings/ReadingModePages.tsx`, `SettingsClient.tsx`, `lib/premium/plusTry.ts`; "fifteen looks" in comments and docs (`components/shop/StoreDoor.tsx`, the faint text and other tests, `scripts/mock-check.mjs`, `docs/OPERATIONS.md` section 5, `docs/roles/fixer.md`, `docs/1.9-build/free-and-plus.md`, `docs/licensing/THEME_PICTURES.md`). `grep -rniE "fifteen|seventeen|\b15 looks|\b17 reading"` finds them. The Land family's list in `retiredThemes.test.ts` loses `desert`. Whether "four families" still holds depends on the land-looks patch.
2. **checkMock leaves out Councils and Cappadocian**, the palettes earned by reading: to Updates 18 (the arbiter's routing).
3. **Still waiting in `lookSurfaces.test.ts`:** the Plus page's graphite cards (`PremiumUI.tsx`, to the fifteen screens' round 3) and the Coming soon plate (`ComingSoonLink.tsx`).

## Gotchas

- checkMock reads a word's ground from colours where it can, so a glow or shadow cast on a plain ground is invisible to it: the picture sheet's tabs passed checkMock and read 4.11 by the pixels. Near a shadow or a glow, read the words with `wordsOnPicture(page, sel, { palettes, every: true })` from `scripts/words-on-pictures.mjs`.
- The faint text rules draw a band of shares alike (Dark draws 42 and 45 at 50; Candlelight 42 to 55 at 60; Monastery, Councils and Cappadocian 42 to 52 at 55). A nudge inside the band changes nothing there.
- checkMock measures one root (`querySelector`): measure each touched part by its own selector. A whole sheet's pixel pass runs for many minutes.
- To try a share before writing it, swap the class on the export's page (`classList.replace`) and run checkMock: only classes already in the export's CSS work.
- A page made with `setContent` needs `<meta name="viewport">`, or a phone lays it out 980px wide.
- A website built in a container has no public key in its client bundle: hydration throws and the error page shows. For a stylesheet check, block `/_next/static/chunks/*.js` and measure the page as the server draws it; `next start` needs the key at runtime, read as the export reads it. Marking the reader onboarded sends the front page on to Today.
- After a website build and a rebase, `.next/types` goes stale and the push guard refuses at typecheck: `rm -rf .next && npx next typegen`.
- A container installed before note 14 lacks its patch: `npx patch-package`, the project's own postinstall.
- The branch moves every few minutes, and `build-95.md` is everyone's: every rebase met it at its end, both sides kept.

## His words that still apply

- 2026-11-13, note 16: "remove the sea theme from the app and the mountain either needs a rework or it gets removed", and "Both".
- 2026-11-13 about 08:00 UTC, note 20: "this doesn't match the them the users uses".
- 2026-11-13 about 14:29 UTC: "all recs", which took the arbiter's recommendation that Desert comes out.

## Where things are

- Records: `docs/1.9-build/notes/build-95.md` (notes 16 and 20, and "Routed to Updates 9 after note 20").
- Kept looks: `docs/1.9-build/kept/fire-look/`, `galilee-look/`, `patmos-look/`.
- Tests: `lib/reader/__tests__/retiredThemes.test.ts`, `lib/ui/__tests__/lookSurfaces.test.ts`, `lib/ui/__tests__/wordsOnPicturesMends.test.ts`, `lib/ui/__tests__/lookFootRoom.test.ts`.
- Scripts: `scripts/last-words-walk.mjs` (`--self-test`), `scripts/theme-pictures.mjs` (`--kept`), `scripts/gate/export.mjs`, `scripts/mock-check.mjs`, `scripts/words-on-pictures.mjs`.
