# Baton: Fable on the looks (the land looks' feet, earning a look by reading)

Written 2026-11-13 about 16:15 UTC by session_01VuYTwb6GmwtL8Qrk3qu7jP, at its last round (Arbiter 2 read it past the line). Card: `docs/roles/fable-designer.md`. Read `docs/brand/design-kit.md` and `docs/1.9-build/notes/themes-fable.md` sections 65 and 66 before touching either job.

## Role and scope

The looks (the Plus reading themes) in 1.9: build 95 note 16 (the four land looks' feet) and note 27 (the two looks earned by reading). Both are designed and wait on his yes. No code of either is on the branch.

## Done, with where it is

- **Note 16, the land looks' feet.** One answer each: Holy Mountain reworked (St Paul's under the mountain, an engraving of 1887), Forest reworked (a bough of silver fir and its cone, Köhler's plate 54), Jordan its colour alone, Desert its colour alone and recommended out. Colours unchanged on all four. His page: https://claude.ai/artifact/QqnzGPTD41qdsX9EPnFMZr (version 2). Code: `docs/1.9-build/drafts/land-looks/held.patch`, with its README. Page source and stills: `docs/1.9-build/notes/build-95/land-looks/`.
- **Note 27, earning a look.** The card (the look lit; nineteen marks that fill, three faces that light), the sheet of what is left to read (each a door), the moment at the foot of the last page read (the gift's soft light, one tick, one tap to wear it). His page, with an 8 second clip: https://claude.ai/artifact/JvH8j4Pzs5doo957UuS46j. Code: `docs/1.9-build/notes/build-95/earned-looks/prototype.patch` (text only; cut from a tree with the land patch applied, and `git apply --check` passes on `c51fe7955` without it too). Page source, stills and clip: the same folder.
- The record: `themes-fable.md` sections 65 and 66; `build-95.md` notes 16 and 27.

## Open, each with its owner and next step

1. **His yes or no on each land look** (the arbiter carries it). Desert is already answered: out, by his "all recs" (2026-11-13 about 14:29 UTC). Next step, for the chat that applies: the README beside `held.patch`, steps 1 to 4.
2. **His yes or no on note 27.** On yes: apply `prototype.patch`, write the 13 `earn.*` lines in the other 20 catalogs (English only now; a missing line falls to English), run the whole unit suite (only the reader, Settings and words tests were run on it: 452 passed), both native builds, the fix checklist, push.
3. **Updates 11's row (note 18)** takes the earned cards as they are: `GoalTile` keeps its contract (a button with `data-palette-goal`, `aria-haspopup="dialog"`, `onToggle`), holds `ModePage` lit, the name and `<EarnMarks goal progress />`; the row renders `<EarnSheet goal locked onClose />` once in place of the old `<p id="set-palette-goal">` line. `EarnMarks` takes its card's width. The two patches and Updates 11 meet in `components/settings/ReadingModePages.tsx`, `ReadingModeGallery.tsx` and `components/reader/ReadingModeChips.tsx`.
4. **The family's name** ("Land and sea") and where Jordan sits once it is a colour and no place: the arbiter's, after his answers.
5. **`/saints/`'s last words rest inside the foot** on every look with a foot (`node scripts/last-words-walk.mjs`). Not from this work. With Updates 9.
6. **A date palm and a reed**, as plates in the Garden's way, would be the rework of Desert and Jordan if he ever wants one. Not sourced.

## Gotchas

- **Never touch git state while a native build runs** (AGENTS.md). I ran `git stash` and `stash pop` once during one; the build finished clean and nothing was lost, but four unrelated tests read as failing until it ended, because the website trees were set aside.
- **`npx tsc` runs out of memory.** Use `npm run typecheck` (4 GB heap).
- **A checkMock run with `pixels` over a long sheet on seven palettes takes ten minutes** and once took the container down with a second heavy job beside it. One heavy job at a time; run it in the background and read its log.
- **Wikimedia refuses downloads from these containers** (429 on the API and on upload.wikimedia.org). archive.org answers: both plates came from its scans, found by reading a whole book's leaf thumbnails for the dark or green ones.
- **A work's end is its last chapter's foot** (`#sN` in the address): the moment and the read-to-end mark are not on chapter 1 of a work with many.
- **The moment's light must be centred by margins**, not by left or right: checkMock's `mirror` caught it in Arabic.
- **The hard-coded words scan** (`lib/i18n/__tests__/hardcodedScan.test.ts`) reads a ternary with a string method inside JSX as typed words. Compute the line above the JSX.
- **In a picker pair, make the "before" on the new export** with that one look's old rules and drawing put back (kept `athos.css`, `land.css`), so only the one card differs.
- **`scripts/room-walk.mjs` asks every look for a picture.** A look with a colour and no picture reads "no room".

## His words that still apply

- 2026-11-13 about 07:52 UTC: "remove the sea theme from the app and the mountain either needs a rework or it gets removed". He chose "Fable reworks it": one version, his yes ships it, his no removes it.
- 2026-11-13 about 07:57 UTC: "also honest in. the land and sea all the colors are nice it's just the designs at the bottom that dont look good and darker colors usually fits purify well (but the flowers fit the light themes)".
- 2026-11-13 about 08:21 UTC: "make the read to unlock themes cooler".
- 2026-11-13 about 14:29 UTC: "all recs" (Desert out).
- 2026-11-13: "you must justify your designs"; "stop using parchment for designs"; "the design must be optimized for mobile".
- 2026-11-09: "I just needed snapshots ... try not to do that next time" (one version, stills before video).

## Where things are

- `docs/1.9-build/drafts/land-looks/`: `held.patch`, `README.md`.
- `docs/1.9-build/notes/build-95/land-looks/` and `earned-looks/`: each page's `body.html`, `rows.html`, `build.mjs` (it wraps the kit's style round the body and writes `page.html` and `artifact.html`), `stills/`.
- The plates' sources: https://archive.org/details/athosormountaino00rile (leaf 243) and https://archive.org/details/mobot31753002839139 (leaf 342).
- Nothing of this chat's is in the Vault yet: the first drawings (in the patch's `kept/` folders) go there once the patch is applied.
