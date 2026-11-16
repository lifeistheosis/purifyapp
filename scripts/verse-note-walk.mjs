// A note on a verse, from the Bible, on the journal's page (1.9, round 3's apply; lib/journal/openVerseNote.ts).
//
// On the export, as a phone's shell serves it, at 390 by 844 with touch: John 1, verse 47's window opened by its
// door, Note tapped. It must open the journal's page (/journal/write?from=verse) on that verse's note, with the
// verse named and no Open back to it; the words typed and Done tapped, it must come back to John 1 with verse 47
// still on the screen, its note mark at its end and the words kept as the verse's note. Then the note opened
// again by its mark shows the words kept, and Back leaves them as they were.
//
//   node scripts/gate/export.mjs, then: node scripts/verse-note-walk.mjs [out]
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, go, serveLikeTheShell } from "./lib/shell-server.mjs";

const OUT = path.resolve(process.argv[2] ?? "out");
const en = JSON.parse(fs.readFileSync(new URL("../lib/i18n/messages/en.json", import.meta.url), "utf8"));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: NATIVE_UA });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:secondchance.done", "1");
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
});
await serveLikeTheShell(ctx, OUT, {});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let failed = 0;
const say = (ok, line) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${line}`);
};
const WORDS = "Come and see.";
const inView = () => page.evaluate(() => {
  const r = document.getElementById("v47")?.getBoundingClientRect();
  return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight } : null;
});

await go(page, "/bible/john/1/", { timeout: 60000 });
const door = page.locator("#v47 [data-verse-door]").first();
await door.waitFor({ state: "attached", timeout: 60000 });
await page.evaluate(() => document.getElementById("v47")?.scrollIntoView({ block: "center" }));
await page.waitForTimeout(1200);
const before = await inView();
await door.focus();
await page.waitForTimeout(200);
await door.tap();
const note = page.getByRole("menuitem", { name: en["bible.strip.note"] }).first();
await note.waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
await note.tap();
// The window lets a finger's lift from its hold pass (lib/ui/liftGuard.ts): a second tap, once, if the first was taken for it.
await page.waitForTimeout(1500);
if (!/\/journal\/write/.test(page.url()) && (await note.isVisible().catch(() => false))) await note.tap();
await page.waitForURL(/\/journal\/write\/?\?from=verse/, { timeout: 20000 }).catch(() => {});
say(/\/journal\/write\/?\?from=verse/.test(page.url()), `Note opens the journal's page from the verse (${page.url().replace(/^https?:\/\/[^/]+/, "")})`);
// A verse's note is words alone on the page: one field, no page blocks.
const field = page.locator("[data-journal-composer] textarea").first();
if (!(await field.waitFor({ timeout: 20000 }).then(() => true, () => false))) {
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  console.log("page errors:", errors.slice(0, 3));
  await browser.close();
  process.exit(1);
}
const card = (await page.locator("[data-journal-write]").first().textContent()) ?? "";
say(card.includes("John 1:47"), "the page names the verse");
const open = await page.locator("[data-journal-write] a[href*='/bible/john/1']").count();
say(open === 0, `no Open back to the verse it came from (${open})`);
await page.waitForTimeout(600);
await field.tap();
await page.keyboard.type(WORDS);
await page.waitForTimeout(300);
await page.locator("[data-journal-done]").first().tap();
await page.waitForURL(/\/bible\/john\/1\/?$/, { timeout: 20000 }).catch(() => {});
say(/\/bible\/john\/1\/?$/.test(page.url()), `Done comes back to the chapter (${page.url().replace(/^https?:\/\/[^/]+/, "")})`);
await page.waitForTimeout(1500);
const after = await inView();
say(!!after && after.top >= 0 && after.top < after.h - 40, `verse 47 is still on the screen (top ${before?.top} before, ${after?.top} after, of ${after?.h})`);
const kept = await page.evaluate(() => {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k === "purify:bible:john:1:47") return JSON.parse(localStorage.getItem(k) ?? "{}").note ?? null;
  }
  return null;
});
say(kept === WORDS, `the words are kept as the verse's note ("${kept}")`);
const mark = page.locator("#v47 [data-verse-note-mark]").first();
say((await mark.count()) === 1, "the verse wears its note's mark");
if (await mark.count()) {
  await mark.tap();
  await page.waitForURL(/\/journal\/write/, { timeout: 20000 }).catch(() => {});
  await field.waitFor({ timeout: 20000 });
  say((await field.inputValue()) === WORDS, "the mark opens the note again, with the words kept");
  await page.locator("[data-journal-back]").first().tap();
  await page.waitForURL(/\/bible\/john\/1\/?$/, { timeout: 20000 }).catch(() => {});
  say(/\/bible\/john\/1\/?$/.test(page.url()), "Back comes back to the chapter");
  const waiting = await page.evaluate(() => localStorage.getItem("purify:journal.draft"));
  say(!waiting || !JSON.parse(waiting).body, "a note left as it was does not wait as a draft");
}
if (errors.length) console.log("page errors:", errors.slice(0, 3));
say(errors.length === 0, `no page errors (${errors.length})`);
await browser.close();
process.exit(failed ? 1 : 0);
