#!/usr/bin/env node
// The treatment and the storyboard, as one page for his yes or no.
//
//   node docs/plans/v1.9/video/release/page.mjs <file.html>
//
// It reads the storyboard's own frames (board.mjs) and their stills
// (.promo/v1.9-video/release/board/frame-N.jpg), so the page says what the
// script says. Phone first, the dark ground leading, no parchment.

import fs from "node:fs";
import path from "node:path";
import { MADE } from "../lib.mjs";
import { FRAMES, SECONDS } from "./board.mjs";

const out = process.argv[2] ?? (() => { throw new Error("say where the page goes: page.mjs <file.html>"); })();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const still = (n) => `data:image/jpeg;base64,${fs.readFileSync(path.join(MADE, "release", "board", `frame-${n}.jpg`)).toString("base64")}`;
const secs = (x) => `${x.toFixed(1)}s`;

const CHOICES = [
  ["It opens by announcing", "Black. The mark comes up in one soft pool of light and is held. Then the number fills the frame. No screen is seen for the first two and a half seconds, and the end card lands the same way."],
  ["Dark, and one light", "The palette's deepest night and one soft pool of light, never beams. The phone comes out of the dark with part of its glass in shadow, and the ground gives its light back. The hill and its lines are gone: they read as a graphic, and this is a place."],
  ["A camera that chooses", "Shots change scale hard: the whole phone small in a wide dark frame, then a detail filling the frame. Close shots are sharp where the eye should be and fall soft toward the far end, as a lens does."],
  ["A build", "Slow and held at the start, quicker through the two chapters, then stillness on the end card. The film is silent, so the rhythm is in the lengths of the shots, drawn below."],
  ["Type as an event", "Each chapter has its own full-frame card in the app's sans, large and few words. No caption sits over the phone. The serif does not come back."],
  ["Real screens", "The screen on the phone is the real app, the build the stores serve, each piece the app's own, word for word. The film adds only what is round the screen."],
];
const WORDS = [
  ["1.9", "the drop's release number"],
  ["The day's saint, fast and readings", "the store picture's line for Today"],
  ["Your journal, by the Church's day", "the drop's point for the journal"],
  ["Free for everyone.", "the same point's own text"],
  ["Purify 1.9 is here.", "the first sentence of the drop's caption"],
];

const html = `<title>Purify 1.9 Release Film</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<style>
  /* One column at phone width, the stills two and then three across as it widens. Dark leads; the light ground is a clean neutral. */
  :root {
    color-scheme: dark;
    --ground: #0b0c10; --raised: #14161c; --line: #262a33; --ink: #f2f3f5; --quiet: #a9aeb9; --held: #f2f3f5; --held-ink: #0b0c10;
    --sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; } }
  :root[data-theme="light"] { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; }
  body { background: var(--ground); color: var(--ink); font-family: var(--sans); font-size: 1rem; line-height: 1.55; }
  .page { max-width: 68rem; margin-inline: auto; padding-block: 2.5rem 4rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 3.25rem; }
  h1, h2, h3, p, ol, ul, dl, dd, figure, blockquote { margin: 0; padding: 0; }
  h1 { font-size: clamp(2.6rem, 11vw, 5rem); font-weight: 700; line-height: 0.98; letter-spacing: -0.04em; text-wrap: balance; }
  h2 { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance; }
  h3 { font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; }
  .label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--quiet); }
  .quiet { color: var(--quiet); }
  .read { max-width: 40rem; }
  header { display: grid; gap: 1.25rem; }
  blockquote { font-size: 1.2rem; line-height: 1.4; font-weight: 500; max-width: 38rem; text-wrap: pretty; }
  section { display: grid; gap: 1.4rem; }
  .line { font-size: clamp(1.9rem, 8vw, 3.2rem); font-weight: 700; letter-spacing: -0.035em; line-height: 1.02; }
  .choices { list-style: none; display: grid; gap: 1.5rem 2.5rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); }
  .choices li { display: grid; gap: 0.35rem; align-content: start; }
  .choices p { color: var(--quiet); }
  /* The rhythm: each shot as wide as it is long. */
  .rhythm { display: flex; gap: 3px; height: 3.25rem; }
  .rhythm span { min-width: 0; display: grid; place-items: center; background: var(--raised); border: 1px solid var(--line); border-radius: 4px; font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .rhythm span.card { background: var(--held); color: var(--held-ink); border-color: var(--held); }
  .ends { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--quiet); font-variant-numeric: tabular-nums; }
  .board { list-style: none; display: grid; gap: 2.5rem 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
  .board li { display: grid; gap: 0.75rem; align-content: start; min-width: 0; }
  .board img { display: block; width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 10px; border: 1px solid var(--line); background: #06070a; }
  .board .when { font-size: 0.85rem; font-weight: 600; color: var(--quiet); font-variant-numeric: tabular-nums; }
  .board p { color: var(--quiet); font-size: 0.97rem; }
  dl { display: grid; gap: 0.9rem; max-width: 40rem; }
  dl div { display: grid; gap: 0.1rem; padding-bottom: 0.9rem; border-bottom: 1px solid var(--line); }
  dt { font-weight: 600; font-size: 1.08rem; }
  dd { color: var(--quiet); font-size: 0.95rem; }
  .asks { list-style: none; display: grid; gap: 1.1rem; max-width: 40rem; }
  .asks li { display: grid; gap: 0.2rem; }
  .asks p { color: var(--quiet); }
</style>
<main class="page">
  <header>
    <p class="label">Purify 1.9 · the release film · treatment and storyboard</p>
    <h1>A film that announces, not a tour that explains</h1>
    <blockquote>"it doesn't feel like a major release type of video it feels like a general video that is to showcase the app. it needs to be cinematic."</blockquote>
    <p class="quiet read">Your word on the last render. That version stayed a tour: one phone in the middle, evenly lit, a caption over it the whole way. Below is the new direction in six choices and nine stills. Nothing is rendered as video yet. Say yes or no.</p>
  </header>

  <section>
    <p class="label">The one idea</p>
    <p class="line">Purify 1.9 is here.</p>
    <p class="quiet read">The film has one line, and it is the drop's own first sentence. Everything serves the arrival: the mark, the number, the phone coming out of the dark, and the same line landing at the end. No word is written for the film.</p>
  </section>

  <section>
    <h2>Six choices, and why</h2>
    <ul class="choices">${CHOICES.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
  </section>

  <section>
    <h2>The rhythm, ${secs(SECONDS)} in nine shots</h2>
    <div class="rhythm" role="img" aria-label="The nine shots, each as wide as it is long">${FRAMES.map((f, i) => `<span${f.title?.lines.length && f.phone ? ' class="card"' : ""} style="flex:${f.at[1]} 1 0">${i + 1}</span>`).join("")}</div>
    <div class="ends"><span>0s</span><span>held, then quicker, then still</span><span>${secs(SECONDS)}</span></div>
    <p class="quiet read">Each box is one shot, as wide as it is long. The two filled boxes are the chapter cards: short, on the same beat, so the film has a pulse.</p>
  </section>

  <section>
    <h2>The storyboard</h2>
    <p class="quiet read">Each still is rendered from the real stage with the real app on the phone. In the film each one moves.</p>
    <ol class="board">${FRAMES.map((f, i) => `<li><img src="${still(i + 1)}" alt="${esc(f.name)}" width="720" height="1280" loading="${i < 2 ? "eager" : "lazy"}"><p class="when">${i + 1} · ${secs(f.at[0])} to ${secs(f.at[0] + f.at[1])}</p><h3>${esc(f.name)}</h3><p>${esc(f.why)}</p></li>`).join("")}</ol>
  </section>

  <section>
    <h2>Every word, and where it is from</h2>
    <dl>${WORDS.map(([w, from]) => `<div><dt>${esc(w)}</dt><dd>${esc(from)}</dd></div>`).join("")}</dl>
  </section>

  <section>
    <h2>What your yes starts</h2>
    <ul class="asks">
      <li><h3>The test film</h3><p>These nine moments in motion: about ${secs(SECONDS)}, 1080 by 1920, 60 frames a second, silent. Made here, no credits spent. My estimate is 100,000 to 150,000 tokens and about an hour.</p></li>
      <li><h3>Sharper close shots</h3><p>I would film the two screens again at a finer grain, so a detail such as St Nicholas or a pen can truly fill the frame.</p></li>
      <li><h3>A generated background</h3><p>I do not think it is needed: the dark ground and the one light are made here and cost nothing. If you want real haze or a textured surface, one generated plate of light and ground only, never the app, would cost Higgsfield credits. I would quote it first.</p></li>
      <li><h3>Not yet</h3><p>The other six scenes wait for your yes to the test.</p></li>
    </ul>
  </section>
</main>
`;
if (/[–—]/.test(html)) throw new Error("a dash in place of words");
fs.writeFileSync(out, html);
console.log(out, `${(html.length / 1024).toFixed(0)} KB`);
