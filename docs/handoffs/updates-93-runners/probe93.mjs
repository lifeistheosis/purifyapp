// Updates 93 (2026-11-15): the offline cards' Try again, read frame by frame.
//   node probe93.mjs <on|reduce> <path> [<path> ...] [--out dir] [--online]
// Each path is opened under the apps' agent with motion pinned and, unless --online, every address
// outside the app aborted (as Gate 4's walk ran with no network). It waits for "Try again", starts a
// requestAnimationFrame sampler (the walk's way: scripts/gate/inpage.mjs), then taps the button as a
// finger does. Each frame records, stamped with document.timeline's time: the button's box, the card
// it stands in, whether a waiting state is drawn (the campaigns door's line, an aria-busy box, a
// skeleton bone), how many elements <main> holds, and every paragraph's top below the card. It prints
// the frames in which any of that changed, so a box drawn for a frame and dropped, or a paragraph
// moved in one frame, shows with the frame it fell in.
// Without --out it reads http://localhost:3000 (next dev); with it, the export served the shell's way.
const ROOT = "/home/user/purifyapp";
const R = `${ROOT}/scripts`;
const { chromium } = await import(`${ROOT}/node_modules/playwright/index.mjs`);
const { NATIVE_UA, ORIGIN, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const args = process.argv.slice(2);
const oi = args.indexOf("--out");
const OUT = oi >= 0 ? args.splice(oi, 2)[1] : null;
const ON = args.includes("--online");
const [mode, ...paths] = args.filter((a) => a !== "--online");
const BASE = OUT ? ORIGIN : "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

function sample() {
  const frames = [];
  window.__p93 = frames;
  const btnOf = () => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Try again" && b.getClientRects().length);
  const loop = () => {
    const main = document.querySelector("main") ?? document.body;
    const btn = btnOf();
    const card = btn?.closest("section, div.rounded-2xl, div.text-center") ?? null;
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const cr = r(card);
    const below = cr ? [...main.querySelectorAll("p, h2, footer")].filter((el) => !card.contains(el) && el.getBoundingClientRect().top >= cr.bottom - 1).slice(0, 3) : [];
    frames.push({
      t: Math.round(document.timeline.currentTime * 10) / 10,
      btn: btn ? `${Math.round(r(btn).y)}` : "none",
      card: cr ? `${Math.round(cr.y)}+${Math.round(cr.height)}` : "none",
      waiting: [
        document.querySelector("[data-campaigns-asking]") ? "door-line" : "",
        main.querySelector("[aria-busy]") ? "aria-busy" : "",
        main.querySelector(".sk") ? "bone" : "",
      ].filter(Boolean).join(",") || "-",
      n: main.querySelectorAll("*").length,
      below: below.map((el) => `${el.tagName.toLowerCase()}@${Math.round(el.getBoundingClientRect().top)}"${el.textContent.trim().slice(0, 18)}"`).join(" "),
      status: [...(card?.querySelectorAll('[role="status"]') ?? [])].map((el) => `${Math.round(el.getBoundingClientRect().height)}`).join(",") || "-",
    });
    if (frames.length < 400) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

for (const path of paths) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(mode) });
  await ctx.addInitScript(() => { try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {} });
  await pinMotion(ctx, mode);
  if (OUT) await serveLikeTheShell(ctx, OUT, {});
  if (!ON) await ctx.route((u) => !u.href.startsWith(BASE), (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "load", timeout: 180000 });
  const button = page.getByRole("button", { name: "Try again", exact: true }).first();
  try {
    await button.waitFor({ state: "visible", timeout: 60000 });
  } catch {
    console.log(`${mode} ${path}: no Try again drawn${ON ? " (online)" : ""}`);
    await ctx.close();
    continue;
  }
  await page.waitForTimeout(1500);
  for (const tap of [1, 2]) {
    await page.evaluate(sample);
    await page.waitForTimeout(150);
    const at = await page.evaluate(() => Math.round(document.timeline.currentTime * 10) / 10);
    await button.tap();
    await page.waitForTimeout(900);
    const frames = await page.evaluate(() => window.__p93);
    const changed = frames.filter((f, i) => i === 0 || JSON.stringify({ ...f, t: 0 }) !== JSON.stringify({ ...frames[i - 1], t: 0 }));
    console.log(`\n${mode} ${path} tap ${tap} (tapped at tl ${at}; ${frames.length} frames)`);
    for (const f of changed) console.log(`  tl ${f.t}  btn y ${f.btn}  card ${f.card}  waiting ${f.waiting}  n ${f.n}  status ${f.status}  below ${f.below}`);
  }
  await ctx.close();
}
await browser.close();
