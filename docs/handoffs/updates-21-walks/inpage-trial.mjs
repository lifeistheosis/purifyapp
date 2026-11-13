// Trial of lib/ui/inPageMove.ts's way on an export cut before it: the gate's own frames check
// (scripts/gate/frames.mjs) on taps of one kind, with and without the way put into the page.
//   node inpage-trial.mjs --out <export> --page /faq/ --sel 'summary' [--n 4] [--inject] [--cpu 4]
import fs from "node:fs";

const REPO = "/home/user/purifyapp";
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${REPO}/scripts/lib/shell-server.mjs`);
const { pinMotion, motionOptions, assertMotion } = await import(`${REPO}/scripts/lib/motion.mjs`);
const { mainWeb } = await import(`${REPO}/scripts/lib/main-web.mjs`);
const { installGate } = await import(`${REPO}/scripts/gate/inpage.mjs`);
const { recordFrames, judgeFrames } = await import(`${REPO}/scripts/gate/frames.mjs`);
const { tapAt } = await import(`${REPO}/scripts/lib/tap.mjs`);
const { chromium } = await import(`${REPO}/node_modules/playwright/index.mjs`);

const argv = process.argv.slice(2);
const flag = (n) => {
  const at = argv.indexOf(n);
  return at >= 0 ? argv.splice(at, 2)[1] : null;
};
const OUT = flag("--out");
const PAGE = flag("--page") ?? "/faq/";
const SEL = flag("--sel") ?? "summary";
const N = Number(flag("--n") ?? 4);
const SKIP = Number(flag("--skip") ?? 0);
const CPU = Number(flag("--cpu") ?? 0);
const INJECT = argv.includes("--inject");

// The way, as lib/ui/inPageMove.ts has it, for a <details> (moveQuestions + movePage + partsAfter).
function theWay() {
  const css = `:root[data-in-page]::view-transition-group(*),:root[data-in-page]::view-transition-old(*),:root[data-in-page]::view-transition-new(*){animation-duration:var(--duration-base);animation-timing-function:var(--ease-house)}::view-transition-group(in-page-grows-1),::view-transition-group(in-page-grows-2){overflow:clip}`;
  const put = () => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  };
  if (document.head) put();
  else document.addEventListener("DOMContentLoaded", put);
  const after = (from) => {
    const out = [];
    const reach = innerHeight * 2;
    for (let at = from; at && at !== document.body && at.tagName !== "MAIN"; at = at.parentElement) {
      for (let next = at.nextElementSibling; next && out.length < 40; next = next.nextElementSibling) {
        const cs = getComputedStyle(next);
        if (cs.display === "none" || cs.display === "contents" || cs.position === "fixed") continue;
        if (cs.viewTransitionName && cs.viewTransitionName !== "none") continue;
        const r = next.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > reach) continue;
        out.push(next);
      }
    }
    return out;
  };
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    const summary = e.target.closest && e.target.closest("summary");
    if (!summary) return;
    const d = summary.parentElement;
    if (!d || d.tagName !== "DETAILS") return;
    if (document.documentElement.dataset.motion === "reduce" || !document.startViewTransition) return;
    e.preventDefault();
    const worn = [d];
    d.style.viewTransitionName = "in-page-grows-1";
    after(d).forEach((el, i) => {
      el.style.viewTransitionName = `in-page-glides-${i + 1}`;
      worn.push(el);
    });
    document.documentElement.setAttribute("data-in-page", "");
    const t = document.startViewTransition(() => {
      d.open = !d.open;
    });
    const end = () => {
      for (const el of worn) el.style.viewTransitionName = "";
      document.documentElement.removeAttribute("data-in-page");
    };
    t.finished.then(end, end);
  });
}

const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
const results = [];
for (let k = SKIP; k < SKIP + N; k++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await pinMotion(ctx, "on");
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    } catch {}
  });
  if (INJECT) await ctx.addInitScript(theWay);
  await installGate(ctx);
  await serveLikeTheShell(ctx, OUT, {});
  for (const site of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/**"]) await ctx.route(site, mainWeb);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (CPU) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await go(page, PAGE, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const wrong = await assertMotion(page, "on");
  if (wrong) throw new Error(wrong);
  const el = page.locator(SEL).nth(k);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const name = ((await el.innerText().catch(() => "")) || "").split("\n")[0].slice(0, 50);
  const box = await el.boundingBox();
  const rec = await recordFrames(page, cdp, () => tapAt(cdp, box.x + Math.min(40, box.width / 2), box.y + box.height / 2));
  const j = await judgeFrames(rec, { motion: "on" });
  results.push({ k, name, fails: j.fails.map((f) => `${f.kind}: ${f.detail}`.slice(0, 200)), unsure: j.unsure });
  console.log(JSON.stringify(results.at(-1)));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => r.fails.length);
console.log(`\n${INJECT ? "with the way" : "as cut"}: ${results.length} taps, ${failed.length} failed, ${results.filter((r) => r.unsure.length).length} unsure`);
