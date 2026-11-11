// Real screens for the edit frames (edits.mjs), from a local-first export, at
// 6x so a close-up stays sharp: the saint web, History's and the Councils'
// atlases stepped to a year by the keys the atlas answers, a chant playing
// with its words lighting up, Now Playing, and History's map with every place
// lit. Also the art the frames use, out of the build's public folder, every
// piece public domain on the app's own record (promoLooks.test.ts holds it),
// and the house fonts.
//
// A chant's recording streams from audio.purifyapp.net, which a capture may
// not reach: a silent track of the same length plays in its place (made with
// ffmpeg), and the website's own files (the words, the covers) are answered
// from the public folder, as the website would answer them. Nothing on the
// screen is changed: the words light up as the app lights them.
//
//   node scripts/promo/edit-capture.mjs [--export out] [--public public]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { NATIVE_UA, go, serveLikeTheShell } from "../lib/shell-server.mjs";
import { REPO, copyFonts, dir, launch } from "./lib.mjs";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const EXPORT = path.resolve(REPO, flag("export", "out"));
const PUBLIC = path.resolve(REPO, flag("public", path.join(path.relative(REPO, EXPORT), "..", "public")));
if (!fs.existsSync(path.join(EXPORT, "index.html"))) throw new Error(`no export in ${EXPORT}: run npm run build:android first`);

/** The art, from public/: each is public domain on the app's own record. */
export const ART = {
  "prayers.v4.jpg": "sections/prayers.v4.jpg",
  "bible.jpg": "sections/bible.jpg",
  "chrysostom-at-constantinople.v1.jpg": "history/media/chrysostom-at-constantinople.v1.jpg",
  "foundation-of-constantinople.v1.jpg": "history/media/foundation-of-constantinople.v1.jpg",
  "bolshevik-persecution.v1.jpg": "history/media/bolshevik-persecution.v1.jpg",
  "pentecost.v1.jpg": "history/media/pentecost.v1.jpg",
  "great-schism-1054.v1.jpg": "history/media/great-schism-1054.v1.jpg",
  "david.v1.jpg": "audio/art/david.v1.jpg",
  "arsenius-the-great.jpg": "saints/icons/arsenius-the-great.jpg",
  "hilarion-the-great.jpg": "saints/icons/hilarion-the-great.jpg",
  "photius-the-great.v2.jpg": "saints/icons/photius-the-great.v2.jpg",
  "moses-the-black.v2.jpg": "saints/icons/moses-the-black.v2.jpg",
  "fathers-of-sinai.jpg": "saints/icons/fathers-of-sinai.jpg",
  "pachomius-the-great.jpg": "saints/icons/pachomius-the-great.jpg",
  "cyril-of-jerusalem.v2.jpg": "saints/icons/cyril-of-jerusalem.v2.jpg",
  "justinian-the-great.v2.jpg": "saints/icons/justinian-the-great.v2.jpg",
  "john-chrysostom.v2.jpg": "saints/icons/john-chrysostom.v2.jpg",
  "seven-sleepers-of-ephesus.jpg": "saints/icons/seven-sleepers-of-ephesus.jpg",
  "job-of-pochaev.jpg": "saints/icons/job-of-pochaev.jpg",
  "maccabean-martyrs.jpg": "saints/icons/maccabean-martyrs.jpg",
  "macarius-the-great.jpg": "saints/icons/macarius-the-great.jpg",
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  copyFonts(EXPORT);
  const ART_DIR = dir("edit", "art");
  for (const [name, from] of Object.entries(ART)) fs.copyFileSync(path.join(PUBLIC, from), path.join(ART_DIR, name));
  const CAP = dir("edit", "cap");
  const silent = path.join(dir("edit"), "silent.mp3");
  if (!fs.existsSync(silent)) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "600", "-c:a", "libmp3lame", "-b:a", "16k", silent]);
  const SILENT = fs.readFileSync(silent);
  const TYPES = { json: "application/json", jpg: "image/jpeg", avif: "image/avif", webp: "image/webp", png: "image/png" };

  const browser = await launch();
  // `at` sets the day the app reads, for a screen that only shows on certain days.
  const open = async (route, { at } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 6, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA });
    if (at) await ctx.clock.setFixedTime(at);
    await ctx.addInitScript(() => {
      localStorage.setItem("purify:onboarded", "99");
      localStorage.setItem("purify:whatsNewSeen", "99");
    });
    await serveLikeTheShell(ctx, EXPORT, {});
    await ctx.route(/https:\/\/(audio\.purifyapp\.net|purifyapp\.net|purifyapp\.onrender\.com)\/(audio|covers|chants)\/.*/, (r) => {
      const u = new URL(r.request().url());
      const ext = u.pathname.split(".").pop();
      if (ext === "mp3") return r.fulfill({ status: 200, contentType: "audio/mpeg", body: SILENT, headers: { "Access-Control-Allow-Origin": "*" } });
      const file = path.join(PUBLIC, decodeURIComponent(u.pathname));
      if (fs.existsSync(file)) return r.fulfill({ status: 200, contentType: TYPES[ext] ?? "application/octet-stream", body: fs.readFileSync(file), headers: { "Access-Control-Allow-Origin": "*" } });
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

  // The saint web, St John Chrysostom's.
  {
    const { ctx, page } = await open("/saints/john-chrysostom/web/");
    await page.waitForTimeout(5500);
    await shot(page, "web-john-chrysostom");
    await ctx.close();
  }

  // The atlases: opened from their door, paused, and stepped by the keys.
  const atlas = async (route, name, steps) => {
    const { ctx, page } = await open(route);
    await page.waitForTimeout(3000);
    const door = page.locator('[data-tour="atlas"]').first();
    await door.scrollIntoViewIfNeeded();
    await door.click();
    await page.waitForTimeout(1200);
    await page.locator(".atlas-play").first().click();
    await page.locator('[role="slider"]').first().focus();
    await page.keyboard.press("Home");
    await page.waitForTimeout(1800);
    let at = 0;
    for (const [index, label, wait] of steps) {
      for (; at < index; at++) await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(wait);
      await shot(page, `${name}-${label}`);
    }
    await ctx.close();
  };
  // At 64 the arc from Antioch to Rome is drawn while the step arrives: the frame is taken then.
  await atlas("/history/", "hatlas", [[0, "33", 2050], [3, "64-early", 650]]);
  await atlas("/councils/", "catlas", [[4, "325", 2050]]);

  // History's map with every place lit: its door, centred.
  {
    const { ctx, page } = await open("/history/");
    await page.waitForTimeout(3000);
    await page.locator('[data-tour="atlas"]').first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
    await shot(page, "door");
    await ctx.close();
  }

  // Psalm 135 sung, its first line lit word by word; then Now Playing from the mini player.
  {
    const { ctx, page } = await open("/chants/psalm-135/");
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: /^Play/ }).first().click();
    await page.waitForTimeout(4200);
    await shot(page, "chant-4200");
    await page.getByRole("link", { name: "Today" }).first().click();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: /^Now playing/i }).first().click();
    await page.waitForTimeout(1800);
    await shot(page, "nowplaying");
    await ctx.close();
  }

  // Today's Nativity Fast card, taken for the fourteenth frame and 1.8's
  // cards, is no longer taken: its star is the four-point sparkle, out by the
  // owner's word of 2026-11-11 (CLAUDE.md, "No sparkle star"). Both are in
  // the Vault; the capture as it was is at f88395ad7.
  await browser.close();
}
