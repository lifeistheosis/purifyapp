// Where each verse of the app stands in a downloaded Bible, for Compare (1.9,
// the sheet's 14 and PLAN.md row 21b; his yes of 2026-11-09: "the Copenhagen
// maps, credited, the map file shared alike").
//
//   node scripts/bibles/compare-map.mjs [--report] [--only <bible>]
//
// Writes data/bibles/maps/<bible>.json for each downloaded Bible: for every
// chapter of the app that can be placed surely, its verses as runs, each
// [first app verse, last app verse, the Bible's chapter, its first verse],
// and a single app verse that the Bible divides in two as [v, v, chapter,
// first, last]. A chapter that is not in the file is not placed, and Compare
// does not show that Bible there; a verse missing from a placed chapter is
// one the Bible does not have, or that could not be placed surely.
//
// How a verse is placed. Two steps, because neither is enough alone:
//
//  1. Where the numbering says it should be. The app's Old Testament is
//     Brenton's, numbered as the Septuagint; the Synodal is numbered as the
//     Russian Church prints it. The Copenhagen Alliance's mappings (the UBS,
//     SIL, Tyndale House and YouVersion; CC BY-SA 4.0) give each standard
//     numbering against the original-language one ("org"): the English
//     ("eng"), the Septuagint ("lxx") and the Synodal ("rso"). The app reaches
//     the English through its own map of the KJV, made from the words
//     (data/bible/kjv-to-lxx.json, scripts/bibles/verse-map.mjs); a book the
//     KJV lacks reaches a standard where its chapters have that standard's
//     verse counts. So: app -> KJV -> eng -> org -> rso.
//  2. Where the texts say it is. A standard is a printing's numbering, not
//     this file's: the Copenhagen "rso" has no entry for Daniel 5:31, which
//     this Synodal sets in chapter 5 as the English does, and the Synodal's
//     3 Maccabees joins verses the English keeps apart. So each chapter is
//     aligned by its verses' lengths, which run long or short together in a
//     translation (Gale and Church, 1993, as lib/bible/septuagintPairing.ts
//     pairs the Greek), with step 1's places as the likelier pairing. A verse
//     may pair with one verse, with two, or with none.
//
// What is not sure stays out: a chapter whose alignment fits poorly overall,
// and a single pairing far from the lengths' usual ratio. The test
// (lib/bible/__tests__/compareMap.test.ts) holds well-known places to it.
//
// The map is derived from the Copenhagen Alliance's data and is shared under
// the same licence, CC BY-SA 4.0, with its credit in the file and in the app.
// Their files are kept as they came in data/bibles/copenhagen/ (README.md
// there names the commit).
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const REPORT = process.argv.includes("--report");

// ---- The books, by the codes the standards use --------------------------------

const buildSrc = fs.readFileSync(path.join(ROOT, "scripts/bibles/build.mjs"), "utf8");
const usfmAt = buildSrc.indexOf("const USFM = ");
const USFM = Function(`return ${buildSrc.slice(usfmAt + 13, buildSrc.indexOf("};", usfmAt) + 1)}`)();
// Set elsewhere in build.mjs's books: the Hebrew Ezra, Nehemiah, Esther and Daniel.
Object.assign(USFM, { EZR: "ezra", NEH: "nehemiah", EST: "esther", DAN: "daniel" });
delete USFM.DAG;
delete USFM.ESG;
const CODE = Object.fromEntries(Object.entries(USFM).map(([code, slug]) => [slug, code]));

// ---- The Copenhagen Alliance's standard mappings --------------------------------

const CPH = path.join(ROOT, "data/bibles/copenhagen");
const STANDARD = Object.fromEntries(
  ["eng", "lxx", "rso"].map((k) => [k, JSON.parse(fs.readFileSync(path.join(CPH, `${k}.json`), "utf8"))]),
);
// The original-language numbering itself, for the Hebrew (1.9, the
// Westminster Leningrad Codex beside the Old Testament): its verse counts are
// the codex's own, and it maps to itself. The Copenhagen standards above are
// each given against it, so a verse reaches it through any of them.
const HEBREW_DIR = path.join(ROOT, "data/bible/hebrew");
STANDARD.org = { maxVerses: {}, mappedVerses: {} };
if (fs.existsSync(HEBREW_DIR)) {
  for (const f of fs.readdirSync(HEBREW_DIR).filter((n) => n.endsWith(".json"))) {
    const slug = f.slice(0, -".json".length);
    const code = CODE[slug];
    if (!code) throw new Error(`a Hebrew book the codes do not name: ${slug}`);
    const { chapters } = JSON.parse(fs.readFileSync(path.join(HEBREW_DIR, f), "utf8"));
    STANDARD.org.maxVerses[code] = chapters.map((c) => String(Math.max(0, ...c.map(([n]) => n))));
  }
}

function parseRef(ref) {
  const m = /^(\S+) (\d+):(\d+)[a-z]?(?:-(\d+)[a-z]?)?$/.exec(ref);
  if (!m) throw new Error(`a reference the mappings do not use: ${ref}`);
  return { book: m[1], c: Number(m[2]), v: Number(m[3]), to: m[4] ? Number(m[4]) : Number(m[3]) };
}
function add(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  if (!map.get(key).includes(value)) map.get(key).push(value);
}
/** A standard's verses to the original's ("org"), and back, verse by verse. */
function tables(name) {
  const to = new Map();
  for (const [a, b] of Object.entries(STANDARD[name].mappedVerses)) {
    const x = parseRef(a);
    const y = parseRef(b);
    const xs = [];
    for (let v = x.v; v <= x.to; v++) xs.push(`${x.book} ${x.c}:${v}`);
    const ys = [];
    for (let v = y.v; v <= y.to; v++) ys.push(`${y.book} ${y.c}:${v}`);
    if (xs.length === ys.length) xs.forEach((k, i) => add(to, k, ys[i]));
    else if (xs.length === 1) ys.forEach((k) => add(to, xs[0], k));
    else if (ys.length === 1) xs.forEach((k) => add(to, k, ys[0]));
    else xs.forEach((k, i) => add(to, k, ys[Math.min(i, ys.length - 1)]));
  }
  const from = new Map();
  for (const [k, vs] of to) for (const v of vs) add(from, v, k);
  return { to, from };
}
const TABLES = Object.fromEntries(Object.keys(STANDARD).map((k) => [k, tables(k)]));
const toOrg = (name, ref) => TABLES[name].to.get(ref) ?? [ref];
function fromOrg(name, ref) {
  const hit = TABLES[name].from.get(ref);
  if (hit) return hit;
  // An org verse the standard numbers elsewhere is not at its own number there.
  const own = TABLES[name].to.get(ref);
  if (own && !own.includes(ref)) return [];
  return [ref];
}

// ---- The texts ------------------------------------------------------------------

/** Letters only: punctuation and spacing differ between printings. */
const letters = (text) => String(text).replace(/[^\p{L}]/gu, "").length;

function appBook(slug) {
  const dir = path.join(ROOT, "data/bible", slug);
  if (!fs.existsSync(dir)) return null;
  const count = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).length;
  return Array.from({ length: count }, (_, i) =>
    JSON.parse(fs.readFileSync(path.join(dir, `${i + 1}.json`), "utf8")).verses.map((v) => ({ n: v.n, len: letters(v.text) })),
  );
}
/** Where a Bible's text is kept: the downloaded Bibles' files, or the Hebrew's own folder (it is carried in the apps, not downloaded). */
const TEXT_DIRS = { "he-wlc": HEBREW_DIR };
function bibleBook(bible, slug) {
  const file = path.join(TEXT_DIRS[bible] ?? path.join(ROOT, "public/bibles", bible), `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")).chapters.map((c) => (c ?? []).map(([n, text]) => ({ n, len: letters(text) })));
}
const KJV = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/kjv-to-lxx.json"), "utf8")).books;
/** The books the app reads in Brenton's Septuagint: the Greek is that same edition there, and only there. */
const BRENTON = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/books.json"), "utf8"))
    .filter((b) => b.source === "brenton-lxx-pd")
    .map((b) => b.slug),
);
const counts = (chapters) => chapters.map((c) => Math.max(0, ...c.map((v) => v.n)));
const sameCounts = (a, b) => a && b && a.length === b.length && a.every((x, i) => Number(x) === Number(b[i]));

// ---- Step 1: where the numbering says -------------------------------------------

/**
 * The app's verse -> the Bible's verses ("c:v"), as the numberings say. `target`
 * is the standard the Bible follows ("rso" for the Synodal), or null to expect
 * the app's own numbers (the Greek, which is Brenton's own edition).
 */
/** The codes a standard may give a book: the Septuagint's Daniel and Esther are its Greek ones. */
const ALIAS = { daniel: ["DAN", "DAG"], esther: ["EST", "ESG"] };

function expected(slug, app, target, sameBible) {
  // The Greek is the app's own edition in its Old Testament only: the app's
  // New Testament is the KJV, and the 1904 text sets Romans' doxology at
  // 14:24-26, where the KJV has it at 16:25-27.
  const sameEdition = sameBible && BRENTON.has(slug);
  const code = CODE[slug];
  const codes = ALIAS[slug] ?? [code];
  const out = new Map();
  const appVerses = app.flatMap((c, i) => c.map((v) => `${i + 1}:${v.n}`));
  // The app's verse as the English numbers it, or as a standard it follows.
  const via = new Map();
  if (KJV[slug]) {
    const missing = new Set(KJV[slug].missing);
    STANDARD.eng.maxVerses[code].forEach((n, ci) => {
      for (let v = 1; v <= Number(n); v++) {
        const k = `${ci + 1}:${v}`;
        if (missing.has(k)) continue;
        add(via, KJV[slug].moved[k] ?? k, ["eng", `${code} ${k}`]);
      }
    });
  } else {
    const own = counts(app);
    const name = [target, "eng", "lxx"].find((k) => sameCounts(own, STANDARD[k].maxVerses[code]));
    if (name) for (const a of appVerses) via.set(a, [[name, `${code} ${a}`]]);
  }
  // Where no numbering reaches (a book no standard numbers as the app does, or
  // a chapter past the KJV's: Psalm 151, Susanna and Bel in Daniel 13 and 14),
  // the app's own numbers are the expectation, and step 2 decides. A chapter
  // the KJV map reaches but left verses of unplaced (the tabernacle's making in
  // Exodus, told in another order) gets nothing it did not place.
  const kjvChapters = KJV[slug] ? STANDARD.eng.maxVerses[code].length : 0;
  for (const a of appVerses) {
    const routes = via.get(a);
    if (!routes) continue;
    const places = new Set();
    for (const [name, ref] of routes) {
      if (name === "same") {
        places.add(ref);
        continue;
      }
      for (const org of toOrg(name, ref))
        for (const t of fromOrg(target, org)) {
          const own = codes.find((k) => t.startsWith(`${k} `));
          if (own) places.add(t.slice(own.length + 1));
        }
    }
    if (places.size) out.set(a, [...places]);
  }
  // A Bible of the app's own edition (the Greek: Brenton's Septuagint, which
  // the app's English translates verse for verse) keeps the app's order, so
  // the places the numbering gives a chapter are handed out in that order. The
  // standards go by the Hebrew's order and can reshuffle a few verses that the
  // lengths cannot tell apart: Malachi's last three, "I will send you Elias",
  // "he shall turn the heart" and "remember the law of Moses", which the
  // Septuagint orders otherwise than the Hebrew.
  if (sameEdition) {
    app.forEach((verses, ci) => {
      const keys = verses.map((v) => `${ci + 1}:${v.n}`).filter((k) => out.get(k)?.length === 1);
      const places = keys.map((k) => out.get(k)[0]);
      const order = (t) => t.split(":").map(Number).reduce((c, v) => c * 1000 + v);
      const sorted = [...places].sort((x, y) => order(x) - order(y));
      if (places.some((t, i) => t !== sorted[i])) keys.forEach((k, i) => out.set(k, [sorted[i]]));
    });
  }
  const same = new Set();
  // A run of verses the numbering left between two placed neighbours, with
  // exactly as many of the Bible's verses waiting between their places, takes
  // them one for one (the Song of the Three, Daniel 3:24-90, which the KJV
  // lacks and the Synodal sets where the Septuagint does). It is judged as
  // strictly as a guess by the same number.
  app.forEach((verses, ci) => {
    const keys = verses.map((v) => `${ci + 1}:${v.n}`);
    let i = 0;
    while (i < keys.length) {
      if (out.has(keys[i])) {
        i++;
        continue;
      }
      let j = i;
      while (j < keys.length && !out.has(keys[j])) j++;
      const before = i > 0 ? out.get(keys[i - 1]) : null;
      const after = j < keys.length ? out.get(keys[j]) : null;
      if (before?.length === 1 && after?.length === 1) {
        const [pc, pv] = before[0].split(":").map(Number);
        const [qc, qv] = after[0].split(":").map(Number);
        if (pc === qc && qv - pv - 1 === j - i) {
          for (let k = i; k < j; k++) {
            out.set(keys[k], [`${pc}:${pv + 1 + (k - i)}`]);
            same.add(keys[k]);
          }
        }
      }
      i = j;
    }
  });
  // A chapter the numbering places nowhere takes the app's own numbers, where
  // they can be trusted to start from: in the Greek, Brenton's own edition in
  // the app's order (its Nehemiah, which the standard files as Esdras B; its
  // Exodus 38), and wherever no numbering reaches (a book no standard numbers
  // as the app does; Psalm 151; Susanna and Bel, Daniel 13 and 14). A chapter
  // the KJV map reaches but left unplaced in the Synodal (the tabernacle's
  // making in Exodus, told in another order) gets nothing.
  const placedChapters = new Set([...out.keys()].map((k) => k.split(":")[0]));
  for (const a of appVerses) {
    const c = a.split(":")[0];
    if (placedChapters.has(c)) continue;
    if (sameEdition || !KJV[slug] || Number(c) > kjvChapters) {
      out.set(a, [a]);
      same.add(a);
    }
  }
  return { places: out, same };
}

// ---- Step 2: what the texts say of it -------------------------------------------

/** The lengths' usual ratio, in logs, from the pairings the numbering gives. */
function ratioOf(pairs) {
  const logs = pairs.filter(([a, b]) => a > 20 && b > 20).map(([a, b]) => Math.log(b / a));
  logs.sort((x, y) => x - y);
  const mid = logs[Math.floor(logs.length / 2)];
  const spread = logs.map((x) => Math.abs(x - mid)).sort((x, y) => x - y)[Math.floor(logs.length / 2)] * 1.4826;
  return { mean: mid, sd: Math.max(0.12, spread) };
}

/** How far a pairing's lengths are from the usual ratio: 0 is usual, 9 is the most counted. */
function fitOf(a, b, ratio) {
  if (!b) return 9;
  if (a < 8 || b < 8) return 1.5;
  const z = (Math.log(b / a) - ratio.mean) / ratio.sd;
  return Math.min(9, z * z);
}

// When the texts say the numbering is wrong. Set from the whole of both Bibles
// (scripts/bibles/compare-map.mjs --report lists every chapter left out, and
// why): most chapters fit below 1.5; the Septuagint's Esther and Jeremiah,
// and lists of names, fit near 3 and 4 with every verse placed and no shift
// helping, which is the texts differing, not the numbers; a misnumbered
// chapter fits as badly but a shift helps, or it leaves verses with nowhere
// to go (the Synodal's 3 Maccabees, which the Copenhagen "rso" numbers as the
// Greek and this file does not).
/** Every pairing moved by up to five verses fitting this much better: misnumbered. */
const SHIFT_BETTER = 0.6;
/** A chapter fitting worse than this is misnumbered if a shift helps at all, or verses are left over. */
const POOR = 2.6;
const SHIFT_HELPS = 0.85;
const MOST_PLACED = 0.9;
/** A chapter fitting worse than this is left out whatever else is true of it. */
const WORST = 5;
/** Placed by the bare same number, a chapter must fit at least this well on average. */
const SAME_FIT = 2;

function placeBible(bible, target, sameEdition) {
  const books = {};
  const report = [];
  // The numbering's places for every book first: the usual ratio of the two
  // texts' lengths is measured once, over the whole Bible, from the pairings
  // the numbering itself gives, so that no misnumbered book sets its own.
  const work = [];
  for (const slug of Object.keys(CODE)) {
    const app = appBook(slug);
    const theirs = bibleBook(bible, slug);
    if (!app || !theirs) continue;
    // The standard this Bible's book follows: the one with its very verse
    // counts, where one has them (the Greek's 1904 New Testament sets Romans'
    // doxology at 14:24-26, as the Synodal does), else the Bible's own.
    const shape = counts(theirs);
    const codes = ALIAS[slug] ?? [CODE[slug]];
    const standard = [target, "rso", "lxx", "eng"].find((k) => codes.some((code) => sameCounts(shape, STANDARD[k].maxVerses[code]))) ?? target;
    const { places, same } = expected(slug, app, standard, sameEdition);
    const len = new Map(theirs.flatMap((c, ci) => c.map((v) => [`${ci + 1}:${v.n}`, v.len])));
    work.push({ slug, app, places, same, len });
  }
  const ratio = ratioOf(
    work.flatMap(({ app, places, same, len }) => {
      const appLen = new Map(app.flatMap((c, ci) => c.map((v) => [`${ci + 1}:${v.n}`, v.len])));
      return [...places].flatMap(([a, ts]) => (!same.has(a) && ts.length === 1 && len.has(ts[0]) ? [[appLen.get(a), len.get(ts[0])]] : []));
    }),
  );
  for (const { slug, app, places: expect, same, len } of work) {
    const chapters = {};
    const poorly = [];
    let total = 0;
    const left = [];
    app.forEach((verses, ci) => {
      const c = ci + 1;
      total += verses.length;
      // Each app verse with the Bible's verses the numbering gives it, where the Bible has them.
      const pairs = verses
        .map((v) => {
          const key = `${c}:${v.n}`;
          const ts = (expect.get(key) ?? []).filter((t) => len.has(t));
          return ts.length ? { v: v.n, key, a: v.len, ts: tidy(ts) } : null;
        })
        .filter(Boolean);
      if (!pairs.length) {
        left.push(`${c} (nothing placed by the numbering)`);
        return;
      }
      const lengthOf = (ts, d) =>
        ts.reduce((sum, t) => {
          const [tc, tv] = t.split(":").map(Number);
          return sum + (len.get(`${tc}:${tv + d}`) ?? 0);
        }, 0);
      const meanAt = (d) => pairs.reduce((sum, p) => sum + fitOf(p.a, lengthOf(p.ts, d), ratio), 0) / pairs.length;
      const here = meanAt(0);
      const moved = Math.min(...[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map(meanAt));
      const share = pairs.length / verses.length;
      if (here > POOR) poorly.push(c);
      // Every pairing moved alike fitting far better: the numbering is out
      // here (the Synodal's Daniel 6, which the Copenhagen "rso" numbers as the
      // Hebrew and this file as the English).
      if (pairs.length >= 6 && moved < here * SHIFT_BETTER && here - moved > 0.8) {
        left.push(`${c} (out: fit ${here.toFixed(2)}, moved ${moved.toFixed(2)})`);
        return;
      }
      if (here > WORST || (here > POOR && (moved < here * SHIFT_HELPS || share < MOST_PLACED))) {
        left.push(`${c} (fit ${here.toFixed(2)}, moved ${moved.toFixed(2)}, ${(share * 100).toFixed(0)}% placed)`);
        return;
      }
      if (pairs.every((p) => same.has(p.key)) && here > SAME_FIT) {
        left.push(`${c} (same numbers, fit ${here.toFixed(2)})`);
        return;
      }
      // One verse the Bible divides in two: paired with both, where the two fit
      // and the one did not, and the other is no other verse's (3 John 14,
      // whose "Peace be to thee" is the Bible's verse 15; 1 Samuel 20:42, which
      // the Copenhagen "eng" gives only its second half's number, the
      // Hebrew's 21:1, and the Synodal sets as 20:42 and 20:43).
      const used = new Set(pairs.flatMap((p) => p.ts));
      for (const p of pairs) {
        if (p.ts.length !== 1 || fitOf(p.a, lengthOf(p.ts, 0), ratio) < 4) continue;
        const [tc, tv] = p.ts[0].split(":").map(Number);
        for (const other of [`${tc}:${tv + 1}`, `${tc}:${tv - 1}`]) {
          if (!len.has(other) || used.has(other)) continue;
          if (fitOf(p.a, len.get(p.ts[0]) + len.get(other), ratio) <= 2) {
            p.ts = tidy([p.ts[0], other]);
            used.add(other);
            break;
          }
        }
      }
      // A book the Bible numbers otherwise, verse for verse, keeps no pairing
      // at the far end of the lengths' ratio: there the numbering has most
      // likely given the verse the wrong half.
      const sameShape = sameCounts(counts(app), [...len.keys()].reduce((acc, k) => {
        const [tc, tv] = k.split(":").map(Number);
        acc[tc - 1] = Math.max(acc[tc - 1] ?? 0, tv);
        return acc;
      }, []));
      const entries = [];
      for (const p of pairs) {
        const fit = fitOf(p.a, lengthOf(p.ts, 0), ratio);
        // Where only the same number placed it, or the book is numbered
        // otherwise, a pairing nothing like the usual ratio is left out.
        if (fit >= 9 && (same.has(p.key) || !sameShape)) continue;
        const [tc, first] = p.ts[0].split(":").map(Number);
        const last = p.ts.length > 1 ? Number(p.ts[p.ts.length - 1].split(":")[1]) : null;
        entries.push(last === null ? [p.v, p.v, tc, first] : [p.v, p.v, tc, first, last]);
      }
      if (entries.length) chapters[c] = runs(entries);
    });
    // A book most of whose chapters fit poorly is numbered otherwise throughout,
    // and none of it is shown (the Synodal's 3 Maccabees).
    if (app.length >= 3 && poorly.length >= app.length / 2) {
      report.push(`${slug.padEnd(20)} placed 0/${total}; not placed: the whole book (${poorly.length} of ${app.length} chapters fit poorly)`);
      continue;
    }
    const placed = Object.values(chapters).reduce((t, rs) => t + rs.reduce((u, r) => u + (r[1] - r[0] + 1), 0), 0);
    if (Object.keys(chapters).length) books[slug] = chapters;
    report.push(`${slug.padEnd(20)} placed ${placed}/${total}${left.length ? `; not placed: ${left.slice(0, 6).join(", ")}${left.length > 6 ? ` and ${left.length - 6} more` : ""}` : ""}`);
  }
  return { books, report, ratio };
}

/** One verse's places: a run in one chapter, or its first place where they are apart. */
function tidy(ts) {
  const sorted = [...new Set(ts)].sort((x, y) => {
    const [a, b] = x.split(":").map(Number);
    const [c, d] = y.split(":").map(Number);
    return a - c || b - d;
  });
  const [c0, v0] = sorted[0].split(":").map(Number);
  const run = sorted.every((t, i) => t === `${c0}:${v0 + i}`);
  return run ? sorted : [sorted[0]];
}

/** Consecutive one-to-one pairings in one chapter as a single run. */
function runs(entries) {
  const out = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && e.length === 4 && last.length === 4 && e[0] === last[1] + 1 && e[2] === last[2] && e[3] === last[3] + (last[1] - last[0]) + 1) {
      last[1] = e[0];
    } else out.push([...e]);
  }
  return out;
}

// ---- The files ------------------------------------------------------------------

const CREDIT =
  "Verse places derived from the Copenhagen Alliance's versification mappings (github.com/Copenhagen-Alliance/versification-specification), CC BY-SA 4.0, and aligned to the texts by Purify. This file is shared under CC BY-SA 4.0.";

// The Greek is Brenton's own Septuagint, numbered nearly as the standard
// Septuagint is (its Proverbs 30 in chapter 24, its Joel in four chapters),
// and the 1904 Patriarchal New Testament. The Serbian, Arabic and Spanish are
// Bibles of the Hebrew canon in eBible's files, numbered as the English
// Bibles are, with their own turns where the edition has them (the Spanish's
// Numbers 13:1 is the English's 12:16): the English standard, then the texts.
// The Almeida of 1911 is one too, in CrossWire's file, numbered as the King
// James Bible is (its 2 Corinthians 13 ends at 13).
const BIBLES = [
  { id: "ru-synodal", target: "rso", sameEdition: false },
  { id: "grc-lxx-patriarchal", target: "lxx", sameEdition: true },
  { id: "sr-danicic-karadzic", target: "eng", sameEdition: false },
  { id: "ar-van-dyck", target: "eng", sameEdition: false },
  { id: "es-reina-valera-1909", target: "eng", sameEdition: false },
  { id: "pt-almeida-1911", target: "eng", sameEdition: false },
  // The World English Bible (build 95 note 25) numbers as English Bibles do, with the deuterocanon.
  { id: "en-web", target: "eng", sameEdition: false },
];

// The Hebrew, set beside the Old Testament in the interlinear (1.9): the
// Westminster Leningrad Codex, numbered as the original is. Not one of
// Compare's Bibles, so it is listed apart (lib/bible/__tests__/hebrewMap.test.ts).
const HEBREW = [{ id: "he-wlc", target: "org", sameEdition: false }];

export { expected, appBook, bibleBook, placeBible, BIBLES, HEBREW };

const run = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
const outDir = path.join(ROOT, "data/bibles/maps");
if (run) fs.mkdirSync(outDir, { recursive: true });
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
for (const { id, target, sameEdition } of run ? [...BIBLES, ...HEBREW].filter((b) => !ONLY || b.id === ONLY) : []) {
  const { books, report } = placeBible(id, target, sameEdition);
  const file = {
    bible: id,
    license: "CC BY-SA 4.0",
    credit: CREDIT,
    format: "books -> app chapter -> runs [first app verse, last app verse, the Bible's chapter, its first verse] or, for one app verse in two of the Bible's, [v, v, chapter, first, last]",
    books,
  };
  fs.writeFileSync(path.join(outDir, `${id}.json`), `${JSON.stringify(file)}\n`);
  if (REPORT) console.log(`== ${id}\n${report.join("\n")}`);
  else console.log(`${id}: ${report.filter((r) => r.includes("not placed")).length} books with chapters left out`);
}
