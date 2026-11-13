// Coming back to the app (build 95 note 14, his word of 2026-11-13: "whenever
// I ran out of purify and tab back in there's always a UI moving issue. for
// example. when my keyboard is open on another app and I switch into purify
// the UI shows up weird then it fixes itself").
//
// A return shows the page exactly as it was left, and nothing moves after the
// first frame shown. On the export, each main screen and three sheets are
// opened the app's way (scripts/lib/shell-server.mjs: the front door, then the
// router), left a little way down, and every element's box is taken. Then the
// page is hidden for real: a second tab in front, so document.visibilityState
// is "hidden" and frames stop, as on a phone. Playwright cannot do this: it
// turns on focus emulation for every page it drives, which counts as a
// capture and keeps the page visible, so this walk drives Chromium over the
// DevTools protocol itself. While hidden, the return is stood in for, and on
// show every element's box is measured on every frame for 1.5 seconds, with
// motion on:
//
//   plain     nothing changes while away.
//   keyboard  the window is shortened while away, as another app's keyboard
//             shortens an Android app's window, and shown at its full height.
//   vv        the visual viewport alone is shortened while away (a keyboard
//             laid over the page, lib/ui/viewport.ts) and given back on show.
//   foreign   Android, another app's keyboard still going away as Purify comes
//             back: Android reports it to Purify's window until it has gone.
//             The safe-area plugin decides whether the web view makes room for
//             it, and this walk sizes the window as the installed plugin would:
//             published (8.0.1), it made room for any keyboard, so the page is
//             shown short and given its height back 250 ms later; patched
//             (patches/@capacitor-community+safe-area+8.0.1.patch), only for a
//             keyboard a field in the page asked for, so it is not shortened.
//             What the patched plugin itself does on a phone only a phone shows.
//   own       Purify's own keyboard, on a sheet whose field has the focus: the
//             window is shortened as the plugin does for it, and the field and
//             its sheet must stand above the keyboard. It still moves.
//   bars      Purify's own keyboard over a field in the page (with note 14:
//             the tab bar and the journal's Write button rode up on it and
//             covered the field). No screen a new reader opens has a field in
//             the page beside the tab bar (each search opens a sheet, and the
//             journal's is Plus), so one is put on Prayers where the foot of
//             the screen will be once the keyboard is up, and tapped: while
//             the keyboard is up every bar fixed at the foot has stepped away
//             (lib/ui/keyboardFlag.ts, app/globals.css) and the field is
//             uncovered; once it has gone the tab bar is back.
//   rotate    a real turn of a tablet still lays the page out again.
//
//   npm run build:android, then:
//   node scripts/return-walk.mjs [out dir] [--online] [--only /,/settings/] [--modes plain,foreign]
//        [--rule any|field] [--shots dir] [--self-test]
//
// --rule stands in for a plugin other than the installed one (before and after
// frames). --self-test proves the measure: the foreign return under the
// published plugin must fail on Today, and the plain return must pass.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NATIVE_UA, ORIGIN, shellFile } from "./lib/shell-server.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv.splice(i, 2)[1] : null;
};
const ONLY = flag("--only")?.split(",") ?? null;
const MODES = flag("--modes")?.split(",") ?? null;
const RULE_ARG = flag("--rule");
const SHOTS = flag("--shots");
const ONLINE = argv.includes("--online");
const SELF_TEST = argv.includes("--self-test");
const OUT = path.resolve(argv.find((a) => !a.startsWith("--")) ?? "out");
if (!fs.existsSync(path.join(OUT, "index.html"))) throw new Error(`no native export in ${OUT}: run npm run build:android first`);

const CHROME = "/opt/pw-browsers/chromium";
const W = 390;
const H = 844;
/** A phone's keyboard with its row of suggestions, in CSS px at 390 wide. */
const KB = 336;
/** How long another app's keyboard takes to go once Purify is back, about. */
const LINGER_MS = 250;
const FRAMES = 90;

/** Whether the installed safe-area plugin makes room for any keyboard, or only the page's own. */
function installedRule() {
  const java = "node_modules/@capacitor-community/safe-area/android/src/main/java/com/getcapacitor/community/safearea/SafeAreaPlugin.java";
  if (!fs.existsSync(java)) return "any";
  return /isVisible\(WindowInsetsCompat\.Type\.ime\(\)\) && keyboardIsTheApps\(\)/.test(fs.readFileSync(java, "utf8")) ? "field" : "any";
}
const RULE = RULE_ARG ?? installedRule();

const SCREENS = [
  { at: "/" },
  { at: "/bible/john/1/" },
  { at: "/prayers/" },
  { at: "/saints/" },
  { at: "/discover/" },
  { at: "/community/" },
  { at: "/settings/" },
  { at: "/bible/john/1/", sheet: "Pick a chapter, currently John 1" },
  { at: "/saints/", sheet: "Search the saints" },
  { at: "/community/", sheet: "Purify" },
  { at: "/prayers/", field: true },
];
const ALL_MODES = ["plain", "keyboard", "vv", "foreign", "own", "bars", "rotate"];

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".webmanifest": "application/manifest+json", ".xml": "application/xml" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- a browser over the DevTools protocol

async function browser() {
  const port = 9200 + Math.floor(Math.random() * 700);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "return-walk-"));
  // The window is roomier than the phone: the first frames after a tab comes back are taken from the
  // window itself (its content is 143px shorter than its size, and never under 500 wide), and a window
  // smaller than the phone would cut off the foot of every one of them.
  const proc = spawn(CHROME, ["--headless", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${W + 210},${H + 300}`, "--hide-scrollbars", "--mute-audio", "--no-first-run", "about:blank"], { stdio: "ignore" });
  let version = null;
  for (let i = 0; i < 150 && !version; i++) {
    await sleep(100);
    version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
  }
  if (!version) throw new Error("chromium did not start");
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((ok, ko) => {
    ws.addEventListener("open", ok);
    ws.addEventListener("error", ko);
  });
  let id = 0;
  const pending = new Map();
  const handlers = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      const { ok, ko } = pending.get(m.id);
      pending.delete(m.id);
      return m.error ? ko(new Error(m.error.message)) : ok(m.result);
    }
    for (const fn of handlers.get(`${m.sessionId ?? ""}|${m.method}`) ?? []) fn(m.params);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((ok, ko) => {
      const n = ++id;
      pending.set(n, { ok, ko });
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const on = (sessionId, method, fn) => {
    const key = `${sessionId}|${method}`;
    if (!handlers.has(key)) handlers.set(key, new Set());
    handlers.get(key).add(fn);
    return () => handlers.get(key).delete(fn);
  };
  const close = async () => {
    await send("Browser.close").catch(() => {});
    ws.close();
    proc.kill("SIGKILL");
    await sleep(300);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  };
  return { send, on, close };
}

// ---- what runs in the page, before its own code

const RECORDER = `(() => {
  try { localStorage.setItem("purify:onboarded", "99"); localStorage.setItem("purify:whatsNewSeen", "99"); } catch {}
  const realVV = window.visualViewport;
  const vvResize = new Set();
  let cover = 0;
  const vv = {
    get width() { return realVV.width; }, get height() { return realVV.height - cover; },
    get offsetTop() { return realVV.offsetTop; }, get offsetLeft() { return realVV.offsetLeft; },
    get pageTop() { return realVV.pageTop; }, get pageLeft() { return realVV.pageLeft; }, get scale() { return realVV.scale; },
    addEventListener(t, fn) { if (t === "resize") vvResize.add(fn); realVV.addEventListener(t, fn); },
    removeEventListener(t, fn) { vvResize.delete(fn); realVV.removeEventListener(t, fn); },
  };
  try { Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv }); } catch {}
  const R = (window.__ret = { armed: false, frames: [], control: new Set() });
  R.cover = (px) => { cover = px; for (const fn of vvResize) try { fn(new Event("resize")); } catch {} };
  const pathOf = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && e !== document.body && i < 4; e = e.parentElement, i++) {
      let s = e.tagName.toLowerCase();
      const data = [...e.attributes].find((a) => a.name.startsWith("data-"));
      if (data) s += "[" + data.name + "]";
      const aria = e.getAttribute("aria-label");
      if (aria) s += "[aria-label=" + aria.slice(0, 30) + "]";
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const all = () => Array.from(document.querySelectorAll("body *"));
  const box = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
  const off = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 0.5);
  R.place = () => [Math.round(document.scrollingElement.scrollTop), ...all().filter((e) => e.scrollTop > 0).slice(0, 12).map((e) => Math.round(e.scrollTop))].join(",");
  R.quiet = (frames) => new Promise((done) => {
    const base = new Map(all().map((e) => [e, box(e)]));
    let n = 0;
    const tick = () => {
      for (const [el, b] of base) if (el.isConnected && off(box(el), b)) R.control.add(el);
      if (++n < frames) requestAnimationFrame(tick); else done(R.control.size);
    };
    requestAnimationFrame(tick);
  });
  R.baseline = () => { R.base = new Map(all().map((e) => [e, box(e)])); R.basePlace = R.place(); return R.base.size; };
  const record = () => {
    const shown = performance.now();
    let n = 0;
    const tick = (t) => {
      const f = { i: n, t: Math.round(t - shown), h: innerHeight, moved: 0, top: [], place: R.place() };
      const list = [];
      for (const [el, b] of R.base) {
        if (!el.isConnected || R.control.has(el)) continue;
        const now = box(el);
        if (off(now, b)) { f.moved++; list.push([el, now.map((v, i) => Math.round(v - b[i]))]); }
      }
      list.sort((a, b) => Math.max(...b[1].map(Math.abs)) - Math.max(...a[1].map(Math.abs)));
      f.top = list.slice(0, 4).map(([el, d]) => [pathOf(el), d]);
      R.frames.push(f);
      if (++n < ${FRAMES}) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && R.armed) { R.armed = false; R.frames = []; record(); }
  }, true);
})();`;

// ---- one screen, one return

async function open(cdp, { at, sheet }) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", newWindow: false });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => cdp.send(m, p, sessionId);
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) if (await evaluate(expression).catch(() => false)) return true;
    return false;
  };
  const fetched = new Map();
  await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  cdp.on(sessionId, "Fetch.requestPaused", async (p) => {
    const url = new URL(p.request.url);
    const answer = (code, type, body) => send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: code, responseHeaders: [{ name: "Content-Type", value: type }], body: body.toString("base64") }).catch(() => {});
    if (url.origin === ORIGIN) {
      const file = shellFile(OUT, url.pathname);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return answer(200, MIME[path.extname(file)] ?? "application/octet-stream", fs.readFileSync(file));
      return answer(404, "text/plain", Buffer.from("not found"));
    }
    // The main web, read as the walks read it with --online: GETs only, fetched by Node.
    const mainWeb = /^https:\/\/purifyapp\.(net|onrender\.com)$/.test(url.origin) || (url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/"));
    if (!ONLINE || p.request.method !== "GET" || !mainWeb) return send("Fetch.failRequest", { requestId: p.requestId, errorReason: "InternetDisconnected" }).catch(() => {});
    try {
      if (!fetched.has(url.href)) {
        fetched.set(url.href, (async () => {
          const r = await fetch(url.href, { headers: Object.fromEntries(Object.entries(p.request.headers).filter(([k]) => !/^(host|connection)$/i.test(k))) });
          return { code: r.status, headers: [...r.headers].filter(([k]) => !/^(content-encoding|content-length|transfer-encoding)$/i.test(k)).map(([name, value]) => ({ name, value })), body: Buffer.from(await r.arrayBuffer()).toString("base64") };
        })());
      }
      const got = await fetched.get(url.href);
      await send("Fetch.fulfillRequest", { requestId: p.requestId, responseCode: got.code, responseHeaders: got.headers, body: got.body });
    } catch {
      send("Fetch.failRequest", { requestId: p.requestId, errorReason: "Failed" }).catch(() => {});
    }
  });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SHOTS ? 2 : 1, mobile: true });
  await send("Emulation.setUserAgentOverride", { userAgent: NATIVE_UA });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }, { name: "prefers-color-scheme", value: "dark" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: RECORDER });
  await send("Page.navigate", { url: `${ORIGIN}/` });
  if (!(await until(`typeof window.next?.router?.push === "function"`, 60000))) throw new Error("the router never came");
  await until(`document.documentElement.dataset.launch === "ready"`, 30000);
  await sleep(1500);
  if (at !== "/") {
    let there = false;
    for (let attempt = 0; attempt < 4 && !there; attempt++) {
      await evaluate(`window.next.router.push(${JSON.stringify(at)})`);
      there = await until(`location.pathname === ${JSON.stringify(at)} && !!document.querySelector("[data-route-content]")`, 10000);
    }
    if (!there) throw new Error(`never reached ${at}`);
  }
  await sleep(6500);
  if (sheet) {
    // Opened from the screen as it first stands, with a tap.
    const point = await evaluate(`(() => {
      const el = [...document.querySelectorAll("button, a, [role=button]")].find((e) => {
        const r = e.getBoundingClientRect();
        return r.width && r.height && r.bottom > 0 && r.top < innerHeight && (e.getAttribute("aria-label") === ${JSON.stringify(sheet)} || (e.innerText || "").trim() === ${JSON.stringify(sheet)});
      });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })()`);
    if (!point) throw new Error(`no "${sheet}" to tap`);
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point[0], y: point[1] }] });
    await sleep(60);
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    if (!(await until(`!!document.querySelector("[role=dialog]")`, 5000))) throw new Error(`"${sheet}" opened nothing`);
    await sleep(1600);
  } else {
    // A reader part way down the page, where a page that lost its place would show it.
    await evaluate(`document.scrollingElement.scrollHeight > innerHeight * 1.6 && window.scrollTo(0, 360)`);
    await sleep(900);
  }
  if ((await evaluate("location.pathname")) !== at) throw new Error(`left ${at} while it settled`);
  return { targetId, sessionId, send, evaluate };
}

const fieldFocused = `(() => { const a = document.activeElement; return !!a && (a.isContentEditable || a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /^(text|search|email|url|tel|password|number)$/.test(a.type))); })()`;

async function walk(screen, mode, rule) {
  const cdp = await browser();
  try {
    const page = await open(cdp, screen);
    const focused = await page.evaluate(fieldFocused);
    const metrics = (w, h) => page.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: SHOTS ? 2 : 1, mobile: true });
    if (mode === "bars") {
      // A field in the page where the foot of the screen will be once the keyboard is up (the journal's
      // search sat there), tapped as a finger taps it.
      const point = await page.evaluate(`(() => {
        window.scrollTo(0, 0);
        const input = document.createElement("input");
        input.type = "search";
        input.setAttribute("data-walk-field", "");
        input.style.cssText = "position:absolute;left:16px;right:16px;top:${H - KB - 72}px;height:48px;font-size:16px;z-index:1";
        document.body.appendChild(input);
        const r = input.getBoundingClientRect();
        return [r.x + r.width / 2, r.y + r.height / 2];
      })()`);
      await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point[0], y: point[1] }] });
      await sleep(60);
      await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(300);
      // The keyboard comes: the plugin pads the window for the page's own field.
      await metrics(W, H - KB);
      await sleep(500);
      const up = await page.evaluate(`(() => {
        const f = document.querySelector("[data-walk-field]");
        const r = f.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        const bars = [...document.querySelectorAll('[data-screen-edge="bottom"], .now-playing-lift, [data-foot-bar]')];
        const showing = bars.filter((b) => !b.contains(f) && [b, ...b.querySelectorAll("*")].some((e) => getComputedStyle(e).visibility !== "hidden"));
        return { focused: document.activeElement === f, flag: document.documentElement.getAttribute("data-keyboard"), bars: bars.length, showing: showing.map((b) => b.tagName + (b.getAttribute("aria-label") ? "[" + b.getAttribute("aria-label") + "]" : "")), uncovered: hit === f || f.contains(hit) };
      })()`);
      // It goes: the window has its height back.
      await metrics(W, H);
      await sleep(600);
      const down = await page.evaluate(`(() => { const t = document.querySelector("[data-tab-bar]"); const cs = t && getComputedStyle(t); return { flag: document.documentElement.getAttribute("data-keyboard"), tabBar: !!cs && cs.visibility === "visible" && Number(cs.opacity) > 0.99 }; })()`);
      // And it answers a finger again: Today's tab, tapped, goes to Today.
      const tab = await page.evaluate(`(() => { const a = document.querySelector('[data-tab-bar] a[href="/"]'); if (!a) return null; const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
      if (tab) {
        await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tab[0], y: tab[1] }] });
        await sleep(60);
        await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      let went = false;
      for (let i = 0; i < 40 && !went; i++, await sleep(100)) went = (await page.evaluate("location.pathname")) === "/";
      const ok = up.focused && up.flag === "up" && up.bars > 0 && up.showing.length === 0 && up.uncovered && down.flag === null && down.tabBar && went;
      return { ok, detail: `keyboard up: the flag ${up.flag}, ${up.bars - up.showing.length} of ${up.bars} foot bars stepped away${up.showing.length ? ` (showing: ${up.showing.join(", ")})` : ""}, the field ${up.uncovered ? "uncovered" : "covered"}; keyboard gone: the flag ${down.flag}, the tab bar ${down.tabBar ? "back" : "missing"}, and its Today tab ${went ? "goes to Today" : "does nothing"}` };
    }
    if (mode === "own") {
      if (!focused) return { skip: "no field has the focus here" };
      // The field the keyboard is for, before and after the window makes room for the keyboard.
      const field = `(() => { const r = document.activeElement.getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; })()`;
      const before = await page.evaluate(field);
      await metrics(W, H - KB);
      await sleep(700);
      const after = await page.evaluate(field);
      const inSight = after[0] >= 0 && after[1] <= after[2] + 0.5;
      // Where the field stood under what is now the keyboard, it has to have moved up out of its way.
      const hadToMove = before[1] > H - KB;
      const moved = !hadToMove || before[1] - after[1] > 100;
      return { ok: inSight && moved, detail: `the field ${Math.round(before[0])}-${Math.round(before[1])} in ${before[2]}, then ${Math.round(after[0])}-${Math.round(after[1])} in ${after[2]} (the keyboard ${KB} tall)` };
    }
    if (mode === "rotate") {
      const before = await page.evaluate(`JSON.stringify([innerWidth, document.querySelector("[data-tab-bar] > div")?.getBoundingClientRect().width, document.querySelector("[data-route-content]")?.getBoundingClientRect().width])`);
      await metrics(H, W);
      await sleep(900);
      const after = await page.evaluate(`JSON.stringify([innerWidth, document.querySelector("[data-tab-bar] > div")?.getBoundingClientRect().width, document.querySelector("[data-route-content]")?.getBoundingClientRect().width])`);
      const [b, a] = [JSON.parse(before), JSON.parse(after)];
      return { ok: a[0] === H && a[2] !== b[2], detail: `width ${b[0]} to ${a[0]}, the page ${Math.round(b[2])} to ${Math.round(a[2])} wide, the bar ${Math.round(b[1] ?? 0)} to ${Math.round(a[1] ?? 0)}` };
    }
    // Another app's keyboard on a page whose own field has the focus is not stood in for: Android gives
    // the page back the keyboard it had (the field's own), so that return is not another app's keyboard.
    if (mode === "foreign" && focused) return { skip: "a field has the focus: the keyboard on return is the page's own" };
    await page.evaluate(`window.__ret.quiet(60)`);
    const count = await page.evaluate(`window.__ret.baseline()`);
    await page.evaluate(`window.__ret.armed = true`);
    const away = await cdp.send("Target.createTarget", { url: "about:blank", newWindow: false });
    for (let i = 0; i < 50 && (await page.evaluate("document.visibilityState")) !== "hidden"; i++) await sleep(100);
    if ((await page.evaluate("document.visibilityState")) !== "hidden") throw new Error("the page would not hide");
    // While away.
    const short = mode === "keyboard" || (mode === "foreign" && (rule === "any" || focused));
    if (short) await metrics(W, H - KB);
    if (mode === "vv") await page.evaluate(`window.__ret.cover(${KB})`);
    await sleep(900);
    const shots = [];
    if (SHOTS) cdp.on(page.sessionId, "Page.screencastFrame", (p) => { shots.push(p); page.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {}); });
    // Back: at full height, unless the window is still short as another app's keyboard leaves.
    if (mode === "keyboard") await metrics(W, H);
    if (mode === "vv") await page.evaluate(`window.__ret.cover(0)`);
    await cdp.send("Target.activateTarget", { targetId: page.targetId });
    if (SHOTS) await page.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 }).catch(() => {});
    if (mode === "foreign" && short) {
      await sleep(LINGER_MS);
      await metrics(W, H);
    }
    await sleep(1900);
    if (SHOTS) await page.send("Page.stopScreencast").catch(() => {});
    const R = await page.evaluate(`({ frames: window.__ret.frames, place: window.__ret.basePlace, quiet: window.__ret.control.size })`);
    await cdp.send("Target.closeTarget", { targetId: away.targetId }).catch(() => {});
    if (R.frames.length < 30) throw new Error(`only ${R.frames.length} frames after the return`);
    const first = R.frames[0];
    const asLeft = first.moved === 0 && first.place === R.place;
    const later = R.frames.slice(1).filter((f) => f.moved > 0 || f.place !== R.place);
    if (SHOTS && shots.length) {
      const dir = path.join(SHOTS, `${rule}-${mode}-${screen.at.replace(/\W+/g, "_")}${screen.sheet ? "-sheet" : ""}`);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const t0 = shots[0].metadata.timestamp;
      shots.forEach((s, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, "0")}-${Math.round((s.metadata.timestamp - t0) * 1000)}ms.jpg`), Buffer.from(s.data, "base64")));
      // Each frame's size in CSS px: a window still short for a keyboard is a short frame.
      fs.writeFileSync(path.join(dir, "frames.json"), JSON.stringify(shots.map((s, i) => ({ i, ms: Math.round((s.metadata.timestamp - t0) * 1000), width: s.metadata.deviceWidth, height: s.metadata.deviceHeight }))));
    }
    const worst = (later[0] ?? (asLeft ? null : first))?.top?.[0];
    return {
      ok: asLeft && later.length === 0,
      detail: `${count} elements (${R.quiet} move by themselves), as left on the first frame: ${asLeft}, frames after it not as left: ${later.length} of ${R.frames.length - 1}${worst ? `; e.g. ${worst[0]} ${JSON.stringify(worst[1])}` : ""}`,
    };
  } finally {
    await cdp.close();
  }
}

// ---- the walk

const runs = [];
if (SELF_TEST) {
  runs.push({ screen: SCREENS[0], mode: "foreign", rule: "any", expect: false });
  runs.push({ screen: SCREENS[0], mode: "plain", rule: RULE, expect: true });
} else {
  for (const screen of SCREENS) {
    if (ONLY && !ONLY.includes(screen.at)) continue;
    for (const mode of MODES ?? ALL_MODES) {
      if (screen.field ? mode !== "bars" : mode === "bars") continue;
      if (mode === "rotate" && screen.sheet) continue;
      if (mode === "own" && !screen.sheet) continue;
      runs.push({ screen, mode, rule: RULE, expect: true });
    }
  }
}
console.log(`return walk: ${runs.length} returns on ${OUT}, the safe-area plugin's rule: ${RULE === "field" ? "room only for the page's own keyboard (patched)" : "room for any keyboard (published)"}`);
let fails = 0;
for (const { screen, mode, rule, expect } of runs) {
  const name = `${screen.at}${screen.sheet ? ` with "${screen.sheet}"` : screen.field ? " with a field in the page" : ""}, ${mode}${SELF_TEST ? ` (${rule})` : ""}`;
  try {
    const r = await walk(screen, mode, rule);
    if (r.skip) {
      console.log(`  - ${name}: not stood in for (${r.skip})`);
      continue;
    }
    const pass = r.ok === expect;
    if (!pass) fails++;
    console.log(`  ${pass ? "✓" : "✗"} ${name}: ${r.detail}${SELF_TEST ? ` (expected ${expect ? "still" : "moving"})` : ""}`);
  } catch (e) {
    fails++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}
console.log(fails ? `✗ ${fails} of ${runs.length} failed` : SELF_TEST ? "✓ the measure sees a return that moves, and one that holds still" : "✓ every return held still");
process.exit(fails ? 1 : 0);
