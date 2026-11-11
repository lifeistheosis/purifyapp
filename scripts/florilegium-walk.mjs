// The Florilegium's two of build 93 note 19, watched on the export.
//
// His words: "I'm not sure why the Your Flor Gelium just is the song of the
// Theotokos. Also, when you click the verse in the Florigelium, it just
// takes you to the book. It doesn't take you to the actual verse."
//
//   npm run build:android          (writes out/)
//   node scripts/florilegium-walk.mjs [folder for stills]
//
// What it holds:
//   - a verse tapped on a gathering's page opens the Bible at that verse: the
//     address ends in the verse, the verse is in sight between the bars, and
//     it is lit (the others step back) while the reader finds it;
//   - Today, for a reader who has kept a starter and gathered nothing else,
//     heads the starter's verse "The Florilegium", not "Your Florilegium";
//   - Today, once they have gathered a line of their own, shows theirs, under
//     "Your Florilegium".
// The words and the pure rules are in lib/florilegium/__tests__ (href and
// todayLine). Exit 1 when anything fails.

import fs from "node:fs";
import path from "node:path";

import { openPhone } from "./mock-check.mjs";
import { go } from "./lib/shell-server.mjs";

const stills = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
if (stills) fs.mkdirSync(stills, { recursive: true });

const en = JSON.parse(fs.readFileSync(path.resolve("lib/i18n/messages/en.json"), "utf8"));
const starter = JSON.parse(fs.readFileSync(path.resolve("data/florilegium/starters.json"), "utf8")).starters.find((s) => s.id === "magnificat");
const sung = JSON.parse(fs.readFileSync(path.resolve(`data/bible/${starter.book}/${starter.chapter}.json`), "utf8")).verses;

/** The Song of the Theotokos as Keep writes it into a reader's gatherings (lib/florilegium/starters.ts, starterItems). */
const kept = {
  id: "walk-song",
  title: en["study.florilegium.starter.magnificat"],
  description: "Luke 1:46-55",
  createdAt: 100,
  updatedAt: 100,
  items: [...starter.lines].reverse().map((l, i) => ({
    id: `walk-song-${l.verse}`,
    addedAt: 100 + i,
    kind: "scripture",
    text: sung.find((v) => v.n === l.verse).text,
    reference: `Luke ${starter.chapter}:${l.verse}`,
    book: starter.book,
    chapter: starter.chapter,
    verse: l.verse,
  })),
};
/** And a gathering of the reader's own: one verse they gathered by hand. */
const light = JSON.parse(fs.readFileSync(path.resolve("data/bible/john/1.json"), "utf8")).verses.find((v) => v.n === 5);
const own = { id: "walk-own", title: "On the light", createdAt: 200, updatedAt: 200, items: [{ id: "walk-own-line", addedAt: 200, kind: "scripture", text: light.text, reference: "John 1:5", book: "john", chapter: 1, verse: 5 }] };

let failed = 0;
let passed = 0;
const say = (faults, name, detail) => {
  if (faults.length) failed += 1;
  else passed += 1;
  console.log(`${faults.length ? "FAIL" : "ok  "}  ${name}${faults.length ? `\n        ${faults.join("\n        ")}` : detail ? `  (${detail})` : ""}`);
};

const READ = `(() => {
  const standing = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && parseFloat(s.opacity) > 0; };
  let roof = 0, floor = innerHeight;
  for (const el of document.querySelectorAll("[data-screen-edge]")) {
    if (!standing(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.getAttribute("data-screen-edge") === "top") roof = Math.max(roof, r.bottom); else floor = Math.min(floor, r.top);
  }
  return { roof, floor };
})()`;

async function phone(gatherings) {
  const opened = await openPhone({ scale: 1, set: { "purify:florilegia": JSON.stringify(gatherings) } });
  const cdp = await opened.ctx.newCDPSession(opened.page);
  const touch = async (x, y) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await opened.page.waitForTimeout(40);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  return { ...opened, touch };
}

// ── A verse on a gathering's page opens the Bible at that verse ──────
{
  const name = "a verse tapped in a gathering opens the Bible at that verse, in sight and lit";
  const p = await phone([kept]);
  // In the apps a gathering opens on the gatherings' own page, named in the query (lib/florilegium/href.ts).
  await go(p.page, "/florilegium/gathering/?g=walk-song");
  await p.page.waitForSelector("[data-gathered-line]", { timeout: 20000 }).catch(() => {});
  await p.page.waitForTimeout(900);
  // His line: Luke 1:53.
  const link = await p.page.evaluate(() => {
    const a = [...document.querySelectorAll("[data-gathered-line] a[href^='/bible/']")].find((x) => /1:53\b/.test(x.textContent ?? ""));
    if (!a) return null;
    a.scrollIntoView({ block: "center", behavior: "instant" });
    return { href: a.getAttribute("href") };
  });
  const faults = [];
  if (!link) faults.push("no link to Luke 1:53 on the gathering's page");
  else {
    if (!/\/bible\/luke\/1\/?#v53$/.test(link.href)) faults.push(`its link is ${link.href}: the chapter, not the verse`);
    await p.page.waitForTimeout(300);
    const at = await p.page.evaluate(() => { const a = [...document.querySelectorAll("[data-gathered-line] a[href^='/bible/']")].find((x) => /1:53\b/.test(x.textContent ?? "")); const r = a.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }; });
    await p.touch(at.x, at.y);
    await p.page.waitForFunction(() => location.pathname.replace(/\/+$/, "") === "/bible/luke/1", null, { timeout: 15000 }).catch(() => {});
    // The moment it is lit: the Bible's page lights the verse it lands on for two seconds.
    const lit = await p.page.waitForFunction(() => document.getElementById("v53")?.getAttribute("data-focus") === "true", null, { timeout: 8000 }).then(() => true, () => false);
    await p.page.waitForTimeout(900);
    const seen = await p.page.evaluate((READ) => {
      const v = document.getElementById("v53");
      const r = v?.getBoundingClientRect();
      const band = new Function(`return ${READ}`)();
      return { path: location.pathname, hash: location.hash, top: r ? Math.round(r.top) : null, bottom: r ? Math.round(r.bottom) : null, words: (v?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60), down: Math.round(scrollY), ...band };
    }, READ);
    if (stills) await p.page.screenshot({ path: path.join(stills, "verse-opened.png") });
    if (seen.path.replace(/\/+$/, "") !== "/bible/luke/1") faults.push(`it opened ${seen.path}, not Luke 1`);
    if (seen.hash !== "#v53") faults.push(`the address ends "${seen.hash}", not the verse`);
    if (seen.top === null) faults.push("the chapter has no verse 53 on the page");
    else if (seen.top < seen.roof || seen.bottom > seen.floor) faults.push(`verse 53 stands ${seen.top} to ${seen.bottom}px down and the page shows ${Math.round(seen.roof)} to ${Math.round(seen.floor)}: it is not in sight`);
    if (!lit) faults.push("verse 53 was never lit");
    if (seen.down < 200) faults.push(`the page is ${seen.down}px down: at the chapter's head, where verse 53 is not`);
    say(faults, name, `${seen.path}${seen.hash}, the verse ${seen.top} to ${seen.bottom}px down between ${Math.round(seen.roof)} and ${Math.round(seen.floor)}, lit: "${seen.words}"`);
  }
  if (!link) say(faults, name);
  await p.browser.close();
}

// ── Today says "Your Florilegium" only of what the reader gathered ───
async function today(gatherings) {
  const p = await phone(gatherings);
  await go(p.page, "/");
  await p.page.waitForSelector("[data-florilegium-line]", { timeout: 20000 }).catch(() => {});
  await p.page.waitForTimeout(600);
  const card = await p.page.evaluate(() => {
    const el = document.querySelector("[data-florilegium-line]");
    if (!el) return null;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    return { kind: el.getAttribute("data-florilegium-line"), heading: el.querySelector("h2")?.textContent?.trim() ?? "", gathering: el.querySelector("a")?.textContent?.trim() ?? "", source: [...el.querySelectorAll("a")].pop()?.getAttribute("href") ?? "", words: el.querySelector("blockquote")?.textContent?.trim().slice(0, 50) ?? "" };
  });
  return { p, card };
}
{
  const name = "Today, a starter kept and nothing else gathered: its verse is headed The Florilegium, not Your Florilegium";
  const { p, card } = await today([kept]);
  const faults = [];
  if (!card) faults.push("Today shows no line from the Florilegium");
  else {
    if (card.heading === en["community.yourFlorilegium"]) faults.push(`the card says "${card.heading}" over a starter's verse`);
    if (card.heading !== en["study.florilegium.title"]) faults.push(`the card is headed "${card.heading}", not "${en["study.florilegium.title"]}"`);
    if (card.kind !== "starter") faults.push(`the card says it is "${card.kind}", not a starter's`);
    if (!/#v\d+$/.test(card.source)) faults.push(`its source opens ${card.source}, not a verse`);
    if (stills) await p.page.screenshot({ path: path.join(stills, "today-starter.png") });
  }
  say(faults, name, card ? `"${card.heading}", ${card.gathering}: "${card.words}" opens ${card.source}` : "");
  await p.browser.close();
}
{
  const name = "Today, once the reader has gathered a line of their own: theirs, under Your Florilegium";
  const { p, card } = await today([kept, own]);
  const faults = [];
  if (!card) faults.push("Today shows no line from the Florilegium");
  else {
    if (card.heading !== en["community.yourFlorilegium"]) faults.push(`the card is headed "${card.heading}", not "${en["community.yourFlorilegium"]}"`);
    if (card.kind !== "own") faults.push(`the card says it is "${card.kind}", not the reader's own`);
    if (card.gathering !== own.title) faults.push(`the line is from "${card.gathering}", not the reader's own gathering "${own.title}"`);
    if (stills) await p.page.screenshot({ path: path.join(stills, "today-own.png") });
  }
  say(faults, name, card ? `"${card.heading}", ${card.gathering}: "${card.words}"` : "");
  await p.browser.close();
}

console.log(`\n${passed} as they should be; ${failed} not`);
process.exit(failed ? 1 : 0);
