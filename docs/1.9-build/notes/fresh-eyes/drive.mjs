// Drives the export by hand for the fresh-eyes review: a list of steps, a
// picture after each, and what can be tapped next. Beside walk.mjs.
//   node docs/1.9-build/notes/fresh-eyes/drive.mjs <name> [--fresh] [--width 390] [--lang ar] [--set k=v,k=v] -- step step ...
// A step is: tap:<text>  |  tapsel:<css>  |  go:/path/  |  back  |  wait:ms  |  scroll:px  |  swipe:dx,dy[,x,y]
//            type:<text>  |  hold:<text>  |  shot  |  full (a picture of the whole page)  |  list (print controls)
//            theme:<mode>[/<look>]  |  eval:<js>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { go } from "../../../../scripts/lib/shell-server.mjs";

const all = process.argv.slice(2);
const cut = all.indexOf("--");
const steps = all.slice(cut + 1);
const head = all.slice(0, cut);
const name = head[0];
const fresh = head.includes("--fresh");
const setArg = head.includes("--set") ? head[head.indexOf("--set") + 1] : "";
process.argv = [process.argv[0], process.argv[1], "none", ...head.slice(1)];
const { phone } = await import("./walk.mjs");
const DIR = path.resolve(".release-logs/fresh-eyes/drive");
fs.mkdirSync(DIR, { recursive: true });
const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const set = Object.fromEntries(setArg ? setArg.split(",").map((kv) => kv.split("=")) : []);
const ph = await phone(browser, { fresh, set, scale: head.includes("--x2") ? 2 : 1 });
const { page } = ph;
await go(page, "/");
await page.waitForTimeout(2500);
let n = 0;
const shot = async (label = "", fullPage = false) => {
  const file = path.join(DIR, `${name}-${String(n++).padStart(2, "0")}${label ? `-${label.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 30)}` : ""}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`   [${path.relative(process.cwd(), file)}]`);
};
const list = async () => {
  const items = await page.evaluate(() => {
    const seen = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) return false; for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false; } return true; };
    return [...document.querySelectorAll("a[href],button,[role=button],[role=tab],[role=radio],[role=switch],[role=checkbox],input:not([type=hidden]),textarea,select,summary")].filter(seen).map((el) => { const r = el.getBoundingClientRect(); return `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""} "${(el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 44)}" ${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}${el.getAttribute("aria-checked") || el.getAttribute("aria-pressed") || el.getAttribute("aria-expanded") ? ` [${el.getAttribute("aria-checked") ?? el.getAttribute("aria-pressed") ?? el.getAttribute("aria-expanded")}]` : ""}`; });
  });
  console.log(`   at ${await page.evaluate(() => location.pathname + location.search + location.hash)} y=${await page.evaluate(() => Math.round(scrollY))}\n   ${items.join("\n   ")}`);
};
const find = async (text) => page.evaluate((t) => {
  const seen = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false; } return true; };
  const els = [...document.querySelectorAll("a[href],button,[role=button],[role=tab],[role=radio],[role=switch],[role=checkbox],input:not([type=hidden]),textarea,select,summary,label")].filter(seen);
  const label = (el) => (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ");
  const el = els.find((e) => label(e) === t) ?? els.find((e) => label(e).startsWith(t)) ?? els.find((e) => label(e).includes(t));
  if (!el) return null;
  let r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) { el.scrollIntoView({ block: "center", behavior: "instant" }); r = el.getBoundingClientRect(); }
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, text);
for (const step of steps) {
  const [verb, ...rest] = step.split(":");
  const arg = rest.join(":");
  console.log(`> ${step}`);
  try {
    if (verb === "tap" || verb === "hold") {
      const at = await find(arg);
      if (!at) { console.log("   NOT FOUND"); await list(); continue; }
      await page.waitForTimeout(150);
      const at2 = await find(arg);
      if (verb === "tap") await ph.touch(at2.x, at2.y);
      else { await page.touchscreen.tap; const cdp = await ph.ctx.newCDPSession(page); await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: at2.x, y: at2.y }] }); await page.waitForTimeout(800); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
      await page.waitForTimeout(900);
    } else if (verb === "tapsel") {
      const at = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: "center", behavior: "instant" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, arg);
      if (!at) { console.log("   NOT FOUND"); continue; }
      await ph.touch(at.x, at.y);
      await page.waitForTimeout(900);
    } else if (verb === "holdxy") { const [x, y, ms = 800] = arg.split(",").map(Number); await ph.hold(x, y, ms); await page.waitForTimeout(1100);
    } else if (verb === "holdsel") { const at = await page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + r.height / 2) }; }, arg); if (!at) { console.log("   NOT FOUND"); continue; } await page.waitForTimeout(500); const at2 = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: Math.round(r.left + Math.min(140, r.width / 2)), y: Math.round(r.top + r.height / 2) }; }, arg); await ph.hold(at2.x, at2.y, 800); await page.waitForTimeout(1100);
    } else if (verb === "tapxy") { const [x, y] = arg.split(",").map(Number); await ph.touch(x, y); await page.waitForTimeout(900);
    } else if (verb === "go") { await go(page, arg); await page.waitForTimeout(1600);
    } else if (verb === "back") { await page.goBack().catch(() => {}); await page.waitForTimeout(1400);
    } else if (verb === "wait") { await page.waitForTimeout(Number(arg));
    } else if (verb === "scroll") { await page.evaluate((y) => window.scrollTo(0, y), Number(arg)); await page.waitForTimeout(500);
    } else if (verb === "swipe") { const [dx, dy, x = 195, y = 600] = arg.split(",").map(Number); await ph.swipe(x, y, dx, dy); await page.waitForTimeout(900);
    } else if (verb === "type") { await page.keyboard.type(arg, { delay: 20 }); await page.waitForTimeout(500);
    } else if (verb === "shot") { await shot(arg);
    } else if (verb === "full") { await shot(arg, true);
    } else if (verb === "list") { await list();
    } else if (verb === "theme") { const [mode, look] = arg.split("/"); await page.evaluate(([m, l]) => { const h = document.documentElement; if (m && m !== "dark") h.setAttribute("data-theme", m); else h.removeAttribute("data-theme"); if (l) h.setAttribute("data-look", l); else h.removeAttribute("data-look"); }, [mode, look]); await page.waitForTimeout(300);
    } else if (verb === "eval") { console.log("   ", JSON.stringify(await page.evaluate(arg)));
    }
  } catch (e) { console.log(`   FAILED ${String(e).split("\n")[0]}`); }
}
if (ph.errors.length) console.log("errors:", [...new Set(ph.errors)].slice(0, 8));
if (ph.log.missing.length) console.log("missing files:", [...new Set(ph.log.missing)].slice(0, 12));
console.log("asked outside:", [...new Set(ph.outside.map((u) => u.split("?")[0]))].slice(0, 15));
await browser.close();
