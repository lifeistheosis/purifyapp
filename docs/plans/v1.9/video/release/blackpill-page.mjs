#!/usr/bin/env node
// The edit's storyboard (blackpill-board.mjs), as one page for his yes or no.
//
//   node docs/plans/v1.9/video/release/blackpill-page.mjs <file.html>
//
// It reads the storyboard's own rows and their stills (.promo/v1.9-video/release/blackpill-board/still-N.jpg).
// Phone first, the dark ground leading, no parchment.

import fs from "node:fs";
import path from "node:path";
import { MADE } from "../lib.mjs";
import { HOOK, LINES, ROWS, SECONDS, pictureOf } from "./blackpill-board.mjs";

const out = process.argv[2] ?? (() => { throw new Error("say where the page goes: blackpill-page.mjs <file.html>"); })();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const still = (n) => `data:image/jpeg;base64,${fs.readFileSync(path.join(MADE, "release", "blackpill-board", `still-${n}.jpg`)).toString("base64")}`;
const secs = (x) => x.toFixed(2);

const LOOK = [
  ["Black and white until the end", "Every picture is hard black and white with heavy grain. Colour comes back once, on the last swell, on the icon of Christ. One change in 35 seconds, so it is felt."],
  ["Words slam, one line to a beat", "Large, bold, in the app's sans, centred. Each line lands on a measured hit and the frame shakes with it. The source sits small under every quote."],
  ["Effects on the hits only", "A shake and a punch in on each bass hit, a flash frame on each cut, never more than three in a second. Between hits the picture pushes in slowly."],
  ["Clean cuts", "Hard cuts only, on the measured hits. No fades, no glow, no beams of light."],
  ["No app, no pitch", "No screen of the app, no name, no download line. Purify's mark alone on the last hit."],
];
const LIMITS = [
  ["Every line is someone else's", "The hook is the one written line. Everything else is Scripture, St Cyprian or the Creed, word for word from the app's own text, and the script refuses to run if a word differs."],
  ["The Psalm reads \"devils\", not \"idols\"", "I offered you \"are idols\" from the King James. The app's Old Testament is the Greek text in Brenton's English, where it is Psalm 95:5 and reads \"are devils\". The app's own text is used."],
  ["No one is named or attacked", "No line names Muhammad, Islam, Rome or any person. The quotes carry it, and an account that attacks gets reported and limited."],
  ["A priest first, by your own rule", "This is doctrine. Your editorial rule sends doctrinal framing to a priest before it goes out. It is your call when."],
  ["The sound is added in the app", "The song is not cleared, so the file is silent and cut to its hits. Add the sound inside TikTok or Instagram on the separate edits account. Never in a paid ad."],
  ["The pictures need better copies", "These icons are the app's own small files, enlarged. Grain hides some of it. For the film I would look for larger public-domain copies of the same icons, at no cost."],
];

const html = `<title>Purify Blackpill Edit Storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<style>
  /* One column at phone width; the stills go two and three across as it widens. Dark leads; the light ground is a clean neutral. */
  :root {
    color-scheme: dark;
    --ground: #0b0c10; --raised: #14161c; --line: #262a33; --ink: #f2f3f5; --quiet: #a9aeb9; --held: #f2f3f5; --held-ink: #0b0c10; --frame: #06070a;
    --sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; } }
  :root[data-theme="light"] { color-scheme: light; --ground: #f5f6f8; --raised: #ffffff; --line: #d9dce3; --ink: #101216; --quiet: #525866; --held: #101216; --held-ink: #f5f6f8; }
  body { background: var(--ground); color: var(--ink); font-family: var(--sans); font-size: 1rem; line-height: 1.55; }
  .page { max-width: 68rem; margin-inline: auto; padding-block: 2.5rem 4rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 3.25rem; }
  h1, h2, h3, p, ol, ul, figure, blockquote { margin: 0; padding: 0; }
  h1 { font-size: clamp(2.4rem, 10vw, 4.6rem); font-weight: 700; line-height: 1; letter-spacing: -0.04em; text-wrap: balance; }
  h2 { font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance; }
  h3 { font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; }
  .label { font-size: 0.78rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--quiet); }
  .quiet { color: var(--quiet); }
  .read { max-width: 40rem; }
  header { display: grid; gap: 1.25rem; }
  blockquote { font-size: 1.2rem; line-height: 1.4; font-weight: 500; max-width: 38rem; text-wrap: pretty; }
  section { display: grid; gap: 1.4rem; }
  .pairs { list-style: none; display: grid; gap: 1.5rem 2.5rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr)); }
  .pairs li { display: grid; gap: 0.35rem; align-content: start; }
  .pairs p { color: var(--quiet); }
  .rhythm { display: flex; gap: 3px; height: 3.25rem; }
  .rhythm span { min-width: 0; display: grid; place-items: center; background: var(--raised); border: 1px solid var(--line); border-radius: 4px; font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; overflow: hidden; }
  .rhythm span.words { background: var(--held); color: var(--held-ink); border-color: var(--held); }
  .ends { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85rem; color: var(--quiet); font-variant-numeric: tabular-nums; }
  .board { list-style: none; display: grid; gap: 2.75rem 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
  .board li { display: grid; gap: 0.7rem; align-content: start; min-width: 0; }
  .board img { display: block; width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 10px; border: 1px solid var(--line); background: var(--frame); }
  .board .when { font-size: 0.85rem; font-weight: 600; color: var(--quiet); font-variant-numeric: tabular-nums; }
  .board p { color: var(--quiet); font-size: 0.97rem; }
  .board .said { color: var(--ink); font-weight: 600; }
  .board .said small { display: block; font-size: 0.85rem; font-weight: 400; color: var(--quiet); }
  .asks { list-style: none; display: grid; gap: 1.1rem; max-width: 40rem; }
  .asks li { display: grid; gap: 0.2rem; }
  .asks p { color: var(--quiet); }
</style>
<main class="page">
  <header>
    <p class="label">Purify · the edit · storyboard</p>
    <h1>An edit, not an ad</h1>
    <blockquote>"It's not promo for the app, but it's like an edit ... a gritty, like high effects type of edit with clean cuts."</blockquote>
    <p class="quiet read">Your words, 21 November, and then: "yes, separate account, make the storyboard". Here it is: eleven stills on the track's measured hits, with the reason for each. Nothing is rendered as video. Say yes or no, or name the stills to change.</p>
  </header>

  <section>
    <h2>The look</h2>
    <ul class="pairs">${LOOK.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
  </section>

  <section>
    <h2>The rhythm, ${SECONDS} seconds</h2>
    <div class="rhythm" role="img" aria-label="The parts of the cut, each as wide as it is long">${ROWS.map((f, i) => `<span${f.words ? ' class="words"' : ""} style="flex:${(f.at[1] - f.at[0]).toFixed(2)} 1 0">${i + 1}</span>`).join("")}</div>
    <div class="ends"><span>0</span><span>an intro, eight bars of 3.9 seconds, one hit</span><span>${SECONDS}</span></div>
    <p class="quiet read">Filled boxes carry words. The open ones are pictures alone: the stare, the fast run of faces, the Resurrection and the end. Words, then silence, then words: that is what keeps a viewer to the last second.</p>
  </section>

  <section>
    <h2>The storyboard</h2>
    <p class="quiet read">A still cannot shake or flash. Read each as the moment just after its hit.</p>
    <ol class="board">${ROWS.map((f, i) => {
      const w = f.words;
      const said = w ? `<p class="said">${esc(w.text)}<small>${w.cite ? esc(w.cite) + ", word for word from the app's own text" : "The hook, the one written line"}</small></p>` : "";
      const pic = pictureOf(f);
      return `<li><img src="${still(i + 1)}" alt="${esc(f.name)}" width="720" height="1280" loading="${i < 2 ? "eager" : "lazy"}"><p class="when">${secs(f.at[0])} to ${secs(f.at[1])} · ${esc(f.music)}</p><h3>${esc(f.name)}</h3><p>${esc(f.why)}</p>${said}<p>${pic ? `Picture: ${esc(pic[1])}. ` : ""}Lands on ${f.on.map(secs).join(", ")}</p></li>`;
    }).join("")}</ol>
  </section>

  <section>
    <h2>What holds it together</h2>
    <ul class="pairs">${LIMITS.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
  </section>

  <section>
    <h2>What your yes starts</h2>
    <ul class="asks">
      <li><h3>The film</h3><p>${SECONDS} seconds, 1080 by 1920, 60 frames a second, H.264, silent, with the shake, the punch ins, the flash frames and the grain moving. Then its page with Save the video. Made here, no credits spent. My estimate is 200,000 to 300,000 tokens and about two hours.</p></li>
      <li><h3>Set aside, not deleted</h3><p>The first storyboard, the promo with the app's screens, is kept for the Vault.</p></li>
    </ul>
  </section>
</main>
`;
if (/[–—]/.test(html)) throw new Error("a dash in place of words");
void HOOK; void LINES;
fs.writeFileSync(out, html);
console.log(out, `${(html.length / 1024).toFixed(0)} KB`);
