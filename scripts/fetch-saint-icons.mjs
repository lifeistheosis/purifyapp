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
// The staging directory is gitignored. A fetch that is never promoted leaves
// the repo exactly as it found it.

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
 */
async function provenance(title) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
      `&prop=imageinfo&iiprop=url|extmetadata&format=json`,
  );
  const info = Object.values(JSON.parse(r.body.toString()).query?.pages || {})[0]
    ?.imageinfo?.[0];
  if (!info?.url) return null;
  const m = info.extmetadata || {};
  const license = plain(m.LicenseShortName?.value) || plain(m.License?.value);
  return {
    commonsTitle: title,
    fileUrl: info.url,
    descriptionPage: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    license,
    licenseAllowed: PD_PATTERN.test(license),
    artist: plain(m.Artist?.value) || "Unrecorded",
    credit: plain(m.Credit?.value),
    workDate: plain(m.DateTimeOriginal?.value) || plain(m.DateTime?.value) || "Unrecorded",
    description: plain(m.ImageDescription?.value),
    usageTerms: plain(m.UsageTerms?.value),
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
    const r = await get(p.fileUrl);
    if (r.status !== 200 || !r.type?.startsWith("image/")) continue;

    const jpg = await sharp(r.body)
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

async function doList() {
  let entries;
  try {
    entries = await fs.readdir(STAGE);
  } catch {
    console.log("Nothing staged.");
    return;
  }
  const slugs = entries.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  if (!slugs.length) {
    console.log("Nothing staged.");
    return;
  }
  console.log(`${slugs.length} staged, waiting to be looked at:\n`);
  for (const s of slugs) {
    const p = JSON.parse(await fs.readFile(path.join(STAGE, `${s}.json`), "utf8"));
    console.log(`  ${s}.jpg  ${p.width}x${p.height}  ${p.license}`);
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

  await fs.mkdir(OUT, { recursive: true });
  await fs.rename(path.join(STAGE, `${slug}.jpg`), path.join(OUT, `${slug}.jpg`));
  await fs.unlink(metaPath);

  const today = new Date().toISOString().slice(0, 10);
  console.log(`\nMoved to public/saints/icons/${slug}.jpg\n`);
  console.log(`Paste into ICON_RIGHTS in lib/saints/iconRights.ts:\n`);
  console.log(`  "${slug}.jpg": {`);
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
}
