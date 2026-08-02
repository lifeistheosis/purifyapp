// Wikisource ingest helpers.
//
// Wikisource carries clean transcriptions of the same Ante-Nicene and
// Nicene/Post-Nicene Fathers text that the CCEL scripts in this directory use,
// and it is reachable when ccel.org is not. The markup is CCEL-derived: a
// {{header}} block, anchor <span>s carrying CCEL section ids, <ref> footnotes
// from the Schaff / Roberts-Donaldson editorial apparatus, and chapters marked
// only by a bare "1." at the head of a paragraph.
//
// Everything here is mechanical. No text is rewritten, reordered, modernized
// or summarized: the paragraphs that land in data/ are the paragraphs on the
// page, minus markup. That is the editorial requirement (see
// docs/editorial-standards.md), and the assertions below exist to make a
// silent truncation impossible rather than merely unlikely.

import fs from "node:fs/promises";
import path from "node:path";

const CACHE = path.join(process.cwd(), ".cache", "wikisource");

/** Fetch a Wikisource page as raw wikitext, cached on disk between runs. */
export async function fetchWikitext(pageTitle) {
  await fs.mkdir(CACHE, { recursive: true });
  const cacheFile = path.join(CACHE, `${encodeURIComponent(pageTitle)}.wiki`);
  try {
    const hit = await fs.readFile(cacheFile, "utf8");
    if (hit.length > 500) return hit;
  } catch {
    /* cold cache */
  }
  const url =
    "https://en.wikisource.org/w/index.php?action=raw&title=" +
    encodeURIComponent(pageTitle);
  const res = await fetch(url, {
    headers: { "user-agent": "purify-content-ingest/1.0 (orthoapp)" },
  });
  if (!res.ok) throw new Error(`${pageTitle}: HTTP ${res.status}`);
  const text = await res.text();
  if (text.length < 500) throw new Error(`${pageTitle}: suspiciously short (${text.length} bytes)`);
  await fs.writeFile(cacheFile, text, "utf8");
  return text;
}

/**
 * Site policy is no em dashes in visible text, and the existing NPNF ingest
 * (scripts/lib/npnf-homilies.mjs) already converts them to commas, so the
 * saints corpus is consistent about it. The nineteenth-century editions
 * punctuate with a mark BEFORE the dash constantly (",—" and ";—" and ".—"),
 * and a blind swap turns those into ",, " and ";, " and "., ". So: when the
 * dash follows punctuation, the punctuation already does the work and the
 * dash simply goes. Otherwise it becomes a comma.
 */
function replaceEmDashes(t) {
  const DASH = "(?:&#8212;|—)";
  // Horizontal whitespace only. A dash that sits at the end of a block, which
  // is how CCEL closes its "Argument." summaries, must not be allowed to eat
  // the blank line after it: that merges the summary into chapter 1 and the
  // chapter parser then loses the first chapter of the work.
  const H = "[^\\S\\r\\n]*";
  return t
    .replace(new RegExp(`([,;:.!?])${H}${DASH}${H}`, "g"), "$1 ")
    .replace(new RegExp(`${H}${DASH}${H}`, "g"), ", ")
    .replace(/,[^\S\r\n]*,/g, ",")
    .replace(/[^\S\r\n]+([,;:.!?])/g, "$1");
}

const ENTITIES = {
  "&#8211;": "-",
  "&#8216;": "‘",
  "&#8217;": "’",
  "&#8220;": "“",
  "&#8221;": "”",
  "&#8230;": "...",
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
};

/** Strip wiki and HTML markup down to plain paragraphs. */
export function toParagraphs(wikitext) {
  let t = wikitext;

  // The {{header}} block and any other top-level template call.
  t = t.replace(/\{\{header[\s\S]*?\n\}\}/i, "");
  // Editorial footnotes from the Schaff apparatus. Not the Father's words.
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  t = t.replace(/<ref[^>]*\/>/gi, "");
  // {{small-caps|a.d.}} and friends: keep the payload, drop the wrapper.
  t = t.replace(/\{\{[^{}|]*\|([^{}]*)\}\}/g, "$1");
  t = t.replace(/\{\{[^{}]*\}\}/g, "");
  // Anchor spans and any other inline HTML.
  t = t.replace(/<\/?[a-z][^>]*>/gi, "");
  // [[Target|Label]] and [[Target]].
  t = t.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1");
  t = t.replace(/\[\[([^\]]*)\]\]/g, "$1");
  // Section headings (== Footnotes ==, == Notes ==). These are Wikisource's
  // own structure, not the Father's words, and the whole line goes. Missing
  // this put a literal "==Footnotes==" paragraph on the end of every text in
  // the first August run.
  t = t.replace(/^\s*={2,6}[^\n=][^\n]*?={2,6}\s*$/gm, "");
  // Bold/italic markup.
  t = t.replace(/'{2,5}/g, "");
  // CCEL sets a horizontal rule as a long run of em dashes on its own line.
  // It has to go BEFORE em dash substitution, or the run collapses into a
  // string of commas that glues the title block onto chapter 1 and the
  // chapter parser then finds nothing.
  t = t.replace(/^[ \t]*(?:&#8212;|—){3,}[ \t]*$/gm, "");
  // Em dashes next, so the punctuation-aware rules see them intact.
  t = replaceEmDashes(t);
  // Numeric and named entities.
  for (const [k, v] of Object.entries(ENTITIES)) t = t.split(k).join(v);
  t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  // The row of dashes CCEL uses as a rule.
  t = t.replace(/^[\s,.-]{6,}$/gm, "");

  return t
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

/**
 * Split plain paragraphs into numbered chapters. ANF and NPNF treatises in
 * this family mark a chapter with a bare "1." at the head of a paragraph and
 * carry no chapter headings at all, so the number is the only structure there
 * is. Throws on any gap, repeat or reversal in the sequence.
 */
export function splitNumberedChapters(paragraphs, { expected, work }) {
  const chapters = [];
  let current = null;

  for (const p of paragraphs) {
    const m = p.match(/^(\d{1,3})\.\s+(\S[\s\S]*)$/);
    if (m) {
      const n = Number(m[1]);
      const wanted = chapters.length + 1;
      if (n !== wanted) {
        // A stray "12. " inside running prose would land here. Treat any
        // out-of-sequence number as body text rather than guessing.
        if (current) current.paragraphs.push(p);
        continue;
      }
      current = { n, paragraphs: [m[2].trim()] };
      chapters.push(current);
      continue;
    }
    if (current) current.paragraphs.push(p);
  }

  if (chapters.length !== expected) {
    throw new Error(
      `${work}: expected ${expected} chapters, parsed ${chapters.length}. ` +
        `Refusing to write a partial text. Check the source page and the ` +
        `expected count in the ingest script before rerunning.`,
    );
  }
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].n !== i + 1) {
      throw new Error(`${work}: chapter sequence broke at index ${i} (n=${chapters[i].n})`);
    }
    if (chapters[i].paragraphs.join(" ").length < 80) {
      throw new Error(`${work}: chapter ${chapters[i].n} came out nearly empty`);
    }
    // Any surviving wiki markup means the stripper missed a construct and
    // something that is not the Father's words is about to be shipped as if
    // it were. Abort rather than let it through: this is the check that would
    // have caught the "==Footnotes==" paragraph in the first August run.
    for (const p of chapters[i].paragraphs) {
      const leak = p.match(/(=={2,}|\{\{|\}\}|\[\[|\]\]|<\/?[a-z]+[ >]|&#\d+;)/i);
      if (leak) {
        throw new Error(
          `${work}: chapter ${chapters[i].n} still contains markup ` +
            `(${JSON.stringify(leak[0])}). The stripper missed a construct; ` +
            `fix toParagraphs rather than shipping this.`,
        );
      }
    }
  }
  return chapters;
}

/** Write a WritingContent JSON file (see lib/saints/load.ts for the shape). */
export async function writeWriting(doc) {
  const dir = path.join(process.cwd(), "data", "saints", doc.saint);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${doc.slug}.json`);
  await fs.writeFile(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
  const words = doc.sections.reduce(
    (n, s) => n + s.paragraphs.join(" ").split(/\s+/).length,
    0,
  );
  console.log(
    `  wrote ${path.relative(process.cwd(), file)}  ` +
      `${doc.sections.length} sections, ~${words.toLocaleString()} words`,
  );
  return { file, words };
}
