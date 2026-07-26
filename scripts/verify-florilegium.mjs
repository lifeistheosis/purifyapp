// Verify every florilegium quotation against the RAW text of its cited source.
//
// Why this exists, and why it does not use a fetch-and-summarise tool: on
// 2026-07-26 such a tool reported that newadvent.org/fathers/2802.htm covered
// only sections 1 to 29 and did not contain Athanasius section 54. That was
// false. The page carries all 57 sections; the tool had truncated it and then
// answered confidently from the truncation. A summarising fetch will invent a
// clean negative. Fetch the bytes and grep them.
//
// Usage:
//   node scripts/verify-florilegium.mjs                     # the review queue
//   node scripts/verify-florilegium.mjs data/theology       # published studies
//
// Matching is WORD-SEQUENCE ONLY: all punctuation is stripped before
// comparison. That is deliberate. The house style forbids em dashes, so
// quotations legitimately carry commas where NPNF and ANF print dashes, and a
// punctuation-sensitive match reports those as fabrications when they are not.
// A word-level mismatch is the real signal.
//
// Exit code is 1 if anything is unverified, so this can gate a release.

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const target = process.argv[2] ?? "docs/editorial/dogma-queue";
const DIR = path.resolve(process.cwd(), target);
const CACHE = path.join(process.cwd(), ".cache", "florilegium-pages");
fs.mkdirSync(CACHE, { recursive: true });

const get = (url) =>
  new Promise((res, rej) => {
    https
      .get(url, { headers: { "User-Agent": "PurifyApp/1.0 (provenance check)" } }, (r) => {
        if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location)
          return get(new URL(r.headers.location, url).href).then(res).catch(rej);
        const c = [];
        r.on("data", (x) => c.push(x));
        r.on("end", () => res(Buffer.concat(c).toString("utf8")));
      })
      .on("error", rej);
  });

const norm = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

const pages = new Map();
async function page(url) {
  if (pages.has(url)) return pages.get(url);
  const key = Buffer.from(url).toString("base64url").slice(0, 80) + ".txt";
  const f = path.join(CACHE, key);
  let raw;
  if (fs.existsSync(f)) raw = fs.readFileSync(f, "utf8");
  else {
    raw = await get(url);
    fs.writeFileSync(f, raw);
    await new Promise((r) => setTimeout(r, 400));
  }
  const n = norm(raw);
  pages.set(url, n);
  return n;
}

/** Longest contiguous run of the quote present in the page. */
function bestMatch(hay, needle) {
  const words = needle.split(" ");
  for (let len = words.length; len >= 6; len--) {
    for (let start = 0; start + len <= words.length; start++) {
      const probe = words.slice(start, start + len).join(" ");
      if (hay.includes(probe)) return { len, total: words.length };
    }
  }
  return null;
}

let ok = 0, partial = 0, bad = 0;

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const study = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  if (!Array.isArray(study.florilegium)) continue;
  console.log(`\n=== ${file}`);
  for (const q of study.florilegium) {
    let hay;
    try {
      hay = await page(q.source);
    } catch (e) {
      console.log(`  FETCH-FAIL  ${q.author}: ${e.message}`);
      bad++;
      continue;
    }
    const needle = norm(q.text);
    const m = bestMatch(hay, needle);
    if (m && m.len === m.total) {
      console.log(`  OK          ${q.author} (${m.total}w)`);
      ok++;
    } else if (m && m.len / m.total >= 0.6) {
      console.log(`  PARTIAL     ${q.author}: ${m.len}/${m.total} words contiguous (${q.work})`);
      partial++;
    } else {
      console.log(
        `  UNVERIFIED  ${q.author} (${q.work} ${q.reference}) best ${m ? m.len : 0}/${needle.split(" ").length}`,
      );
      bad++;
    }
  }
}

console.log(`\nok=${ok}  partial=${partial}  unverified=${bad}`);
console.log(
  "PARTIAL usually means the source page has inline apparatus spliced into the\n" +
    "text (New Advent injects scripture references), or the quotation elides.\n" +
    "UNVERIFIED means the words are not on that page at all. Investigate those.",
);
if (bad > 0) process.exitCode = 1;
