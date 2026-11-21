#!/usr/bin/env node
// The edit's page: the silent film with Save, the effects, every cut with its hit and its words, and what was measured.
//
//   node docs/plans/v1.9/video/release/blackpill-film-page.mjs <file.html> --video=<address> --still=<address>
//
// The video and its still live in the page's own asset store (capabilities `assets` and `downloads`), never in the
// repository. Phone first, the dark ground leading, no parchment.

import fs from "node:fs";
import path from "node:path";
import { MADE } from "../lib.mjs";
import { SECONDS, SHOTS } from "./blackpill-film.mjs";

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--")) ?? (() => { throw new Error("say where the page goes"); })();
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";
const [video, still] = [arg("video"), arg("still")];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const made = JSON.parse(fs.readFileSync(path.join(MADE, "release", "blackpill-film", "video.json"), "utf8"));
const secs = (x) => Number(x).toFixed(2);

const EFFECTS = [
  ["Moving grain, dust and scratches", "New on every frame, like old film stock. This is the gritty filter, and it sits on everything but the end card's mark."],
  ["Crushed blacks", "Hard black and white, so faces come out of pure dark."],
  ["A colour split on the hits", "A red and blue edge for a split second when the bass lands, then clean."],
  ["Shake and punch in", "On every measured hit, small and sharp, settled a fifth of a second later. Stronger in the fast bars."],
  ["One bright frame on a cut", "Never more than three in a second."],
  ["A short blur on the fast moves", "In the run of faces and the Resurrection."],
  ["Projector flicker", "The brightness wavers a little, all through."],
];
const NOTES = [
  ["The words never shake", "Every effect is on the picture. A line lands a little large and is its own size a tenth of a second later, sharp and steady, so each quote reads in one glance."],
  ["Every line is someone else's", "The hook is the one written line. The rest is Scripture, St Cyprian and the Creed, word for word from the app's own text. The script refuses to run if a word differs."],
  ["No one is named or attacked", "No line names any religion or person."],
  ["A priest first, by your own rule", "This is doctrine. Your editorial rule sends doctrinal framing to a priest before it goes out. Your call when."],
  ["The sound is added in the app", "The song is not cleared, so this file has no sound and is cut to its hits. Add the sound inside TikTok or Instagram on the separate edits account, starting at the track's first second. Never in a paid ad."],
  ["Timed by measure, not by ear", "The hits were measured from your clip by script. You are the judge of whether each cut sits on the track."],
];

const html = `<title>Purify Blackpill Edit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<style>
  /* One column at phone width; the film first, then its reasons. Dark leads; the light ground is a clean neutral. */
  :root {
    color-scheme: dark;
    --ground: #0b0c10; --raised: #14161c; --line: #262a33; --ink: #f2f3f5; --quiet: #a9aeb9; --held: #f2f3f5; --held-ink: #0b0c10; --frame: #06070a;
    --sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; } }
  :root[data-theme="light"] { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; }
  body { background: var(--ground); color: var(--ink); font-family: var(--sans); font-size: 1rem; line-height: 1.55; }
  .page { max-width: 60rem; margin-inline: auto; padding-block: 2.5rem 4rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 3.25rem; }
  h1, h2, h3, p, ol, ul { margin: 0; padding: 0; }
  h1 { font-size: clamp(2.6rem, 11vw, 4.6rem); font-weight: 700; line-height: 0.98; letter-spacing: -0.04em; text-wrap: balance; }
  h2 { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance; }
  h3 { font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; }
  .label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--quiet); }
  .quiet { color: var(--quiet); }
  .read { max-width: 40rem; }
  header, section { display: grid; gap: 1.25rem; }
  .film { display: grid; gap: 0.9rem; justify-items: start; }
  .film video { display: block; width: 100%; max-width: 22rem; aspect-ratio: 9 / 16; border-radius: 12px; border: 1px solid var(--line); background: var(--frame); }
  .film p { color: var(--quiet); font-size: 0.97rem; max-width: 26rem; }
  button.save { min-height: 44px; padding: 0 1.25rem; border-radius: 10px; border: 1px solid var(--held); background: var(--held); color: var(--held-ink); font: 600 1rem var(--sans); cursor: pointer; }
  button.save:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  button.save[disabled] { opacity: 0.6; cursor: default; }
  .pairs { list-style: none; display: grid; gap: 1.5rem 2.5rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); }
  .pairs li { display: grid; gap: 0.35rem; align-content: start; }
  .pairs p { color: var(--quiet); }
  .cut { list-style: none; display: grid; max-width: 44rem; }
  .cut li { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr); gap: 0.2rem 1rem; padding-block: 0.9rem; border-bottom: 1px solid var(--line); }
  .cut .at { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--quiet); }
  .cut p { grid-column: 2; color: var(--quiet); font-size: 0.97rem; }
  .cut p.said { color: var(--ink); }
</style>
<main class="page">
  <header>
    <p class="label">Purify · the edit · cut to "Forever", slowed</p>
    <h1>An edit, not an ad</h1>
    <p class="quiet read">${SECONDS} seconds in ${SHOTS.length} shots, every cut and every line on a hit measured from your track, with the seven gritty effects you said yes to. No screen of the app. Say yes or no, or tell me what to change.</p>
  </header>

  <section class="film">
    <video controls playsinline muted preload="metadata"${still ? ` poster="${esc(still)}"` : ""} src="${esc(video)}" aria-label="The edit, silent, ${Math.round(SECONDS)} seconds"></video>
    <button class="save" id="save-film" type="button" hidden>Save the video</button>
    <p>${made.size.join(" by ")}, ${made.fps} frames a second, ${made.megabytes} MB, no sound stream. Play it beside the track to judge the timing: start both at the same moment.</p>
  </section>

  <section>
    <h2>The seven effects</h2>
    <ul class="pairs">${EFFECTS.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
    <p class="quiet read">Left out on purpose: glow, beams of light, lens flares, VHS lines and glitch blocks.</p>
  </section>

  <section>
    <h2>The cut</h2>
    <ol class="cut">${SHOTS.map((s) => `<li><span class="at">${secs(s.at[0])}</span><h3>${esc(s.name)}</h3>${s.words ? `<p class="said">${esc(s.words.lines.join(" "))}${s.words.cite ? ` (${esc(s.words.cite)})` : ""}</p>` : ""}<p>${s.words ? `Lines land on ${[...new Set(s.words.at)].map(secs).join(", ")}. ` : ""}${s.hits?.length ? `The picture answers ${s.hits.map(secs).join(", ")}.` : s.mark ? "Purify's mark alone, still, on the loudest hit." : "Black, for the breath before the last swell."}</p></li>`).join("")}</ol>
  </section>

  <section>
    <h2>What holds it together</h2>
    <ul class="pairs">${NOTES.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
  </section>
</main>
<script>
(async () => {
  const button = document.getElementById("save-film");
  const downloads = await window.claude?.use?.("downloads");
  if (!button || !downloads) return;
  button.hidden = false;
  button.addEventListener("click", async () => {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Saving";
    try {
      const file = await (await fetch(${JSON.stringify(video)})).blob();
      await downloads.save({ filename: "purify-edit-forever.mp4", data: file });
      button.textContent = "Saved";
    } catch {
      button.textContent = "Not saved. Tap to try again";
    }
    button.disabled = false;
    setTimeout(() => (button.textContent = label), 4000);
  });
})();
</script>
`;
if (/[–—]/.test(html)) throw new Error("a dash in place of words");
fs.writeFileSync(out, html);
console.log(out, `${(html.length / 1024).toFixed(0)} KB`);
