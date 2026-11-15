// Gate 4b (2026-11-15): the tap walk's three "look that the choice took" (a check moved and little else
// changed), answered: each control tapped with real touch from the screen as it first stood, and what the
// choice did read: the group's checked states, what the app keeps (localStorage) before and after, the page's
// words that changed, and the html attributes that changed.
//   node looks4b.mjs <out dir>    (a new reader, the Android shell; online, GET only)
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { asAndroidShell } = await import(`${R}/lib/sells-plus.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const [base] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const LOOKS = [
  ["/chants/psalm-135/", "radio", "English"],
  ["/settings/", "radio", "Strict rule"],
  ["/settings/", "switch", "Haptic feedback"],
];
const state = (page) =>
  page.evaluate(() => {
    const kept = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); kept[k] = localStorage.getItem(k).slice(0, 80); }
    const h = document.documentElement;
    const words = (document.querySelector("main") ?? document.body).innerText.split("\n").map((s) => s.trim()).filter(Boolean);
    return { kept, attrs: Object.fromEntries([...h.attributes].map((a) => [a.name, a.value.slice(0, 60)])), words };
  });
for (const [at, role, name] of LOOKS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await pinMotion(ctx, "on");
  await asAndroidShell(ctx);
  await serveLikeTheShell(ctx, path.resolve(base), {});
  for (const u of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(u, mainWeb);
  const page = await ctx.newPage();
  await go(page, at, { timeout: 60000 });
  await page.waitForTimeout(3000);
  const el = page.getByRole(role, { name, exact: true }).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const group = async () => page.evaluate(([role, name]) => {
    const el = [...document.querySelectorAll(`[role="${role}"]`)].find((e) => (e.getAttribute("aria-label") ?? e.textContent).trim().startsWith(name));
    const g = el?.closest('[role="radiogroup"]') ?? el?.parentElement;
    return [...(g?.querySelectorAll(`[role="${role}"]`) ?? [])].map((e) => `${(e.getAttribute("aria-label") ?? e.textContent).trim().slice(0, 28)}=${e.getAttribute("aria-checked")}`);
  }, [role, name]);
  const g0 = await group();
  const s0 = await state(page);
  await el.tap();
  await page.waitForTimeout(1500);
  const g1 = await group();
  const s1 = await state(page);
  const keptDiff = Object.keys({ ...s0.kept, ...s1.kept }).filter((k) => s0.kept[k] !== s1.kept[k]).map((k) => `${k}: ${s0.kept[k] ?? "-"} -> ${s1.kept[k] ?? "-"}`);
  const attrDiff = Object.keys({ ...s0.attrs, ...s1.attrs }).filter((k) => s0.attrs[k] !== s1.attrs[k]).map((k) => `${k}: ${s0.attrs[k] ?? "-"} -> ${s1.attrs[k] ?? "-"}`);
  const gone = s0.words.filter((w) => !s1.words.includes(w)), came = s1.words.filter((w) => !s0.words.includes(w));
  console.log(JSON.stringify({ at, name, group: { before: g0, after: g1 }, kept: keptDiff, html: attrDiff, words: { gone: gone.length, came: came.length, goneSample: gone.slice(0, 3).map((w) => w.slice(0, 60)), cameSample: came.slice(0, 3).map((w) => w.slice(0, 60)) } }));
  await ctx.close();
}
await browser.close();
