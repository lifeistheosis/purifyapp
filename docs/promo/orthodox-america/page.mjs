// The page he sees the film on, and the record of what was made.
//
//   node docs/promo/orthodox-america/page.mjs [--video=<the film's address on the page>] [--poster=<a still's address>]
//   node docs/promo/orthodox-america/page.mjs --check     checkMock on the page, five palettes, 360 390 412 1032
//
// It writes the page to .promo/orthodox-america/orthodox-america-film.html
// (out of git; published from there with the Artifact tool, the film and its
// poster in the page's own asset store) and RECORD.md beside this file.
// Built from the design kit (docs/brand/design-kit.md): the kit's own style
// block, its pieces, and three small pieces of its own made from its tokens.
// Dark first, the clean neutral for a light screen, never parchment, phone first.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FACTS, LEFT_OUT, SOURCES } from "./facts.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.join(ROOT, ".promo/orthodox-america");
const FILM = path.join(OUT, "orthodox-america.mp4");
const PAGE = path.join(OUT, "orthodox-america-film.html");
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---- The scenes: what each shows, and the reason for it --------------------
const TIMES = JSON.parse(/const SCENES = (\[\[.*?\]\]);/.exec(fs.readFileSync(path.join(HERE, "film.html"), "utf8"))[1]);
const ABOUT = {
  title: ["The title", "The name, and under it the film's whole point in seven words: by the numbers, and by who is counting.", "A documentary insert has to say what it is in one card. The second line tells the viewer the numbers will disagree, and why, before the first one appears."],
  one: ["One in a hundred", "A hundred dots; one stays lit. Then 1%, then 2.6 million with the sum that makes it.", "One in a hundred is felt before it is read. The 2.6 million is shown as a multiplication because no source measures it: Pew gives a rounded share. Saying so is what lets the rest be trusted."],
  gap: ["The gap", "2,600 dots, one for each thousand people. The field thins to those on parish rolls, then to Eastern Orthodox rolls, then to a typical Sunday. The number counts down with it, and four lines keep the proportions.", "This is the film's centre, so it has the longest scene and the only field of this size. The dots thin in place, so the eye sees who is missing. Each step says what kind of count it is, and the like-for-like step (both families on the rolls) comes first so the gap is not overstated."],
  six: ["The six million claim", "6,000,000, where it began in 1942, then two blocks of dots: 2,979 people a parish against the median parish's 130.", "A claim is answered best by showing what it would require. One dot is one person here, so the two blocks can be compared by eye. The history gives the claim an origin instead of only calling it wrong."],
  who: ["Who they are", "Pew's four age bands as one bar, then five shares: men, immigrants, those who stayed, converts, graduates.", "One bar shows the ages as parts of a whole. The five shares are each a number, a line as long as the share, and one plain sentence. The small sample and the margin of error are on screen, because these are the softest figures in the film."],
  where: ["Where they are", "The map by Pew's four regions, then the six states that hold nearly half the people on the rolls, then the seven that hold nearly half the parishes.", "A map is the only honest way to show place. It changes three times in one frame, so the viewer sees that people and parishes are not in the same states: Pennsylvania is sixth by people and first by parishes."],
  change: ["What is changing", "Three lines from 2010 to 2020, then converts a year in twenty parishes, then the last word.", "The decade is a slope, so it is drawn as one. The converts are bars because each year is its own count, and 2022 is the one white bar. The film ends on what is known and not on a forecast."],
  sources: ["Sources", "The seven written sources, in full, and the date the figures were checked.", "A viewer or an editor can check every figure. Purify's name is on what the film says."],
};
let clockAt = 0;
for (const t of TIMES) { t.push(clockAt); clockAt += t[1]; } // each scene starts where the last one ends, as in film.html
/** A figure as the viewer reads it: film.html holds some as code (a count's target, a chart's pair). */
const shown = (s) => s.replace(/^data-count="(\d+)"$/, "$1%").replace(/^\[(\d{4}), (\d+)\]$/, "$1: $2").replace(/^\d{6,}$/, (n) => Number(n).toLocaleString("en-US"));
const scenes = TIMES.map(([id, dur, start]) => ({ id, dur, start, title: ABOUT[id][0], shows: ABOUT[id][1], why: ABOUT[id][2], facts: FACTS.filter((f) => f.scene === id) }));
const seconds = scenes.reduce((n, s) => n + s.dur, 0);

// ---- The look, choice by choice -------------------------------------------
const LOOK = [
  ["Black, white and the greys between", "You asked for black and white, and a documentary's archive look is exactly that. No sepia, cream or aged paper.", "Nothing competes with the numbers. White is kept for the figure being read; grey is for what explains it."],
  ["DM Serif Display for numbers and titles, DM Sans for labels", "They are the app's own faces, in the jobs the app gives them.", "The film reads as Purify's without a logo on it, and a big serif numeral reads as a serious film."],
  ["Dots, where one dot is a fixed number of people", "People are countable, so they are shown as counted things. Each scene says what one dot is worth.", "The viewer compares sizes by eye before reading a number."],
  ["Numbers that count and settle; lines that draw", "Motion is used only where it carries meaning: a count falling as a field thins, a line drawing across ten years.", "The eye is led to the one thing that changed."],
  ["A slow push-in, fine grain, a soft pool of light, the last figure left out of focus", "These are what a documentary camera does over a still. All on the house curve. The light is one soft pool: no rays.", "It feels filmed, not presented, and it will sit beside real footage."],
  ["A source line on every scene, and what kind of count each number is", "The text you gave was an AI search engine's answer. Purify's name rides on every figure.", "Anyone can check it, and the two kinds of count are never mistaken for one."],
  ["Silent, 16:9, no logo", "An insert is laid into someone's film: they bring the score and the voice, and silence carries no licence.", "It can be cut into a documentary as it is."],
  ["The map from public boundary files", "State outlines from the U.S. Census Bureau's cartographic boundaries, by the us-atlas package. No borrowed pictures, no generated people or churches.", "Nothing in the film needs a permission."],
];

// ---- The film as it was made ----------------------------------------------
let film = null;
if (fs.existsSync(FILM)) {
  const p = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", FILM], { encoding: "utf8" }));
  const v = p.streams.find((s) => s.codec_type === "video");
  film = { bytes: +p.format.size, seconds: +p.format.duration, size: [v.width, v.height], codec: `${v.codec_name} (${v.profile})`, pixels: v.pix_fmt, fps: v.r_frame_rate, frames: +v.nb_frames, sound: p.streams.some((s) => s.codec_type === "audio") ? "a sound stream" : "none: the file has no sound stream" };
}
const mb = film ? (film.bytes / 1048576).toFixed(1) : "not made";
const sourceCount = Object.keys(SOURCES).length - 1; // the map's package is a tool, not a source of figures
const srcLink = (key) => `<a href="${esc(SOURCES[key].url)}" target="_blank" rel="noopener">${esc(SOURCES[key].name)}</a>`;

// ---- The page --------------------------------------------------------------
const template = fs.readFileSync(path.join(ROOT, "docs/brand/kit/artifact-template.html"), "utf8");
const kitStyle = /<style>[\s\S]*?<\/style>/.exec(template)[0];
const kitFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/.exec(template)?.[0] ?? "";

function page(videoSrc, poster) {
  return `<title>Orthodox America Film</title>
<meta name="claude:viewport-fit-sides" content="cover">
${kitFonts}
${kitStyle}
<style>
/* Three pieces this page adds to the kit's, built from its tokens only: the film as a figure at its own shape,
   the step from scene to scene, and a scene as a row (its time, what it shows, why, and each figure with its source). */
.o-film { margin: var(--k-space-5) 0; }
.o-film video, .o-film .o-none { display: block; width: 100%; max-width: 100%; height: auto; aspect-ratio: 16 / 9; border-radius: 14px; border: 1px solid var(--k-line); background-color: var(--k-well); }
.o-film figcaption { margin-block-start: var(--k-space-3); font-size: var(--k-text-detail); line-height: 19px; color: var(--k-ink-3); text-align: center; }
.o-step { display: grid; grid-template-columns: 1fr 1fr; gap: var(--k-space-3); margin-block-start: var(--k-space-4); }
.o-now { grid-column: 1 / -1; margin: 0; min-height: 22px; font-family: var(--k-font-sans); font-size: 15px; line-height: 22px; font-weight: 600; color: var(--k-ink); text-align: center; }
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
.o-facts { list-style: none; margin: var(--k-space-3) 0 0; padding: 0; display: grid; gap: var(--k-space-3); }
.o-facts li { font-family: var(--k-font-sans); font-size: 14px; line-height: 21px; color: var(--k-ink-2); max-width: var(--k-measure); overflow-wrap: anywhere; }
.o-facts b { font-weight: 600; color: var(--k-ink); }
.o-facts a, .o-sources a { color: var(--k-ink); text-decoration: underline; text-underline-offset: 3px; }
.o-sources { list-style: none; margin: var(--k-space-4) 0 0; padding: 0; display: grid; gap: var(--k-space-4); }
.o-sources li { font-family: var(--k-font-serif); font-size: 16px; line-height: 24px; color: var(--k-ink-2); overflow-wrap: anywhere; }
.o-sources a { display: inline-block; min-height: 44px; padding-block: 10px; font-family: var(--k-font-sans); font-weight: 600; }
</style>
<main class="k-page">

  <header class="k-title k-rise">
    <span class="k-mark" role="img" aria-label="Purify"></span>
    <span class="k-eyebrow">For your yes or no</span>
    <h1>Orthodox Christians in America, by the numbers</h1>
    <p class="k-lede">A black and white documentary insert. One version, silent, ${clock(seconds)} long.</p>
    <p class="k-meta">Made 13 November 2026 from ${sourceCount} written sources.</p>
  </header>

  <section aria-label="The film">
    <figure class="o-film">
      ${videoSrc ? `<video id="film" controls playsinline muted preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""} src="${esc(videoSrc)}" aria-label="Orthodox Christians in America, by the numbers: ${Math.round(seconds)} seconds, silent"></video>` : `<div class="o-none" role="img" aria-label="The film is not on the page yet"></div>`}
      <figcaption>${Math.round(seconds)} seconds, 1920 by 1080, no sound. Turn the phone sideways to see it full.</figcaption>
      ${videoSrc ? `<div class="o-step">
        <p class="o-now" id="now" aria-live="polite">Scene 1 of ${scenes.length}: ${esc(scenes[0].title)}</p>
        <button class="k-button k-button-quiet" id="prev" type="button">Scene before</button>
        <button class="k-button k-button-quiet" id="next" type="button">Next scene</button>
      </div>
      <button class="k-button o-save" id="save-film" type="button" hidden>Save the film</button>
      <p class="o-said" id="save-said" role="status"></p>` : ""}
    </figure>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Length</span><span class="k-stat-change">The brief guessed 75 to 120 seconds; the figures needed a little more to be read twice</span><span class="k-stat-value">${clock(seconds)}</span></div>
      <div class="k-stat"><span class="k-stat-label">File</span><span class="k-stat-change">H.264, 1920 by 1080, 30 frames a second, no sound</span><span class="k-stat-value">${film ? `${mb} MB` : "Not made"}</span></div>
      <div class="k-stat"><span class="k-stat-label">Figures checked</span><span class="k-stat-change">Each read in its own written source, ${sourceCount} sources</span><span class="k-stat-value">${FACTS.reduce((n, f) => n + f.show.length, 0)}</span></div>
      <div class="k-stat"><span class="k-stat-label">Claims left out</span><span class="k-stat-change">No written source carried them, or the source said otherwise</span><span class="k-stat-value">${LEFT_OUT.length}</span></div>
    </div>
  </section>

  <section class="k-section" aria-labelledby="s-true">
    <h2 id="s-true">What the check changed</h2>
    <p>The text you gave is an AI search engine's answer. Most of it held. Three things did not, and the film is built round them.</p>
    <p><strong>2.6 million is a sum, not a count.</strong> Pew says 1% of adults, rounded to a whole percent. The engine multiplied that by the adult population. The film keeps the number, shows the multiplication, and adds what the same survey's raw sample suggests: 1.8 to 2.1 million.</p>
    <p><strong>The gap was overstated.</strong> 2.6 million counts Eastern and Oriental Orthodox together. 675,765 counts Eastern Orthodox alone. The like-for-like figure is both families on parish rolls: 1,167,178. The film shows that step first, then the Eastern figure, then Sunday.</p>
    <p><strong>The newest claims came from videos.</strong> The Sun Belt surge and the newcomers' backgrounds had no written source. One written study does carry a rise in converts, in twenty parishes, and the film shows that with its own caution.</p>
    <p>The age bands are Pew's own words, and Pew writes "50 to 65" beside "65 and older". The film keeps them as Pew prints them and says so. Say if you would sooner it read "50 to 64".</p>
  </section>

  <section class="k-section" aria-labelledby="s-scenes">
    <h2 id="s-scenes">Scene by scene</h2>
    <p>Tap a time to play from that scene. Under each: what it shows, why, and every figure with the source's own words.</p>
    <ol class="o-scenes">
${scenes.map((s, i) => `      <li class="o-scene">
        <div class="o-head"><h3>${esc(s.title)}</h3>${videoSrc ? `<button class="k-button k-button-quiet o-play" type="button" data-at="${s.start}" aria-label="Play from scene ${i + 1}, ${esc(s.title)}, at ${clock(s.start)}">${clock(s.start)}</button>` : `<span class="k-meta">${clock(s.start)}</span>`}</div>
        <p>${esc(s.shows)}</p>
        <p class="o-why">${esc(s.why)}</p>${s.facts.length ? `
        <ul class="o-facts">
${s.facts.map((f) => `          <li><b>${esc(f.show.map(shown).join(", "))}:</b> ${esc(f.what)}. ${srcLink(f.src)}: ${esc(f.says)} <b>Changed from your text:</b> ${esc(f.change)}</li>`).join("\n")}
        </ul>` : ""}
      </li>`).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-out">
    <h2 id="s-out">Left out, and why</h2>
    <ol class="o-scenes">
${LEFT_OUT.map(([what, why]) => `      <li class="o-scene"><div class="o-head"><h3>${esc(what)}</h3></div><p>${esc(why)}</p></li>`).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-look">
    <h2 id="s-look">Why it looks this way</h2>
    <ol class="o-scenes">
${LOOK.map(([what, why, does]) => `      <li class="o-scene"><div class="o-head"><h3>${esc(what)}</h3></div><p>${esc(why)}</p><p class="o-why">${esc(does)}</p></li>`).join("\n")}
    </ol>
  </section>

  <section class="k-section" aria-labelledby="s-sources">
    <h2 id="s-sources">Sources</h2>
    <p>Each opens the source itself.</p>
    <ul class="o-sources">
${Object.values(SOURCES).map((s) => `      <li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a><br>${esc(s.title)}</li>`).join("\n")}
    </ul>
  </section>

  <section class="k-section" aria-labelledby="s-rules">
    <h2 id="s-rules">The rules it was held to</h2>
    <div class="k-stats">
      <div class="k-stat"><span class="k-stat-label">Every word 4.5:1 or more</span><span class="k-stat-change">Measured against the lightest the ground gets; the least is 7.2:1</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Reads on a phone held sideways</span><span class="k-stat-change">Every scene looked at 844 by 390; no word under 11 px there</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">No rays, sparkle, side stripe, pills, dashes or parchment</span><span class="k-stat-change">Read from the scene code before every render, the way the house reads a promo script</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">Grey only</span><span class="k-stat-change">Every colour in the scene code has equal red, green and blue, and the file is encoded from a grey picture</span><span class="k-stat-value">Pass</span></div>
      <div class="k-stat"><span class="k-stat-label">No pictures</span><span class="k-stat-change">Type, dots, lines and a map. The heritage list is not touched, and nothing was paid for</span><span class="k-stat-value">Pass</span></div>
    </div>
  </section>

  <footer class="k-foot">
    <p class="k-meta">One version was made, so nothing goes to the Vault. Source: docs/promo/orthodox-america/</p>
  </footer>
</main>
${videoSrc ? `<script>
// Scene to scene: the two buttons and each scene's time move the film; the line between says where it is.
(() => {
  const film = document.getElementById("film"), now = document.getElementById("now");
  const SCENES = ${JSON.stringify(scenes.map((s) => ({ t: s.start, title: s.title })))};
  const at = () => { let k = 0; for (let i = 0; i < SCENES.length; i++) if (film.currentTime >= SCENES[i].t - 0.05) k = i; return k; };
  const say = () => { const k = at(); now.textContent = "Scene " + (k + 1) + " of " + SCENES.length + ": " + SCENES[k].title; };
  const go = (k, play) => { film.currentTime = SCENES[Math.max(0, Math.min(SCENES.length - 1, k))].t + 0.01; say(); if (play) film.play().catch(() => {}); };
  film.addEventListener("timeupdate", say);
  document.getElementById("prev").addEventListener("click", () => go(at() - 1, !film.paused));
  document.getElementById("next").addEventListener("click", () => go(at() + 1, !film.paused));
  for (const b of document.querySelectorAll(".o-play")) b.addEventListener("click", () => {
    go(SCENES.findIndex((s) => s.t === +b.dataset.at), true);
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
      await downloads.save({ filename: "orthodox-christians-in-america.mp4", data: file });
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

// ---- The page's own check, the way docs/brand/kit/check.mjs holds the kit's page ----
if (process.argv.includes("--check")) {
  const { checkMock, printMockCheck, PALETTES } = await import("../../../scripts/mock-check.mjs");
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
    ok = printMockCheck(await checkMock(tab, "body", { palettes: PALETTES }), `the film's page at ${width}`) && ok;
    const wide = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (wide > 0) { console.log(`  NO   width       at ${width}: the page is ${wide}px wider than the screen`); ok = false; }
    if (width === 390) await tab.screenshot({ path: path.join(OUT, "page-390.png"), fullPage: true });
    await ctx.close();
  }
  await browser.close();
  console.log(ok ? "page check: passes on the five palettes at 360, 390, 412 and 1032" : "page check: FAILED");
  if (!ok) process.exit(1);
}

// ---- The record ------------------------------------------------------------
if (film) {
  const record = `# Orthodox Christians in America, by the numbers: the record

Written by \`page.mjs\` from what was made and measured, and from \`facts.mjs\`. Do not edit this file: change those and write it out again.

## The file

| | |
|---|---|
| File | \`.promo/orthodox-america/orthodox-america.mp4\` (out of git) |
| Length | ${film.seconds.toFixed(2)} seconds, ${film.frames} frames |
| Size | ${(film.bytes / 1048576).toFixed(2)} MB (${film.bytes} bytes) |
| Picture | ${film.size[0]} by ${film.size[1]}, ${film.codec}, ${film.pixels}, ${film.fps} frames a second, faststart |
| Sound | ${film.sound} |
| Made | 13 November 2026, by \`render.mjs\`: one full render, taken in two runs. The first was stopped at frame 871 when it would have outrun the session's limit for a background job; the second (\`--resume\`) kept those frames and took the rest, 3,960 in all, each the same whenever it is taken. Before it, stills only (\`--sheet\`, and eight mid-motion stills); no draft film was made |
| Paid generation | none. Playwright's Chromium, ffmpeg, two open faces and a public map |

## How it was made

\`film.html\` is the whole film as one page of type, canvas dots and SVG, set to any moment by \`__seek(ms)\`. \`render.mjs\` checks the rules, steps it one thirtieth of a second at a time, and ffmpeg writes the frames in two passes with a fine grain (a fixed seed) to a size the page's store holds. \`facts.mjs\` is every figure with its source; the render refuses a figure that is in one file and not the other.

- **Faces.** DM Serif Display and DM Sans, the app's own (\`app/layout.tsx\`), from their open-licence packages (\`@fontsource\`), since this job makes no export.
- **The map.** us-atlas \`states-albers-10m.json\`, built from the U.S. Census Bureau's cartographic boundary files (public domain). \`build-map.mjs\` writes \`map.json\` from it, with the Bureau's four regions, which are Pew's.
- **Rays, and the house's other rules.** \`lib/marketing/__tests__/promoLooks.test.ts\` refuses a \`conic-gradient\` in a promo script. \`render.mjs --check\` holds \`film.html\` to the same measure before any frame is taken, and also refuses a dash in place of words, a sparkle glyph, a one-sided border, a pill radius, a picture of any kind, parchment or sepia, a colour that is not a grey, a word under 4.5:1 on the lightest the ground gets, and a word under 26 px (11.4 px on a phone held sideways).
- **checkMock.** It measures an app mockup (five palettes, 44 px controls, mirroring). A film frame has no palette and no controls, so the frames are held by \`render.mjs --check\` instead; the page he sees it on is held by checkMock itself (\`page.mjs --check\`).
- **Phone check.** \`render.mjs --sheet\` takes every scene at full size and at 844 by 390; each was looked at.
- **Pictures.** None. \`lib/marketing/heritagePictures.ts\` is not touched.

## The scenes

| At | Scene | Seconds | What it shows |
|---|---|---|---|
${scenes.map((s) => `| ${clock(s.start)} | ${s.title} | ${s.dur} | ${s.shows} |`).join("\n")}

## Every figure, its source and its check

Each was read in the source itself on 13 November 2026. "Says" is the source's own words or place.

| Scene | On screen | What it is | Source | Says | Changed from SOURCE.md |
|---|---|---|---|---|---|
${FACTS.map((f) => `| ${ABOUT[f.scene][0]} | ${f.show.map(shown).join("; ")} | ${f.what} | [${SOURCES[f.src].name}](${SOURCES[f.src].url}) | ${f.says.replace(/\|/g, "/")} | ${f.change} |`).join("\n")}

## Left out, and why

| What the text said | Why it is not in the film |
|---|---|
${LEFT_OUT.map(([a, b]) => `| ${a} | ${b} |`).join("\n")}

## The sources

${Object.values(SOURCES).map((s) => `- ${s.name}. ${s.title}. ${s.url}`).join("\n")}
`;
  fs.writeFileSync(path.join(HERE, "RECORD.md"), record);
  console.log("RECORD.md written");
}
