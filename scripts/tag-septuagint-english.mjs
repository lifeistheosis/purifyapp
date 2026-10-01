// Tag Brenton's English Old Testament word by word with the Strong's numbers
// of Swete's Greek, so the interlinear lights the English word a Greek word
// stands for, as the New Testament's KJV tagging already does (2026-10-01).
//
//   node --experimental-strip-types --import ./scripts/lib/register-alias.mjs \
//     scripts/tag-septuagint-english.mjs --eval     measure on held-out NT books
//   node --experimental-strip-types --import ./scripts/lib/register-alias.mjs \
//     scripts/tag-septuagint-english.mjs --write    write data/bible/english-tagged
//
// No tagged Brenton exists in the public domain, and no paid service is used:
// the links are learned here. A word-alignment model (IBM Model 1 with a
// preference for words in the same part of the verse, as fast_align does) is
// trained on every Old Testament verse whose Greek and English pair
// (lib/bible/septuagintPairing.ts), and is taught the New Testament's own
// KJV tags as known pairs (θεός is "God", καί is "and"), which Brenton's
// English, close to the KJV's, shares. A word is then linked only where the
// model is confident and no likelier partner claims it (competitive linking),
// so a word left plain is a word the model was unsure of. The interlinear
// promises that a lit word is the right word; it does not promise every word.
//
// --eval trains with John and Romans held out of the known pairs, tags them
// as if they were the Septuagint, and scores the result against their KJV
// tags: of the words lit, how many light from the right Greek word.
//
// Measured 2026-10-01: 95% of lit words light from the right Greek word,
// lighting 59% of the words the KJV tags. Much of the other 5% is the KJV's
// own tagging (it numbers ἦν 2258 where this Greek has 1510, and tags John
// 2:23's "miracles" as αὐτός). Read by hand on the Septuagint: 30 of 30
// sampled nouns, verbs and particles right, about 28 of 30 pronouns (the
// misses are a pronoun the English moves past its twin, as in Job 22:27).
// The output is deterministic: the same data writes the same files.

import fs from "node:fs";
import path from "node:path";

import { pairingOffset } from "@/lib/bible/septuagintPairing";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data", "bible");
const ORIGINAL = path.join(DATA, "original");
const TAGGED = path.join(DATA, "english-tagged");
const booksJson = JSON.parse(fs.readFileSync(path.join(DATA, "books.json"), "utf8"));
const BOOKS = Array.isArray(booksJson) ? booksJson : booksJson.books;

const EVAL = process.argv.includes("--eval");
const WRITE = process.argv.includes("--write");
const HELD_OUT = new Set(["john", "romans"]);

// ── Settings, tuned with --eval ──────────────────────────────────────────
const ITERATIONS = 6;
/** How strongly a word is expected in the same part of the verse. */
const DIAGONAL = 4;
/** Words further apart than this share of the verse are never paired. */
const WINDOW = 0.5;
/** The weight of "no Greek word": English words the Greek does not have. */
const NULL_WEIGHT = 0.08;
/** A link needs this share of the English word's probability... */
const MIN_POSTERIOR = Number(arg("--posterior") ?? 0.5);
/** ...the reverse model must give the Greek word's probability this share... */
const MIN_REVERSE = Number(arg("--reverse") ?? 0.3);
/** ...and the Greek word must translate as this word at least this often. */
const MIN_TRANSLATION = Number(arg("--translation") ?? 0.02);
/** Each known New Testament pair counts as this many sightings. */
const SEED_WEIGHT = 1;

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

const ARTICLES = new Set(["the", "a", "an"]);
/**
 * Words English renders many ways (αὐτός as he, his, him, it, them; εἰμί
 * folded into "is", "was", "shall be"), so a verse with two or three of them
 * is where a link most often lands on the wrong one. They need more certainty.
 */
const PRONOUNS = new Set(["846", "1473", "4771", "1510"]);
const STRICT_POSTERIOR = Number(arg("--strict") ?? 0.8);

/**
 * Where the Greek form says which English word it can be, it may only be
 * that word, at the ordinary thresholds: με is "me", never "my"; σου is "thy",
 * "thine" or "thee"; ἦν is "was" or "were". A form not listed keeps the strict
 * thresholds above. Keys are unaccented, lower case, final sigma as σ.
 */
const FORMS = new Map(
  Object.entries({
    // ἐγώ, ἡμεῖς
    εγω: "i", μου: "my mine me", εμου: "my mine me", μοι: "me my", εμοι: "me my", με: "me", εμε: "me",
    ημεισ: "we", ημων: "our us ours", ημιν: "us we our", ημασ: "us",
    // σύ, ὑμεῖς
    συ: "thou you ye", σου: "thy thine thee your you", σοι: "thee thou thy you", σε: "thee thou you",
    υμεισ: "ye you", υμων: "your you yours", υμιν: "you ye your", υμασ: "you ye",
    // αὐτός
    αυτοσ: "he himself it same", αυτου: "his him its it himself", αυτω: "him it himself", αυτον: "him it himself",
    αυτη: "she her it", αυτησ: "her its it", αυτην: "her it", αυτο: "it", αυτοι: "they them themselves",
    αυτων: "their them theirs", αυτοισ: "them they", αυτουσ: "them themselves", αυτα: "them they it",
    αυται: "they", αυταισ: "them", αυτασ: "them",
    // εἰμί
    ειμι: "am", ει: "art", εστι: "is", εστιν: "is", εσμεν: "are", εστε: "are", εισι: "are", εισιν: "are",
    ην: "was were", ησαν: "were", εσται: "shall will be", εσομαι: "shall will be", εση: "shalt wilt be",
    εσονται: "shall will be", εσεσθε: "shall will be", ειναι: "be", εστω: "let be", εστωσαν: "let be",
  }).map(([form, words]) => [form, new Set(words.split(" "))]),
);

/** A Greek word as FORMS keys it. */
function greekForm(word) {
  return word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .replace(/[^\p{L}]/gu, "");
}
const GREEK_ARTICLE = "3588";

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** An English word as the model sees it: lower case, letters only. */
function norm(word) {
  return word.toLowerCase().replace(/’/g, "'").replace(/'s$/, "").replace(/[^a-z]/g, "");
}

// ── Vocabularies ─────────────────────────────────────────────────────────
const STRONGS = new Map([["", 0]]); // 0 is "no Greek word"
const WORDS = new Map();
const KEY = 2 ** 20;
const strongsId = (s) => {
  let id = STRONGS.get(s);
  if (id === undefined) STRONGS.set(s, (id = STRONGS.size));
  return id;
};
const wordId = (w) => {
  let id = WORDS.get(w);
  if (id === undefined) WORDS.set(w, (id = WORDS.size));
  return id;
};

/**
 * One verse pair. `greek`: the Strong's ids of the Greek words that carry one,
 * in order. `english`: the verse split on spaces, as the reader shows it.
 * `ids`: each English word's id, or -1 for pure punctuation.
 */
function versePair(greekTokens, englishWords) {
  const greek = [];
  const strongs = [];
  const forms = [];
  for (const t of greekTokens ?? []) {
    if (!t.s) continue;
    const form = greekForm(t.w);
    // Swete files σου, σε and σοι all under 4771, so the model learns a
    // pronoun by its form (σου is "thy", σε is "thee"); the tag written is
    // still the Strong's number.
    greek.push(strongsId(PRONOUNS.has(t.s) ? `${t.s}:${form}` : t.s));
    strongs.push(t.s);
    forms.push(form);
  }
  const ids = englishWords.map((w) => {
    const n = norm(w);
    return n ? wordId(n) : -1;
  });
  return { greek: Int32Array.from(greek), strongs, forms, english: englishWords, ids: Int32Array.from(ids) };
}

// ── The corpus ───────────────────────────────────────────────────────────
const t0 = Date.now();
const ot = []; // { book, chapter, verse, pair }
let otChapters = 0;
for (const b of BOOKS) {
  if (b.testament === "NT") continue;
  for (let c = 1; c <= b.chapters; c += 1) {
    const g = readJson(path.join(ORIGINAL, b.slug, `${c}.json`));
    const e = readJson(path.join(DATA, b.slug, `${c}.json`));
    if (!g || !e) continue;
    const offset = pairingOffset(b.slug, g.verses, e.verses);
    if (offset === null) continue;
    otChapters += 1;
    const greekBy = new Map(g.verses.map((v) => [v.n, v]));
    for (const v of e.verses) {
      const words = v.text.trim().split(/\s+/).filter(Boolean);
      ot.push({ book: b.slug, chapter: c, verse: v.n, pair: versePair(greekBy.get(v.n + offset)?.tokens, words) });
    }
  }
}

// The New Testament: its KJV tags are the known pairs; in --eval, the
// held-out books are tagged like the Septuagint and scored.
const seed = new Map(); // key -> sightings
const heldOut = []; // { pair, gold: (string|undefined)[] }
const nt = [];
for (const b of BOOKS) {
  if (b.testament !== "NT") continue;
  for (let c = 1; c <= b.chapters; c += 1) {
    const g = readJson(path.join(ORIGINAL, b.slug, `${c}.json`));
    const e = readJson(path.join(TAGGED, b.slug, `${c}.json`));
    if (!g || !e) continue;
    const greekBy = new Map(g.verses.map((v) => [v.n, v]));
    for (const v of e.verses) {
      const words = v.tokens.map((t) => t.w);
      const pair = versePair(greekBy.get(v.n)?.tokens, words);
      const gold = v.tokens.map((t) => t.s);
      if (EVAL && HELD_OUT.has(b.slug)) {
        heldOut.push({ book: b.slug, chapter: c, verse: v.n, pair, gold });
        continue;
      }
      nt.push(pair);
      // Known pairs: a tag counts only where its Greek word is in the verse.
      // An article inside a tagged phrase ("the Word") is the phrase's, not
      // the noun's translation, so it is skipped unless it stands alone.
      const inVerse = new Set(pair.strongs);
      for (let j = 0; j < gold.length; j += 1) {
        const s = gold[j];
        if (!s || !inVerse.has(s) || pair.ids[j] < 0) continue;
        const word = norm(words[j]);
        const alone = gold[j - 1] !== s && gold[j + 1] !== s;
        if (ARTICLES.has(word) && !alone && s !== GREEK_ARTICLE) continue;
        const key = strongsId(s) * KEY + pair.ids[j];
        seed.set(key, (seed.get(key) ?? 0) + SEED_WEIGHT);
      }
    }
  }
}
const training = [...ot.map((x) => x.pair), ...heldOut.map((x) => x.pair)];
console.log(`corpus: ${otChapters} paired OT chapters, ${ot.length} OT verses, ${nt.length} NT verses taught, ${heldOut.length} held out; ${STRONGS.size} Greek, ${WORDS.size} English words (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

// ── Training ─────────────────────────────────────────────────────────────
const prior = (i, n, j, m) => {
  const d = Math.abs((j + 0.5) / m - (i + 0.5) / n);
  return d > WINDOW ? 0 : Math.exp(-DIAGONAL * d);
};

/**
 * IBM Model 1 with a pull toward the same part of the verse. `src` and `tgt`
 * give a pair's word ids (sources from 1, 0 being "no word"; a target of -1
 * is skipped). Returns P(target | source), keyed source * span + target.
 */
function train(label, src, tgt, span, seedCounts) {
  let table = null;
  const tr = (a, b) => (table === null ? 1 : table.get(a * span + b) ?? 0);
  for (let it = 0; it < ITERATIONS; it += 1) {
    const counts = new Map(seedCounts);
    for (const p of training) {
      const S = src(p);
      const T = tgt(p);
      const n = S.length;
      const m = T.length;
      if (n === 0) continue;
      for (let j = 0; j < m; j += 1) {
        const b = T[j];
        if (b < 0) continue;
        let z = NULL_WEIGHT * tr(0, b);
        for (let i = 0; i < n; i += 1) z += tr(S[i], b) * prior(i, n, j, m);
        if (z <= 0) continue;
        counts.set(b, (counts.get(b) ?? 0) + (NULL_WEIGHT * tr(0, b)) / z);
        for (let i = 0; i < n; i += 1) {
          const w = (tr(S[i], b) * prior(i, n, j, m)) / z;
          if (w < 1e-6) continue;
          const key = S[i] * span + b;
          counts.set(key, (counts.get(key) ?? 0) + w);
        }
      }
    }
    const totals = new Map();
    for (const [key, c] of counts) {
      const a = Math.floor(key / span);
      totals.set(a, (totals.get(a) ?? 0) + c);
    }
    table = new Map();
    for (const [key, c] of counts) {
      const q = c / totals.get(Math.floor(key / span));
      if (q >= 1e-4) table.set(key, q);
    }
    console.log(`${label} iteration ${it + 1}: ${table.size} pairs (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  return tr;
}

// Both directions: which Greek word made this English word, and which
// English word renders this Greek one. A link must convince both.
for (const p of training) {
  const src = [];
  const pos = [];
  p.ids.forEach((e, j) => {
    if (e >= 0) {
      src.push(e + 1);
      pos.push(j);
    }
  });
  p.englishSrc = Int32Array.from(src);
  p.englishPos = pos;
}
const RSPAN = 2 ** 14;
if (STRONGS.size >= RSPAN) throw new Error("too many Greek words for the reverse key");
const reverseSeed = new Map();
for (const [key, c] of seed) reverseSeed.set((key % KEY + 1) * RSPAN + Math.floor(key / KEY), c);
const tr = train("greek->english", (p) => p.greek, (p) => p.ids, KEY, seed);
const rt = train("english->greek", (p) => p.englishSrc, (p) => p.greek, RSPAN, reverseSeed);

// ── Linking ──────────────────────────────────────────────────────────────

/**
 * The verse's English with a Strong's number on each word the model links,
 * in the reader's terms: consecutive words with one number are one phrase,
 * and the Nth phrase with a number answers the Nth Greek word with it.
 */
function link(p, minPosterior = MIN_POSTERIOR, minReverse = MIN_REVERSE) {
  const n = p.greek.length;
  const m = p.ids.length;
  const tags = new Array(m).fill(undefined);
  const source = new Array(m).fill(-1);
  if (n === 0) return tags;

  // Each Greek word's posterior over the English words (the reverse model).
  const me = p.englishSrc.length;
  const reverse = new Map(); // i * m + j -> posterior
  for (let i = 0; i < n; i += 1) {
    let z = NULL_WEIGHT * rt(0, p.greek[i]);
    const row = new Float64Array(me);
    for (let k = 0; k < me; k += 1) z += (row[k] = rt(p.englishSrc[k], p.greek[i]) * prior(k, me, i, n));
    for (let k = 0; k < me; k += 1) if (z > 0) reverse.set(i * m + p.englishPos[k], row[k] / z);
  }

  // Each English word's posterior over the Greek words.
  const post = [];
  for (let j = 0; j < m; j += 1) {
    const e = p.ids[j];
    const row = new Float64Array(n);
    if (e >= 0) {
      let z = NULL_WEIGHT * tr(0, e);
      for (let i = 0; i < n; i += 1) z += (row[i] = tr(p.greek[i], e) * prior(i, n, j, m));
      for (let i = 0; i < n; i += 1) row[i] = z > 0 ? row[i] / z : 0;
    }
    post.push(row);
  }

  // Competitive linking: likeliest first, each word on each side once.
  const candidates = [];
  for (let j = 0; j < m; j += 1) {
    if (p.ids[j] < 0) continue;
    for (let i = 0; i < n; i += 1) {
      // The Greek article is never linked by itself: its "the" joins the
      // noun's phrase below, as in the New Testament's tagging.
      if (p.strongs[i] === GREEK_ARTICLE) continue;
      const back = reverse.get(i * m + j) ?? 0;
      const strict = PRONOUNS.has(p.strongs[i]);
      const allowed = strict ? FORMS.get(p.forms[i]) : undefined;
      if (allowed && !allowed.has(norm(p.english[j]))) continue;
      const tight = strict && !allowed;
      const needForward = tight ? Math.max(minPosterior, STRICT_POSTERIOR) : minPosterior;
      const needBack = tight ? Math.max(minReverse, STRICT_POSTERIOR) : minReverse;
      if (post[j][i] >= needForward && back >= needBack && tr(p.greek[i], p.ids[j]) >= MIN_TRANSLATION) {
        candidates.push([post[j][i] * back, i, j]);
      }
    }
  }
  candidates.sort((a, b) => b[0] - a[0]);
  const greekTaken = new Uint8Array(n);
  for (const [, i, j] of candidates) {
    if (greekTaken[i] || source[j] >= 0) continue;
    greekTaken[i] = 1;
    source[j] = i;
  }

  // "the heaven" for τὸν οὐρανὸν: an English article before a linked noun
  // joins its phrase when the Greek has an article before that noun, as the
  // New Testament's tagging does.
  for (let j = 1; j < m; j += 1) {
    const i = source[j];
    if (i < 1 || source[j - 1] >= 0) continue;
    if (!ARTICLES.has(norm(p.english[j - 1]))) continue;
    if (p.strongs[i - 1] !== GREEK_ARTICLE) continue;
    source[j - 1] = i;
  }

  // Keep the reader's count honest: for each Strong's number, the linked
  // phrases must answer its Greek occurrences in order, from the first,
  // and two occurrences must not touch (they would read as one phrase).
  const phrases = new Map(); // s -> [{ i, start, end }]
  for (let j = 0; j < m; j += 1) {
    const i = source[j];
    if (i < 0) continue;
    const s = p.strongs[i];
    const list = phrases.get(s) ?? [];
    const last = list[list.length - 1];
    if (last && last.i === i && last.end === j - 1) last.end = j;
    else list.push({ i, start: j, end: j });
    phrases.set(s, list);
  }
  for (const [s, list] of phrases) {
    const occurrences = [];
    for (let i = 0; i < n; i += 1) if (p.strongs[i] === s) occurrences.push(i);
    const byGreek = new Map(list.map((ph) => [ph.i, ph]));
    let prevEnd = -2;
    for (let k = 0; k < occurrences.length; k += 1) {
      const ph = byGreek.get(occurrences[k]);
      // A Greek word with no phrase, a phrase out of order, or one touching
      // the last: nothing from here on can be counted right, so stop.
      if (!ph || ph.start <= prevEnd + 1 || list.filter((x) => x.i === occurrences[k]).length !== 1) break;
      for (let j = ph.start; j <= ph.end; j += 1) tags[j] = s;
      prevEnd = ph.end;
    }
  }
  return tags;
}

/** The reader's occurrence count (components/bible/VerseRow.tsx). */
function occurrences(tags) {
  const out = [];
  const counts = new Map();
  let prev;
  for (const s of tags) {
    if (!s) {
      out.push(-1);
      prev = undefined;
      continue;
    }
    if (s === prev) out.push((counts.get(s) ?? 1) - 1);
    else {
      const n = counts.get(s) ?? 0;
      out.push(n);
      counts.set(s, n + 1);
    }
    prev = s;
  }
  return out;
}

function score(minPosterior, minReverse, show) {
  const perStrongs = new Map();
  let lit = 0;
  let right = 0;
  let sameNumber = 0;
  let goldLit = 0;
  const wrong = [];
  for (const h of heldOut) {
    const tags = link(h.pair, minPosterior, minReverse);
    const inVerse = new Set(h.pair.strongs);
    // Score only where the KJV tag names a Greek word this verse has: the KJV
    // was tagged against another Greek text (ἦν is 2258 there, 1510 here).
    const gold = h.gold.map((s) => (s && inVerse.has(s) ? s : undefined));
    const go = occurrences(gold);
    const po = occurrences(tags);
    for (let j = 0; j < tags.length; j += 1) {
      if (gold[j]) goldLit += 1;
      if (!tags[j] || !h.gold[j] || !inVerse.has(h.gold[j])) continue;
      lit += 1;
      const per = perStrongs.get(tags[j]) ?? [0, 0];
      per[0] += 1;
      if (tags[j] === gold[j] && po[j] === go[j]) per[1] += 1;
      perStrongs.set(tags[j], per);
      if (tags[j] === gold[j]) {
        sameNumber += 1;
        if (po[j] === go[j]) right += 1;
      } else if (wrong.length < 40) {
        wrong.push(`${h.book} ${h.chapter}:${h.verse} "${h.pair.english[j]}" lit as ${tags[j]}, KJV ${gold[j]}`);
      }
    }
  }
  console.log(`posterior ${minPosterior} reverse ${minReverse}: ${lit} lit of ${goldLit}; right Greek word ${((100 * right) / lit).toFixed(1)}% (right number ${((100 * sameNumber) / lit).toFixed(1)}%); coverage ${((100 * lit) / goldLit).toFixed(1)}%`);
  if (show) {
    const worst = [...perStrongs]
      .filter(([, [n]]) => n >= 40)
      .sort((x, y) => x[1][1] / x[1][0] - y[1][1] / y[1][0])
      .slice(0, 15);
    console.log(worst.map(([s, [n, ok]]) => `  ${s}: ${((100 * ok) / n).toFixed(0)}% of ${n}`).join("\n"));
  }
}

if (EVAL) {
  score(MIN_POSTERIOR, MIN_REVERSE, true);
}

if (WRITE) {
  const byChapter = new Map();
  let words = 0;
  let lit = 0;
  for (const v of ot) {
    const tags = link(v.pair);
    const key = `${v.book}/${v.chapter}`;
    const ch = byChapter.get(key) ?? { book: v.book, chapter: v.chapter, verses: [] };
    ch.verses.push({ n: v.verse, tokens: v.pair.english.map((w, j) => (tags[j] ? { w, s: tags[j] } : { w })) });
    byChapter.set(key, ch);
    words += tags.length;
    lit += tags.filter(Boolean).length;
  }
  for (const ch of byChapter.values()) {
    const dir = path.join(TAGGED, ch.book);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${ch.chapter}.json`), JSON.stringify(ch));
  }
  console.log(`wrote ${byChapter.size} chapters; ${lit} of ${words} English words linked (${((100 * lit) / words).toFixed(1)}%)`);
}
