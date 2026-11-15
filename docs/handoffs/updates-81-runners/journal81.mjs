// Updates 81 (2026-11-15): the journal's placeholder, "Write what is on your heart, or pray in your own words.",
// left unmeasured by Updates 60's mockrun60.mjs (journal@390@en) because an svg is drawn across it. On the gate's
// export, 390x844, the apps' user agent, a signed-in Plus reader (mockrun60's stand-in session): the journal,
// Write, the composer. It names every svg whose box crosses the placeholder's line, says what it is, then hides
// it and (1) runs checkMock with pixels on the composer on the five palettes and the two earned, and (2) reads
// the placeholder's own colour against the screen's pixels under it (the placeholder made clear, the svg
// hidden), the least kind pixel giving the ratio, as checkMock's painted ground does.
//   node journal81.mjs <out dir> <json out>
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const sharp = (await import(`${ROOT}/node_modules/sharp/lib/index.js`)).default;
const { checkMock, WORN } = await import(`${R}/mock-check.mjs`);
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const [base, outFile] = process.argv.slice(2);
const OUT = path.resolve(base);
const EN = JSON.parse(fs.readFileSync(`${ROOT}/lib/i18n/messages/en.json`, "utf8"));
const WORDS = EN["journal.composer.placeholder"];

const dir = path.join(OUT, "_next", "static", "chunks");
const found = new Set();
for (const f of fs.readdirSync(dir)) if (f.endsWith(".js")) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/https:\/\/([a-z0-9-]+)\.supabase\.co/g)) found.add(m[0]);
const server = [...found][0];
const user = { id: "00000000-0000-4000-8000-000000000000", email: "reader@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const session = { access_token: "walk", refresh_token: "walk", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 86_400 * 365, user };
const jar = JSON.stringify([{ name: `sb-${new URL(server).hostname.split(".")[0]}-auth-token`, value: JSON.stringify(session) }]);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
await ctx.addCookies([{ name: "purify_locale", value: "en", url: "https://localhost" }]);
await ctx.addInitScript((j) => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
    localStorage.setItem("CapacitorStorage.purify_locale", "en");
    localStorage.setItem("purify.supabase.auth", j);
  } catch {}
}, jar);
await pinMotion(ctx, "on");
await serveLikeTheShell(ctx, OUT, {});
for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"]) await ctx.route(at, mainWeb);
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const plus = { is_supporter: false, plus_until: "2099-01-01T00:00:00Z", plus_source: "walk", pro_until: null };
await ctx.route(`${server}/**`, (route) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.pathname.startsWith("/storage/v1/object/public/")) return route.fallback();
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(user) });
  if (url.pathname === "/rest/v1/entitlements") return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(/object/.test(req.headers()["accept"] ?? "") ? plus : [plus]) });
  return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "[]" });
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
const record = { words: WORDS };
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
try {
  await go(page, "/journal/", { timeout: 60000 });
  const write = page.locator("[data-journal-write]:visible").first();
  await write.waitFor({ timeout: 120000 });
  await page.waitForTimeout(1500);
  await write.tap();
  await page.waitForSelector("[data-journal-composer]", { timeout: 30000 });
  await page.waitForTimeout(2000);
  const sel = `textarea[placeholder="${WORDS.replace(/"/g, '\\"')}"]`;
  await page.locator(sel).first().waitFor({ timeout: 20000 });
  // Every svg whose box crosses the placeholder's first line, and what it is.
  record.svgs = await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    f.setAttribute("data-u81-field", "");
    const b = f.getBoundingClientRect();
    const cs = getComputedStyle(f);
    // The field's whole inner box: checkMock measures a placeholder against the field inside its padding.
    const line = { left: b.left + parseFloat(cs.paddingLeft), right: b.right - parseFloat(cs.paddingRight), top: b.top + parseFloat(cs.paddingTop), bottom: b.bottom - parseFloat(cs.paddingBottom) };
    const out = [];
    document.querySelectorAll("svg").forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.width === 0 || r.right <= line.left || r.left >= line.right || r.bottom <= line.top || r.top >= line.bottom) return;
      const sc = getComputedStyle(s);
      const chain = [];
      for (let e = s.parentElement; e && chain.length < 5; e = e.parentElement) chain.push(`${e.tagName.toLowerCase()}${[...e.attributes].filter((a) => a.name.startsWith("data-") || a.name === "aria-hidden" || a.name === "role").map((a) => `[${a.name}${a.value ? `=${a.value.slice(0, 24)}` : ""}]`).join("")}.${String(e.className).split(" ").slice(0, 4).join(".")}`);
      s.setAttribute("data-u81-svg", String(i));
      out.push({ i, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], line: [Math.round(line.left), Math.round(line.top), Math.round(line.right - line.left), Math.round(line.bottom - line.top)],
        cls: String(s.getAttribute("class") ?? "").slice(0, 160), ariaHidden: s.getAttribute("aria-hidden"), viewBox: s.getAttribute("viewBox"), pointer: sc.pointerEvents, opacity: sc.opacity, position: sc.position, z: sc.zIndex,
        color: sc.color, children: [...s.children].map((c) => `${c.tagName}${c.getAttribute("stroke") ? ` stroke=${c.getAttribute("stroke")}` : ""}${c.getAttribute("fill") ? ` fill=${c.getAttribute("fill")}` : ""}${c.getAttribute("opacity") ? ` opacity=${c.getAttribute("opacity")}` : ""}`).slice(0, 6),
        html: s.outerHTML.slice(0, 300), chain, inField: f.contains(s) });
    });
    return out;
  }, sel);
  console.log(`svgs across the placeholder: ${JSON.stringify(record.svgs, null, 1).slice(0, 3000)}`);
  // checkMock with the svg in place (the reason it was left unmeasured), then with it hidden.
  const asIs = await checkMock(page, "[data-journal-composer]", { pixels: true, palettes: WORN.slice(0, 1) });
  record.asIs = { failures: asIs.failures, unmeasured: asIs.unmeasured.filter((u) => u.includes(WORDS.slice(0, 20))) };
  console.log(`checkMock as it stands (Dark): placeholder unmeasured: ${JSON.stringify(record.asIs.unmeasured)}`);
  await page.evaluate(() => document.querySelectorAll("[data-u81-svg]").forEach((s) => (s.style.visibility = "hidden")));
  const hidden = await checkMock(page, "[data-journal-composer]", { pixels: true });
  record.hidden = { failures: hidden.failures, unmeasured: hidden.unmeasured, allowed: hidden.allowed?.length ?? 0, palettes: WORN.map((w) => w[0]) };
  console.log(`checkMock with the svg hidden, on ${WORN.map((w) => w[0]).join(", ")}: ${hidden.failures.length} failure(s) ${JSON.stringify(hidden.failures).slice(0, 1500)}; unmeasured ${JSON.stringify(hidden.unmeasured).slice(0, 800)}`);
  // The placeholder's colour against the pixels under it, on each palette.
  record.ratios = {};
  for (const [name, mode, look] of WORN) {
    await page.evaluate(([m, l]) => { const h = document.documentElement; m ? h.setAttribute("data-reading-mode", m) : h.removeAttribute("data-reading-mode"); l ? h.setAttribute("data-look", l) : h.removeAttribute("data-look"); }, [mode ?? null, look ?? null]);
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const f = document.querySelector("[data-u81-field]");
      const c = getComputedStyle(f, "::placeholder").color;
      const cs = getComputedStyle(f);
      const b = f.getBoundingClientRect();
      const r = document.createRange();
      const probe = document.createElement("span");
      probe.textContent = f.placeholder;
      probe.style.cssText = `position:fixed;visibility:hidden;font:${cs.font};letter-spacing:${cs.letterSpacing};white-space:pre-wrap;width:${b.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px;line-height:${cs.lineHeight}`;
      document.body.appendChild(probe);
      const pb = probe.getBoundingClientRect();
      probe.remove();
      void r;
      return { color: c, opacity: getComputedStyle(f).opacity, box: { x: b.left + parseFloat(cs.paddingLeft), y: b.top + parseFloat(cs.paddingTop), w: Math.min(pb.width, b.width), h: pb.height } };
    });
    await page.addStyleTag({ content: "[data-u81-field]::placeholder{color:transparent!important}" }).then((h) => h.evaluate((s) => s.setAttribute("data-u81-style", "")));
    await page.waitForTimeout(250);
    const clip = { x: Math.max(0, Math.floor(m.box.x)), y: Math.max(0, Math.floor(m.box.y)), width: Math.ceil(m.box.w), height: Math.ceil(m.box.h) };
    const png = await page.screenshot({ clip });
    await page.evaluate(() => document.querySelectorAll("[data-u81-style]").forEach((s) => s.remove()));
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    // The colour as the screen draws it (the browser's own conversion from oklab), alpha kept apart.
    const px = await page.evaluate((c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; }, m.color);
    const fg = [px[0], px[1], px[2]];
    const a = (px[3] / 255) * Number(m.opacity);
    let worst = Infinity, light = 0, dark = 1, worstPx = null;
    for (let i = 0; i < data.length; i += info.channels) {
      const g = [data[i], data[i + 1], data[i + 2]];
      const top = [0, 1, 2].map((k) => fg[k] * a + g[k] * (1 - a));
      const q = ratio(top, g);
      const L = lum(g);
      light = Math.max(light, L); dark = Math.min(dark, L);
      if (q < worst) { worst = q; worstPx = g; }
    }
    record.ratios[name] = { least: Math.round(worst * 100) / 100, ground: worstPx, fg: m.color, rgb: fg, alpha: Math.round(a * 1000) / 1000, box: clip };
    console.log(`${name}: the placeholder (rgb ${fg} at ${Math.round(a * 100) / 100}, ${clip.width}x${clip.height}) reads ${Math.round(worst * 100) / 100}:1 on its least kind pixel rgb(${worstPx}) (need 4.5)`);
  }
} catch (e) {
  record.error = String(e).slice(0, 300);
  console.log(`ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  await page.screenshot({ path: outFile.replace(/\.json$/, "-fail.png") }).catch(() => {});
}
record.errors = errors;
fs.writeFileSync(outFile, JSON.stringify(record, null, 2));
await browser.close();
