// The page he sees the 3D sample on, and the record of what was made.
//
//   node docs/promo/orthodox-america/3d/page.mjs [--video=<the sample's address on the page>] [--poster=<a still's address>]
//   node docs/promo/orthodox-america/3d/page.mjs --check     checkMock on the page, five palettes, 360 390 412 1032
//
// It writes the page to .promo/orthodox-america-3d/orthodox-america-3d-sample.html
// (out of git; published from there with the Artifact tool, the sample and its
// poster in the page's own asset store) and RECORD.md beside this file.
// Built from the design kit (docs/brand/design-kit.md), as the first film's
// page was: the kit's own style block and pieces. Dark first, phone first,
// never parchment, and a reason beside every choice.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FACTS, SOURCES } from "../facts.mjs";
import { SIX, FIGURE, CAPTION, SOURCE_LINE, TITLE, SECONDS } from "./words.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.join(ROOT, ".promo/orthodox-america-3d");
const FILM = path.join(OUT, "orthodox-america-3d-sample.mp4");
const PAGE = path.join(OUT, "orthodox-america-3d-sample.html");
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- What was made and measured ---------------------------------------------
let film = null;
if (fs.existsSync(FILM)) {
  const p = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", FILM], { encoding: "utf8" }));
  const v = p.streams.find((s) => s.codec_type === "video");
  film = { bytes: +p.format.size, seconds: +p.format.duration, size: [v.width, v.height], codec: `${v.codec_name} (${v.profile})`, pixels: v.pix_fmt, fps: v.r_frame_rate, frames: +v.nb_frames, sound: p.streams.some((s) => s.codec_type === "audio") ? "a sound stream" : "none" };
}
const timing = fs.existsSync(path.join(OUT, "timing.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "timing.json"), "utf8")) : null;
const measured = fs.existsSync(path.join(OUT, "check.txt")) ? fs.readFileSync(path.join(OUT, "check.txt"), "utf8") : "";
const least = /least contrast ([\d.]+):1/.exec(measured)?.[1] ?? "4.5", smallest = /smallest letters ([\d.]+)px/.exec(measured)?.[1] ?? "30";
const mb = film ? (film.bytes / 1048576).toFixed(1) : "0";
const perFrame = timing ? timing.secondsAFrame : 0;
const hours = (seconds) => ((seconds * 30 * perFrame) / 3600).toFixed(1);
const fact = FACTS.find((f) => f.scene === "where" && f.show.includes(FIGURE));

// ---- The shot, beat by beat --------------------------------------------------
const BEATS = [
  [0, "The globe turns", "The Earth in space, its land drawn as points of light, turning from the eastern Mediterranean west to North America. The title stands in front of it.", "A turning globe is what you asked for by name. It turns from where the Church began to where this film is about, so the turn says something. The United States brightens as it arrives, so the eye is already there when the camera moves."],
  [2.5, "The push", "The camera gathers, then rushes down at the United States. The title flies past the lens. The picture streaks with the speed.", "This is the edit-style move: slow, then sudden. The blur is real motion blur, taken from the camera's own speed, so it reads as a filmed move and not a filter."],
  [3.74, "The landing", "At the push's fastest moment the globe becomes the map: the same country, the same size, the same points of light, now flat and seen from straight above.", "A cut on the beat, hidden inside the blur. Because the points of light match on both sides, the eye reads one unbroken move from space to the ground."],
  [4.0, "The six rise", "The camera tilts to a low angle. Six states rise as solid forms, one after another. The country's light cools and the six keep it.", "This is the 3D you asked for doing a job: a form's height is its figure, so the eye compares the six before reading a number. Near and far go soft while the camera tilts, as a real lens would."],
  [5.6, "The figure lands", `${FIGURE}% counts up as the states rise and lands when the last one does. Each state's own share stands over it. The camera keeps drifting.`, "The big number is the sum of the six, and it counts as they rise, so the viewer sees where it comes from. It holds for over four seconds, long enough to read twice. The words stand in the scene, so they shift against the map as the camera drifts."],
];

// ---- Each choice, and the reason for it ---------------------------------------
const LOOK = [
  ["Real 3D, drawn in code", "You said the first film was a slideshow and asked for high quality animated 3D. Every frame here is a true 3D scene with a camera, a lens and solid forms.", "It reads as a title sequence, not a presentation. And because it is code, a figure can be corrected and the shot made again exactly."],
  ["Land as points of light", "A globe of fine points is the look of a serious data film, and it needs no photograph of the Earth.", "The same points cover the flat map, so the globe and the map feel like one world. Nothing is borrowed, so nothing needs a licence."],
  ["One move, with a cut on the beat", "Edit style means the cut lands on a beat and motion carries across it.", "Ten seconds feel like one breath: turn, rush, land, rise, read."],
  ["Motion blur and depth of field from one true method", "Each frame is drawn dozens of times within its own shutter, through different points of the lens, and averaged. That is how a camera makes both.", "Fast moves streak and slow ones stay sharp, the way film behaves. No effect is laid on top."],
  ["Height is the figure", "A state's form rises the same distance for each percentage point of its share, measured from the level every other state stands at.", "The picture cannot exaggerate. California at 10.9% rises exactly 1.79 times as far as Pennsylvania at 6.1%."],
  ["Only six states rise", "The source gives a figure for six states and no other. A state without a checked figure gets no height.", "Nothing on screen is guessed."],
  ["Words that live in the scene", "The title, the figure and the labels stand in 3D space. A fine line ties each label to its form.", "They move with the camera, as you asked, and no label can be mistaken for its neighbour's."],
  ["DM Serif Display and DM Sans", "They are the app's own faces, in the jobs the app gives them: the serif for numbers and titles, the sans for labels.", "The film reads as Purify's without a logo on it."],
  ["Light is a soft glow, nothing else", "A soft glow at the globe's rim, on the top of each form and in a pool at its foot. No rays, no flare streaks, no sparkle.", "The light shows where to look and stays out of the way."],
  ["Black and white, fine grain, a soft vignette", "You asked for black and white. Grain and a darker edge are what a film camera adds.", "It sits beside archive footage in a documentary without looking pasted in."],
  ["Square, silent, no logo", "You asked for 1:1. A documentary lays its own score and voice over an insert, and silence carries no licence.", "It fills a phone feed and can be cut into a film as it is."],
];

const kit = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(kit)[0];
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(kit)?.[0] ?? "";
const at = (s) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

function page(videoSrc, poster) {
  return `<title>Orthodox America 3D Sample</title>
<meta name="claude:viewport-fit-sides" content="cover">
${kitFonts}
${kitStyle}
<style>
/* Pieces this page adds to the kit's, built from its tokens only: the film as a square figure,
   and a row that holds a heading, what it is, and why (the first film's page uses the same rows). */
.o-film { margin: var(--k-space-5) auto; max-width: 560px; }
.o-film video, .o-film .o-none { display: block; width: 100%; max-width: 100%; height: auto; aspect-ratio: 1 / 1; border-radius: 14px; border: 1px solid var(--k-line); background-color: var(--k-well); }
.o-film figcaption { margin-block-start: var(--k-space-3); font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-3); text-align: center; }
.o-save { display: flex; width: 100%; margin-block-start: var(--k-space-3); }
.o-said { margin: var(--k-space-2) 0 0; min-height: 19px; font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-2); text-align: center; }
.o-scenes { list-style: none; margin: var(--k-space-4) 0 0; padding: 0; }
.o-scene { padding-block: var(--k-space-5); min-width: 0; }
.o-scene + .o-scene { border-block-start: 1px solid var(--k-line); }
.o-head { display: flex; align-items: center; justify-content: space-between; gap: var(--k-space-3); }
.o-head h3 { margin: 0; font-family: var(--k-font-serif); font-size: 19px; line-height: 26px; font-weight: 600; color: var(--k-ink); }
.o-play { flex: none; min-height: 44px; padding: 0 var(--k-space-4); font-size: 14px; font-variant-numeric: tabular-nums; }
.o-scene p { margin: var(--k-space-2) 0 0; font-family: var(--k-font-serif); font-size: 16px; line-height: 25px; color: var(--k-ink-2); max-width: var(--k-measure); }
.o-scene p.o-why { color: var(--k-ink); }
.o-source a { color: var(--k-ink); text-decoration: underline; text-underline-offset: 3px; display: inline-block; min-height: 44px; padding-block: 10px; font-family: var(--k-font-sans); font-weight: 600; }
</style>
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For your yes or no</span>
    <h1>Orthodox Christians in America, in 3D: the sample</h1>
    <p class="k-lede">Round two, as you asked: real 3D, edit style, square. This is ten seconds, the signature shot. The full film waits for your yes.</p>
    <p class="k-meta">Made 13 November 2026. One version. Nothing was paid for.</p>
  </header>

  <section aria-label="The sample">
    <figure class="o-film">
      ${videoSrc ? `<video id="film" controls playsinline muted loop preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""} src="${esc(videoSrc)}" aria-label="The 3D sample: ${SECONDS} seconds, silent"></video>` : `<div class="o-none" role="img" aria-label="The sample is not on the page yet"></div>`}
      <figcaption>${SECONDS} seconds, 1080 by 1080, black and white, no sound.</figcaption>
      ${videoSrc ? `<button class="k-button o-save" id="save-film" type="button" hidden>Save the sample</button>
      <p class="o-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">${film ? film.frames : 300} frames at 30 a second</span><span class="k-stat-value">${SECONDS} seconds</span></div>
      <div class="k-stat"><span class="k-stat-label">File</span><span class="k-stat-change">H.264, 1080 by 1080, no sound</span><span class="k-stat-value">${mb} MB</span></div>
      <div class="k-stat"><span class="k-stat-label">One frame takes</span><span class="k-stat-change">Drawn about ${timing ? Math.round(timing.drawingsAFrame) : 30} times over for the blur and the focus, on this machine's processor alone</span><span class="k-stat-value">${perFrame} seconds</span></div>
      <div class="k-stat"><span class="k-stat-label">Paid for</span><span class="k-stat-change">No generation credits, no rented graphics card, no stock footage</span><span class="k-stat-value">Nothing</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-ask">
    <h2 id="s-ask">What I need from you</h2>
    <p><strong>Yes or no to this look.</strong> If yes, the whole film is made this way: every checked figure from the first film, each as its own 3D shot, with the sources on screen and at the end.</p>
    <p><strong>What a yes costs.</strong> No money. At ${perFrame} seconds a frame, a film of 75 to 90 seconds takes about ${hours(75)} to ${hours(90)} hours of rendering, done in the background in runs that pick up where the last one stopped.</p>
    <p><strong>One thing to know.</strong> The figure in this sample is ${FIGURE}%, the six states. The film's first figure is 1% of American adults, and it will open the film over the globe. I used the six states here because a state's height needs a figure for that state, and this is the one source that gives them.</p>
  </section>

  <section class="k-section" aria-labelledby="s-beats">
    <h2 id="s-beats">The shot, beat by beat</h2>
    <p>Tap a time to play from that beat. Under each: what happens, and why.</p>
    <ol class="o-scenes">
${BEATS.map(([t, title, shows, why], i) => `      <li class="o-scene">
        <div class="o-head"><h3>${esc(title)}</h3>${videoSrc ? `<button class="k-button k-button-quiet o-play" type="button" data-at="${t}" aria-label="Play from beat ${i + 1}, ${esc(title)}, at ${at(t)}">${at(t)}</button>` : `<span class="k-meta">${at(t)}</span>`}</div>
        <p>${esc(shows)}</p>
        <p class="o-why">${esc(why)}</p>
      </li>`).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-look">
    <h2 id="s-look">Each choice, and the reason for it</h2>
    <ol class="o-scenes">
${LOOK.map(([what, why, does]) => `      <li class="o-scene"><div class="o-head"><h3>${esc(what)}</h3></div><p>${esc(why)}</p><p class="o-why">${esc(does)}</p></li>`).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-fact">
    <h2 id="s-fact">The figure, and where it stands</h2>
    <p><strong>${FIGURE}% ${esc(CAPTION)}</strong> ${SIX.map((s) => `${esc(s.name)} ${s.share.toFixed(1)}%`).join(", ")}.</p>
    <p>The source's own words: ${esc(fact.says)}</p>
    <p>These are people on the rolls of Eastern Orthodox parishes in 2020, adults and children, as the census counted them. It is the figure the first film checked, unchanged.</p>
    <p class="o-source"><a href="${esc(SOURCES.appF.url)}" target="_blank" rel="noopener">${esc(SOURCES.appF.name)}: ${esc(SOURCES.appF.title)}</a></p>
    <p>The world's outline is Natural Earth and the states are the U.S. Census Bureau's boundary files, both public domain.</p>
  </section>

  <section class="k-section" aria-labelledby="s-rules">
    <h2 id="s-rules">The rules it was held to</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Every word 4.5:1 or more</span><span class="k-stat-change">Measured on the frames, against the brightest ground behind each word; the least is ${least}:1</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Reads on a phone</span><span class="k-stat-change">No letter under ${smallest} px in the frame, which is 10.8 px on a phone 390 wide; looked at there</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">No rays, flare, sparkle, dashes or parchment</span><span class="k-stat-change">Read from the scene code before every render, the way the house reads a promo script</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Grey only</span><span class="k-stat-change">Every colour that reaches the screen has equal red, green and blue, and the file is encoded from a grey picture</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Figures as checked</span><span class="k-stat-change">All seven on screen are held to the first film's checked list before a frame is drawn</span><span class="k-stat-value">Pass</span></div>
    </div>
  </section>

  <footer class="k-foot">
    <p class="k-meta">One version was made. The first film stays on its own page as an explainer. Source: docs/promo/orthodox-america/3d/</p>
  </footer>
</main>
${videoSrc ? `<script>
// Each beat's time plays the sample from there.
(() => {
  const film = document.getElementById("film");
  for (const b of document.querySelectorAll(".o-play")) b.addEventListener("click", () => {
    film.currentTime = Number(b.dataset.at) + 0.01; film.play().catch(() => {});
    film.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
})();
// The file, to keep: the button shows only where this view can hand a file over, and nothing is saved unless he says yes.
(async () => {
  const button = document.getElementById("save-film"), said = document.getElementById("save-said");
  const downloads = await window.claude?.use?.("downloads");
  if (!button || !downloads) return;
  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true; said.textContent = "Getting the file.";
    try {
      const file = await (await fetch(${JSON.stringify(videoSrc)})).blob();
      await downloads.save({ filename: "orthodox-christians-in-america-3d-sample.mp4", data: file });
      said.textContent = "Saved.";
    } catch (error) {
      said.textContent = error && error.code === "declined" ? "Not saved." : "It could not be saved from here. Ask for the file and it will be sent.";
    }
    button.disabled = false;
  });
})();
</script>` : ""}
`;
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(PAGE, page(arg("video") ?? "", arg("poster") ?? ""));
console.log(`${path.relative(ROOT, PAGE)}  ${(fs.statSync(PAGE).size / 1024).toFixed(0)} KB`);
for (const piece of [...BEATS.flat(), ...LOOK.flat()]) if (typeof piece === "string" && /[–—]/.test(piece)) throw new Error(`a dash in the page's words: ${piece}`);

// ---- The page's own check, the way docs/brand/kit/check.mjs holds the kit's page ----
if (process.argv.includes("--check")) {
  const { checkMock, printMockCheck, PALETTES } = await import("../../../../scripts/mock-check.mjs");
  const { createRequire } = await import("node:module");
  const { chromium } = createRequire(import.meta.url)("playwright");
  const browser = await chromium.launch();
  let ok = true;
  for (const width of [360, 390, 412, 1032]) {
    const phone = width < 600;
    const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: "dark", isMobile: phone, hasTouch: phone });
    const tab = await ctx.newPage();
    // As the Artifact tool wraps it: a doctype, a head with a viewport, the page in the body.
    await tab.setContent(`<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${fs.readFileSync(PAGE, "utf8")}</body></html>`, { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(400);
    ok = printMockCheck(await checkMock(tab, "body", { palettes: PALETTES }), `the sample's page at ${width}`) && ok;
    const wide = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (wide > 0) { console.log(`  NO   width       at ${width}: the page is ${wide}px wider than the screen`); ok = false; }
    if (width === 390) await tab.screenshot({ path: path.join(OUT, "page-390.png"), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(ok ? "page check: passes on the five palettes at 360, 390, 412 and 1032" : "page check: FAILED");
  if (!ok) process.exit(1);
}

// ---- The record --------------------------------------------------------------
if (film && timing) {
  const record = `# The 3D sample: the record

Written by \`page.mjs\` from what was made and measured. Do not edit this file: change the code and write it out again.

Round 2 of the documentary insert (\`../BRIEF.md\`, "Round 2"): his words on the first film were "this is good for like a slideshow explanation but I'm referring to high quality animated visuals (I.e a globe that spins with edit style animations) 3d visuals etc)", then "and do 1:1 ratio". This is the sample of the signature shot, for his yes before the full film.

## The file

| | |
|---|---|
| File | \`.promo/orthodox-america-3d/orthodox-america-3d-sample.mp4\` (out of git) |
| Length | ${film.seconds.toFixed(2)} seconds, ${film.frames} frames |
| Size | ${(film.bytes / 1048576).toFixed(2)} MB (${film.bytes} bytes) |
| Picture | ${film.size[0]} by ${film.size[1]}, ${film.codec}, ${film.pixels}, ${film.fps} frames a second, faststart |
| Sound | ${film.sound} |
| A frame takes | ${timing.secondsAFrame} seconds on average (${timing.frames} frames in ${timing.seconds} seconds), each drawn ${timing.drawingsAFrame} times over on average |
| Drawn by | ${timing.renderer} |
| Paid generation | none. three.js in Playwright's Chromium, ffmpeg, two open faces and two public maps |

## What the full film would take

At ${timing.secondsAFrame} seconds a frame, 30 frames a second: a film of 75 seconds is ${75 * 30} frames and about ${hours(75)} hours; 90 seconds is ${90 * 30} frames and about ${hours(90)} hours. A background job stops at 30 minutes, so the film is taken in runs with \`--film --resume --minutes=26\`; each frame is the same whenever it is drawn, so a run keeps what the last one left. The fast frames (the push) cost about three times a still one.

## How it was made

\`shot.js\` is the shot as a three.js scene (WebGL2, in software through SwiftShader), set to any moment by frame number. \`render.mjs\` checks the rules and the measures, asks the page for one frame at a time, and ffmpeg writes them with a fine grain (a fixed seed). \`words.mjs\` holds every word and figure on screen.

- **Blur and focus.** Each frame is the scene drawn 20 to 72 times within its own shutter, each drawing a moment later and through a different point of the lens, averaged in linear light. That one loop is the motion blur, the depth of field and the smoothing of edges.
- **The cut.** At the push's fastest moment the globe gives way to the map over three frames, drawing by drawing inside the same blur. The map is scaled so that an Earth radius is 13 map units (us-atlas draws Albers USA at 1,300 px a radius), so the country is the same size on both sides.
- **Height.** Every state stands 0.06 units high. Each of the six rises a further ${(2.1 / 10.9).toFixed(4)} units for each percentage point of its share (California's 10.9% is 2.1 units). No other state has a checked figure, so no other state rises.
- **The count.** The figure on screen is the sum of the shares of the states that have risen; it reads ${FIGURE} when the last one lands.
- **The world.** Natural Earth 1:50m by way of \`world-atlas\` (public domain), drawn once as a mask the globe's shader reads. **The states:** \`../map.json\`, from us-atlas (the U.S. Census Bureau's cartographic boundary files, public domain).
- **Faces.** DM Serif Display and DM Sans, the app's own, from their open-licence packages (\`@fontsource\`).
- **Light.** A soft glow at the globe's rim, on the top of each risen form (only what is brighter than white glows, so no word does) and a soft pool at its foot. No rays, flare, streak or sparkle; the stars are round points.
- **Rays, and the house's other rules.** \`lib/marketing/__tests__/promoLooks.test.ts\` refuses a \`conic-gradient\` and the sparkle's glyphs in a promo script. \`render.mjs --check\` holds \`shot.js\`, \`shot.html\` and \`words.mjs\` to the same measure before any frame, and also refuses rays, flares and streaks by their 3D names, a dash in place of words, parchment or sepia, a borrowed picture, and a colour that is not a grey (the world's mask is three channels of data and is never shown).
- **The measures.** On rendered frames with the words taken out, the brightest ground behind each piece of words (the 99th percentile of its box) is held to 4.5:1 against the word, every piece must be inside the frame, and no letter may be under 30 px (10.8 on a phone 390 wide). Result: ${measured.trim() || "not recorded"}
- **Figures.** The ${SIX.length} shares and ${FIGURE} are held to \`../facts.mjs\` (scene "where") and to the source's own words there, before any frame.
- **checkMock.** It measures an app mockup. A film frame has no palette and no controls, so the frames are held by \`render.mjs --check\`; the page he sees it on is held by checkMock itself (\`page.mjs --check\`, five palettes at 360, 390, 412 and 1032).
- **Pictures.** None. \`lib/marketing/heritagePictures.ts\` is not touched.

## On screen

| At | What | Words and figures |
|---|---|---|
| 0:00 | The globe turns | ${TITLE.join(" / ")} |
| 0:02 | The push | none |
| 0:03 | The landing | none |
| 0:04 | The six rise | ${SIX.map((s) => `${s.name} ${s.share.toFixed(1)}%`).join("; ")} |
| 0:05 | The figure lands | ${FIGURE}% ${CAPTION} ${SOURCE_LINE} |

Source of the figure: [${SOURCES.appF.name}](${SOURCES.appF.url}), ${SOURCES.appF.title}. Its words: ${fact.says.replace(/\|/g, "/")}

## To make it again

\`npm install three world-atlas us-atlas topojson-client d3-geo @fontsource/dm-serif-display @fontsource/dm-sans\` in \`.promo/orthodox-america-3d/tools\`, then \`render.mjs --check\`, \`--stills\`, \`--draft\` or \`--film\` (with Playwright on \`NODE_PATH\`).
`;
  fs.writeFileSync(path.join(HERE, "RECORD.md"), record);
  console.log("RECORD.md written");
}
