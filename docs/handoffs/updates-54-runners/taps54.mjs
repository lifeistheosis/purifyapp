// Updates 54: the councils' faces, heads, books and shelves on the export, at 390, as a reader taps them
// (from Updates 49's faces49.mjs). The website's files are asked of purifyapp.net, which lacks the three new
// pictures until the merge: Sardica's and Antioch's heads keep their blurred preview, St Caesarius's round its plate.
//   node taps54.mjs <out dir> <shots dir> <json out>
import fs from "node:fs";
const R = "/home/user/purifyapp/scripts";
const { chromium } = await import("/home/user/purifyapp/node_modules/playwright/index.mjs");
const { NATIVE_UA, go, serveLikeTheShell } = await import(`${R}/lib/shell-server.mjs`);
const { mainWeb } = await import(`${R}/lib/main-web.mjs`);
const { motionOptions, pinMotion } = await import(`${R}/lib/motion.mjs`);
const { tapAt } = await import(`${R}/lib/tap.mjs`);
const [base, shots, outFile] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const FATHERS = [
  ["ephesus", "St. Juvenal of Jerusalem", "juvenal-of-jerusalem.v2"],
  ["ephesus", "St. Celestine of Rome", "celestine-of-rome.v2"],
  ["chalcedon", "St. Anatolius of Constantinople", "anatolius-of-constantinople.v2"],
  ["chalcedon", "St. Juvenal of Jerusalem", "juvenal-of-jerusalem.v2"],
  ["second-constantinople", "St. Eutychius of Constantinople", "eutychius-of-constantinople.v2"],
  ["third-constantinople", "St. Sophronius of Jerusalem", "sophronius-of-jerusalem.v2"],
  ["second-nicaea", "St. Irene the Empress", "irene-the-empress.v2"],
];
const SEVEN = ["ephesus", "chalcedon", "second-constantinople", "third-constantinople", "second-nicaea"];
const LOCAL = ["sardica", "antioch-268", "orange-529"];
const results = [];
const say = (ok, what, data, expected) => {
  results.push({ ok, what, ...(expected ? { expected } : {}), ...(data ? { data } : {}) });
  console.log(`${ok ? "PASS" : expected ? "EXPECTED" : "FAIL"} ${what}${data ? " " + JSON.stringify(data) : ""}`);
};
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function open(route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions("on") });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
      localStorage.setItem("CapacitorStorage.purify_locale", "en");
    } catch {}
  });
  await pinMotion(ctx, "on");
  await serveLikeTheShell(ctx, base, {});
  const asked = [];
  for (const at of ["https://purifyapp.net/**", "https://purifyapp.onrender.com/**", "https://*.supabase.co/storage/v1/object/public/**"])
    await ctx.route(at, (r) => (asked.push(r.request().url().replace(/^https:\/\/[^/]+/, "")), mainWeb(r)));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await go(page, route, { timeout: 60000 });
  await page.waitForTimeout(3500);
  return { ctx, page, errors, asked, cdp: await ctx.newCDPSession(page) };
}

// Every picture of a council on the page: where it was asked of, whether it came, whether it shows.
const pictures = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => /\/history\/media\/|caesarius|juvenal|celestine|anatolius|eutychius|sophronius|irene/.test(img.currentSrc || img.src))
      .map((img) => {
        const r = img.getBoundingClientRect();
        const src = img.currentSrc || img.src;
        return {
          file: src.split("/").pop(),
          from: src.startsWith("https://localhost") || src.startsWith("capacitor://") ? "bundle" : new URL(src).host,
          loaded: img.complete && img.naturalWidth > 0,
          hidden: getComputedStyle(img).display === "none" || getComputedStyle(img).opacity === "0",
          hero: img.getAttribute("data-hero-picture"),
          w: Math.round(r.width),
        };
      }),
  );

async function tapTo(page, cdp, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  const href = await locator.getAttribute("href");
  const b = await locator.boundingBox();
  const before = new URL(page.url()).pathname;
  if (b) await tapAt(cdp, Math.round(b.x + b.width / 2), Math.round(b.y + Math.min(b.height / 2, 40)));
  await page.waitForFunction((p) => location.pathname !== p, before, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const after = new URL(page.url()).pathname;
  const norm = (p) => (p ?? "").replace(/\/?$/, "/");
  say(norm(after) === norm(href) && after !== before, `${label}: tapped, it opens ${href}`, { before, after });
  return after;
}

// The heads and the books (the documents door) of the eight councils; batch 1's Fathers; St Caesarius at Orange.
for (const council of [...SEVEN, ...LOCAL]) {
  const { ctx, page, errors, asked, cdp } = await open(`/councils/${council}/`);
  try {
    const head = await page.evaluate(() => {
      const h = document.querySelector("[data-council-hero]");
      if (!h) return null;
      const img = h.querySelector("img[data-hero-picture]");
      const src = img ? img.currentSrc || img.src : null;
      return { preview: !!h.querySelector("img[aria-hidden]"), state: img?.getAttribute("data-hero-picture") ?? "none", file: src?.split("/").pop() ?? null, from: src ? (src.startsWith("https://localhost") ? "bundle" : new URL(src).host) : null, loaded: img ? img.complete && img.naturalWidth > 0 : false };
    });
    await page.screenshot({ path: `${shots}/${council}-head.png` });
    if (SEVEN.includes(council)) say(!!head && head.state === "shown" && head.from === "bundle" && head.loaded, `${council}: the head shows its icon from the bundle`, head);
    else if (council === "orange-529") say(head === null, `${council}: no head (his rule: the plate)`, head);
    else {
      const ok = !!head && head.preview && (head.state === "shown" || head.from === "purifyapp.net");
      say(ok && head.state === "shown", `${council}: the head`, head, ok && head.state !== "shown" ? "the live website lacks the picture until the merge: its blurred preview shows" : undefined);
    }
    const door = page.locator("[data-council-door]").first();
    if (await door.count()) {
      await door.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      const minis = await door.evaluate((d) => [...d.querySelectorAll("img")].map((img) => ({ file: (img.currentSrc || img.src).split("/").pop(), from: (img.currentSrc || img.src).startsWith("https://localhost") ? "bundle" : "web", loaded: img.complete && img.naturalWidth > 0, hidden: img.style.display === "none" })));
      await door.screenshot({ path: `${shots}/${council}-door.png` });
      const local = !SEVEN.includes(council);
      const ok = minis.length > 0 && minis.every((m) => m.loaded && !m.hidden);
      say(ok, `${council}: the documents door's books show`, { minis }, !ok && local ? "a local council's window is asked of the live website, which lacks it until the merge" : undefined);
      await tapTo(page, cdp, door, `${council}: the documents door`);
    } else say(false, `${council}: no documents door`);
    if (council !== "orange-529") {
      // Back to the council for its Fathers.
      await go(page, `/councils/${council}/`, { timeout: 60000 });
      await page.waitForTimeout(2500);
    }
    const fathers = FATHERS.filter((f) => f[0] === council);
    if (council === "orange-529") {
      await go(page, `/councils/${council}/`, { timeout: 60000 });
      await page.waitForTimeout(2500);
      fathers.push([council, null, "caesarius-of-arles.v1"]);
    }
    if (fathers.length) {
      await page.waitForSelector("[data-council-fathers]", { timeout: 20000 });
      await page.locator("[data-council-fathers]").scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      const row = await page.evaluate(() => [...document.querySelectorAll("[data-council-fathers] ul button")].map((b) => {
        const img = b.querySelector("img");
        return { name: b.getAttribute("aria-label"), img: !!img, file: img ? (img.currentSrc || img.src).split("/").pop() : null, loaded: img ? img.complete && img.naturalWidth > 0 : false, empty: !img && !b.querySelector("svg") && !(b.textContent ?? "").trim() };
      }));
      say(row.every((r) => !r.empty), `${council}: no empty round in the Fathers' row`, { row: row.map((r) => `${r.name}${r.img ? (r.loaded ? "" : " (not loaded)") : " (plate)"}`) });
      for (const [, name, stem] of fathers) {
        const r = name ? row.find((x) => x.name === name) : row.find((x) => /Caesarius/.test(x.name ?? ""));
        const ok = !!r && r.img && r.loaded && (r.file ?? "").startsWith(stem);
        if (stem.startsWith("caesarius")) say(ok, `${council}: St Caesarius's round`, r, !ok && r ? "his cover is asked of the live website, which lacks it until the merge: the plate with its cross" : undefined);
        else say(ok, `${council}: ${name}'s round shows his picture (${stem})`, r);
        const sel = `[data-council-fathers] ul button[aria-label="${r?.name}"]`;
        const b = r ? await page.locator(sel).boundingBox() : null;
        if (b) {
          await tapAt(cdp, Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2));
          await page.waitForTimeout(1400);
          const shown = await page.evaluate(() => document.querySelector("[data-council-fathers] > div span.font-serif")?.textContent?.trim() ?? null);
          say(shown === r.name, `${council}: ${r.name} tapped, the card names him`, { shown });
          await page.locator("[data-council-fathers]").screenshot({ path: `${shots}/${council}-${stem}.png` });
        }
      }
    }
    say(errors.length === 0, `${council}: no page errors`, errors.length ? errors.slice(0, 2) : undefined);
    const avifs = asked.filter((a) => a.startsWith("/history/") && a.endsWith(".avif"));
    say(avifs.length === 0, `${council}: no History AVIF asked of the website`, avifs.length ? { avifs } : undefined);
  } catch (e) {
    say(false, `${council}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

// The shelves: the room's councils, and Sardica's and Antioch's own shelves, each book tapped open.
for (const [route, label, link] of [
  ["/reading/councils/", "the room", 'a[href*="/reading/councils/sardica"]'],
  ["/reading/councils/", "the room", 'a[href*="/reading/councils/antioch-268"]'],
  ["/reading/councils/sardica/", "Sardica's shelf", "[data-council-shelf] ul a"],
  ["/reading/councils/antioch-268/", "Antioch's shelf", "[data-council-shelf] ul a"],
]) {
  const { ctx, page, errors, asked, cdp } = await open(route);
  try {
    await page.waitForTimeout(1500);
    const pics = await pictures(page);
    await page.screenshot({ path: `${shots}/${route.split("/").filter(Boolean).join("-")}.png` });
    const council = pics.filter((p) => /council-of-(sardica|antioch-268)/.test(p.file));
    const seven = pics.filter((p) => /council-of-|nicaea|constantinople/.test(p.file) && !/sardica|antioch-268/.test(p.file));
    say(seven.every((p) => p.from === "bundle" && p.loaded), `${label}: the seven's pictures from the bundle`, { n: seven.length, notLoaded: seven.filter((p) => !p.loaded).map((p) => p.file) });
    if (council.length) say(council.every((p) => p.loaded), `${label}: Sardica's and Antioch's pictures`, { council }, council.some((p) => !p.loaded) ? "asked of the live website, which lacks them until the merge" : undefined);
    const target = page.locator(link).first();
    if (await target.count()) await tapTo(page, cdp, target, `${label}: ${link}`);
    else say(false, `${label}: nothing to tap at ${link}`);
    say(errors.length === 0, `${label}: no page errors`, errors.length ? errors.slice(0, 2) : undefined);
    const avifs = asked.filter((a) => a.startsWith("/history/") && a.endsWith(".avif"));
    say(avifs.length === 0, `${label}: no History AVIF asked of the website`, avifs.length ? { avifs } : undefined);
  } catch (e) {
    say(false, `${label}: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}

// St Irene's letters' cover: the work's own page and her page's writings.
for (const [route, tag] of [["/saints/irene-the-empress/letters-for-the-seventh-council/", "work"], ["/saints/irene-the-empress/", "saint"]]) {
  const { ctx, page, errors } = await open(route);
  try {
    await page.waitForTimeout(1500);
    const covers = await page.evaluate(() => [...document.querySelectorAll("[data-cover-picture]")].map((el) => {
      const img = el.tagName === "IMG" ? el : el.querySelector("img");
      return { state: el.getAttribute("data-cover-picture"), file: img ? (img.currentSrc || img.src).split("/").pop() : null, loaded: img ? img.complete && img.naturalWidth > 0 : false };
    }));
    const hers = covers.filter((c) => (c.file ?? "").startsWith("irene-the-empress.v2"));
    say(hers.length > 0 && hers.every((c) => c.state === "shown" && c.loaded), `${tag} page: the letters' cover shows her solidus (irene-the-empress.v2)`, { hers });
    say(errors.length === 0, `${tag} page: no page errors`, errors.length ? errors.slice(0, 2) : undefined);
  } catch (e) {
    say(false, `${tag} page: ERROR ${String(e).split("\n")[0].slice(0, 200)}`);
  } finally {
    await ctx.close();
  }
}
fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
await browser.close();
const failed = results.filter((r) => !r.ok && !r.expected).length;
const expected = results.filter((r) => !r.ok && r.expected).length;
console.log(`\n${results.length - failed - expected} of ${results.length} passed, ${expected} expected (the live website until the merge), ${failed} failed`);
