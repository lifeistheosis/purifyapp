# Baton: the documentary insert (Orthodox Christians in America, by the numbers)

Left by the Fable chat that made it (session_01VuYTwcDNgtc2nD71eLvVFB), 2026-11-13. That chat passed 200,000 tokens while the film rendered and finished the job rather than hand it over in the middle of a check. Anything further goes to a fresh chat, which reads this, `docs/promo/orthodox-america/BRIEF.md` and `RECORD.md`.

## Where it stands

- **Made and delivered, waiting for his yes or no.** One film, `.promo/orthodox-america/orthodox-america.mp4` (out of git): 132 seconds, 1920 by 1080, 30 frames a second, H.264, 13.9 MB, no sound stream.
- **His page:** https://claude.ai/artifact/R2MqhHYnXc7uiM8vzGCN4W (private to him). The film and its poster are in the page's own asset store (`/_blob/0b5620c3b0158e6e9b9c486d83998b5c`, `/_blob/74f5022b33a5bb0c77f6df29c78832ce`).
- **The arbiter has the report** (Arbiter 2, session_01VuYTwbacb8geNS4VjyJwQh).

## One question is open with him

Pew's page prints the third age band as "50 to 65" beside "65 and older". The film keeps Pew's words and says they are Pew's. If he would sooner it read "50 to 64", that is one word in `film.html` and one in `facts.mjs`, and it needs a second render, which is his to ask for.

## To change anything

- A word or a figure: `film.html` and `facts.mjs` together (`render.mjs --check` refuses one without the other), then `render.mjs --sheet` for stills. A new film is a new render: ask him first through the arbiter.
- The page: `page.mjs --video=<address> --poster=<address> --check`, then publish `.promo/orthodox-america/orthodox-america-film.html` to the same address with the Artifact tool (pass the `url`; read it first).
- A fresh container has neither the film nor the tools: `npm install @fontsource/dm-serif-display @fontsource/dm-sans us-atlas topojson-client` in `.promo/orthodox-america/tools`. The film itself can be fetched back from the page's asset store.
- `docs/brand/kit/check.mjs` imports Playwright by name; with no `node_modules` in the repo, link the session's own into `node_modules/playwright` to run it.

## Not done, by the brief

No vertical cut, no variants, no sound. Nothing went to the Vault because one version was made.

---

# Baton: round 2, the 3D sample (left 2026-11-13 by session_01VuYTwaoqos7WUgE7DdvK12)

That chat passed 200,000 tokens while the sample rendered (the page skills and the stills it looked at are heavy) and finished the job rather than hand it over in the middle of a check. The full film goes to a fresh chat, which reads this, `docs/promo/orthodox-america/BRIEF.md` ("Round 2") and `docs/promo/orthodox-america/3d/RECORD.md`.

## Where it stands

- **The sample is made and on its page, waiting for his yes or no.** `.promo/orthodox-america-3d/orthodox-america-3d-sample.mp4` (out of git): 10 seconds, 1080 by 1080, 30 frames a second, H.264, 12.19 MB, no sound.
- **His page:** https://claude.ai/artifact/5Z5B2zW1vopmX1e2WiiwNt (private to him). The sample and its poster are in the page's own asset store (`/_blob/85d8b03a8a4af2426ecbc659999b90ce`, `/_blob/1449e5e42b7cfbf13ccf06821b3bd41c`), so a fresh container can fetch the file back from there.
- **The arbiter has the report** (Arbiter 2, session_01VuYTwbacb8geNS4VjyJwQh).
- **The full film waits for his yes.** Nothing of it is made.

## What the sample taught, for the full film

- **Time.** 2.54 seconds a frame on average at 1080 (300 frames in 761 seconds, each drawn 32 times over on average): about 0.08 seconds for one drawing of the scene. A still frame (20 drawings) takes about 1.6 seconds, the push (72) about 6. A 75 to 90 second film is 1.6 to 1.9 hours, in runs of `render.mjs --film --resume --minutes=26` (a background job stops at 30 minutes). Do not run another Chromium beside the render: it halves the speed.
- **The shape to keep.** `shot.js` is one shot. The film needs a list of shots, each with its own pose function and words, and `drawFrame` choosing by time; the loop that draws a frame many times (blur, focus, smoothing), the glow and the last pass stay as they are. `words.mjs` grows a list for each shot, and `render.mjs --check` holds each figure to `facts.mjs` by scene.
- **Only six states have a checked figure** (and seven for parishes). A shot that raises states uses those; the other figures need forms of their own (the 1% over the globe, the gap as three forms of different height, the decade as a slope). Nothing rises without a figure in `facts.mjs`.
- **Words.** Drawn white on black on a canvas and used as the opacity of a white plane in the scene, so they take the camera's blur. Only what is brighter than white glows, so no word blooms. Each plane names the box its words fill (`ink`), and the measure reads the frame behind that box with the words taken out. Three states side by side (New York, New Jersey, Pennsylvania) need a hairline from label to form; no camera angle parts them.
- **The cut.** It hides only if both sides match: the same country at the same size (an Earth radius is 13 map units), the same points of light, at the push's fastest moment, mixed drawing by drawing over three frames.
- **Encoding.** Grain makes a quality setting balloon (59 MB for ten seconds at crf 15). Set the size instead: two passes, as `render.mjs` now does. The page's store takes 20 MB a file, so a long film needs a lower rate or the first film's 14 MB budget.
- **Tools.** `three`'s package has no `package.json` export and d3's packages ship only `dist/`: the import map in `shot.html` names the real files. Playwright comes from `NODE_PATH=$(npm root -g)`.

## To change the sample

A word or a figure: `words.mjs` (and `facts.mjs` must already hold it), then `render.mjs --check` and `--stills`. A new sample is a new render (13 minutes): ask him first through the arbiter. The page: `page.mjs --video=<address> --poster=<address> --check`, then publish `.promo/orthodox-america-3d/orthodox-america-3d-sample.html` to the same address (pass the `url`; read it first).

## Not done, by the brief

No full film, no variants, no sound, no vertical cut. The first film stays on its own page; putting it in the Vault as an explainer is the arbiter's to place.
