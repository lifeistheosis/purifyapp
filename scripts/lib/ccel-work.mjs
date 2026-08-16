// Turn a CCEL volume into a readable work, for texts that are not verse-keyed.
//
// WHY A SECOND LIBRARY. scripts/lib/npnf-homilies.mjs handles the Schaff homily
// shape, where a lemma anchors every section to a verse and the output feeds the
// commentary rail. Most of what is left on the CCEL shelf is not that: Cassian's
// Institutes and Conferences, Gregory's orations, Ambrose's treatises. They are
// works to be read, divided into books and chapters, with no verse to key to.
// Forcing them through the homily path would mean inventing anchors, so they get
// their own path that writes only data/saints/<saint>/<work>.json.
//
// The CCEL plain-text shape these all share:
//
//     Book II.
//
//      Chapter I. [637]
//
//     Of the Monk's Girdle.
//
//     As we are going to speak of the customs and rules of the monasteries...
//
// A part heading, a chapter heading with an optional footnote marker, a
// descriptive title on its own line, then the body. Indentation is not reliable
// (the same volume prints "   Book I." and "  Book II."), so nothing here keys
// on column position.
//
// Every consumer runs from the project root.

import fs from "node:fs";
import path from "node:path";

import { romanToInt, toParagraphs } from "./npnf-homilies.mjs";

const ROOT = process.cwd();

/** Roman or arabic, whichever the volume prints. */
function num(token) {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  const r = romanToInt(token);
  return Number.isFinite(r) && r > 0 ? r : null;
}

/**
 * The text between two markers. `endRe` is searched only after the start, so a
 * phrase that also appears in the front matter cannot truncate the region.
 */
export function sliceRegion(text, startRe, endRe = null, { label = "region" } = {}) {
  const start = startRe.exec(text);
  if (!start) throw new Error(`${label}: start marker ${startRe} not found`);
  const from = start.index;
  let to = text.length;
  if (endRe) {
    const rest = text.slice(from + start[0].length);
    const end = endRe.exec(rest);
    if (end) to = from + start[0].length + end.index;
  }
  const out = text.slice(from, to);
  if (out.length < 2000) {
    throw new Error(`${label}: sliced only ${out.length} characters, which cannot be a work.`);
  }
  return out;
}

/**
 * Split a region into sections on chapter headings, tracking the enclosing part
 * (Book, Conference, Oration) so a chapter number that restarts stays
 * distinguishable.
 *
 * Returns [{ n, part, chapter, title, paragraphs }] in document order, `n`
 * running from 1 across the whole work so the reader has a stable sequence.
 */
export function sectionsByChapter(region, {
  partWord = "Book",
  chapterWord = "Chapter",
  // Volumes do not agree on how a part is headed. Cassian's Institutes prints
  // "Book II." but his Conferences print "I. First Conference of Abbot Moses.",
  // so a caller can supply the pattern outright. It must capture the number.
  partPattern = null,
  chapterPattern = null,
  // Some works are a flat run of chapters with no enclosing part.
  expectParts = true,
  minParagraphs = 1,
} = {}) {
  const partRe = partPattern
    ? new RegExp(partPattern.source, "gm")
    : new RegExp(`^[ \\t]*${partWord} ([IVXLCDM]+|\\d+)\\.[ \\t]*(?:\\[\\d+\\])?[ \\t]*$`, "gm");
  const chapRe = chapterPattern
    ? new RegExp(chapterPattern.source, "gm")
    : new RegExp(`^[ \\t]*${chapterWord} ([IVXLCDM]+|\\d+)\\.[ \\t]*(?:\\[\\d+\\])?[ \\t]*$`, "gm");

  const parts = [...region.matchAll(partRe)].map((m) => ({ at: m.index, n: num(m[1]) }));
  const chapters = [...region.matchAll(chapRe)].map((m) => ({
    at: m.index,
    end: m.index + m[0].length,
    n: num(m[1]),
  }));
  if (!chapters.length) throw new Error(`sectionsByChapter: no "${chapterWord} N." headings found`);
  if (expectParts && !parts.length) {
    throw new Error(`sectionsByChapter: no "${partWord} N." headings found; pass expectParts: false if the work has none`);
  }

  const partAt = (offset) => {
    let cur = null;
    for (const p of parts) {
      if (p.at <= offset) cur = p.n;
      else break;
    }
    return cur;
  };

  const sections = [];
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const stop = i + 1 < chapters.length ? chapters[i + 1].at : region.length;
    // A part heading that falls between this chapter and the next ends this one,
    // or the last chapter of a book would swallow the next book's heading.
    const nextPart = parts.find((p) => p.at > c.end && p.at < stop);
    const body = region.slice(c.end, nextPart ? nextPart.at : stop);

    const lines = body.split("\n");
    let title = "";
    let bodyFrom = 0;
    for (let j = 0; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t) continue;
      if (/^_{3,}$/.test(t)) continue;
      title = t.replace(/\s*\[\d+\]\s*/g, " ").replace(/\s+/g, " ").trim();
      bodyFrom = j + 1;
      break;
    }

    const paragraphs = toParagraphs(lines.slice(bodyFrom).join("\n"));
    if (paragraphs.length < minParagraphs) continue;

    sections.push({
      n: sections.length + 1,
      part: partAt(c.at),
      chapter: c.n,
      title,
      paragraphs,
    });
  }

  // A part heading with no chapters under it is nearly always a section the
  // 19th century translators declined to render, and the volume says so in
  // place of the text: Cassian's Institutes VI and Conferences XII and XXII are
  // each omitted with a note. That is an editorial fact about the only
  // public-domain English there is, so it gets printed rather than swallowed as
  // a silent gap in the numbering.
  const covered = new Set(sections.map((s) => s.part));
  const missing = parts.map((p) => p.n).filter((n) => n != null && !covered.has(n));
  if (missing.length) {
    console.log(
      `  ${partWord} ${missing.join(", ")} carry no chapters. ` +
        `Check the volume: this normally means the translators omitted them.`,
    );
  }

  return sections;
}

/**
 * Cut an over-long note at paragraph boundaries the source already printed.
 *
 * A sermon or chapter with a single anchor would otherwise drop six thousand
 * words onto one verse. lib/bible/__tests__/commentaryIntegrity.test.ts holds a
 * ratchet on notes over 5,000 words that may only fall, and dumping a whole
 * section on one verse is precisely what pushes it up. Nothing is invented and
 * nothing moves: the text is cut only where the edition already broke a
 * paragraph, and every part stays on the same verse under the same work.
 */
export function splitLongNote(raw, maxWords = 3000) {
  const paragraphs = String(raw)
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!paragraphs.length) return [];

  const parts = [];
  let buf = [];
  let words = 0;
  for (const p of paragraphs) {
    const w = p.split(" ").length;
    if (words && words + w > maxWords) {
      parts.push(buf.join("\n\n"));
      buf = [];
      words = 0;
    }
    buf.push(p);
    words += w;
  }
  if (buf.length) parts.push(buf.join("\n\n"));
  return parts;
}

/** "Book 2, Chapter 1. Of the Monk's Girdle." */
export function titleFor(section, { partWord = "Book" } = {}) {
  const head = section.part
    ? `${partWord} ${section.part}, Chapter ${section.chapter}`
    : `Chapter ${section.chapter}`;
  return section.title ? `${head}. ${section.title}` : head;
}

/**
 * Write data/saints/<saintSlug>/<workSlug>.json.
 *
 * Registering the work in lib/saints/saints.ts is a separate, deliberate step:
 * saints.integrity.test.ts fails on a file with no registry entry, which is the
 * check that stops a work landing on disk and staying invisible.
 */
export function writeWork({ saintSlug, workSlug, title, subtitle, source, sections }) {
  if (!sections.length) throw new Error(`${saintSlug}/${workSlug}: no sections to write`);
  const out = path.join(ROOT, "data", "saints", saintSlug, `${workSlug}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify({ saint: saintSlug, slug: workSlug, title, subtitle, source, sections }, null, 2) + "\n",
    "utf8",
  );
  const words = sections.reduce((n, s) => n + s.paragraphs.join(" ").split(/\s+/).length, 0);
  console.log(
    `  ${path.relative(ROOT, out)}: ${sections.length} sections, ${words.toLocaleString("en-US")} words`,
  );
  return out;
}
