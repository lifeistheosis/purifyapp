// Gate 6: the tap walk's sheet fail on Today, the header's "Plus" opening the "Purify Plus" sheet, where a
// reader's quote ("Purify is an incredible app that honestly deser...") read 1.00:1 on seven palettes.
// As a new reader with no Plus in the Android shell, no network, 390 by 844 with touch: tap the header's Plus,
// then read where the quote stands, what is over it, its opacity up the tree, and take stills over 3 seconds.
//   node docs/handoffs/gate-6-walks/plus-sheet-probe.mjs <out> <dir>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { NATIVE_UA, serveLikeTheShell, go } from "../../../scripts/lib/shell-server.mjs";
import { asAndroidShell } from "../../../scripts/lib/sells-plus.mjs";

const [OUT = "out", DIR = "/tmp/plus-sheet"] = process.argv.slice(2);
fs.mkdirSync(DIR, { recursive: true });
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: NATIVE_UA });
await asAndroidShell(ctx);
await serveLikeTheShell(ctx, OUT);
await ctx.addInitScript(() => { localStorage.setItem("purify:secondchance.done", "1"); localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); });
const page = await ctx.newPage();
await go(page, "/");
await page.waitForTimeout(3000);
const btn = page.getByRole("button", { name: "Plus", exact: true }).first();
const box = await btn.boundingBox();
console.log("the header's Plus:", JSON.stringify(box));
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
for (const ms of [300, 1200, 3000]) {
  await page.waitForTimeout(ms === 300 ? 300 : ms === 1200 ? 900 : 1800);
  const seen = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll("[role=dialog]")].find((d) => d.getBoundingClientRect().height > 0);
    const all = [...document.querySelectorAll("*")].filter((e) => e.childElementCount === 0 && /incredible app/.test(e.textContent || ""));
    return {
      dialog: dlg ? { name: dlg.getAttribute("aria-label") || dlg.getAttribute("aria-labelledby"), rect: dlg.getBoundingClientRect().toJSON() } : null,
      quotes: all.map((e) => {
        const r = e.getBoundingClientRect();
        const chain = [];
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.opacity !== "1" || cs.visibility !== "visible" || cs.overflow !== "visible" || cs.transform !== "none" || cs.clipPath !== "none")
            chain.push(`${n.tagName.toLowerCase()}.${String(n.className).slice(0, 40)} op=${cs.opacity} vis=${cs.visibility} ov=${cs.overflow} tf=${cs.transform.slice(0, 30)} clip=${cs.clipPath.slice(0, 20)}`);
        }
        const mid = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2);
        return { text: e.textContent.slice(0, 60), rect: r.toJSON(), color: getComputedStyle(e).color, atMiddle: mid ? `${mid.tagName.toLowerCase()}.${String(mid.className).slice(0, 50)}` : null, inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, chain };
      }),
    };
  });
  console.log(`at +${ms}ms:`, JSON.stringify(seen, null, 0).slice(0, 1800));
  await page.screenshot({ path: path.join(DIR, `plus-sheet-${ms}.png`) });
}
await browser.close();
// Second look (appended): the quote scrolled to the middle of the sheet, as a reader scrolls to it, then
// what is drawn at its middle and its pixels against the sheet, at once and after 1.5 seconds.
{
  const b2 = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
  const c2 = await b2.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: NATIVE_UA });
  await asAndroidShell(c2);
  await serveLikeTheShell(c2, OUT);
  await c2.addInitScript(() => { localStorage.setItem("purify:secondchance.done", "1"); localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); });
  const p2 = await c2.newPage();
  await go(p2, "/");
  await p2.waitForTimeout(3000);
  const b = await p2.getByRole("button", { name: "Plus", exact: true }).first().boundingBox();
  await p2.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await p2.waitForTimeout(1500);
  await p2.evaluate(() => [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && /incredible app/.test(e.textContent || ""))?.scrollIntoView({ block: "center" }));
  for (const ms of [50, 1500]) {
    await p2.waitForTimeout(ms);
    const s = await p2.evaluate(() => {
      const e = [...document.querySelectorAll("*")].find((x) => x.childElementCount === 0 && /incredible app/.test(x.textContent || ""));
      const r = e.getBoundingClientRect();
      const mid = document.elementFromPoint(r.left + 30, r.top + 10);
      const chain = [];
      for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.opacity !== "1" || cs.contentVisibility !== "visible" && cs.contentVisibility) chain.push(`${n.tagName.toLowerCase()}.${String(n.className).slice(0, 50)} op=${cs.opacity} cv=${cs.contentVisibility}`); }
      return { rect: r.toJSON(), atText: mid ? `${mid.tagName.toLowerCase()}.${String(mid.className).slice(0, 60)} "${(mid.textContent || "").slice(0, 40)}"` : null, chain };
    });
    console.log(`scrolled, +${ms}ms:`, JSON.stringify(s).slice(0, 900));
    await p2.screenshot({ path: path.join(DIR, `plus-sheet-scrolled-${ms}.png`) });
  }
  await b2.close();
}
// Third look (appended): checkMock with pixels on the opened sheet, as the tap walk holds it (scripts/tap-walk.mjs
// marks the dialog and calls checkMock(page, sel, { pixels: true })), in the walk's own context (dark scheme, scale 1).
{
  const { checkMock } = await import("../../../scripts/mock-check.mjs");
  const b3 = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
  const c3 = await b3.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", hasTouch: true, isMobile: true, userAgent: NATIVE_UA });
  await asAndroidShell(c3);
  await serveLikeTheShell(c3, OUT);
  await c3.addInitScript(() => { localStorage.setItem("purify:secondchance.done", "1"); localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); });
  const p3 = await c3.newPage();
  await go(p3, "/");
  await p3.waitForTimeout(3000);
  const b = await p3.getByRole("button", { name: "Plus", exact: true }).first().boundingBox();
  await p3.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await p3.waitForTimeout(1500);
  await p3.evaluate(() => [...document.querySelectorAll("[role=dialog]")].find((d) => d.getBoundingClientRect().height > 0)?.setAttribute("data-probe-sheet", "1"));
  const r = await checkMock(p3, "[data-probe-sheet]", { pixels: true });
  const lines = (r.fails ?? r.failures ?? r.problems ?? []).map((f) => (typeof f === "string" ? f : JSON.stringify(f)).slice(0, 300));
  console.log("checkMock:", r.ok ?? r.pass ?? "?", JSON.stringify(Object.keys(r)), lines.length, "\n" + lines.join("\n"));
  await b3.close();
}
// Fourth look (appended): the quote's own pixels on each of the seven palettes checkMock wears, the quote
// scrolled to the middle of the sheet: the ground is the commonest colour in its box, the letters the pixel
// farthest from it, and the ratio is theirs (WCAG relative luminance).
{
  const sharp = (await import("sharp")).default;
  const { WORN } = await import("../../../scripts/mock-check.mjs");
  const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const b4 = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
  const c4 = await b4.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", hasTouch: true, isMobile: true, userAgent: NATIVE_UA });
  await asAndroidShell(c4);
  await serveLikeTheShell(c4, OUT);
  await c4.addInitScript(() => { localStorage.setItem("purify:secondchance.done", "1"); localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); });
  const p4 = await c4.newPage();
  await go(p4, "/");
  await p4.waitForTimeout(3000);
  const b = await p4.getByRole("button", { name: "Plus", exact: true }).first().boundingBox();
  await p4.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  await p4.waitForTimeout(1500);
  for (const [name, mode] of WORN) {
    await p4.evaluate((m) => { const h = document.documentElement; if (m) h.setAttribute("data-reading-mode", m); else h.removeAttribute("data-reading-mode"); }, mode);
    await p4.waitForTimeout(400);
    const r = await p4.evaluate(() => { const e = [...document.querySelectorAll("blockquote")].find((x) => /incredible app/.test(x.textContent || "")); e.scrollIntoView({ block: "center", behavior: "instant" }); return e.getBoundingClientRect().toJSON(); });
    await p4.waitForTimeout(300);
    const { data, info } = await sharp(await p4.screenshot({ clip: { x: r.x, y: r.y, width: r.width, height: r.height } })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const count = new Map();
    for (let i = 0; i < data.length; i += 3) { const k = `${data[i]},${data[i + 1]},${data[i + 2]}`; count.set(k, (count.get(k) ?? 0) + 1); }
    const ground = [...count.entries()].sort((a, b2) => b2[1] - a[1])[0][0].split(",").map(Number);
    const lg = lum(...ground);
    let far = lg, farPx = ground;
    for (let i = 0; i < data.length; i += 3) { const l = lum(data[i], data[i + 1], data[i + 2]); if (Math.abs(l - lg) > Math.abs(far - lg)) { far = l; farPx = [data[i], data[i + 1], data[i + 2]]; } }
    const ratio = (Math.max(far, lg) + 0.05) / (Math.min(far, lg) + 0.05);
    console.log(`pixels ${name}: ground rgb(${ground}) letters rgb(${farPx}) ${ratio.toFixed(2)}:1 (box ${Math.round(r.y)} to ${Math.round(r.y + r.height)})`);
    if (name === "Light" || name === "Candlelight") await p4.screenshot({ path: path.join(DIR, `plus-sheet-${name}.png`) });
  }
  await b4.close();
}
