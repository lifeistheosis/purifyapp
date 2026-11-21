#!/usr/bin/env node
// The release film's page: the preview with the track (for him only), the silent file to post, the cut against the
// track's beats with the reason for each shot, and what was measured.
//
//   node docs/plans/v1.9/video/release/film-page.mjs <file.html> --preview=<address> --silent=<address> --still=<address>
//
// The videos live in the page's own asset store (capabilities `assets` and `downloads`), never in the repository.

import fs from "node:fs";
import path from "node:path";
import { MADE } from "../lib.mjs";
import { SHOTS, TOTAL, WORDS } from "./film.mjs";

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--")) ?? (() => { throw new Error("say where the page goes"); })();
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const [preview, silent, still] = [arg("preview"), arg("silent"), arg("still")];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const video = JSON.parse(fs.readFileSync(path.join(MADE, "release", "film", "video.json"), "utf8"));
const checks = JSON.parse(fs.readFileSync(path.join(MADE, "release", "film", "check.json"), "utf8"));
const secs = (x) => `${Number(x).toFixed(2)}s`;

const html = `<title>Purify 1.9 Release Film</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<style>
  /* One column at phone width; the film first, then its reasons. Dark leads; the light ground is a clean neutral. */
  :root {
    color-scheme: dark;
    --ground: #0b0c10; --raised: #14161c; --line: #262a33; --ink: #f2f3f5; --quiet: #a9aeb9; --held: #f2f3f5; --held-ink: #0b0c10;
    --sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; } }
  :root[data-theme="light"] { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; }
  body { background: var(--ground); color: var(--ink); font-family: var(--sans); font-size: 1rem; line-height: 1.55; }
  .page { max-width: 60rem; margin-inline: auto; padding-block: 2.5rem 4rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 3.25rem; }
  h1, h2, h3, p, ol, ul, dl, dd, figure { margin: 0; padding: 0; }
  h1 { font-size: clamp(2.6rem, 11vw, 4.6rem); font-weight: 700; line-height: 0.98; letter-spacing: -0.04em; text-wrap: balance; }
  h2 { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance; }
  h3 { font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; }
  .label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--quiet); }
  .quiet { color: var(--quiet); }
  .read { max-width: 40rem; }
  header, section { display: grid; gap: 1.25rem; }
  .films { display: grid; gap: 2.5rem 2rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); align-items: start; }
  .film { display: grid; gap: 0.8rem; min-width: 0; }
  .film video { display: block; width: 100%; max-width: 22rem; aspect-ratio: 9 / 16; border-radius: 12px; border: 1px solid var(--line); background: #06070a; }
  .film p { color: var(--quiet); font-size: 0.97rem; max-width: 22rem; }
  button.save { justify-self: start; min-height: 44px; padding: 0 1.25rem; border-radius: 10px; border: 1px solid var(--held); background: var(--held); color: var(--held-ink); font: 600 1rem var(--sans); cursor: pointer; }
  button.save:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  button.save[disabled] { opacity: 0.6; cursor: default; }
  .rhythm { display: flex; gap: 2px; height: 3.25rem; }
  .rhythm span { min-width: 0; background: var(--raised); border: 1px solid var(--line); border-radius: 3px; }
  .rhythm span.card { background: var(--held); border-color: var(--held); }
  .ends { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; color: var(--quiet); font-variant-numeric: tabular-nums; }
  .cut { list-style: none; display: grid; gap: 0; max-width: 44rem; }
  .cut li { display: grid; grid-template-columns: 4.2rem minmax(0, 1fr); gap: 0.2rem 1rem; padding-block: 0.9rem; border-bottom: 1px solid var(--line); }
  .cut .at { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--quiet); }
  .cut p { grid-column: 2; color: var(--quiet); font-size: 0.97rem; }
  dl { display: grid; gap: 0.9rem; max-width: 40rem; }
  dl div { display: grid; gap: 0.1rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--line); }
  dt { font-weight: 600; font-size: 1.08rem; }
  dd { color: var(--quiet); font-size: 0.95rem; }
  .plain { list-style: none; display: grid; gap: 1.1rem; max-width: 40rem; }
  .plain li { display: grid; gap: 0.2rem; }
  .plain p { color: var(--quiet); }
</style>
<main class="page">
  <header>
    <p class="label">Purify 1.9 · the release film · cut to your track</p>
    <h1>Purify 1.9 is here.</h1>
    <p class="quiet read">${secs(TOTAL).replace("0s", "s")} in ${SHOTS.length} shots, each cut placed on a beat of the track you sent. Four real screens of the app. Say yes or no, or tell me what to change.</p>
  </header>

  <section>
    <div class="films">
      <div class="film">
        <h2>With the track</h2>
        <video controls playsinline preload="metadata"${still ? ` poster="${esc(still)}"` : ""} src="${esc(preview ?? "")}" aria-label="The film with the track, ${TOTAL.toFixed(0)} seconds"></video>
        <p>For your eyes only. The track is not Purify's, so this file is not for posting.</p>
      </div>
      <div class="film">
        <h2>Silent, to post</h2>
        <video controls playsinline muted preload="metadata"${still ? ` poster="${esc(still)}"` : ""} src="${esc(silent ?? "")}" aria-label="The film, silent, ${TOTAL.toFixed(0)} seconds"></video>
        <p>${video.size.join(" by ")}, 60 frames a second, ${video.megabytes} MB, no sound stream. Add the sound inside TikTok or Instagram when you post, starting at the track's first second.</p>
        <button class="save" id="save-silent" type="button" hidden>Save the silent film</button>
      </div>
    </div>
  </section>

  <section>
    <h2>The rhythm</h2>
    <div class="rhythm" role="img" aria-label="The ${SHOTS.length} shots, each as wide as it is long">${SHOTS.map((s) => `<span${s.card?.lines.length && s.screen ? ' class="card"' : ""} style="flex:${(s.until - s.at).toFixed(3)} 1 0"></span>`).join("")}</div>
    <div class="ends"><span>0s</span><span>held, then on the beat, then still</span><span>${TOTAL.toFixed(1)}s</span></div>
    <p class="quiet read">Each box is one shot, as wide as it is long. The filled boxes are the chapter cards. The track runs at about 99 beats a minute: the long boxes at the start are its sparse opening, the short ones are single beats, and the last is the end card held in the track's silence.</p>
  </section>

  <section>
    <h2>Every cut, and why</h2>
    <ol class="cut">${SHOTS.map((s) => `<li><span class="at">${s.at.toFixed(2)}s</span><h3>${esc(s.name)}</h3><p>${esc(s.why)}</p></li>`).join("")}</ol>
  </section>

  <section>
    <h2>Every word, and where it is from</h2>
    <dl>${Object.values(WORDS).map((w) => `<div><dt>${esc(w.words)}</dt><dd>${esc(w.from.replace(/\`/g, ""))}</dd></div>`).join("")}</dl>
  </section>

  <section>
    <h2>What was measured</h2>
    <ul class="plain">
      <li><h3>The app is real</h3><p>All four screens are the build the stores serve (main ${esc(video.export)}), a new reader with no Plus. Today and the journal read word for word after they build as before. Nothing of the app is drawn.</p></li>
      <li><h3>The house checks</h3><p>${checks.filter((c) => c.pass).length} of ${checks.length} shots pass at their middle: contrast on five palettes, no rays, stripes or sparkle, mirroring, no em dash.</p></li>
      <li><h3>The cuts</h3><p>Every cut is on the track's grid of beats, measured from the audio. Never more than three cuts in a second, and the phone never turns more than the store pictures' side stand.</p></li>
      <li><h3>Not shown in use</h3><p>No Plus feature. The verse's sheet shows Study as a row, as the app shows it to everyone, and it is not opened.</p></li>
    </ul>
  </section>

  <section>
    <h2>Still open</h2>
    <ul class="plain">
      <li><h3>The track's licence</h3><p>I do not know the song or its owner. Posting from a business account may be limited to the commercial library. If you tell me the song's name I can check.</p></li>
      <li><h3>Prayer campaigns and the other screens</h3><p>This film has four screens. The brief's other four (the Fathers, a saint's life, the Creed, prayer campaigns) are not in it.</p></li>
    </ul>
  </section>
</main>
<script>
(async () => {
  const button = document.getElementById("save-silent");
  const downloads = await window.claude?.use?.("downloads");
  if (!button || !downloads) return;
  button.hidden = false;
  button.addEventListener("click", async () => {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Saving";
    try {
      const file = await (await fetch(${JSON.stringify(silent ?? "")})).blob();
      await downloads.save({ filename: "purify-1.9-release-film.mp4", data: file });
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
