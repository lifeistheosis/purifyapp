// A Father's work's pill shows every name whole (1.9; the arbiter, 2026-11-11,
// after checkMock's cut rule found "The unusually short chain of tes..." in
// the pill of St Ignatius's Life). The pill measures its names and steps down,
// for the whole work at once, until none is cut: the names as the reading
// room keeps them, then "Part 3" for a chapter's own title, then a numbered
// name's numbers alone (components/saints/MobileWorkPill.tsx,
// lib/saints/parts.ts pillAt). This walks the export as the app does, with no
// signal, on a phone 320 and 390 wide: every chapter of each work named below
// (Cassian's Conferences, which has hundreds, by its first chapters and its
// longest names), fails on a name the pill cuts or a pill under 44px, checks
// that the contents the name opens still name every chapter in full, and runs
// checkMock's cut rule over the whole screen at 390. Each work stands one kind
// of name through at the level it reaches (by place, or its own numbers; the
// arbiter, 2026-11-11, of Photius), and is opened wide and turned to 320, where
// a name that fitted wide once stayed cut (four Lives, the same day).
//
//   npm run build:android
//   NODE_USE_ENV_PROXY=1 node scripts/work-pill-walk.mjs [--works saint/work,saint/work]
//
// lib/saints/__tests__/pillFits.test.ts holds the levels and the measure.
import fs from "node:fs";
import path from "node:path";

import { checkMock, openPhone } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const at = process.argv.indexOf("--works");
const WORKS =
  at > 0
    ? process.argv[at + 1].split(",")
    : [
        // The three the arbiter named: chapters with titles of their own.
        "ignatius-of-antioch/life-of-ignatius",
        "olympias-the-deaconess/life-of-olympias",
        "photius-the-great/the-bibliotheca",
        // A numbered work whose names were cut at 320 ("Conference 10 · 10", 131px of 96).
        "john-cassian/conferences",
        // A work of one section, whose pill carried the work's whole title.
        "thyrsus-leucius-and-callinicus/martyrdom-of-thyrsus-leucius-and-callinicus",
        // The four Lives checkMock failed on an export with the first of this
        // ("Ecclesiastical History VII.28" cut once the screen narrowed; Fable
        // voices, 2026-11-11), the Life of Acepsimas among them.
        "acepsimas-joseph-and-aithalas/life-of-acepsimas",
        "proclus-of-constantinople/life-of-proclus",
        "frumentius-of-axum/life-of-frumentius",
        "amphilochius-of-iconium/life-of-amphilochius",
      ];
const MOST = 6;

let ok = true;
const say = (label, fine, seen) => {
  console.log(`${fine ? "as meant" : "NOT AS MEANT"}: ${label}${seen === undefined ? "" : ` ${JSON.stringify(seen)}`}`);
  ok = ok && Boolean(fine);
};

const pillName = (page) =>
  page.evaluate(() => {
    const button = document.querySelector("[data-work-pill] [data-pill-name]");
    if (!button) return null;
    const box = button.querySelector("[data-pill-level]");
    const shown = [...(box?.children ?? [])].find((s) => !s.hasAttribute("aria-hidden"));
    const cut = (el) => el.scrollWidth > el.clientWidth + 0.5;
    return {
      text: shown?.textContent.trim() ?? null,
      level: box?.getAttribute("data-pill-level") ?? null,
      cut: [...(box?.children ?? [])].filter(cut).map((el) => el.textContent.trim()),
      aria: button.getAttribute("aria-label"),
      h: Math.round(button.parentElement.getBoundingClientRect().height),
    };
  });

for (const key of WORKS) {
  const work = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "saints", `${key}.json`), "utf8"));
  // A long work: its first chapters, and the chapters whose titles are longest.
  const sections =
    work.sections.length <= MOST
      ? work.sections
      : [...work.sections.slice(0, 3), ...[...work.sections].sort((a, b) => b.title.length - a.title.length).slice(0, 3)];
  for (const width of [320, 390]) {
    const { browser, page } = await openPhone({ scale: 1 });
    await page.setViewportSize({ width, height: 760 });
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await go(page, "/");
    await go(page, `/saints/${key}/`);
    await page.waitForTimeout(1800);
    const seen = [];
    // The chapters the pill names "Part n", in place of their own titles.
    const asParts = [];
    for (const sec of sections) {
      // As the reader turns a chapter (components/saints/useWorkPlace.ts): the address's #s<n>.
      await page.evaluate((n) => {
        window.location.hash = `#s${n}`;
      }, sec.n);
      await page.waitForTimeout(700);
      const p = await pillName(page);
      seen.push(`${p?.text} (${p?.level})`);
      say(`${key} at ${width}, chapter ${sec.n}: the pill's name is whole`, p && p.text && p.cut.length === 0 && p.h >= 44, p);
      // Where the pill says "Part 3", a screen reader still hears the chapter's own title (the work's, for a work of one section).
      // A numbered name ("Codex 6", "Conference 1 · 2") is its full name already, and the contents list it by its number.
      if (p?.text && /^Part \d+$/.test(p.text)) {
        asParts.push(sec);
        const full = work.sections.length === 1 ? work.title : sec.title;
        say(`${key} at ${width}, chapter ${sec.n}: a screen reader hears its full name`, Boolean(p.aria?.includes(full)), p.aria);
      }
    }
    if (width === 390 && work.sections.length > 1 && asParts.length > 0) {
      // The contents the name opens name every chapter in full (their own words, after any numbering).
      await page.click("[data-work-pill] [data-pill-name]");
      await page.waitForTimeout(800);
      const sheet = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
      const missing = asParts.filter((s) => !sheet.includes(s.title.slice(-24))).map((s) => s.n);
      say(`${key}: the contents name in full each chapter the pill calls by its place (${asParts.length})`, missing.length === 0, { missing });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
    if (width === 390) {
      const r = await checkMock(page, "body");
      const cuts = r.failures.filter((f) => f.check === "cut");
      say(`${key}: checkMock finds no name cut on the screen`, cuts.length === 0, cuts.slice(0, 3));
    }
    // One kind of name through the work at the level it stands at (the arbiter, of Photius's
    // "Part 1, Codex 1, Part 3, Codex 6"): all by place, or all the work's own numbers.
    const kinds = new Set(seen.map((x) => (/^Part \d+ /.test(x) ? "place" : /^[0-9IVXLC]+( \u00b7 \d+)? /.test(x) ? "numbers" : "named")));
    const lvl = seen.map((x) => x.match(/\((\d)\)$/)?.[1]);
    if (lvl.every((l) => l && l !== "0")) say(`${key} at ${width}: one kind of name through the work`, kinds.size === 1, [...kinds]);
    console.log(`  ${key} at ${width}: ${seen.join(" | ")}`);
    await browser.close();
  }
  // A turned screen: wide first, where the names may stand whole, then narrow; the pill
  // measures again and no name is cut (a turn left "Ecclesiastical History VII.28" cut).
  {
    const { browser, page } = await openPhone({ scale: 1 });
    await page.setViewportSize({ width: 740, height: 800 });
    await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    await go(page, "/");
    await go(page, `/saints/${key}/`);
    await page.waitForTimeout(1800);
    await page.setViewportSize({ width: 320, height: 760 });
    await page.waitForTimeout(900);
    const p = await pillName(page);
    say(`${key}: turned from 740 to 320, the pill's name is whole`, p && p.text && p.cut.length === 0 && p.h >= 44, p);
    await browser.close();
  }
}
console.log(ok ? "WORK PILL WALK: ALL AS MEANT" : "WORK PILL WALK: SOMETHING NOT AS MEANT");
process.exit(ok ? 0 : 1);
