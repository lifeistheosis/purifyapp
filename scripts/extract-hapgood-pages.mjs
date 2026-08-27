// Extract a page range from the Hapgood scan in true reading order.
//
// This produces a REVIEW ARTIFACT, not a shippable prayer file. Liturgical
// wording is an owner stop condition (AGENTS.md), so a service goes to
// docs/editorial/ingest-review/ to be read before anything is structured into
// data/prayers/ and put in front of a reader.
//
// It exists because the services are set in two columns and the plain
// _djvu.txt interleaves them. See scripts/lib/djvu-columns.mjs for why that
// matters and how the geometry is reconstructed.
//
// Usage:
//   node scripts/extract-hapgood-pages.mjs --from 40 --to 53 \
//     --title "Great Vespers" --slug great-vespers \
//     [--xml <path>] [--write]

import fs from "node:fs";
import path from "node:path";

import { parseDjvuXml, readingOrder } from "./lib/djvu-columns.mjs";

const XML_URL =
  "https://archive.org/download/cu31924029363128/cu31924029363128_djvu.xml";

const SOURCE =
  "Isabel Florence Hapgood, Service Book of the Holy Orthodox-Catholic " +
  "Apostolic (Greco-Russian) Church. Houghton Mifflin, Boston, 1906. " +
  "Public domain. Cornell University Library scan (cu31924029363128), read " +
  "from the coordinate OCR so the two-column setting is resolved by geometry.";

const args = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const FROM = Number(arg("from"));
const TO = Number(arg("to"));
const TITLE = arg("title", "Untitled");
const SLUG = arg("slug", "untitled");
const XML = arg("xml");
const WRITE = args.includes("--write");

if (!Number.isFinite(FROM) || !Number.isFinite(TO)) {
  console.error("--from and --to are required page indices");
  process.exit(1);
}

async function loadXml() {
  if (XML && fs.existsSync(XML)) return fs.readFileSync(XML, "utf8");
  const res = await fetch(XML_URL, { headers: { "User-Agent": "purify-ingest" } });
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`);
  const text = await res.text();
  if (XML) fs.writeFileSync(XML, text, "utf8");
  return text;
}

/** Running headers and bare page numbers the scan repeats on every page. */
function isFurniture(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^\d{1,4}$/.test(t)) return true;
  if (/ALL-?NIGHT\s+VIGIL\s+SERVICE/i.test(t) && t.length < 60) return true;
  if (/^GREAT\s+VESPERS$/i.test(t)) return true;
  return false;
}

const pages = parseDjvuXml(await loadXml());
const out = [];
for (let i = FROM; i <= TO && i < pages.length; i++) {
  const p = pages[i];
  const lines = readingOrder(p.lines, p.width).filter((l) => !isFurniture(l));
  out.push({ page: i, lines });
}

// Join the scan's line-break hyphens for readability. NOTE this is the loose
// version, adequate for a document a person is going to read. The shipping
// ingest resolves every break against the book and refuses to guess; see
// scripts/ingest-hapgood-communion.mjs.
const body = out
  .map(({ page, lines }) => {
    const text = lines
      .join("\n")
      .replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2")
      .replace(/[ \t]+/g, " ")
      .replace(/\s+([;:,.!?])/g, "$1")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
    return `### Page ${page}\n\n${text}\n`;
  })
  .join("\n");

const words = body.split(/\s+/).length;
const doc = [
  `# ${TITLE}, extracted for review`,
  "",
  "Generated. Do not hand-edit. Rebuild with:",
  "",
  "```",
  `node scripts/extract-hapgood-pages.mjs --from ${FROM} --to ${TO} \\`,
  `  --title "${TITLE}" --slug ${SLUG} --write`,
  "```",
  "",
  `Source: ${SOURCE}`,
  "",
  "## Why this is here and not in data/prayers/",
  "",
  "Liturgical wording is an owner stop condition in AGENTS.md. This is the",
  "text the scan actually carries, read in the right order, so it can be",
  "checked before anyone structures it into prayers and rubrics and puts it in",
  "front of a reader.",
  "",
  "The order is reconstructed from word coordinates. The plain text of this",
  "volume interleaves the two columns, which produces something that still",
  "reads like liturgical English and is not what the page says.",
  "",
  `Pages ${FROM} to ${TO}, roughly ${words.toLocaleString("en-US")} words.`,
  "",
  "## Text",
  "",
  body,
].join("\n");

if (WRITE) {
  const dest = path.join(
    process.cwd(),
    "docs",
    "editorial",
    "ingest-review",
    `hapgood-${SLUG}.md`,
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, doc, "utf8");
  console.log(`wrote ${path.relative(process.cwd(), dest)} (${words} words)`);
} else {
  console.log(doc.slice(0, 3000));
  console.log(`\n[${words} words total; pass --write to save]`);
}
