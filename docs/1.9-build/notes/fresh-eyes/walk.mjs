// The fresh-eyes walk (build 93's pre-build gate, part 6). A review tool, kept
// beside its report so the second pass can run it again on the release
// candidate. It changes nothing in the app.
//
//   npm run build:android            (as the releases build it, shop and community on)
//   node docs/1.9-build/notes/fresh-eyes/walk.mjs crawl   [--width 390] [--lang ar] [--max 400]
//   node docs/1.9-build/notes/fresh-eyes/walk.mjs taps    [--width 390] [--only /you/,/prayers/] [--part 0/4]
//   node docs/1.9-build/notes/fresh-eyes/walk.mjs sheets  (contact sheets of the crawl's pictures)
//
// crawl  starts at the front door as a reader who has finished onboarding,
//        follows every link it finds from the five tabs (two screens of each
//        kind of page), and on each screen takes a picture and measures what
//        a measure can see: a picture that did not load, a file the bundle
//        does not hold, a dashed box, a sparkle glyph, a keyboard hint, a
//        target under 44px, anything wider than the screen, an empty circle,
//        an em dash, a page error.
// taps   on each screen, taps every control once with a real finger
//        (Input.dispatchTouchEvent) and says what happened: nothing at all,
//        the control moved under the finger, what opened ended under the tab
//        bar or off the screen, Back did not return to where the reader was.
//
// Everything is written to OUT_DIR (default .release-logs/fresh-eyes/): one
// JSON per run and the pictures. Nothing outside the bundle answers, so this
// is the app with no network; what needs the website is named in the report.
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { NATIVE_UA, ORIGIN, go, serveLikeTheShell } from "../../../../scripts/lib/shell-server.mjs";

const argv = process.argv.slice(2);
const cmd = argv.shift();
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const WIDTH = Number(opt("width", 390));
const HEIGHT = Number(opt("height", WIDTH === 390 ? 844 : WIDTH === 360 ? 780 : 640));
const LANG = opt("lang", "");
const MAX = Number(opt("max", 400));
const ONLY = opt("only", "");
const PART = opt("part", "");
const OUT = path.resolve("out");
const DIR = path.resolve(opt("dir", ".release-logs/fresh-eyes"));
const TAG = `${WIDTH}${LANG ? `-${LANG}` : ""}`;
fs.mkdirSync(path.join(DIR, `shots-${TAG}`), { recursive: true });
fs.mkdirSync(path.join(DIR, `taps-${TAG}`), { recursive: true });

const OWN = "/opt/pw-browsers/chromium";
const launch = () => chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});

export async function phone(browser, { set = {}, fresh = false, scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: scale, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...(LANG ? { locale: LANG } : {}) });
  const seed = fresh ? set : { "purify:onboarded": "99", "purify:whatsNewSeen": "99", ...(LANG ? { "CapacitorStorage.purify_locale": LANG } : {}), ...set };
  await ctx.addInitScript((values) => {
    for (const [k, v] of Object.entries(values)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
  }, seed);
  const log = await serveLikeTheShell(ctx, OUT, {});
  // The website's own pictures (covers, history's media: left out of the
  // bundle and read from purifyapp.net) are answered from this branch's
  // public/ folder, which is what the 1.9 website will serve. Nothing else
  // outside the bundle answers: no API, no account, no audio.
  const webMissing = [];
  log.webMissing = webMissing;
  await ctx.route(/^https:\/\/purifyapp\.net\/.+\.(jpg|jpeg|png|webp|avif|svg)(\?.*)?$/, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(path.resolve("public"), pathname);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    webMissing.push(pathname);
    return route.fulfill({ status: 404, body: "" });
  });
  const outside = [];
  ctx.on("request", (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) outside.push(r.url().slice(0, 140)); });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 240)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`); });
  ctx.on("page", (p) => { if (p !== page) p.close().catch(() => {}); });
  const cdp = await ctx.newCDPSession(page);
  const touch = async (x, y) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(60);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const swipe = async (x, y, dx, dy, steps = 8) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await page.waitForTimeout(16);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / steps, y: y + (dy * i) / steps }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const hold = async (x, y, ms = 800) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await page.waitForTimeout(ms);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  return { ctx, page, log, outside, errors, touch, swipe, hold };
}

/** What a measure can see on the screen as it stands. Runs in the page. */
export function measure() {
  const vw = innerWidth;
  const vh = innerHeight;
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false;
    }
    return true;
  };
  const name = (el) => {
    const text = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[${el.getAttribute("role")}]` : ""} "${text}"`;
  };
  const inScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
      if (/(auto|scroll)/.test(cs.overflowX)) return true;
    }
    return false;
  };
  const out = { brokenImages: [], dashed: [], glyphs: [], keyHints: [], small: [], wide: [], emptyCircles: [], emdash: [], notFound: false };
  const body = document.body.innerText || "";
  out.notFound = /This page could not be found|404\b.*not found/i.test(body.slice(0, 600));
  out.words = body.trim().length;
  out.docWidth = document.documentElement.scrollWidth;
  out.height = document.documentElement.scrollHeight;
  for (const img of document.images) {
    if (!seen(img)) continue;
    const r = img.getBoundingClientRect();
    if (img.complete && img.naturalWidth === 0) out.brokenImages.push(`${img.getAttribute("src")?.slice(0, 90)} (alt "${img.alt.slice(0, 30)}") at y ${Math.round(r.top + scrollY)}`);
  }
  const all = document.body.querySelectorAll("*");
  for (const el of all) {
    if (el.closest("[data-nextjs-dialog],nextjs-portal")) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    // A dashed box: a placeholder look (build 93 notes 4 and 16).
    if (["Top", "Bottom", "Left", "Right"].some((s) => cs[`border${s}Style`] === "dashed" && parseFloat(cs[`border${s}Width`]) > 0) && r.width > 20 && seen(el)) {
      out.dashed.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)} at y ${Math.round(r.top + scrollY)}`);
    }
    // An empty circle where a picture should be (note 1).
    if (r.width >= 28 && r.width <= 160 && Math.abs(r.width - r.height) < 2 && parseFloat(cs.borderTopLeftRadius) >= r.width / 2 - 1 && !el.querySelector("img,svg,canvas,video") && !(el.innerText || "").trim() && cs.backgroundImage === "none" && el.tagName !== "INPUT" && !el.closest("[role=switch],[role=radio],[role=checkbox],[role=slider],button[aria-pressed],label,input") && seen(el)) {
      const hasFace = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || parseFloat(cs.borderTopWidth) > 0;
      if (hasFace) out.emptyCircles.push(`${name(el)} ${Math.round(r.width)}px at y ${Math.round(r.top + scrollY)} class "${String(el.className).slice(0, 60)}"`);
    }
    // Wider than the screen, and not inside something that scrolls sideways.
    if ((r.right > vw + 2 || r.left < -2) && cs.position !== "fixed" && !inScroller(el) && seen(el) && r.width <= vw * 3 && el.children.length === 0) {
      out.wide.push(`${name(el)} left ${Math.round(r.left)} right ${Math.round(r.right)} at y ${Math.round(r.top + scrollY)}`);
    }
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue;
    if (!t || !t.trim() || !n.parentElement || !seen(n.parentElement)) continue;
    if (/[\u2726\u2727\u2728\u2729\u272A\u2736\u2737\u2738\u2739]/.test(t)) out.glyphs.push(t.trim().slice(0, 60));
    if (/(^|[\s(])(Esc|Ctrl|Cmd|\u2318|Press Enter|Shift\+|Tab key|press \/)([\s).,:+]|$)/.test(t)) out.keyHints.push(t.trim().slice(0, 80));
    if (/\u2014/.test(t) && !n.parentElement.closest("[data-mock-allow~=emdash],blockquote,[lang]:not(html),article,[data-verse],[data-reader],[data-prayer-text]")) out.emdash.push(t.trim().slice(0, 80));
  }
  for (const el of document.querySelectorAll("a[href],button,[role=button],[role=tab],[role=radio],[role=switch],[role=checkbox],[role=menuitem],[role=option],input:not([type=hidden]),select,textarea,summary")) {
    if (!seen(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "inline" && el.tagName === "A") continue;
    if (el.classList.contains("hit-44") || el.closest(".hit-44")) continue;
    const r = el.getBoundingClientRect();
    // A control's reach may be widened by a pseudo-element; read it.
    let w = r.width;
    let h = r.height;
    for (const pseudo of ["::before", "::after"]) {
      const p = getComputedStyle(el, pseudo);
      if (p.content !== "none" && p.position === "absolute") {
        const pw = parseFloat(p.width);
        const ph = parseFloat(p.height);
        if (pw > w) w = pw;
        if (ph > h) h = ph;
      }
    }
    if (el.tagName === "INPUT" && /radio|checkbox/.test(el.type) && el.closest("label")) {
      const lr = el.closest("label").getBoundingClientRect();
      w = Math.max(w, lr.width);
      h = Math.max(h, lr.height);
    }
    if (Math.min(w, h) < 43.5) out.small.push(`${name(el)} ${Math.round(w)}x${Math.round(h)} at y ${Math.round(r.top + scrollY)}`);
  }
  for (const k of Object.keys(out)) if (Array.isArray(out[k])) out[k] = [...new Set(out[k])].slice(0, 25);
  return out;
}

/** The kind of page an address is, so two saints are one kind. */
function kindOf(href, patterns) {
  const p = href.split(/[?#]/)[0];
  for (const { re, key } of patterns) if (re.test(p)) return key;
  return p;
}
function routePatterns(dir = "app", parts = []) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "api" || name.startsWith("_") || name.startsWith("@") || name === "__tests__") continue;
      out.push(...routePatterns(full, /^\(.*\)$/.test(name) ? parts : [...parts, name]));
    } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(name)) out.push(parts);
  }
  return out;
}
const PATTERNS = routePatterns()
  .filter((parts) => parts.some((p) => p.startsWith("[")))
  .map((parts) => ({
    key: `/${parts.join("/")}/`,
    re: new RegExp(`^${parts.map((p) => `/${/^\[\[?\.\.\./.test(p) ? ".+" : /^\[.*\]$/.test(p) ? "[^/]+" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).join("")}/?$`),
  }))
  .sort((a, b) => b.key.split("[").length - a.key.split("[").length || b.key.length - a.key.length);

const slug = (href) => href.replace(/^\/|\/$/g, "").replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 80) || "today";
const TABS = ["/", "/bible/", "/discover/", "/prayers/", "/account/"];

const BY_BUTTON = ["/florilegium/", "/saved/", "/dictionary/", "/who-said-it/", "/bible/multi/", "/prayers/personal/", "/prayers/today/", "/prayers/akathists/", "/prayers/hours/", "/prayers/learning/", "/prayers/evening/", "/plan/", "/premium/", "/pricing/", "/campaigns/", "/catechism/collections/", "/account/profile/", "/account/notifications/", "/account/data/", "/account/security/", "/shop/cart/", "/shop/policies/", "/shop/stores/", "/shop/sell/", "/shop/support/", "/shop/request/", "/florilegium/gathering/", "/search/"];

async function settle(page, ms = 2300) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
}

async function crawl() {
  const browser = await launch();
  const { page, log, outside, errors } = await phone(browser);
  const queue = TABS.map((href) => ({ href, from: "the tab bar", depth: 0 }));
  // Screens a reader reaches by a button, not a link, so the crawl cannot follow to them.
  for (const href of BY_BUTTON) queue.push({ href, from: "a button (opened by address)", depth: 1 });
  const kinds = new Map();
  const done = new Map();
  const report = [];
  while (queue.length && report.length < MAX) {
    const { href, from, depth } = queue.shift();
    const key = href.split("#")[0];
    if (done.has(key)) continue;
    const kind = kindOf(key, PATTERNS);
    const n = kinds.get(kind) ?? 0;
    const perKind = key.includes("?") ? 1 : 3;
    if (n >= perKind) continue;
    kinds.set(kind, n + 1);
    done.set(key, true);
    const missingBefore = log.missing.length;
    const outsideBefore = outside.length;
    const errorsBefore = errors.length;
    let failed = "";
    try {
      await go(page, key, { timeout: 20000 });
      await settle(page);
    } catch (e) {
      failed = String(e).split("\n")[0].slice(0, 160);
    }
    const at = await page.evaluate(() => location.pathname + location.search);
    const m = failed ? {} : await page.evaluate(measure).catch((e) => ({ measureFailed: String(e).slice(0, 120) }));
    const shot = `shots-${TAG}/${String(report.length).padStart(3, "0")}-${slug(key)}.png`;
    if (!failed) await page.screenshot({ path: path.join(DIR, shot) }).catch(() => {});
    // The rest of a long page, one more screen down, so the fold is seen too.
    if (!failed && m.height > HEIGHT * 1.6) {
      await page.evaluate((h) => window.scrollTo(0, h), HEIGHT - 120);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(DIR, shot.replace(".png", "-b.png")) }).catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const links = failed ? [] : await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/") && !h.startsWith("//")));
    report.push({ href: key, at, from, depth, kind, failed, shot, missing: log.missing.slice(missingBefore).filter((f) => !f.includes("__next._")), webMissing: [...new Set(log.webMissing)].splice(0), outside: [...new Set(outside.slice(outsideBefore))].slice(0, 12), errors: errors.slice(errorsBefore).slice(0, 6), ...m, links: links.length });
    if (depth < 5) for (const l of [...new Set(links)]) if (!done.has(l.split("#")[0])) queue.push({ href: l, from: key, depth: depth + 1 });
    if (report.length % 20 === 0) console.log(`  ${report.length} screens, ${queue.length} waiting`);
  }
  fs.writeFileSync(path.join(DIR, `crawl-${TAG}.json`), JSON.stringify(report, null, 1));
  console.log(`${report.length} screens walked at ${WIDTH}${LANG ? ` in ${LANG}` : ""}; report in ${path.join(DIR, `crawl-${TAG}.json`)}`);
  await browser.close();
}

/** Every control on the screen, as a reader would count them. Runs in the page. */
function controls() {
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.02) return false;
    }
    return true;
  };
  const list = [];
  let i = 0;
  for (const el of document.querySelectorAll("a[href],button,[role=button],[role=tab],[role=radio],[role=switch],[role=checkbox],[role=menuitem],summary,select,input:not([type=hidden]),textarea")) {
    el.setAttribute("data-fe", String(i));
    if (seen(el) && !el.closest("[data-tab-bar]") && !el.disabled) {
      const href = el.getAttribute("href") || "";
      list.push({
        i,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role") || "",
        type: el.getAttribute("type") || "",
        href,
        text: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 60),
      });
    }
    i++;
  }
  return list;
}

async function taps() {
  const browser = await launch();
  let screens;
  if (ONLY) screens = ONLY.split(",");
  else {
    const crawled = JSON.parse(fs.readFileSync(path.join(DIR, `crawl-${TAG}.json`), "utf8"));
    // One screen of each kind, the tabs first.
    const firstOfKind = new Map();
    for (const s of crawled) if (!s.failed && !s.notFound && s.at.split("?")[0] === s.href.split("?")[0] && !firstOfKind.has(s.kind)) firstOfKind.set(s.kind, s.href);
    screens = [...firstOfKind.values()];
  }
  if (PART) {
    const [k, n] = PART.split("/").map(Number);
    screens = screens.filter((_, i) => i % n === k);
  }
  const results = [];
  const flag = (screen, c, what, detail, shot) => {
    results.push({ screen, control: `${c.tag}${c.role ? `[${c.role}]` : ""} "${c.text}"${c.href ? ` -> ${c.href}` : ""}`, what, detail, shot });
    console.log(`  ! ${screen}  ${c.text || c.tag}: ${what} ${detail ?? ""}`);
  };
  let ph = await phone(browser);
  let shotN = 0;
  for (const [si, screen] of screens.entries()) {
    console.log(`${si + 1}/${screens.length} ${screen}`);
    let list = [];
    const open = async () => {
      // A cold start, then the router: whatever the last tap opened (a sheet,
      // the search, a player) is gone, and every tap starts from the screen
      // as a reader first meets it.
      await ph.page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 60000 });
      await ph.page.waitForFunction(() => typeof window.next?.router?.push === "function", null, { timeout: 30000 });
      await ph.page.waitForTimeout(1800);
      if (screen !== "/") await go(ph.page, screen, { timeout: 20000 });
      await settle(ph.page, 1100);
      return ph.page.evaluate(controls);
    };
    try {
      list = await open();
    } catch (e) {
      results.push({ screen, control: "", what: "the screen did not open", detail: String(e).split("\n")[0].slice(0, 140) });
      await ph.ctx.close().catch(() => {});
      ph = await phone(browser);
      continue;
    }
    const cap = Math.min(list.length, 48);
    let dirty = false;
    for (let k = 0; k < cap; k++) {
      const c = list[k];
      // Not the ways out of the app, and nothing that leaves the walk's reader without their choices.
      if (/^(https?:|mailto:|tel:)/.test(c.href) || c.type === "file") continue;
      try {
        if (dirty) {
          const again = await open();
          dirty = false;
          if (!again.some((x) => x.i === c.i && x.text === c.text)) continue;
        }
        const { page } = ph;
        const sel = `[data-fe="${c.i}"]`;
        const before = await page.evaluate(async (s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
          await new Promise((r) => setTimeout(r, 120));
          const r = el.getBoundingClientRect();
          const x = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2));
          const y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2));
          const top = document.elementFromPoint(x, y);
          const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
          window.__fe = { n: 0, attrs: 0 };
          window.__feObs?.disconnect();
          window.__feObs = new MutationObserver((ms) => { for (const m of ms) { if (m.attributeName === "data-fe") continue; window.__fe.n++; } });
          window.__feObs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
          return {
            x, y, top: r.top, left: r.left, w: r.width, h: r.height,
            covered: top && !(el.contains(top) || top.contains(el)) ? `${top.tagName.toLowerCase()}.${String(top.className).slice(0, 50)}` : "",
            underBar: bar && r.top + r.height / 2 > bar.top ? true : false,
            url: location.pathname + location.search + location.hash,
            scrollY: Math.round(scrollY),
            dialogs: document.querySelectorAll("[role=dialog],[role=menu],[role=listbox],[data-sheet]").length,
            active: document.activeElement === el,
            state: `${el.getAttribute("aria-checked")}|${el.getAttribute("aria-pressed")}|${el.getAttribute("aria-expanded")}|${el.getAttribute("aria-selected")}|${el.checked}`,
            html: [...document.documentElement.attributes].map((a) => `${a.name}=${a.value}`).join(";"),
          };
        }, sel);
        if (!before) continue;
        if (before.covered && !dirty && !c.__retried) { c.__retried = true; dirty = true; k--; continue; }
        if (before.covered) { flag(screen, c, "is covered where a finger lands", `by ${before.covered}${before.underBar ? " (under the tab bar)" : ""}`); continue; }
        await ph.touch(before.x, before.y);
        await page.waitForTimeout(750);
        const after = await page.evaluate((s) => {
          const el = document.querySelector(s);
          const r = el?.getBoundingClientRect();
          const bar = document.querySelector("[data-tab-bar]")?.getBoundingClientRect();
          const barTop = bar && bar.height > 0 ? bar.top : innerHeight;
          // What opened: a dialog, a menu, or the part this control says it opens.
          const openedEls = [...document.querySelectorAll("[role=dialog],[role=menu],[role=listbox],[data-sheet]")];
          const region = el?.getAttribute("aria-controls") ? document.getElementById(el.getAttribute("aria-controls")) : el?.tagName === "SUMMARY" ? el.parentElement : null;
          const box = (n) => { const b = n.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), fixed: getComputedStyle(n).position === "fixed" || !!n.closest("[role=dialog]") }; };
          return {
            gone: !el || !el.isConnected,
            top: r?.top, left: r?.left,
            url: location.pathname + location.search + location.hash,
            scrollY: Math.round(scrollY),
            n: window.__fe?.n ?? -1,
            dialogs: openedEls.length,
            opened: openedEls.filter((d) => d.getBoundingClientRect().height > 0).map(box),
            region: region && el?.getAttribute("aria-expanded") === "true" ? box(region) : el?.tagName === "SUMMARY" && el.parentElement.open ? box(el.parentElement) : null,
            active: document.activeElement === el || (document.activeElement && el?.contains(document.activeElement)),
            activeTag: document.activeElement?.tagName,
            state: el ? `${el.getAttribute("aria-checked")}|${el.getAttribute("aria-pressed")}|${el.getAttribute("aria-expanded")}|${el.getAttribute("aria-selected")}|${el.checked}` : "",
            html: [...document.documentElement.attributes].map((a) => `${a.name}=${a.value}`).join(";"),
            barTop, vw: innerWidth, vh: innerHeight,
            notFound: /This page could not be found/.test(document.body.innerText.slice(0, 500)),
          };
        }, sel);
        const snap = async (label) => {
          const file = `taps-${TAG}/${String(shotN++).padStart(4, "0")}-${slug(screen)}-${label}.png`;
          await page.screenshot({ path: path.join(DIR, file) }).catch(() => {});
          return file;
        };
        const navigated = after.url.split("#")[0] !== before.url.split("#")[0];
        if (navigated) {
          dirty = true;
          if (after.notFound) flag(screen, c, "opens a page that is not found", after.url, await snap("notfound"));
          // Back, as the phone's own Back does it, and where it lands.
          if (before.scrollY > 300) {
            await page.waitForTimeout(500);
            await page.goBack({ timeout: 8000 }).catch(() => {});
            await page.waitForTimeout(1300);
            const back = await page.evaluate(() => ({ url: location.pathname + location.search, y: Math.round(scrollY) }));
            if (back.url === before.url.split("#")[0] && Math.abs(back.y - before.scrollY) > 120) flag(screen, c, "Back lands somewhere else", `left at ${before.scrollY}, back at ${back.y}`, await snap("back"));
          }
          continue;
        }
        if (after.dialogs > before.dialogs || after.opened.length) {
          dirty = true;
          const shot = await snap(`sheet-${k}`);
          for (const o of after.opened) {
            if (o.left < -2 || o.right > after.vw + 2) flag(screen, c, "opens off the side of the screen", `left ${o.left} right ${o.right}`, shot);
            if (o.top < -2) flag(screen, c, "opens with its top off the screen", `top ${o.top}`, shot);
            if (o.bottom > after.vh + 2) flag(screen, c, "opens past the foot of the screen", `bottom ${o.bottom} of ${after.vh}`, shot);
          }
          results.push({ screen, control: `${c.tag} "${c.text}"`, what: "opened", shot });
          continue;
        }
        if (after.region && after.region.bottom > after.barTop + 2) {
          flag(screen, c, "opens under the tab bar and the page does not move with it", `ends at ${after.region.bottom}, bar at ${Math.round(after.barTop)}`, await snap(`under-${k}`));
        }
        const moved = !after.gone && after.scrollY === before.scrollY ? Math.abs(after.top - before.top) + Math.abs(after.left - before.left) : 0;
        if (moved > 10) flag(screen, c, "moves under the finger", `${Math.round(moved)}px`, await snap(`jump-${k}`));
        if (!after.gone && Math.abs(after.scrollY - before.scrollY) > 60 && !/#/.test(c.href)) flag(screen, c, "the page jumps", `${before.scrollY} to ${after.scrollY}`, await snap(`scroll-${k}`));
        const field = /^(input|textarea|select)$/.test(c.tag);
        const changed = after.n > 0 || after.state !== before.state || after.html !== before.html || after.url !== before.url || after.scrollY !== before.scrollY || (field && after.active);
        if (!changed) flag(screen, c, "a tap changes nothing", "", await snap(`nothing-${k}`));
        else if (after.state !== before.state && after.n <= 2 && after.html === before.html) results.push({ screen, control: `${c.tag}${c.role ? `[${c.role}]` : ""} "${c.text}"`, what: "a mark moved and little else did (look)", detail: `${before.state} -> ${after.state}, ${after.n} changes`, shot: await snap(`mark-${k}`) });
        if (after.n > 3 || after.state !== before.state) dirty = true;
      } catch (e) {
        results.push({ screen, control: c.text, what: "the walk stopped on this control", detail: String(e).split("\n")[0].slice(0, 140) });
        await ph.ctx.close().catch(() => {});
        ph = await phone(browser);
        dirty = true;
      }
    }
    if (ph.errors.length) { results.push({ screen, control: "", what: "page errors", detail: [...new Set(ph.errors)].slice(0, 5).join(" | ") }); ph.errors.length = 0; }
    fs.writeFileSync(path.join(DIR, `taps-${TAG}${PART ? `-${PART.replace("/", "of")}` : ""}.json`), JSON.stringify(results, null, 1));
  }
  await browser.close();
}

if (cmd === "crawl") await crawl();
else if (cmd === "taps") await taps();
else if (cmd) console.log("crawl | taps");
