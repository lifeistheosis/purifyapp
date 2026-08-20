// St. Jerome, four treatises from the Nicene and Post-Nicene Fathers, Series 2,
// Volume 6 (ed. Philip Schaff and Henry Wace, translated by W. H. Fremantle
// with G. Lewis and W. G. Martley, 1893). Public domain by publication date.
//
// WHY JEROME. He speaks in 851 notes of the commentary rail, third after
// Chrysostom and Augustine among Fathers whose profile carried no writing at
// all. A reader could meet him eight hundred times and never read a line he
// wrote as himself.
//
// WHY THESE FOUR AND NOT THE WHOLE VOLUME. The volume also holds 150 letters
// and four more treatises. The four taken here are the ones an Orthodox
// library can carry without an argument attached:
//
//   * the three desert Lives, which are hagiography of exactly the kind this
//     app already publishes, and which sit beside the stylites and the sayings
//     of the Desert Fathers rather than apart from them;
//   * the Perpetual Virginity, whose conclusion is what the Church confesses.
//
// Deliberately left: Against Jovinianus, whose disparagement of marriage the
// Church did not follow and which Jerome's own friends asked him to soften;
// To Pammachius Against John of Jerusalem, which is Origenist-controversy
// polemic and touches framing that is already a clergy-queue item; the
// Luciferian dialogue, and Against Vigilantius. None of those is a rights
// question. They are an editorial one, and the queue in
// docs/editorial-standards.md is where they belong, not a script.
//
// The 150 letters are a larger parse and a later job. Letter XXII to
// Eustochium and Letter CVIII, the life of St Paula, are the two worth doing
// first when someone picks that up.
//
// STRUCTURE. Each treatise opens with its title, a rule, then a paragraph of
// the NPNF editor's own framing (dates, occasion, who Helvidius was), and only
// then Jerome, in numbered paragraphs. That framing is not Jerome and is not
// presented as him: it becomes a section carrying `voice: "editorial"`, which
// is the field lib/saints/load.ts added for exactly this distinction. Getting
// this wrong is the defect that put a Victorian editor's filioque note into
// St Gregory's mouth at Job 38:33.
//
// Run from the project root:
//   node scripts/ingest-jerome.mjs

import { getText, toParagraphs } from "./lib/npnf-homilies.mjs";
import { sliceRegion, writeWork } from "./lib/ccel-work.mjs";

const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf206/cache/npnf206.txt";
const SAINT = "jerome-of-stridon";
const SOURCE =
  "St. Jerome, The Principal Works of St. Jerome. Nicene and Post-Nicene Fathers, Series 2, Volume 6, edited by Philip Schaff and Henry Wace, translated by W. H. Fremantle with G. Lewis and W. G. Martley. Oxford and New York, 1893. Public domain.";

const text = await getText("npnf206.txt", SRC_URL);

// Each work is bounded by its own title and the title of whatever the volume
// prints next. Ending on the next work's heading rather than on a generic
// marker is what keeps one treatise from swallowing the front matter of the
// following one, which is how 4,007 words of the Harmony of the Gospels ended
// up inside Augustine's Sermon on the Mount.
const WORKS = [
  {
    slug: "life-of-paulus-the-first-hermit",
    title: "The Life of Paulus the First Hermit",
    subtitle: "Written in the Syrian desert, about 375",
    year: "c. 375",
    start: /^ {3}The Life of Paulus the First Hermit\.\s*$/m,
    end: /^ {3}The Life of S\. Hilarion\.\s*$/m,
  },
  {
    slug: "life-of-saint-hilarion",
    title: "The Life of S. Hilarion",
    subtitle: "The hermit who carried the desert into Palestine",
    year: "c. 390",
    start: /^ {3}The Life of S\. Hilarion\.\s*$/m,
    end: /^ {3}The Life of Malchus, the Captive Monk\.\s*$/m,
  },
  {
    slug: "life-of-malchus-the-captive-monk",
    title: "The Life of Malchus, the Captive Monk",
    subtitle: "Told to Jerome by the man himself",
    year: "c. 391",
    start: /^ {3}The Life of Malchus, the Captive Monk\.\s*$/m,
    end: /^ {3}The Dialogue Against the Luciferians\.\s*$/m,
  },
  {
    slug: "the-perpetual-virginity-of-blessed-mary",
    title: "The Perpetual Virginity of Blessed Mary",
    subtitle: "Against Helvidius, about 383",
    year: "c. 383",
    start: /^ {3}The Perpetual Virginity of Blessed Mary\.\s*$/m,
    end: /^ {3}Against Jovinianus\.\s*$/m,
  },
];

/**
 * Cut the printed footnote block off the end of a treatise.
 *
 * The edition closes each work with its numbered notes, "[4253] Matt. xxiv.
 * 19", and those are not Jerome. The obvious marker is wrong and worth
 * recording: the FIRST paragraph opening "[NNNN] " in Against Helvidius sits
 * at 27% of the work, because Jerome quotes Deuteronomy as a block and the
 * anchor happens to begin the line. Cutting there would have thrown away
 * three quarters of the treatise.
 *
 * So the marker is the contiguous trailing RUN, scanned backwards and stopped
 * by the first real paragraph, which is the same discipline
 * scripts/clean-commentary-footnotes.mjs uses and for the same reason.
 */
function cutFootnoteBlock(region) {
  const paras = region.split(/\n\s*\n/);
  let k = paras.length;
  while (k > 0) {
    const p = paras[k - 1].trim();
    if (!p || /^-{6,}$/.test(p) || /^_{6,}$/.test(p) || /^\[\d{3,5}\]\s/.test(p)) k--;
    else break;
  }
  const cut = paras.length - k;
  if (cut < 5) return region; // no block worth calling one
  return paras.slice(0, k).join("\n\n");
}

/**
 * Split a treatise into its numbered sections.
 *
 * These works are not chaptered. The edition prints a run of numbered
 * paragraphs, "1. It has been a subject of wide-spread discussion", with the
 * number and the prose on one line, so scripts/lib/ccel-work.mjs's
 * sectionsByChapter does not apply: it wants a heading alone on its line.
 *
 * THE TRAP THIS FUNCTION EXISTS FOR. The editor's preface to Against
 * Helvidius contains its own numbered analysis of Jerome's argument, "1. The
 * first of these occupies ch. 3-8", and then Jerome's text restarts at 1. A
 * naive scan therefore opened the treatise on the editor summarising it,
 * under Jerome's name, and numbered the sections 1, 2, 3, 1, 2, 3.
 *
 * Jerome's body is the LAST run that begins at 1 and climbs, so that is what
 * is taken. Everything before it is the editor, returned separately.
 */
function splitNumbered(region) {
  const marks = [...region.matchAll(/^ {3}(\d{1,3})\.\s/gm)].map((m) => ({
    at: m.index,
    n: Number(m[1]),
  }));
  if (marks.length < 3) {
    throw new Error(`only ${marks.length} numbered sections found; the parse is wrong`);
  }

  // Every place the numbering resets to 1, and how far it climbs from there.
  const runs = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].n !== 1) continue;
    let j = i;
    while (j + 1 < marks.length && marks[j + 1].n === marks[j].n + 1) j++;
    runs.push({ from: i, to: j, len: j - i + 1 });
  }
  const body = runs.sort((a, b) => b.len - a.len || b.from - a.from)[0];
  if (!body || body.len < 3) {
    throw new Error("no ascending run of numbered sections found; the parse is wrong");
  }

  const kept = marks.slice(body.from, body.to + 1);
  const preface = region.slice(0, kept[0].at);
  const sections = kept.map((m, i) => {
    const to = i + 1 < kept.length ? kept[i + 1].at : region.length;
    return { n: m.n, body: region.slice(m.at, to) };
  });
  return { preface, sections };
}

/** Drop the title line and the rule the edition prints under it. */
function stripHeading(preface) {
  return preface
    .replace(/^ {3}[^\n]+\n/, "")
    .replace(/^\s*-{6,}\s*$/gm, "")
    .replace(/^ {3}Against Helvidius\.\s*$/gm, "")
    .trim();
}

let wrote = 0;
for (const w of WORKS) {
  const region = cutFootnoteBlock(sliceRegion(text, w.start, w.end, { label: w.title }));
  const { preface, sections } = splitNumbered(region);

  const out = [];

  // The editor's framing, declared as the editor's. `voice` is optional and
  // older files omit it, but anything written from here on says whose words
  // it is carrying.
  const framing = toParagraphs(stripHeading(preface));
  if (framing.length) {
    out.push({
      n: 1,
      title: "About this work",
      voice: "editorial",
      voiceAuthor: "W. H. Fremantle, for the Nicene and Post-Nicene Fathers",
      paragraphs: framing,
    });
  }

  for (const s of sections) {
    const paragraphs = toParagraphs(s.body);
    if (!paragraphs.length) continue;
    out.push({
      n: out.length + 1,
      title: `${s.n}`,
      voice: "saint",
      paragraphs,
    });
  }

  writeWork({
    saintSlug: SAINT,
    workSlug: w.slug,
    title: w.title,
    subtitle: w.subtitle,
    source: SOURCE,
    sections: out,
  });
  wrote++;
}

console.log(`\nSt. Jerome: ${wrote} of ${WORKS.length} works written.`);
console.log(SOURCE);
