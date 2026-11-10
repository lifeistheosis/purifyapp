// Source a saint icon safely: stage it, look at it, then promote it.
//
// WHY THIS EXISTS, AND WHY IT IS NOT scripts/fetch-missing-icons.mjs.
//
// lib/saints/iconRights.ts:39 already says of the `inspectedOn` field:
// "written only by the promote step of scripts/fetch-saint-icons.mjs, which is
// what makes the field mean anything." That script did not exist. What existed
// was fetch-missing-icons.mjs, which searches Commons, takes the first
// licence-passing hit with no check that the picture is even of the right
// person, writes it straight into public/saints/icons/, and throws away the
// provenance it had already fetched.
//
// The cost of that is on the books. 107 of 153 shipped icons sit in
// UNVERIFIED_ICONS with "No source, licence or attribution recorded". Two of
// the four ever inspected turned out to be watermarked works by living
// iconographers, found rendering in production. And St Leo the Great and St
// John Cassian cannot be shown beside their own commentary today, not because
// anything is wrong with the images, but because nobody can say where they
// came from.
//
// THE RULE THIS SERVES. A valid licence does not tell you the picture is what
// you meant. A Commons search for an orthodox oil lamp returned an electrical
// wiring diagram; a Hagia Sophia interior read as a mosque; a Vatican scan
// carried a diagonal RESERVED watermark. Somebody has to open the file and
// look at it. So this script cannot put an image in front of a reader. It can
// only put one in front of you.
//
//   node scripts/fetch-saint-icons.mjs --fetch <slug> "<search terms>"
//       Searches, applies the licence gate, downloads to .icon-review/,
//       and writes everything Commons knows about the file beside it.
//       Nothing enters public/saints/icons/.
//
//   node scripts/fetch-saint-icons.mjs --list
//       What is staged and waiting to be looked at.
//
//   node scripts/fetch-saint-icons.mjs --promote <slug> --alt "<what you see>"
//       Moves the staged file into public/saints/icons/ and prints the
//       ICON_RIGHTS row to paste, with inspectedOn set to today. Refuses
//       without --alt, because --alt is the proof you opened it.
//
//   node scripts/fetch-saint-icons.mjs --source <file> "File:<Commons title>"
//       For an icon that already ships with no source recorded (a row in
//       UNVERIFIED_ICONS): reads what Commons says of the named file, applies
//       the same licence gate, and compares the two pictures by difference
//       hash. Stages the provenance only when they are one picture, and keeps
//       our file as it is. Then --promote <slug> as above, which moves nothing
//       for it and prints the row the same way. (1.9, U12: most of the old
//       icons are copies of Commons files whose source the old script threw
//       away; this is how one is given back.)
//
// The staging directory is gitignored. A fetch that is never promoted leaves
// the repo exactly as it found it.

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const STAGE = path.join(ROOT, ".icon-review");
const OUT = path.join(ROOT, "public", "saints", "icons");
const UA =
  "PurifyApp/1.0 (https://purifyapp.net; lifeistheosis@users.noreply.github.com)";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": UA } }, (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location &&
          redirects < 5
        ) {
          return get(res.headers.location, redirects + 1).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks),
            type: res.headers["content-type"],
          }),
        );
      })
      .on("error", reject);
  });
}

/**
 * Public-domain family only, the same gate fetch-shop-media.mjs applies.
 * Deliberately narrow: a CC-BY-SA icon is not a licensing crisis, but it
 * carries obligations this app does not currently discharge anywhere, so it
 * does not belong in a directory that ships unattributed.
 */
const PD_PATTERN = /^(pd|public domain|cc0)/i;

/** Strip the HTML Commons puts in extmetadata values. */
const plain = (v) =>
  String(v ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Bits of 64 two copies of one picture may differ by. Different pictures differ by 20 and more. */
const MATCH_BITS = 10;
/** How far apart two shapes (width over height) may be and still be one picture, uncut. */
const SHAPE_SLACK = 0.04;

/**
 * The 64-bit difference hash of a picture, and its shape: the picture as 9 by
 * 8 grey cells, each bit whether a cell is brighter than the one beside it. A
 * resize and a re-encode barely move it; a different picture moves it a lot.
 */
async function dhash(input) {
  const image = sharp(input).flatten({ background: "#ffffff" });
  const { width = 1, height = 1 } = await image.metadata();
  const raw = await image.greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) bits = (bits << 1n) | (raw[y * 9 + x] > raw[y * 9 + x + 1] ? 1n : 0n);
  }
  return { bits, shape: width / height };
}

function distance(a, b) {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

/** A Commons file on upload.wikimedia.org, whole or as a thumbnail: its folder is the MD5 of its name. */
function uploadUrl(name, width) {
  const md5 = createHash("md5").update(name, "utf8").digest("hex");
  const enc = encodeURIComponent(name);
  const base = "https://upload.wikimedia.org/wikipedia/commons";
  return width ? `${base}/thumb/${md5[0]}/${md5.slice(0, 2)}/${enc}/${width}px-${enc}` : `${base}/${md5[0]}/${md5.slice(0, 2)}/${enc}`;
}

/**
 * Thumbnails at Commons' standard widths only, never an original.
 * upload.wikimedia.org refuses any other width with 429
 * (https://www.mediawiki.org/wiki/Common_thumbnail_sizes, the page
 * https://w.wiki/GHai leads to: 20, 40, 60, 120, 250, 330, 500, 960, 1280,
 * 1920 and 3840px). On 2026-11-10 it refused an original with 429 as well,
 * asking for thumbnails "in sizes listed", and served the 960px at once. 960px
 * is ample for every size the app draws an icon; the rights are read from the
 * file's page, as before.
 */
const STANDARD_WIDTHS = { compare: [330, 500, 960], keep: [960, 500, 330] };

/**
 * A Commons picture at the first of `widths` it serves: for comparing with
 * ours, the 330px thumbnail Wikipedia's pages ask for (so usually made
 * already); for keeping, the 960px. A busy answer (429) is waited out twice
 * before the next width is tried, and a width wider than the file (which
 * Commons will not draw) gives way to the next.
 */
async function picture(name, widths = STANDARD_WIDTHS.compare) {
  for (const width of widths) {
    const url = uploadUrl(name, width);
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await get(url);
      if (r.status === 429) {
        await sleep(12_000);
        continue;
      }
      if (r.status === 200 && r.type?.startsWith("image/")) return r.body;
      break;
    }
  }
  return null;
}

async function search(query) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=12`,
  );
  return (JSON.parse(r.body.toString()).query?.search || [])
    .map((x) => x.title)
    .filter((t) => /\.(jpg|jpeg|png)$/i.test(t));
}

/**
 * Everything Commons will tell us about a file. The old script asked for
 * exactly this and then kept only `url`, which is the whole reason 107 rows
 * say "no source recorded" about files we downloaded ourselves.
 *
 * Asked of the Commons API, and of the Wikidata Query Service when the API
 * will not answer: the API answers a busy shared address with 429, the query
 * service asks it on Wikimedia's side.
 */
async function provenance(title) {
  try {
    const r = await get(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
        `&prop=imageinfo&iiprop=url|extmetadata&format=json`,
    );
    if (r.status === 200) {
      const info = Object.values(JSON.parse(r.body.toString()).query?.pages || {})[0]?.imageinfo?.[0];
      if (info?.url) {
        const m = info.extmetadata || {};
        return described(title, info.url, info.descriptionurl, (k) => m[k]?.value);
      }
    }
  } catch {
    // The query service, below.
  }
  return provenanceViaQueryService(title);
}

/** The same, asked through the Wikidata Query Service: an exact lookup by name (allimages from it, one). */
async function provenanceViaQueryService(title) {
  const name = title.replace(/^File:/, "").replace(/ /g, "_");
  const FIELDS = ["LicenseShortName", "License", "Artist", "Credit", "DateTimeOriginal", "DateTime", "ImageDescription", "UsageTerms"];
  const sparql = `SELECT * WHERE {
    SERVICE wikibase:mwapi {
      bd:serviceParam wikibase:api "Generator"; wikibase:endpoint "commons.wikimedia.org"; wikibase:limit 1;
        mwapi:generator "allimages"; mwapi:gaifrom ${JSON.stringify(name)}; mwapi:gailimit "1";
        mwapi:prop "imageinfo"; mwapi:iiprop "extmetadata|url".
      ?title wikibase:apiOutput mwapi:title.
      ?url wikibase:apiOutput "imageinfo/ii/@url".
      ?page wikibase:apiOutput "imageinfo/ii/@descriptionurl".
      ${FIELDS.map((f) => `?${f} wikibase:apiOutput "imageinfo/ii/extmetadata/${f}/@value".`).join("\n      ")}
    }
  }`;
  const r = await get(`https://query.wikidata.org/sparql?${new URLSearchParams({ query: sparql, format: "json" })}`);
  if (r.status !== 200) return null;
  // Commons metadata can carry raw control characters, which JSON does not allow in a string.
  const rows = JSON.parse(r.body.toString().replace(/[\u0000-\u001f]/g, " ")).results?.bindings ?? [];
  const b = rows.find((x) => x.title?.value.replace(/ /g, "_") === `File:${name}`);
  if (!b?.url) return null;
  return described(b.title.value, b.url.value, b.page?.value, (k) => b[k]?.value);
}

function described(title, fileUrl, page, ext) {
  const license = plain(ext("LicenseShortName")) || plain(ext("License"));
  return {
    commonsTitle: title,
    fileUrl,
    descriptionPage: page || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    license,
    licenseAllowed: PD_PATTERN.test(license),
    artist: plain(ext("Artist")) || "Unrecorded",
    credit: plain(ext("Credit")),
    workDate: plain(ext("DateTimeOriginal")) || plain(ext("DateTime")) || "Unrecorded",
    description: plain(ext("ImageDescription")),
    usageTerms: plain(ext("UsageTerms")),
  };
}

async function doFetch(slug, query) {
  await fs.mkdir(STAGE, { recursive: true });
  const candidates = await search(query);
  if (!candidates.length) {
    console.log(`${slug}: nothing matched "${query}".`);
    return;
  }
  console.log(`${slug}: ${candidates.length} candidates.`);
  for (const title of candidates) {
    const p = await provenance(title);
    if (!p) continue;
    if (!p.licenseAllowed) {
      console.log(`  skip, licence "${p.license || "unknown"}": ${title}`);
      continue;
    }
    const body = await picture(p.commonsTitle.replace(/^File:/, "").replace(/ /g, "_"), STANDARD_WIDTHS.keep);
    if (!body) continue;

    const jpg = await sharp(body)
      .resize({ width: 800, height: 800, fit: "inside" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const meta = await sharp(jpg).metadata();

    await fs.writeFile(path.join(STAGE, `${slug}.jpg`), jpg);
    await fs.writeFile(
      path.join(STAGE, `${slug}.json`),
      JSON.stringify(
        { slug, query, width: meta.width, height: meta.height, bytes: jpg.length, ...p },
        null,
        2,
      ) + "\n",
      "utf8",
    );

    console.log(`  staged .icon-review/${slug}.jpg`);
    console.log(`    ${meta.width}x${meta.height}, ${(jpg.length / 1024).toFixed(0)} KB, licence ${p.license}`);
    console.log(`    ${p.descriptionPage}`);
    console.log(`\n  OPEN IT AND LOOK AT IT before promoting. Is it the right saint?`);
    console.log(`  Is the whole head in frame? Any watermark? Then:`);
    console.log(`    node scripts/fetch-saint-icons.mjs --promote ${slug} --alt "what you actually see"`);
    return;
  }
  console.log(`  nothing passed the licence gate for ${slug}.`);
}

async function doSource(file, title) {
  let mine;
  try {
    mine = await fs.readFile(path.join(OUT, file));
  } catch {
    throw new Error(`no ${file} in public/saints/icons/.`);
  }
  const p = await provenance(title);
  if (!p) {
    console.log(`${file}: Commons has no file "${title}".`);
    return;
  }
  if (!p.licenseAllowed) {
    console.log(`${file}: licence "${p.license || "unknown"}" does not pass the gate. Nothing staged.`);
    return;
  }
  const theirs = await picture(p.commonsTitle.replace(/^File:/, "").replace(/ /g, "_"));
  if (!theirs) {
    console.log(`${file}: the Commons picture could not be fetched to compare. Nothing staged; try again later.`);
    return;
  }
  const a = await dhash(mine);
  const b = await dhash(theirs);
  const bits = distance(a.bits, b.bits);
  const shapeOff = Math.abs(a.shape - b.shape) / a.shape;
  if (bits > MATCH_BITS || shapeOff > SHAPE_SLACK) {
    console.log(
      `${file}: not the same picture as ${p.commonsTitle} (${bits} of 64 bits apart, shapes ${(shapeOff * 100).toFixed(1)}% apart). Nothing staged.`,
    );
    return;
  }
  const meta = await sharp(mine).metadata();
  const slug = file.replace(/\.(jpe?g|png|webp)$/i, "");
  await fs.mkdir(STAGE, { recursive: true });
  await fs.writeFile(
    path.join(STAGE, `${slug}.json`),
    JSON.stringify(
      {
        slug,
        file,
        keep: true,
        sameAs: { bits, shapeOff: Number(shapeOff.toFixed(3)) },
        hash: a.bits.toString(16),
        width: meta.width,
        height: meta.height,
        bytes: mine.length,
        ...p,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`${file}: the same picture as ${p.commonsTitle} (${bits} of 64 bits apart), licence ${p.license}.`);
  console.log(`  ${p.descriptionPage}`);
  console.log(`\n  OPEN BOTH AND LOOK before promoting: public/saints/icons/${file} and the page above.`);
  console.log(`  Is it the right saint? Any watermark? Read the licence on the page. Then:`);
  console.log(`    node scripts/fetch-saint-icons.mjs --promote ${slug} --alt "what you actually see"`);
}

async function doList() {
  let entries;
  try {
    entries = await fs.readdir(STAGE);
  } catch {
    console.log("Nothing staged.");
    return;
  }
  const slugs = [];
  for (const f of entries.filter((e) => e.endsWith(".json"))) {
    // Only what --fetch or --source staged; other reports may sit beside them.
    const p = JSON.parse(await fs.readFile(path.join(STAGE, f), "utf8"));
    if (p && !Array.isArray(p) && p.slug && p.commonsTitle) slugs.push(f.replace(/\.json$/, ""));
  }
  if (!slugs.length) {
    console.log("Nothing staged.");
    return;
  }
  console.log(`${slugs.length} staged, waiting to be looked at:\n`);
  for (const s of slugs) {
    const p = JSON.parse(await fs.readFile(path.join(STAGE, `${s}.json`), "utf8"));
    console.log(`  ${p.keep ? `${p.file} (ours, kept)` : `${s}.jpg`}  ${p.width}x${p.height}  ${p.license}`);
    console.log(`    ${p.descriptionPage}`);
  }
}

async function doPromote(slug, alt) {
  const metaPath = path.join(STAGE, `${slug}.json`);
  let p;
  try {
    p = JSON.parse(await fs.readFile(metaPath, "utf8"));
  } catch {
    throw new Error(`nothing staged for "${slug}". Fetch it first.`);
  }
  if (!alt || alt.trim().length < 25) {
    throw new Error(
      "--alt must describe what you actually see in the picture, in a sentence. " +
        "It is the only evidence that anyone opened the file, and it is what the " +
        "rights row is checked against.",
    );
  }

  let key = `${slug}.jpg`;
  if (p.keep) {
    // Our file stays; it must still be the picture that was compared.
    const now = await dhash(await fs.readFile(path.join(OUT, p.file)));
    if (now.bits.toString(16) !== p.hash) {
      throw new Error(`${p.file} has changed since it was compared. Run --source again.`);
    }
    key = p.file;
    await fs.unlink(metaPath);
    console.log(`\nKept public/saints/icons/${p.file}: it is ${p.commonsTitle}.\n`);
  } else {
    await fs.mkdir(OUT, { recursive: true });
    await fs.rename(path.join(STAGE, `${slug}.jpg`), path.join(OUT, `${slug}.jpg`));
    await fs.unlink(metaPath);
    console.log(`\nMoved to public/saints/icons/${slug}.jpg\n`);
  }

  const today = new Date().toISOString().slice(0, 10);
  console.log(`Paste into ICON_RIGHTS in lib/saints/iconRights.ts:\n`);
  console.log(`  "${key}": {`);
  console.log(`    status: "verified",`);
  console.log(`    inspectedOn: "${today}",`);
  console.log(`    alt: ${JSON.stringify(alt.trim())},`);
  console.log(`    work: ${JSON.stringify(p.description || "Icon")},`);
  console.log(`    artist: ${JSON.stringify(p.artist)},`);
  console.log(`    workDate: ${JSON.stringify(p.workDate)},`);
  console.log(`    source: ${JSON.stringify(p.credit || "Wikimedia Commons")},`);
  console.log(`    license: ${JSON.stringify(p.license)},`);
  console.log(`    evidenceUrl: ${JSON.stringify(p.descriptionPage)},`);
  console.log(`  },`);
  console.log(`\nThen remove its row from UNVERIFIED_ICONS if one exists, and lower`);
  console.log(`MAX_UNVERIFIED in lib/saints/__tests__/iconRights.test.ts to match.`);
}

const slug = flag("--fetch") || flag("--promote");
if (args.includes("--list")) {
  await doList();
} else if (args.includes("--source")) {
  const file = flag("--source");
  const title = args[args.indexOf("--source") + 2];
  if (!file || !title) throw new Error(`usage: --source <file> "File:<Commons title>"`);
  await doSource(file, title);
} else if (args.includes("--fetch")) {
  const query = args[args.indexOf("--fetch") + 2];
  if (!slug || !query) throw new Error(`usage: --fetch <slug> "<search terms>"`);
  await doFetch(slug, query);
} else if (args.includes("--promote")) {
  if (!slug) throw new Error("usage: --promote <slug> --alt \"...\"");
  await doPromote(slug, flag("--alt"));
} else {
  console.log("usage:");
  console.log('  node scripts/fetch-saint-icons.mjs --fetch <slug> "<search terms>"');
  console.log("  node scripts/fetch-saint-icons.mjs --list");
  console.log('  node scripts/fetch-saint-icons.mjs --promote <slug> --alt "<what you see>"');
  console.log('  node scripts/fetch-saint-icons.mjs --source <file> "File:<Commons title>"');
}
