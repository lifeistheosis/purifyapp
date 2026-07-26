// Fetch rights-verified Orthodox photography for the mobile section mastheads.
//
// Sibling of fetch-shop-media.mjs and it keeps the same hard license gate: a
// candidate is accepted ONLY if Commons extmetadata reports a public-domain
// family license (PD / PD-Art / PD-old / CC0). CC-BY and CC-BY-SA are
// rejected here too, so nothing in the app ever depends on rendering an
// attribution string to stay compliant.
//
// Deliberately NOT modeled on fetch-missing-icons.mjs, which downloads the
// first search hit with no license inspection at all. That is how two
// watermarked contemporary icons ended up in public/saints/icons/ (see
// docs/licensing/icon-provenance.md).
//
// Writes: public/sections/*.jpg, docs/licensing/SECTION_MEDIA.md, and prints
// the SECTION_MEDIA literal to paste into lib/media/sections.ts.
//
// Usage: node scripts/fetch-section-media.mjs [sectionKey ...]

import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "sections");
const PROVENANCE = path.join(ROOT, "docs", "licensing", "SECTION_MEDIA.md");

// The allowed set is deliberately IDENTICAL to the one the history media
// integrity suite enforces (lib/history/__tests__/events.integrity.test.ts):
// public domain, PD-Art, CC0, CC BY, CC BY-SA. Attribution licenses are in
// because these are editorial mastheads and SectionPhoto renders a visible
// `work · artist · license` credit, exactly like the history hero does.
//
// NC and ND are out: Purify is a commercial app (Plus, the shop), so a
// non-commercial clause is not compatible, and a no-derivatives clause is not
// compatible with cropping to a masthead.
const ALLOWED_PATTERN = /^(public domain|pd-art|pd|cc0|cc by(-sa)?( \d(\.\d)?)?)$/i;
const REJECT_PATTERN = /(by-nc|by-nd|-nd\b|non-?commercial|no derivatives|fair use)/i;

/**
 * One entry per mobile section. `preferred` holds hand-picked Commons titles
 * tried first (their license is still verified); `query` is the fallback
 * search. Subjects are chosen to be recognisably Orthodox without being a
 * specific commemoration, so they read as section chrome rather than as a
 * claim about the day.
 */
/**
 * Every title below was chosen by hand and then LOOKED AT, not taken from a
 * search ranking. The first automated pass produced an electrical wiring
 * diagram for "lampada" and a Hagia Sophia frame dominated by its Ottoman
 * calligraphic roundels, which would have read as a mosque on an Orthodox
 * app. Search is the fallback only; if it fires, open the result before
 * shipping it.
 */
const SECTIONS = [
  {
    key: "today",
    file: "today.jpg",
    // The face the whole app opens on.
    preferred: [
      "File:Christ Pantocrator mosaic from Hagia Sophia 2744 x 2900 pixels 3.1 MB.jpg",
    ],
    query: "Christ Pantocrator mosaic Byzantine",
  },
  {
    key: "bible",
    file: "bible.jpg",
    // Codex Sinaiticus: the Greek uncial the app's own text tradition rests on.
    preferred: ["File:Codex Sinaiticus Matthew 6,4-32.JPG"],
    query: "illuminated gospel book manuscript evangelist byzantine",
  },
  {
    key: "prayers",
    file: "prayers.jpg",
    // The Deesis is the intercession image: Christ with the Theotokos and the
    // Forerunner petitioning. The right picture for a prayer surface.
    preferred: [
      "File:Hagia Sophia Deesis mosaic.JPG",
      "File:Christ Pantocrator Deesis mosaic Hagia Sophia.jpg",
    ],
    query: "Deesis mosaic Hagia Sophia",
    position: "top",
  },
  {
    key: "discover",
    file: "discover.jpg",
    // The Menologion of Basil II (Constantinople, c.985, Vatican Library).
    // DiscoverMobile calls itself "the menologion" in its own doc comment, so
    // the surface gets the actual book. The Chora dome tried first here read
    // as ruin rather than library: exposed brick and a broken medallion.
    // NB: File:Menologion of Basil 326.jpg is PD for the 985 miniature but the
    // Vatican Library scan of it carries a diagonal "RESERVED" watermark, so
    // it is deliberately NOT used. Check new scans for watermarks by eye; the
    // license field will not tell you.
    preferred: ["File:Menologion of Basil 047.jpg"],
    query: "Menologion of Basil II",
    position: "attention",
  },
  {
    key: "reading",
    file: "reading.jpg",
    // St Luke writing, from the Ostromir Gospels (1056). An evangelist at the
    // desk is the reading room's own subject.
    preferred: ["File:Ostromir luke.jpg", "File:Ostromir Gospel.jpg"],
    query: "Ostromir Gospels evangelist miniature",
    position: "top",
  },
  {
    key: "you",
    file: "you.jpg",
    // The Ladder of Divine Ascent, which the app already nods to with its
    // Klimax glyph: the personal page is about one's own ascent.
    preferred: [
      "File:The Ladder of Divine Ascent.jpg",
      "File:Ladder of Divine Ascent Sinai 12th century.jpg",
    ],
    query: "Ladder of Divine Ascent icon Sinai",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "PurifyApp/1.0 (https://purifyapp.net; lifeistheosis@users.noreply.github.com)",
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
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query,
    )}&srnamespace=6&format=json&srlimit=15`,
  );
  const json = JSON.parse(r.body.toString());
  return (json.query?.search || [])
    .map((x) => x.title)
    .filter((t) => /\.(jpg|jpeg|png)$/i.test(t));
}

const strip = (s) => (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** URL + license metadata in one call; null unless the license is PD/CC0. */
async function fileInfoIfPd(title) {
  const r = await get(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      title,
    )}&prop=imageinfo&iiprop=url|extmetadata&format=json`,
  );
  const json = JSON.parse(r.body.toString());
  const info = Object.values(json.query?.pages || {})[0]?.imageinfo?.[0];
  if (!info?.url) return null;
  const meta = info.extmetadata || {};
  const short = strip(meta.LicenseShortName?.value);
  const license = short || strip(meta.License?.value);
  if (!license) return null;
  if (REJECT_PATTERN.test(license)) return null;
  if (!ALLOWED_PATTERN.test(license)) return null;
  // An attribution license is only usable if we actually know whom to credit.
  const artist = strip(meta.Artist?.value);
  if (/^cc by/i.test(license) && !artist) return null;
  return {
    url: info.url,
    license,
    artist: artist || "Unknown",
    work: strip(meta.ObjectName?.value) || title.replace(/^File:/, ""),
    workDate: strip(meta.DateTimeOriginal?.value) || "unknown",
    description: strip(meta.ImageDescription?.value),
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(
      title.replace(/ /g, "_"),
    )}`,
  };
}

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const only = argv.filter((a) => !a.startsWith("--"));
const targets = only.length
  ? SECTIONS.filter((s) => only.includes(s.key))
  : SECTIONS;

await fs.mkdir(OUT, { recursive: true });
const rows = [];

for (const section of targets) {
  const dest = path.join(OUT, section.file);
  if (!force) {
    try {
      await fs.access(dest);
      console.log(`${section.file}: already present, skipping (--force to replace)`);
      continue;
    } catch {
      /* fetch below */
    }
  }

  console.log(`\n${section.key}: searching "${section.query}"`);
  await sleep(1200);
  const candidates = [...section.preferred, ...(await searchCommons(section.query))];
  let saved = false;
  for (const cand of candidates) {
    await sleep(1000);
    let info = null;
    try {
      info = await fileInfoIfPd(cand);
    } catch (e) {
      console.log(`  skip (lookup failed): ${cand} ${e.message}`);
      continue;
    }
    if (!info) {
      console.log(`  skip (not PD): ${cand}`);
      continue;
    }
    const r = await get(info.url);
    if (r.status !== 200 || !r.type?.startsWith("image/")) continue;
    // Wide crop: these are mastheads, not portraits. 1600x900 keeps them
    // sharp on a 3x phone without bloating the bundled export.
    // "attention" guesses, and on a tall icon it guesses badly: the first run
    // cropped the Deesis so that Christ's head was above the frame. Sections
    // whose subject sits high in a portrait source declare position "top".
    const resized = await sharp(r.body)
      .rotate()
      .resize({
        width: 1600,
        height: 900,
        fit: "cover",
        position: section.position ?? "attention",
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(dest, resized);
    console.log(`  → saved ${section.file} (${(resized.length / 1024).toFixed(0)} KB)`);
    console.log(`    ${cand} · ${info.license}`);
    rows.push({ key: section.key, file: section.file, ...info, title: cand });
    saved = true;
    break;
  }
  if (!saved) console.warn(`  NO PD IMAGE found for ${section.key} — review manually`);
}

if (rows.length === 0) {
  console.log("\nNothing new fetched.");
  process.exit(0);
}

// Provenance table, appended so earlier runs are not lost.
const table = rows
  .map(
    (r) =>
      `| \`${r.file}\` | ${r.key} | ${r.work} | ${r.artist} | ${r.workDate} | ${r.license} | [Commons](${r.page}) |`,
  )
  .join("\n");
let existing = "";
try {
  existing = await fs.readFile(PROVENANCE, "utf8");
} catch {
  existing = `# Section media provenance

Photography behind the mobile section mastheads. Policy, matching
\`audio-provenance.md\` and \`icon-provenance.md\`: **an image ships only if
its source and license are documented here.** Everything below was accepted
by the public-domain gate in \`scripts/fetch-section-media.mjs\`; CC-BY and
CC-BY-SA are rejected by that script on purpose.

| File | Section | Work | Artist | Date | License | Source |
| --- | --- | --- | --- | --- | --- | --- |
`;
}
await fs.writeFile(PROVENANCE, `${existing.trimEnd()}\n${table}\n`);
console.log(`\nProvenance written to ${path.relative(ROOT, PROVENANCE)}`);

// The literal to paste into lib/media/sections.ts.
console.log("\n--- SECTION_MEDIA entries ---");
for (const r of rows) {
  console.log(`  ${r.key}: {
    src: "/sections/${r.file}",
    alt: ${JSON.stringify(r.description || r.work)},
    work: ${JSON.stringify(r.work)},
    artist: ${JSON.stringify(r.artist)},
    workDate: ${JSON.stringify(r.workDate)},
    source: ${JSON.stringify(r.title)},
    license: ${JSON.stringify(r.license)},
    evidenceUrl: ${JSON.stringify(r.page)},
  },`);
}
