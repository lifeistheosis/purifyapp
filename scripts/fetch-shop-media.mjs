// Fetch rights-verified representative imagery for the shop seed catalog.
//
// Modeled on fetch-missing-icons.mjs, with a hard license gate: a
// candidate is accepted ONLY if Commons extmetadata reports a public
// domain family license (PD / PD-Art / PD-old / CC0). Anything else,
// including CC-BY / CC-BY-SA (fine for editorial, messy for product
// imagery), is skipped. Every accepted file is recorded with its
// source page and license in docs/licensing/SHOP_MEDIA.md so provenance
// survives the session.
//
// Usage: node scripts/fetch-shop-media.mjs

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const SEEDS = JSON.parse(
  await fs.readFile(path.join(ROOT, "data", "shop", "seed-products.json"), "utf8"),
);
const OUT = path.join(ROOT, "public", "shop", "media");
const PROVENANCE = path.join(ROOT, "docs", "licensing", "SHOP_MEDIA.md");

const PD_PATTERN = /^(pd|public domain|cc0)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "PurifyApp/1.0 (https://purifyapp.com; lifeistheosis@users.noreply.github.com)",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location)
            return get(res.headers.location).then(resolve).catch(reject);
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks),
              type: res.headers["content-type"],
            }),
          );
        },
      )
      .on("error", reject);
  });
}

async function searchCommons(query) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=12`,
  );
  const json = JSON.parse(r.body.toString());
  return (json.query?.search || [])
    .map((x) => x.title)
    .filter((t) => /\.(jpg|jpeg|png)$/i.test(t));
}

/** URL + license metadata in one call; null unless the license is PD/CC0. */
async function fileInfoIfPd(title) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&format=json`,
  );
  const json = JSON.parse(r.body.toString());
  const info = Object.values(json.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info?.url) return null;
  const meta = info.extmetadata || {};
  const short = (meta.LicenseShortName?.value || "").trim();
  const license = short || (meta.License?.value || "").trim();
  if (!PD_PATTERN.test(license)) return null;
  return {
    url: info.url,
    license,
    artist: (meta.Artist?.value || "").replace(/<[^>]+>/g, "").trim(),
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

const rows = [];
await fs.mkdir(OUT, { recursive: true });

for (const product of SEEDS.products) {
  const { file, query } = product.media;
  const dest = path.join(OUT, file);
  try {
    await fs.access(dest);
    console.log(`${file}: already present, skipping`);
    continue;
  } catch {
    /* fetch below */
  }

  console.log(`\n${product.slug}: searching "${query}"`);
  // Exact, hand-picked titles first (license still verified); search is
  // the fallback. Throttled: Commons rate-limits eager clients.
  const preferred = product.media.preferred ?? [];
  await sleep(1200);
  const candidates = [...preferred, ...(await searchCommons(query))];
  let saved = false;
  for (const cand of candidates) {
    await sleep(1000);
    const info = await fileInfoIfPd(cand);
    if (!info) {
      console.log(`  skip (not PD): ${cand}`);
      continue;
    }
    const r = await get(info.url);
    if (r.status !== 200 || !r.type?.startsWith("image/")) continue;
    // Auto-orient from EXIF (some Commons scans carry a rotation flag sharp
    // otherwise ignores), then apply an optional fractional-inset crop so a
    // caption band, titulus, or museum frame can be trimmed off the cover.
    // crop = { t, r, b, l } as fractions removed from each edge; all optional.
    const rotated = await sharp(r.body).rotate().toBuffer();
    let pipeline = sharp(rotated);
    const crop = product.media.crop;
    if (crop) {
      const meta = await sharp(rotated).metadata();
      const W = meta.width, H = meta.height;
      const l = crop.l ?? 0, t = crop.t ?? 0, cr = crop.r ?? 0, b = crop.b ?? 0;
      pipeline = pipeline.extract({
        left: Math.round(l * W),
        top: Math.round(t * H),
        width: Math.round((1 - l - cr) * W),
        height: Math.round((1 - t - b) * H),
      });
    }
    const resized = await pipeline
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(dest, resized);
    console.log(`  → saved ${file} (${(resized.length / 1024).toFixed(0)} KB)`);
    console.log(`    ${cand} · ${info.license}`);
    rows.push({ file, source: cand, license: info.license, page: info.page });
    saved = true;
    break;
  }
  if (!saved) console.warn(`  NO PD IMAGE found for ${product.slug} — review manually`);
}

if (rows.length > 0) {
  let doc = "";
  try {
    doc = await fs.readFile(PROVENANCE, "utf8");
  } catch {
    doc =
      "# Shop media provenance\n\nRepresentative imagery for EIKON seed products. Every file below was\nverified public domain (or CC0) via Wikimedia Commons extmetadata at\nfetch time by scripts/fetch-shop-media.mjs.\n\n| File | Commons source | License |\n| --- | --- | --- |\n";
  }
  for (const row of rows) {
    doc += `| public/shop/media/${row.file} | [${row.source}](${row.page}) | ${row.license} |\n`;
  }
  await fs.mkdir(path.dirname(PROVENANCE), { recursive: true });
  await fs.writeFile(PROVENANCE, doc);
  console.log(`\nProvenance updated: ${PROVENANCE}`);
}
