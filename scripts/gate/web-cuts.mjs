// On every saint's web, what the page cuts with an ellipsis (text-overflow over text that does not fit, or
// a line clamp that hides lines): at the size given, one page at a time, no taps.
import fs from "node:fs";
import { chromium } from "playwright";
import { motionOptions, pinMotion } from "../lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
// The browser the session carries, as the walks launch it (scripts/tap-walk.mjs); else Playwright's own.
const OWN = "/opt/pw-browsers/chromium";
const [W, H] = (process.argv[2] ?? "390x844").split("x").map(Number);
const webs = fs.readdirSync(new URL("../../out/saints", import.meta.url)).filter((s) => fs.existsSync(new URL(`../../out/saints/${s}/web/index.txt`, import.meta.url))).map((s) => `/saints/${s}/web/`);
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await pinMotion(ctx, "on");
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await serveLikeTheShell(ctx, new URL("../../out", import.meta.url).pathname, {});
const words = new Map();
let pages = 0;
for (const at of webs) {
  const page = await ctx.newPage();
  try {
    await go(page, at, { timeout: 30000 });
    await page.waitForTimeout(2500);
    const cut = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("main *")) {
        if (el.children.length) continue;
        const t = (el.textContent || "").trim();
        if (!t) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) out.push(`${t.slice(0, 50)} (${el.clientWidth} of ${el.scrollWidth}px)`);
        else if (cs.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 1) out.push(`${t.slice(0, 50)} (clamped at ${cs.webkitLineClamp} lines)`);
      }
      return out;
    });
    if (cut.length) { pages += 1; for (const c of cut) { const k = c.replace(/ \(.*$/, ""); words.set(k, (words.get(k) ?? new Set()).add(at.split("/")[2])); } console.log(`${at}: ${cut.length}: ${[...new Set(cut)].slice(0, 5).join("; ")}`); }
  } catch (e) { console.log(`${at}: error ${String(e).split("\n")[0].slice(0, 100)}`); }
  finally { await page.close(); }
}
console.log(`\n${webs.length} webs at ${W} by ${H}; ${pages} with words cut`);
for (const [k, v] of [...words].sort((a, b) => b[1].size - a[1].size)) console.log(`  "${k}" on ${v.size}`);
await browser.close();
