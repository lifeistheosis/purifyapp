#!/usr/bin/env node
// The edit, his new approach (2026-11-21, about 23:35 UTC): "It's not promo for the app, but it's like an edit ...
// black pill edits are the best example", "a gritty, like high effects type of edit with clean cuts", and, to the
// lines put to him and the question of which account posts it: "yes, separate account, make the storyboard".
//
// This is the storyboard: one still for each row of the cut, on the same measured hits as the Forever track
// (forever-edit-prompt.md). No screen of the app is in it.
//
//   node docs/plans/v1.9/video/release/blackpill-board.mjs            every still, full size, and the sheet
//   node docs/plans/v1.9/video/release/blackpill-board.mjs --only 5   one still
//   node docs/plans/v1.9/video/release/blackpill-board.mjs --check    checkMock on every still
//
// Words. The hook is the one written line (fixed at his word). Every other line is Scripture, a Father or the Creed,
// word for word from the app's own text, and this script refuses to run if the app does not read so. No line of
// the film's own names or attacks any religion or person.
// Pictures. Icons the app already holds, none on the heritage list (checked here), none a living painter's work.
// Light. No glow, no rays: grain, hard contrast and hard cuts.

import fs from "node:fs";
import path from "node:path";
import { ORIGIN, OUT, ROOT, checkMock, dir, heritageNamedIn, launch, serveLikeTheShell, sharp, wait } from "../lib.mjs";

const [W, H] = [1080, 1920];
const fail = (text) => {
  throw new Error(text);
};
const readText = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ── The words ────────────────────────────────────────────────────────────

/** A line, where it breaks, its place, and the app's file it must be found in, word for word. */
const line = (text, lines, cite, file) => {
  if (lines.join(" ") !== text) fail(`"${text}": the lines do not join into it`);
  if (/[–—]/.test(text)) fail(`"${text}": a dash in place of words`);
  if (file && !readText(file).includes(text)) fail(`"${text}" is not in ${file}, word for word`);
  return { text, lines, cite };
};
export const HOOK = line("Do all religions worship the same God?", ["Do all", "religions", "worship the", "same God?"], null, null);
export const LINES = {
  psalm: line("For all the gods of the heathen are devils: but the Lord made the heavens.", ["For all the gods", "of the heathen", "are devils:", "but the Lord", "made the heavens."], "Psalm 95:5", "data/bible/psalms/95.json"),
  paul: line("the things which the Gentiles sacrifice, they sacrifice to devils, and not to God", ["the things which", "the Gentiles", "sacrifice,", "they sacrifice", "to devils,", "and not to God"], "1 Corinthians 10:20", "data/bible/1-corinthians/10.json"),
  one: line("One Lord, one faith, one baptism", ["One Lord,", "one faith,", "one baptism"], "Ephesians 4:5", "data/bible/ephesians/4.json"),
  cyprian: line("He can no longer have God for his Father, who has not the Church for his mother.", ["He can no longer", "have God", "for his Father,", "who has not", "the Church", "for his mother."], "St Cyprian, On the Unity of the Church", "data/saints/cyprian-of-carthage/on-the-unity-of-the-church.json"),
  creed: line("And we believe in one, holy, Catholic and Apostolic Church.", ["And we believe", "in one, holy,", "Catholic and", "Apostolic Church."], "The Creed, Constantinople, 381", "lib/councils/creed.ts"),
  way: line("I am the way, the truth, and the life: no man cometh unto the Father, but by me.", ["I am the way,", "the truth,", "and the life:", "no man cometh", "unto the Father,", "but by me."], "John 14:6", "data/bible/john/14.json"),
};

// ── The pictures ─────────────────────────────────────────────────────────

const PICS = {
  christ: ["icons/prayer/christ-pantocrator.v2.jpg", "Christ Pantocrator"],
  michael: ["saints/icons/archangel-michael.v3.jpg", "The Archangel Michael"],
  paul: ["saints/icons/apostle-paul.v2.jpg", "The Apostle Paul"],
  athanasius: ["saints/icons/athanasius-the-great.v3.jpg", "St Athanasius the Great"],
  cross: ["icons/prayer/crucifixion.v2.jpg", "The Crucifixion"],
  pentecost: ["icons/prayer/pentecost.jpg", "Pentecost"],
  hierarchs: ["icons/prayer/three-hierarchs.v2.jpg", "The Three Hierarchs"],
  anastasis: ["icons/prayer/anastasis.jpg", "The Resurrection"],
};
for (const [file] of Object.values(PICS)) {
  if (!fs.existsSync(path.join(OUT, file))) fail(`the app's bundle has no ${file}`);
  if (Object.keys(heritageNamedIn(`/${file}`)).length) fail(`${file} is on the heritage list`);
}

// ── The cut ──────────────────────────────────────────────────────────────
//
// A row:
//   at, on, music   as in forever-board.mjs: the row's seconds, the measured hits something lands on, the track there
//   pic     the picture, and how it is seen: [name, zoom, x and y of what the zoom holds (parts in a hundred)]
//   grade   "bw" hard black and white, or "colour" the icon's own colour; and `lit` how bright (1 as it is)
//   words   the lines on screen, their size, the y of the first; `shown` how many of the lines have landed at the still
//   mark    Purify's mark alone
//   why     the reason, for the page

export const ROWS = [
  {
    name: "The hook",
    at: [0, 2.07],
    on: [0.07],
    music: "near silence, one soft hit",
    pic: ["christ", 3.1, 46, 21],
    grade: "bw",
    lit: 0.2,
    words: { ...HOOK, size: 178, y: 520 },
    why: "The question is whole on the first soft hit, as wide as the frame. Behind it, almost lost in the dark and the grain, are the eyes of the oldest icon of Christ. A viewer reads the question first and feels the eyes second. That is what holds the first second.",
  },
  {
    name: "The stare",
    at: [2.07, 3.72],
    on: [2.07],
    music: "the second soft hit",
    pic: ["christ", 2.5, 46, 21],
    grade: "bw",
    lit: 0.62,
    why: "On the second hit the words cut away and the picture is punched up: the same eyes, now seen. No words for a beat and a half. The pause before the first swell is the edit's tension, and it costs nothing to say.",
  },
  {
    name: "The gods of the nations",
    at: [3.72, 7.62],
    on: [3.72, 4.37, 5.02, 5.67, 6.66],
    music: "bar 1, the first swell",
    pic: ["michael", 1.12, 66, 42],
    grade: "bw",
    lit: 0.5,
    words: { ...LINES.psalm, size: 112, y: 640, shown: 3 },
    why: "The first answer, on the swell: the Psalm, in the app's own Greek Old Testament text, where it is Psalm 95. Its lines slam in one to a beat over the Archangel with his spear, and the frame shakes on each. The still is the third beat: \"are devils:\" has just landed and the rest is still to come.",
  },
  {
    name: "The Apostle",
    at: [7.62, 11.52],
    on: [7.64, 8.31, 8.99, 9.64, 10.31],
    music: "bar 2",
    pic: ["paul", 1.3, 30, 12],
    grade: "bw",
    lit: 0.46,
    words: { ...LINES.paul, size: 104, y: 640 },
    why: "A hard cut to St Paul, and his own sentence from 1 Corinthians, one line to a beat. Scripture says it, so the edit does not have to. The picture pushes in slowly through the bar, then punches on the last line.",
  },
  {
    name: "The witnesses",
    at: [11.52, 15.42],
    on: [11.61, 12.28, 13.61, 14.28],
    music: "bar 3",
    pic: ["athanasius", 1.9, 50, 34],
    grade: "bw",
    lit: 0.7,
    why: "The fast run: four faces on four hits, no words, a flash frame on each cut. The Archangel, St Paul, St Athanasius, the Three Hierarchs. This is the high effects bar: shake, punch in, grain at its heaviest. The still is St Athanasius, the third face.",
  },
  {
    name: "One",
    at: [15.42, 19.32],
    on: [15.91, 17.25, 17.9, 18.55],
    music: "bar 4",
    pic: ["cross", 1.75, 50, 42],
    grade: "bw",
    lit: 0.56,
    words: { ...LINES.one, size: 168, y: 660 },
    why: "The turn to the second subject. Three beats in a row, 17.25, 17.90 and 18.55, and Ephesians 4:5 has three phrases: one lands on each, at the film's largest size, over the Cross. The simplest shot in the edit and the one most likely to be screenshotted.",
  },
  {
    name: "The Church for his mother",
    at: [19.32, 23.22],
    on: [20.25, 21.25, 21.87],
    music: "bar 5",
    pic: ["pentecost", 1.3, 50, 40],
    grade: "bw",
    lit: 0.48,
    words: { ...LINES.cyprian, size: 104, y: 560 },
    why: "St Cyprian's line, word for word from the app's library, over Pentecost, the day the Church began. The first half lands on 20.25 and the second on 21.25, then it is held. A Father says the hard thing about unity, with his name under it.",
  },
  {
    name: "The Creed",
    at: [23.22, 27.12],
    on: [23.55, 24.54, 25.19, 25.84],
    music: "bar 6",
    pic: ["hierarchs", 1.5, 50, 30],
    grade: "bw",
    lit: 0.36,
    words: { ...LINES.creed, size: 116, y: 700 },
    why: "The Creed's own line on the Church, from the Council of 381, over the Three Hierarchs. Four lines on four beats. It is the calm, certain bar before the music is at its fullest.",
  },
  {
    name: "The Resurrection",
    at: [27.12, 31.02],
    on: [27.49, 28.19, 28.84, 29.49, 30.49],
    music: "bar 7, the music at its fullest",
    pic: ["anastasis", 2.1, 52, 40],
    grade: "bw",
    lit: 0.78,
    why: "The music is fullest, so there are no words at all: Christ breaking the gates, punched nearer on every beat, 28.19, 28.84 and 29.49. The fastest motion in the edit. On the last beat the frame goes to black for the breath before the end.",
  },
  {
    name: "The way",
    at: [31.02, 34.48],
    on: [31.16, 32.16, 33.81],
    music: "bar 8, the last swell",
    pic: ["christ", 1.32, 48, 30],
    grade: "colour",
    lit: 0.52,
    words: { ...LINES.way, size: 104, y: 760 },
    why: "The colour comes back. Everything until now is black and white; on the last swell the same icon from the first second is seen whole and in its own colour, and the Lord answers the hook himself. \"I am the way,\" on 31.16, the middle on 32.16, \"but by me.\" on 33.81, held for the hit.",
  },
  {
    name: "The end",
    at: [34.48, 35.2],
    on: [34.48],
    music: "the one big hit",
    mark: true,
    why: "A cut to black exactly on the loudest moment, and Purify's mark alone, still. No name, no number, no call to download: this is an edit, not an ad. The mark is all that ties it to the app, and it can go if the edits account should stand apart.",
  },
];
export const SECONDS = 35.2;
for (const f of ROWS) {
  if (f.at[1] <= f.at[0]) fail(`"${f.name}": its time runs backward`);
  if (f.pic && !PICS[f.pic[0]]) fail(`"${f.name}": no such picture`);
}
export const pictureOf = (f) => (f.pic ? PICS[f.pic[0]] : null);

// ── The stage ────────────────────────────────────────────────────────────

const frontDoor = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
const HTML_CLASS = /<html[^>]*class="([^"]*)"/.exec(frontDoor)?.[1] ?? "";
const SHEETS = [...frontDoor.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => m[1]);
if (!SHEETS.length) fail("the front door names no stylesheet");
// Grain: fine noise, drawn by the browser. It is laid over the picture and under the words.
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.18"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`)}")`;

const stagePage = () => `<!doctype html>
<html lang="en" dir="ltr" class="${HTML_CLASS}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${W}, initial-scale=1">
${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); }
  html { scrollbar-gutter: auto; }
  [data-stage] { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background-color: var(--color-night-deep); color: var(--color-paper); }
  /* In a right-to-left page the picture turns over as one. */
  [data-flip] { position: absolute; inset: 0; }
  :root[dir="rtl"] [data-flip] { transform: scaleX(-1); }
  [data-pic] { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  [data-grain], [data-edge], [data-under] { position: absolute; inset: 0; pointer-events: none; }
  [data-grain] { background-image: ${GRAIN}; background-size: 540px 960px; opacity: 0.5; mix-blend-mode: overlay; }
  [data-edge] { background-image: radial-gradient(ellipse 92% 80% at 50% 48%, transparent 38%, color-mix(in srgb, var(--color-night-deep) 88%, transparent) 100%); }
  [data-mark] { position: absolute; left: 0; top: 820px; width: ${W}px; height: 280px; background-color: var(--color-paper); -webkit-mask: url(/purify-cross-mark.png) center / contain no-repeat; mask: url(/purify-cross-mark.png) center / contain no-repeat; }
  [data-words] { position: absolute; inset-inline: 0; box-sizing: border-box; margin: 0; padding: 0 56px; text-align: center; font-family: var(--font-sans); font-weight: 700; line-height: 1.04; letter-spacing: -0.035em; color: var(--color-paper); }
  [data-words] span { display: block; }
  [data-cite] { position: absolute; inset-inline: 0; margin: 0; text-align: center; font-family: var(--font-sans); font-weight: 600; font-size: 44px; letter-spacing: 0.01em; color: var(--color-paper); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main data-stage>
  <div data-flip><img data-pic alt="" src="" hidden><div data-under aria-hidden="true"></div><div data-grain aria-hidden="true"></div><div data-edge aria-hidden="true"></div></div>
  <span data-mark aria-hidden="true" hidden></span>
  <h1 data-words hidden></h1><p data-cite hidden></p>
</main>
<script>
  window.__wear = async (f) => {
    const one = (q) => document.querySelector(q);
    const pic = one("[data-pic]");
    pic.hidden = !f.src;
    if (f.src) {
      if (pic.dataset.src !== f.src) { pic.dataset.src = f.src; pic.src = f.src; await pic.decode().catch(() => {}); }
      const [, zoom, x, y] = f.pic;
      pic.style.objectPosition = x + "% " + y + "%";
      pic.style.transformOrigin = x + "% " + y + "%";
      pic.style.transform = "scale(" + zoom + ")";
      pic.style.filter = (f.grade === "bw" ? "grayscale(1) contrast(1.55) " : "contrast(1.12) saturate(1.05) ") + "brightness(" + f.lit + ")";
    }
    // Under the words the picture is held darker, so the words are read first.
    one("[data-under]").style.backgroundColor = f.words && f.src ? "color-mix(in srgb, var(--color-night-deep) 34%, transparent)" : "transparent";
    one("[data-mark]").hidden = !f.mark;
    const words = one("[data-words]");
    const cite = one("[data-cite]");
    words.hidden = !f.words;
    cite.hidden = !(f.words && f.words.cite);
    if (f.words) {
      const shown = f.words.shown ?? f.words.lines.length;
      words.replaceChildren(...f.words.lines.map((text, n) => {
        const span = Object.assign(document.createElement("span"), { textContent: text });
        span.style.visibility = n < shown ? "visible" : "hidden";
        return span;
      }));
      words.style.top = f.words.y + "px";
      words.style.fontSize = f.words.size + "px";
      cite.textContent = f.words.cite ?? "";
      cite.style.top = f.words.y + f.words.lines.length * f.words.size * 1.04 + 48 + "px";
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
</script>
</body>
</html>`;

async function openStage(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", locale: "en-US" });
  await serveLikeTheShell(ctx, OUT, {});
  const html = stagePage();
  await ctx.route(`${ORIGIN}/__video/**`, (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/__video/stage.html`, { waitUntil: "load" });
  const wear = (f) => page.evaluate((s) => window.__wear(s), { ...f, src: f.pic ? `/${PICS[f.pic[0]][0]}` : null });
  await wear(ROWS[0]);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  });
  await wait(400);
  const face = await page.evaluate(() => {
    const first = getComputedStyle(document.querySelector("[data-words]")).fontFamily.split(",")[0].trim();
    return { first, loaded: document.fonts.check(`700 100px ${first}`) };
  });
  if (!/DM Sans/.test(face.first) || !face.loaded) fail(`the type is not the app's sans, loaded (${JSON.stringify(face)})`);
  const cdp = await ctx.newCDPSession(page);
  const shoot = async () => Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64");
  return { page, wear, shoot };
}

// ── The work ─────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i < 0 ? null : args[i + 1] ?? true;
  };
  const HOME = dir("release", "blackpill-board");
  const browser = await launch();
  const stage = await openStage(browser);
  const only = flag("only") ? [Number(flag("only"))] : ROWS.map((_, i) => i + 1);
  if (flag("check")) {
    const results = [];
    for (const n of only) {
      const f = ROWS[n - 1];
      await stage.wear(f);
      const result = await checkMock(stage.page, "[data-stage]");
      const failures = [...new Set(result.failures.map((x) => `${x.check}${x.palette ? ` (${x.palette})` : ""}: ${x.what}: ${x.detail}`))];
      results.push({ still: n, name: f.name, pass: failures.length === 0, failures });
      console.log(`${failures.length ? "NO  " : "ok  "} ${n} ${f.name}${failures.length ? `\n      ${failures.slice(0, 12).join("\n      ")}` : ""}`);
    }
    fs.writeFileSync(path.join(HOME, "check.json"), JSON.stringify(results, null, 1));
    process.exitCode = results.some((x) => !x.pass) ? 1 : 0;
  } else {
    const small = [];
    for (const n of only) {
      await stage.wear(ROWS[n - 1]);
      const png = await stage.shoot();
      fs.writeFileSync(path.join(HOME, `still-${n}.png`), png);
      await sharp(png).resize(720).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(HOME, `still-${n}.jpg`));
      small.push(await sharp(png).resize(270).toBuffer());
    }
    const cols = Math.min(small.length, 6);
    const file = path.join(HOME, "sheet.jpg");
    await sharp({ create: { width: cols * 276, height: Math.ceil(small.length / cols) * 486, channels: 3, background: "#666" } })
      .composite(small.map((input, i) => ({ input, left: (i % cols) * 276 + 3, top: Math.floor(i / cols) * 486 + 3 })))
      .jpeg({ quality: 82 })
      .toFile(file);
    console.log(file);
  }
  await browser.close();
}
