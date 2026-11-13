#!/usr/bin/env node
// The page he sees the 1.9 video on, and the record of what was made.
//
//   node docs/plans/v1.9/video/page.mjs --artifact=<file.html> [--video=<the video's address on the page>] [--poster=<a still's address>]
//
// On claude.ai the video and its still are kept in the page's own asset store
// (the Artifact tool uploads them and gives each an address to name here).
//
// The page is made from the Purify design kit (docs/brand/design-kit.md): the
// kit's own style block, whole, and its pieces (title, figures, section,
// figure, note, footer). It opens on the app's Dark; its light is the kit's
// clean neutral, never parchment. Phone first: one column, and the video at a
// phone's own shape. It carries "Why it looks this way": for each scene what
// it shows and why, read from scenes.mjs.
//
// RECORD.md beside this file is written from the same facts: the file's
// measures (compose.mjs), each scene, each take's pictures, and checkMock.

import fs from "node:fs";
import path from "node:path";
import { HERE, MADE, ROOT, SLOW } from "./lib.mjs";
import { OVER, SCENES } from "./scenes.mjs";

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(MADE, file), "utf8"));

let clock = 0;
for (const s of SCENES) {
  s.start = clock;
  s.end = clock + s.seconds;
  clock = s.end - OVER;
}
const video = readJson("video.json");
const checks = readJson("check.json");
const takes = [...new Set(SCENES.filter((s) => s.take).map((s) => s.take))].map((id) => readJson(`takes/${id}/take.json`));
const exportCommit = video.export; // written when the file was made (compose.mjs)
const made = new Date().toISOString().slice(0, 10);
const clockOf = (t) => `0:${String(Math.floor(t)).padStart(2, "0")}`;
const wordsOf = (s) => (s.keep ? null : [s.title, s.sub].filter(Boolean).join(" "));
const passAll = checks.every((c) => c.pass);

// ── The page ─────────────────────────────────────────────────────────────

const template = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(template)?.[0] ?? (() => { throw new Error("the kit's template has no style block"); })();
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(template)?.[0] ?? "";

const sceneRow = (s) => `      <li class="v-scene">
        <span class="v-when">${clockOf(s.start)}</span>
        <div class="v-what">
          <h3>${esc(s.keep ? `${s.title} (the words stay)` : s.title)}</h3>
          <p>${esc(s.shows)}</p>
          <p class="v-why">${esc(s.why)}</p>
        </div>
      </li>`;

function page(videoSrc) {
  return `<title>Purify 1.9 Video</title>
<meta name="claude:viewport-fit-sides" content="cover">
${kitFonts}
${kitStyle}
<style>
/* Two pieces this page adds to the kit's, built from its tokens only: the video as a figure at a phone's own
   shape, and the scenes as rows with hairlines between (each a time, the words on screen, what it shows, why). */
.v-film { margin: var(--k-space-5) auto; max-width: 380px; }
.v-film video { display: block; width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 22px; border: 1px solid var(--k-line); background-color: var(--k-well); }
.v-save { display: flex; width: 100%; margin-block-start: var(--k-space-4); }
.v-said { margin: var(--k-space-2) 0 0; min-height: 19px; font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-2); text-align: center; }
.v-film figcaption { margin-block-start: var(--k-space-3); font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-3); text-align: center; }
.v-scenes { list-style: none; margin: var(--k-space-4) 0 0; padding: 0; }
.v-scene { display: grid; grid-template-columns: 44px minmax(0, 1fr); column-gap: var(--k-space-3); padding-block: var(--k-space-4); }
.v-scene + .v-scene { border-block-start: 1px solid var(--k-line); }
.v-when { font-family: var(--k-font-sans); font-size: var(--k-text-detail); line-height: 26px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--k-ink-3); }
.v-what h3 { margin: 0; font-family: var(--k-font-serif); font-size: 18px; line-height: 26px; font-weight: 600; color: var(--k-ink); }
.v-what p { margin: 6px 0 0; font-family: var(--k-font-serif); font-size: 16px; line-height: 25px; color: var(--k-ink-2); }
.v-what p.v-why { color: var(--k-ink); }
</style>
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For your yes or no</span>
    <h1>The 1.9 video</h1>
    <p class="k-lede">The app itself, filmed under a finger. One version, silent, for a phone feed.</p>
    <p class="k-meta">Made ${made} from the 1.9 export.</p>
  </header>

  <section aria-label="The video">
    <figure class="v-film">
      ${videoSrc ? `<video controls playsinline muted loop preload="metadata"${arg("poster") ? ` poster="${esc(arg("poster"))}"` : ""} src="${esc(videoSrc)}" aria-label="The Purify 1.9 video, ${Math.round(video.seconds)} seconds, silent"></video>` : `<div role="img" aria-label="The video is not on the page yet"></div>`}
      <figcaption>${Math.round(video.seconds)} seconds, 1080 by 1920, no sound. Tap to play.</figcaption>
      ${videoSrc ? `<button class="k-button v-save" id="save-film" type="button" hidden>Save the video</button>
      <p class="v-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">Asked for: 30 to 45 seconds</span><span class="k-stat-value">${video.seconds.toFixed(1)}s</span></div>
      <div class="k-stat"><span class="k-stat-label">Size</span><span class="k-stat-change">H.264, ${video.size[0]} by ${video.size[1]}, 60 frames a second. Asked for: under 15 MB</span><span class="k-stat-value">${video.megabytes.toFixed(1)} MB</span></div>
      <div class="k-stat"><span class="k-stat-label">Sound</span><span class="k-stat-change">A silent master. You set your own.</span><span class="k-stat-value">None</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-what">
    <h2 id="s-what">What it is</h2>
    <p>Every screen is the 1.9 app, opened as a new reader with no Plus on the feast of St Nicholas, and filmed while a finger taps it. The buttons' press, the page transitions and a card carrying its picture into its page are the app's own motion at its own speed. Nothing of the app is drawn.</p>
    <p>Around the screens the video adds four things: the night ground with the hill of your store pictures, the words, the picture moving in close and back, and a soft round where the finger is.</p>
    <p>The words are the drop's own, the store pictures' lines and the app's labels. Prayer campaigns are not shown or named. No picture on the heritage list is in any frame. No Plus feature is shown in use: Plus is named in the title where a scene is about it, and marked on the screen by the app.</p>
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Why it looks this way</h2>
    <p>Scene by scene: the words on screen, what is shown, and the reason.</p>
    <ol class="v-scenes">
${SCENES.map(sceneRow).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-look">
    <h2 id="s-look">The look, and why</h2>
    <ol class="v-scenes">
      <li class="v-scene"><span class="v-when">1</span><div class="v-what"><h3>The night ground and the hill</h3><p>The front look you chose for the 1.9 store pictures: the app's Dark, a low hill, one soft pool of light.</p><p class="v-why">A viewer who sees the video, the cards and the store page sees one release. No parchment, no rays.</p></div></li>
      <li class="v-scene"><span class="v-when">2</span><div class="v-what"><h3>The screen, plain and close</h3><p>A rounded picture of the app with a thin dark rim and no phone drawn round it. It is set down whole, then the picture moves in on what the finger is doing.</p><p class="v-why">On a phone feed the app's own words have to be read, so each scene ends close enough to read them. No hardware dates the video.</p></div></li>
      <li class="v-scene"><span class="v-when">3</span><div class="v-what"><h3>The words</h3><p>The title in DM Serif Display, the small line in DM Sans, both from the app. Each title rises line by line and leaves as the next arrives.</p><p class="v-why">Two short lines can be read in the second a scene gives them. They stand on the night above the screen, inside what a feed leaves clear.</p></div></li>
      <li class="v-scene"><span class="v-when">4</span><div class="v-what"><h3>The motion</h3><p>Every move of the picture and the words is on the house curve, the one the app's own transitions use. Scenes change the way a page arrives in the app: the new one rises its last pixels as it clears.</p><p class="v-why">The video moves the way the app moves, so the app's own transitions inside the screens do not look out of place.</p></div></li>
      <li class="v-scene"><span class="v-when">5</span><div class="v-what"><h3>The finger</h3><p>A soft round of the ink where the screen is touched, held or pulled.</p><p class="v-why">Without it a button seems to press itself. It is the only thing added over a screen.</p></div></li>
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-held">
    <h2 id="s-held">Held to the rules</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">checkMock on each scene's page</span><span class="k-stat-change">${checks.length} scenes, five palettes: contrast, tokens, rays, stripes, sparkle, dashes, mirroring</span><span class="k-stat-value">${passAll ? "Pass" : "No"}</span></div>
      <div class="k-stat"><span class="k-stat-label">Heritage pictures in view</span><span class="k-stat-change">Read all through every take, by file name</span><span class="k-stat-value">0</span></div>
      <div class="k-stat"><span class="k-stat-label">Campaigns named</span><span class="k-stat-change">On a screen or in a word</span><span class="k-stat-value">0</span></div>
    </div>
    <div class="k-note">
      <span class="k-eyebrow">Named before you look</span>
      <p>St Xenia's page has no picture yet, since the permission is awaited, so her scene is her name and the opening of her life. Reading mode lists the Light look and the Plus looks as the app shows them; only True black is chosen.</p>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Source: docs/plans/v1.9/video/</p>
  </footer>
</main>
${videoSrc ? `<script>
// The file, to keep: the button shows only where this view can hand a file over, and nothing is saved unless he says yes.
(async () => {
  const button = document.getElementById("save-film");
  const said = document.getElementById("save-said");
  const downloads = await window.claude?.use?.("downloads");
  if (!button || !downloads) return;
  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true;
    said.textContent = "Getting the file.";
    try {
      const file = await (await fetch(${JSON.stringify(videoSrc)})).blob();
      await downloads.save({ filename: "purify-1.9.mp4", data: file });
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

const out = arg("artifact");
if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, page(arg("video") ?? ""));
  console.log(`${out}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

// ── The record ───────────────────────────────────────────────────────────

const record = `# The 1.9 video: the record

Written by \`page.mjs\` on ${made} from what was made and measured. Do not edit this file: make the video again and write it out again.

## The file

| | |
|---|---|
| File | \`${video.file}\` (out of git) |
| Length | ${video.seconds.toFixed(2)} seconds, ${video.frames} frames |
| Size | ${video.megabytes.toFixed(2)} MB (${video.bytes} bytes) |
| Picture | ${video.size[0]} by ${video.size[1]}, ${video.codec}, ${video.pixels}, ${video.fps} frames a second |
| Sound | ${video.sound} |
| The app | the native export of \`${exportCommit}\`, cut as the store build with Plus locked |
| The day in the app | Sunday 6 December 2026, 9:30 in New York |
| Filmed | 1030 by 2115 for a screen of 412 by 846, the app's clock ${SLOW} times slower and played back ${SLOW} times faster |

## The scenes

| From | Scene | Words on screen | Where the words are from | Cut from |
|---|---|---|---|---|
${SCENES.map((s) => `| ${clockOf(s.start)} | ${s.id} | ${wordsOf(s) ? wordsOf(s) : "(the words before stay)"} | ${s.from_words ?? s.from} | ${s.take ? `the take \`${s.take}\`${s.join ? ", going on" : ""}` : "words alone"} |`).join("\n")}

What each shows, and why:

${SCENES.map((s) => `- **${s.id}.** ${s.shows} *${s.why}*`).join("\n")}

## The takes

Each as a new reader with no Plus (\`purify:plusFeatures\` read \`${takes[0].reader.plus}\`), no page error, no campaign named, no empty picture, and no picture on the heritage list in view at any moment.

| Take | The app's time | Frames | What the finger did | Pictures that were in view |
|---|---|---|---|---|
${takes.map((t) => `| ${t.id} | ${t.seconds.toFixed(1)}s | ${t.frames.length} | ${t.marks.filter((m) => m.kind !== "mark").map((m) => `${m.kind === "tap" ? "tap" : m.kind === "hold" ? "hold" : "pull"}: ${m.name}`).join("; ")} | ${t.picturesSeen.map((p) => p.split("/").pop().split("?")[0]).filter((p, i, all) => all.indexOf(p) === i).join(", ") || "none"} |`).join("\n")}

## checkMock

On the page each scene is drawn on, at a moment when its words are whole, on all five palettes.

| Scene | At | Result |
|---|---|---|
${checks.map((c) => `| ${c.scene} | ${c.at}s | ${c.pass ? "pass" : `NO: ${c.failures.join("; ")}`}${c.allowed?.length ? ` (${c.allowed.length} allowed by name)` : ""} |`).join("\n")}
`;
fs.writeFileSync(path.join(HERE, "RECORD.md"), record);
console.log("RECORD.md written");
