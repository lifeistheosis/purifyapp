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
// 1. data/saints/<saintSlug>/<workSlug>.json , the full work (sections)
// 2. data/bible/commentary/<bookSlug>/<ch>.json, per-verse commentary,
// merged with any other Fathers already present (only this author+work's
// prior notes are replaced).
//
// No text is fabricated: every note is the cleaned source paragraph(s) keyed
// to the verse the homily itself marks with "Ver. N.".

import fs from "node:fs/promises";
import path from "node:path";

import { createAlignmentReport, createLemmaVerifier } from "./lemma-verify.mjs";

const ROOT = process.cwd();

// NPNF does not always say "Homily". Augustine's series are "Tractate" and
// "Sermon", and several works divide into "Book". The typography is otherwise
// identical, so the word is a parameter rather than a reason to write a bespoke
// getRegion per volume.
const DEFAULT_HEAD_WORD = "Homily";

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The "   Homily I." line that opens a series, for any head word. */
function firstHeadRe(word) {
  return new RegExp(`^ {3}${escapeRe(word)} I\\.\\s*$`, "gm");
}

/**
 * A section-header regex capturing the roman numeral, for any head word. Pass
 * the result as `headerRe` when a volume calls its sections something other
 * than Homily.
 */
export function sectionHeaderRe(word = DEFAULT_HEAD_WORD) {
  return new RegExp(`^ {3}${escapeRe(word)} ([IVXLCDM]+)\\.(?:\\s*\\[\\d+\\])?\\s*$`, "gm");
}

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

// Slice one book's homily region out of a multi-book NPNF volume (e.g. Vol 12
// holds 1 & 2 Corinthians; Vol 13 holds Galatians..Philemon). Finds the first
// " Homily I." whose following lemma matches `lemmaTokenRe`, and ends at the
// next book's section header (`endRe`) so the last homily isn't polluted by the
// following book's title/argument. With no `endRe`, runs to end of text.
export function regionByLemma(text, lemmaTokenRe, endRe = null, word = DEFAULT_HEAD_WORD) {
 const heads = [...text.matchAll(firstHeadRe(word))].map((m) => m.index);
 let start = -1;
 for (const idx of heads) {
 if (lemmaTokenRe.test(text.slice(idx, idx + 220))) {
 start = idx;
 break;
 }
 }
 if (start < 0) {
 throw new Error(`regionByLemma: no "${word} I." with lemma ${lemmaTokenRe}`);
 }
 let end = text.length;
 if (endRe) {
 const sub = text.slice(start + 50);
 const r = endRe.exec(sub);
 if (r) end = start + 50 + r.index;
 }
 return text.slice(start, end);
}

// Slice the Nth series out of a volume by the bare " Homily I." headers (every
// book in a volume restarts at Homily I). `index` is 0-based over those headers
// in document order; the region runs to the next book's Homily I, or to
// `endMarkerRe` (default the trailing Indexes) for the last.
//
// `word` overrides the head word for volumes that number "Sermon I.",
// "Tractate I." or "Book I." instead. The function keeps its original name
// because ten scripts import it.
export function regionBetweenHomilyI(text, index, endMarkerRe = /Indexes/, word = DEFAULT_HEAD_WORD) {
 const h1 = [...text.matchAll(firstHeadRe(word))].map((m) => m.index);
 const start = h1[index];
 if (start == null) throw new Error(`regionBetweenHomilyI: no ${word} I #${index}`);
 let end;
 if (index + 1 < h1.length) {
 end = h1[index + 1];
 } else {
 const m = endMarkerRe.exec(text.slice(start + 50));
 end = m ? start + 50 + m.index : text.length;
 }
 return text.slice(start, end);
}

// ---- Cleaning helpers (ported from the John ingester) --------------------

// Title-block boilerplate that can leak into the final homily of a book when
// the next book's title sits just before its Homily I. These exact phrases
// never occur as homily prose, so dropping them is safe.
const TITLE_BOILERPLATE =
 /^(homilies of st\.? john chrysostom,?|archbishop of constantinople,?|on the|to the|epistle of st\.? paul the apostle[,.]?)$/i;

export function cleanInline(s) {
 return s
 .replace(/\[\d+\.\]/g, "") // paragraph-number bullets [1.]
 .replace(/\[\d+\]/g, "") // inline footnote refs [74]
 .replace(/[ \t]+/g, " ") // collapse whitespace
 .replace(/\s*, \s*/g, ", ") // site policy: no em dashes in visible text
 .replace(/\s+([,.;:!?])/g, "$1") // tidy spaced punctuation
 .replace(/,\s*,/g, ",") // collapse accidental double commas
 .trim();
}

export function toParagraphs(raw) {
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
 return paras
 .map(cleanInline)
 .filter((p) => p.length > 1 && !TITLE_BOILERPLATE.test(p));
}

// ---- Parsing -------------------------------------------------------------

// Bare homily header, tolerant of a trailing footnote marker like " [1097]"
// (some volumes attach one to the header line, e.g. Acts Homily XLIX).
const DEFAULT_HEADER_RE = sectionHeaderRe();

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
 // Number from the roman numeral, not the loop index, so a volume with a
 // missing/merged section header in the source (e.g. NPNF1-10 Matthew lacks
 // standalone headers for Homilies 53, 54, 58, 79) keeps every later homily's
 // true number — otherwise the count would silently shift and mislabel
 // citations. For gapless volumes (John, Romans, ...) this equals i + 1.
 const num = romanToInt(h.roman);
 homilies.push({
 n: Number.isFinite(num) && num > 0 ? num : i + 1,
 roman: h.roman,
 block: region.slice(bodyStart, bodyEnd),
 });
 }
 return homilies;
}

// Pull the lemma line (e.g. "Rom. i. 1", "Acts ii. 1, 2", "Heb. i. 1, 2")
// from the head of a homily block. `lemmaRe` captures (chapterToken,
// verseLabel); it may also be an ARRAY of such regexes (some books mix lemma
// forms, e.g. Ephesians uses both "Chapter I. Verses 1-2" and "Ephesians iv.
// 4"). Returns { chapter, startVerse, verseLabel, rest }.
function extractLemma(block, lemmaRe) {
 const res = Array.isArray(lemmaRe) ? lemmaRe : [lemmaRe];
 const lines = block.split("\n");
 for (let i = 0; i < Math.min(lines.length, 8); i++) {
 const t = lines[i].trim();
 if (t === "") continue;
 let lm = null;
 for (const re of res) {
 lm = t.match(re);
 if (lm) break;
 }
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

// A paragraph-leading verse marker. Parenthetical "( Ver. N.)" citations do not
// match, which is the point: only a marker that opens a paragraph is an anchor.
const VER_MARKER = /^Ver\.\s*(\d+)\.?\s*/;

// Split a homily's paragraphs into verse-keyed chunks using paragraph-leading
// "Ver. N." markers (parenthetical "( Ver. N.)" citations are ignored).
export function splitByVerse(paragraphs, startVerse) {
 const out = new Map();
 let cur = startVerse;
 for (const p of paragraphs) {
 const vm = p.match(VER_MARKER);
 if (vm) cur = parseInt(vm[1], 10);
 if (cur == null) continue;
 if (!out.has(cur)) out.set(cur, []);
 out.get(cur).push(p);
 }
 return out;
}

// The same split, with every "Ver. N." marker verified against the Scripture we
// already ship before it is allowed to move the anchor. This is the guarantee
// the Catena ingest is built on, applied to the NPNF path: a marker is not
// trusted because of its shape, it is trusted because the words after it really
// are that verse.
//
// A marker that does not verify does NOT become an anchor. Its paragraph stays
// with the verse already in hand, so no text is dropped and only the position
// stays conservative. A marker that verifies against the next chapter carries
// the split there, which is how a homily that runs past a chapter boundary
// without saying so is caught.
//
// Returns chapter -> (verse -> paragraphs[]), because a verified marker can
// land in a chapter the lemma did not name.
function splitByVerseVerified(paragraphs, startVerse, chapter, verifier, report) {
 const out = new Map();
 let curChapter = chapter;
 let cur = startVerse;
 for (const p of paragraphs) {
 const vm = p.match(VER_MARKER);
 if (vm) {
 const n = parseInt(vm[1], 10);
 const quoted = p.slice(vm[0].length);
 const check = verifier.verifyAnchor(quoted, n, curChapter);
 if (check.ok) {
 report.pass();
 curChapter = check.chapter;
 cur = n;
 } else {
 report.fail({ chapter: curChapter, n, hit: check.score.toFixed(2), quoted: quoted.slice(0, 72) });
 }
 }
 if (cur == null) continue;
 if (!out.has(curChapter)) out.set(curChapter, new Map());
 const byVerse = out.get(curChapter);
 if (!byVerse.has(cur)) byVerse.set(cur, []);
 byVerse.get(cur).push(p);
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
 // "per-verse" (default): split each homily by "Ver. N." markers.
 // "none": write only the readable work JSON, no commentary file, for
 // volumes without Ver. markers (Matthew, Acts) where per-verse keying
 // would dump a whole homily onto one verse.
 commentaryMode = "per-verse",
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
 // Verify every "Ver. N." marker, and each homily's own lemma, against the
 // Scripture in data/bible/<bookSlug>/ before trusting it as an anchor.
 // OFF by default: sixteen scripts predate it and their committed output must
 // not move. Turn it on per volume, deliberately, and read the review file.
 verify = false,
 // Declared moves for anchors our own Scripture arrangement puts elsewhere,
 // as { "fromChapter:fromVerse": "toChapter:toVerse" }. This is for textual
 // arrangement, not for matcher trouble: Schaff follows manuscripts that place
 // Romans 16:25-27 at the end of chapter 14, and a note left there sits past
 // the end of a 23-verse chapter where no reader can reach it. Every entry
 // needs a comment at the call site saying which arrangement it reconciles.
 verseRemap = null,
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

 // Built only when asked for, so a volume that does not verify pays nothing
 // and reads no Scripture off disk.
 const verifier = verify ? createLemmaVerifier(bookSlug) : null;
 const report = verify
 ? createAlignmentReport({
 label: `${workTitle}: verse-marker alignment`,
 command: `node ${path.relative(ROOT, process.argv[1] ?? "").replace(/\\/g, "/")}`,
 source,
 })
 : null;

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

 // The homily's own lemma. Nothing can be folded here, so a failure is
 // recorded for review rather than acted on: it means the printed reference
 // and our arrangement of the text disagree, which is a decision for a
 // person and usually ends in a verseRemap entry.
 if (verifier) {
 const opening = paragraphs[0] ?? "";
 const check = verifier.verifyAnchor(opening, startVerse, chapter);
 if (!check.ok || check.chapter !== chapter) {
 report.flag({
 where: `${bookName} ${chapter}:${startVerse}`,
 detail: check.ok
 ? `verified against chapter ${check.chapter}, not the ${chapter} its lemma prints`
 : `no verse matched (best score ${check.score.toFixed(2)})`,
 homily: hom.n,
 quoted: opening.slice(0, 90),
 });
 }
 }

 const chunks = verifier
 ? splitByVerseVerified(paragraphs, startVerse, chapter, verifier, report)
 : new Map([[chapter, splitByVerse(paragraphs, startVerse)]]);

 for (const [ch, byVerse] of chunks) {
 if (!commentaryByChapter.has(ch)) commentaryByChapter.set(ch, new Map());
 const chMap = commentaryByChapter.get(ch);
 for (const [verse, paras] of byVerse) {
 if (!chMap.has(verse)) chMap.set(verse, []);
 chMap.get(verse).push({ n: hom.n, text: paras.join("\n\n") });
 }
 }
 }

 // Declared arrangement moves, before anything is written or bounds-checked.
 const moved = [];
 for (const [from, to] of Object.entries(verseRemap ?? {})) {
 const [fromCh, fromV] = from.split(":").map(Number);
 const [toCh, toV] = to.split(":").map(Number);
 if (![fromCh, fromV, toCh, toV].every(Number.isFinite)) {
 throw new Error(`verseRemap: "${from}" -> "${to}" is not chapter:verse.`);
 }
 const src = commentaryByChapter.get(fromCh);
 const entries = src?.get(fromV);
 if (!entries) continue; // nothing landed there this run; a stale entry is not fatal
 src.delete(fromV);
 if (!commentaryByChapter.has(toCh)) commentaryByChapter.set(toCh, new Map());
 const dst = commentaryByChapter.get(toCh);
 if (!dst.has(toV)) dst.set(toV, []);
 dst.get(toV).push(...entries);
 moved.push(`${bookName} ${from} -> ${to} (${entries.length} note${entries.length === 1 ? "" : "s"})`);
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

 // ---- Alignment stats, and the review file docs/editorial-standards.md wants ----
 let reviewPath = null;
 if (report) {
 report.print({ explain: process.argv.includes("--explain") });
 reviewPath = report.writeReview(`${saintSlug}-${workSlug}`);
 if (report.belowFloor()) {
 throw new Error(
 `${bookName}: only ${(report.rate() * 100).toFixed(1)}% of "Ver. N." markers verify ` +
 `against data/bible/${bookSlug}/. That is a broken matcher, not messy data. See ${reviewPath}.`,
 );
 }
 }
 for (const m of moved) process.stdout.write(` moved by verseRemap: ${m}\n`);

 // ---- Write/merge commentary (skipped in "none" mode) ----
 let chaptersWritten = 0;
 let totalNotes = 0;

 if (commentaryMode === "none") {
 process.stdout.write(
 `\n${bookName}: ${homilies.length} homilies (work only, no commentary)\n` +
 ` work: ${path.relative(ROOT, workOut)} (${sections.length} sections)\n` +
 (reviewPath ? ` review: ${reviewPath}\n` : ""),
 );
 return { homilies: homilies.length, chaptersWritten: 0, totalNotes: 0 };
 }

 const commentaryDir = path.join(ROOT, "data", "bible", "commentary", bookSlug);
 await fs.mkdir(commentaryDir, { recursive: true });

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
 // A note anchored past the end of its chapter is unreachable: no reader can
 // open a verse our own text does not have. This used to warn, and a warning
 // is something you scroll past, which is how Romans 14:25 shipped dark. It
 // throws now, matching the Catena ingest. Fix the anchor or declare the
 // arrangement in verseRemap; never widen verseCounts to silence it.
 if (verseCounts && verseCounts[chapter] && verse > verseCounts[chapter]) {
 throw new Error(
 `${bookName} ${chapter}:${verse}: note anchored past the end of a ` +
 `${verseCounts[chapter]}-verse chapter, where nothing can reach it. ` +
 `Correct the anchor, or add a verseRemap entry naming the arrangement it reconciles.`,
 );
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
 ` work: ${path.relative(ROOT, workOut)} (${sections.length} sections)\n` +
 ` commentary: ${chaptersWritten} chapters, ${totalNotes} ${author} verse-notes\n`,
 );
 if (reviewPath) process.stdout.write(` review: ${reviewPath}\n`);
 return { homilies: homilies.length, chaptersWritten, totalNotes };
}
