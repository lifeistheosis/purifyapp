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

---

# Baton: round 2, the sample's second pass (left 2026-11-13 by session_01VuYTwbX9EgiUvadznNeBP1)

His word on the first 3D sample (about 18:26 UTC): a new face for the numbers, and a second scene the first flows into with no seam. Both are made, on one page for his yes. A fresh chat reads this, `docs/promo/orthodox-america/BRIEF.md` ("Round 2, the sample's second pass") and `docs/promo/orthodox-america/3d/RECORD.md`.

## Where it stands

- **The second pass is made and on its page, waiting for his yes or no.** `.promo/orthodox-america-3d/orthodox-america-3d-sample-2.mp4` (out of git): 20 seconds, two scenes, 600 frames, 1080 by 1080, 30 frames a second, H.264, 17.5 MB (18,353,541 bytes), no sound. It rendered in one run of 1,141 seconds: 1.9 seconds a frame on average.
- **His page:** https://claude.ai/artifact/4ZBf45qLCDQGojHHG57i9a (private to him). The film and its poster are in the page's own asset store (`/_blob/16d9d37380252b04620cb65e14756965`, `/_blob/e13776939ae95e84daff24e53cc1570e`), so a fresh container can fetch the file back from there. The first sample's page (https://claude.ai/artifact/5Z5B2zW1vopmX1e2WiiwNt) is as it was.
- **The full film waits for his yes.** Nothing of it is made.

## What this pass taught, for the full film

- **The face.** Archivo Narrow 600 for every figure. A canvas cannot switch on a font's tabular feature, so the face must be tabular as drawn: measure the ten digits before trusting a face's name (Barlow Condensed, Big Shoulders, Saira Condensed, Sofia Sans Extra Condensed and Oswald all failed). `render.mjs --check` measures it every time.
- **How a scene joins the last with no cut.** One three.js scene and one camera. A new scene adds terms to the camera's own functions (`turn`, `tilt`, `lift`, `openB`, `shutter`, `samples`, `cameraB`) that are nothing, and at rest, until its start (`GO`, `move(t)`), so no earlier frame changes and the move begins at the drift's own speed. What leaves (forms, labels, the figure) is multiplied down after `GO`; what the map no longer needs is made invisible once dark, which is why scene two's frames are quick.
- **Words for a later scene** face their own `facing` camera, taken at the moment that scene holds (`FACE2_AT`).
- **Arithmetic of ours** goes in `facts.mjs` as `DERIVED`, never in `FACTS`: the first film's check holds every figure in `FACTS` to its own page.
- **Time.** 1.9 seconds a frame over both scenes (scene one alone about 2.5, scene two about 1.3): a 75 to 90 second film is about 1.2 to 1.4 hours if its scenes are like these. A background job can be given a longer `timeout` than 30 minutes (this pass ran in one go); `--resume` still keeps what a stopped run left.
- **Looking at a move cheaply.** `render.mjs --stills <times> --q=0.5 --strip` writes one small picture of the stills side by side (`stills/strip.png`): a dozen moments for the cost of one picture.
- **Layout in a square.** A round field seen at 36 degrees is not centred on its own middle: the near half is larger. Its foot is the count to keep clear of the key and source lines at the bottom (964 px down), and the camera's slow push grows it by about 5% over ten seconds.

## To change the sample

A word or a figure: `words.mjs` (and `facts.mjs` must hold it), then `render.mjs --check` and `--stills`. A new sample is a new render: ask him first through the arbiter. The page: `page.mjs --video=<address> --poster=<address> --check`, then publish `.promo/orthodox-america-3d/orthodox-america-3d-sample-2.html` to the same address (pass the `url`; read it first).

## Not done, by the brief

No full film, no variants, no sound, no vertical cut. Nothing went to the Vault because one version was made.

---

# Baton: round 3, the Church (left 2026-11-13 by session_01VuYTwcx6hrpUx2AxR4Xqx6)

His word on the second pass (about 19:20 UTC): a monochrome design of the Orthodox church with some more unique things. Scene three is made and on its own page for his yes. A fresh chat reads this, `docs/promo/orthodox-america/BRIEF.md` ("Round 3") and `docs/promo/orthodox-america/3d/RECORD.md`.

## Where it stands

- **The three scenes are made and on a new page, waiting for his yes or no.** `.promo/orthodox-america-3d/orthodox-america-3d-sample-3.mp4` (out of git): 32 seconds, three scenes, 960 frames, 1080 by 1080, 30 frames a second, H.264, 18.48 MB (19,374,284 bytes), no sound. One run of 1,889 seconds: 1.97 seconds a frame on average.
- **His page:** https://claude.ai/artifact/V3kVt1uw9D5dhZ3ciuzSnB (private to him). The film and its poster are in the page's own asset store (`/_blob/2967e1bce97794bc191d767abef123bc`, `/_blob/f9addddcad81f8cf0f5f55af29c3a998`). The second pass's page and the first sample's are as they were.
- **The full film waits for his yes.** Nothing of it is made.

## What scene three is

Those who stay (the same 1,830 points) stand along the lines of a plan, the drawing rises from it, they go in and stand in the nave, and the stone rises after the drawing and closes over them while the camera looks down into it. The windows then carry their light, the cross is drawn last, and 2,014 (Eastern Orthodox parishes, 2020; `facts.mjs`, scene "six") lands over the dome. The church is a Byzantine cross-in-square, the Greek tradition, with a plain one-bar cross; its form is `3d/church.js`, plain numbers with no drawing in it.

## What this round taught, for the full film

- **A third scene joins the same way.** Its terms on `turn`, `tilt`, `lift`, `samples` and `cameraB` are nothing until `GO3`. Points that pass from a shader to the hand (`church.pose`) must be in the same places, the same size and light, at that moment; `render.mjs --check` holds their number to those who stay.
- **Soft light with no rays, for nothing.** The loop that already draws a frame many times lights each drawing from one direction with a shadow from a depth map (`church.light`): a third of the drawings about the key, the rest over the sky. The average is soft shadows and darkened corners. A depth texture on a render target works in SwiftShader.
- **Thin walls, seen from both sides.** The stone has no thickness: the shader turns each normal to the eye, so the inside reads as the inside while the church is open. A rising level (`discard` above it) is the section; the same level cuts the shadow map.
- **Lines on stone.** The stone is pushed back a hair (`polygonOffset`) so the drawing's lines win where both stand, and a line gives way where the stone has come.
- **Points close along a line burn.** 1,830 points on 20 units of line overlap four deep: each dims as it lands (2.1 to 0.7) and comes back up in the nave.
- **Time.** 1.97 seconds a frame over the three scenes; scene three is about 2.2 (36 drawings and 36 shadow maps a frame). A 75 to 90 second film is about 1.2 to 1.5 hours.
- **The store's 20 MB.** 32 seconds were encoded to 19 MB asked, 18.48 MB made (4,864 kbit/s, against 7,372 for the second pass). A longer sample needs less grain or a second file; the full film is not held to the page's limit.
- **A fresh container holds no frames.** Scenes one and two were drawn again from unchanged code (19 of the 31 minutes). To add a scene without that, keep `.promo/orthodox-america-3d/frames/` and run `--film --resume`.
- **A strip for the arbiter.** A still strip committed as a small JPEG (`3d/strip-scene-3.jpg`) is how another chat sees a design before a render.

## To change it

A word or a figure: `words.mjs` (and `facts.mjs` must hold it), then `render.mjs --check` and `--stills`. The church's form: `church.js`. A new sample is a new render: ask him first through the arbiter. The page: `page.mjs --video=<address> --poster=<address> --check`, then publish `.promo/orthodox-america-3d/orthodox-america-3d-sample-3.html` to the same address (pass the `url`; read it first).

## Not done, by the brief

No full film, no variants, no sound, no vertical cut. Nothing went to the Vault because one version was made.

---

# Baton: round 4, the full film (left 2026-11-13 by session_01VuYTwaxbA7b5yzKRKC1Jce)

His words: the outro of sources and Purify's logo (about 20:25 and 20:30 UTC), "now" (20:33), and in that chat, about 21:02, "the point of the video is to show that america in orthodoxy is growing", then "not even the new sources? (2021-2026)". The film is made and on its page for his yes. A fresh chat reads this, `docs/promo/orthodox-america/BRIEF.md` ("Round 4") and `docs/promo/orthodox-america/3d/RECORD.md`.

## Where it stands

- **Made and on its page, waiting for his yes or no.** `.promo/orthodox-america-3d/orthodox-america-3d.mp4` (out of git): 107 seconds, 3,210 frames, 1080 by 1080, H.264, 18.48 MB (19,374,636 bytes), no sound. Seven scenes, six source cards, Purify's mark.
- **His page:** https://claude.ai/artifact/WG2cBhCekzLx5RLrme7SLk (private to him). The film and its poster are in the page's own asset store (`/_blob/4d9ba71536ed682b67ab7415ff26489e`, `/_blob/516363a9dedec5e6929ba7873890c271`), so a fresh container can fetch the file back from there. The samples' pages are as they were.
- **The frames are in the container that made them** and go when it is reclaimed. A larger copy for an editor is a new render (about 1.7 hours) once they are gone.

## What this round taught

- **Growth.** The one written source that measures it is Krindatch's report of September 2026 (a survey of 270 parishes: attendance in the median parish up 36% from 2019 to 2025). The national surveys of people show the Orthodox share level (Pew, PRRI). The film says the first and claims nothing about the second; `facts.mjs` LATER and the record say why. A figure found only in a news summary stays off the screen.
- **The camera after scene three** is a list of moves (`MOVES` in `shot.js`), each eased from rest to rest; a whip is a move fast enough that the shutter smears it. Every place stands along one line, close enough that the place left and the place arriving are both in frame mid-move: a longer hop gives black frames, which read as a cut.
- **The old camera never rests.** Scene one's slow turn and slow push go on for ever; the track brings both to rest after scene three (`DRIFT`, `softLine`). Without that every later place is seen askew.
- **Words px-true in the scene** (`stand`): a label's width is in px whatever the camera's distance, so forms under wide names are spaced by the names, not evenly. Look at a full-size still before a render; a 360 px strip hides two names that touch.
- **A change after a render** costs only its own frames: delete them from `frames/` and run `--film --resume`. `timing.json` is written only by a run that draws every frame.
- **Tools.** `npm install` in `.promo/orthodox-america-3d/tools` needs a `package.json` there first, or it installs into the repository's root and a `node_modules/playwright` there shadows the session's own. The repository's root must hold no `node_modules` for `render.mjs` and `film-page.mjs --check`.
- **Size.** 107 seconds at 19 MB is 1.45 Mbit a second; with the grain at 3 the picture holds (looked at on frames cut from the file).
- **Time.** 1.86 seconds a frame over the whole film (3,116 frames in 5,789 seconds).

## To change it

A word or a figure: `words.mjs` (and `facts.mjs` must hold it), then `render.mjs --check` and `--stills`. The page: `film-page.mjs --video=<address> --poster=<address> --check`, then publish `.promo/orthodox-america-3d/orthodox-america-film.html` to the same address (pass the `url`; read it first). A new render is his to ask for.

## Not done, by the brief

No variants, no sound, no vertical cut, nothing paid for. Nothing went to the Vault because one version was made.
