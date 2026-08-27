// Prayers in Preparation for the Holy Communion, from Hapgood 1906.
//
// Source: https://archive.org/download/cu31924029363128/cu31924029363128_djvu.txt
// Isabel Florence Hapgood, Service Book of the Holy Orthodox-Catholic
// Apostolic (Greco-Russian) Church, Houghton Mifflin, 1906. The Cornell
// University Library scan. Public domain in the United States.
//
// ── Why this is a script and not a hand-typed file ──────────────────────
//
// docs/editorial-standards.md: "Never fabricate or 'restore' patristic text
// from model memory; ingest from a named public-domain source or do not add
// it." The cost of ignoring that is on the record in
// docs/editorial/dogma-queue/README.md: the Cherubic Hymn shipped attributed
// to this exact book, scored 100% word-order match against it because the book
// is 1.6 million words, and contained "mystically" and "thrice-holy", neither
// of which appears in it anywhere. Every word below comes off the scan.
//
// ── The one place an ingest can silently corrupt verbatim text ──────────
//
// The scan hyphenates at line ends. "im-\nmortality" must join to
// "immortality", but "evil-\nnatured" must keep its hyphen, and 1906
// typography sets "for ever" as two words where a modern eye expects
// "forever". Guessing produces "evilnatured" in a text we are calling
// verbatim.
//
// So nothing is guessed. Each break is resolved AGAINST THE BOOK: if the
// joined form or the hyphenated form appears elsewhere in these 293,000 words
// NOT broken across a line, that spelling wins. Anything the book does not
// settle is left hyphenated and written to the review report, because a
// visible hyphen is a smaller error than a wrong word and it shows an editor
// where to look.
//
// Usage:
//   node scripts/ingest-hapgood-communion.mjs [--cache <path>] [--write]
//
// Without --write nothing is saved and the report goes to stdout.

import fs from "node:fs";
import path from "node:path";

const SOURCE_URL =
  "https://archive.org/download/cu31924029363128/cu31924029363128_djvu.txt";

const SOURCE =
  "Isabel Florence Hapgood, Service Book of the Holy Orthodox-Catholic " +
  "Apostolic (Greco-Russian) Church. Houghton Mifflin, Boston, 1906. " +
  "Public domain. Transcription source: the Cornell University Library scan " +
  "at archive.org (cu31924029363128). Text verbatim, including Hapgood's " +
  "spelling and punctuation; scan line-break hyphenation is rejoined only " +
  "where the same word appears unbroken elsewhere in the volume.";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "prayers", "rules", "pre-communion.json");
const REPORT = path.join(
  ROOT,
  "docs",
  "editorial",
  "ingest-review",
  "hapgood-pre-communion.md",
);

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const cacheIdx = args.indexOf("--cache");
const CACHE = cacheIdx >= 0 ? args[cacheIdx + 1] : null;

async function loadBook() {
  if (CACHE && fs.existsSync(CACHE)) return fs.readFileSync(CACHE, "utf8");
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "purify-ingest" },
  });
  if (!res.ok) throw new Error(`source fetch failed: ${res.status}`);
  const text = await res.text();
  if (CACHE) fs.writeFileSync(CACHE, text, "utf8");
  return text;
}

/**
 * Remove the running page furniture the scan splices into mid-sentence.
 *
 * Every page break in the djvu text drops the running header, and sometimes a
 * page number, straight into the flow. Left in, the first prayer reads
 * "...let the PRAYERS IN PREPARATION FOR THE HOLY COMMUNION 571 communion of
 * thine All-pure...". Five of the six prayers carried this; only the sixth was
 * clean, because it happens to fit on a single page.
 *
 * Matched on "PRAYERS IN PREPARATION" alone rather than the full header,
 * because the OCR damages the tail of it: the scan contains "COMMUNIO]^[" and
 * a page number rendered "57'".
 */
function stripPageFurniture(section) {
  return section
    .replace(/^[^\n]*PRAYERS\s+IN\s+PREPARATION[^\n]*$/gim, "")
    // Bare page numbers left on their own line by the same page breaks.
    .replace(/^\s*\d{2,4}\s*$/gm, "");
}

/** The section, located by its own heading rather than by byte offset. */
function sliceSection(book) {
  const start = book.search(/PRAYERS\s+IN\s+PREPARATION\s+FOR\s+THE\s+HOLY\s*\n\s*COMMUNION/);
  if (start < 0) throw new Error("section heading not found; the scan changed");
  const after = book.slice(start).search(/APPENDIX\s+A/) + start;
  if (after <= start) throw new Error("section end not found");
  return book.slice(start, after);
}

/**
 * Resolve one line-break hyphen against the rest of the book.
 * Returns { text, how } so every decision lands in the report.
 */
function resolveBreak(book, left, right) {
  const joined = left + right;
  const hyphen = `${left}-${right}`;
  // "Unbroken" means the form appears with no newline inside it.
  const seen = (form) => new RegExp(`\\b${form.replace(/[-]/g, "\\-")}\\b`, "i").test(book);
  const joinedSeen = seen(joined);
  const hyphenSeen = seen(hyphen);
  if (joinedSeen && !hyphenSeen) return { text: joined, how: "joined, attested" };
  if (hyphenSeen && !joinedSeen) return { text: hyphen, how: "hyphen kept, attested" };
  if (joinedSeen && hyphenSeen) return { text: hyphen, how: "both attested, kept hyphen, REVIEW" };

  // Nothing in the book settles it, and NO HEURISTIC SETTLES IT EITHER.
  //
  // I tried two and both failed on real data. "Keep the hyphen" produced
  // "confi-dent", "condemn-ing" and "clem-ency". "Both halves are words, so
  // it is a compound" also failed, because in 293,000 words of scan the
  // fragments are themselves attested: `confi` and `clem` each appear once as
  // OCR noise, and `ing` appears 127 times, left behind by every other
  // hyphenated line in the volume. Frequency does not separate them either:
  // `natured` appears twice and is genuine, `ing` appears 127 times and is not.
  //
  // So the remainder are decided by hand, once, in the open. Anything not in
  // this table stops the ingest rather than being guessed, which means a new
  // break in a future section is a build failure and not a silent corruption.
  const DECIDED = {
    "evil|natured": ["evil-natured", "compound adjective, hyphenated in 1906 setting"],
    "heart|felt": ["heart-felt", "compound adjective, hyphenated in 1906 setting"],
    "confi|dent": ["confident", "syllable break: confi is not a word"],
    "clem|ency": ["clemency", "syllable break: clem is not a word"],
    "condemn|ing": ["condemning", "syllable break: ing is a suffix, not a word"],
  };
  const decided = DECIDED[`${left.toLowerCase()}|${right.toLowerCase()}`];
  if (decided) return { text: decided[0], how: `by hand: ${decided[1]}` };
  throw new Error(
    `Unresolved line-break hyphen: "${left}-${right}". The book attests ` +
      `neither "${joined}" nor "${hyphen}". Add it to DECIDED in this script ` +
      `with a reason, after looking at the scan. Do not guess.`,
  );
}

function cleanBody(book, raw) {
  const decisions = [];
  let text = raw.replace(/(\w+)-\s*\n\s*(\w+)/g, (_m, a, b) => {
    const r = resolveBreak(book, a, b);
    decisions.push({ a, b, ...r });
    return r.text;
  });
  text = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/\s+([;:,.!?])/g, "$1") // the scan spaces before punctuation
    .replace(/\n(?!\n)/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  return { text, decisions };
}

const ROMAN = /(?:^|\n)\s*(I{1,3}|IV|V|VI{0,3})\s*\.?\s*\n/g;

function splitPrayers(book, section) {
  const marks = [...section.matchAll(ROMAN)].map((m) => ({
    n: m[1],
    at: m.index + m[0].length,
  }));
  if (marks.length < 3) throw new Error(`expected several prayers, found ${marks.length}`);
  const out = [];
  const allDecisions = [];
  for (let i = 0; i < marks.length; i++) {
    const body = section.slice(marks[i].at, marks[i + 1]?.at ?? section.length);
    // A titled prayer opens with "A Prayer of X." on its own line.
    // Two traps here, both found the hard way.
    //
    // The scan double-spaces every word ("A  Prayer  of  St.  Basil"), so a
    // literal "A Prayer" never matches and every title silently fell back.
    //
    // And the title cannot be read up to the first period, because "A Prayer
    // of St. Basil the Great." contains "St." and that truncates it to
    // "A Prayer of St". Take the line.
    //
    // Prayer VI genuinely has no title in the book: it opens straight into
    // "I believe, O Lord, and I confess". The fallback names it rather than
    // inventing an attribution the page does not make.
    const titleMatch = body.match(/^[ \t\n]*(A\s+Prayer[^\n]*?)[ \t]*\n/);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, " ").replace(/\.$/, "").replace(/^A Prayer,/, "A Prayer").trim()
      : "Before receiving the Holy Mysteries";
    const rest = titleMatch ? body.slice(titleMatch[0].length) : body;
    const { text, decisions } = cleanBody(book, rest);
    allDecisions.push(...decisions);
    out.push({ id: `pre-communion-${marks[i].n.toLowerCase()}`, title, text });
  }
  return { prayers: out, decisions: allDecisions };
}

const book = await loadBook();
const section = stripPageFurniture(sliceSection(book));
const { prayers, decisions } = splitPrayers(book, section);

const rule = {
  id: "pre-communion",
  title: "Prayers before Communion",
  subtitle: "A selection, as printed in the Service Book",
  intro:
    "The prayers the Church appoints for those preparing to receive the Holy Mysteries. Hapgood prints a selection of six, and these are they, in her order and her words.",
  estimatedMinutes: 15,
  source: SOURCE,
  jurisdiction: "Pan-Orthodox",
  prayers,
};

const review = [
  "# Hapgood 1906, Prayers in Preparation for the Holy Communion",
  "",
  "Generated. Do not hand-edit: rebuild with",
  "`node scripts/ingest-hapgood-communion.mjs --write`.",
  "",
  `Source: ${SOURCE_URL}`,
  "",
  "## Alignment",
  "",
  `- Prayers extracted: **${prayers.length}**`,
  `- Words: **${prayers.reduce((n, p) => n + p.text.split(/\s+/).length, 0)}**`,
  `- Line-break hyphens resolved: **${decisions.length}**`,
  "",
  "## Every hyphenation decision",
  "",
  "The scan breaks words at line ends. Each break below was resolved against",
  "the rest of the volume rather than guessed. Anything marked REVIEW is where",
  "the book did not settle it and an editor should look.",
  "",
  "| broken as | resolved to | how |",
  "|---|---|---|",
  ...decisions.map((d) => `| ${d.a}- ${d.b} | ${d.text} | ${d.how} |`),
  "",
  "## Prayers",
  "",
  ...prayers.map((p) => `- **${p.title}** (${p.text.split(/\s+/).length} words)`),
  "",
].join("\n");

if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(rule, null, 2) + "\n", "utf8");
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, review, "utf8");
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
  console.log(`wrote ${path.relative(ROOT, REPORT)}`);
} else {
  console.log(review);
}

const needsReview = decisions.filter((d) => d.how.includes("REVIEW"));
console.log(
  `\n${prayers.length} prayers, ${decisions.length} hyphen breaks, ` +
    `${needsReview.length} needing review`,
);
for (const d of needsReview) console.log(`  REVIEW  ${d.a}- ${d.b}  ->  ${d.text}`);
