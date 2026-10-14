// What `node scripts/release.mjs live` asks the website after a push, and how
// it judges each answer.
//
// A push to main is the deploy (AGENTS.md), and until 1.6 the only look at the
// site afterwards was a person with a browser. This asks the same questions
// every time, and takes each from the branch rather than from a list kept by
// hand: the service worker's cache name in public/sw.js, so it knows the new
// deploy is the one answering; the current note's kind and its release's name
// for What's New (data/changelog/entries.json); every picture the highlights
// and the release email name; and the redirects next.config.ts sets. The main
// pages are the one list written here, and lib/release/__tests__/live.test.ts
// holds each of them to a route in app/, and every reading below to the
// TypeScript it reads.
//
// It only ever GETs. planFromBranch() reads the files; everything after it is
// handed its fetch, so the test runs it against a fake site.

import fs from "node:fs";
import path from "node:path";

/** Pages a reader opens first. Each is a route in app/ (live.test.ts holds that). */
export const MAIN_PAGES = [
  "/",
  "/bible",
  "/bible/john/1",
  "/discover",
  "/prayers",
  "/settings",
  "/start",
  "/parishes",
  "/saints",
  "/calendar",
  "/whats-new",
  "/search-corpus.json",
];

/** A page no route answers, which must come back 404 and not as a page. */
export const MISSING_PAGE = "/no-such-page-release-check";

/** Where the apps ask for content packs, and the origin a phone asks from. */
export const PACKS_ROUTE = "/api/packs";
export const PHONE_ORIGIN = "https://localhost";

/** How often the wait for the new deploy asks again. */
export const POLL_MS = 30_000;

/** How long one answer may take. A cold page on a fresh deploy can take a while. */
const TIMEOUT_MS = 60_000;

const ASK = {
  "User-Agent": "purify-release-live (node scripts/release.mjs live)",
  // What's New is read in English, the language the note is written in.
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * @typedef {{ src: string, from: "highlights" | "email", elsewhere: boolean }} Picture
 *   `elsewhere`: drawn on another site too (a mail app), so it must allow that.
 * @typedef {{ from: string, to: string, permanent: boolean }} Redirect
 * @typedef {{
 *   version: string | null, release: string | null, cacheName: string | null,
 *   kind: string | null, name: string, pictures: Picture[], pages: string[],
 *   missing: string, redirects: Redirect[],
 *   packs?: string | null
 * }} Plan
 *   `packs`: where the apps ask for content packs, when this release has them.
 * @typedef {(url: string, init?: any) => Promise<Response>} Fetch
 */

/** "1.6.1" to "1.6", as lib/whatsNew/version.ts featureRelease does. */
export function featureRelease(version) {
  return String(version).split(".").slice(0, 2).join(".");
}

/**
 * The cache name a service worker's source declares, or null.
 * @param {string} source
 * @returns {string | null}
 */
export function cacheNameIn(source) {
  return (String(source).match(/const CACHE_VERSION = "([^"]+)"/) ?? [])[1] ?? null;
}

/**
 * "purify-1.5.2" to "1.5.2", and "purify-1.6.0" to "1.6": the release a cache
 * name belongs to, written the way the notes write it (release.mjs bump starts
 * a release's cache at .0).
 * @param {string} name
 */
export function releaseOfCache(name) {
  return String(name).replace(/^purify-/, "").replace(/^(\d+\.\d+)\.0$/, "$1");
}

/**
 * Every picture a module names after `marker`, read as text the way
 * release.mjs check reads them: the `src: "/..."` of each.
 * @param {string} source
 * @param {string} marker
 * @returns {string[]}
 */
export function picturesIn(source, marker) {
  const s = String(source);
  const at = s.indexOf(marker);
  if (at < 0) return [];
  return [...s.slice(at).matchAll(/src: "(\/[^"]+)"/g)].map((m) => m[1]);
}

/**
 * The plain redirects next.config.ts sets: a fixed path to a fixed path.
 * A rule with a parameter or a pattern in it is left out, since one address
 * cannot stand for it.
 * @param {string} source
 * @returns {Redirect[]}
 */
export function redirectsIn(source) {
  const s = String(source);
  const at = s.indexOf("redirects()");
  if (at < 0) return [];
  const rule = /\{\s*source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*permanent:\s*(true|false),?\s*\}/g;
  return [...s.slice(at).matchAll(rule)]
    .map((m) => ({ from: m[1], to: m[2], permanent: m[3] === "true" }))
    .filter((r) => /^\/[\w\-./]*$/.test(r.from));
}

/**
 * What this branch says the live site should serve, read from its files.
 * @param {string} [root]
 * @returns {Plan}
 */
export function planFromBranch(root = process.cwd()) {
  const read = (/** @type {string} */ p) => fs.readFileSync(path.join(root, p), "utf8");
  const version = (read("lib/whatsNew/version.ts").match(/export const CURRENT_VERSION = "([^"]+)"/) ?? [])[1] ?? null;
  const release = version ? featureRelease(version) : null;
  /** @type {{ version: string, name?: string, kind: string }[]} */
  const entries = JSON.parse(read("data/changelog/entries.json"));
  // A patch goes by its release's name (lib/whatsNew/releaseName.ts).
  const name = String(entries.find((e) => e.version === release)?.name ?? "").trim();
  /** @type {Picture[]} */
  const pictures = [];
  const add = (/** @type {string} */ src, /** @type {Picture["from"]} */ from, /** @type {boolean} */ elsewhere) => {
    const had = pictures.find((p) => p.src === src);
    if (had) had.elsewhere = had.elsewhere || elsewhere;
    else pictures.push({ src, from, elsewhere });
  };
  for (const src of picturesIn(read("lib/whatsNew/highlights.ts"), "export const RELEASE_HIGHLIGHTS")) add(src, "highlights", false);
  // The release email's pictures are drawn by mail apps, from this site.
  for (const src of picturesIn(read("lib/whatsNew/releaseEmail.ts"), "export const RELEASE_EMAIL")) add(src, "email", true);
  return {
    version,
    release,
    cacheName: cacheNameIn(read("public/sw.js")),
    kind: entries.find((e) => e.version === version)?.kind ?? null,
    name,
    pictures,
    pages: [...MAIN_PAGES],
    missing: MISSING_PAGE,
    redirects: redirectsIn(read("next.config.ts")),
    // The apps' content packs (docs/PACKS.md), from the release that added them.
    packs: fs.existsSync(path.join(root, "app/api/packs/route.ts")) ? PACKS_ROUTE : null,
  };
}

// ---------------------------------------------------------------- judging

/**
 * The words a page draws before any script runs: its HTML without comments,
 * scripts and styles, entities read, spaces collapsed. A page carries its
 * payload inside <script> tags, where a word can be found without ever being
 * drawn (standin-serve.mjs learned that on 2026-10-13), so those come out.
 * @param {string} html
 */
export function drawnText(html) {
  /** @type {Record<string, string>} */
  const named = { quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(quot|apos|lt|gt|nbsp);/g, (_, e) => named[e])
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const words = (/** @type {string} */ s) => String(s).replace(/\s+/g, " ").trim();

/**
 * @param {Response} res
 * @returns {{ ok: boolean, detail: string }}
 */
export function judgePage(res) {
  return { ok: res.status === 200, detail: `answers ${res.status}` };
}

/**
 * A picture is there when it answers 200 as an image. One a mail app draws
 * must also allow another site to draw it: a 200 with
 * Cross-Origin-Resource-Policy: same-origin is a broken image in every mail
 * app that loads it straight from here, which is how the email's cross was
 * broken until 2026-10-06 while every check said 200.
 * @param {Response} res
 * @param {{ elsewhere: boolean }} picture
 * @returns {{ ok: boolean, detail: string, policy?: boolean }}
 *   `policy`: the fault is the cross-origin rule, not the picture.
 */
export function judgePicture(res, picture) {
  const type = res.headers.get("content-type") ?? "";
  const policy = (res.headers.get("cross-origin-resource-policy") ?? "").trim().toLowerCase();
  if (res.status !== 200) return { ok: false, detail: `answers ${res.status}` };
  if (!/^image\//i.test(type)) return { ok: false, detail: `answers 200, but as ${type || "no content type"}, not a picture` };
  if (picture.elsewhere && policy && policy !== "cross-origin") {
    return { ok: false, detail: `${type}, but Cross-Origin-Resource-Policy is ${policy}, so a mail app will not draw it`, policy: true };
  }
  return { ok: true, detail: picture.elsewhere ? `${type}, and a mail app may draw it` : type };
}

/**
 * @param {Response} res
 * @returns {{ ok: boolean, detail: string }}
 */
export function judgeMissing(res) {
  return { ok: res.status === 404, detail: `answers ${res.status}` };
}

/**
 * A redirect goes where next.config.ts says, with the status it says
 * (Next answers 308 for permanent, 307 for not), and stays on this site: a
 * Location on another origin (Render's own http://localhost:10000, say) would
 * strand the reader.
 * @param {Response} res
 * @param {Redirect} rule
 * @param {string} site
 * @returns {{ ok: boolean, detail: string }}
 */
export function judgeRedirect(res, rule, site) {
  const location = res.headers.get("location");
  const detail = `answers ${res.status}${location ? ` to ${location}` : ""}`;
  const statuses = rule.permanent ? [301, 308] : [302, 303, 307];
  if (!statuses.includes(res.status) || !location) return { ok: false, detail };
  const trim = (/** @type {string} */ p) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  const target = new URL(location, site);
  return { ok: target.origin === new URL(site).origin && trim(target.pathname) === trim(rule.to), detail };
}

/**
 * The apps' content packs, asked the way a phone asks: from the Android
 * shell's origin. They are right when the answer is 200, lets that origin
 * read it, and is packs of this very release with today's verse and the
 * board in them. Packs from an older release are never used by a newer app
 * (lib/packs/types.ts, packsTrusted), so a deploy that serves them has
 * quietly turned content drops off.
 * @param {Response} res
 * @param {string} text
 * @param {{ version: string | null }} plan
 * @param {string} today  YYYY-MM-DD, UTC
 * @returns {{ ok: boolean, detail: string }}
 */
export function judgePacks(res, text, plan, today) {
  if (res.status !== 200) return { ok: false, detail: "answers " + res.status };
  const allowed = res.headers.get("access-control-allow-origin");
  if (allowed !== PHONE_ORIGIN) return { ok: false, detail: "answers 200, but a phone may not read it (Access-Control-Allow-Origin: " + (allowed ?? "none") + ")" };
  /** @type {any} */
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, detail: "answers 200, but not as JSON" };
  }
  if (body?.format !== 1) return { ok: false, detail: "answers format " + body?.format + ", which the apps do not read" };
  if (body.release !== plan.version) return { ok: false, detail: "answers packs of " + body.release + ", not " + plan.version };
  const days = body.packs?.["verse-of-day"]?.days;
  if (!days || !days[today]) return { ok: false, detail: "answers no verse for today (" + today + ")" };
  if (!body.packs?.board) return { ok: false, detail: "answers no board message pack" };
  const board = body.packs.board.message ? '"' + body.packs.board.message.headline + '"' : "empty";
  return { ok: true, detail: "packs of " + body.release + ", " + Object.keys(days).length + " verse days from " + Object.keys(days)[0] + ", the board " + board };
}

// ---------------------------------------------------------------- asking

/**
 * Ask the site everything the plan names and print ok or NO for each, in the
 * style of `release.mjs check`. It first waits, up to `wait` minutes, for
 * /sw.js to carry the plan's cache name, and asks nothing else until it does:
 * every other answer would be the old deploy's. A site that cannot be reached
 * or answers wrongly is a NO line, never a throw.
 * @param {{
 *   site: string, plan: Plan, fetch: Fetch, wait?: number,
 *   sleep?: (ms: number) => Promise<void>, now?: () => number,
 *   log?: (line: string) => void
 * }} options
 * @returns {Promise<{ failed: number, serving: boolean, asked: string[] }>}
 */
export async function checkLive({
  site,
  plan,
  fetch,
  wait = 20,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  now = Date.now,
  log = console.log,
}) {
  let failed = 0;
  /** @type {string[]} */
  const asked = [];
  const line = (/** @type {boolean} */ ok, /** @type {string} */ text, /** @type {string} */ fix = "") => {
    if (!ok) failed++;
    log(`${ok ? "  ok  " : "  NO  "}${text}${!ok && fix ? `\n        ${fix}` : ""}`);
  };
  const info = (/** @type {string} */ text) => log(`  ..  ${text}`);

  /**
   * One GET. The body is read whole either way, so no answer is left open.
   * @param {string} address
   * @returns {Promise<{ res: Response | null, text: string, error: string }>}
   */
  const ask = async (address, /** @type {Record<string, string>} */ extra = {}) => {
    asked.push(address);
    try {
      const res = await fetch(new URL(address, site).href, {
        method: "GET",
        redirect: "manual",
        headers: { ...ASK, ...extra },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await res.text().catch(() => "");
      return { res, text, error: "" };
    } catch (e) {
      const err = /** @type {any} */ (e);
      return { res: null, text: "", error: String(err?.cause?.code ?? err?.message ?? err) };
    }
  };

  log(`Live: ${site}, release ${plan.version ?? "unknown"}\n`);
  log("The deploy");
  if (!plan.version || !plan.cacheName) {
    line(false, "this branch names no version or no service worker cache name", "lib/whatsNew/version.ts and public/sw.js");
    return { failed, serving: false, asked };
  }
  const minutes = Math.max(0, Number(wait) || 0);
  const started = now();
  const deadline = started + minutes * 60_000;
  if (minutes > 0) info(`waiting up to ${minutes} minute(s) for /sw.js to say ${plan.cacheName}, asking every ${POLL_MS / 1000} seconds`);
  let seen = null;
  let trouble = "";
  for (;;) {
    // A fresh address each time, so no cache between here and the server
    // can hand back the old worker.
    const got = await ask(`/sw.js?release-live=${now()}`);
    seen = got.res?.status === 200 ? cacheNameIn(got.text) : null;
    trouble = got.res ? (got.res.status === 200 ? "it names no cache" : `it answers ${got.res.status}`) : `no answer: ${got.error}`;
    if (seen === plan.cacheName || now() + POLL_MS > deadline) break;
    await sleep(POLL_MS);
  }
  const waited = Math.round((now() - started) / 60_000);
  if (seen !== plan.cacheName) {
    const after = minutes > 0 ? ` after ${minutes} minute(s)` : "";
    const fix = minutes > 0
      ? "Is the push out? If it is, Render's dashboard says whether the deploy is still building or failed."
      : "If the push is out, give the deploy time: node scripts/release.mjs live   (waits up to 20 minutes)";
    if (seen) line(false, `/sw.js says ${seen}, not ${plan.cacheName}: the live site is still on ${releaseOfCache(seen)}${after}`, fix);
    else line(false, `/sw.js does not say which deploy is serving (${trouble})${after}`, fix);
    log("\nNothing else was asked: every answer would have been the old deploy's.");
    return { failed, serving: false, asked };
  }
  line(true, `/sw.js says ${plan.cacheName}: the new deploy is serving${waited > 0 ? ` (after ${waited} minute(s))` : ""}`);

  log("\nWhat's New");
  if (!plan.kind) {
    line(false, `data/changelog/entries.json has no note for ${plan.version}`, `node scripts/release.mjs note ${plan.version}`);
  } else {
    const page = await ask("/whats-new");
    if (!page.res || page.res.status !== 200) {
      line(false, `/whats-new ${page.res ? `answers ${page.res.status}` : `does not answer: ${page.error}`}`);
    } else {
      const drawn = drawnText(page.text);
      const fix = "The page shows the patch_notes table when it answers: the owner accepts the note in /admin?tab=patch-notes.";
      line(drawn.includes(words(plan.kind)), `/whats-new shows ${plan.version}'s kind, "${plan.kind}"`, fix);
      if (plan.name) line(drawn.includes(words(plan.name)), `and ${plan.release}'s name, ${plan.name}`, fix);
      else info(`${plan.release} has no name to look for`);
    }
  }

  log("\nThe pictures");
  if (!plan.pictures.length) info("the highlights and the release email name no picture");
  for (const picture of plan.pictures) {
    const got = await ask(picture.src);
    if (!got.res) {
      line(false, `${picture.src} does not answer: ${got.error}`);
      continue;
    }
    const verdict = judgePicture(got.res, picture);
    const fix = verdict.policy
      ? "next.config.ts must answer cross-origin for picture files (lib/email/__tests__/picturesShowElsewhere.test.ts)"
      : `It is named by lib/whatsNew/${picture.from === "email" ? "releaseEmail" : "highlights"}.ts and should be in public/.`;
    line(verdict.ok, `${picture.src} ${verdict.ok ? "is there, " : ""}${verdict.detail}`, fix);
  }

  log("\nThe pages");
  for (const page of plan.pages) {
    const got = await ask(page);
    if (!got.res) line(false, `${page} does not answer: ${got.error}`);
    else line(judgePage(got.res).ok, `${page} ${judgePage(got.res).detail}`);
  }
  {
    const got = await ask(plan.missing);
    if (!got.res) line(false, `${plan.missing} does not answer: ${got.error}`);
    else {
      const verdict = judgeMissing(got.res);
      line(verdict.ok, `${plan.missing}, a page that does not exist, ${verdict.detail}`, "A page that does not exist must answer 404, or search engines keep it and readers see no error.");
    }
  }
  for (const rule of plan.redirects) {
    const got = await ask(rule.from);
    if (!got.res) {
      line(false, `${rule.from} does not answer: ${got.error}`);
      continue;
    }
    const verdict = judgeRedirect(got.res, rule, site);
    line(verdict.ok, verdict.ok ? `${rule.from} goes to ${rule.to} (${got.res.status})` : `${rule.from} should go to ${rule.to}, but it ${verdict.detail}`, "next.config.ts, redirects()");
  }

  if (plan.packs) {
    log("\nThe apps' content packs");
    const got = await ask(plan.packs, { Origin: PHONE_ORIGIN });
    if (!got.res) line(false, `${plan.packs} does not answer: ${got.error}`);
    else {
      const verdict = judgePacks(got.res, got.text, plan, new Date(now()).toISOString().slice(0, 10));
      line(verdict.ok, `${plan.packs} ${verdict.detail}`, "docs/PACKS.md says what the apps expect. Until this is right, the apps keep what their build carries.");
    }
  }

  log(failed ? `\n${failed} thing(s) on ${site} are not right.` : `\nEverything asked of ${site} is right.`);
  return { failed, serving: true, asked };
}
