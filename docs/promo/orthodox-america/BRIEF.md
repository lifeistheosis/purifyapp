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

## Round 2: real 3D, edit style, square (his word, 2026-11-13 about 16:49 and 16:50 UTC)

Shown the first film (https://claude.ai/artifact/R2MqhHYnXc7uiM8vzGCN4W): "this is good for like a slideshow explanation but I'm referring to high quality animated visuals (I.e a globe that spins with edit style animations) 3d visuals etc)", then "and do 1:1 ratio".

So the first film stays on its page and goes into the Vault as an explainer (nothing made is deleted), and round 2 is made as follows. Where it differs from the brief above, round 2 wins.

- **What it is now:** high-end animated 3D motion graphics in an edit style, not a sequence of slides. A globe that turns in space; the camera pushing down through it onto North America and the United States; the states rising as 3D forms whose height is the figure; numbers and words that move with the camera and land on the beat of the cut; quick cuts, zoom and whip transitions, parallax, depth of field and motion blur. Each figure still stays readable long enough to be read.
- **Format:** 1:1, 1080 by 1080, 30 fps, H.264 (yuv420p, faststart), silent, black and white only.
- **The facts stand as checked.** Use the figures in `facts.mjs` and `RECORD.md` as the first film settled them, each with its source on screen and the sources at the end. No new figure without a written source.
- **Made in code, free:** three.js (or plain WebGL) in headless Chromium, stepped frame by frame and encoded with ffmpeg. WebGL2 works in this container through SwiftShader, in software on 4 cores (tested 16:49 UTC: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))"), so plan for slow frames and a render that resumes (the background job stops at 30 minutes; the first film's render.mjs shows how). The world from Natural Earth through `world-atlas` (public domain), the states from `us-atlas` (already in `map.json`). No paid generation, no GPU rental and no stock footage without his word.
- **Light:** a soft glow at the globe's rim or under a rising form is a soft pool of light and allowed; no rays, no lens-flare streaks, no sparkle (CLAUDE.md).
- **Sample first.** Before the film, one 10 second sample of the signature shot: the globe turning, the camera pushing down onto the United States, the states rising in 3D as the first figure lands. It goes on one page for his yes with a reason for each choice. The full film follows his yes, rendered once.

## Round 2, the sample's second pass (his word, 2026-11-13 about 18:26 UTC)

Shown the 3D sample (https://claude.ai/artifact/5Z5B2zW1vopmX1e2WiiwNt): "this is good, id change the # font. but other than that the transition is nice. and add a new scene with a new design and transition and animation (ensure the scene at 10 seconds transitions into the next scene seemlessly also) and as always you can refine and revamp this prompt to fable 5.2".

The arbiter's reading, for one version:

- **Keep the first scene as it is** (his "the transition is nice"), with one change: the numerals. The sample sets its figures in DM Serif Display. Choose one face for every number in the film: an open-licence face (an `@fontsource` package or the like, named in the record) whose figures are lining and tabular, so a count-up does not shiver, and that reads as a film's numbers in an edit, not a book's. Only the numbers change face; the words keep the house's faces.
- **No cut at 10 seconds.** Scene one's hold flows into scene two on one continuous move: what is on screen at 9.9 seconds becomes the first thing of scene two (the camera keeps travelling, the points of light keep their places until they become something else). No fade to black, no hard cut.
- **Scene two, a new design, transition and animation.** Recommended: the gap, the story's own heart. The points of light that drew the states lift off the map and gather into a field of people in 3D space, one point for a fixed number of people (say so on screen): 675,765 Eastern Orthodox on parish rolls; then most of the points fall away and 183,020 stay, those who attend regularly; land the share (27%, or the figure the checked list gives). Both are Eastern Orthodox and both from the U.S. Religion Census 2020, so the comparison is like for like. If a figure is not in `facts.mjs` as checked, check it against the source first or leave it out.
- **The sample becomes two scenes**, about 20 seconds: 1:1, 1080 by 1080, 30 fps, silent, black and white. The same rules as the first sample: real 3D in code, free, soft glow only, no rays, flare or sparkle, every figure checked and sourced on screen.
- **Delivered** on the same kind of page for his yes, with a reason for each choice (the face first, since he asked for it), and the frame time, so the full film's time can be told to him. Shot code grows from `shot.js` into a list of shots, as `docs/handoffs/fable-film.md` describes.

## Round 3: the Church, in monochrome (his word, 2026-11-13 about 19:20 UTC)

Shown the second pass (https://claude.ai/artifact/4ZBf45qLCDQGojHHG57i9a): "the design also of the edit is looking really nice. now I want like a monochrome design of the Orthodox church with some more unique stuff (fable 5.2 and you can ravmp the prompt also)".

The arbiter's reading, for one version:

- **What it is:** scene three of the sample, about 12 seconds, and its heart: an Orthodox church in black and white, built in real 3D in code like scenes one and two. Scenes one and two stay exactly as they are.
- **No cut.** Scene two ends on the 1,830 points that stay inside the ring of the rolls; scene three begins from them, on the same camera, the way the second pass joined its scenes (new terms that are nothing until their start; `docs/handoffs/fable-film.md`).
- **Recommended design, "the people are the Church":** the points of those who come lift from the ring and draw a church in fine lines of light. First its plan on the ground, the cross-in-square of the Byzantine churches; then walls, arches, drums and domes rise from the plan like an architect's drawing coming to life; then the lines fill and the church stands solid, matte stone in soft light, as the camera makes one slow turn around it and settles. Ekklesia means an assembly: the scene shows the Church as her people gathered, which is the documentary's own story, told without a word.
- **More unique, his word:** yours to invent within the rules. Ideas, not orders: the church seen in section, a slow cut through it that opens the dome over the nave and the apse; its crosses drawn last, like a signature; one church becoming many as the camera rises, 2,014 small churches for the Eastern Orthodox parishes of 2020, or the median parish's 60 at Sunday Liturgy (both in `facts.mjs`). A figure on screen comes from `facts.mjs` as checked, with its source line; nothing new without a written source.
- **True to the Church's forms.** One tradition, drawn true and named on the page. Onion domes (the Russian tradition, as in Alaska) carry the three-bar Orthodox cross with its slanted foot; Byzantine domes (the Greek tradition) carry the plain cross. No mixing. No icon, face or saint is drawn: no invented sacred art. If the inside is shown, the icon screen is architecture only.
- **Light:** soft pools only. Light from the dome's windows lands as a soft pool on the floor, never as shafts or beams (his rule of 2026-11-08, "No light rays"); no lens flare, no sparkle, no glow that spikes.
- **Format and spend:** as round 2: 1:1, 1080 by 1080, 30 fps, H.264, silent, black and white. One version and one render: render only the new scene where the code allows, joined to the second pass with no seam; a draft at low resolution for your own eye is fine. Before the render, tell the arbiter its frame count and expected time. The full film still waits on his yes.
- **Delivered:** the three scenes on one new page for his yes (the second pass's page stays as it is), with a reason for each choice, the church's tradition named, the frame time, and the record in `3d/RECORD.md`. One report to the arbiter, Arbiter 3 (`session_01VuYTwajSPo1Rq2R34jWrk6`), with your token count. Rotate at 200,000 tokens with a baton at `docs/handoffs/fable-film.md`.

## Round 4: the full film, with an outro (his word, 2026-11-13 about 20:25 and 20:30 UTC)

His words: "So in the video, add an outro, but the outro is going to be like a bunch of logos. Usually how editors have like little clips for their logo, like animated logo. And I want you to include the logos of all the sources we used. And add like, you can look at Harvard, add Harvard's logo. And animate it." Then, to the arbiter's recommendation (names, not logos; Purify's logo last; after the reset): "yea add Purify's logo in the end".

The arbiter's reading, for one version:

- **When:** after the weekly limit resets (2026-11-20 08:00 UTC), in one fresh Fable 5.2 chat at High, unless he says now. One render, about 1.2 to 1.5 hours of machine time, no money.
- **The film:** the three scenes as made (one in a hundred; the gap; the Church, `3d/RECORD.md`), then the rest of this brief's scenes in the same 3D edit style, one camera, no cut that is not a match cut: the six million claim, who they are, where they are, what is changing. 75 to 90 seconds before the outro. Every figure from `facts.mjs` as checked, with its source line; nothing new without a written source.
- **The outro, the sources:** no third-party logo, mark or shield, ever. Pew's terms of use say "User use of the Center trademarks is not permitted", Harvard's Trademark Program requires written permission for its name and shield, and a reel of logos reads as their endorsement, which none of them has given. Instead each source is named on its own title card in the film's type, animated the way an editor's cards land (a line that draws, a name that settles on the beat), in the order the film used them, from `facts.mjs` SOURCES: names as words only. The Cooperative Election Study is named, with Harvard University in its line, only as the survey the Orthodox Studies Institute read for the 1.8 to 2.1 million: read that report's own words for the survey first, and if it does not tie the survey to Harvard, the card does not either. The map's credit (us-atlas, from the U.S. Census Bureau's files) goes in the small line.
- **The end, Purify's own animated logo:** the mark is the three-bar cross of `components/ui/PurifyMark.tsx` (four bars measured from `public/purify-cross.png`; white on black as `public/purify-logo.jpg`). Animate those exact shapes, never a cross drawn again: for example the post, then the top bar, the crossbar, and the slanted foot last. The name "Purify" in the house's title face. Soft light only; no rays, flare or sparkle. The logo stands on its own: the church's plain cross in scene three is never turned into it, so no object mixes two traditions.
- **Delivered:** one page for his yes, with the film, a poster, a reason for each choice and each card's source; `3d/RECORD.md`; one report to the arbiter on duty with the page, the commit, the length and size and the token count. The store's 20 MB limit per file: a longer film may need its own way to reach him (say so before the render, not after).
