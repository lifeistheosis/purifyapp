// St. Athanasius the Great — readable works from NPNF Series 2, Vol. 4
// (public domain, ed. Schaff & Wace). One volume, sliced into five works:
//   against-the-heathen, four-discourses-against-the-arians,
//   on-the-nicene-definition (de Decretis), on-the-councils (de Synodis),
//   life-of-antony.
// (on-the-incarnation.json already exists and is left untouched.)
//
//   Source: https://www.ccel.org/ccel/schaff/npnf204/cache/npnf204.txt
// Run from project root:  node scripts/ingest-athanasius.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { getText, toParagraphs } from "./lib/npnf-homilies.mjs";

const SAINT = "athanasius-the-great";
const OUTDIR = path.join(process.cwd(), "data", "saints", SAINT);
const SOURCE =
  "St. Athanasius, Select Works and Letters. From the Nicene and Post-Nicene Fathers, Series 2, Vol. 4 (ed. Philip Schaff & Henry Wace). Public domain.";

const text = await getText(
  "npnf204.txt",
  "https://www.ccel.org/ccel/schaff/npnf204/cache/npnf204.txt",
);

// ---- slicing helpers -----------------------------------------------------

// Precompute every line's start offset + trimmed text (tolerant of CCEL's
// leading indentation and CRLF line endings).
const LINES = (() => {
  const out = [];
  let off = 0;
  for (const raw of text.split("\n")) {
    out.push({ off, trimmed: raw.replace(/\r$/, "").trim() });
    off += raw.length + 1; // +1 for the consumed "\n"
  }
  return out;
})();

// All start offsets of lines whose trimmed text matches `re`.
function matches(re) {
  const idxs = LINES.filter((l) => re.test(l.trimmed)).map((l) => l.off);
  if (!idxs.length) throw new Error(`no match for ${re}`);
  return idxs;
}
function firstIdx(re) {
  return matches(re)[0];
}
function lastIdx(re) {
  const a = matches(re);
  return a[a.length - 1];
}
// First matching offset strictly after `off` (boundary titles can also appear
// in the volume's table of contents, so an end-marker must be sought forward).
function firstIdxAfter(re, off) {
  const hit = matches(re).find((i) => i > off);
  if (hit == null) throw new Error(`no match for ${re} after ${off}`);
  return hit;
}
// Index just past the newline that ends the line containing `idx`.
function afterLine(idx) {
  const nl = text.indexOf("\n", idx);
  return nl < 0 ? idx : nl + 1;
}
// Same, but for an offset within a sliced region string.
function afterLineIn(s, idx) {
  const nl = s.indexOf("\n", idx);
  return nl < 0 ? s.length : nl + 1;
}
// First offset of a line in `region` whose trimmed text matches `re` (-1 if none).
function searchLineIn(region, re) {
  let off = 0;
  for (const raw of region.split("\n")) {
    if (re.test(raw.replace(/\r$/, "").trim())) return off;
    off += raw.length + 1;
  }
  return -1;
}
// All { off, m } for lines in `region` matching `re` (capturing group preserved).
function headerOffsetsIn(region, re) {
  const out = [];
  let off = 0;
  for (const raw of region.split("\n")) {
    const m = raw.replace(/\r$/, "").trim().match(re);
    if (m) out.push({ off, lineLen: raw.length + 1, m });
    off += raw.length + 1;
  }
  return out;
}

// Clean a slice into paragraphs, dropping editorial "Introduction to ..."
// inserts and any leftover bare "Part N." / title lines.
function paras(slice) {
  return toParagraphs(slice).filter(
    (p) => !/^Introduction to/i.test(p) && !/^Part [IVX]+\.$/.test(p),
  );
}

function charCount(sections) {
  return sections.reduce(
    (a, s) => a + s.paragraphs.reduce((b, p) => b + p.length, 0),
    0,
  );
}

async function writeWork({ slug, title, subtitle, sections, min }) {
  const chars = charCount(sections);
  if (chars < (min ?? 15000)) {
    throw new Error(`${slug}: only ${chars} chars parsed; aborting (bad slice).`);
  }
  const work = { saint: SAINT, slug, title, subtitle, source: SOURCE, sections };
  const out = path.join(OUTDIR, `${slug}.json`);
  await fs.writeFile(out, JSON.stringify(work, null, 2) + "\n", "utf8");
  process.stdout.write(
    `${slug}: ${sections.length} section(s), ${(chars / 1000).toFixed(0)}k chars -> ${path.relative(process.cwd(), out)}\n`,
  );
}

// ---- 1. Against the Heathen (Contra Gentes) — 3 Parts --------------------
{
  const start = afterLine(firstIdx(/^Against the Heathen\.$/));
  const end = firstIdxAfter(/^Introduction to the Treatise$/, start);
  const region = text.slice(start, end);
  const pII = searchLineIn(region, /^Part II\.$/);
  const pIII = searchLineIn(region, /^Part III\.$/);
  if (pII < 0 || pIII < 0) throw new Error("Against the Heathen: missing Part II/III");
  const sections = [
    { n: 1, title: "Part I", paragraphs: paras(region.slice(0, pII)) },
    { n: 2, title: "Part II", paragraphs: paras(region.slice(afterLineIn(region, pII), pIII)) },
    { n: 3, title: "Part III", paragraphs: paras(region.slice(afterLineIn(region, pIII))) },
  ];
  await writeWork({
    slug: "against-the-heathen",
    title: "Against the Heathen",
    subtitle: "Contra Gentes",
    sections,
    min: 60000,
  });
}

// ---- 1b. On the Incarnation (de Incarnatione) — single section -----------
// Re-ingested from the public-domain NPNF2-04 text, replacing the prior
// (copyrighted) CSMV 1944 translation.
{
  const start = afterLine(firstIdx(/^On the Incarnation of the Word\.$/));
  const end = firstIdxAfter(/^Introduction to the Deposition of Arius/, start);
  const sections = [
    { n: 1, title: "On the Incarnation of the Word", paragraphs: paras(text.slice(start, end)) },
  ];
  await writeWork({
    slug: "on-the-incarnation",
    title: "On the Incarnation",
    subtitle: "De Incarnatione Verbi Dei",
    sections,
    min: 40000,
  });
}

// ---- 2. On the Nicene Definition (de Decretis) — single section ----------
{
  const start = afterLine(firstIdx(/^De Decretis or Defence of the Nicene Definition$/));
  const end = firstIdxAfter(/^Introduction to the de Sententia Dionysii.$/, start);
  const sections = [
    { n: 1, title: "Defence of the Nicene Definition", paragraphs: paras(text.slice(start, end)) },
  ];
  await writeWork({
    slug: "on-the-nicene-definition",
    title: "On the Nicene Definition",
    subtitle: "De Decretis",
    sections,
    min: 40000,
  });
}

// ---- 3. Life of Antony — single narrative section ------------------------
{
  // Two "Life of Antony." title lines: the first heads Robertson's intro,
  // the second (last) heads the actual Life. Start at the last.
  const start = afterLine(lastIdx(/^Life of Antony\.$/));
  const end = firstIdxAfter(/^Introduction to Ad Episcopos/, start);
  const sections = [
    { n: 1, title: "The Life of Antony", paragraphs: paras(text.slice(start, end)) },
  ];
  await writeWork({
    slug: "life-of-antony",
    title: "Life of Antony",
    subtitle: "Vita S. Antonii",
    sections,
    min: 40000,
  });
  // Athanasius authored the Life of Antony, so it also appears on St. Anthony
  // the Great's profile. Write an identical copy under his folder so the
  // /saints/anthony-the-great/life-of-antony reader route resolves.
  const antDir = path.join(process.cwd(), "data", "saints", "anthony-the-great");
  await fs.mkdir(antDir, { recursive: true });
  const antCopy = {
    saint: "anthony-the-great",
    slug: "life-of-antony",
    title: "Life of Antony",
    subtitle: "Vita S. Antonii, by St. Athanasius the Great",
    source: SOURCE,
    sections,
  };
  await fs.writeFile(
    path.join(antDir, "life-of-antony.json"),
    JSON.stringify(antCopy, null, 2) + "\n",
    "utf8",
  );
  process.stdout.write("life-of-antony: copy written for anthony-the-great\n");
}

// ---- 4. Four Discourses Against the Arians — 4 Discourses ----------------
{
  const start = firstIdx(/^Four Discourses Against the Arians\.$/);
  const end = firstIdxAfter(/^Introduction to de Synodis.$/, start);
  const region = text.slice(start, end);
  const heads = headerOffsetsIn(region, /^Discourse (I|II|III|IV)\.$/);
  if (heads.length !== 4) throw new Error(`Expected 4 discourses, found ${heads.length}`);
  const sections = heads.map((h, i) => {
    const bodyStart = h.off + h.lineLen;
    const bodyEnd = i + 1 < heads.length ? heads[i + 1].off : region.length;
    return {
      n: i + 1,
      title: `Discourse ${h.m[1]}`,
      paragraphs: paras(region.slice(bodyStart, bodyEnd)),
    };
  });
  await writeWork({
    slug: "four-discourses-against-the-arians",
    title: "Four Discourses Against the Arians",
    subtitle: "Orationes contra Arianos",
    sections,
    min: 100000,
  });
}

// ---- 5. On the Councils (de Synodis) — 2 Parts ---------------------------
{
  const start = afterLine(lastIdx(/^Councils of Ariminum and Seleucia\.$/));
  const end = firstIdxAfter(/^Introduction to Tomus Ad Antiochenos.$/, start);
  const region = text.slice(start, end);
  const pI = searchLineIn(region, /^Part I\. History of the Councils\.$/);
  const pII = searchLineIn(region, /^Part II\. History of Arian Opinions\.$/);
  if (pI < 0 || pII < 0) throw new Error("de Synodis: missing Part I/II");
  const sections = [
    { n: 1, title: "Part I. History of the Councils", paragraphs: paras(region.slice(afterLineIn(region, pI), pII)) },
    { n: 2, title: "Part II. History of Arian Opinions", paragraphs: paras(region.slice(afterLineIn(region, pII))) },
  ];
  await writeWork({
    slug: "on-the-councils",
    title: "On the Councils of Ariminum and Seleucia",
    subtitle: "De Synodis",
    sections,
    min: 40000,
  });
}

process.stdout.write("Athanasius ingest complete.\n");
