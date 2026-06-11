// One-off: fetch the icons that lib/saints/saints.ts already references
// but that are missing from public/saints/icons/. Uses Wikimedia Commons
// MediaWiki API search → picks first single-saint candidate → downloads
// → resizes via sharp to max 800px JPEG q85.
//
// Usage: node scripts/fetch-missing-icons.mjs

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

async function fileUrl(title) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`,
  );
  const json = JSON.parse(r.body.toString());
  return Object.values(json.query?.pages || {})[0]?.imageinfo?.[0]?.url ?? null;
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
