// Psalms 113 to 115 divided as the Septuagint divides them (1.9, c-psalter-113
// of docs/1.9-build/ideas.json; his yes of 2026-11-09 to the sheet's 6, "Fix 6
// is fine", on the recommendation "divide them as Brenton does, accepting that
// a few readers' notes on those three psalms move").
//
//   node scripts/bibles/psalms-113-115.mjs
//
// The app's English (Brenton's Septuagint) had these three psalms divided as
// the Hebrew divides them: 113 at 8 verses, 114 at 18, 115 at 19, the Hebrew
// 114, 115 and 116 whole. Brenton, the Septuagint and the app's own Greek
// (data/bible/original/psalms) have 113 at 26 verses (the Hebrew 114 and 115),
// 114 at 9 and 115 at 10 (the Hebrew 116 in two). So an Orthodox reader's
// Psalm 115, "I believed, wherefore I have spoken", stood at 115:10, the line
// under each title named the wrong Hebrew psalm, and the English beside the
// Greek was another verse on these pages.
//
// No word changes; only where each verse stands:
//
//   113:1-8   stays     113:1-8
//   114:1-18  becomes   113:9-26
//   115:1-9   becomes   114:1-9
//   115:10-19 becomes   115:1-10
//
// and everything keyed to those verses moves with them, by the same mapping:
// the English text, the Fathers' commentary on each verse, the
// cross-references from these verses and every cross-reference to them in the
// whole Bible, the KJV-to-Septuagint verse map, the paragraph breaks, and a
// plan's cite of one of them. The cross-references and the verse map were made
// from the words (scripts/ingest-cross-refs.mjs, scripts/bibles/verse-map.mjs),
// so renumbering them is what making them again would give. A reference that
// runs across the new line between 114 and 115 (old 115:9-11, or the old 115
// whole) becomes two, one in each psalm, at the same count.
//
// Run twice, it does nothing the second time: it checks the English first.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const at = (...p) => path.join(ROOT, ...p);
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
/**
 * Written back as the file was written: minified, or indented by one or two
 * spaces, with a newline at the end only where it had one. So the change is
 * the moves alone.
 */
const write = (f, value) => {
  const raw = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "{}";
  const indent = /^[[{]\n {2}\S/.test(raw) ? 2 : /^[[{]\n \S/.test(raw) ? 1 : undefined;
  fs.writeFileSync(f, JSON.stringify(value, null, indent) + (raw.endsWith("\n") ? "\n" : ""));
};

/** Where an old verse of 113 to 115 stands now; every other verse is where it was. */
export function moved(chapter, verse) {
  if (chapter === 114) return { chapter: 113, verse: verse + 8 };
  if (chapter === 115) return verse <= 9 ? { chapter: 114, verse } : { chapter: 115, verse: verse - 9 };
  return { chapter, verse };
}

/** A displayed reference ("Psalms 114:4-8"), as one or two in the new numbering. */
export function movedRef(display) {
  const m = /^Psalms (113|114|115):(\d+)(?:-(\d+))?$/.exec(display);
  if (!m) return [display];
  const chapter = Number(m[1]);
  const from = Number(m[2]);
  const to = m[3] ? Number(m[3]) : null;
  const a = moved(chapter, from);
  if (to === null) return [`Psalms ${a.chapter}:${a.verse}`];
  const b = moved(chapter, to);
  if (a.chapter === b.chapter) return [`Psalms ${a.chapter}:${a.verse}-${b.verse}`];
  // Across the new line between 114 and 115: one in each.
  const span = (c, x, y) => (x === y ? `Psalms ${c}:${x}` : `Psalms ${c}:${x}-${y}`);
  return [span(a.chapter, a.verse, 9), span(b.chapter, 1, b.verse)];
}

function main() {
  const english = (n) => at("data/bible/psalms", `${n}.json`);
  const before = [113, 114, 115].map((n) => read(english(n)));
  if (before[0].verses.length === 26) {
    console.log("Psalms 113 to 115 are already divided as the Septuagint divides them; nothing to do.");
    return;
  }
  const counts = before.map((d) => d.verses.length).join(", ");
  if (counts !== "8, 18, 19") throw new Error(`unexpected verse counts ${counts}; stopping`);

  // 1. The English: every verse to its new place, words untouched.
  const verses = { 113: [], 114: [], 115: [] };
  before.forEach((d, i) => {
    for (const v of d.verses) {
      const p = moved(113 + i, v.n);
      verses[p.chapter].push({ ...v, n: p.verse });
    }
  });
  before.forEach((d, i) => {
    const n = 113 + i;
    write(english(n), { ...d, verses: verses[n].sort((x, y) => x.n - y.n) });
  });

  // 2. The commentary and 3. the cross-references from these verses, by verse key.
  const rekey = (dir, transform = (v) => v) => {
    const files = [113, 114, 115].map((n) => {
      const f = at(dir, `${n}.json`);
      return fs.existsSync(f) ? read(f) : {};
    });
    const next = { 113: {}, 114: {}, 115: {} };
    files.forEach((d, i) => {
      for (const [k, v] of Object.entries(d)) {
        const p = moved(113 + i, Number(k));
        next[p.chapter][String(p.verse)] = transform(v);
      }
    });
    for (const n of [113, 114, 115]) {
      const sorted = Object.fromEntries(Object.entries(next[n]).sort(([a], [b]) => Number(a) - Number(b)));
      write(at(dir, `${n}.json`), sorted);
    }
  };
  rekey("data/bible/commentary/psalms");

  // Every cross-reference list in the Bible: each reference to these verses moved.
  const moveList = (list) => {
    const out = [];
    for (const r of list) {
      for (const display of movedRef(r.display)) {
        const same = out.find((x) => x.display === display);
        if (same) same.votes = Math.max(same.votes, r.votes);
        else out.push({ ...r, display });
      }
    }
    return out;
  };
  rekey("data/bible/cross-refs/psalms", moveList);
  let changedFiles = 0;
  for (const book of fs.readdirSync(at("data/bible/cross-refs"))) {
    const dir = at("data/bible/cross-refs", book);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (book === "psalms" && ["113.json", "114.json", "115.json"].includes(file)) continue;
      const f = path.join(dir, file);
      const raw = fs.readFileSync(f, "utf8");
      if (!/Psalms 11[45]:/.test(raw)) continue;
      const d = JSON.parse(raw);
      const next = Object.fromEntries(Object.entries(d).map(([k, list]) => [k, moveList(list)]));
      write(f, next);
      changedFiles += 1;
    }
  }

  // 4. The KJV-to-Septuagint map: where each KJV verse stands in the app.
  const mapFile = at("data/bible/kjv-to-lxx.json");
  const map = read(mapFile);
  const ps = map.books.psalms;
  ps.moved = Object.fromEntries(
    Object.entries(ps.moved).map(([kjv, lxx]) => {
      const [c, v] = lxx.split(":").map(Number);
      const p = moved(c, v);
      return [kjv, `${p.chapter}:${p.verse}`];
    }),
  );
  write(mapFile, map);

  // 5. The paragraph breaks (a paragraph starts at each verse listed). The
  // Hebrew 115 begins a paragraph where it now stands, at 113:9.
  for (const name of ["paragraphs.json", "print-paragraphs.json"]) {
    const f = at("data/bible", name);
    const d = read(f);
    const old = { 113: d.psalms?.["113"] ?? [], 114: d.psalms?.["114"] ?? [], 115: d.psalms?.["115"] ?? [] };
    const next = { 113: [...old[113], 9], 114: [], 115: [] };
    for (const c of [114, 115]) for (const v of old[c]) {
      const p = moved(c, v);
      if (p.verse > 1) next[p.chapter].push(p.verse);
    }
    for (const c of [113, 114, 115]) {
      const list = [...new Set(next[c])].sort((a, b) => a - b);
      if (list.length) d.psalms[String(c)] = list;
      else delete d.psalms[String(c)];
    }
    write(f, d);
  }

  // 6. A plan's cite of one of these verses (data/plans/guide/cites.json).
  const citesFile = at("data/plans/guide/cites.json");
  const citesRaw = fs.readFileSync(citesFile, "utf8");
  const citesNext = citesRaw.replace(/"book":"psalms","chapter":(11[45]),"from":(\d+)(,"to":(\d+))?/g, (all, c, from, _t, to) => {
    const a = moved(Number(c), Number(from));
    const b = to ? moved(Number(c), Number(to)) : null;
    return `"book":"psalms","chapter":${a.chapter},"from":${a.verse}${b ? `,"to":${b.verse}` : ""}`;
  });
  fs.writeFileSync(citesFile, citesNext);

  console.log(`Psalms 113 to 115 now 26, 9 and 10 verses; ${changedFiles} other cross-reference files moved their references.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
