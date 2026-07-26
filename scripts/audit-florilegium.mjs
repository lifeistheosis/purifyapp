// Stricter companion to verify-florilegium.mjs, and the one that decides.
//
// verify-florilegium reports the longest CONTIGUOUS run, which under-reports a
// genuine quotation whenever the source page splices apparatus into the middle
// of it (New Advent injects inline scripture references like "John 20:21").
//
// This one asks the question that actually matters: is every word of the
// quotation present on the page, IN ORDER, allowing gaps? That tolerates
// spliced apparatus and OCR noise while still catching a quotation whose words
// are simply not there, which is the failure that matters. A passage rendered
// from a different translation than the one cited scores badly here, which is
// exactly how the Cherubic Hymn attributed to Hapgood 1906 was caught: the
// words "mystically" and "thrice-holy" appear nowhere in that book.
//
// Usage:
//   node scripts/audit-florilegium.mjs [dir] [--drop]
//
// --drop rewrites each study with any entry below THRESHOLD removed. Without
// it, nothing is written and this only reports.

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const args = process.argv.slice(2);
const DROP = args.includes("--drop");
const DIR = path.resolve(process.cwd(), args.find((a) => !a.startsWith("--")) ?? "docs/editorial/dogma-queue");
const CACHE = path.join(process.cwd(), ".cache", "florilegium-pages");
fs.mkdirSync(CACHE, { recursive: true });

/** Below this fraction of in-order words present, an entry is not trustworthy. */
const THRESHOLD = 0.9;

/**
 * In-order coverage ALONE is not a test. Over a large corpus it is close to
 * meaningless: the Hapgood Service Book OCR is ~1.6 million words, and almost
 * any English word sequence can be found scattered through it in order. The
 * Cherubic Hymn quotation scored 100% in-order against that book while
 * containing "mystically" and "thrice-holy", neither of which appears in it
 * anywhere. It was a modern rendering attributed to a 1906 translation.
 *
 * So an entry must ALSO carry a contiguous anchor: a run of at least this many
 * consecutive words present verbatim. A real quotation has long unbroken runs
 * even when the page splices apparatus into the middle of it, because the
 * splice only breaks it into two long chunks. A quotation from a different
 * translation has no long run at all.
 */
const MIN_ANCHOR = 8;

const get = (url) =>
  new Promise((res, rej) => {
    https.get(url, { headers: { "User-Agent": "PurifyApp/1.0 (provenance check)" } }, (r) => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location)
        return get(new URL(r.headers.location, url).href).then(res).catch(rej);
      const c = [];
      r.on("data", (x) => c.push(x));
      r.on("end", () => res(Buffer.concat(c).toString("utf8")));
    }).on("error", rej);
  });

const norm = (s) =>
  s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").toLowerCase().trim();

/** archive.org detail pages carry no text; the OCR lives at the djvu endpoint. */
function resolveUrl(url) {
  const m = url.match(/archive\.org\/details\/([^/?#]+)/);
  return m ? `https://archive.org/stream/${m[1]}/${m[1]}_djvu.txt` : url;
}

const pages = new Map();
async function page(url) {
  const real = resolveUrl(url);
  if (pages.has(real)) return pages.get(real);
  const f = path.join(CACHE, Buffer.from(real).toString("base64url").slice(0, 80) + ".txt");
  let raw;
  if (fs.existsSync(f)) raw = fs.readFileSync(f, "utf8");
  else {
    raw = await get(real);
    fs.writeFileSync(f, raw);
    await new Promise((r) => setTimeout(r, 400));
  }
  const n = norm(raw);
  pages.set(real, n);
  return n;
}

/** Fraction of the quote's words found in order (gaps allowed). */
function inOrderCoverage(hayWords, needleWords) {
  let i = 0, hit = 0;
  for (const w of needleWords) {
    const at = hayWords.indexOf(w, i);
    if (at !== -1) { hit++; i = at + 1; }
  }
  return hit / needleWords.length;
}

/** Longest run of consecutive quote words appearing verbatim in the page. */
function longestAnchor(hay, needleWords) {
  for (let len = Math.min(needleWords.length, 40); len >= 4; len--)
    for (let s = 0; s + len <= needleWords.length; s++)
      if (hay.includes(needleWords.slice(s, s + len).join(" "))) return len;
  return 0;
}

let kept = 0, dropped = 0;
const removals = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const study = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  if (!Array.isArray(study.florilegium)) continue;
  console.log(`\n=== ${file}`);
  const survivors = [];
  for (const q of study.florilegium) {
    let hay;
    try { hay = await page(q.source); } catch (e) {
      console.log(`  FETCH-FAIL  ${q.author}: ${e.message}`);
      removals.push({ file, author: q.author, work: q.work, reason: "source unreachable" });
      dropped++; continue;
    }
    const words = norm(q.text).split(" ");
    const cov = inOrderCoverage(hay.split(" "), words);
    const anchor = longestAnchor(hay, words);
    const pct = Math.round(cov * 100);
    const good = cov >= THRESHOLD && anchor >= MIN_ANCHOR;
    if (good) {
      console.log(`  OK ${String(pct).padStart(3)}% anchor:${String(anchor).padStart(2)}  ${q.author} (${q.work})`);
      survivors.push(q); kept++;
    } else {
      const why = anchor < MIN_ANCHOR ? `no contiguous anchor (best ${anchor} words)` : `only ${pct}% in order`;
      console.log(`  DROP ${String(pct).padStart(3)}% anchor:${String(anchor).padStart(2)}  ${q.author} (${q.work}) -- ${why}`);
      removals.push({ file, author: q.author, work: q.work, reference: q.reference, coverage: pct, anchor, why });
      dropped++;
    }
  }
  if (DROP && survivors.length !== study.florilegium.length) {
    study.florilegium = survivors;
    fs.writeFileSync(path.join(DIR, file), JSON.stringify(study, null, 2) + "\n");
  }
}

console.log(`\nkept=${kept}  below-threshold=${dropped}  (threshold ${THRESHOLD * 100}% of words in order)`);
if (removals.length) {
  console.log(DROP ? "\nREMOVED:" : "\nWOULD REMOVE (re-run with --drop):");
  for (const r of removals) console.log(`  ${r.file}
     ${r.author} · ${r.work}
     ${r.why ?? r.reason}`);
}
