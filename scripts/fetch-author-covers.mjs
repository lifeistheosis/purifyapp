// The icons on the reading room's covers (1.7, the owner's note 18, and his
// yes of 2026-10-16 to downloading public-domain icons from Wikimedia Commons
// for the covers): write public/covers/authors/<slug>.v1.jpg, four wide by
// five tall, at most 600 by 750, never enlarged.
//
// Two kinds:
//  - HEROES: the ten saints whose page already has a picture from Commons
//    (lib/saints/heroes.ts). Their covers are that picture made smaller, so a
//    saint's page and his books show the same icon.
//  - COMMONS: icons found for the covers, each read on its own Commons page,
//    opened, cut and opened again (docs/licensing/COVER_ICONS.md records the
//    source, the licence and how the saint was named; and what was turned
//    down). A file whose page no longer states public domain or CC0, or whose
//    categories name a CC BY, CC BY-SA or GFDL licence (a photographer's
//    licence over an old icon, which the short licence name does not show),
//    is not written.
//
// Usage:
//   node scripts/fetch-author-covers.mjs --cache <dir> [--only slug,slug] [--offline]
//
//   --cache    Where the originals are, OUTSIDE the repository, one picture
//              to a folder: <dir>/<slug>/. Nothing is downloaded here: the
//              originals were fetched when each was chosen, and a picture
//              whose pixels differ from the size below is refused, since
//              the cut was measured on it.
//   --offline  Skip reading the licence again on Commons.
//
// The downloaded files are only ever read as pixels by sharp. Nothing in
// them is run.

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "covers", "authors");
const UA = "PurifyApp/1.0 (https://purifyapp.net; lifeistheosis@users.noreply.github.com)";
const ALLOWED = /^(public domain|pd-art|pd|pd-old.*|cc0( 1\.0)?)$/i;
const REJECT = /(cc[ -]by|by-sa|by-nc|by-nd|-nd\b|gfdl|non-?commercial|no derivatives|fair use)/i;
const WIDTH = 600;

const HEROES = [
  "theotokos",
  "john-chrysostom",
  "basil-the-great",
  "gregory-theologian",
  "nicholas-the-wonderworker",
  "apostle-peter",
  "apostle-paul",
  "apostle-john",
  "apostle-andrew",
  "archangel-michael",
];

/** `crop` is {left, top, width} in the pixels of the picture as fetched (`size`); the height is width x 1.25. */
const COMMONS = [
  { slug: "athanasius-the-great", title: "File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg", size: [1704, 2372], crop: { left: 160, top: 60, width: 1390 } },
  { slug: "anthony-the-great", title: "File:Anthony the Great icon (lebanon).jpg", size: [2538, 3225], crop: { left: 250, top: 190, width: 2100 } },
  // The right-hand of two bishops, under his name, ΚΥΡΙΛΛΟΣ.
  { slug: "cyril-of-alexandria", title: "File:Cretan Icon of Saint Kyrillos and Saint Athanasios of Alexandria.jpg", size: [1162, 1600], crop: { left: 682, top: 10, width: 480 } },
  { slug: "john-of-damascus", title: "File:Athonite Fresco Icon of Saint John of Damascus 2.jpg", size: [1200, 1810], crop: { left: 60, top: 0, width: 770 } },
  { slug: "maximus-the-confessor", title: "File:Maximus the Confessor (mosaic).jpg", size: [641, 646], crop: { left: 35, top: 0, width: 516 } },
  { slug: "gregory-palamas", title: "File:Григорий Палама 14в.jpg", size: [3840, 5039], crop: { left: 256, top: 300, width: 3300 } },
  { slug: "gregory-of-nyssa", title: "File:Gregory of Nyssa (Menologion of Basil II).jpg", size: [2008, 1354], crop: { left: 688, top: 285, width: 624 } },
  { slug: "spyridon-of-trimythous", title: "File:Saint Spyridon icon.jpg", size: [2694, 3631], crop: { left: 440, top: 240, width: 1740 } },
  { slug: "epiphanius-of-salamis", title: "File:Epiphanius-Kosovo.jpg", size: [587, 600], crop: { left: 56, top: 0, width: 480 } },
  // Constantine alone, under his name; St Helen stays outside the cut.
  { slug: "constantine-the-great", title: "File:Constantine and Helen.png", size: [1082, 1358], crop: { left: 22, top: 25, width: 480 } },
  { slug: "ignatius-of-antioch", title: "File:Agios Ignatios Theophoros Stavronikita.webp", size: [853, 1000], crop: { left: 50, top: 0, width: 800 } },
  { slug: "polycarp-of-smyrna", title: "File:Polycarp of Smyrna2.jpg", size: [735, 1182], crop: { left: 0, top: 0, width: 735 } },
  { slug: "justin-martyr", title: "File:Иустин Философ, Афон.jpg", size: [767, 1181], crop: { left: 0, top: 0, width: 767 } },
  { slug: "meletius-of-antioch", title: "File:Saint Meletios of Antioch Staro Nagoričane.jpg", size: [1333, 1536], crop: { left: 105, top: 0, width: 1228 } },
  { slug: "eustathius-of-antioch", title: "File:Saint Eustathios of Antioch Fresco Peribleptos.jpg", size: [1237, 1536], crop: { left: 4, top: 0, width: 1228 } },
  { slug: "ephraim-the-syrian", title: "File:Ephrem the Syrian (mosaic in Nea Moni).jpg", size: [963, 940], crop: { left: 262, top: 108, width: 480 } },
  { slug: "apostle-matthew", title: "File:The Apostle Matthew.jpg", size: [3034, 4340], crop: { left: 138, top: 300, width: 2792 } },
  { slug: "apostle-thomas", title: "File:Saint Thomas K. Tzanes.png", size: [1211, 1511], crop: { left: 440, top: 40, width: 700 } },
  {
    slug: "apostle-philip",
    title: "File:Paintings in the Church of the Theotokos Peribleptos of Ohrid 037.jpg",
    size: [1554, 2442],
    crop: { left: 382, top: 110, width: 712 },
  },
  {
    slug: "apostle-bartholomew",
    title: "File:Apostle Bartholomew. Fresco of the Church of Agios Nikolaos. Stavronikita Monastery. Athos.jpg",
    size: [945, 1187],
    crop: { left: 0, top: 0, width: 945 },
  },
  // The young scribe under his own name, ΠΡΟΧΟΡΟΣ; St John stays outside the cut.
  { slug: "prochorus-the-deacon", title: "File:John the Evangelist and Prochorus by E.Lambardos (1602).jpg", size: [2385, 3605], crop: { left: 1315, top: 1558, width: 700 } },
  { slug: "jerome-of-stridon", title: "File:Saint Jerome as Scholar MET DT3103.jpg", size: [3063, 3714], crop: { left: 654, top: 191, width: 1914 } },
  { slug: "gregory-the-dialogist", title: "File:Άγιος Γρηγόριος ο Διάλογος 0633.jpg", size: [2736, 3008], crop: { left: 630, top: 228, width: 1580 } },
  {
    slug: "leo-the-great",
    title: "File:Herrera mozo San León magno Lienzo. Óvalo. 164 x 105 cm. Museo del Prado.jpg",
    size: [1864, 2952],
    crop: { left: 402, top: 296, width: 1060 },
  },
  { slug: "agatho-of-rome", title: "File:Pope Agatho (Menologion of Basil II).jpg", size: [1772, 1164], crop: { left: 615, top: 241, width: 540 } },
  { slug: "hosius-of-cordova", title: "File:El obispo Osio - Ángel María de Barcia Pavón.jpg", size: [691, 1090], crop: { left: 80, top: 61, width: 540 } },
  { slug: "florian-of-lorch", title: "File:Francesco del Cossa, Saint Florian, c. 1473-1474, NGA 368.jpg", size: [2773, 4000], crop: { left: 460, top: 360, width: 1800 } },
  { slug: "mary-magdalene", title: "File:Mary Magdalene (Russia, c. 1890, Clinton).jpg", size: [2550, 3010], crop: { left: 355, top: 135, width: 1840 } },
  { slug: "seraphim-of-sarov", title: "File:Seraphim of Sarov (after 1903, priv.coll).jpg", size: [2073, 2500], crop: { left: 300, top: 85, width: 1500 } },
  // St Paul alone, under his name; St John the Hut-Dweller stays outside the cut.
  { slug: "paul-of-thebes", title: "File:Saint-Paul-of-Thebes-and-Saint-John-the-Hut-Dweller-Athonite.jpg", size: [962, 1200], crop: { left: 0, top: 20, width: 540 } },
  {
    slug: "hilarion",
    title: "File:Church of Panagia tou Arakos, nave, southwest bay, wall paintings, Lagoudera, Cyprus - West soffit, St. Hilarion, detail of upper half, before cleaning - MSBZ004 BF S 1979 2198D - Dumbarton Oaks.jpg",
    size: [3407, 5190],
    crop: { left: 85, top: 280, width: 2950 },
  },
];

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? null);
};
const cache = opt("--cache");
const only = (opt("--only") ?? "").split(",").filter(Boolean);
const offline = argv.includes("--offline");
if (!cache) {
  console.error("Give --cache <dir>: the folder outside the repository that holds the originals.");
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
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString()));
      })
      .on("error", reject);
  });
}
const strip = (s) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** What the file's page says now: an error if it is not in the public-domain family. */
async function licence(title) {
  const q = `https://commons.wikimedia.org/w/api.php?format=json&action=query&titles=${encodeURIComponent(title)}&prop=imageinfo|categories&cllimit=100&iiprop=extmetadata`;
  const page = Object.values(JSON.parse(await get(q)).query?.pages || {})[0];
  const meta = page?.imageinfo?.[0]?.extmetadata;
  if (!meta) return { error: "no such file" };
  const short = strip(meta.LicenseShortName?.value);
  if (!short || REJECT.test(short) || !ALLOWED.test(short)) return { error: `licence "${short}"` };
  const cats = (page.categories || []).map((c) => c.title.replace(/^Category:/, ""));
  const bad = cats.find((c) => /^(cc[- ]by|gfdl)/i.test(c) || /\bcc-by(-sa)?-\d/i.test(c));
  if (bad) return { error: `category "${bad}"` };
  return { short };
}

async function theOriginal(slug, size) {
  const dir = path.join(cache, slug);
  const files = existsSync(dir) ? (await fs.readdir(dir)).filter((f) => /\.(jpe?g|png|tiff?|webp)$/i.test(f)) : [];
  if (files.length !== 1) throw new Error(`${dir} holds ${files.length} pictures; keep one`);
  const file = path.join(dir, files[0]);
  const meta = await sharp(file).metadata();
  if (meta.width !== size[0] || meta.height !== size[1]) throw new Error(`${file} is ${meta.width}x${meta.height}, not ${size.join("x")}: the cut was measured on another picture`);
  return file;
}

async function write(slug, pipeline) {
  const buf = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  await fs.writeFile(path.join(OUT, `${slug}.v1.jpg`), buf);
  const meta = await sharp(buf).metadata();
  console.log(`${slug}: ${meta.width}x${meta.height}, ${(buf.length / 1024).toFixed(0)} KB`);
}

await fs.mkdir(OUT, { recursive: true });
for (const slug of HEROES) {
  if (only.length && !only.includes(slug)) continue;
  const hero = path.join(ROOT, "public", "covers", "saints", `${slug}.v1.jpg`);
  await write(slug, sharp(hero).resize({ width: WIDTH, height: Math.round(WIDTH * 1.25), fit: "cover", position: "top" }));
}
for (const c of COMMONS) {
  if (only.length && !only.includes(c.slug)) continue;
  if (!offline) {
    await sleep(500);
    const lic = await licence(c.title);
    if (lic.error) {
      console.error(`${c.slug}: ${c.title}: ${lic.error}. Not written.`);
      process.exitCode = 1;
      continue;
    }
  }
  const file = await theOriginal(c.slug, c.size);
  const { left, top, width } = c.crop;
  const height = Math.round(width * 1.25);
  // At the scan's own pixels or fewer: nothing is enlarged.
  const out = Math.min(width, WIDTH);
  await write(
    c.slug,
    sharp(file)
      .rotate()
      .extract({ left, top, width, height })
      .resize({ width: out, height: Math.round(out * 1.25) }),
  );
}
