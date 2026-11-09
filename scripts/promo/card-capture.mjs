// Real screens for the release cards (cards.mjs) that the edit frames do not
// already take (edit-capture.mjs takes those), from a local-first export, at
// 6x so a window on a card stays sharp. For 1.8: the New Testament read
// aloud, John 1 with the verse being read lit.
//
// A reading streams from audio.purifyapp.net, which a capture may not reach:
// a silent track of the same name plays in its place (edit-capture.mjs makes
// it), and the website's own files (the verse timings, the covers) are
// answered from the public folder, as the website would answer them. The
// verse lights up as the app lights it, from its own timings.
//
//   node scripts/promo/card-capture.mjs [--export out] [--public public]
import fs from "node:fs";
import path from "node:path";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { REPO, dir, launch } from "./lib.mjs";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const EXPORT = path.resolve(REPO, flag("export", "out"));
const PUBLIC = path.resolve(REPO, flag("public", path.join(path.relative(REPO, EXPORT), "..", "public")));
if (!fs.existsSync(path.join(EXPORT, "index.html"))) throw new Error(`no export in ${EXPORT}: run npm run build:android first`);
const silent = path.join(dir("edit"), "silent.mp3");
if (!fs.existsSync(silent)) throw new Error(`no ${silent}: run edit-capture.mjs first`);
const SILENT = fs.readFileSync(silent);
const TYPES = { json: "application/json", jpg: "image/jpeg", avif: "image/avif", webp: "image/webp", png: "image/png" };
const CAP = dir("cards", "cap");

const browser = await launch();
const open = async (route) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 6, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
  await ctx.addInitScript(() => {
    localStorage.setItem("purify:onboarded", "3");
    localStorage.setItem("purify:whatsNewSeen", "99");
  });
  await serveLikeTheShell(ctx, EXPORT, {});
  await ctx.route(/https:\/\/(audio\.purifyapp\.net|purifyapp\.net|purifyapp\.onrender\.com)\/(audio|covers|read)\/.*/, (r) => {
    const u = new URL(r.request().url());
    const ext = u.pathname.split(".").pop();
    if (ext === "mp3") return r.fulfill({ status: 200, contentType: "audio/mpeg", body: SILENT, headers: { "Access-Control-Allow-Origin": "*" } });
    const file = path.join(PUBLIC, decodeURIComponent(u.pathname));
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return r.fulfill({ status: 200, contentType: TYPES[ext] ?? "application/octet-stream", body: fs.readFileSync(file), headers: { "Access-Control-Allow-Origin": "*" } });
    return r.fulfill({ status: 404, body: "" });
  });
  const page = await ctx.newPage();
  await go(page, route);
  return { ctx, page };
};
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(CAP, `${name}.png`) });
  console.log("screen", name);
};

// The New Testament read aloud (1.8): John 1, Listen, and the first verse lit as it is read.
{
  const { ctx, page } = await open("/bible/john/1/");
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /^Listen$/ }).first().click();
  await page.waitForTimeout(2200);
  await shot(page, "listen-john-1");
  await ctx.close();
}
await browser.close();
