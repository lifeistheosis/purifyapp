// Restores the deuterocanonical sections of Daniel from Brenton's 1851
// English Septuagint (public domain) and the Greek LXX.
//
// WHY. The app shipped a 12-chapter Daniel whose chapter 3 ran to 33 verses.
// Brenton's Daniel 3 runs to 97: verses 24-90 are the Prayer of Azariah and
// the Song of the Three Holy Children, and they had been excised with the
// text silently renumbered so v24 followed v23 with no visible gap. Susanna
// and Bel and the Dragon (Daniel 13 and 14 in Orthodox Bibles) were absent
// entirely, in both the English and the Greek trees.
//
// Cause: scripts/ingest-bible.mjs took bolls.life's LXXE Daniel verbatim,
// and its ASSERTIONS block never checked Daniel. A member reported the gap
// on 2026-07-31 ("Bel and the Dragon is not in the book of Daniel").
//
// This rewrites ALL of Daniel from one source rather than patching the two
// missing chapters on. The old text carried the Aramaic chapter division
// (3:31-33 = English 4:1-3) while Brenton ends chapter 3 at 97, so grafting
// would have blended two versifications inside one book.
//
// Usage:  node scripts/fetch-daniel-additions.mjs
//
// Re-runnable. Refuses to write anything unless every assertion passes, so
// a bad download cannot quietly truncate scripture a second time.

import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import https from "node:https";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const TMP = path.join(ROOT, ".tmp");
const EN_OUT = path.join(ROOT, "data", "bible", "daniel");
const GR_OUT = path.join(ROOT, "data", "bible", "original", "daniel");
const BOOKS_JSON = path.join(ROOT, "data", "bible", "books.json");

const EN_SOURCE = "brenton-lxx-pd";
const GR_SOURCE = "Septuagint (Swete edition, Greek). Public domain.";

const SOURCES = {
  en: {
    url: "https://ebible.org/Scriptures/eng-Brenton_usfm.zip",
    zip: path.join(TMP, "eng-Brenton_usfm.zip"),
    dir: path.join(TMP, "eng-Brenton"),
  },
  gr: {
    url: "https://ebible.org/Scriptures/grclxx_usfm.zip",
    zip: path.join(TMP, "grclxx_usfm.zip"),
    dir: path.join(TMP, "grclxx"),
  },
};

// USFM/Paratext codes. DAG is "Daniel (Greek)": the full Theodotion Daniel,
// including the Song of the Three inside chapter 3. SUS and BEL are printed
// as separate books by Brenton; Orthodox Bibles set them as Daniel 13-14,
// which is where the reader who reported this expected to find them.
const DANIEL_CODE = "DAG";
const SUSANNA_CODE = "SUS";
const BEL_CODE = "BEL";

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fssync.createWriteStream(dest);
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          file.close();
          fssync.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", reject);
  });
}

/**
 * Extract a zip without assuming `unzip` is on PATH.
 *
 * Node runs execSync through cmd.exe on Windows, where Git Bash's
 * /usr/bin/unzip is usually NOT visible, so the obvious command works from
 * one terminal and fails from another. PowerShell's Expand-Archive ships
 * with Windows and is always reachable, so prefer it there and keep unzip
 * for everywhere else.
 */
function extract(zip, dir) {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}' -Force"`,
      { stdio: "inherit" },
    );
    return;
  }
  execSync(`cd "${dir}" && unzip -qo "${zip}"`);
}

/**
 * Fetch and unpack a source, reusing an archive already sitting in .tmp/.
 *
 * The reuse is the point, not an optimisation: ebible.org went down midway
 * through this work (2026-07-31, DNS not resolving from two networks), so
 * the escape hatch is to obtain eng-Brenton_usfm.zip by any means at all,
 * drop it in .tmp/, and run this with no network.
 *
 * `optional` sources warn and continue. The Greek is best effort: the reader
 * degrades gracefully when an original-language chapter is missing, and
 * refusing to restore the English because a second archive was unreachable
 * would be the wrong trade.
 */
async function ensureSource(name, s, { optional = false } = {}) {
  await fs.mkdir(TMP, { recursive: true });
  if (!fssync.existsSync(s.zip)) {
    console.log(`downloading ${name} (${s.url}) ...`);
    try {
      await download(s.url, s.zip);
    } catch (e) {
      try {
        fssync.unlinkSync(s.zip);
      } catch {
        /* nothing to clean up */
      }
      if (optional) {
        console.warn(`  ! ${name} unavailable (${e.message}); continuing without it`);
        return false;
      }
      console.error(`\nCould not download ${name}: ${e.message}`);
      if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT/.test(e.code || e.message)) {
        console.error(
          `\nThat is a DNS failure, not a bad URL. ebible.org was up earlier\n` +
            `today, so this is most likely their outage. Either retry later, or\n` +
            `download ${path.basename(s.zip)} however you can, put it in\n` +
            `  ${TMP}\n` +
            `and run this again. With the archive present it needs no network.`,
        );
      }
      process.exit(1);
    }
  }
  await fs.mkdir(s.dir, { recursive: true });
  for (const f of await fs.readdir(s.dir)) {
    await fs.unlink(path.join(s.dir, f)).catch(() => {});
  }
  extract(s.zip, s.dir);
  return true;
}

async function ensureSources() {
  await ensureSource("en", SOURCES.en);
  return { greek: await ensureSource("gr", SOURCES.gr, { optional: true }) };
}

/**
 * USFM -> { chapterNumber: [{ n, text }] }.
 *
 * Same shape as the parser in scripts/fetch-original.mjs. Footnotes (\f
 * ... \f*) and cross-references (\x ... \x*) are dropped whole, since their
 * content is editorial apparatus and not the scripture text; remaining
 * character markers are stripped to a space.
 */
function parseUsfm(text) {
  const chapters = {};
  let curChap = null;
  let curVerse = null;
  let buffer = "";

  function flush() {
    if (curChap == null || curVerse == null) {
      buffer = "";
      return;
    }
    const clean = buffer
      .replace(/\\f\s.*?\\f\*/gs, "")
      .replace(/\\x\s.*?\\x\*/gs, "")
      .replace(/\\[a-z0-9]+\*?/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (clean) chapters[curChap].push({ n: curVerse, text: clean });
    buffer = "";
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("\\c ")) {
      flush();
      curChap = parseInt(line.slice(3).trim(), 10);
      curVerse = null;
      chapters[curChap] = [];
      continue;
    }
    if (line.startsWith("\\v ")) {
      flush();
      const m = line.match(/^\\v\s+(\d+)\s*(.*)$/);
      if (!m) continue;
      curVerse = parseInt(m[1], 10);
      buffer = m[2];
      continue;
    }
    if (curVerse == null) continue;
    buffer += " " + line;
  }
  flush();
  return chapters;
}

/** Every .usfm under `dir`, at any depth: some archives nest a folder. */
async function usfmFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await usfmFiles(full)));
    else if (/\.usfm$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function readBook(dir, code) {
  const files = await usfmFiles(dir);
  // USFM filenames carry the book code, e.g. "27-DAGeng-Brenton.usfm".
  const match = files.find((f) =>
    path.basename(f).toUpperCase().includes(code),
  );
  if (!match) return null;
  return parseUsfm(await fs.readFile(match, "utf8"));
}

function chapterFile(chapter, verses, source) {
  return (
    JSON.stringify(
      { book: "daniel", name: "Daniel", chapter, verses, source },
      null,
      2,
    ) + "\n"
  );
}

function fail(msg) {
  console.error(`\nREFUSING TO WRITE: ${msg}`);
  console.error("Nothing was changed. Scripture is not written on a guess.\n");
  process.exit(1);
}

async function main() {
  const { greek: haveGreek } = await ensureSources();

  const en = await readBook(SOURCES.en.dir, DANIEL_CODE);
  const enSus = await readBook(SOURCES.en.dir, SUSANNA_CODE);
  const enBel = await readBook(SOURCES.en.dir, BEL_CODE);
  if (!en) fail(`no ${DANIEL_CODE} (Daniel Greek) book found in the English source`);
  if (!enSus) fail(`no ${SUSANNA_CODE} (Susanna) book found in the English source`);
  if (!enBel) fail(`no ${BEL_CODE} (Bel and the Dragon) book found in the English source`);

  const enChapters = Object.keys(en).map(Number).sort((a, b) => a - b);
  const susVerses = Object.values(enSus)[0] ?? [];
  const belVerses = Object.values(enBel)[0] ?? [];

  // The assertions the original ingest lacked. These are the whole point of
  // this script: if the source shape changes, stop, do not write.
  if (enChapters.length !== 12)
    fail(`expected 12 chapters in Daniel, got ${enChapters.length}`);
  if ((en[3] ?? []).length < 90)
    fail(
      `Daniel 3 has ${(en[3] ?? []).length} verses, expected ~97. ` +
        `The Song of the Three Holy Children is missing from the source too.`,
    );
  if (susVerses.length < 60)
    fail(`Susanna has ${susVerses.length} verses, expected ~64`);
  if (belVerses.length < 40)
    fail(`Bel and the Dragon has ${belVerses.length} verses, expected ~42`);

  await fs.mkdir(EN_OUT, { recursive: true });
  for (const c of enChapters) {
    await fs.writeFile(
      path.join(EN_OUT, `${c}.json`),
      chapterFile(c, en[c], EN_SOURCE),
    );
  }
  await fs.writeFile(
    path.join(EN_OUT, "13.json"),
    chapterFile(13, susVerses, EN_SOURCE),
  );
  await fs.writeFile(
    path.join(EN_OUT, "14.json"),
    chapterFile(14, belVerses, EN_SOURCE),
  );
  console.log(
    `english: 12 chapters + Susanna (13, ${susVerses.length}v) + Bel (14, ${belVerses.length}v); ch3 = ${en[3].length}v`,
  );

  // Greek side. Best effort: the reader falls back gracefully when an
  // original-language chapter is absent, so a miss here is not fatal.
  const gr = haveGreek ? await readBook(SOURCES.gr.dir, DANIEL_CODE) : null;
  const grSus = haveGreek ? await readBook(SOURCES.gr.dir, SUSANNA_CODE) : null;
  const grBel = haveGreek ? await readBook(SOURCES.gr.dir, BEL_CODE) : null;
  if (gr) {
    await fs.mkdir(GR_OUT, { recursive: true });
    for (const c of Object.keys(gr).map(Number).sort((a, b) => a - b)) {
      await fs.writeFile(
        path.join(GR_OUT, `${c}.json`),
        chapterFile(c, gr[c], GR_SOURCE),
      );
    }
    if (grSus)
      await fs.writeFile(
        path.join(GR_OUT, "13.json"),
        chapterFile(13, Object.values(grSus)[0] ?? [], GR_SOURCE),
      );
    if (grBel)
      await fs.writeFile(
        path.join(GR_OUT, "14.json"),
        chapterFile(14, Object.values(grBel)[0] ?? [], GR_SOURCE),
      );
    console.log(
      `greek: ${Object.keys(gr).length} chapters` +
        `${grSus ? " + Susanna" : ""}${grBel ? " + Bel" : ""}`,
    );
  } else {
    console.log("greek: no DAG in the LXX source, skipped (reader degrades)");
  }

  // The manifest integer every route, pager, static param and sitemap entry
  // derives from. Nothing else has to change to make /bible/daniel/13 real.
  const books = JSON.parse(await fs.readFile(BOOKS_JSON, "utf8"));
  const daniel = books.find((b) => b.slug === "daniel");
  if (!daniel) fail("daniel missing from data/bible/books.json");
  daniel.chapters = 14;
  await fs.writeFile(BOOKS_JSON, JSON.stringify(books, null, 2) + "\n");
  console.log("books.json: daniel.chapters = 14");
  console.log("\ndone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
