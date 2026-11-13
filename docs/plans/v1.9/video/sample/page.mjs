#!/usr/bin/env node
// The page he sees the sample on, and the record of what was made.
//
//   node docs/plans/v1.9/video/sample/page.mjs --artifact=<file.html> [--video=<the video's address on the page>] [--still=<the still's address>]
//
// Made from the Purify design kit as the first cut's page is (../page.mjs):
// the kit's own style block, whole, and its pieces. Dark first, the light a
// clean neutral, phone first. On claude.ai the video and the still are kept in
// the page's own asset store. RECORD.md beside this file is written from the
// same facts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MADE, ROOT, SLOW } from "../lib.mjs";
import { SCENES } from "../scenes.mjs";
import { BUILT, CUT, PIECES } from "./cut.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(MADE, file), "utf8"));

const video = readJson("sample/video.json");
const checks = readJson("sample/check.json");
const take = readJson("takes/sample/take.json");
const made = new Date().toISOString().slice(0, 10);
const go = take.marks.find((m) => m.name === "go").t;
const film = (t) => t - go + CUT.lead; // the film's own time for a moment of the take
const tap = take.marks.find((m) => m.kind === "tap");
const opened = take.marks.find((m) => m.name === "page").t;
const words = SCENES.find((s) => s.id === "today").title;
const pictures = [...new Set(take.picturesSeen.map((p) => p.split("/").pop().split("?")[0]))];
const passAll = checks.every((c) => c.pass);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const side = { above: "from above", below: "from below", start: "from the reading side", end: "from the far side", near: "settles in its place" };

/** The choices, each with what it is, why, and what it does for the viewer. */
const CHOICES = [
  ["The screen arrives bare", "For the first third of a second the screen is the app's own night ground with nothing on it.", "The build needs somewhere to happen. A viewer sees an empty phone fill, which is the one idea of the sample."],
  ["Every piece is the app's own element", "Nothing is drawn or copied. The top bar, the saint, the two buttons, the three cards and the tab bar are found in the export's own page and moved there, then left exactly where the app put them.", "It is honest: what settles on the screen is the screen a reader gets. The film is held to the app's guardrails because it is the app."],
  ["Pieces come from four sides", "The top bar from above, the cards and the tab bar from below, the picture and the name from opposite sides, the two buttons from opposite sides.", "This is what you asked for on the first cut: buttons moving onto the screen and cards fitting into place. Opposite sides make each pair close like a clasp, which reads even on a small feed."],
  ["The order follows reading", "Top to bottom, each piece a little after the one above it, the tab bar last.", "The eye is led down Today once, in the order a reader uses it, and the last thing to land closes the screen."],
  ["Small parts step in after their card", "The three buttons in the top bar, the seven days of the week and the five tabs each settle one after another.", "It gives the buttons their own moment without adding anything that is not in the app."],
  ["The house curve, and nothing bounces", "Every piece travels on the app's own curve, read from its stylesheet: quick to leave, long to settle. No spring, no overshoot, no spin.", "The build feels like the app's own transitions, so the change of screen that follows does not look like a different film."],
  ["One tap, then the app's own transition", `A finger taps ${CUT.next.name} and the app opens St Nicholas's page. From the tap on, every move is the app's: the button's press, the View Transition, the page's own opening.`, "It shows how each screen will hand over to the next in the whole film. His picture fills the screen, so the sample ends on its strongest frame."],
  ["The first cut's ground and words", `The night, the hill of your store pictures, one soft pool of light, and the store pictures' own line for Today: "${words}".`, "The sample reads as the same film as the first cut, so the only thing being judged is the motion."],
];

const template = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(template)?.[0] ?? (() => { throw new Error("the kit's template has no style block"); })();
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(template)?.[0] ?? "";
const row = (when, title, what, why) => `      <li class="v-scene"><span class="v-when">${esc(when)}</span><div class="v-what"><h3>${esc(title)}</h3><p>${esc(what)}</p>${why ? `<p class="v-why">${esc(why)}</p>` : ""}</div></li>`;

function page(videoSrc, stillSrc) {
  return `<title>Purify 1.9 Motion Sample</title>
<meta name="claude:viewport-fit-sides" content="cover">
${kitFonts}
${kitStyle}
<style>
/* The first cut's two pieces, built from the kit's tokens only: the video as a figure at a phone's own shape, and rows with hairlines between. */
.v-film { margin: var(--k-space-5) auto; max-width: 380px; }
.v-film video, .v-film img { display: block; width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 22px; border: 1px solid var(--k-line); background-color: var(--k-well); }
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
    <h1>The 1.9 film: a five second sample</h1>
    <p class="k-lede">Today, built on the screen by its own cards and buttons, then one tap into the next screen.</p>
    <p class="k-meta">Made ${made} from the 1.9 export. One version, one render.</p>
  </header>

  <section aria-label="The sample">
    <figure class="v-film">
      ${videoSrc ? `<video controls playsinline muted loop autoplay preload="auto"${stillSrc ? ` poster="${esc(stillSrc)}"` : ""} src="${esc(videoSrc)}" aria-label="The sample, ${video.seconds.toFixed(0)} seconds, silent"></video>` : `<div role="img" aria-label="The video is not on the page yet"></div>`}
      <figcaption>${video.seconds.toFixed(0)} seconds, ${video.size[0]} by ${video.size[1]}, no sound. It plays in a loop.</figcaption>
      ${videoSrc ? `<button class="k-button v-save" id="save-film" type="button" hidden>Save the video</button>
      <p class="v-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-note">
      <span class="k-eyebrow">What you are saying yes or no to</span>
      <p>The motion. This sample shows how a screen will be built and handed over in the whole film. It is not Today's final look: Today may change with the fifteen screens' redesign, and the whole film is made only once the 1.9 screens are final.</p>
    </div>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">Asked for: five seconds. ${video.frames} frames at 60 a second</span><span class="k-stat-value">${video.seconds.toFixed(1)}s</span></div>
      <div class="k-stat"><span class="k-stat-label">Size</span><span class="k-stat-change">H.264, ${video.size[0]} by ${video.size[1]}, like the first cut</span><span class="k-stat-value">${video.megabytes.toFixed(1)} MB</span></div>
      <div class="k-stat"><span class="k-stat-label">Sound</span><span class="k-stat-change">Silent, like the first cut</span><span class="k-stat-value">None</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-what">
    <h2 id="s-what">What it is</h2>
    <p>You said the first cut looked good but you wanted it more animated: buttons moving onto the screen, the cards moving on the app and fitting into place, and a transition to each screen. This is that, for one screen.</p>
    <p>Today is the 1.9 app itself, opened as a new reader with no Plus on Sunday 6 December 2026, in Dark. Each of its ${PIECES.length} groups of pieces is held just outside the screen and let go in turn. The last one rests ${film(go + BUILT).toFixed(1)} seconds in. At ${film(tap.t).toFixed(1)} seconds a finger taps ${esc(CUT.next.name)}, and the app's own transition opens St Nicholas's page.</p>
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Each choice, and why</h2>
    <p>What it is, the reason, and what it does for the viewer.</p>
    <ol class="v-scenes">
${CHOICES.map(([title, what, why], n) => row(String(n + 1), title, what, why)).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-still">
    <h2 id="s-still">One still</h2>
    <figure class="v-film">
      ${stillSrc ? `<img src="${esc(stillSrc)}" alt="Today on the feast of St Nicholas, whole, under the words ${esc(words)}">` : `<div role="img" aria-label="The still is not on the page yet"></div>`}
      <figcaption>${(168 / 60).toFixed(1)} seconds in: every piece at rest where the app put it, a moment before the tap.</figcaption>
    </figure>
  </section>

  <section class="k-section" aria-labelledby="s-order">
    <h2 id="s-order">The pieces, in the order they arrive</h2>
    <p>Seconds into the film, the piece, how it comes, and why.</p>
    <ol class="v-scenes">
${PIECES.map((p) => row(film(go + p.at).toFixed(2), cap(p.name), `${cap(side[p.from])}, over ${p.for} seconds${p.count ? `, ${p.count} of them one after another` : ""}.`, p.why)).join("\n")}
${row(film(tap.t).toFixed(2), `The tap: ${CUT.next.name}`, "A soft round where the finger is. The button's own press answers it.", "Without it the button seems to press itself.")}
${row(film(opened).toFixed(2), "St Nicholas's page", "The app's own View Transition and the page's own opening. The picture moves in a little as it settles.", "The whole film will change screens this way, by a real tap and the app's own motion.")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-held">
    <h2 id="s-held">Held to the rules</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">checkMock on the film's page</span><span class="k-stat-change">${checks.length} moments, five palettes: contrast, tokens, rays, stripes, sparkle, dashes, mirroring</span><span class="k-stat-value">${passAll ? "Pass" : "No"}</span></div>
      <div class="k-stat"><span class="k-stat-label">Heritage pictures in view</span><span class="k-stat-change">Read all through the take, by file name</span><span class="k-stat-value">0</span></div>
      <div class="k-stat"><span class="k-stat-label">Campaigns named in view</span><span class="k-stat-change">The take fails if one is</span><span class="k-stat-value">0</span></div>
      <div class="k-stat"><span class="k-stat-label">Interface drawn by hand</span><span class="k-stat-change">Every piece is the export's own element. Today read the same after the build as before it</span><span class="k-stat-value">0</span></div>
    </div>
    <div class="k-note">
      <span class="k-eyebrow">Named before you look</span>
      <p>The Plus button in Today's top bar is the app's own, as a reader with no Plus sees it. No Plus feature is shown in use and none is promised. The order and the travel of the pieces are the film's. The pieces, where they rest, and everything after the tap are the app's.</p>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Source: docs/plans/v1.9/video/sample/</p>
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
      await downloads.save({ filename: "purify-1.9-sample.mp4", data: file });
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
  const html = page(arg("video") ?? "", arg("still") ?? "");
  if (/[–—]/.test(html.replace(/<style>[\s\S]*?<\/style>/g, ""))) throw new Error("a dash in place of words on the page");
  fs.writeFileSync(out, html);
  console.log(`${out}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

// ── The record ───────────────────────────────────────────────────────────

fs.writeFileSync(path.join(HERE, "RECORD.md"), `# The 1.9 film's five second sample: the record

Written by \`page.mjs\` on ${made} from what was made and measured. Do not edit this file: make the sample again and write it out again.

| | |
|---|---|
| File | \`${video.file}\` (out of git) |
| Length | ${video.seconds.toFixed(2)} seconds, ${video.frames} frames |
| Size | ${video.megabytes.toFixed(2)} MB (${video.bytes} bytes) |
| Picture | ${video.size[0]} by ${video.size[1]}, ${video.codec}, ${video.pixels}, ${video.fps} frames a second |
| Sound | ${video.sound} |
| The app | the native export of \`${video.export}\`, cut by \`scripts/gate/export.mjs\` as the store build with Plus locked |
| The day in the app | Sunday 6 December 2026, 9:30 in New York |
| The reader | new, no Plus (\`purify:plusFeatures\` read \`${take.reader.plus}\`), Dark |
| Filmed | ${take.frames.length} pictures of 1030 by 2115 for a screen of 412 by 846, the app's clock ${SLOW} times slower and played back ${SLOW} times faster |
| Words on screen | ${words} (the store pictures' first line, as the first cut has it) |
| Pictures that were in view | ${pictures.join(", ")} (none on the heritage list) |
| Renders | one |

## The film, by its own clock

| At | What happens |
|---|---|
| 0.00 | the bare screen rises on the first cut's ground; the words rise line by line |
${PIECES.map((p) => `| ${film(go + p.at).toFixed(2)} | ${p.name}: ${side[p.from]}, ${p.for}s on the house curve${p.count ? `, ${p.count} in turn` : ""} |`).join("\n")}
| ${film(go + BUILT).toFixed(2)} | the last piece is at rest; Today reads word for word as it did before its pieces were held |
| ${film(tap.t).toFixed(2)} | a finger taps ${CUT.next.name} |
| ${film(opened).toFixed(2)} | the app has opened \`${CUT.next.opens}\`, by its own View Transition |
| ${video.seconds.toFixed(2)} | the end, on St Nicholas's page at rest |

## checkMock

On the page the film is drawn on, on all five palettes.

| Moment | At | Result |
|---|---|---|
${checks.map((c) => `| ${c.moment} | ${c.at}s | ${c.pass ? "pass" : `NO: ${c.failures.join("; ")}`}${c.allowed?.length ? ` (${c.allowed.length} allowed by name: the finger's round)` : ""} |`).join("\n")}
`);
console.log("RECORD.md written");
