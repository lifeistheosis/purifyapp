#!/usr/bin/env node
// The edit's page: the silent film with Save, the effects, every cut with its hit and its words, and what was measured.
//
//   node docs/plans/v1.9/video/release/blackpill-film-page.mjs <file.html> --video=<address> --still=<address> [--track=<address>]
//
// --track is the copy with his track, for him alone to judge the timing (his word, 2026-11-22: "with the ahdio").
// The song is not cleared: that copy is never the one to post, and the page says so beside it.
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
const [video, still, track] = [arg("video"), arg("still"), arg("track")];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const made = JSON.parse(fs.readFileSync(path.join(MADE, "release", "blackpill-film", "video.json"), "utf8"));
const secs = (x) => Number(x).toFixed(2);

const EFFECTS = [
  ["Clean cuts", "A cut is a cut and nothing else: no bright frame, no blur, no wipe. Each one sits on a measured hit, and that is the only thing the picture does with the music."],
  ["Nothing answers the beat", "No shake, no punch in, no colour split. Your word on the first render: the effects that matched the beat read as vibe coded. They are all gone."],
  ["Moving grain, dust and scratches", "New on every frame, like old film stock. The grit is in the film itself, steady, and does not perform."],
  ["Crushed blacks", "Hard black and white, so faces come out of pure dark."],
  ["One slow move in each shot", "The camera pushes in slowly and evenly from a shot's first frame to its last."],
  ["Projector flicker", "The brightness wavers a little, all through."],
];
const NOTES = [
  ["Each quote holds for its whole shot", "Your word on the second render: make the text appear longer. The whole quote and its source are there from the cut into its shot until the cut out of it, sharp and still. Between three and four seconds each."],
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
    <p class="label">Purify · the edit · cut to "Forever", slowed · third render</p>
    <h1>An edit, not an ad</h1>
    <p class="quiet read">${SECONDS} seconds in ${SHOTS.length} shots, every cut and every line on a hit measured from your track, with clean cuts and steady grit. No screen of the app. Say yes or no, or tell me what to change.</p>
  </header>

${track ? `  <section class="film">
    <h2>With your track</h2>
    <video controls playsinline preload="metadata"${still ? ` poster="${esc(still)}"` : ""} src="${esc(track)}" aria-label="The edit with the track, ${Math.round(SECONDS)} seconds"></video>
    <button class="save" data-save="${esc(track)}" data-name="purify-edit-with-track.mp4" type="button" hidden>Save this copy</button>
    <p>For your eyes only, to judge the timing. The song is not cleared, so this is not the copy to post.</p>
  </section>

` : ""}  <section class="film">
    <h2>Silent, for posting</h2>
    <video controls playsinline muted preload="metadata"${still ? ` poster="${esc(still)}"` : ""} src="${esc(video)}" aria-label="The edit, silent, ${Math.round(SECONDS)} seconds"></video>
    <button class="save" data-save="${esc(video)}" data-name="purify-edit-forever.mp4" type="button" hidden>Save the video</button>
    <p>${made.size.join(" by ")}, ${made.fps} frames a second, ${made.megabytes} MB, no sound stream. Play it beside the track to judge the timing: start both at the same moment.</p>
  </section>

  <section>
    <h2>The look, after your note</h2>
    <ul class="pairs">${EFFECTS.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
    <p class="quiet read">Also left out: glow, beams of light, lens flares, VHS lines and glitch blocks.</p>
  </section>

  <section>
    <h2>The cut</h2>
    <ol class="cut">${SHOTS.map((s) => `<li><span class="at">${secs(s.at[0])}</span><h3>${esc(s.name)}</h3>${s.words ? `<p class="said">${esc(s.words.lines.join(" "))}${s.words.cite ? ` (${esc(s.words.cite)})` : ""}</p>` : ""}<p>${s.words ? `The whole quote is on screen for ${(s.at[1] - s.at[0]).toFixed(1)} seconds. ` : ""}${s.pic ? "" : s.mark ? "Purify's mark alone, still, on the loudest hit." : "Black, for the breath before the last swell."}</p></li>`).join("")}</ol>
  </section>

  <section>
    <h2>What holds it together</h2>
    <ul class="pairs">${NOTES.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
  </section>
</main>
<script>
(async () => {
  const downloads = await window.claude?.use?.("downloads");
  if (!downloads) return;
  for (const button of document.querySelectorAll("button[data-save]")) {
    button.hidden = false;
    button.addEventListener("click", async () => {
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Saving";
      try {
        const file = await (await fetch(button.dataset.save)).blob();
        await downloads.save({ filename: button.dataset.name, data: file });
        button.textContent = "Saved";
      } catch {
        button.textContent = "Not saved. Tap to try again";
      }
      button.disabled = false;
      setTimeout(() => (button.textContent = label), 4000);
    });
  }
})();
</script>
`;
if (/[–—]/.test(html)) throw new Error("a dash in place of words");
fs.writeFileSync(out, html);
console.log(out, `${(html.length / 1024).toFixed(0)} KB`);
