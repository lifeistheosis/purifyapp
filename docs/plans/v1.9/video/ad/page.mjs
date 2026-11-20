#!/usr/bin/env node
// The page he sees stage 1 of the ad on, and the record of what was made.
//
//   node docs/plans/v1.9/video/ad/page.mjs --artifact=<file.html> [--video=<the video's address on the page>] [--still=<the still's address>]
//
// Made as the sample's page is (../sample/page.mjs): the Purify design kit's
// own style block, whole, and its pieces. Dark first, the light a clean
// neutral, phone first. On claude.ai the video and the still are kept in the
// page's own asset store. RECORD.md beside this file is written from the same
// facts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MADE, ROOT, SLOW } from "../lib.mjs";
import { SCENES as FIRST_CUT } from "../scenes.mjs";
import { MOVE, SCENES, SHOTS } from "./cut.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(MADE, file), "utf8"));

const video = readJson("ad/video.json");
const checks = readJson("ad/check.json");
const takes = SCENES.map((s) => readJson(`takes/ad-${s.id}/take.json`));
const C = video.clock;
const made = new Date().toISOString().slice(0, 10);
const words = SCENES.map((s) => FIRST_CUT.find((x) => x.id === s.words));
const pictures = [...new Set(takes.flatMap((t) => t.picturesSeen).map((p) => p.split("/").pop().split("?")[0]))];
const passAll = checks.every((c) => c.pass);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const side = { above: "from above", below: "from below", start: "from the reading side", end: "from the far side", near: "settles in its place" };
const starts = [C.go1, C.go2];
const s2 = (n) => n.toFixed(2);

/** The choices, each with what it is, why, and what it does for the viewer. */
const CHOICES = [
  ["It is cut, like an edit", `You said it should be like an edit and not just motion graphics, and chose cuts and close-ups. The film is now ${video.cuts.length} shots with hard cuts between them: wide on the phone, close on St Nicholas, close on Begin, wide for the turn, close on the journal's name, close on the readings and their pens, wide to end.`, "A cut changes what the viewer looks at in one frame, which is what makes a film feel made by a hand. Each cut lands while a piece is still moving, so the cut and the motion are one beat."],
  ["Close shots show the pieces large", "A close shot is the same phone seen up to one and a half times nearer, never nearer than it was filmed, so nothing is soft. Every shot moves in a little, slowly, and never out.", "On a phone's feed the wide shot is small. The close shots are where the saint, the button and the pens can be read."],
  ["The turn is seen whole", "The one wide shot in the middle holds Today whole, the screen emptying and the phone's turn, with no cut inside it.", "The moving phone is the thing you chose, so it is never cut across."],
  ["One phone, and it moves once", `Between the scenes the phone travels from standing front to standing turned to one side. It sets off ${s2(C.moveFrom)} seconds in and is at rest ${s2(C.moveTo)} seconds in.`, "This is your choice, the sample's motion with a moving phone. It is one phone all through, so the eye follows a thing and not a cut."],
  ["The two stands are your store pictures' own", "Front, upright and whole, is how the store pictures stand Today. Turned to one side is how they stand the journal, turn for turn: 25 degrees, and never more.", "Nothing new is invented for the phone. The ad, the store row and the first cut read as one release."],
  ["The house curve, entered gently", "The move is on the app's own curve. Because the phone sets off from rest, the curve is entered softly, as the first cut moves its picture. It goes one way, never past where it rests, and never back. The script refuses to run otherwise.", "It settles the way everything in the app settles. Nothing bounces, overshoots or spins."],
  ["The screen empties as the phone leaves", "Scene 1's pieces go out the way they came, last in first out, on the house curve run backward. The phone is already turning.", "The viewer sees why the phone moves: one screen is done and the next is coming. It also keeps the pieces moving, which is what you asked for on the first cut."],
  ["The screen fills as the phone lands", "The film changes from one take to the other when both screens are bare, joined over seven frames. Scene 2's pieces then arrive on the turned phone.", "There is no cut to see. The journal is built in front of the viewer exactly as Today was."],
  ["Every piece is the app's own element", `The app is the export of main ${video.export}, which is what the stores serve. Each piece is found in its page and moved there, then left where the app put it. Each screen read word for word after the build as it did before.`, "It is honest: what settles on the phone is what a reader gets."],
  ["Today's pieces are new", "Today on main is one card for the day now, with the Nativity Fast's night at its head. So the card rises whole and its parts slide in inside it.", "The sample's list no longer fits the app, and the film must show the app as it is."],
  ["The words change with the phone", `"${words[0].title}" lifts and clears as the phone sets off. "${words[1].title}" rises line by line, with "${words[1].sub}" under it.`, "The first is your store pictures' line for Today. The second is the drop's own name for the journal and its last sentence. None is written for the ad."],
  ["The title is in the app's plain sans", "The first render set the title in the display serif of your store pictures. You said you did not like it and asked for the minimalist one, so it is now the app's own sans, the face of its buttons and labels.", "It reads cleaner at a glance on a feed, and it is still the app's own face, so nothing foreign is brought in."],
  ["The ground moves", "The night, the hill of your store pictures and one soft pool of light, as before, but never still now. The picture moves slowly in toward the hill all through; the far lines rise a little faster than the near ones; and as the phone turns, the ground slides the other way, the far lines less than the near hill.", "You asked for it to be more cinematic and less like a still graphic. A ground that answers the phone gives the picture depth, as if a camera moved round it. The light stays a soft pool and never becomes beams."],
];

const template = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(template)?.[0] ?? (() => { throw new Error("the kit's template has no style block"); })();
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(template)?.[0] ?? "";
const row = (when, title, what, why) => `      <li class="v-scene"><span class="v-when">${esc(when)}</span><div class="v-what"><h3>${esc(title)}</h3><p>${esc(what)}</p>${why ? `<p class="v-why">${esc(why)}</p>` : ""}</div></li>`;
const pieceRows = (scene, n) => scene.pieces.map((p) => row(s2(starts[n] + p.at), cap(p.name), `${cap(side[p.from])}, over ${p.for} seconds${p.count ? `, ${p.count} of them one after another` : ""}.`, p.why)).join("\n");

function page(videoSrc, stillSrc) {
  return `<title>Purify 1.9 Ad Test</title>
<meta name="claude:viewport-fit-sides" content="cover">
${kitFonts}
${kitStyle}
<style>
/* The sample's two pieces, built from the kit's tokens only: the video as a figure at a phone's own shape, and rows with hairlines between. */
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
    <h1>The 1.9 ad: the first test</h1>
    <p class="k-lede">Today and the journal, each built by its own pieces, on one phone that moves from one to the other, cut into ${video.cuts.length} shots.</p>
    <p class="k-meta">Made ${made} from what the stores serve. One version, one render.</p>
  </header>

  <section aria-label="The test">
    <figure class="v-film">
      ${videoSrc ? `<video controls playsinline muted loop autoplay preload="auto"${stillSrc ? ` poster="${esc(stillSrc)}"` : ""} src="${esc(videoSrc)}" aria-label="The test, ${video.seconds.toFixed(0)} seconds, silent"></video>` : `<div role="img" aria-label="The video is not on the page yet"></div>`}
      <figcaption>${video.seconds.toFixed(0)} seconds, ${video.size[0]} by ${video.size[1]}, no sound. It plays in a loop.</figcaption>
      ${videoSrc ? `<button class="k-button v-save" id="save-film" type="button" hidden>Save the video</button>
      <p class="v-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-note">
      <span class="k-eyebrow">What you are saying yes or no to</span>
      <p>The look of the whole ad: the moving phone, the cuts and close-ups, the moving ground and the plain title. If it is a yes, the other six scenes are made the same way. If it is a no, say which of the four to change and only that changes.</p>
    </div>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">Asked for: about seven seconds. ${video.frames} frames at 60 a second</span><span class="k-stat-value">${video.seconds.toFixed(2)}s</span></div>
      <div class="k-stat"><span class="k-stat-label">Size</span><span class="k-stat-change">H.264, ${video.size[0]} by ${video.size[1]}</span><span class="k-stat-value">${video.megabytes.toFixed(1)} MB</span></div>
      <div class="k-stat"><span class="k-stat-label">Sound</span><span class="k-stat-change">Silent, as you chose</span><span class="k-stat-value">None</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-why">
    <h2 id="s-why">Each choice, and why</h2>
    <p>What it is, the reason, and what it does for the viewer.</p>
    <ol class="v-scenes">
${CHOICES.map(([title, what, why], n) => row(String(n + 1), title, what, why)).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-shots">
    <h2 id="s-shots">The shots</h2>
    <p>Seconds into the film where each shot begins, what it shows, and why.</p>
    <ol class="v-scenes">
${video.cuts.map((c, n) => row(s2(c.at), cap(c.name), SHOTS[n].look === "wide" ? "The whole phone." : `Close: ${SHOTS[n].close[0]} times nearer, moving in to ${SHOTS[n].close[1]}.`, SHOTS[n].why)).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-still">
    <h2 id="s-still">One still</h2>
    <figure class="v-film">
      ${stillSrc ? `<img src="${esc(stillSrc)}" alt="A close shot of the journal's day: the Epistle and the Gospel, each with a pen, on the phone turned to one side, under the words ${esc(words[1].title)}">` : `<div role="img" aria-label="The still is not on the page yet"></div>`}
      <figcaption>5.30 seconds in: the close shot of the day's readings and their pens.</figcaption>
    </figure>
  </section>

  <section class="k-section" aria-labelledby="s-order">
    <h2 id="s-order">The film, in order</h2>
    <p>Seconds into the film, the piece, how it comes, and why.</p>
    <ol class="v-scenes">
${pieceRows(SCENES[0], 0)}
${row(s2(C.leave), "Today empties", `Its pieces leave the way they came, over ${(C.bare - C.leave).toFixed(2)} seconds.`, "The screen is cleared for the next scene in the same motion that built it.")}
${row(s2(C.moveFrom), "The phone moves", `Front to side, over ${MOVE.for} seconds, on the house curve.`, "The one new thing.")}
${row(s2(C.change), "The screen changes", "Both screens are bare; the film passes from one take to the other.", "No cut is seen.")}
${pieceRows(SCENES[1], 1)}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-held">
    <h2 id="s-held">Held to the rules</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">checkMock on the film's page</span><span class="k-stat-change">${checks.length} moments, five palettes: contrast, tokens, rays, stripes, sparkle, dashes, mirroring</span><span class="k-stat-value">${passAll ? "Pass" : "No"}</span></div>
      <div class="k-stat"><span class="k-stat-label">Heritage pictures in view</span><span class="k-stat-change">Read all through both takes, by file name</span><span class="k-stat-value">0</span></div>
      <div class="k-stat"><span class="k-stat-label">Campaigns named in view</span><span class="k-stat-change">A take fails if one is</span><span class="k-stat-value">0</span></div>
      <div class="k-stat"><span class="k-stat-label">Interface drawn by hand</span><span class="k-stat-change">Every piece is the export's own element. The phone is a plain slab with no hardware drawn</span><span class="k-stat-value">0</span></div>
    </div>
    <div class="k-note">
      <span class="k-eyebrow">Named before you look</span>
      <p>The change of screen here is the film's: the screen empties and fills. In the sample it was a tap and the app's own transition. The Plus button in Today's top bar is the app's own, as a reader with no Plus sees it; nothing of Plus is shown in use. On the journal the app's tab bar marks Bible, not You: that is the app, filmed as it is, and it is noted for you.</p>
    </div>
  </section>

  <footer class="k-foot">
    <p>Edgar, the Purify Team</p>
    <p class="k-meta">Source: docs/plans/v1.9/video/ad/</p>
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
      await downloads.save({ filename: "purify-1.9-ad-test.mp4", data: file });
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

fs.writeFileSync(path.join(HERE, "RECORD.md"), `# The 1.9 ad, stage 1: the record

Written by \`page.mjs\` on ${made} from what was made and measured. Do not edit this file: make the test again and write it out again.

| | |
|---|---|
| File | \`${video.file}\` (out of git) |
| Length | ${video.seconds.toFixed(2)} seconds, ${video.frames} frames |
| Size | ${video.megabytes} MB (${video.bytes} bytes) |
| Picture | ${video.size[0]} by ${video.size[1]}, ${video.codec}, ${video.pixels}, ${video.fps} frames a second |
| Sound | ${video.sound} |
| The app | the native export of main \`${video.export}\`, cut in a worktree by \`scripts/gate/export.mjs --cwd\` as the store build with Plus locked |
| The day in the app | Sunday 6 December 2026, 9:30 in New York |
| The reader | new, no Plus (\`purify:plusFeatures\` read \`${takes[0].reader.plus}\`), Dark |
| Filmed | ${takes.map((t, n) => `${SCENES[n].id}: ${t.frames.length} pictures over ${t.seconds}s`).join("; ")}; the app's clock ${SLOW} times slower and played back ${SLOW} times faster |
| Words on screen | ${words.map((w) => `${w.title}${w.sub ? ` / ${w.sub}` : ""} (${w.from_words})`).join("; ")} |
| Pictures that were in view | ${pictures.join(", ") || "none"} (none on the heritage list) |
| Word for word | each screen read after its build as it did before its pieces were held; a take fails otherwise |
| The phone | front (upright) to the store pictures' side stand (rotateY 25, rotateX 7, rotateZ 1.2 degrees), one move of ${MOVE.for}s on the house curve; the script refuses a move that comes back, passes its rest or turns more |
| The title | the app's sans (DM Sans, 600), by his word after the first render, which set it in the display serif |
| The ground | moves all through: a slow move in of 11 percent, the far lines lifting faster than the near, and a slide of up to 120 pixels against the phone's turn; mirrored with the phone in a right-to-left page |
| The edit | ${video.cuts.length} shots, hard cuts, by his word and his choice of "Cuts and close-ups": ${video.cuts.map((c) => `${s2(c.at)} ${c.name}`).join("; ")}. No shot is nearer than the takes were filmed, and none moves out |
| Renders | four: the first, the second with the sans title, the third with the moving ground, the fourth cut into shots. Only the fourth is on the page; each earlier one was replaced at his word |

## The film, by its own clock

| At | What happens |
|---|---|
| 0.00 | the bare phone rises on the first cut's ground, standing front; scene 1's words rise |
${SCENES[0].pieces.map((p) => `| ${s2(starts[0] + p.at)} | ${p.name}: ${side[p.from]}, ${p.for}s${p.count ? `, ${p.count} in turn` : ""} |`).join("\n")}
| ${s2(C.built1)} | Today is whole |
| ${s2(C.leave)} | Today's pieces begin to leave, last in first out; scene 1's words clear |
| ${s2(C.moveFrom)} | the phone sets off |
| ${s2(C.bare)} | the screen is bare |
| ${s2(C.change)} | the film passes from scene 1's take to scene 2's, both bare |
${SCENES[1].pieces.map((p) => `| ${s2(starts[1] + p.at)} | ${p.name}: ${side[p.from]}, ${p.for}s${p.count ? `, ${p.count} in turn` : ""} |`).join("\n")}
| ${s2(C.moveTo)} | the phone is at rest on the side stand |
| ${s2(C.built2)} | the journal is whole |
| ${s2(C.end)} | the end |

## checkMock

On the page the film is drawn on, on all five palettes. \`node scripts/mock-check.mjs --self-test\` passed first.

| Moment | At | Result |
|---|---|---|
${checks.map((c) => `| ${c.moment} | ${s2(c.at)}s | ${c.pass ? "pass" : `NO: ${c.failures.join("; ")}`}${c.allowed?.length ? ` (${c.allowed.length} allowed by name)` : ""} |`).join("\n")}

## The stills sheet

\`node docs/plans/v1.9/video/ad/compose.mjs --sheet\` (twelve moments), \`--sheet 12 --span 3.0-4.9\` (the move) and \`--sheet 12 --span 0.8-6.3\` (across every cut). Each was looked at before its render. They are working files in \`.promo/v1.9-video/ad/stills/\`.
`);
console.log("RECORD.md written");
