// The native export, answered the way the phones' shells answer it.
//
// scripts/export-walk.mjs and scripts/export-perf.mjs used to serve out/ like
// an ordinary web host: an address ending in "/" got that folder's own
// index.html. Neither shell does that. Capacitor answers ANY address with no
// file extension with the root index.html, on both platforms:
//
//   Android  WebViewLocalServer.handleLocalRequest: path "/" or a last
//            segment with no "." (html5mode, on by default) is served
//            basePath + "/index.html".
//   iOS      CapacitorRouter.route(for:): an empty pathExtension returns
//            basePath + "/index.html".
//
// So inside the apps there is one document, the front door's, and every other
// screen is reached by a soft navigation that reads the page's index.txt.
// A tool that opened /bible/john/1/ as its own document was walking a path no
// phone takes, and since 1.5.2 the bundle does not carry those documents at
// all (scripts/native-build.mjs, prunePageDocuments).
//
// What this module gives a tool:
//   serveLikeTheShell  the route handler: the front door for every address
//                      without an extension, the file for one with, and
//                      nothing from outside the bundle. That is also the app
//                      with no network.
//   go                 the app's own way to a screen: a cold start at the
//                      front door, then the router.
//   inBundle           whether the bundle carries a page.
import fs from "node:fs";
import path from "node:path";

export const ORIGIN = "https://localhost";

/** What the shells append to the WebView's user agent (capacitor.config.ts). */
export const NATIVE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 PurifyNative";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};

/** True when the shells would answer this address with the front door. */
export function isFrontDoorAddress(pathname) {
  const p = decodeURIComponent(pathname);
  if (p === "/") return true;
  const last = p.split("/").filter(Boolean).pop() ?? "";
  return !last.includes(".");
}

/** The file the shell hands over for an address, whether or not it exists. */
export function shellFile(out, pathname) {
  if (isFrontDoorAddress(pathname)) return path.join(out, "index.html");
  return path.join(out, decodeURIComponent(pathname));
}

/**
 * Whether the bundle carries a page. A page is its index.txt, which is what a
 * soft navigation reads; the front door is its document.
 */
export function inBundle(out, page) {
  const p = decodeURIComponent(page.split(/[?#]/)[0]);
  if (p === "/" || p === "") return fs.existsSync(path.join(out, "index.html"));
  return fs.existsSync(path.join(out, p, "index.txt"));
}

/** The bytes of the payload a soft navigation to this page reads. */
export function payloadBytes(out, page) {
  const p = decodeURIComponent(page.split(/[?#]/)[0]);
  const file = p === "/" || p === "" ? path.join(out, "index.html") : path.join(out, p, "index.txt");
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

/**
 * Answer every request the way the shell does. `log` collects what was asked:
 *   asked      every address inside the bundle's origin
 *   missing    addresses with an extension that the bundle does not hold
 *   documents  addresses asked for as a document (a cold load or a hard
 *              navigation). In the app only the first one is ever real.
 *   pageFiles  any .html asked for other than the front door's. The phones
 *              never ask; a tool that does is not walking the app.
 *   bytes      what was handed over
 */
export async function serveLikeTheShell(ctx, out, log = {}) {
  log.asked ??= [];
  log.missing ??= [];
  log.documents ??= [];
  log.pageFiles ??= [];
  log.bytes ??= 0;
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== ORIGIN) return route.abort();
    const pathname = decodeURIComponent(url.pathname);
    log.asked.push(pathname);
    if (req.resourceType() === "document") log.documents.push(pathname);
    if (pathname.endsWith(".html") && pathname !== "/index.html") log.pageFiles.push(pathname);
    const file = shellFile(out, url.pathname);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      log.bytes += fs.statSync(file).size;
      return route.fulfill({ path: file, contentType: MIME[path.extname(file)] ?? "application/octet-stream" });
    }
    log.missing.push(pathname);
    return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
  });
  return log;
}

/**
 * Go to a screen the way the app does. The first call in a page is the cold
 * start: the front door's document, then the wait for the router. Every call
 * after that, and the rest of the first, is a soft navigation.
 *
 * `window.next.router` is the App Router's own handle, the one a tapped Link
 * drives. A hard `page.goto` of an inner address would be handed the front
 * door by the shell and show Today under that address, which is true to the
 * app and useless to a walk.
 */
export async function go(page, to, { timeout = 30000 } = {}) {
  const target = new URL(to, ORIGIN);
  const href = target.pathname + target.search + target.hash;
  if (page.url() === "about:blank") {
    await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => typeof window.next?.router?.push === "function", null, { timeout });
    if (href === "/") return;
  }
  await page.evaluate((h) => window.next.router.push(h), href);
  await page
    .waitForFunction((p) => location.pathname === p, target.pathname, { timeout })
    .catch(() => {});
}
