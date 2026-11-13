# Orthodox Christians in America, by the numbers: a documentary insert

His word, 2026-11-13 about 16:14 UTC, with the text in `SOURCE.md` (word for word there): "can you make a mp4 interactive black and white visual of [the text] as if it was going into a high quality documentary with animations and effects (send fable 5.2 to do this and you can refine the prompt)".

This is the arbiter's refined brief. The film is his ask, so its one render is already his word; nothing else here needs it.

## What to make

One film, one version: an MP4 that could cut into a high-quality documentary, made of animated type, numbers and data graphics in black and white.

- **Format.** 16:9, 1920 by 1080, 30 fps, H.264 (yuv420p, faststart). Silent: no music and no voice. A documentary lays its own score and narration over an insert, and silence carries no licence. Its length is what the numbers need, likely 75 to 120 seconds; every figure stays on screen long enough to be read twice.
- **Black and white only.** A black ground, white, and the greys between. No colour, and no sepia, cream or aged paper (CLAUDE.md: never parchment). Every word at least 4.5:1 on what stands behind it.
- **Made in code from the data**, frame by frame: HTML, SVG or canvas scenes stepped by Playwright (Chromium is installed) and encoded with ffmpeg (`/usr/bin/ffmpeg`). Start from the 1.9 film's way of working (`docs/plans/v1.9/video/README.md`; `scripts/promo/frames.mjs`, `motion.mjs`), not from its content.
- **No paid generation and no borrowed pictures:** no Higgs credits, no stock footage, no generated people or churches. Type, lines, dots and a map carry it. A picture appears only if it is on the heritage list (`lib/marketing/heritagePictures.ts`).
- **The map:** state outlines from the US Census Bureau's cartographic boundaries (public domain) or a package built from them (`us-atlas`); say which in the record.

## The look of a documentary

- **Type** that reads as a serious film: the house's own faces out of the export, as the 1.9 film used them; big numerals, quiet labels, generous space.
- **Motion with weight.** Slow push-ins, numbers that count up and settle, lines that draw themselves, and one field of dots in which a dot stands for a fixed number of people. The gap is the story: those who call themselves Orthodox, those on parish rolls, those in church regularly. Let the field thin from one to the next so the eye feels the difference before the numbers name it.
- **Effects a documentary would use:** fine film grain, a soft vignette, shallow focus on what is not the subject, match cuts and transitions led by a line or a number. The house rules hold on every frame: light is a soft pool or nothing (no rays, sunburst or god rays), no sparkle, no stripe down the side of a quote or note, no floating pills, no em dashes. `lib/marketing/__tests__/promoLooks.test.ts` is how the house reads a promo script for rays: hold this folder's scenes to the same measure and say how.
- **Phone check.** Most people will see it on a phone. Look at every scene at 844 by 390 (a phone held sideways): every number and label must still read.

## The facts: true before beautiful

`SOURCE.md` is an AI search engine's answer. Purify's name rides on whatever it says, so:

1. **Check every figure against the written source it cites** (WebFetch): Pew's Religious Landscape Study page for Orthodox Christians; the US Religion Census 2020, Appendix F; Alexei Krindatch's reports on orthodoxreality.org; the Orthodox Studies Institute's *American Orthodoxy Today* (2025); orthodoxhistory.org on the six million claim. Use the source's own figure, year and definition, and its own age bands. The Google links in the text name states, not sources.
2. **Name what is compared.** The 2.6 million are Eastern and Oriental Orthodox who call themselves Orthodox (a survey, Pew, 2023 to 2024); 675,765 and 183,020 are Eastern Orthodox on parish rolls (a count, 2020). Say so on screen where they meet, so the gap is not overstated.
3. **A claim whose only source is a video** (the Sun Belt surge, the newcomers' backgrounds) stays out unless a written source carries it; if one does, cite that.
4. **Every scene carries its source** in a small line, and the film ends on the full list.
5. **Leave out the engine's own words:** its closing question, and anything that is not a fact with a source.

Write every figure, its source, its check and any change from `SOURCE.md` into this folder's `RECORD.md`.

## The scenes (a starting order, yours to shape)

1. **One in a hundred.** About 1% of American adults call themselves Orthodox: some 2.6 million.
2. **The gap.** Who call themselves Orthodox, who are on the rolls, who come regularly; and the number of parishes.
3. **The six million claim.** Six million across the parishes would mean about 3,000 a parish, which is why historians doubt it.
4. **Who they are.** The age bands; how many raised Orthodox stay; how many are adult converts; more men and immigrants; among the most educated.
5. **Where they are.** The four regions; six states hold nearly half the faithful; where the parishes stand.
6. **What is changing.** Fewer on the rolls from 2010 to 2020; the converts since, as far as written sources carry it.
7. **Sources.**

## Delivered

- **The MP4**, rendered once and kept out of git at `.promo/orthodox-america/` (`.gitignore` keeps `.promo/`).
- **One page for his yes** (the Artifact tool; private to him), built from the design kit (`docs/brand/design-kit.md`; its `check.mjs` passes): the film playing, a poster frame, and a short reason for each choice (what it is, why, what it does for the viewer, the look and the goal: his rule, "you must justify your designs"), with each scene's figures and their sources. The page is the interactive part: he can step through scene by scene and open each source. An MP4 cannot itself be interactive, so there is no second build.
- **This folder**, pushed as docs on `ccr-07896cf2-bo0afd`: the scene code, the render script, `RECORD.md` (the file's length and size, each scene, each figure's check). Nothing outside this folder; no app code.
- **One report to the arbiter** (Arbiter 2, `session_01VuYTwbacb8geNS4VjyJwQh`, by send_message): the page link, the file's length and size, any figure left out and why, and its own token count.

## Spend

One version. No variants and no extra cuts (no vertical cut unless he asks). A draft render at low resolution for its own eye is fine; the full render once. Rotate at 200,000 tokens with a baton at `docs/handoffs/fable-film.md`.
