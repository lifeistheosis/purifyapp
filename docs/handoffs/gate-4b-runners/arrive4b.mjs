// Gate 4b (2026-11-15): what closes above Community's sign-in section on a direct open (the path a link or a
// notification takes: the front door's document at /community/), a new reader on first launch, 390x844, the
// apps' agent, online (GET only). Every 40ms for 4s: the top of the words Sign in (what open88 follows), and each element above it in
// main whose height changed since the last read (tag, its data-* names, class head, height).
//   node arrive4b.mjs <out dir> [lang]
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, ORIGIN, serveLikeTheShell } = await import(`${ROOT}/scripts/lib/shell-server.mjs`);
const { mainWeb } = await import(`${ROOT}/scripts/lib/main-web.mjs`);
const { asAndroidShell } = await import(`${ROOT}/scripts/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${ROOT}/scripts/lib/motion.mjs`);
const [base, lang = "en"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on"), locale: lang });
await ctx.addCookies([{ name: "purify_locale", value: lang, url: "https://localhost" }]);
await ctx.addInitScript((l) => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); localStorage.setItem("CapacitorStorage.purify_locale", l); } catch {} }, lang);
await ctx.addInitScript(() => {
  const now = () => Math.round(performance.now());
  const A = (window.__ar = { rows: [], seen: new Map() });
  const tick = () => {
    const sec = [...document.querySelectorAll("main *")].find((s) => s.children.length === 0 && /^(Sign in|تسجيل الدخول)$/.test((s.textContent ?? "").trim()));
    if (sec) {
      const top = Math.round(sec.getBoundingClientRect().top);
      const changed = [];
      for (const el of document.querySelectorAll("main *")) {
        const r = el.getBoundingClientRect();
        if (r.bottom > top + 1 || r.height === 0 && !A.seen.has(el)) continue;
        const h = Math.round(r.height), was = A.seen.get(el);
        if (was !== undefined && was !== h && el.children.length < 6) changed.push(`${el.tagName.toLowerCase()}${[...el.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `[${a.name}]`).join("")}.${String(el.className).split(" ").slice(0, 3).join(".")} ${was}>${h}`);
        A.seen.set(el, h);
      }
      const last = A.rows[A.rows.length - 1];
      if (!last || last.top !== top || changed.length) A.rows.push({ t: now(), top, changed: changed.slice(0, 4) });
    }
    if (now() < 6000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await pinMotion(ctx, "on");
await asAndroidShell(ctx);
await serveLikeTheShell(ctx, path.resolve(base), {});
for (const u of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(u, mainWeb);
const page = await ctx.newPage();
await page.goto(`${ORIGIN}/community/`, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(6500);
const A = await page.evaluate(() => window.__ar.rows);
for (const r of A) console.log(JSON.stringify(r).slice(0, 400));
await browser.close();
