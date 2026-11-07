// The map from the King James Version's Old Testament numbering to the app's
// (Brenton's Septuagint), verse by verse (1.9, item 22 of docs/1.9-build/PLAN.md;
// the owner's pick of 2026-11-06 for the cross-references: "A, the Old
// Testament in the Septuagint").
//
//   node scripts/bibles/verse-map.mjs --kjv <eng-kjv usfm folder>
//
// Writes data/bible/kjv-to-lxx.json: for each Old Testament book, the KJV
// verses that stand elsewhere in the app ("moved": "31:31" -> "38:31") and the
// ones the app's Septuagint does not have ("missing"). Every other KJV verse
// is at the same number. The cross-references (OpenBible.info, numbered as
// the KJV is) are placed in the app's Old Testament through it
// (scripts/ingest-cross-refs.mjs, lib/bible/verseMap.ts).
//
// Made from the words, not from a table: the two English texts are aligned
// book by book, each pair of verses scored by the rarer words they share
// (word stems, weighted by how rare each is in the book):
//
//  1. blocks the Septuagint sets elsewhere (Jeremiah 25 to 51, the Kingdoms'
//     chapters 20 and 21, Leviticus 6 and 7) are found first: runs of three or
//     more KJV verses whose best matches are consecutive verses away from
//     where they are expected, never in a place a verse already holds surely
//     (Exodus 38 tells of the altar made in Exodus 27's words);
//  2. the rest in order, over the whole book, where Brenton may join two KJV
//     verses in one (Genesis 3:1 holds the KJV's 2:25 and 3:1), split one in
//     two, or lack a verse the KJV has;
//  3. a single verse still unplaced takes an unmistakable match close by (the
//     commandments of Exodus 20, which the Septuagint orders otherwise);
//  4. a verse placed away from where it is expected is kept only when it is
//     sure: an unmistakable likeness both ways, or a run of neighbours moved
//     the same way. Where every verse speaks of blue, purple and fine linen
//     (the tabernacle's making, Exodus 36 to 39, told in another order in the
//     Septuagint), a verse is left unplaced: it then has fewer links, never a
//     wrong one.
//
// lib/bible/__tests__/verseMap.test.ts holds thirty well-known places to it
// (Jeremiah 31:31 is 38:31, Psalm 23 is 22, Daniel 3:24 is 3:91).
//
// Source of the KJV: eBible.org, eng-kjv (the 1769 text, public domain),
// https://ebible.org/Scriptures/eng-kjv_usfm.zip
// (sha256 121790462a6093a4a02c1f829a8dd755d6c7e2b0c012b22c6f728db0a482cada).
// The words are only compared here; no KJV text is written.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT = path.join(ROOT, "data/bible/kjv-to-lxx.json");
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith("--") ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []));
if (!args.kjv) {
  console.error("usage: node scripts/bibles/verse-map.mjs --kjv <eng-kjv usfm folder>");
  process.exit(1);
}
const KJV_DIR = args.kjv;

// ---- The two texts ----------------------------------------------------------

const KJV_CODE = {
  GEN: "genesis", EXO: "exodus", LEV: "leviticus", NUM: "numbers", DEU: "deuteronomy", JOS: "joshua", JDG: "judges",
  RUT: "ruth", "1SA": "1-samuel", "2SA": "2-samuel", "1KI": "1-kings", "2KI": "2-kings", "1CH": "1-chronicles",
  "2CH": "2-chronicles", EZR: "ezra", NEH: "nehemiah", EST: "esther", JOB: "job", PSA: "psalms", PRO: "proverbs",
  ECC: "ecclesiastes", SNG: "song-of-solomon", ISA: "isaiah", JER: "jeremiah", LAM: "lamentations", EZK: "ezekiel",
  DAN: "daniel", HOS: "hosea", JOL: "joel", AMO: "amos", OBA: "obadiah", JON: "jonah", MIC: "micah", NAM: "nahum",
  HAB: "habakkuk", ZEP: "zephaniah", HAG: "haggai", ZEC: "zechariah", MAL: "malachi",
};

function loadKjv() {
  const out = {};
  for (const name of fs.readdirSync(KJV_DIR)) {
    const code = /^\d+-([0-9A-Z]{3})/.exec(name)?.[1];
    const slug = KJV_CODE[code];
    if (!slug) continue;
    let text = fs.readFileSync(path.join(KJV_DIR, name), "utf8");
    text = text
      .replace(/\\(f|x)\s[\s\S]*?\\\1\*/g, "")
      .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*)?\\\+?w\*/g, "$1")
      .replace(/\\\+?[a-z]+\d?\*?/g, (m) => (/^\\(c|v|d|s\d?|p|q\d?|m|b|nb|pi|li\d?|mt\d?|h|id|toc\d)$/.test(m) ? m : ""));
    const verses = [];
    let c = 0;
    let cur = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      const cm = /^\\c\s+(\d+)/.exec(line);
      if (cm) { c = Number(cm[1]); cur = null; continue; }
      const vm = /^\\v\s+(\d+)\s*(.*)$/.exec(line);
      if (vm) { cur = { c, v: Number(vm[1]), text: vm[2] }; verses.push(cur); continue; }
      if (/^\\(d|s\d?|mt\d?|h|id|toc\d)\b/.test(line)) { continue; }
      const pm = /^\\(p|q\d?|m|b|nb|pi|li\d?)\s*(.*)$/.exec(line);
      if (pm) { if (cur && pm[2]) cur.text += " " + pm[2]; continue; }
      if (cur && line && !line.startsWith("\\")) cur.text += " " + line;
    }
    for (const v of verses) v.text = v.text.replace(/\s+/g, " ").trim();
    out[slug] = verses;
  }
  return out;
}

function loadBrenton() {
  const books = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/books.json"), "utf8"));
  const out = {};
  for (const b of books) {
    if (b.testament !== "OT" || b.source !== "brenton-lxx-pd") continue;
    const verses = [];
    for (let c = 1; c <= b.chapters; c++) {
      const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible", b.slug, `${c}.json`), "utf8"));
      for (const v of d.verses) verses.push({ c, v: v.n, text: v.text });
    }
    out[b.slug] = verses;
  }
  return out;
}

// ---- Likeness ------------------------------------------------------------------

const STOP = new Set(("a an and are as at be been but by came come did do even for from had hath has have he her him his how i if in into is it its let made make me my no not now o of on or our out over said saith say says shall she so than that the thee their them then there these they thine this those thou thus thy to unto up upon us was we were what when which who whom why will with ye yea you your also all any before after against again among because both each every here hither nor off once one only other same should such through till too under until very whither whose would art dost doth wilt shalt hast didst canst couldest mayest").split(" "));
function stems(text) {
  const out = [];
  for (const w of text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)) {
    if (w.length < 3 || STOP.has(w)) continue;
    out.push(w.slice(0, 4));
  }
  return [...new Set(out)];
}
function makeIdf(lists) {
  const df = new Map();
  for (const l of lists) for (const t of l) df.set(t, (df.get(t) ?? 0) + 1);
  const n = lists.length;
  const idf = new Map();
  for (const [t, d] of df) idf.set(t, Math.log((n + 1) / d));
  return idf;
}
function weight(list, idf) {
  let s = 0;
  for (const t of list) s += idf.get(t) ?? 0;
  return s;
}
/** Dice-like: twice the weight shared over the weight of both. 0..1 */
function sim(a, b, idf, wa = weight(a, idf), wb = weight(b, idf)) {
  if (!wa || !wb) return 0;
  const sb = new Set(b);
  let shared = 0;
  for (const t of a) if (sb.has(t)) shared += idf.get(t) ?? 0;
  return (2 * shared) / (wa + wb);
}

// ---- Alignment -----------------------------------------------------------------

const SURE = 0.3;
const MARGIN = 0.08;
const FILL = 0.12;
const BAND = 80;
const SKIP = 0.02;

function septuagintOf(h) {
  if (h <= 8 || (h >= 148 && h <= 150)) return [h];
  if (h === 9 || h === 10) return [9];
  if (h >= 11 && h <= 113) return [h - 1];
  if (h === 114 || h === 115) return [113];
  if (h === 116) return [114, 115];
  if (h >= 117 && h <= 146) return [h - 1];
  if (h === 147) return [146, 147];
  return [];
}

function alignBook(book, K, B) {
  const ks = K.map((x) => stems(x.text));
  const bs = B.map((x) => stems(x.text));
  const idf = makeIdf([...ks, ...bs]);
  const kw = ks.map((s) => weight(s, idf));
  const bw = bs.map((s) => weight(s, idf));
  const byRef = new Map(B.map((x, j) => [`${x.c}:${x.v}`, j]));
  const index = new Map();
  bs.forEach((s, j) => s.forEach((t) => (index.get(t) ?? index.set(t, []).get(t)).push(j)));
  const score = (i, j) => sim(ks[i], bs[j], idf, kw[i], bw[j]);
  const scoreJoin = (as, bsList) => {
    const a = [...new Set(as.flatMap((i) => ks[i]))];
    const b = [...new Set(bsList.flatMap((j) => bs[j]))];
    return sim(a, b, idf);
  };
  /** How much of a verse's weight the other side holds. */
  const within = (part, whole) => {
    const w = new Set(whole);
    const total = weight(part, idf);
    if (!total) return 0;
    let shared = 0;
    for (const t of part) if (w.has(t)) shared += idf.get(t) ?? 0;
    return shared / total;
  };
  const kn = K.map((x) => x.text.split(/\s+/).length);
  const bn = B.map((x) => x.text.split(/\s+/).length);
  /** Two KJV verses in one of Brenton's: as long as both together, and each found in it. */
  const join = (a, b, x) =>
    bn[x] >= 0.75 * (kn[a] + kn[b]) && within(ks[a], bs[x]) >= 0.35 && within(ks[b], bs[x]) >= 0.35 ? scoreJoin([a, b], [x]) : 0;
  /** One KJV verse in two of Brenton's: as long as both together, and each of them found in it. */
  const split = (a, x, y) =>
    kn[a] >= 0.75 * (bn[x] + bn[y]) && within(bs[x], ks[a]) >= 0.35 && within(bs[y], ks[a]) >= 0.35 ? scoreJoin([a], [x, y]) : 0;

  // Where each KJV verse is expected in Brenton: its own number, or its psalm's.
  const expect = K.map((k) => {
    const chapters = book === "psalms" ? septuagintOf(k.c) : [k.c];
    for (const c of chapters) {
      const j = byRef.get(`${c}:${k.v}`);
      if (j !== undefined) return j;
    }
    return -1;
  });
  // Where the band of the in-order pass is centred: the expected place, or for
  // a verse Brenton has no number for, the place of the verse before it. Only
  // a real expected place counts as "where it is expected".
  const near = expect.slice();
  for (let i = 0; i < K.length; i++) if (near[i] < 0) near[i] = i > 0 ? near[i - 1] : 0;

  // Each KJV verse's best match in the book.
  const best = K.map((_, i) => {
    const seen = new Set();
    for (const t of ks[i]) for (const j of index.get(t) ?? []) seen.add(j);
    let b = -1, bS = 0, second = 0;
    for (const j of seen) {
      const s = score(i, j);
      if (s > bS) { second = bS; bS = s; b = j; } else if (s > second) second = s;
    }
    return { j: b, s: bS, second };
  });

  const map = new Array(K.length).fill(null);
  const why = new Array(K.length).fill(null);
  const usedB = new Set();

  // 0. Verses found where they are expected, surely: no block may take their place
  //    (Exodus 38 tells of the altar made in Exodus 27's words, which it is not).
  const claimed = new Set();
  for (let i = 0; i < K.length; i++) {
    const j = byRef.get(book === "psalms" ? "" : `${K[i].c}:${K[i].v}`);
    if (j !== undefined && score(i, j) >= SURE && score(i, j) >= best[i].s - 0.1) claimed.add(j);
  }

  // 1. Blocks set elsewhere.
  const far = (i) =>
    best[i].j >= 0 && !claimed.has(best[i].j) && best[i].s >= SURE && best[i].s - best[i].second >= MARGIN && Math.abs(best[i].j - near[i]) > 3;
  for (let i = 0; i < K.length; ) {
    if (!far(i)) { i++; continue; }
    let e = i + 1;
    while (e < K.length && far(e) && best[e].j === best[e - 1].j + 1) e++;
    if (e - i >= 3) for (let x = i; x < e; x++) { map[x] = best[x].j; why[x] = "block"; usedB.add(best[x].j); }
    i = e;
  }

  // 2. The rest in order, joins and splits allowed, in a band around where each verse is expected.
  const KI = K.map((_, i) => i).filter((i) => map[i] === null);
  const BI = B.map((_, j) => j).filter((j) => !usedB.has(j));
  const nearestPos = (j) => {
    let lo = 0, hi = BI.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (BI[m] < j) lo = m + 1; else hi = m; }
    return lo;
  };
  const center = KI.map((i) => nearestPos(near[i]));
  const R = KI.length, C = BI.length;
  const NEG = -1e9;
  const dp = Array.from({ length: R + 1 }, () => new Float64Array(C + 1).fill(NEG));
  const from = Array.from({ length: R + 1 }, () => new Int8Array(C + 1));
  dp[0][0] = 0;
  const gain = (s) => (s >= FILL ? s : s - FILL);
  /** A pair away from where the KJV verse is expected must be surer than one at it. */
  const pairGain = (i, j) => {
    const s = score(i, j);
    return j === expect[i] ? gain(s) : s >= 0.25 ? s : s - 0.25;
  };
  const pairTaken = (i, j) => score(i, j) >= (j === expect[i] ? FILL : 0.25);
  for (let r = 0; r <= R; r++) {
    const lo = r === 0 ? 0 : Math.max(0, center[r - 1] - BAND);
    const hi = r === 0 ? C : Math.min(C, center[r - 1] + BAND + 1);
    for (let c = r === 0 ? 0 : lo; c <= hi; c++) {
      if (r === 0 && c === 0) continue;
      let v = NEG, f = 0;
      const consider = (val, tag) => { if (val > v) { v = val; f = tag; } };
      if (r > 0 && dp[r - 1][c] > NEG) consider(dp[r - 1][c] - SKIP, 1); // KJV verse without a partner
      if (c > 0 && dp[r][c - 1] > NEG) consider(dp[r][c - 1] - SKIP, 2); // Brenton verse without a partner
      if (r > 0 && c > 0 && dp[r - 1][c - 1] > NEG) consider(dp[r - 1][c - 1] + pairGain(KI[r - 1], BI[c - 1]), 3);
      if (r > 1 && c > 0 && dp[r - 2][c - 1] > NEG) {
        const s = join(KI[r - 2], KI[r - 1], BI[c - 1]);
        if (s >= SURE) consider(dp[r - 2][c - 1] + 2 * s - 0.1, 4); // two KJV in one
      }
      if (r > 0 && c > 1 && dp[r - 1][c - 2] > NEG) {
        const s = split(KI[r - 1], BI[c - 2], BI[c - 1]);
        if (s >= SURE) consider(dp[r - 1][c - 2] + 2 * s - 0.1, 5); // one KJV in two
      }
      dp[r][c] = v;
      from[r][c] = f;
    }
  }
  let r = R, c = C;
  while (r > 0 || c > 0) {
    const f = from[r][c];
    if (f === 1) r--;
    else if (f === 2) c--;
    else if (f === 3) {
      if (pairTaken(KI[r - 1], BI[c - 1])) { map[KI[r - 1]] = BI[c - 1]; why[KI[r - 1]] = "order"; }
      r--; c--;
    } else if (f === 4) {
      map[KI[r - 2]] = BI[c - 1]; map[KI[r - 1]] = BI[c - 1]; why[KI[r - 2]] = why[KI[r - 1]] = "joined";
      r -= 2; c--;
    } else if (f === 5) {
      map[KI[r - 1]] = BI[c - 2]; why[KI[r - 1]] = "split";
      r--; c -= 2;
    } else break;
  }

  // 3. Single verses still unplaced.
  const placedB = new Set(map.filter((j) => j !== null));
  for (let i = 0; i < K.length; i++) {
    if (map[i] !== null) continue;
    const b = best[i];
    if (b.j >= 0 && !placedB.has(b.j) && b.s >= 0.45 && b.s - b.second >= 0.15 && Math.abs(b.j - near[i]) <= 10) {
      map[i] = b.j; why[i] = "unmistakable"; placedB.add(b.j); continue;
    }
    const p = map[i - 1], n = map[i + 1];
    if (p != null && n != null && n - p === 2 && !placedB.has(p + 1) && why[i - 1] !== "joined" && why[i + 1] !== "joined") { map[i] = p + 1; why[i] = "between"; }
  }
  // 4. A verse placed away from where it is expected is kept only when it is
  //    surely there: an unmistakable likeness, or a run of neighbours moved the
  //    same way, and in either case standing out from the verses around the
  //    place it was put. Where every verse speaks of blue, purple and fine
  //    linen (the tabernacle's making, told in another order in the
  //    Septuagint), likeness alone says nothing, and a verse left unplaced
  //    only has fewer links, never a wrong one.
  const moved = (i) => map[i] !== null && map[i] !== expect[i];
  const strong = (i) => map[i] !== null && score(i, map[i]) >= 0.3;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < K.length; i++) {
      const j = map[i];
      if (j === null || !moved(i) || why[i] === "block" || why[i] === "joined") continue;
      const s = score(i, j);
      let alt = 0;
      for (let x = Math.max(0, j - 15); x <= Math.min(B.length - 1, j + 15); x++) if (x !== j) alt = Math.max(alt, score(i, x));
      const run = (map[i - 1] === j - 1 && strong(i - 1) && why[i - 1] !== "between") || (map[i + 1] === j + 1 && strong(i + 1) && why[i + 1] !== "between");
      const sure =
        why[i] === "between"
          ? run && map[i - 1] === j - 1 && map[i + 1] === j + 1
          : run
            ? s >= 0.3 && s - alt >= 0.05
            : s >= 0.5 && s - alt >= 0.1 && within(ks[i], bs[j]) >= 0.45 && within(bs[j], ks[i]) >= 0.45;
      if (!sure) { map[i] = null; why[i] = "unclear"; }
    }
  }
  const scoreOf = map.map((j, i) => (j === null ? null : Math.round(score(i, j) * 100) / 100));
  return { map, why, scoreOf };
}

const K = loadKjv();
const B = loadBrenton();
const books = {};
let total = 0, moved = 0, missing = 0;
for (const book of Object.keys(K)) {
  if (!B[book]) throw new Error(`no Brenton text for ${book}`);
  const { map } = alignBook(book, K[book], B[book]);
  const out = { moved: {}, missing: [] };
  K[book].forEach((k, i) => {
    const from = `${k.c}:${k.v}`;
    const j = map[i];
    if (j === null) out.missing.push(from);
    else {
      const to = `${B[book][j].c}:${B[book][j].v}`;
      if (to !== from) out.moved[from] = to;
    }
  });
  books[book] = out;
  total += K[book].length;
  moved += Object.keys(out.moved).length;
  missing += out.missing.length;
}
const order = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/books.json"), "utf8")).map((b) => b.slug);
const sorted = Object.fromEntries(order.filter((s) => books[s]).map((s) => [s, books[s]]));
fs.writeFileSync(OUT, `${JSON.stringify({ books: sorted })}\n`);
console.log(`${total} KJV verses: ${total - moved - missing} at the same number, ${moved} moved, ${missing} not in the app's Septuagint (${((missing / total) * 100).toFixed(1)}%)`);
