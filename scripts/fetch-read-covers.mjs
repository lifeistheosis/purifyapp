// The read-aloud covers (1.7): fetch each public-domain icon from Wikimedia
// Commons, check its licence on its page, cut the square, and write the
// cover the website serves (public/covers/<id>.v1.jpg, 1024px).
//
// Modelled on fetch-section-media.mjs and fetch-saint-icons.mjs, with their
// rules: only the public-domain family passes (Public domain, PD-Art, PD-old,
// CC0; a CC BY-SA photograph of an old icon does not), and nothing reaches a
// reader that nobody has opened. Every title and every square below was
// chosen by looking at the picture: the figure is the one the book is about,
// read from the icon's own inscription where it has one, the whole head and
// halo are in, nothing outside the painted panel shows, and it is sharp at
// 1024px. A valid licence has produced a wiring diagram, a watermarked
// Vatican plate and a cut-off head before (docs/licensing/SECTION_MEDIA.md).
//
// Usage:
//   node scripts/fetch-read-covers.mjs --cache <dir> [--only id,id] [--sheet <png>]
//
//   --cache  Where the originals are kept, OUTSIDE the repository: each in a
//            folder of its own, <dir>/<id>/. A file already there is used as
//            it is; a missing one is downloaded there. The originals are
//            30 to 80 MB together and never enter git or the apps.
//   --only   Cut only these covers again (after moving a square).
//   --sheet  Also write a contact sheet of every cover with its books, for
//            the owner's look before anything ships.
//
// Writes public/covers/<id>.v1.jpg, and prints the FIGURES fields for
// lib/readAloud/covers.ts and the rows for docs/licensing/READ_COVERS.md.
// A picture that is replaced gets a new version in its name (moses.v2.jpg),
// because the website serves these for a day at a time to the apps
// (next.config.ts) and a new name is never served stale.
//
// The downloaded files are only ever read as pixels by sharp. Nothing in
// them is run.

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "covers");
const SIZE = 1024;
const UA = "PurifyApp/1.0 (https://purifyapp.net; lifeistheosis@users.noreply.github.com)";

// The same gate as fetch-section-media.mjs, minus the attribution licences:
// a cover carries no credit line, so it must need none.
const ALLOWED = /^(public domain|pd-art|pd|pd-old.*|cc0( 1\.0)?)$/i;
const REJECT = /(cc by|by-sa|by-nc|by-nd|-nd\b|gfdl|non-?commercial|no derivatives|fair use)/i;

/**
 * One entry per figure. `title` is the Commons file; `crop` is the square
 * {left, top, size} in the pixels of the file as downloaded, which is the
 * original unless `width` asks Commons for a narrower copy of a very large
 * one. `books` is only for the contact sheet; the map itself is
 * BOOK_COVERS in lib/readAloud/covers.ts.
 */
const K01 = "File:Kirillo-Belozersky iconostasis 01. Habakkuk, Jeremiah, Jonah.jpg";
const K02 = "File:Kirillo-Belozersky iconostasis 02. Nathan, Haggai, Samuel.jpg";
const K03 = "File:Kirillo-Belozersky iconostasis 03. Micah, Elijah, Gideon.jpg";
const K04 = "File:Kirillo-Belozersky iconostasis 04. Daniel, David, Solomon.jpg";
const K05 = "File:Kirillo-Belozersky iconostasis 05. Ezekiel, Isaiah, Jacob.jpg";
const K06 = "File:Kirillo-Belozersky iconostasis 06. Hosea, Amos, Zephaniah.jpg";
const K07 = "File:Kirillo-Belozersky iconostasis 07. Elisha, Zechariah, Joel.jpg";
const K08 = "File:Kirillo-Belozersky iconostasis 08. Malachi, Naum.jpg";

// The prophets' boards hold three half-length figures each (08 holds two);
// each was named from its inscription, or from its scroll where the name has
// worn away, checked against the monastery museum's list of the boards. The
// title's order is left to right on all eight. Board 07's middle figure,
// titled Zechariah, is Zechariah the priest, the Forerunner's father (a
// priest's hat, the Benedictus on his scroll), not the prophet of the book:
// the book of Zechariah has the plate.
const COVERS = [
  { id: "moses", name: "The Prophet Moses", books: ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"], title: "File:Moses Icon Sinai 13th century detail.jpg", crop: { left: 0, top: 51, size: 1048 } },
  // Scanned from a book (Chatzidakis, Byzantine Art in Greece, 1997).
  { id: "joshua", name: "The Righteous Joshua", books: ["Joshua"], title: "File:Byzantine fresca from St-Lucas.jpg", crop: { left: 625, top: 20, size: 1300 }, denoise: 3, quality: 72 },
  { id: "samuel", name: "The Prophet Samuel", books: ["Judges", "Ruth", "1 Samuel", "2 Samuel"], title: K02, crop: { left: 1505, top: 20, size: 543 } },
  { id: "jeremiah", name: "The Prophet Jeremiah", books: ["1 Kings", "2 Kings", "Jeremiah", "Lamentations", "Epistle of Jeremiah"], title: K01, crop: { left: 722, top: 22, size: 596 } },
  { id: "job", name: "The Righteous Job", books: ["Job"], title: "File:Icon of Job (North Russia, 17 c.).jpg", crop: { left: 112, top: 155, size: 654 } },
  // Board 04 ends just above David's and Solomon's crowns and Daniel's cap
  // (white photo background and the board's hanging clamps above): the
  // squares start under the clamps, the crowns whole.
  { id: "david", name: "The Prophet and King David", books: ["Psalms"], title: K04, crop: { left: 1425, top: 44, size: 1000 }, quality: 75 },
  { id: "solomon", name: "King Solomon", books: ["Proverbs", "Ecclesiastes", "Song of Solomon", "Wisdom"], title: K04, crop: { left: 2640, top: 64, size: 1000 }, quality: 78 },
  { id: "hosea", name: "The Prophet Hosea", books: ["Hosea"], title: K06, crop: { left: 40, top: 30, size: 592 } },
  { id: "amos", name: "The Prophet Amos", books: ["Amos"], title: K06, crop: { left: 725, top: 30, size: 600 } },
  { id: "micah", name: "The Prophet Micah", books: ["Micah"], title: K03, crop: { left: 50, top: 22, size: 655 } },
  { id: "joel", name: "The Prophet Joel", books: ["Joel"], title: K07, crop: { left: 1330, top: 30, size: 680 } },
  { id: "jonah", name: "The Prophet Jonah", books: ["Jonah"], title: K01, crop: { left: 1425, top: 25, size: 625 } },
  { id: "nahum", name: "The Prophet Nahum", books: ["Nahum"], title: K08, crop: { left: 860, top: 40, size: 785 } },
  { id: "habakkuk", name: "The Prophet Habakkuk", books: ["Habakkuk"], title: K01, crop: { left: 45, top: 25, size: 580 } },
  { id: "zephaniah", name: "The Prophet Zephaniah", books: ["Zephaniah"], title: K06, crop: { left: 1415, top: 30, size: 635 } },
  { id: "haggai", name: "The Prophet Haggai", books: ["Haggai"], title: K02, crop: { left: 805, top: 25, size: 585 } },
  { id: "malachi", name: "The Prophet Malachi", books: ["Malachi"], title: K08, crop: { left: 100, top: 40, size: 720 } },
  { id: "isaiah", name: "The Prophet Isaiah", books: ["Isaiah"], title: K05, crop: { left: 725, top: 30, size: 605 } },
  // Clear of the patched strip down the board's left edge.
  { id: "ezekiel", name: "The Prophet Ezekiel", books: ["Ezekiel"], title: K05, crop: { left: 75, top: 30, size: 630 } },
  { id: "daniel", name: "The Prophet Daniel", books: ["Daniel"], title: K04, crop: { left: 325, top: 90, size: 980 }, quality: 78 },
  // The board joint down the left of this panel is left out of the square.
  { id: "matthew", name: "St Matthew the Evangelist", books: ["Matthew"], title: "File:The Apostle Matthew.jpg", crop: { left: 770, top: 560, size: 1760 } },
  // Clear of the hand of God at the top right and of the name beside him.
  { id: "mark", name: "St Mark the Evangelist", books: ["Mark"], title: "File:Tzanes Emmanuel - St Mark the Evangelist - Google Art Project.jpg", crop: { left: 868, top: 362, size: 776 }, quality: 75 },
  // A 3840px copy of the 4565px original: the square is in its pixels.
  { id: "luke", name: "St Luke the Evangelist", books: ["Luke", "Acts"], title: "File:Ostromir luke.jpg", width: 3840, crop: { left: 1050, top: 1100, size: 1160 }, quality: 75 },
  { id: "john", name: "St John the Theologian", books: ["John", "1 John", "2 John", "3 John"], title: "File:Kirillo-Belozersky iconostasis 07 - John Evangelist.jpg", crop: { left: 145, top: 145, size: 890 } },
  { id: "johnPatmos", name: "St John the Theologian, on Patmos", books: ["Revelation"], title: "File:John the Evangelist and Prochorus by E.Lambardos (1602).jpg", crop: { left: 330, top: 1180, size: 1080 } },
  { id: "paul", name: "St Paul the Apostle", books: ["Romans to Philemon", "Hebrews"], title: "File:Kirillo-Belozersky iconostasis 14 - Paul.jpg", crop: { left: 145, top: 145, size: 900 } },
  // Clear of the red of the panel at the top right and of his name at the left.
  { id: "james", name: "St James, brother of the Lord", books: ["James"], title: "File:Tzangarolas Stephanos - St James the Brother of the Lord - Google Art Project.jpg", crop: { left: 852, top: 588, size: 850 } },
  { id: "peter", name: "St Peter the Apostle", books: ["1 Peter", "2 Peter"], title: "File:Kirillo-Belozersky iconostasis 08 - Peter.jpg", crop: { left: 175, top: 145, size: 890 } },
];

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? null);
};
const cache = opt("--cache");
const only = (opt("--only") ?? "").split(",").filter(Boolean);
const sheetPath = opt("--sheet");
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

/** The file's address and what its page says about it; null if the licence fails. */
async function fileInfo(title, width) {
  const q = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata${width ? `&iiurlwidth=${width}` : ""}&format=json`;
  const json = JSON.parse((await get(q)).body.toString());
  const info = Object.values(json.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info?.url) return { error: "no such file" };
  const meta = info.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value) || strip(meta.License?.value);
  if (!license || REJECT.test(license) || !ALLOWED.test(license)) return { error: `licence "${license}" is not public domain` };
  return {
    url: width && info.thumburl ? info.thumburl : info.url,
    width: width && info.thumbwidth ? info.thumbwidth : info.width,
    height: width && info.thumbheight ? info.thumbheight : info.height,
    license,
    artist: strip(meta.Artist?.value) || "Unknown",
    workDate: strip(meta.DateTimeOriginal?.value) || "unknown",
    credit: strip(meta.Credit?.value),
    page: info.descriptionurl,
  };
}

async function original(cover, info) {
  const dir = path.join(cache, cover.id);
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

async function cut(cover, file) {
  const { left, top, size } = cover.crop;
  const meta = await sharp(file).metadata();
  if (left < 0 || top < 0 || left + size > meta.width || top + size > meta.height)
    throw new Error(`the square ${left},${top} ${size} leaves the picture (${meta.width}x${meta.height})`);
  let img = sharp(file).rotate().extract({ left, top, width: size, height: size }).resize(SIZE, SIZE, { kernel: "lanczos3" });
  // A light sharpening, only where a small panel was enlarged to 1024.
  if (size < SIZE) img = img.sharpen({ sigma: 0.6 });
  // A scan from a printed book carries the printer's screen as grain: a small
  // median takes the dots out and leaves the painting.
  if (cover.denoise) img = img.median(cover.denoise);
  // Under 200 KB each (lib/readAloud/__tests__/covers.test.ts): a busy
  // surface is saved a little lower.
  return img.jpeg({ quality: cover.quality ?? 80, mozjpeg: true }).toBuffer();
}

await fs.mkdir(OUT, { recursive: true });
const rows = [];
for (const cover of COVERS) {
  if (only.length && !only.includes(cover.id)) continue;
  await sleep(1000);
  const info = await fileInfo(cover.title, cover.width);
  if (info.error) {
    console.error(`${cover.id}: ${cover.title}: ${info.error}. Not written.`);
    process.exitCode = 1;
    continue;
  }
  const file = await original(cover, info);
  const jpg = await cut(cover, file);
  const dest = path.join(OUT, `${cover.id}.v1.jpg`);
  await fs.writeFile(dest, jpg);
  console.log(`${cover.id}: ${(jpg.length / 1024).toFixed(0)} KB from a ${cover.crop.size}px square of ${cover.title}`);
  rows.push({ ...cover, info });
}

console.log("\n--- FIGURES fields (lib/readAloud/covers.ts) ---");
for (const r of rows) {
  console.log(`  ${r.id}: source ${JSON.stringify(r.title)}, license ${JSON.stringify(r.info.license)}, artist ${JSON.stringify(r.info.artist)}, workDate ${JSON.stringify(r.info.workDate)}, evidenceUrl ${JSON.stringify(r.info.page)}`);
}
console.log("\n--- READ_COVERS.md rows ---");
for (const r of rows) {
  console.log(`| \`${r.id}.v1.jpg\` | ${r.info.artist} | ${r.info.workDate} | ${r.info.license} | [${r.title.replace(/^File:/, "")}](${r.info.page}) |`);
}

// The books with no cover show the plate the apps carry (BOOK_COVERS in
// lib/readAloud/covers.ts): no public-domain icon of their figure passed, or
// they name no holy person. Listed here only for the contact sheet.
const PLATE = {
  id: "plate",
  name: "The manuscript plate",
  file: path.join(ROOT, "public", "sections", "bible.jpg"),
  books: ["1 and 2 Chronicles", "1 Esdras", "Ezra", "Nehemiah", "Tobit", "Judith", "Esther", "1 to 3 Maccabees", "Sirach", "Baruch", "Obadiah", "Zechariah", "Prayer of Manasseh", "2 Esdras", "Jude"],
};

if (sheetPath) {
  const CELL = 300;
  const LABEL = 132;
  const COLS = 6;
  const all = [
    ...COVERS.filter((c) => existsSync(path.join(OUT, `${c.id}.v1.jpg`))).map((c) => ({ ...c, file: path.join(OUT, `${c.id}.v1.jpg`) })),
    PLATE,
  ];
  const rowsN = Math.ceil(all.length / COLS);
  const W = COLS * CELL + (COLS + 1) * 16;
  const H = rowsN * (CELL + LABEL) + (rowsN + 1) * 16 + 70;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const parts = [];
  for (const [i, c] of all.entries()) {
    const x = 16 + (i % COLS) * (CELL + 16);
    const y = 70 + 16 + Math.floor(i / COLS) * (CELL + LABEL + 16);
    const src = c.file;
    parts.push({ input: await sharp(src).resize(CELL, CELL, { fit: "cover" }).toBuffer(), left: x, top: y });
    // The 40px thumb the mini player shows, at the label's end.
    parts.push({ input: await sharp(src).resize(40, 40, { fit: "cover" }).toBuffer(), left: x + CELL - 40, top: y + CELL + 8 });
    const books = c.books.join(", ");
    const lines = [];
    let line = "";
    for (const word of books.split(" ")) {
      if ((line + " " + word).trim().length > 38) {
        lines.push(line.trim());
        line = word;
      } else line += " " + word;
    }
    lines.push(line.trim());
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL - 48}" height="${LABEL}">
      <text x="0" y="20" font-family="Arial, sans-serif" font-size="${c.name.length > 26 ? 14 : 17}" font-weight="700" fill="#eaeaec">${esc(c.name)}</text>
      ${lines.slice(0, 5).map((l, j) => `<text x="0" y="${42 + j * 18}" font-family="Arial, sans-serif" font-size="13" fill="#a9a9b2">${esc(l)}</text>`).join("")}
    </svg>`;
    parts.push({ input: Buffer.from(svg), left: x, top: y + CELL + 4 });
  }
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="70"><text x="16" y="44" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#eaeaec">Read-aloud covers, 1.7: ${all.length - 1} pictures and the plate for 78 books (each at 300px, and the 40px thumb)</text></svg>`;
  parts.push({ input: Buffer.from(head), left: 0, top: 0 });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#101013" } }).composite(parts).png().toFile(sheetPath);
  console.log(`\nContact sheet: ${sheetPath}`);
}
