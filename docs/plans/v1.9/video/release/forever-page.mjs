#!/usr/bin/env node
// The Forever edit's storyboard, as one page for his yes or no.
//
//   node docs/plans/v1.9/video/release/forever-page.mjs <file.html>
//
// It reads the storyboard's own rows (forever-board.mjs) and their stills
// (.promo/v1.9-video/release/forever-board/still-N.jpg), so the page says what
// the script says. Phone first, the dark ground leading, no parchment.

import fs from "node:fs";
import path from "node:path";
import { MADE } from "../lib.mjs";
import { ANSWER, HOOK, ROWS, SECONDS, TITLES } from "./forever-board.mjs";

const out = process.argv[2] ?? (() => { throw new Error("say where the page goes: forever-page.mjs <file.html>"); })();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const still = (n) => `data:image/jpeg;base64,${fs.readFileSync(path.join(MADE, "release", "forever-board", `still-${n}.jpg`)).toString("base64")}`;
const secs = (x) => x.toFixed(2);

const wordsOf = (f) => (f.title_words ? TITLES[f.title_words] : null);
const BARS = ROWS.filter((f) => !f.extra);

const CHANGES = [
  ["No glow behind the words", "The brief put the verse in a pool of light. On the last film you said \"The glow looks vibe coded\", so the hook, the verse and the end card are words on the dark and nothing else."],
  ["The light does not move with the music", "The brief had the light swell with each voice swell. On the last film you said \"I want you to not time the glow to the beat. I want it to be purely clean transitions.\" So only cuts and pieces land on the hits."],
  ["The ground is dark, with no hill", "The brief asked for the store pictures' hill far off. This uses the last film's dark stage, where the phone stands in its own light. It reads as a place, and the hill reads as a graphic."],
  ["Bar 3 stops at the verse's tools", "In the app the Greek opens inside Study, beside parts marked Purify Plus. To keep Plus out of the film, the bar is the hold, the tools on 12.28 and a highlight on 13.61."],
  ["Bar 5 is Genesis 1, not John 1", "The Fathers' sheet on John 1 shows a picture we keep out of ads. Genesis 1 opens on St Basil the Great, as the store picture for the Fathers does."],
  ["Bar 8 has no count", "The app shows no count of those praying on a new campaign's page, and nothing is drawn. The Pray button lands last."],
];

const html = `<title>Purify Forever Edit Storyboard</title>
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
  h1, h2, h3, p, ol, ul, dl, dd, figure, blockquote { margin: 0; padding: 0; }
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
  /* The rhythm: each row of the cut as wide as it is long. */
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
    <p class="label">Purify promo · cut to "Forever", slowed · storyboard</p>
    <h1>The Forever edit, still by still</h1>
    <blockquote>"make me full length edit prompts for promo of purify based of these audio"</blockquote>
    <p class="quiet read">Your word, 21 November. This is the storyboard for that edit: one still for each part of the cut, with the reason for each. Nothing is rendered as video yet. Say yes or no, or name the stills to change.</p>
  </header>

  <section>
    <h2>The sound is added in the app</h2>
    <p class="quiet read">"Forever" by The Little Dippers is a commercial recording, and a promo is commercial use. So the film is delivered silent, cut to the track's measured hits, and you add the sound inside TikTok or Instagram when you post, if your account is allowed that sound. Not baked into the file, not in a paid ad, not on the store listings or the website: that can bring a takedown or a claim against the brand.</p>
  </section>

  <section>
    <h2>The rhythm, ${SECONDS} seconds</h2>
    <div class="rhythm" role="img" aria-label="The parts of the cut, each as wide as it is long">${BARS.map((f, i) => `<span${f.phone ? "" : ' class="words"'} style="flex:${(f.at[1] - f.at[0]).toFixed(2)} 1 0">${i + 1}</span>`).join("")}</div>
    <div class="ends"><span>0</span><span>an intro, eight bars of 3.9 seconds, one hit</span><span>${SECONDS}</span></div>
    <p class="quiet read">About 92 beats a minute, in bars of six beats. Every bar opens on a voice swell, so every bar opens on a new screen. The filled boxes are words alone: the hook, its answer and the end card. Cuts and pieces land only on hits that were measured from your clip.</p>
  </section>

  <section>
    <h2>The storyboard</h2>
    <p class="quiet read">Every screen is the real app as the stores serve it: a new reader with no Plus, Dark, Sunday 6 December 2026. Nothing of the app is drawn. In the film each still moves.</p>
    <ol class="board">${ROWS.map((f, i) => {
      const w = wordsOf(f);
      const said = w ? `<p class="said">Title: ${esc(w.text)}${w.sub ? ` · ${esc(w.sub)}` : ""}<small>From ${esc(w.from)}</small></p>` : "";
      return `<li><img src="${still(i + 1)}" alt="${esc(f.name)}" width="720" height="1280" loading="${i < 2 ? "eager" : "lazy"}"><p class="when">${secs(f.at[0])} to ${secs(f.at[1])} · ${esc(f.music)}</p><h3>${esc(f.name)}</h3><p>${esc(f.why)}</p>${said}<p>Lands on ${f.on.map(secs).join(", ")}</p></li>`;
    }).join("")}</ol>
  </section>

  <section>
    <h2>The two lines of the intro</h2>
    <ul class="pairs">
      <li><h3>${esc(HOOK.text)}</h3><p>The film's one written line, fixed in the brief at your word. It asks and does not argue. No line names or attacks any religion or person.</p></li>
      <li><h3>${esc(ANSWER.text)}</h3><p>${esc(ANSWER.sub)}, checked word for word against the app's own King James text. For the organic post only, not a paid ad and not the store listings, where the rules on religion are stricter.</p></li>
    </ul>
  </section>

  <section>
    <h2>Where this differs from the brief, and why</h2>
    <p class="quiet read">Six things, each yours to overrule.</p>
    <ul class="pairs">${CHANGES.map(([name, why]) => `<li><h3>${esc(name)}</h3><p>${esc(why)}</p></li>`).join("")}</ul>
  </section>

  <section>
    <h2>What your yes starts</h2>
    <ul class="asks">
      <li><h3>The film</h3><p>${SECONDS} seconds, 1080 by 1920, 60 frames a second, H.264, silent, cut to the hits above. Then its page with Save the video. Made here, no credits spent. My estimate is 250,000 to 400,000 tokens and two to three hours.</p></li>
      <li><h3>Before it is posted</h3><p>Prayer campaigns open to every reader, since bar 8 shows them, and 1.9 live on both stores.</p></li>
      <li><h3>One film or two</h3><p>Yesterday's chat made a 21 second release film to another track. This edit overlaps with it. Keep one, or keep both for different posts.</p></li>
    </ul>
  </section>
</main>
`;
if (/[–—]/.test(html)) throw new Error("a dash in place of words");
fs.writeFileSync(out, html);
console.log(out, `${(html.length / 1024).toFixed(0)} KB`);
