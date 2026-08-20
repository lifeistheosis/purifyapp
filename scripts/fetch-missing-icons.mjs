// SUPERSEDED. Do not run this. Use scripts/fetch-saint-icons.mjs.
//
// This is the script that created the debt. It searches Commons, takes the
// first licence-passing hit with no check that the picture is of the right
// person, writes it straight into public/saints/icons/ where it ships, and
// discards the provenance it had already fetched in the same request.
//
// The result is on the books in lib/saints/iconRights.ts: 107 of 153 icons
// with "No source, licence or attribution recorded", two watermarked works by
// living iconographers found rendering in production, and St Leo the Great and
// St John Cassian unable to appear beside their own commentary because nobody
// can say where their images came from.
//
// It is kept, not deleted, because its TARGETS list below is the record of
// which slug was fetched with which search terms, and that is the only
// surviving clue to the origin of the files it wrote.
//
// The replacement stages to .icon-review/ instead of public/, keeps every
// field Commons returns, and will not move an image into the app until
// somebody has opened it and described what they see.
//
// One-off, historical: fetch the icons that lib/saints/saints.ts already
// references but that are missing from public/saints/icons/. Uses Wikimedia
// Commons MediaWiki API search, picks the first single-saint candidate,
// downloads, resizes via sharp to max 800px JPEG q85.

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const TARGETS = [
  { slug: "marina-the-great-martyr", q: "Saint Marina Antioch orthodox icon" },
  { slug: "hermione-of-ephesus", q: "Saint Hermione Ephesus orthodox icon" },
  { slug: "isidora-of-tabenna", q: "Saint Isidora fool orthodox icon" },
  { slug: "olympias-the-deaconess", q: "Saint Olympias deaconess orthodox icon" },
  { slug: "gregory-of-nyssa", q: "Saint Gregory of Nyssa orthodox icon" },
  { slug: "moses-the-ethiopian", q: "Saint Moses the Black Ethiopian orthodox icon" },
  { slug: "niketas-the-goth", q: "Saint Nicetas the Goth great martyr orthodox icon" },
  { slug: "nino-of-georgia", q: "Saint Nino Nina Georgia equal apostles orthodox icon" },
  { slug: "xenia-of-petersburg", q: "Saint Xenia of Petersburg fool for Christ orthodox icon" },
  { slug: "john-cassian", q: "Saint John Cassian the Roman orthodox icon" },
  { slug: "sergius-of-radonezh", q: "Saint Sergius of Radonezh orthodox icon" },
  { slug: "nicholas-cabasilas", q: "Saint Nicholas Cabasilas orthodox icon" },
  { slug: "silouan-the-athonite", q: "Saint Silouan the Athonite orthodox icon" },
  { slug: "john-of-shanghai", q: "Saint John Maximovitch Shanghai San Francisco orthodox icon" },
  { slug: "porphyrios-of-kavsokalyvia", q: "Saint Porphyrios Kavsokalyvia elder orthodox icon" },
  { slug: "iakovos-of-evia", q: "Saint Iakovos Tsalikis of Evia orthodox icon" },
  { slug: "sophrony-of-essex", q: "Saint Sophrony Sakharov Essex orthodox icon" },
  { slug: "quadratus-the-apologist", q: "Saint Quadratus apostle Athens orthodox icon" },
  { slug: "cosmas-of-aetolia", q: "Saint Cosmas of Aetolia equal apostles orthodox icon" },
  { slug: "nikodemos-the-hagiorite", q: "Saint Nikodemos the Hagiorite orthodox icon" },
  { slug: "theophan-the-recluse", q: "Saint Theophan the Recluse Vysha orthodox icon" },
  { slug: "philoumenos-of-jacobs-well", q: "Saint Philoumenos Jacob's Well hieromartyr orthodox icon" },
  { slug: "gabriel-of-georgia", q: "Saint Gabriel Urgebadze Georgia fool for Christ orthodox icon" },
  { slug: "photius-the-great", q: "Saint Photios the Great patriarch Constantinople orthodox icon" },
  { slug: "cyril-and-methodius", q: "Saints Cyril and Methodius equal apostles orthodox icon" },
  { slug: "simeon-the-myrrh-streaming", q: "Saint Simeon the Myrrh-streaming Nemanja orthodox icon" },
  { slug: "sava-of-serbia", q: "Saint Sava of Serbia first archbishop orthodox icon" },
  { slug: "lazar-of-serbia", q: "Saint Lazar of Serbia prince Kosovo orthodox icon" },
  { slug: "basil-of-ostrog", q: "Saint Basil of Ostrog wonderworker orthodox icon" },
  { slug: "nikolaj-velimirovic", q: "Saint Nikolaj Velimirovic of Zhicha orthodox icon" },
  { slug: "justin-popovic", q: "Saint Justin Popovic of Celije orthodox icon" },
];

const OUT = path.join(process.cwd(), "public", "saints", "icons");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, {
        headers: {
          "User-Agent":
            "PurifyApp/1.0 (https://purifyapp.com; lifeistheosis@users.noreply.github.com)",
        },
      }, (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        )
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
      })
      .on("error", reject);
  });
}

async function searchCommons(query) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=10`,
  );
  const json = JSON.parse(r.body.toString());
  return (json.query?.search || [])
    .map((x) => x.title)
    .filter((t) => /\.(jpg|jpeg|png)$/i.test(t));
}

/**
 * Public-domain family only. Mirrors PD_PATTERN in fetch-shop-media.mjs.
 *
 * This gate did not exist. This script populated all 110 saint icons while
 * its sibling, fetch-shop-media.mjs, refused anything that failed the same
 * check. Two of the files it fetched are watermarked works by living
 * iconographers. A licence check is not optional for a script that downloads
 * images into a shipped app.
 */
const PD_PATTERN = /^(pd|public domain|cc0)/i;

async function fileUrl(title) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&format=json`,
  );
  const json = JSON.parse(r.body.toString());
  const info = Object.values(json.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info?.url) return null;
  const meta = info.extmetadata || {};
  const short = (meta.LicenseShortName?.value || "").trim();
  const license = short || (meta.License?.value || "").trim();
  if (!PD_PATTERN.test(license)) {
    console.warn(`  skip (license: ${license || "unknown"}) ${title}`);
    return null;
  }
  return info.url;
}

if (!process.argv.includes("--i-know-this-is-superseded")) {
  console.error(
    "scripts/fetch-missing-icons.mjs is superseded and writes unverified images\n" +
      "straight into the shipped app. Use:\n\n" +
      '  node scripts/fetch-saint-icons.mjs --fetch <slug> "<search terms>"\n',
  );
  process.exit(1);
}

(async () => {
  await fs.mkdir(OUT, { recursive: true });
  for (const { slug, q } of TARGETS) {
    const candidates = await searchCommons(q);
    console.log(`\n${slug}:`);
    for (const c of candidates.slice(0, 4)) console.log("  cand:", c);
    let saved = false;
    for (const cand of candidates) {
      const url = await fileUrl(cand);
      if (!url) continue;
      const r = await get(url);
      if (r.status !== 200 || !r.type?.startsWith("image/")) continue;
      const dest = path.join(OUT, `${slug}.jpg`);
      const tmp = dest + ".tmp";
      const resized = await sharp(r.body)
        .resize({ width: 800, height: 800, fit: "inside" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      await fs.writeFile(tmp, resized);
      await fs.rename(tmp, dest);
      console.log(
        `  → saved (${(resized.length / 1024).toFixed(0)} KB) from`,
        cand,
      );
      saved = true;
      break;
    }
    if (!saved) console.warn(`  NO IMAGE downloaded for ${slug}`);
  }
})();
