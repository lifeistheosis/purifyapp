// Updates 94 (2026-11-15): what a tap's switch waits for and what it draws, frame by frame.
//   node probe94.mjs <on|reduce> <path> <link name> [--href part] [--out dir] [--online] [--taps n]
// Opens <path> under the apps' agent with motion pinned (and, unless --online, every address outside
// the app aborted, as Gate 4 ran), finds the link or button named <link name> (its href holding
// --href's part when given), brings it into view, starts a requestAnimationFrame sampler (the walk's
// way) and taps it as a finger does. Each frame, stamped with document.timeline: the address, every
// View Transition started and ended (the page's own startViewTransition, wrapped before the app
// loads), the loading outline and its fading copy, what <main> holds, the scroll, and the words at
// the top of the screen. Prints the frames in which any of that changed.
// Without --out it reads http://localhost:3000 (next dev); with it, the export served the shell's way.
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, ORIGIN, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const OUT = opt("--out");
const HREF = opt("--href");
const TAPS = Number(opt("--taps") ?? 1);
const ON = args.includes("--online");
const [mode, path, name] = args.filter((a) => a !== "--online");
const BASE = OUT ? ORIGIN : "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function wrapTransitions() {
  window.__vt = [];
  const start = document.startViewTransition?.bind(document);
  if (!start) return;
  document.startViewTransition = (cb) => {
    const at = Math.round(document.timeline.currentTime);
    const tr = start(cb);
    const rec = { at, ready: null, done: null, skipped: false };
    window.__vt.push(rec);
    tr.ready.then(() => (rec.ready = Math.round(document.timeline.currentTime)), () => (rec.skipped = true));
    tr.finished.then(() => (rec.done = Math.round(document.timeline.currentTime)), () => (rec.done = -1));
    return tr;
  };
}

function sample() {
  const frames = [];
  window.__p94 = frames;
  const loop = () => {
    const main = document.querySelector("main[data-route-content]") ?? document.querySelector("main");
    const top = document.elementFromPoint(195, 260);
    const vt = window.__vt ?? [];
    frames.push({
      t: Math.round(document.timeline.currentTime * 10) / 10,
      at: location.pathname + location.search,
      vt: vt.map((v) => `${v.at}${v.ready ? ">" + v.ready : ""}${v.done ? "~" + v.done : ""}${v.skipped ? "!" : ""}`).join(" ") || "-",
      outline: document.querySelector("[data-route-loading]") ? "outline" : "-",
      ghost: document.querySelector("[data-outline-ghost]") ? "ghost" : "-",
      inpage: document.documentElement.hasAttribute("data-in-page") ? "in-page" : "-",
      main: main ? `${main.querySelectorAll("*").length}/${main.textContent.length}` : "none",
      y: Math.round(window.scrollY),
      top: top ? `${top.tagName.toLowerCase()}"${(top.textContent || "").trim().slice(0, 24)}"` : "-",
    });
    if (frames.length < 600) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
await ctx.addInitScript(wrapTransitions);
await pinMotion(ctx, mode);
if (OUT) await serveLikeTheShell(ctx, OUT, {});
if (!ON) await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
const page = await ctx.newPage();
for (let tap = 1; tap <= TAPS; tap++) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 240000 });
  await page.waitForTimeout(2500);
  const all = page.locator(HREF ? `a[href*="${HREF}"]` : "a, button", { hasText: name });
  const el = all.first();
  await el.waitFor({ state: "attached", timeout: 60000 });
  await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1200);
  await page.evaluate(sample);
  await page.waitForTimeout(150);
  const at = await page.evaluate(() => Math.round(document.timeline.currentTime * 10) / 10);
  const box = await el.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(2600);
  const frames = await page.evaluate(() => window.__p94);
  const key = (f) => JSON.stringify({ ...f, t: 0 });
  const changed = frames.filter((f, i) => i === 0 || key(f) !== key(frames[i - 1]));
  console.log(`\n${mode} ${path} "${name}" tap ${tap} (tapped at tl ${at}; ${frames.length} frames)`);
  for (const f of changed) console.log(`  tl ${f.t} (+${Math.round(f.t - at)})  ${f.at}  vt ${f.vt}  ${f.outline} ${f.ghost} ${f.inpage}  main ${f.main}  y ${f.y}  top ${f.top}`);
}
await ctx.close();
await browser.close();
