// A saint's picture at the top of his page on a phone (1.7, the owner's note
// 19 of 2026-10-16): fetch each public-domain icon from Wikimedia Commons,
// check its licence on its page, cut the picture, and write the file the
// website serves (public/covers/saints/<slug>.v1.jpg).
//
// Modelled on scripts/fetch-read-covers.mjs, with its rules: only the
// public-domain family passes (Public domain, PD-Art, PD-old, CC0; a CC BY-SA
// photograph of an old icon does not), and nothing reaches a reader that
// nobody has opened. Every title and every cut below was chosen by looking
// at the picture: the saint is the one the page is about, read from the
// icon's own inscription or, where it is a metal plate that cannot be read,
// from the deesis list of the source the file names (docs/licensing/
// SAINT_HEROES.md says which); the whole head and halo are in; nothing
// outside the painted field shows (no raised border, no white photo
// background, no clamp, no red board edge); and it is cut at the pixels the
// scan has, never enlarged.
//
// THE SHAPE. Four wide by five tall, as wide as the painted field allows:
// the picture fills a phone's width at the top of the page and melts into
// the page below the name (components/saints/SaintHeroPicture.tsx). The
// bundled icons are 420px tall at most, which is why a page without one of
// these keeps its icon at its own size on the dark plate instead.
//
// Usage:
//   node scripts/fetch-saint-heroes.mjs --cache <dir> [--only slug,slug]
//
//   --cache  Where the originals are kept, OUTSIDE the repository: each in a
//            folder of its own, <dir>/<slug>/. A file already there is used
//            as it is; a missing one is downloaded there.
//   --only   Cut only these again (after moving a cut).
//
// Writes public/covers/saints/<slug>.v1.jpg and prints the rows for
// lib/saints/heroes.ts and docs/licensing/SAINT_HEROES.md. A picture that is
// replaced gets a new version in its name (basil-the-great.v2.jpg): the
// website serves /covers/ to the apps for a day at a time (next.config.ts).
//
// The downloaded files are only ever read as pixels by sharp. Nothing in
// them is run.

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "covers", "saints");
const UA = "PurifyApp/1.0 (https://purifyapp.net; lifeistheosis@users.noreply.github.com)";

const ALLOWED = /^(public domain|pd-art|pd|pd-old.*|cc0( 1\.0)?)$/i;
const REJECT = /(cc by|by-sa|by-nc|by-nd|-nd\b|gfdl|non-?commercial|no derivatives|fair use)/i;

/**
 * The deesis row of the iconostasis of the Dormition cathedral of the
 * Kirillo-Belozersky monastery, 1497: one standing figure to a board, the
 * set the read-aloud covers' prophets and apostles come from, so a saint's
 * page and the player read as one family. Each board is about 1,200 by
 * 3,000 pixels; inside its raised border the painted field is 950 to 1,000
 * pixels wide, and the cut stays inside it. Gregory's and Nicholas's boards
 * carry a later silver cover over the whole ground, border and all, so their
 * cut may run wider.
 */
const K = (n, name) => `File:Kirillo-Belozersky iconostasis ${n} - ${name}.jpg`;

/** `crop` is {left, top, width} in the pixels of the file as downloaded; the height is width x 1.25. */
const HEROES = [
  // The Vladimir icon, 12th century, the Tretyakov Gallery: the whole board
  // in a museum photograph. The cut is inside its painted field, from the
  // top of the Mother of God's veil to the Child's feet.
  { slug: "theotokos", title: "File:Vladimirskaja ikona Božiej Materi.jpg", crop: { left: 424, top: 530, width: 1088 } },
  { slug: "john-chrysostom", title: K(16, "John Chrysostom"), crop: { left: 110, top: 140, width: 960 } },
  { slug: "basil-the-great", title: K("06", "Basil"), crop: { left: 114, top: 156, width: 960 } },
  // The board's inscription is on a metal plate and cannot be read; the
  // source the file names (icon-art.info, group 84) lists this row's Gregory
  // as Gregory the Theologian, the only Gregory in it.
  { slug: "gregory-theologian", title: K("05", "Gregorius"), crop: { left: 112, top: 88, width: 940 } },
  { slug: "nicholas-the-wonderworker", title: K(17, "Nicholas"), crop: { left: 120, top: 85, width: 936 } },
  { slug: "apostle-peter", title: K("08", "Peter"), crop: { left: 112, top: 146, width: 968 } },
  { slug: "apostle-paul", title: K(14, "Paul"), crop: { left: 142, top: 142, width: 944 } },
  { slug: "apostle-john", title: K("07", "John Evangelist"), crop: { left: 106, top: 142, width: 976 } },
  { slug: "apostle-andrew", title: K(15, "Andrew"), crop: { left: 106, top: 126, width: 980 } },
  { slug: "archangel-michael", title: K("09", "Michael"), crop: { left: 112, top: 136, width: 980 } },
  { slug: "saint-george", title: K(19, "George"), crop: { left: 122, top: 162, width: 976 } },
  { slug: "peter-of-moscow", title: K(18, "Peter of Moscow"), crop: { left: 112, top: 142, width: 976 } },
];

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? null);
};
const cache = opt("--cache");
const only = (opt("--only") ?? "").split(",").filter(Boolean);
if (!cache) {
  console.error("Give --cache <dir>: a folder outside the repository for the originals.");
  process.exit(1);
}
if (path.resolve(cache).startsWith(ROOT + path.sep)) {
  console.error("--cache must be outside the repository: the originals never enter it.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location)
          return get(res.headers.location).then(resolve).catch(reject);
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), type: res.headers["content-type"] }));
      })
      .on("error", reject);
  });
}

const strip = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/date QS:\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The file's address and what its page says about it; an error if the licence fails. */
async function fileInfo(title) {
  const q = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json`;
  const json = JSON.parse((await get(q)).body.toString());
  const info = Object.values(json.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info?.url) return { error: "no such file" };
  const meta = info.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value) || strip(meta.License?.value);
  if (!license || REJECT.test(license) || !ALLOWED.test(license)) return { error: `licence "${license}" is not public domain` };
  return {
    url: info.url,
    width: info.width,
    height: info.height,
    license,
    artist: strip(meta.Artist?.value) || "Unknown",
    workDate: strip(meta.DateTimeOriginal?.value) || "unknown",
    page: info.descriptionurl,
  };
}

async function original(hero, info) {
  const dir = path.join(cache, hero.slug);
  if (existsSync(dir)) {
    const files = (await fs.readdir(dir)).filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f));
    if (files.length === 1) return path.join(dir, files[0]);
    if (files.length > 1) throw new Error(`${dir} holds ${files.length} pictures; keep one`);
  }
  await fs.mkdir(dir, { recursive: true });
  await sleep(1000);
  const r = await get(info.url);
  if (r.status !== 200 || !r.type?.startsWith("image/")) throw new Error(`download failed: ${r.status} ${r.type}`);
  const file = path.join(dir, decodeURIComponent(info.url.split("/").pop().split("?")[0]));
  await fs.writeFile(file, r.body);
  return file;
}

async function cut(hero, file) {
  const { left, top, width } = hero.crop;
  const height = Math.round(width * 1.25);
  const meta = await sharp(file).metadata();
  if (left < 0 || top < 0 || left + width > meta.width || top + height > meta.height)
    throw new Error(`the cut ${left},${top} ${width}x${height} leaves the picture (${meta.width}x${meta.height})`);
  // At the scan's own pixels: nothing is enlarged.
  return sharp(file).rotate().extract({ left, top, width, height }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
}

await fs.mkdir(OUT, { recursive: true });
const rows = [];
for (const hero of HEROES) {
  if (only.length && !only.includes(hero.slug)) continue;
  await sleep(600);
  const info = await fileInfo(hero.title);
  if (info.error) {
    console.error(`${hero.slug}: ${hero.title}: ${info.error}. Not written.`);
    process.exitCode = 1;
    continue;
  }
  const file = await original(hero, info);
  const jpg = await cut(hero, file);
  const dest = path.join(OUT, `${hero.slug}.v1.jpg`);
  await fs.writeFile(dest, jpg);
  console.log(`${hero.slug}: ${(jpg.length / 1024).toFixed(0)} KB, ${hero.crop.width}x${Math.round(hero.crop.width * 1.25)} from ${hero.title}`);
  rows.push({ ...hero, info });
}

console.log("\n--- SAINT_HEROES rows (lib/saints/heroes.ts) ---");
for (const r of rows) {
  console.log(`  "${r.slug}": source ${JSON.stringify(r.title)}, license ${JSON.stringify(r.info.license)}, artist ${JSON.stringify(r.info.artist)}, workDate ${JSON.stringify(r.info.workDate)}, evidenceUrl ${JSON.stringify(r.info.page)}`);
}
console.log("\n--- SAINT_HEROES.md rows ---");
for (const r of rows) {
  console.log(`| \`${r.slug}.v1.jpg\` | ${r.info.artist} | ${r.info.workDate} | ${r.info.license} | [${r.title.replace(/^File:/, "")}](${r.info.page}) |`);
}
