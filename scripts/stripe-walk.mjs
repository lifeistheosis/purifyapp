// No side stripe on any screen of the export (CLAUDE.md, "No side stripes",
// the owner's word of 2026-11-10; build 89 notes 1 and 5). The code is read by
// lib/ui/__tests__/noSideStripes.test.ts; this reads what the export draws,
// with the measure checkMock's `stripe` uses (scripts/mock-check.mjs,
// stripesOn): a border on one side only around words, or a thin bar down a
// box's edge, whatever stylesheet or class drew it.
//
// One page of every route the export carries, on a phone and on a tablet,
// reached the app's way (scripts/lib/shell-server.mjs: a cold start at the
// front door, then the router, nothing from outside the bundle). A true
// divider says so on itself, with its reason, and is listed as allowed:
//   data-mock-allow="stripe" data-mock-why="the month grid's lines"
// Any other stripe fails the walk. Screens drawn only after a tap (a sheet, a
// menu) are not reached here; the test reads their code.
//
//   npm run build:android, then: node scripts/stripe-walk.mjs [out dir] [--only /path,/path]

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { assertMotion, motionOptions, motionWords, pinMotion } from "./lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";
import { stripesOn } from "./mock-check.mjs";

const argv = process.argv.slice(2);
const onlyAt = argv.indexOf("--only");
const ONLY = onlyAt >= 0 ? argv.splice(onlyAt, 2)[1].split(",") : null;
const OUT = path.resolve(argv[0] ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

/** Every page in app/ as its route: /saints/[slug] and the rest, groups and private folders left out. */
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

/** The export's pages, as the app's addresses: every folder with its payload, and the front door. */
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
  // The export's addresses end in a slash (trailingSlash), as the router reports them.
  return chosen.sort().map((p) => (p === "/" ? p : `${p}/`));
}

const SIZES = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
];

const list = ONLY ?? screens();
console.log(`${list.length} screens, on ${SIZES.map((s) => s.name).join(" and ")}, ${motionWords("on")}`);
// The cloud sessions carry their own Chromium (as openPhone in scripts/mock-check.mjs); elsewhere Playwright's.
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const failures = [];
const allowed = new Map();
let measured = 0;
for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  await serveLikeTheShell(ctx, OUT, {});
  const page = await ctx.newPage();
  for (const [i, at] of list.entries()) {
    if (i % 25 === 0) console.log(`  ${size.name}: ${i} of ${list.length}`);
    try {
      await go(page, at, { timeout: 15000 });
      await page.waitForTimeout(1500);
      // Walked with the app's motion on, as he walks it (the arbiter, 2026-11-13).
      const wrong = await assertMotion(page, "on");
      if (wrong) throw new Error(wrong);
      const stripes = await stripesOn(page, "body");
      if (!stripes) continue;
      measured += 1;
      for (const s of stripes) {
        if (s.allow) allowed.set(`${s.name}: ${s.allow}`, at);
        else failures.push(`${size.name} ${at}: ${s.name}, ${s.how}`);
      }
    } catch (e) {
      failures.push(`${size.name} ${at}: the walk could not measure it (${String(e).split("\n")[0].slice(0, 120)})`);
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`\n${measured} screens measured`);
console.log(`\nallowed, by name and reason (${allowed.size}):`);
for (const [what, at] of allowed) console.log(`  ${what}   (${at})`);
console.log(failures.length ? `\n${failures.length} side stripe(s):` : "\nno side stripe on any screen");
for (const f of failures) console.log(`  ${f}`);
process.exit(failures.length ? 1 : 0);
