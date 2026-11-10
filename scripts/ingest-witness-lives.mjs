// A saint's Life in the witnesses' own words: the menologion month's ingest.
//
//   node scripts/ingest-witness-lives.mjs <month>              write every Life of the month
//   node scripts/ingest-witness-lives.mjs <month> --only <slug> one saint's Life
//   node scripts/ingest-witness-lives.mjs <month> --check       write nothing; compare only
//
// WHAT IT IS FOR. From November 2026 a new saint's page carries no life of
// ours (the owner's "public-domain lives only", 2026-11-10;
// docs/1.9-build/notes/november-saints.md). Where a witness wrote of him, a
// Church historian, a Father, Scripture, a chronicle, the Life is that
// witness's words, verbatim, each passage under its book and place, as St
// Ammon's was on 2026-10-30. This script makes those files, the same way every
// month, from a spec file: scripts/menologion/<month>-lives.mjs.
//
// WHERE THE WORDS COME FROM. Never New Advent, whose NPNF and ANF are revised
// ("has" for "hath", words dropped: docs/editorial-standards.md, clergy item
// 5). A passage is read from CCEL's transcription of the printed volume and
// compared word for word with archive.org's text of scans of that printing;
// where they differ and the scans agree with each other, the page wins
// (`fix` in the spec says so, passage by passage). Scripture is the app's own
// Bible (data/bible/), word for word. A text with no clean transcription (the
// Novgorod Chronicle, Mouravieff) is written into the spec from the scan,
// line by line, and compared with the scan the same way.
//
// WHAT IT KEEPS. The author's words only: the edition's chapter headings,
// footnotes, page numbers and running heads are left out; a footnote's mark
// in the text goes with it. CCEL types the printed dash as "--": it is the
// edition's punctuation, kept as the dash it prints. Paragraphs stay as
// printed, because readers' highlights and notes are kept by section and
// paragraph.
//
// WHAT IT WRITES. data/saints/<saint>/<slug>.json, shaped as WritingContent
// (lib/saints/load.ts): one section for each passage, voice "witness" (or
// "scripture"), the witness named, the citation exact. Then it prints the
// registry's Work line for each, to paste into lib/saints/saints.ts.
//
// Raw texts are cached under scripts/.cache/ (gitignored). Every step asserts:
// a passage whose start is not found, which comes out shorter than its spec
// expects, or which leaves a footnote mark or a markup token behind stops the
// run before anything is written.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache");
const UA = "PurifyApp/1.0 (https://purifyapp.net; public-domain ingest)";

/* ---------- Fetching, cached, decoded as declared ---------- */

async function fetchText(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.readFileSync(file, "utf8");
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const declared = /charset=([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1]?.toLowerCase();
      // CCEL and archive.org serve UTF-8; decode strictly, so a wrong guess
      // throws instead of turning every curly quote into U+FFFD.
      const text = new TextDecoder(declared && declared !== "utf-8" ? declared : "utf-8", { fatal: true }).decode(bytes);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
      return text;
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw last;
}

/** CCEL's plain text of a Schaff volume (npnf202, anf06, ...). */
export const ccelVolume = (vol) =>
  fetchText(`https://ccel.org/ccel/s/schaff/${vol}/cache/${vol}.txt`, path.join(CACHE, "ccel", `${vol}.txt`));

/**
 * archive.org's text of a scan (the OCR of the printed pages). An item whose
 * text file is not named after it is given as "<item>/<file>".
 */
export const scanText = (id) => {
  const [item, file] = id.includes("/") ? [id.slice(0, id.indexOf("/")), id.slice(id.indexOf("/") + 1)] : [id, `${id}_djvu.txt`];
  return fetchText(`https://archive.org/download/${item}/${encodeURIComponent(file)}`, path.join(CACHE, "scans", `${item}.txt`));
};

/**
 * Project Gutenberg's plain text of a book (`vol: "gutenberg:<n>"`), for a
 * printed English edition with no CCEL transcription (the Loeb Barlaam and
 * Ioasaph). Its byte-order mark and Windows line ends are taken off.
 */
const gutenbergText = async (n) =>
  (await fetchText(`https://www.gutenberg.org/cache/epub/${n}/pg${n}.txt`, path.join(CACHE, "gutenberg", `pg${n}.txt`)))
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");

/** The transcription a passage is cut from: CCEL's volume, or Gutenberg's book. */
const sourceText = (vol) => {
  const g = /^gutenberg:(\d+)$/.exec(vol);
  return g ? gutenbergText(g[1]) : ccelVolume(vol);
};

/* ---------- Cutting a passage out of CCEL ---------- */

const RULE = /^[ \t]*_{5,}[ \t]*$/m;
const NOTE_MARK = /\s*\[\d+\]/g;

/** Every paragraph of a stretch of CCEL text, footnotes and rules out. */
function paragraphsOf(raw) {
  const blocks = raw.split(/\n[ \t]*\n/).map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean));
  const out = [];
  for (const lines of blocks) {
    if (!lines.length) continue;
    if (/^\[\d+\]/.test(lines[0])) continue; // a footnote's own paragraph
    if (lines.every((l) => /^[_\-]{3,}$/.test(l))) continue; // a rule
    // A footnote's mark can touch the next word ("among [3301]the"): it
    // leaves a space, and a space before a stop is then closed; not before
    // an ellipsis, which opens the words after it ("ungodliness. ...For"),
    // and a gap the edition prints as spaced dots (". . .") stays as printed.
    const p = lines
      .join(" ")
      .replace(NOTE_MARK, " ")
      .replace(/ ?-- ?/g, "—")
      .replace(/[ \t]+/g, " ")
      .replace(/ \. \. \./g, "\uE000")
      .replace(/ ([,.;:!?])(?!\.)/g, "$1")
      .replace(/\uE000/g, " . . .")
      .trim();
    if (p) out.push(p);
  }
  return out;
}

/**
 * A passage of CCEL text: from the line holding `from` (a literal string,
 * unique in the volume) to the next rule, or to the line holding `to`.
 * `heading` drops that many opening paragraphs (the edition's chapter title).
 * `paras` keeps a run of paragraphs, [first, last] counted from 0, for a
 * passage that is part of a longer chapter; `cut` then trims the first and
 * the last of them at a sentence the spec names, so a witness's words about
 * another man are not handed to this one.
 */
function cutPassage(text, p, label) {
  const at = text.indexOf(p.from);
  if (at < 0) throw new Error(`${label}: "${p.from}" not found in ${p.vol}`);
  if (text.indexOf(p.from, at + 1) >= 0) throw new Error(`${label}: "${p.from}" is not unique in ${p.vol}`);
  const lineStart = text.lastIndexOf("\n", at) + 1;
  let end;
  if (p.to) {
    end = text.indexOf(p.to, at + p.from.length);
    if (end < 0) throw new Error(`${label}: end "${p.to}" not found after the start`);
    end = text.lastIndexOf("\n", end) + 1;
  } else {
    const rest = text.slice(at);
    const rule = RULE.exec(rest);
    end = rule ? at + rule.index : text.length;
  }
  let paras = paragraphsOf(text.slice(lineStart, end)).slice(p.heading ?? 0);
  if (p.paras) paras = paras.slice(p.paras[0], p.paras[1] + 1);
  if (p.startAt) {
    const i = paras[0].indexOf(p.startAt);
    if (i < 0) throw new Error(`${label}: startAt "${p.startAt}" not in the first paragraph`);
    paras[0] = paras[0].slice(i);
  }
  if (p.endAfter) {
    const last = paras.length - 1;
    const i = paras[last].indexOf(p.endAfter);
    if (i < 0) throw new Error(`${label}: endAfter "${p.endAfter}" not in the last paragraph`);
    paras[last] = paras[last].slice(0, i + p.endAfter.length);
  }
  return paras;
}

/**
 * A whole work, chapter by chapter (from November's works, 1.9). CCEL sets a
 * chapter's footnotes between two rules after it, and a footnote can run to
 * several paragraphs, so here every stretch between rules that opens with a
 * note's mark is dropped whole before the paragraphs are read. Then the text
 * is split at the edition's own chapter headings (`chapters.heading`, a
 * pattern whose groups are the chapter's number and its title): each chapter
 * is a section, titled as the edition titles it, its heading out of its
 * words. Text before the first heading stays with the first chapter.
 */
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
const fromRoman = (s) =>
  [...s.toUpperCase()].reduce((n, c, i, a) => (ROMAN[c] < (ROMAN[a[i + 1]] ?? 0) ? n - ROMAN[c] : n + ROMAN[c]), 0);

function cutWork(text, p, label) {
  const at = text.indexOf(p.from);
  if (at < 0) throw new Error(`${label}: "${p.from}" not found in ${p.vol}`);
  if (text.indexOf(p.from, at + 1) >= 0) throw new Error(`${label}: "${p.from}" is not unique in ${p.vol}`);
  const end = text.indexOf(p.to, at + p.from.length);
  if (end < 0) throw new Error(`${label}: end "${p.to}" not found after the start`);
  const raw = text.slice(text.lastIndexOf("\n", at) + 1, text.lastIndexOf("\n", end) + 1);
  const kept = raw
    .split(/^[ \t]*_{5,}[ \t]*$/m)
    .filter((stretch) => !/^\s*\[\d+\]/.test(stretch))
    .join("\n\n");
  const heading = new RegExp(p.chapters.heading);
  // `dropFrom`: where an edition prints commentators after each chapter (St
  // Peter's canons with Balsamon and Zonaras), the chapter ends at the first
  // paragraph of theirs; only the author's words are kept.
  const dropFrom = p.chapters.dropFrom ? new RegExp(p.chapters.dropFrom) : null;
  const chapters = [];
  for (const para of paragraphsOf(kept).slice(p.heading ?? 0)) {
    // `lead`: the edition's opening before chapter I (Barlaam's
    // "INTRODUCTION") is a section of its own, numbered 0.
    if (p.chapters.lead && para === p.chapters.lead && !chapters.length) {
      chapters.push({ numeral: "", n: 0, title: p.chapters.leadTitle ?? para, paras: [], closed: false });
      continue;
    }
    const m = heading.exec(para);
    if (m) {
      const n = /^[IVXLC]+$/i.test(m[1]) ? fromRoman(m[1]) : Number(m[1]);
      // A chapter with no title of its own ("Canon I.") is titled as printed,
      // or as the spec's `title` names it ("Chapter III").
      const title = p.chapters.title?.(m[1], n) ?? ((m[2] ?? "").trim() || para);
      chapters.push({ numeral: m[1], n, title: title.replace(/\.$/, "").replace(/\s*—\s*/g, ": "), paras: [], closed: false });
    } else if (chapters.length) {
      const c = chapters[chapters.length - 1];
      if (dropFrom?.test(para)) c.closed = true;
      if (!c.closed) c.paras.push(para);
    } else throw new Error(`${label}: words before the first chapter heading: "${para.slice(0, 60)}"`);
  }
  if (p.chapters.expect && chapters.length !== p.chapters.expect) {
    throw new Error(`${label}: ${chapters.length} chapters, the spec expects ${p.chapters.expect}`);
  }
  chapters.forEach((c, i) => {
    if (c.n !== (p.chapters.first ?? 1) + i) throw new Error(`${label}: chapter ${c.numeral} out of its place (${i + 1})`);
    if (!c.paras.length) throw new Error(`${label}: chapter ${c.numeral} has no words`);
  });
  return chapters;
}

/**
 * The page's words where CCEL's differ and the scans agree: [ccel, page]
 * pairs, each applied once, in the first paragraph that holds it. A pair that
 * matches nothing stops the run, so a fix cannot outlive the slip it mends.
 */
function applyFixes(paras, fixes = [], label) {
  const out = paras.slice();
  for (const [from, to] of fixes) {
    const i = out.findIndex((p) => p.includes(from));
    if (i < 0) throw new Error(`${label}: fix "${from}" matched nothing`);
    out[i] = out[i].replace(from, to);
  }
  return out;
}

/* ---------- Scripture, from the app's own Bible ---------- */

function scripture(p, label) {
  const file = path.join(ROOT, "data", "bible", p.book, `${p.chapter}.json`);
  const chapter = JSON.parse(fs.readFileSync(file, "utf8"));
  const verses = chapter.verses.filter((v) => v.n >= p.from && v.n <= (p.to ?? p.from));
  const want = (p.to ?? p.from) - p.from + 1;
  if (verses.length !== want) throw new Error(`${label}: ${p.book} ${p.chapter}:${p.from}-${p.to ?? p.from} has ${verses.length} of ${want} verses`);
  // One paragraph, the verses run together as the Bible reads them.
  return [verses.map((v) => v.text).join(" ")];
}

/* ---------- Word for word against the scans ---------- */

const norm = (w) =>
  w
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[œ]/g, "oe")
    .replace(/[’‘]/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9']/g, "")
    .replace(/^'+|'+$/g, "");

// A dash parts two words ("lastly—in"); a hyphen joins two halves of one
// ("fifty-five" and the scan's "fiftyfive" are one word).
const wordsOf = (s) => s.replace(/[—–]/g, " ").replace(/-/g, "").split(/\s+/).map(norm).filter(Boolean);

/** Rejoin the scan's end-of-line hyphenation ("pres- byters") before reading it. */
function scanWords(text) {
  return wordsOf(text.replace(/(\w)-\s*\n\s*(\w)/g, "$1$2").replace(/\s+/g, " "));
}

/** How many of a paragraph's first words stand, in order, in the scan from `start`. */
function inOrder(scan, words, start) {
  const want = words.slice(0, 60);
  let j = start;
  let hits = 0;
  const end = Math.min(scan.length, start + want.length * 3 + 80);
  for (const w of want) {
    for (let t = j; t < end && t < j + 40; t++) {
      if (scan[t] === w) {
        hits++;
        j = t + 1;
        break;
      }
    }
  }
  return hits;
}

/**
 * Where a paragraph stands in the scan. Every place where a run of its
 * opening words stands exactly is a candidate (the Acts open many paragraphs
 * with "Again the governor said", so the first look-alike is not enough), and
 * the candidate where most of its first sixty words follow in order wins. A
 * run with one word misread is tried only when no exact run is found.
 */
const INDEX = new WeakMap();
/** Where each word stands in a scan, built once per scan. */
function wordIndex(scan) {
  let ix = INDEX.get(scan);
  if (!ix) {
    ix = new Map();
    scan.forEach((w, i) => {
      const at = ix.get(w);
      if (at) at.push(i);
      else ix.set(w, [i]);
    });
    INDEX.set(scan, ix);
  }
  return ix;
}

function locate(scan, words) {
  const N = 6;
  const probes = [];
  for (let k = 0; k + N <= Math.min(words.length, 48); k += 3) probes.push(k);
  if (!probes.length) probes.push(0);
  const ix = wordIndex(scan);
  for (const tolerance of [0, 1]) {
    const candidates = new Set();
    for (const k of probes) {
      const probe = words.slice(k, k + N);
      // A run can only stand where its first word does, or, with one word
      // misread, where its second does: the index gives those places, in
      // order, so the candidates are the ones a full pass would find.
      let starts;
      if (probe.length < 2) starts = scan.map((_, i) => i);
      else {
        const at = new Set(ix.get(probe[0]) ?? []);
        if (tolerance) for (const i of ix.get(probe[1]) ?? []) if (i >= 1) at.add(i - 1);
        starts = [...at].sort((a, b) => a - b);
      }
      for (const i of starts) {
        if (i + probe.length > scan.length) continue;
        let miss = 0;
        for (let j = 0; j < probe.length && miss <= tolerance; j++) if (scan[i + j] !== probe[j]) miss++;
        if (miss <= tolerance) candidates.add(Math.max(0, i - k));
      }
    }
    if (!candidates.size) continue;
    let best = -1;
    let bestScore = -1;
    for (const c of candidates) {
      const s = inOrder(scan, words, c);
      if (s > bestScore) {
        best = c;
        bestScore = s;
      }
    }
    return best;
  }
  return -1;
}

/**
 * Word-level LCS of a paragraph against a window of the scan: our words with
 * no partner there, each with what the page has where it should stand (the
 * scan's words after the last word both share). The window is wide because a
 * printed page sets its footnotes, running heads and page numbers between a
 * paragraph's lines; the LCS steps over them.
 */
function unmatched(ours, theirs) {
  const n = ours.length;
  const m = theirs.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ours[i] === theirs[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lost = [];
  let i = 0;
  let j = 0;
  let lastShared = -1;
  while (i < n && j < m) {
    if (ours[i] === theirs[j]) {
      lastShared = j;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lost.push({ at: i, ours: ours[i], page: theirs.slice(lastShared + 1, lastShared + 3).join(" ") });
      i++;
    } else j++;
  }
  for (; i < n; i++) lost.push({ at: i, ours: ours[i], page: "" });
  return lost;
}

/**
 * Compare each paragraph with every scan. A word is in doubt when no scan has
 * it at its place; a doubt is reported as a likely difference when two scans
 * agree on another word there (OCR rarely makes one mistake twice), and as
 * noise otherwise. Returns { located, doubts, differences }.
 */
function compareWithScans(paras, scans) {
  const report = { located: 0, words: 0, differences: [], doubts: [] };
  for (const para of paras) {
    const ours = wordsOf(para);
    report.words += ours.length;
    const per = [];
    for (const scan of scans) {
      const at = locate(scan, ours);
      if (at < 0) continue;
      // The editors' footnotes can run to a thousand words between two lines
      // of a paragraph (Eusebius's are the longest), so a paragraph that does
      // not line up in the near window is tried again in a far one.
      let lost = unmatched(ours, scan.slice(at, at + ours.length * 3 + 400));
      if (lost.length > ours.length * 0.1) {
        const far = unmatched(ours, scan.slice(at, at + ours.length * 3 + 4000));
        if (far.length < lost.length) lost = far;
      }
      per.push(new Map(lost.map((u) => [u.at, u.page])));
    }
    if (!per.length) {
      report.doubts.push({ para: para.slice(0, 80), note: "not found in any scan" });
      continue;
    }
    report.located++;
    for (let i = 0; i < ours.length; i++) {
      const misses = per.filter((m) => m.has(i));
      if (misses.length < per.length) continue; // some scan has our word here
      const readings = misses.map((m) => m.get(i));
      const context = ours.slice(Math.max(0, i - 3), i + 4).join(" ");
      const agreed = readings.length > 1 && readings.every((r) => r && r === readings[0]);
      (agreed ? report.differences : report.doubts).push({ ours: ours[i], page: readings.join(" / "), context });
    }
  }
  return report;
}

/**
 * A passage's words against every scan of its printing. A flagged word is
 * settled one of two ways, both read off the page image: a `fix` (CCEL's
 * slip, the page's word put in) or an `ocr` entry (the page has our word; the
 * scans misread it). Anything else stays open, and nothing is written while a
 * word is open.
 */
async function checkAgainstScans(paras, p, label) {
  const scans = [];
  const read = [];
  for (const id of p.scans) {
    try {
      scans.push(scanWords(await scanText(id)));
      read.push(id);
    } catch (err) {
      console.warn(`${label}: scan ${id} could not be read (${err.message}); compared with the others`);
    }
  }
  if (!scans.length) throw new Error(`${label}: no scan of ${p.vol} could be read, so nothing was compared`);
  const result = compareWithScans(paras, scans);
  // An `ocr` entry is a word, settled wherever it is flagged, or, in a long
  // book where a common word may be flagged for different reasons, a pair
  // [word, the words around it] settled only there.
  const ocrWords = new Set();
  const ocrAt = [];
  for (const o of p.ocr ?? []) {
    if (Array.isArray(o)) ocrAt.push([norm(o[0]), wordsOf(o[1]).join(" ")]);
    else ocrWords.add(norm(o));
  }
  const settled = (d) => ocrWords.has(d.ours) || ocrAt.some(([w, at]) => w === d.ours && d.context.includes(at));
  const checked = result.differences.filter(settled);
  const open = result.differences.filter((d) => !settled(d));
  return { label, scansRead: read, fixes: p.fix ?? [], ...result, checked, open };
}

/* ---------- One Life ---------- */

async function buildLife(spec) {
  const sections = [];
  const checks = [];
  for (const [k, p] of spec.passages.entries()) {
    const label = `${spec.slug} §${k + 1}`;
    if (p.chapters) {
      // A whole work: one section for each of the edition's chapters, in the
      // author's own voice, each cited to its chapter.
      const chapters = cutWork(await sourceText(p.vol), p, label);
      // Each fix once, in the first paragraph of the work that holds it.
      for (const [from, to] of p.fix ?? []) {
        const c = chapters.find((ch) => ch.paras.some((x) => x.includes(from)));
        if (!c) throw new Error(`${label}: fix "${from}" matched nothing`);
        const i = c.paras.findIndex((x) => x.includes(from));
        c.paras[i] = c.paras[i].replace(from, to);
      }
      const all = chapters.flatMap((c) => c.paras);
      for (const para of all) {
        if (/\[\d+\]|\{\{|\}\}|<[a-z/]|file:\/\//i.test(para)) throw new Error(`${label}: markup left in "${para.slice(0, 60)}"`);
        if (para.includes("�")) throw new Error(`${label}: a replacement character in "${para.slice(0, 60)}"`);
      }
      if (p.scans?.length) checks.push(await checkAgainstScans(all, p, label));
      for (const c of chapters) {
        sections.push({
          n: sections.length + 1,
          title: c.title,
          voice: p.voice ?? "saint",
          ...(p.author ? { voiceAuthor: p.author } : {}),
          citation: p.chapters.cite(c.n),
          paragraphs: c.paras,
        });
      }
      continue;
    }
    let paras;
    if (p.kind === "scripture") paras = scripture(p, label);
    else if (p.kind === "transcribed") paras = p.text.slice();
    else paras = cutPassage(await sourceText(p.vol), p, label);
    paras = applyFixes(paras, p.fix, label);

    if (p.expect && paras.length !== p.expect) {
      throw new Error(`${label}: ${paras.length} paragraphs, the spec expects ${p.expect}`);
    }
    for (const para of paras) {
      if (/\[\d+\]|\{\{|\}\}|<[a-z/]|file:\/\//i.test(para)) throw new Error(`${label}: markup left in "${para.slice(0, 60)}"`);
      if (para.includes("�")) throw new Error(`${label}: a replacement character in "${para.slice(0, 60)}"`);
    }
    const minWords = p.minWords ?? 20;
    const total = paras.join(" ").split(/\s+/).length;
    if (total < minWords) throw new Error(`${label}: only ${total} words`);

    if (p.scans?.length) checks.push(await checkAgainstScans(paras, p, label));
    sections.push({
      n: k + 1,
      title: p.title,
      // A witness's words name the witness; a saint's own words (a work's
      // passage, `voice: "saint"`) and Scripture need no name.
      voice: p.voice ?? (p.kind === "scripture" ? "scripture" : "witness"),
      ...((p.voice ?? (p.kind === "scripture" ? "scripture" : "witness")) === "witness" ? { voiceAuthor: p.author } : {}),
      citation: p.citation,
      paragraphs: paras,
    });
  }
  const doc = {
    saint: spec.saint,
    slug: spec.slug,
    title: spec.title,
    ...(spec.subtitle ? { subtitle: spec.subtitle } : {}),
    source: spec.source,
    ...(spec.originalLanguage ? { originalLanguage: spec.originalLanguage } : {}),
    sections,
  };
  return { doc, checks };
}

/* ---------- Main ---------- */

async function main() {
  const [month, ...rest] = process.argv.slice(2);
  if (!month) {
    console.error("usage: node scripts/ingest-witness-lives.mjs <month> [--works] [--only <slug>] [--check]");
    process.exit(2);
  }
  const only = rest.includes("--only") ? rest[rest.indexOf("--only") + 1] : null;
  const checkOnly = rest.includes("--check");
  // --works reads the month's works (scripts/menologion/<month>-works.mjs,
  // WORKS) instead of its Lives; the same checks, its own review file.
  const kind = rest.includes("--works") ? "works" : "lives";
  const specFile = path.join(ROOT, "scripts", "menologion", `${month}-${kind}.mjs`);
  const mod = await import(specFile);
  const todo = (kind === "works" ? mod.WORKS : mod.LIVES).filter((s) => !only || s.saint === only || s.slug === only);
  if (!todo.length) throw new Error(`no Life in ${specFile} matches ${only}`);

  const built = [];
  let open = 0;
  for (const spec of todo) {
    const { doc, checks } = await buildLife(spec);
    built.push({ doc, checks });
    for (const c of checks) {
      open += c.open.length;
      console.log(`${c.label}: ${c.words} words, ${c.located} paragraphs found in the scans`);
      for (const d of c.open) console.log(`  DIFFERS  ours "${d.ours}"  page "${d.page}"  …${d.context}…`);
      if (process.env.SHOW_DOUBTS) for (const d of c.doubts) console.log(`  doubt    ours "${d.ours ?? ""}"  page "${d.page ?? ""}"  …${d.context ?? d.para}… ${d.note ?? ""}`);
      else if (c.doubts.length) console.log(`  ${c.doubts.length} single-scan doubts (SHOW_DOUBTS=1 lists them; the review file keeps them)`);
    }
  }
  if (open) {
    console.log(`\n${open} words differ from the printed page and are not settled. Read each on the page image, then add a \`fix\` pair (the page's word) or an \`ocr\` entry (the scans misread it). Nothing was written.`);
    process.exit(1);
  }
  if (checkOnly) return;
  for (const { doc } of built) {
    const out = path.join(ROOT, "data", "saints", doc.saint, `${doc.slug}.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
    console.log(`wrote ${path.relative(ROOT, out)} (${doc.sections.length} sections)`);
  }
  if (!only) writeReview(month, built, kind);
}

/**
 * The review file docs/editorial-standards.md asks every ingest to leave
 * (docs/editorial/ingest-review/): for each passage, how much was compared,
 * what was mended from the page, what the scans misread, and every doubt a
 * single scan could not settle. No timestamp, so a changed file is changed
 * evidence.
 */
function writeReview(month, built, kind = "lives") {
  const Month = `${month[0].toUpperCase()}${month.slice(1)}`;
  const lines = [
    kind === "works" ? `# ${Month}'s works: ingest review` : `# ${Month}'s Lives in the witnesses' words: ingest review`,
    "",
    `Generated by \`node scripts/ingest-witness-lives.mjs ${month}${kind === "works" ? " --works" : ""}\` from \`scripts/menologion/${month}-${kind}.mjs\`. Do not hand-edit.`,
    "",
    "Each passage was cut from CCEL's transcription of the printed volume and compared word for word with archive.org's text of scans of that printing. A word the scans read differently was read on the page image and settled: a **fix** puts the page's word in place of CCEL's; a **misreading** is a word the page has as we have it, which the scans' OCR misread. A **doubt** is a word one scan alone could not confirm; most are the OCR's letters, listed here so a person can check any of them.",
    "",
  ];
  for (const { doc, checks } of built) {
    lines.push(`## ${doc.title} (\`data/saints/${doc.saint}/${doc.slug}.json\`)`, "");
    if (!checks.length) {
      lines.push("Scripture from the app's own Bible, word for word; no scan to compare.", "");
      continue;
    }
    for (const c of checks) {
      lines.push(`- **${c.label}**: ${c.words} words, ${c.located} paragraphs found in ${c.scansRead.join(" and ")}.`);
      for (const [from, to] of c.fixes) lines.push(`  - fix: "${from}" is "${to}" on the page`);
      for (const d of c.checked) lines.push(`  - misreading: "${d.ours}" (the scans read "${d.page}")`);
      for (const d of c.doubts) lines.push(`  - doubt: "${d.ours ?? ""}" (scan: "${d.page ?? ""}") …${d.context ?? d.para}… ${d.note ?? ""}`.trimEnd());
    }
    lines.push("");
  }
  const file = path.join(ROOT, "docs", "editorial", "ingest-review", `${month}-${kind}.md`);
  fs.writeFileSync(file, lines.join("\n"));
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
