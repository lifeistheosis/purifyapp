// Reusable ingester for St. John Chrysostom's NPNF homily series that follow
// the Schaff "Homily N. / <lemma> / Ver. N." structure (John, Romans, Acts,
// Hebrews, etc.). Generalises scripts/ingest-chrysostom-john.mjs.
//
// Each volume differs only in: source URL, how to slice the homily region out
// of the raw text, the lemma's book token, and the expected homily count. A
// thin per-volume script supplies those via a config object and calls
// `ingestHomilies(config)`.
//
// What it produces (matching the John pipeline):
//   1. data/saints/<saintSlug>/<workSlug>.json   — the full work (sections)
//   2. data/bible/commentary/<bookSlug>/<ch>.json — per-verse commentary,
//      merged with any other Fathers already present (only this author+work's
//      prior notes are replaced).
//
// No text is fabricated: every note is the cleaned source paragraph(s) keyed
// to the verse the homily itself marks with "Ver. N.".

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const ROMAN = {
  i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000,
};
export function romanToInt(r) {
  const key = String(r).toLowerCase();
  let total = 0;
  for (let i = 0; i < key.length; i++) {
    const cur = ROMAN[key[i]];
    const next = ROMAN[key[i + 1]];
    if (cur == null) return NaN;
    total += next && cur < next ? -cur : cur;
  }
  return total;
}

function numeralToInt(tok) {
  if (/^[0-9]+$/.test(tok)) return parseInt(tok, 10);
  if (/^[ivxlcdm]+$/i.test(tok)) return romanToInt(tok);
  return NaN;
}

export async function getText(cacheName, srcUrl) {
  const cache = path.join(ROOT, "scripts", ".cache", cacheName);
  try {
    return await fs.readFile(cache, "utf8");
  } catch {
    /* fetch */
  }
  process.stdout.write(`Fetching ${srcUrl} …\n`);
  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const text = await res.text();
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(cache, text, "utf8");
  return text;
}

// ---- Cleaning helpers (ported from the John ingester) --------------------

function cleanInline(s) {
  return s
    .replace(/\[\d+\.\]/g, "") // paragraph-number bullets [1.]
    .replace(/\[\d+\]/g, "") // inline footnote refs [74]
    .replace(/[ \t]+/g, " ") // collapse whitespace
    .replace(/\s*—\s*/g, ", ") // site policy: no em dashes in visible text
    .replace(/\s+([,.;:!?])/g, "$1") // tidy spaced punctuation
    .replace(/,\s*,/g, ",") // collapse accidental double commas
    .trim();
}

function toParagraphs(raw) {
  const lines = raw.split("\n");
  const kept = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^\[\d+\]/.test(t)) continue; // footnote definition
    if (/^_{3,}$/.test(t)) continue; // separator rule
    if (/^-{3,}$/.test(t)) continue; // dash rule
    if (/^\[[^\]]*\]$/.test(t)) continue; // standalone editorial bracket
    kept.push(line);
  }
  const paras = [];
  let buf = [];
  for (const line of kept) {
    if (line.trim() === "") {
      if (buf.length) {
        paras.push(buf.join(" "));
        buf = [];
      }
    } else {
      buf.push(line.trim());
    }
  }
  if (buf.length) paras.push(buf.join(" "));
  return paras.map(cleanInline).filter((p) => p.length > 1);
}

// ---- Parsing -------------------------------------------------------------

// Bare homily header, tolerant of a trailing footnote marker like " [1097]"
// (some volumes attach one to the header line, e.g. Acts Homily XLIX).
const DEFAULT_HEADER_RE = /^ {3}Homily ([IVXLCDM]+)\.(?:\s*\[\d+\])?\s*$/gm;

function parseHomilies(region, headerRe = DEFAULT_HEADER_RE) {
  const re = new RegExp(headerRe.source, "gm");
  const heads = [];
  let m;
  while ((m = re.exec(region)) !== null) {
    heads.push({ roman: m[1], idx: m.index, headerLen: m[0].length });
  }
  const homilies = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const bodyStart = h.idx + h.headerLen;
    const bodyEnd = i + 1 < heads.length ? heads[i + 1].idx : region.length;
    homilies.push({
      n: i + 1,
      roman: h.roman,
      block: region.slice(bodyStart, bodyEnd),
    });
  }
  return homilies;
}

// Pull the lemma line (e.g. "Rom. i. 1", "Acts ii. 1, 2", "Heb. i. 1, 2")
// from the head of a homily block. `lemmaRe` must capture (chapterToken,
// verseLabel). Returns { chapter, startVerse, verseLabel, rest }.
function extractLemma(block, lemmaRe) {
  const lines = block.split("\n");
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const t = lines[i].trim();
    if (t === "") continue;
    const lm = t.match(lemmaRe);
    if (lm) {
      const chapter = numeralToInt(lm[1]);
      const verseLabel = lm[2].replace(/\s+/g, " ").replace(/\.$/, "").trim();
      const vmatch = verseLabel.match(/\d+/);
      if (!Number.isFinite(chapter) || !vmatch) break;
      const startVerse = parseInt(vmatch[0], 10);
      lines.splice(i, 1); // drop the lemma line from the body
      return { chapter, startVerse, verseLabel, rest: lines.join("\n") };
    }
    if (/^[A-Za-z"“]/.test(t)) break; // first real content, no lemma (preface)
  }
  return { chapter: null, startVerse: null, verseLabel: null, rest: block };
}

// Split a homily's paragraphs into verse-keyed chunks using paragraph-leading
// "Ver. N." markers (parenthetical "( Ver. N.)" citations are ignored).
function splitByVerse(paragraphs, startVerse) {
  const out = new Map();
  let cur = startVerse;
  for (const p of paragraphs) {
    const vm = p.match(/^Ver\.\s*(\d+)\.?\s*/);
    if (vm) cur = parseInt(vm[1], 10);
    if (cur == null) continue;
    if (!out.has(cur)) out.set(cur, []);
    out.get(cur).push(p);
  }
  return out;
}

// ---- Main ----------------------------------------------------------------

export async function ingestHomilies(cfg) {
  const {
    srcUrl,
    cacheName,
    getRegion, // (rawText) => region string of just this book's homilies
    headerRe = DEFAULT_HEADER_RE,
    lemmaRe, // regex with (chapter)(verseLabel) capture groups
    expectedHomilies, // gate
    prefaceCount = 0, // homilies with no lemma at the start (e.g. John has 1)
    author,
    citation,
    saintSlug,
    workSlug,
    workTitle,
    workSubtitle,
    bookSlug,
    bookName,
    source,
    workLabel, // (homilyN) => commentary `work` string
    verseCounts = null, // optional { chapter: maxVerse } sanity map
  } = cfg;

  const text = await getText(cacheName, srcUrl);
  const region = getRegion(text);
  if (!region || region.length < 1000) {
    throw new Error(`getRegion returned too little text (${region?.length})`);
  }
  const homilies = parseHomilies(region, headerRe);

  if (expectedHomilies && homilies.length !== expectedHomilies) {
    throw new Error(
      `Expected ${expectedHomilies} homilies for ${bookName}, parsed ${homilies.length}. Aborting.`,
    );
  }

  const sections = [];
  const commentaryByChapter = new Map(); // chapter -> verse -> [{n, text}]
  let lemmaHits = 0;

  for (const hom of homilies) {
    const { chapter, startVerse, verseLabel, rest } = extractLemma(
      hom.block,
      lemmaRe,
    );
    const paragraphs = toParagraphs(rest);
    const title =
      chapter == null
        ? `Homily ${hom.n}, Preface`
        : `Homily ${hom.n}, ${bookName} ${chapter}:${verseLabel}`;
    sections.push({ n: hom.n, title, paragraphs });

    if (chapter == null) continue;
    lemmaHits++;

    const byVerse = splitByVerse(paragraphs, startVerse);
    if (!commentaryByChapter.has(chapter)) commentaryByChapter.set(chapter, new Map());
    const chMap = commentaryByChapter.get(chapter);
    for (const [verse, paras] of byVerse) {
      if (!chMap.has(verse)) chMap.set(verse, []);
      chMap.get(verse).push({ n: hom.n, text: paras.join("\n\n") });
    }
  }

  // Sanity: most homilies after the preface should have found a lemma.
  const expectedLemma = homilies.length - prefaceCount;
  if (lemmaHits < expectedLemma * 0.9) {
    throw new Error(
      `Only ${lemmaHits}/${expectedLemma} homilies yielded a lemma for ${bookName}; parser/lemmaRe likely wrong. Aborting.`,
    );
  }

  // ---- Write the work ----
  const workOut = path.join(ROOT, "data", "saints", saintSlug, `${workSlug}.json`);
  const work = { saint: saintSlug, slug: workSlug, title: workTitle, subtitle: workSubtitle, source, sections };
  await fs.mkdir(path.dirname(workOut), { recursive: true });
  await fs.writeFile(workOut, JSON.stringify(work, null, 2) + "\n", "utf8");

  // ---- Write/merge commentary ----
  const commentaryDir = path.join(ROOT, "data", "bible", "commentary", bookSlug);
  await fs.mkdir(commentaryDir, { recursive: true });
  let chaptersWritten = 0;
  let totalNotes = 0;
  const warnings = [];

  for (const [chapter, verseMap] of [...commentaryByChapter.entries()].sort((a, b) => a[0] - b[0])) {
    const file = path.join(commentaryDir, `${chapter}.json`);
    let existing = {};
    try {
      existing = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      /* none yet */
    }

    // Keep all other Fathers; drop this author's prior notes for this work only.
    const merged = {};
    for (const [v, notes] of Object.entries(existing)) {
      const kept = notes.filter(
        (nt) => !(nt.author === author && nt.citation === citation && /Homil/i.test(nt.work) && nt.work.includes(bookName)),
      );
      if (kept.length) merged[v] = kept;
    }

    for (const [verse, entries] of [...verseMap.entries()].sort((a, b) => a[0] - b[0])) {
      if (verseCounts && verseCounts[chapter] && verse > verseCounts[chapter]) {
        warnings.push(`${bookName} ${chapter}:${verse} exceeds chapter length`);
      }
      const key = String(verse);
      if (!merged[key]) merged[key] = [];
      for (const e of entries) {
        merged[key].push({
          author,
          work: workLabel(e.n),
          citation,
          text: e.text,
        });
        totalNotes++;
      }
    }

    const sorted = {};
    for (const k of Object.keys(merged).sort((a, b) => Number(a) - Number(b))) {
      sorted[k] = merged[k];
    }
    await fs.writeFile(file, JSON.stringify(sorted, null, 2) + "\n", "utf8");
    chaptersWritten++;
  }

  process.stdout.write(
    `\n${bookName}: ${homilies.length} homilies, ${lemmaHits} with lemmas\n` +
      `  work: ${path.relative(ROOT, workOut)} (${sections.length} sections)\n` +
      `  commentary: ${chaptersWritten} chapters, ${totalNotes} ${author} verse-notes\n`,
  );
  if (warnings.length) {
    process.stdout.write(`  warnings (${warnings.length}): ${warnings.slice(0, 8).join("; ")}\n`);
  }
  return { homilies: homilies.length, chaptersWritten, totalNotes };
}
