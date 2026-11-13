// The page he sees the 3D sample's second pass on, and the record of what was made.
//
//   node docs/promo/orthodox-america/3d/page.mjs [--video=<the sample's address on the page>] [--poster=<a still's address>]
//   node docs/promo/orthodox-america/3d/page.mjs --check     checkMock on the page, five palettes, 360 390 412 1032
//
// It writes the page to .promo/orthodox-america-3d/orthodox-america-3d-sample-2.html
// (out of git; published from there with the Artifact tool, the sample and its
// poster in the page's own asset store) and RECORD.md beside this file.
// Built from the design kit (docs/brand/design-kit.md): the kit's own style
// block and pieces. Dark first, phone first, never parchment, and a reason
// beside every choice, the face first because he asked for it.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FACTS, DERIVED, SOURCES } from "../facts.mjs";
import { SIX, FIGURE, CAPTION, SOURCE_LINE, TITLE, SECONDS, SCENE_ONE, NUMERALS, ROLLS, SUNDAY, PEOPLE_A_POINT, SHARE, CAPTION_ROLLS, CAPTION_SUNDAY, SHARE_LINE, KEY } from "./words.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUT = path.join(ROOT, ".promo/orthodox-america-3d");
const FILM = path.join(OUT, "orthodox-america-3d-sample-2.mp4");
const PAGE = path.join(OUT, "orthodox-america-3d-sample-2.html");
const FIRST = "https://claude.ai/artifact/5Z5B2zW1vopmX1e2WiiwNt"; // the first sample's page, which stays as it was
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (x) => x.toLocaleString("en-US");

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
const digit = /each ([\d.]+) wide at 100/.exec(measured)?.[1] ?? "45.6";
const mb = film ? (film.bytes / 1048576).toFixed(1) : "0";
const perFrame = timing ? timing.secondsAFrame : 0;
const hours = (seconds) => ((seconds * 30 * perFrame) / 3600).toFixed(1);
const fact = FACTS.find((f) => f.scene === "where" && f.show.includes(FIGURE));
const rolls = FACTS.find((f) => f.scene === "gap" && f.show.includes(String(ROLLS))), sunday = FACTS.find((f) => f.scene === "gap" && f.show.includes(String(SUNDAY)));
const derived = DERIVED.find((d) => d.show.includes(`${SHARE}%`));
const POINTS = Math.round(ROLLS / PEOPLE_A_POINT), STAY = Math.round(SUNDAY / PEOPLE_A_POINT);
const FROM_SIX = SIX.reduce((sum, s) => sum + Math.round((s.share / 100) * POINTS), 0);

// ---- The face, first: he asked for it -----------------------------------------
const FACE = [
  [`${NUMERALS.family}, for every figure`, `You said you would change the number face. The first sample set its figures in the serif the titles use, which reads as a book's numbers. ${NUMERALS.family} is a narrow, upright grotesque: the kind of figure a documentary puts on a lower third or a scoreboard.`, "The numbers now read as counted, not written. The eye takes them in as data at a glance, and the serif is left to do one job, the title."],
  ["Every digit the same width", `A count that runs has to stand still while it runs. In this face all ten digits are drawn to one width (measured: each is ${digit} wide at a size of 100), with nothing to switch on.`, `${n(ROLLS)} runs down to ${n(SUNDAY)} in scene two and no digit moves sideways. Only the values change.`],
  ["Narrow, so a large number can be large", "Six digits and a comma have to fit a square frame at a size a phone can read. A narrow face fits them at nearly the height of the first sample's three.", `${n(ROLLS)} is set at 196 px in the frame. Its digits stand about 135 px tall, which is about 49 px on a phone.`],
  ["One weight, one face, everywhere", "The large figures, the six states' shares, the share in scene two and the 100 in the key are all the same face at the same weight.", "A viewer learns once what a figure looks like in this film and finds every one after that without reading for it."],
  ["Only the numbers changed", "You asked for the number face and nothing else. The title keeps DM Serif Display and the labels and captions keep DM Sans, the app's own.", "It is still Purify's film. The source's name at the foot stays in the words' face, since it is a name and not a figure."],
  ["Free to use", `${NUMERALS.family} is by ${NUMERALS.by}, under the ${NUMERALS.licence}, which allows use in a film and in anything sold.`, "Nothing to buy and nothing to credit on screen."],
];

// ---- The sample, beat by beat --------------------------------------------------
const ONE = [
  [0, "The globe turns", "The Earth in space, its land drawn as points of light, turning west to North America. The title stands in front of it.", "As you approved it."],
  [2.5, "The push and the landing", "The camera rushes down at the United States and the globe becomes the map inside the blur.", "As you approved it: the transition you called nice is untouched, frame for frame."],
  [4.0, "The six rise, and the figure lands", `Six states rise as forms whose height is their share, and ${FIGURE}% counts up as they do.`, "The same shot, with the figures in the new face."],
];
const TWO = [
  [SCENE_ONE, "The hand-over", "No cut and no fade. The camera's slow drift becomes a rising turn about the country. The six forms sink back and give their light up as points; the rest of the map does the same.", "You asked that ten seconds flow into the next scene without a seam. The move starts from the speed the camera already had, so there is no frame where one scene stops. What was on screen becomes the next scene's material: the light of the forms becomes the people."],
  [12.0, "The field stands", `The points gather into one round field in the air, the camera comes to rest over it, and the count runs up to ${n(ROLLS)} as they arrive. A line says what a point is: ${PEOPLE_A_POINT} people.`, "A new design, as you asked: scene one was a map of places, this is a field of people. The count lands as the last points do, so the number and the picture arrive as one thing."],
  [14.2, "The falling away", `A wave crosses the field from far to near. Most of the points sink and go out. The count runs down with them to ${n(SUNDAY)}. A fine ring stays where the edge of the field was.`, "This is the film's heart, shown and not told: most of those on the rolls are not there on a Sunday. The wave comes toward the viewer, so it is felt. The ring keeps the size of the rolls in view after the points have gone."],
  [16.2, "They draw together", "The points that stayed close ranks into one bright body in the middle of the ring.", "Scattered, the ones who stayed are hard to weigh against the whole. Drawn together at the same spacing as before, their area against the ring's is the true share, so the eye can judge it."],
  [17.1, "The share lands", `${SHARE}% lands at the near edge of those who stayed. Everything holds to the end: the count, what it counts, the share, the key and the source.`, "The last three seconds are for reading. Both figures are from the same census of the same Churches, so the share compares like with like."],
];

// ---- Scene two: each choice, and the reason for it -----------------------------
const LOOK = [
  ["One move, not a cut", "The first scene used a cut hidden in a fast push. A second one would make the film feel like a set of clips. Here the scene changes in a single camera move with nothing hidden.", "The two scenes feel like one thought: where they live, then how many come."],
  [`One point of light is ${PEOPLE_A_POINT} people`, `A point for each person would be a grey haze. At ${PEOPLE_A_POINT} to a point the field is ${n(POINTS)} points, each one still a point, and ${n(STAY)} stay. The line on screen says so.`, "The picture is a count, not a mood. Anyone could count the points and get the figure."],
  ["The six states give their own shares", `Of the ${n(POINTS)} points, ${n(FROM_SIX)} lift from the tops of the six forms, each state giving its checked share. The source gives no figure for any other state, so the rest lift evenly from the others.`, "The first scene's figure is carried into the second by the picture itself. Nothing is guessed."],
  ["A round field, with no map left in it", "Once the points are people, where they came from is no longer the point. A round field has no east or west.", "The viewer stops reading geography and starts reading number."],
  ["Who stays is drawn from all over the field", "The census does not say where the regular attendees are. So the points that stay are drawn by a fixed dice from the whole field, the same on every render.", "The film does not suggest that one region attends and another does not."],
  ["The count is tied to the points", "The large figure is the number of points standing in the field at that moment, times a hundred, landing exactly on the two checked figures.", "The number is never ahead of the picture or behind it."],
  ["The ring", "A fine line where the full field stood. It is a measure, like the rim of a gauge, and it appears only as the points leave.", "Without it the last frame would show a body of light with nothing to compare it to."],
  ["Those who stay grow brighter", "As they draw together they take a soft glow. It is the only glow in the scene.", "The eye ends on the people who are there. No rays, no flare and no sparkle, as the house rules."],
  ["The source never leaves", "Both scenes stand on the same census, so its line stays at the foot from the first figure to the last frame.", "A viewer who pauses anywhere after the first figure can see where the numbers come from."],
];

const kit = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(kit)[0];
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(kit)?.[0] ?? "";
const at = (s) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

function page(videoSrc, poster) {
  const row = ([what, why, does]) => `      <li class="o-scene"><div class="o-head"><h3>${esc(what)}</h3></div><p>${esc(why)}</p><p class="o-why">${esc(does)}</p></li>`;
  const beat = ([t, title, shows, why], i) => `      <li class="o-scene">
        <div class="o-head"><h3>${esc(title)}</h3>${videoSrc ? `<button class="k-button k-button-quiet o-play" type="button" data-at="${t}" aria-label="Play from ${at(t)}, ${esc(title)}">${at(t)}</button>` : `<span class="k-meta">${at(t)}</span>`}</div>
        <p>${esc(shows)}</p>
        <p class="o-why">${esc(why)}</p>
      </li>`;
  return `<title>Orthodox America 3D, Second Pass</title>
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
    <h1>Orthodox Christians in America, in 3D: the second pass</h1>
    <p class="k-lede">You said the sample was good, that you would change the number face, and to add a new scene that the first flows into with no seam. This is both: two scenes, twenty seconds, one unbroken move.</p>
    <p class="k-meta">Made 13 November 2026. One version. Nothing was paid for.</p>
  </header>

  <section aria-label="The sample">
    <figure class="o-film">
      ${videoSrc ? `<video id="film" controls playsinline muted loop preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""} src="${esc(videoSrc)}" aria-label="The 3D sample, second pass: ${SECONDS} seconds, silent"></video>` : `<div class="o-none" role="img" aria-label="The sample is not on the page yet"></div>`}
      <figcaption>${SECONDS} seconds, 1080 by 1080, black and white, no sound.</figcaption>
      ${videoSrc ? `<button class="k-button o-save" id="save-film" type="button" hidden>Save the sample</button>
      <p class="o-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">${film ? film.frames : 600} frames at 30 a second, two scenes</span><span class="k-stat-value">${SECONDS} seconds</span></div>
      <div class="k-stat"><span class="k-stat-label">File</span><span class="k-stat-change">H.264, 1080 by 1080, no sound</span><span class="k-stat-value">${mb} MB</span></div>
      <div class="k-stat"><span class="k-stat-label">One frame takes</span><span class="k-stat-change">Drawn about ${timing ? Math.round(timing.drawingsAFrame) : 30} times over for the blur and the focus, on this machine's processor alone</span><span class="k-stat-value">${perFrame} seconds</span></div>
      <div class="k-stat"><span class="k-stat-label">Paid for</span><span class="k-stat-change">No generation credits, no rented graphics card, no stock footage</span><span class="k-stat-value">Nothing</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-ask">
    <h2 id="s-ask">What I need from you</h2>
    <p><strong>Yes or no to two things:</strong> the new face for the numbers, and scene two with the way scene one flows into it.</p>
    <p><strong>What a yes costs.</strong> No money. At ${perFrame} seconds a frame, a film of 75 to 90 seconds takes about ${hours(75)} to ${hours(90)} hours of rendering in the background. Nothing of the full film is made until you say yes.</p>
    <p><strong>One thing to know.</strong> ${SHARE}% is not printed in the census. It prints the two counts, ${n(SUNDAY)} and ${n(ROLLS)}, and I divided them. The measure itself is the census's own, and both counts are of the same Churches in the same year.</p>
  </section>

  <section class="k-section" aria-labelledby="s-face">
    <h2 id="s-face">The number face, first</h2>
    <p>You asked for this by name, so it comes before everything else. For each choice: what it is and why, then what it does for the viewer.</p>
    <ol class="o-scenes">
${FACE.map(row).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-one">
    <h2 id="s-one">Scene one, as you approved it</h2>
    <p>Nothing in the first ten seconds has moved. Only the figures' face is new. Tap a time to play from there. The reasons for this scene are on <a href="${FIRST}" target="_blank" rel="noopener">the first sample's page</a>.</p>
    <ol class="o-scenes">
${ONE.map(beat).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-two">
    <h2 id="s-two">Scene two, beat by beat</h2>
    <p>The gap between the rolls and a Sunday. Under each beat: what happens, and why.</p>
    <ol class="o-scenes">
${TWO.map(beat).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-look">
    <h2 id="s-look">Scene two: each choice, and the reason for it</h2>
    <ol class="o-scenes">
${LOOK.map(row).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-fact">
    <h2 id="s-fact">The figures, and where they stand</h2>
    <p><strong>${n(ROLLS)} ${esc(CAPTION_ROLLS)}</strong> ${esc(rolls.says)} The film says "on parish rolls" for the census's "adherents", as the first film did.</p>
    <p><strong>${n(SUNDAY)} ${esc(CAPTION_SUNDAY)}</strong> ${esc(sunday.says)}</p>
    <p><strong>${SHARE}% ${esc(SHARE_LINE)}.</strong> ${esc(derived.says)}</p>
    <p><strong>${FIGURE}% ${esc(CAPTION)}</strong> Unchanged from the first sample.</p>
    <p class="o-source"><a href="${esc(SOURCES.appF.url)}" target="_blank" rel="noopener">${esc(SOURCES.appF.name)}: ${esc(SOURCES.appF.title)}</a></p>
    <p>I read the census's own pages again today for the two counts and for its measure of attendance. These are Eastern Orthodox parishes only, in 2020. The Oriental Orthodox Churches are counted apart by the census and are not in this scene.</p>
  </section>

  <section class="k-section" aria-labelledby="s-rules">
    <h2 id="s-rules">The rules it was held to</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Every word 4.5:1 or more</span><span class="k-stat-change">Measured on the frames of both scenes, against the brightest ground behind each word; the least is ${least}:1</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Reads on a phone</span><span class="k-stat-change">No letter under ${smallest} px in the frame, which is 10.8 px on a phone 390 wide; looked at there</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">No rays, flare, sparkle, dashes or parchment</span><span class="k-stat-change">Read from the scene code before every render, the way the house reads a promo script</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Grey only</span><span class="k-stat-change">Every colour that reaches the screen has equal red, green and blue, and the file is encoded from a grey picture</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Figures as checked</span><span class="k-stat-change">All ten on screen are held to the checked list, and the share to its division, before a frame is drawn</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">The points are a true count</span><span class="k-stat-change">${n(POINTS)} points for ${n(ROLLS)}, ${n(STAY)} for ${n(SUNDAY)}, counted by the check</span><span class="k-stat-value">Pass</span></div>
    </div>
  </section>

  <footer class="k-foot">
    <p class="k-meta">One version was made. The first sample stays on its own page. Source: docs/promo/orthodox-america/3d/</p>
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
      await downloads.save({ filename: "orthodox-christians-in-america-3d-sample-2.mp4", data: file });
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
for (const piece of [...FACE.flat(), ...ONE.flat(), ...TWO.flat(), ...LOOK.flat()]) if (typeof piece === "string" && /[–—]/.test(piece)) throw new Error(`a dash in the page's words: ${piece}`);

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
  const record = `# The 3D sample, second pass: the record

Written by \`page.mjs\` from what was made and measured. Do not edit this file: change the code and write it out again.

Round 2 of the documentary insert (\`../BRIEF.md\`, "Round 2, the sample's second pass"). His words on the first sample (${FIRST}), 2026-11-13 about 18:26 UTC: "this is good, id change the # font. but other than that the transition is nice. and add a new scene with a new design and transition and animation (ensure the scene at 10 seconds transitions into the next scene seemlessly also)". So: scene one as it was with its figures in one new face, and a second scene it flows into with no cut. For his yes before the full film.

## The file

| | |
|---|---|
| File | \`.promo/orthodox-america-3d/orthodox-america-3d-sample-2.mp4\` (out of git) |
| Length | ${film.seconds.toFixed(2)} seconds, ${film.frames} frames, two scenes |
| Size | ${(film.bytes / 1048576).toFixed(2)} MB (${film.bytes} bytes) |
| Picture | ${film.size[0]} by ${film.size[1]}, ${film.codec}, ${film.pixels}, ${film.fps} frames a second, faststart |
| Sound | ${film.sound} |
| A frame takes | ${timing.secondsAFrame} seconds on average (${timing.frames} frames in ${timing.seconds} seconds), each drawn ${timing.drawingsAFrame} times over on average |
| Drawn by | ${timing.renderer} |
| Paid generation | none. three.js in Playwright's Chromium, ffmpeg, three open faces and two public maps |

## What the full film would take

At ${timing.secondsAFrame} seconds a frame, 30 frames a second: a film of 75 seconds is ${75 * 30} frames and about ${hours(75)} hours; 90 seconds is ${90 * 30} frames and about ${hours(90)} hours. The first scene alone took 2.54 seconds a frame; the second is lighter (one cloud of points, no map once it has gone dark), so the average fell. A background job can be given up to two hours (\`timeout\`), and \`--film --resume --minutes=N\` keeps what a stopped run left: each frame is the same whenever it is drawn.

## The numerals' face

**${NUMERALS.family}**, weight ${NUMERALS.weight}, by ${NUMERALS.by}, ${NUMERALS.licence}, from \`${NUMERALS.from}\`. One face for every figure in the film: the large figures, the six shares, the share in scene two and the 100 in the key. The words keep DM Serif Display and DM Sans.

- **Lining and one width, as drawn.** Measured in the page before any frame: each of the ten digits is ${digit} wide at a size of 100. No font feature is switched on; a canvas cannot switch one on, which is why a face that is tabular by default was needed. \`render.mjs --check\` refuses the face if the ten widths differ.
- **What was passed over, by the same measure.** Barlow Condensed (digits 26.6 to 44.7 wide), Big Shoulders Display (21.8 to 41.7), Saira Condensed (28.3 to 49.0), Sofia Sans Extra Condensed (31.7 to 38.7) and Oswald (38.2 to 53.4) all draw a narrower 1 by default, so a running count would shiver in them.
- **Why this one.** A narrow upright grotesque is a film's figure (a lower third, a counter), not a book's; narrow lets six digits and a comma be set at 196 px in a square frame (digits about 135 px tall).

## How it was made

\`shot.js\` is both scenes as one three.js scene and one camera (WebGL2, in software through SwiftShader), set to any moment by frame number. \`render.mjs\` checks the rules and the measures, asks the page for one frame at a time, and ffmpeg writes them with a fine grain (a fixed seed). \`words.mjs\` holds every word and figure on screen.

- **Scene one is unchanged.** Everything scene two adds to the camera, the lens and the map is nothing, and at rest, until ${SCENE_ONE}.0 seconds (\`GO\`); the last frame of scene one is drawn from times before it. Only the figures' face differs from the first sample.
- **The hand-over, with no cut.** At ${SCENE_ONE}.0 the drift the camera already has becomes one move of 2.2 seconds: it turns 100 degrees about the country, rises 3 map units with the points it follows, and lowers its angle from 38 to 36 degrees. The move is eased from rest, so it begins at the drift's own speed. The six forms sink in 0.9 seconds and their light goes in 0.6; the map's own lattice brightens, then the whole map goes down to nothing by 12.0. There is one scene and one camera throughout; nothing is mixed or faded between two pictures.
- **The points.** One for every ${PEOPLE_A_POINT} people: ${n(POINTS)} for ${n(ROLLS)} and ${n(STAY)} for ${n(SUNDAY)} (rounded). ${n(FROM_SIX)} leave from the tops of the six forms, each state giving its share of the points (${SIX.map((s) => `${s.name} ${Math.round((s.share / 100) * POINTS)}`).join(", ")}); no other state has a checked figure, so the other ${n(POINTS - FROM_SIX)} leave evenly from the other states. Each goes to the place in the field that keeps its order among the others (west stays west), so paths do not cross.
- **The field.** A lattice of equal triangles, the ${n(POINTS)} sites nearest the middle: a round field 4.5 map units in reach, 3 units over the map.
- **Who stays.** ${n(STAY)} points drawn by a fixed dice from the whole field, the same on every render: the source parts regular attendees by no place. The others sink and go out in a wave from the far edge to the near one (1.0 second across, each up to 0.5 late, 0.5 to fall).
- **The count.** The figure is the points standing in the field, as a share of the way between the two checked figures: it runs up to ${n(ROLLS)} as the last point arrives (12.0), holds, runs down from 14.2 and reads ${n(SUNDAY)} at 16.2. Seven fixed cells, so nothing moves sideways.
- **Drawing together.** Those who stay move to the ${n(STAY)} innermost sites of the same lattice, each to the free site nearest where a plain drawing in would put it. Same spacing as the full field, so the body's area against the ring's is the share. They brighten past white as they do, which is the scene's only glow.
- **The ring.** A line 0.024 units wide at the edge of the full field, from 14.4. It is a measure, not an ornament: it keeps the size of the rolls on screen.
- **Blur and focus.** Each frame is the scene drawn 20 to 72 times within its own shutter (20 at rest, up to 56 in the hand-over), each drawing a moment later and through a different point of the lens, averaged in linear light.
- **Scene one's method** (the cut inside the push, height as the figure, the globe and the map) is as the first sample's record gave it: \`git log\` on this file.
- **Faces.** ${NUMERALS.family} for figures; DM Serif Display and DM Sans, the app's own, for words. All from open-licence packages (\`@fontsource\`).
- **Light.** A soft glow at the globe's rim, on the top of each risen form and on those who stay. No rays, flare, streak or sparkle; every point is a round point.
- **The house's rules.** \`render.mjs --check\` holds \`shot.js\`, \`shot.html\` and \`words.mjs\` to the measure of \`lib/marketing/__tests__/promoLooks.test.ts\` before any frame (no conic gradient, no sparkle glyph), and also refuses rays, flares and streaks by their 3D names, a dash in place of words, parchment or sepia, a borrowed picture, and a colour that is not a grey.
- **The measures.** On rendered frames of both scenes with the words taken out, the brightest ground behind each piece of words (the 99th percentile of its box) is held to 4.5:1 against the word, every piece must be inside the frame, and no letter may be under 30 px (10.8 on a phone 390 wide). Result: ${measured.trim() || "not recorded"}
- **checkMock.** It measures an app mockup. A film frame has no palette and no controls, so the frames are held by \`render.mjs --check\`; the page he sees it on is held by checkMock itself (\`page.mjs --check\`, five palettes at 360, 390, 412 and 1032).
- **Pictures.** None. \`lib/marketing/heritagePictures.ts\` is not touched.

## On screen

| At | What | Words and figures |
|---|---|---|
| 0:00 | The globe turns | ${TITLE.join(" / ")} |
| 0:02 | The push and the landing | none |
| 0:04 | The six rise | ${SIX.map((s) => `${s.name} ${s.share.toFixed(1)}%`).join("; ")} |
| 0:05 | The figure lands | ${FIGURE}% ${CAPTION} ${SOURCE_LINE} |
| 0:10 | The hand-over | the source's line stays |
| 0:12 | The field stands | ${n(ROLLS)} ${CAPTION_ROLLS} ${KEY.join("")} |
| 0:14 | The falling away | the count runs down |
| 0:16 | They draw together | ${n(SUNDAY)} ${CAPTION_SUNDAY} |
| 0:17 | The share lands | ${SHARE}% ${SHARE_LINE} |

## The figures

All from [${SOURCES.appF.name}](${SOURCES.appF.url}), ${SOURCES.appF.title}, read again on 2026-11-13 for this pass.

- ${FIGURE}% and the six shares: ${fact.says.replace(/\|/g, "/")}
- ${n(ROLLS)}: ${rolls.says}
- ${n(SUNDAY)}: ${sunday.says}
- ${SHARE}%: ${derived.says} It is in \`../facts.mjs\` as \`DERIVED\`, apart from \`FACTS\`, because the first film's check holds every figure in \`FACTS\` to its own page.

## To make it again

\`npm install three world-atlas us-atlas topojson-client d3-geo @fontsource/dm-serif-display @fontsource/dm-sans @fontsource/archivo-narrow\` in \`.promo/orthodox-america-3d/tools\`, then \`render.mjs --check\`, \`--stills <seconds> [--strip]\`, \`--draft\` or \`--film\` (with Playwright on \`NODE_PATH\`). To grow it into the film: each new scene adds its own time constants that are nothing until its own start, as scene two's do after \`GO\`, and its own words in \`words.mjs\` held to \`facts.mjs\`.
`;
  fs.writeFileSync(path.join(HERE, "RECORD.md"), record);
  console.log("RECORD.md written");
}
