// A look's room shows on every screen of the export (1.9, the looks:
// app/globals.css, "The looks (1.9)", "The page lets its room through").
//
// A look paints one still picture under the page. Pages repeat the page
// colour on their own sections (bg-night), which would cover it, so one rule
// lets those sections stand clear inside the page, and names what keeps its
// fill: a bar that stays in place, a scrim, a rounded well or field, a label
// set over a line, a set piece that is dark by design. A rule like that is
// only as good as the screens it was tried on. This walks all of them, in a
// look, and measures two things on what is really drawn:
//
//   COVERED   a block in the flow of the page, as wide as the screen and
//             taller than a bar, still painted the page's own colour: the
//             room is hidden behind it.
//   CUT OUT   something the rule made clear that sits on a surface of its
//             own (a card, a panel): it was a patch of page colour on that
//             surface, and now the surface shows through it.
//
// Either fails the walk. One page of every route the export carries, on a
// phone, reached the app's way (scripts/lib/shell-server.mjs), wearing a dark
// look and then a light one. A screen drawn only after a tap (a sheet, a
// menu) is not reached here.
//
// A block that covers the room on purpose is named below with its reason
// (BY_DESIGN), as the stripe test names its dividers, and is listed as
// allowed. A
// box a picture fills is a picture, not a cover.
//
//   npm run build:android, then: node scripts/room-walk.mjs [out dir] [--look athos,rose] [--only /path,/path]

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const argv = process.argv.slice(2);
const take = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const ONLY = take("--only")?.split(",") ?? null;
const LOOKS = (take("--look") ?? "athos,rose").split(",");
const OUT = path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

/** Every page in app/ as its route, groups and private folders left out (the list scripts/stripe-walk.mjs walks). */
function patterns(dir = "app", parts = []) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "api" || name.startsWith("_") || name.startsWith("@") || name === "__tests__") continue;
      out.push(...patterns(full, /^\(.*\)$/.test(name) ? parts : [...parts, name]));
    } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) {
      out.push(parts);
    }
  }
  return out;
}

/** The export's pages, as the app's addresses. */
function exported(dir = OUT, rel = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!fs.statSync(full).isDirectory() || name === "_next") continue;
    const at = `${rel}/${name}`;
    if (fs.existsSync(path.join(full, "index.txt"))) out.push(at);
    out.push(...exported(full, at));
  }
  return out;
}

function screens() {
  const pages = ["/", ...exported().sort()];
  const chosen = [];
  for (const parts of patterns()) {
    const re = new RegExp(
      `^${parts.map((p) => `/${/^\[\[?\.\.\./.test(p) ? ".+" : /^\[.*\]$/.test(p) ? "[^/]+" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).join("")}$`,
    );
    const found = parts.length === 0 ? "/" : pages.find((p) => re.test(p));
    if (found && !chosen.includes(found)) chosen.push(found);
  }
  return chosen.sort().map((p) => (p === "/" ? p : `${p}/`));
}

/** What covers the room by design: its selector, and why. */
const BY_DESIGN = [
  [".dark-island", "a set piece that is dark by design; on a dark look it is the page's own colour"],
  [".step-body", "the page that rises over a step's own room, on Theology's path"],
];

/** What a screen draws over, or cuts out of, its room. Runs in the page. */
function measure(own) {
  const root = document.documentElement;
  const probe = document.createElement("i");
  probe.style.color = getComputedStyle(root).getPropertyValue("--color-night").trim();
  document.body.append(probe);
  const night = getComputedStyle(probe).color;
  probe.remove();
  const clear = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
  const name = (el) => `${el.tagName.toLowerCase()}.${String(el.className).replace(/\s+/g, ".").slice(0, 80)}`;
  const covered = [];
  const cut = [];
  const allowed = [];
  /** A box a picture fills: its ground is under the picture, never seen. */
  const pictured = (el, r) =>
    [...el.querySelectorAll("img, picture, video, canvas")].some((p) => {
      const q = p.getBoundingClientRect();
      return q.width * q.height >= r.width * r.height * 0.8;
    });
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const flow = cs.position === "static" || cs.position === "relative";
    if (flow && cs.backgroundColor === night && r.width >= innerWidth * 0.9 && r.height >= 120 && !pictured(el, r)) {
      const named = own.find(([selector]) => el.matches(selector));
      if (named) allowed.push(`${named[0]}: ${named[1]}`);
      else covered.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    if (el.classList.contains("bg-night") && clear(cs.backgroundColor)) {
      // Cleared by the rule. Is there a surface of its own behind it, inside the page?
      for (let p = el.parentElement; p && p !== document.body && p.tagName !== "MAIN"; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (!clear(ps.backgroundColor) || ps.backgroundImage !== "none") {
          cut.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)} on ${name(p)}`);
          break;
        }
      }
    }
  }
  return { look: root.getAttribute("data-look"), room: getComputedStyle(document.body, "::before").backgroundImage !== "none", covered, cut, allowed };
}

const list = ONLY ?? screens();
console.log(`${list.length} screens on a phone, in ${LOOKS.join(" and ")}`);
// The cloud sessions carry their own Chromium (as openPhone in scripts/mock-check.mjs); elsewhere Playwright's.
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const failures = [];
const allowed = new Map();
let measured = 0;
for (const look of LOOKS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript((id) => {
    try {
      localStorage.setItem("purify:onboarded", "3");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("purify.motion", "off");
      // The app's own way of wearing a look: the reader's stored choice.
      localStorage.setItem("purify.reader.theme", id);
    } catch {}
  }, look);
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  for (const [i, at] of list.entries()) {
    if (i % 25 === 0) console.log(`  ${look}: ${i} of ${list.length}`);
    try {
      await go(page, at, { timeout: 15000 });
      await page.waitForTimeout(1200);
      const found = await page.evaluate(measure, BY_DESIGN);
      measured += 1;
      if (found.look !== look) failures.push(`${look} ${at}: the look is not worn (data-look is ${found.look ?? "absent"})`);
      else if (!found.room) failures.push(`${look} ${at}: the look has no room under the page`);
      for (const a of found.allowed) allowed.set(a, at);
      for (const c of found.covered) failures.push(`${look} ${at}: covered by ${c}`);
      for (const c of found.cut) failures.push(`${look} ${at}: cut out, ${c}`);
    } catch (e) {
      failures.push(`${look} ${at}: the walk could not measure it (${String(e).split("\n")[0].slice(0, 120)})`);
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`\n${measured} screens measured`);
console.log(`\ncovering the room by design, by name and reason (${allowed.size}):`);
for (const [what, at] of allowed) console.log(`  ${what}   (${at})`);
console.log(failures.length ? `\n${failures.length} fault(s):` : "\nthe room shows on every screen, and nothing is cut out of a surface");
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
