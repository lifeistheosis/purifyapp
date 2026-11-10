// The prayer page's ground on every palette (1.9, build 90 note 8).
//
// His words on build 90: "let's change the background design also. Like,
// make it more, like, fit the theme the user picked." Until then the page
// laid one neutral light over every palette: its own icon, large, blurred
// and grey, with a white breath over it. Now the ground is the palette's
// own, whole, and the light behind the prayer is the palette's own light, a
// soft pool or nothing (app/globals.css, "While you pray";
// components/prayers/service/PrayerLight.tsx).
//
// lib/prayers/__tests__/prayerLight.test.ts does the sums. This measures
// what is drawn, on the native export, because a pool of light, a look's
// picture and a line stepped back are three things no box's colour says.
// On every palette of the registry (25 today):
//
//   WORDS    every word of the page against the pixels behind it
//            (scripts/lib/pixel-audit.mjs), 4.5:1 or more, 3:1 for large
//            type: The First Hour, the morning rule, the Akathist and a
//            reader's own rule, each from its head to its end, with motion
//            on, so the prayers around the one being prayed are stepped
//            back. A word crosses the light as the page scrolls, so the
//            light is held at its fullest behind every word: the pool and
//            the breath, or a fast's colour, as they are at their centre,
//            over the whole screen. A look's foot is its own matter: a line
//            passing through it is on its way out, one that rests in its
//            first quarter at the page's end is held, and the walk says how
//            far in the last line rests (scripts/lib/pixel-audit.mjs;
//            scripts/scene-check.mjs holds the picture alone).
//   GROUND   mid-prayer, with the words taken out: on a plain palette the
//            screen's edges are the palette's own colour (black on True
//            black), paper has no shade on it, and on a look the page is
//            pixel for pixel what it is with no light at all. On the six
//            plain dark palettes the pool is there, where the prayer is
//            read, and reaches neither the head nor the foot of the screen.
//   STILL    nothing drifts on a look or on paper: two pictures of the
//            screen a moment apart are one picture. With motion off nothing
//            drifts on any palette and no line steps back.
//   FASTS    Candlelight in each of the Church's three long fasts (the
//            phone's clock set to a day of each) says the season on the
//            root, shows the fast's light in the room and neither pool nor
//            breath; an ordinary day, the switch off, or another palette
//            says none; and the season follows a reader from a prayer to a
//            chapter and back, and leaves with them.
//   ARABIC   The First Hour again with the app in Arabic, right to left.
//
// The chant's own question ("Pray with chant?", the player's, once a day on
// its own clock) is left on where words are measured, so its card is held
// to its pixels while it is up, and turned off the way a reader turns it
// off where two pictures of the screen are compared: it puts itself away
// after fifteen seconds, which is not the ground moving.
//
// Easy Scroll's snapping is held off for the walk: it measures what is
// drawn at every place down the page, not how the page comes to rest
// (that is Easy Scroll's own walk). A page is only said to be walked if
// the places measured cover it from its first line to its last.
//
//   npm run build:android, then:
//   node scripts/prayer-ground-walk.mjs [--only Dark,Monastery] [--page first-hour,morning] [--part words,ground,still,fasts,arabic]

import fs from "node:fs";

import sharp from "sharp";

import { READING_THEMES, themeAttributes } from "../lib/reader/readingModes.ts";
import { audit } from "./lib/pixel-audit.mjs";
import { go } from "./lib/shell-server.mjs";
import { openPhone } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const take = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const ONLY = take("--only")?.split(",") ?? null;
const PAGE_ONLY = take("--page")?.split(",") ?? null;
const PARTS = take("--part")?.split(",") ?? ["words", "ground", "still", "fasts", "arabic"];

const W = 390;
const H = 844;
/** How far the walk moves between two places it measures: under half of what is in sight, so every line is met twice. */
const STEP = 330;
/** A palette put on cross-fades its colours; nothing is measured until it has. */
const SETTLE = 1100;

const PAGES = [
  ["first-hour", "The First Hour", "/prayers/hours/first-hour/"],
  ["morning", "the morning rule", "/prayers/morning/"],
  ["akathist", "the Akathist", "/prayers/akathists/theotokos/"],
  ["mine", "a reader's own rule", "/prayers/personal/morning/"],
].filter(([id]) => !PAGE_ONLY || PAGE_ONLY.includes(id));

/** A reader's own morning rule, as lib/prayers/myRule.ts keeps it: five prayers of the Morning Rule. */
const MINE = JSON.stringify({
  v: 1,
  morning: ["heavenly-king", "trisagion", "our-father", "creed", "rising-from-sleep"].map((prayer) => ({ kind: "prayer", rule: "morning", prayer })),
  evening: [],
  minutes: { morning: 6, evening: 0 },
  updatedAt: "2026-11-10T00:00:00.000Z",
});

const THEMES = READING_THEMES.map((theme) => {
  const { mode, look } = themeAttributes(theme.id);
  // What the light behind the prayer is on this palette: a pool on a plain dark one, nothing on a look or on paper.
  const kind = look ? "look" : mode === "parchment" ? "paper" : "pool";
  return { id: theme.id, label: theme.label, mode: mode ?? null, look: look ?? null, kind };
}).filter((theme) => !ONLY || ONLY.includes(theme.label));

const SHEET = fs.readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/**
 * A look's foot, as two shares of the screen (scripts/lib/pixel-audit.mjs says why two): where it
 * begins (--foot-clear from the screen's foot) and where it is a quarter drawn (72 percent of
 * that, the line scripts/scene-check.mjs holds the picture to). Null for a look with no foot.
 */
function footOf(look) {
  if (!look) return null;
  const hasFoot = !/html\[data-look\]:not\(([^)]*)\) body::after/.exec(SHEET)?.[1].includes(`[data-look="${look}"]`);
  const clear = hasFoot ? parseFloat(new RegExp(`html\\[data-look="${look}"\\] \\{[^}]*--foot-clear:\\s*(\\d+)px`).exec(SHEET)?.[1] ?? "0") : 0;
  return clear ? { begins: (H - clear) / H, quarter: (H - clear * 0.72) / H } : null;
}

let failed = 0;
const say = (ok, what, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${detail ? `: ${detail}` : ""}`);
  return ok;
};
const rgb = (c) => `rgb(${c.join(", ")})`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** Put a palette on the page as the app does (its mode, and its look or none), and wait for it to settle. */
async function wear(page, theme) {
  await page.evaluate(
    ([m, l]) => {
      const h = document.documentElement;
      if (m) h.setAttribute("data-reading-mode", m);
      else h.removeAttribute("data-reading-mode");
      if (l) h.setAttribute("data-look", l);
      else h.removeAttribute("data-look");
    },
    [theme.mode, theme.look],
  );
  await page.waitForTimeout(SETTLE);
}

/**
 * Every light behind the prayer held at its fullest over the whole screen:
 * the colour each has at its centre, laid flat. A word that reads on this
 * reads wherever it stands when it crosses the light. Returns what was held.
 */
async function fullest(page) {
  const held = await page.evaluate(() => {
    /** The first colour of a gradient as the browser wrote it out: its centre. */
    const centre = (image) => {
      const at = image.search(/(rgba?|color|color-mix)\(/);
      if (at < 0) return null;
      let depth = 0;
      for (let i = image.indexOf("(", at); i < image.length; i++) {
        if (image[i] === "(") depth++;
        else if (image[i] === ")" && --depth === 0) return image.slice(at, i + 1);
      }
      return null;
    };
    // The palette before's flat light goes first, or its colour would be read as this one's.
    document.getElementById("walk-fullest")?.remove();
    const rules = [];
    const names = [];
    for (const [selector, name] of [[".prayer-light", "the pool"], [".prayer-light-breath", "the breath"]]) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const colour = cs.display === "none" ? null : centre(cs.backgroundImage);
      if (!colour) continue;
      rules.push(`${selector} { background: ${colour} !important; animation: none !important; transform: none !important; }`);
      names.push(`${name} ${colour}`);
    }
    if (document.documentElement.hasAttribute("data-candle-season")) {
      const room = getComputedStyle(document.body, "::before");
      const colour = room.content === "none" ? null : centre(room.backgroundImage);
      if (colour) {
        rules.push(`html[data-candle-season] body::before { background: ${colour} !important; }`);
        names.push(`the fast's light ${colour}`);
      }
    }
    if (rules.length) {
      const style = document.createElement("style");
      style.id = "walk-fullest";
      style.textContent = rules.join("\n");
      document.head.append(style);
    }
    return names;
  });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return held;
}

/** The places down the page the walk measures, and the band of each the audit reads (from under the top bar to the bars or a look's foot). */
async function places(page, look) {
  const f = await page.evaluate(() => {
    const top = [...document.querySelectorAll("[class*='sticky']")].map((el) => el.getBoundingClientRect()).filter((r) => r.top <= 0 && r.width > 300 && r.height < 120);
    const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
    const lines = [...document.querySelectorAll("[data-prayer-reader] [data-line]")].map((el) => el.getBoundingClientRect());
    return {
      max: document.documentElement.scrollHeight - innerHeight,
      bandTop: Math.max(0, ...top.map((r) => r.bottom)),
      barTop: bar ? bar.top - 6 : innerHeight,
      first: lines.length ? Math.min(...lines.map((r) => r.top)) + scrollY : null,
      last: lines.length ? Math.max(...lines.map((r) => r.bottom)) + scrollY : null,
      lines: lines.length,
    };
  });
  const foot = footOf(look);
  // While the page can still rise, a line is held above where the foot begins; at its end, down to the foot's quarter.
  const bandFoot = Math.min(f.barTop, foot ? H * foot.begins : Infinity);
  const restFoot = Math.min(f.barTop, foot ? H * foot.quarter : Infinity);
  const stops = [];
  for (let y = 0; y < f.max; y += STEP) stops.push(y);
  stops.push(Math.max(0, f.max));
  return { ...f, stops, bandTop: f.bandTop, bandFoot, restFoot, foot };
}

/** One page on one palette, head to end: every word against its pixels, and whether the places measured cover the page. */
async function walkWords(page, theme) {
  await page.evaluate(() => scrollTo(0, 0));
  await wear(page, theme);
  const held = await fullest(page);
  const plan = await places(page, theme.look);
  let words = 0;
  // The lowest of the small type (held to 4.5:1) and of the large (a prayer's name; held to 3:1).
  const lowest = { ratio: Infinity, text: "" };
  const names = { ratio: Infinity, text: "" };
  const short = new Map();
  // What has been measured so far, in the page's own coordinates: the bands must meet from the first line to the last.
  let covered = plan.first;
  let gap = null;
  for (const y of plan.stops) {
    await page.evaluate((to) => scrollTo(0, to), y);
    await page.waitForTimeout(520);
    const at = await page.evaluate(() => scrollY);
    const px = await audit(page, { footShare: plan.foot?.quarter ?? null, fadeShare: plan.foot?.begins ?? null });
    words += px.words;
    if (px.small.ratio < lowest.ratio) Object.assign(lowest, { ratio: px.small.ratio, text: String(px.small.text).slice(0, 28) });
    if (px.large.ratio < names.ratio) Object.assign(names, { ratio: px.large.ratio, text: String(px.large.text).slice(0, 28) });
    for (const s of px.short) {
      const key = String(s.text).slice(0, 28);
      if (!short.has(key) || short.get(key) > s.ratio) short.set(key, s.ratio);
    }
    if (plan.first !== null) {
      if (at + plan.bandTop > covered + 1 && gap === null) gap = [Math.round(covered), Math.round(at + plan.bandTop)];
      covered = Math.max(covered, at + (at >= plan.max - 1 ? plan.restFoot : plan.bandFoot));
    }
  }
  const whole = plan.first !== null && gap === null && covered >= plan.last - 1;
  // How the page's last line rests on a look: clear of the foot, or how far into its first quarter.
  const rests = plan.foot && plan.last !== null ? Math.round(plan.last - plan.max - H * plan.foot.begins) : null;
  return { words, lowest, names, short: [...short.entries()].sort((a, b) => a[1] - b[1]), held, whole, gap, plan, covered, rests };
}

/** The screen with its words, lines and pictures taken out: only the ground. */
async function ground(page, extra = "") {
  const tag = await page.addStyleTag({
    content: `*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; border-color: transparent !important; caret-color: transparent !important; transition: none !important; } svg, img { visibility: hidden !important; } ${extra}`,
  });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const { data, info } = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  await tag.evaluate((n) => n.remove());
  const k = info.width / W;
  return {
    data,
    info,
    at: (x, y) => {
      const i = (Math.round(y * k) * info.width + Math.round(x * k)) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    },
  };
}

/** The rows of the screen on which two pictures of it differ, first and last, or null if they are one picture. */
function differ(a, b) {
  let first = null;
  let last = null;
  let count = 0;
  for (let y = 0; y < a.info.height; y++) {
    for (let x = 0; x < a.info.width; x++) {
      const i = (y * a.info.width + x) * a.info.channels;
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) {
        if (first === null) first = y;
        last = y;
        count++;
      }
    }
  }
  return count ? { first, last, count } : null;
}

/** Into the prayers, so the reader is following and the lines around the lit one are stepped back. */
async function midPrayer(page) {
  await page.evaluate(() => {
    const steps = document.querySelectorAll("[data-prayer-reader] [data-step]");
    (steps[2] ?? steps[steps.length - 1])?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(900);
}

const NO_SNAP = "html { scroll-snap-type: none !important; }";
const open = async (set = {}) => {
  const phone = await openPhone({ scale: 1, set: { "purify.prayers.mine": MINE, ...set } });
  phone.errors = [];
  phone.page.on("pageerror", (e) => phone.errors.push(String(e).slice(0, 160)));
  return phone;
};
const arrive = async (page, route) => {
  await go(page, route);
  await page.waitForSelector("[data-prayer-reader] [data-line]", { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: NO_SNAP });
};

const tally = [];
const light = (held) => (held.length === 2 ? "the pool and the breath" : (held[0] ?? "").split(" rgb")[0].split(" color")[0]);
/** One walk of a page in a line: how many words, the lowest of each kind, and what light they were held to. */
const told = (r) =>
  `${String(r.words).padStart(5)} words at ${r.plan.stops.length} places, lowest ${r.lowest.ratio.toFixed(2)}:1 ("${r.lowest.text}")` +
  (Number.isFinite(r.names.ratio) ? `, a prayer's name ${r.names.ratio.toFixed(2)}:1` : "") +
  (r.held.length ? `, held to ${light(r.held)} at the fullest` : "") +
  (r.rests !== null && r.rests > 0 ? `; the last line rests ${r.rests}px into the foot` : "");

// WORDS: every page, every palette, head to end.
if (PARTS.includes("words")) {
  const { browser, page, errors } = await open();
  for (const [, name, route] of PAGES) {
    await arrive(page, route);
    console.log(`\nWORDS  ${name} (${route})`);
    for (const theme of THEMES) {
      const r = await walkWords(page, theme);
      const where = r.whole ? "" : r.gap ? `; NOT WALKED WHOLE: nothing measured between ${r.gap[0]} and ${r.gap[1]} of the page` : `; NOT WALKED WHOLE: measured to ${Math.round(r.covered)}, the last line ends at ${Math.round(r.plan.last ?? 0)}`;
      const under = r.short.slice(0, 4).map(([t, ratio]) => `"${t}" ${ratio.toFixed(2)}`).join("; ");
      say(r.short.length === 0 && r.whole && r.words > 0, `${theme.label.padEnd(14)} ${told(r)}`, `${under}${where}`.replace(/^; /, ""));
      tally.push({ page: name, label: theme.label, lowest: r.lowest.ratio, names: r.names.ratio, short: r.short.length, words: r.words, rests: r.rests });
    }
  }
  say(errors.length === 0, "no error was thrown on any of the pages", errors.slice(0, 3).join(" | "));
  await browser.close();
}

/** The chant's question turned off, as a reader turns it off in the chant picker (lib/player/chantAsk.ts). */
const NO_QUESTION = { "purify:chant.ask": "off" };

// GROUND and STILL: The First Hour, mid-prayer, as it is drawn.
if (PARTS.includes("ground") || PARTS.includes("still")) {
  const { browser, page } = await open(NO_QUESTION);
  await arrive(page, "/prayers/hours/first-hour/");
  await midPrayer(page);
  console.log("\nGROUND and STILL  The First Hour, mid-prayer, as it is drawn");
  for (const theme of THEMES) {
    await wear(page, theme);
    const facts = await page.evaluate(() => {
      const of = (selector) => {
        const el = document.querySelector(selector);
        const cs = el ? getComputedStyle(el) : null;
        return cs ? { display: cs.display, image: cs.backgroundImage, filter: cs.filter, animation: cs.animationName, state: cs.animationPlayState } : null;
      };
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const cx = cv.getContext("2d");
      cx.fillStyle = getComputedStyle(document.documentElement).backgroundColor;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return { pool: of(".prayer-light"), breath: of(".prayer-light-breath"), page: [d[0], d[1], d[2]], following: document.querySelector("[data-prayer-reader]")?.hasAttribute("data-following") };
    });
    const shown = (f) => Boolean(f) && f.display !== "none";
    if (PARTS.includes("ground")) {
      // The breath held where it rests, so the two pictures differ by the light alone.
      const rest = ".prayer-light-breath { animation: none !important; }";
      const drawn = await ground(page, rest);
      const bare = await ground(page, `${rest} .prayer-light, .prayer-light-breath { display: none !important; }`);
      const edges = [[12, 130], [W - 12, 130], [12, 640], [W - 12, 640]].map(([x, y]) => drawn.at(x, y));
      const centre = drawn.at(W / 2, 340);
      const over = differ(drawn, bare);
      if (theme.kind === "pool") {
        const k = drawn.info.height / H;
        say(
          shown(facts.pool) && shown(facts.breath) && facts.pool.image.includes("radial-gradient") && !/url\(|conic/.test(facts.pool.image + facts.breath.image) && facts.pool.filter === "none" && facts.breath.filter === "none",
          `${theme.label.padEnd(14)} a pool and its breath, each a plain soft gradient: no picture, no blur, no rays`,
          JSON.stringify({ pool: facts.pool?.display, breath: facts.breath?.display }),
        );
        say(edges.every((e) => same(e, facts.page)), `${" ".repeat(14)} the screen's edges are the palette's own ${rgb(facts.page)}`, edges.map(rgb).join(" "));
        say(lum(centre) > lum(facts.page), `${" ".repeat(14)} where the prayer is read the ground is ${rgb(centre)}: the pool is there`);
        say(Boolean(over) && over.first / k > 100 && over.last / k < 580, `${" ".repeat(14)} the light reaches neither the head nor the foot of the screen`, over ? `it lies between ${Math.round(over.first / k)}px and ${Math.round(over.last / k)}px of ${H}` : "no light was drawn");
      } else {
        say(!shown(facts.pool) && !shown(facts.breath), `${theme.label.padEnd(14)} no pool and no breath (${theme.kind === "look" ? "a look: its picture is its sign" : "paper: light cannot glow on it"})`, JSON.stringify({ pool: facts.pool?.display, breath: facts.breath?.display }));
        say(over === null, `${" ".repeat(14)} the page is pixel for pixel what it is with no light at all; at the edge ${rgb(edges[0])}, where the prayer is read ${rgb(centre)}`, over ? `${over.count} pixels differ` : "");
        if (theme.kind === "paper") say(edges.every((e) => same(e, facts.page)) && same(centre, facts.page), `${" ".repeat(14)} paper has no shade on it: ${rgb(facts.page)} at the edges and where the prayer is read`, `${edges.map(rgb).join(" ")} ${rgb(centre)}`);
      }
    }
    if (PARTS.includes("still")) {
      if (theme.kind === "pool") {
        say(facts.breath?.animation === "prayer-light-drift" && facts.breath.state === "running", `${theme.label.padEnd(14)} the slow breath drifts while motion is on`, JSON.stringify(facts.breath));
      } else {
        // The words were taken out for the ground and are fading back in: the page is left to come to rest first.
        await page.waitForTimeout(SETTLE);
        const a = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        await page.waitForTimeout(1500);
        const b = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const moved = differ(a, b);
        say(moved === null, `${theme.label.padEnd(14)} nothing moves: two pictures of the screen a moment apart are one picture`, moved ? `${moved.count} pixels changed, rows ${moved.first} to ${moved.last}` : "");
      }
    }
    if (theme === THEMES[0]) say(facts.following === true, `${" ".repeat(14)} (the reader is following: the prayers around the one being prayed are stepped back)`);
  }
  // The lit line's glow is the palette's ink, never a colour typed into the stylesheet.
  if (PARTS.includes("ground")) {
    for (const theme of THEMES.filter((t) => t.mode !== "parchment")) {
      await wear(page, theme);
      const glow = await page.evaluate(() => {
        const line = document.querySelector("[data-prayer-reader] [data-line][data-lit]");
        if (!line) return null;
        const cv = document.createElement("canvas");
        cv.width = cv.height = 1;
        const cx = cv.getContext("2d");
        // A colour the canvas cannot read paints black, never the colour before it.
        const paint = (c) => {
          cx.clearRect(0, 0, 1, 1);
          cx.fillStyle = "#000";
          cx.fillStyle = c;
          cx.fillRect(0, 0, 1, 1);
          return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const shadow = getComputedStyle(line).textShadow;
        const colour = /(rgba?|color)\([^)]*\)/.exec(shadow)?.[0] ?? null;
        // The glow's colour with its strength taken out, beside the palette's ink as the browser resolves it.
        const solid = colour ? colour.replace(/\/\s*[\d.]+\s*\)/, ")").replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, "rgb($1,$2,$3)") : null;
        const probe = document.createElement("span");
        probe.style.color = "var(--color-paper)";
        document.body.append(probe);
        const ink = getComputedStyle(probe).color;
        probe.remove();
        return { shadow, glow: solid ? paint(solid) : null, ink: paint(ink) };
      });
      const close = glow?.glow && glow.glow.every((v, i) => Math.abs(v - glow.ink[i]) <= 1);
      say(Boolean(close), `${theme.label.padEnd(14)} the lit line glows in the palette's own ink ${glow?.ink ? rgb(glow.ink) : ""}`, glow ? glow.shadow : "no line is lit");
    }
  }
  await browser.close();
}

// STILL, with the app's motion off: nothing drifts on any palette, and no line steps back.
if (PARTS.includes("still")) {
  const { browser, page } = await open({ ...NO_QUESTION, "purify.motion": "off" });
  await arrive(page, "/prayers/hours/first-hour/");
  await midPrayer(page);
  console.log("\nSTILL  The First Hour with the app's motion off");
  for (const theme of THEMES.filter((t) => t.kind === "pool")) {
    await wear(page, theme);
    const f = await page.evaluate(() => {
      const breath = document.querySelector(".prayer-light-breath");
      const lines = [...document.querySelectorAll("[data-prayer-reader] [data-line], [data-prayer-reader] [data-step] > h2")];
      return {
        animation: breath ? getComputedStyle(breath).animationName : null,
        following: document.querySelector("[data-prayer-reader]")?.hasAttribute("data-following"),
        steppedBack: lines.filter((el) => Number(getComputedStyle(el).opacity) < 1).length,
        lines: lines.length,
      };
    });
    const a = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    await page.waitForTimeout(1500);
    const b = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const moved = differ(a, b);
    say(f.animation === "none" && moved === null && f.steppedBack === 0 && f.lines > 0, `${theme.label.padEnd(14)} the breath is still, the screen does not change, and all ${f.lines} lines stand at full strength`, JSON.stringify({ ...f, moved }));
  }
  await browser.close();
}

// FASTS: Candlelight keeps the season on a prayer page (his call 2).
if (PARTS.includes("fasts") && (!ONLY || ONLY.includes("Candlelight"))) {
  const candle = { id: "candlelight", label: "Candlelight", mode: "candlelight", look: null, kind: "pool" };
  const DAYS = [
    ["an ordinary day in July", "2027-07-10T09:00:00", null],
    ["a Thursday in Great Lent", "2027-03-25T21:00:00", "lent"],
    ["the Nativity Fast", "2026-12-01T21:00:00", "nativity"],
    ["the Dormition Fast", "2027-08-05T21:00:00", "dormition"],
  ];
  const facts = (page) =>
    page.evaluate(() => {
      const root = document.documentElement;
      const room = getComputedStyle(document.body, "::before");
      const pool = document.querySelector(".prayer-light");
      const breath = document.querySelector(".prayer-light-breath");
      return {
        mode: root.getAttribute("data-reading-mode"),
        season: root.getAttribute("data-candle-season"),
        room: room.content !== "none" && room.backgroundImage.includes("radial-gradient"),
        pool: pool ? getComputedStyle(pool).display !== "none" : null,
        breath: breath ? getComputedStyle(breath).display !== "none" : null,
        veil: Boolean(document.querySelector(".candle-veil")),
      };
    });
  console.log("\nFASTS  Candlelight on The First Hour, the phone's clock set to a day of each season");
  for (const [what, when, want] of DAYS) {
    const { browser, page, errors } = await open({ "purify.reader.theme": "candlelight", "purify.intro.day": when.slice(0, 10) });
    await page.clock.setFixedTime(new Date(when));
    await arrive(page, "/prayers/hours/first-hour/");
    const f = await facts(page);
    say(
      f.mode === "candlelight" && f.season === want && (want ? f.room && f.pool === false && f.breath === false : f.pool === true && f.breath === true),
      `${what}: ${want ? `the root says ${want}, the fast's light is in the room, and neither pool nor breath is drawn` : "no season; the candle's own pool and breath"}`,
      JSON.stringify(f),
    );
    const r = await walkWords(page, candle);
    const again = await facts(page);
    say(r.short.length === 0 && r.whole && again.season === want, `${" ".repeat(4)}every word, head to end: ${told(r).trim()}`, r.short.slice(0, 4).map(([t, ratio]) => `"${t}" ${ratio.toFixed(2)}`).join("; ") + (r.whole ? "" : " NOT WALKED WHOLE"));
    if (want === "lent") {
      // A reader goes from a prayer straight to a chapter and back: both pages say the season.
      await go(page, "/bible/john/1/");
      await page.waitForSelector(".candle-veil", { timeout: 30000 });
      await page.waitForTimeout(1500);
      const bible = await facts(page);
      say(bible.season === "lent" && bible.veil, `${" ".repeat(4)}from the prayer to a chapter of the Bible: the season is still said, by the veil now`, JSON.stringify(bible));
      await arrive(page, "/prayers/hours/first-hour/");
      await page.waitForTimeout(1200);
      const back = await facts(page);
      say(back.season === "lent" && !back.veil && back.pool === false, `${" ".repeat(4)}and back to the prayer: still said`, JSON.stringify(back));
      await go(page, "/");
      await page.waitForTimeout(2500);
      const away = await facts(page);
      say(away.season === null && away.mode === "candlelight", `${" ".repeat(4)}on Today the root says no season: it left with the page`, JSON.stringify(away));
    }
    say(errors.length === 0, `${" ".repeat(4)}no error was thrown`, errors.slice(0, 3).join(" | "));
    await browser.close();
  }
  // What does not keep the season: the switch off, and another palette. And what does: Candlelight
  // worn at Vespers over a reader's own Dark (the palette worn decides, not the one stored).
  for (const [what, set, want] of [
    ["Great Lent with \"Candlelight keeps the season\" off", { "purify.reader.theme": "candlelight", "purify.reader.candleSeason": "0" }, null],
    ["Great Lent in Dark", {}, null],
    ["Great Lent in Dark with Candlelight at Vespers on, after sunset", { "purify.reader.vespers": "1" }, "lent"],
  ]) {
    const { browser, page } = await open({ ...set, "purify.intro.day": "2027-03-25" });
    await page.clock.setFixedTime(new Date("2027-03-25T21:00:00"));
    await arrive(page, "/prayers/hours/first-hour/");
    await page.waitForTimeout(1500);
    const f = await facts(page);
    if (want) say(f.mode === "candlelight" && f.season === want && f.room && f.pool === false, `${what}: Candlelight is worn, and the season is said`, JSON.stringify(f));
    else say(f.season === null && f.pool === true && f.breath === true, `${what}: no season is said, and the palette's own pool and breath are drawn`, JSON.stringify(f));
    await browser.close();
  }
}

// ARABIC: The First Hour with the app in Arabic.
if (PARTS.includes("arabic")) {
  const { browser, page, errors } = await open({ "CapacitorStorage.purify_locale": "ar" });
  await arrive(page, "/prayers/hours/first-hour/");
  const dir = await page.evaluate(() => document.documentElement.dir);
  console.log("\nARABIC  The First Hour with the app in Arabic");
  say(dir === "rtl", "the page reads right to left", `dir="${dir}"`);
  for (const theme of THEMES) {
    const r = await walkWords(page, theme);
    say(r.short.length === 0 && r.whole && r.words > 0, `${theme.label.padEnd(14)} ${told(r)}`, r.short.slice(0, 4).map(([t, ratio]) => `"${t}" ${ratio.toFixed(2)}`).join("; ") + (r.whole ? "" : " NOT WALKED WHOLE"));
    tally.push({ page: "The First Hour in Arabic", label: theme.label, lowest: r.lowest.ratio, names: r.names.ratio, short: r.short.length, words: r.words, rests: r.rests });
  }
  say(errors.length === 0, "no error was thrown", errors.slice(0, 3).join(" | "));
  await browser.close();
}

if (tally.length) {
  const by = new Map();
  for (const t of tally) {
    const now = by.get(t.label);
    if (!now || t.lowest < now.lowest) by.set(t.label, t);
  }
  console.log("\nThe lowest word on each palette, over every page walked (small type, held to 4.5:1), and the lowest of a prayer's names (large type, held to 3:1):");
  for (const [label, t] of by) {
    const names = Math.min(...tally.filter((x) => x.label === label).map((x) => x.names));
    console.log(`  ${label.padEnd(14)} ${t.lowest.toFixed(2)}:1 (${t.page})${Number.isFinite(names) ? `; names ${names.toFixed(2)}:1` : ""}`);
  }
  console.log(`  ${tally.reduce((n, t) => n + t.words, 0)} words measured in all`);
}
console.log(failed ? `\n${failed} thing(s) on the prayer page's ground are not as note 8 says` : "\nthe prayer page's ground is the palette's own on every palette, and every word on it reads");
process.exit(failed ? 1 : 0);
