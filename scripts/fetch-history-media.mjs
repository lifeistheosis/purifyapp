// Orthodox History's pictures (1.7, the owner's note 20 of 2026-10-16: History
// "needs ... photos"): one public-domain picture for each event written to the
// 1.7 standard, fetched from Wikimedia Commons, its licence read on its own
// page, cut, and written where the website serves it
// (public/history/media/<slug>.v1.jpg). The apps never carry these files: the
// native build sets the folder aside and the apps ask the website for them
// (lib/history/media.ts).
//
// Modelled on scripts/fetch-saint-heroes.mjs, with its rules: only the
// public-domain family passes (Public domain, PD-Art, PD-old, PD-US, CC0); a CC
// BY or BY-SA photograph does not, nor a page with two licences that disagree;
// and nothing reaches a reader that nobody has opened. Every title and every
// cut below was chosen by looking at the picture: the right subject, read from
// its inscription or its catalogue entry; sharp; whole heads and haloes;
// nothing outside the painted field (no museum clamp, no board edge, no film
// border, no watermarked margin); and never a pixel enlarged.
// docs/licensing/HISTORY_MEDIA.md records each source, licence and rejection.
//
// THE SHAPES (lib/history/events.ts, media.shape):
//   wide   a 16:9 cut that fills the plate, written 1200 wide;
//   whole  the picture whole at its own proportions (an icon, a miniature, a
//          tall painting), written to fit 1200 by 1200, the cap
//          scripts/optimize-images.mjs holds this folder to.
//
// Usage:
//   node scripts/fetch-history-media.mjs --cache <dir> [--only slug,slug]
//
//   --cache  Where the originals are kept, OUTSIDE the repository: each in a
//            folder of its own, <dir>/<slug>/. A file already there is used as
//            it is; a missing one is downloaded there.
//   --only   Cut only these again.
//
// Prints the rows for lib/history/events.ts and docs/licensing/HISTORY_MEDIA.md.
// A picture that is replaced gets a new version in its name (pentecost.v2.jpg):
// the website lets the apps keep one for a day (next.config.ts).
//
// The downloaded files are only ever read as pixels by sharp. Nothing in them
// is run.

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "history", "media");
const UA = "PurifyApp/1.0 (https://purifyapp.net; lifeistheosis@users.noreply.github.com)";

const ALLOWED = /^(public domain|pd-art|pd|pd-old.*|pd-us.*|cc0( 1\.0)?)$/i;
const REJECT = /(cc by|by-sa|by-nc|by-nd|-nd\b|gfdl|non-?commercial|no derivatives|fair use)/i;

/** `crop` is {left, top, width, height} in the pixels of the file as downloaded; absent, the picture is used whole. */
const PICTURES = [
  // The Kirillo-Belozersky Pentecost, about 1497, the set the read-aloud
  // covers come from. A museum photograph of the board: cut inside the painted
  // field, under the two pegs at the top and above the board's foot.
  { slug: "pentecost", title: "File:Pentecost (Kirillo-Belozersk).jpg", shape: "whole", crop: { left: 186, top: 232, width: 1386, height: 1962 } },
  // The Synaxis of the Twelve Apostles, Constantinople, early 14th century,
  // the Pushkin Museum. Inside the worn border, the inscription kept.
  { slug: "council-of-jerusalem", title: "File:Synaxis of the Twelve Apostles by Constantinople master (early 14th c., Pushkin museum).jpg", shape: "whole", crop: { left: 118, top: 122, width: 922, height: 1098 } },
  // The Menologion of Basil II, about 985: the twenty thousand martyrs of
  // Nicomedia burned in their church. A 16:9 cut from the roof's cross to the
  // logs of the fire, inside the red frame line.
  { slug: "great-persecution", title: "File:20,000 martyrs of Nicomedia (Menologion of Basil II).jpg", shape: "wide", crop: { left: 14, top: 140, width: 1921, height: 1081 } },
  // St Anthony the Great, an 18th-century icon of the Arabic tradition
  // (Lebanon). Inside its painted border.
  { slug: "anthony-and-the-desert", title: "File:Anthony the Great icon (lebanon).jpg", shape: "whole", crop: { left: 140, top: 118, width: 2280, height: 2990 } },
  // Sts Constantine and Helena with the Cross, an icon of the Arabic
  // tradition, named in Arabic on its gold. Inside the blue border.
  { slug: "edict-of-milan", title: "File:Saint Constantin and Helena, mother of Constantine I icon, Syria (14th Century).jpg", shape: "whole", crop: { left: 95, top: 80, width: 2410, height: 3660 } },
  // Michael Damaskinos, The First Ecumenical Council, 1591. Whole.
  { slug: "first-council-of-nicaea", title: "File:First Council of Nicaea Michael Damaskinos.png", shape: "whole" },
  // The Homilies of St Gregory the Theologian, Paris gr. 510, about 880,
  // folio 355: the Second Council. The page's paint is flaked, as it is; the
  // ornamental band at the top and the left margin are cut away.
  { slug: "first-council-of-constantinople", title: "File:CouncilOfConstantinople381BnFMSGr510.jpg", shape: "whole", crop: { left: 40, top: 75, width: 1848, height: 2341 } },
  // Vasily Surikov's sketch for the mural of the Third Council in the
  // Cathedral of Christ the Saviour, 1876. Whole, with its painted arch.
  { slug: "council-of-ephesus", title: "File:Third Ecumenical council by V.Surikov (1876).jpg", shape: "whole" },
  // Dionisius, the Fourth Council, fresco, Ferapontov monastery, 1502. Inside
  // the painted panel, clear of the wall and the bench below it.
  { slug: "council-of-chalcedon", title: "File:EcumenicalCouncil 4th 11-18.jpg", shape: "whole", crop: { left: 62, top: 22, width: 706, height: 778 } },
  // The Menologion of Basil II, about 985, folio 108: the Seventh Council.
  // Cut inside the miniature's red frame line, so the scan's margin (and the
  // mark printed on it) is left out.
  { slug: "second-council-of-nicaea", title: "File:Menologion of Basil 024.jpg", shape: "whole", crop: { left: 66, top: 64, width: 974, height: 638 } },
  // The Triumph of Orthodoxy, Constantinople, about 1400, the British Museum:
  // the larger scan of the picture the timeline has carried since 1.4.
  { slug: "triumph-of-orthodoxy", title: "File:Triumph orthodoxy.jpg", shape: "whole" },
  // Sts Cyril and Methodius, the Enlighteners, Avram Dichov, 1892. Inside the
  // board's edge.
  { slug: "mission-of-cyril-and-methodius", title: "File:Sts. Cyril and Methodius Bulgarian Enlighteners Icon by Avram Dichov, 1892.jpg", shape: "whole", crop: { left: 50, top: 40, width: 1980, height: 2670 } },
  // Viktor Vasnetsov, The Baptism of Prince Vladimir, sketch for the fresco
  // in St Volodymyr's Cathedral, Kyiv, 1890. Whole.
  { slug: "conversion-of-kievan-rus", title: "File:Vasnetsov Bapt Vladimir.jpg", shape: "whole" },
  // Christ between Constantine IX Monomachos, emperor in 1054, and the
  // Empress Zoe: the mosaic in Hagia Sophia, where the bull was laid. Whole.
  { slug: "great-schism-1054", title: "File:Empress Zoe mosaic Hagia Sophia.jpg", shape: "whole" },
  // Loyset Liédet, the crusaders' assault on Constantinople, a 15th-century
  // miniature. Whole. It replaces Delacroix's painting of 1840.
  { slug: "sack-of-constantinople-1204", title: "File:ConquestOfConstantinopleByTheCrusadersIn1204.jpg", shape: "whole" },
  // St Gregory Palamas, Archbishop of Thessalonica, an icon of the early 15th
  // century, the Pushkin Museum. Inside the board, clear of the museum's clamps.
  { slug: "hesychast-councils", title: "File:Gregor Palamas by North Greece anonym (15th c., Pushkin museum).jpg", shape: "whole", crop: { left: 30, top: 46, width: 1440, height: 1904 } },
  // Jean Le Tavernier, the siege of Constantinople, a miniature in Bertrandon
  // de la Broquière's Voyage d'Outremer, after 1455. Whole. It replaces
  // Benjamin-Constant's painting of 1876.
  { slug: "fall-of-constantinople", title: "File:Le siège de Constantinople (1453) by Jean Le Tavernier after 1455.jpg", shape: "whole", crop: { left: 8, top: 8, width: 1194, height: 1772 } },
  // St Nikodemos of the Holy Mountain, an engraving by Antonios Zoulianis,
  // Venice, 1818, nine years after his repose. Whole.
  { slug: "philokalia-published", title: "File:Άγιος Νικόδημος ο Αγιορείτης.jpg", shape: "whole" },
  // The chapel of Sts Sergius and Herman of Valaam on Spruce Island, Alaska,
  // over the place of St Herman's first grave: a photograph of the Historic
  // American Buildings Survey. Inside the film's edge and its label, clear of
  // the light leak at the right.
  { slug: "alaska-mission", title: "File:WEST FRONT - Saints Sergius and Herman of Valaam Russian Orthodox Chapel, Spruce Island, Ouzinkie, Kodiak Island Borough, AK HABS AK,12-MOLA,1-2.tif", shape: "whole", crop: { left: 225, top: 225, width: 2975, height: 4700 } },
  // The Local Council of 1917 to 1918 in Moscow: Patriarch Tikhon with the
  // metropolitans and the council's members. A 16:9 cut on the hierarchs.
  { slug: "bolshevik-persecution", title: "File:Highest authority of Russian Orthodox Church in 1917.jpg", shape: "wide", crop: { left: 900, top: 250, width: 1879, height: 1057 } },
  // ── 1.8: the events written briefly get their picture too (the owner,
  //    2026-10-19: "Anytime we're talking about history, I want there to be
  //    photos"). Each opened and looked at on 2026-10-22; the originals in
  //    the cache are Commons' own copies at the size the cut was read from.
  // The Menologion of Basil II, about 985: the translation of St Ignatius's
  // relics to Antioch (the page names the scene). Whole, no frame in it.
  { slug: "martyrdom-of-ignatius", title: "File:Ignatius of Antioch (Menologion of Basil II).jpg", shape: "whole" },
  // St Polycarp in the procession of martyrs, Sant'Apollinare Nuovo,
  // Ravenna, about 526, his name above him and his crown in his hands. The
  // Menologion's Polycarp was refused: a watermark runs across its sky. Cut
  // to him alone, leaving out his neighbours' feet.
  { slug: "martyrdom-of-polycarp", title: "File:St Polycarp-ApollinareNuovoRavenna.JPG", shape: "whole", crop: { left: 40, top: 0, width: 360, height: 1180 } },
  // Theophanes the Cretan, St Justin the Philosopher, Stavronikita, 1545 to
  // 1546, his name painted beside him. Whole.
  { slug: "apologies-of-justin-martyr", title: "File:Saint Justin Martyr by Theophanes the Cretan.jpg", shape: "whole" },
  // Sts Peter and Paul, Novgorod school, 12th to 13th century, Belozersk.
  // Inside the board's edge, below the tab at the top and above the pegs.
  { slug: "missions-of-apostle-paul", title: "File:The Holy Apostles Peter and Paul. Novgorod School of Icon Painting, 12th-13th centuries. Belozersk.jpg", shape: "whole", crop: { left: 90, top: 85, width: 1020, height: 1650 } },
  // The Apostle Peter with the scenes of the lives of Peter and Paul, Pskov,
  // late 17th century: the top row alone, St Peter crucified head down and
  // St Paul beheaded, with the Crucifixion between them.
  { slug: "neronian-persecution", title: "File:Икона Апостол Пётр XVII Псков.jpg", shape: "whole", crop: { left: 218, top: 282, width: 1604, height: 780 } },
  // The southwestern entrance mosaic of Hagia Sophia, about 1000: St
  // Constantine offers the city to the Theotokos and Christ, St Justinian
  // the church. The lunette, inside the plaster at its sides and above the
  // marble below.
  { slug: "foundation-of-constantinople", title: "File:Hagia Sophia Southwestern entrance mosaics 2.jpg", shape: "whole", crop: { left: 130, top: 60, width: 1700, height: 1060 } },
  // The Chludov Psalter, mid-9th century, folio 67r: beside the Crucifixion,
  // an iconoclast whitewashes an image of Christ. The page whole.
  { slug: "first-iconoclasm", title: "File:Clasm Chludov.jpg", shape: "whole" },
  // The Menologion of Basil II, the page of St Theodore the Studite: his
  // relics carried by boat to the Studion. The miniature, inside its red
  // frame. (A smaller copy of the miniature alone was refused: it carries a
  // watermark.)
  { slug: "second-iconoclasm", title: "File:Theodore Studite (Menologion of Basil II) page.jpg", shape: "whole", crop: { left: 526, top: 1166, width: 1058, height: 654 } },
  // St Athanasius of Alexandria, Sozopol, end of the 17th century, the
  // National Art Gallery, Sofia: Alexander's deacon in the Arian quarrel.
  // Inside the board's rounded corners. (A medieval icon of St Nicholas
  // and Arius was refused: half of it shows Arius's death, it cuts off a
  // figure's head, and its page names no proper source.)
  { slug: "arian-controversy-begins", title: "File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg", shape: "whole", crop: { left: 90, top: 90, width: 1040, height: 1500 } },
  // St Irenaeus, bishop of Lyons, an anonymous Netherlandish engraving of
  // the 17th century, Rijksmuseum RP-P-1907-47, his name round the oval.
  // Inside the plate, leaving out the verse below and the paper margin with
  // the museum's pencil marks. (A 1698 print of him was refused: its lower
  // half is a massacre with severed heads.)
  { slug: "irenaeus-against-heresies", title: "File:H. Ireneüs van Lyon, RP-P-1907-47.jpg", shape: "whole", crop: { left: 162, top: 160, width: 1354, height: 1765 } },
  // Considered and left, 2026-10-22: Patriarch Job in the Titulyarnik of
  // 1672 (its border sits on white paper, and a cut inside the oval is too
  // small), and Photius in the Madrid Skylitzes (378 px, a figure cut off).
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
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** The file's address and what its page says about it; an error if the licence fails. */
async function fileInfo(title) {
  const q = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo|revisions&iiprop=url|size|extmetadata&rvprop=content&rvslots=main&format=json&formatversion=2`;
  const json = JSON.parse((await get(q)).body.toString());
  const page = json.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!info?.url) return { error: "no such file" };
  const meta = info.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value) || strip(meta.License?.value);
  if (!license || REJECT.test(license) || !ALLOWED.test(license)) return { error: `licence "${license}" is not public domain` };
  // The page's own licence section must not also give a CC BY or BY-SA licence.
  const text = page.revisions?.[0]?.slots?.main?.content ?? "";
  const section = /==\s*\{\{\s*int:license-header\s*\}\}\s*==([\s\S]*?)(\n==|\[\[Category|$)/i.exec(text)?.[1] ?? "";
  if (/\{\{\s*(self\s*\|[^}]*cc-by|cc-by|gfdl)/i.test(section)) return { error: `the page also gives a CC BY or GFDL licence: ${section.trim().slice(0, 120)}` };
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

async function original(pic, info) {
  const dir = path.join(cache, pic.slug);
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

async function cut(pic, file) {
  const meta = await sharp(file, { limitInputPixels: false }).metadata();
  const c = pic.crop ?? { left: 0, top: 0, width: meta.width, height: meta.height };
  if (c.left < 0 || c.top < 0 || c.left + c.width > meta.width || c.top + c.height > meta.height)
    throw new Error(`the cut ${c.left},${c.top} ${c.width}x${c.height} leaves the picture (${meta.width}x${meta.height})`);
  if (pic.shape === "wide" && Math.abs(c.width / c.height - 16 / 9) > 0.01) throw new Error(`a wide cut must be 16:9 (${c.width}x${c.height})`);
  const box = pic.shape === "wide" ? { width: 1200, height: 675 } : { width: 1200, height: 1200 };
  // Down only: a picture smaller than the box keeps its own pixels.
  const buf = await sharp(file, { limitInputPixels: false })
    .rotate()
    .extract(c)
    .resize({ ...box, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  const out = await sharp(buf).metadata();
  return { buf, width: out.width, height: out.height, cutWidth: c.width };
}

await fs.mkdir(OUT, { recursive: true });
const rows = [];
for (const pic of PICTURES) {
  if (only.length && !only.includes(pic.slug)) continue;
  await sleep(600);
  const info = await fileInfo(pic.title);
  if (info.error) {
    console.error(`${pic.slug}: ${pic.title}: ${info.error}. Not written.`);
    process.exitCode = 1;
    continue;
  }
  const file = await original(pic, info);
  const { buf, width, height } = await cut(pic, file);
  const name = `${pic.slug}.v1.jpg`;
  await fs.writeFile(path.join(OUT, name), buf);
  console.log(`${pic.slug}: ${(buf.length / 1024).toFixed(0)} KB, ${width}x${height} (${pic.shape}) from ${pic.title}`);
  rows.push({ ...pic, info, name, width, height });
}

console.log("\n--- media rows (lib/history/events.ts) ---");
for (const r of rows) {
  console.log(`  ${r.slug}: hero "/history/media/${r.name}", shape "${r.shape}", ${r.width}x${r.height}, source ${JSON.stringify(r.title)}, license ${JSON.stringify(r.info.license)}, artist ${JSON.stringify(r.info.artist)}, workDate ${JSON.stringify(r.info.workDate)}, evidenceUrl ${JSON.stringify(r.info.page)}`);
}
console.log("\n--- HISTORY_MEDIA.md rows ---");
for (const r of rows) {
  console.log(`| \`${r.name}\` | ${r.slug} | ${r.info.artist} | ${r.info.workDate} | ${r.info.license} | [${r.title.replace(/^File:/, "")}](${r.info.page}) |`);
}
