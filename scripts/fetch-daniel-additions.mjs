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
// The Greek archive keeps the Song of the Three as its own book (S3Y) and
// leaves DAG on the short Aramaic division. Brenton's English DAG carries
// the Song inline. See alignGreekToBrenton.
const SONG_CODE = "S3Y";

/**
 * Put the Greek on Brenton's chapter division so the interlinear lines up.
 *
 * The two sources divide Daniel differently, and the first run wrote them
 * out as they came: English chapter 3 ran to 97 while Greek chapter 3
 * stopped at 33, so the whole restored Song had a blank Greek column and
 * every verse of Daniel 4 was three out. The reader joins the panes on the
 * verse number alone (app/(app)/bible/[book]/[chapter]/page.tsx), so a
 * mismatched division silently pairs the wrong lines rather than failing.
 *
 * The mapping below was not assumed, it was read off the two texts by
 * matching the sentences at each seam:
 *
 *   EN 3:91 "And Nabuchodonosor heard them singing praises"
 *     == GR 3:24 "Καὶ Ναβουχοδονόσορ ἤκουσεν ὑμνούντων αὐτῶν"
 *   EN 4:1  "King Nabuchodonosor to all nations, tribes, and tongues"
 *     == GR 3:31 "Ναβουχοδονόσορ ὁ βασιλεὺς πᾶσι τοῖς λαοῖς, φυλαῖς"
 *   EN 6:1  "And Darius the Mede succeeded to the kingdom"
 *     == GR 5:31 "καὶ Δαρεῖος ὁ Μῆδος παρέλαβε τὴν βασιλείαν"
 *
 * Chapters 1, 2 and 7 to 12 already agree and pass through untouched.
 */
// Brenton's own numbering of the Song, which is not contiguous: it runs
// 25-66, omits 67-70 entirely, then resumes 71-90.
const SONG_EN_HEAD = Array.from({ length: 42 }, (_, i) => 25 + i);
const SONG_EN_GAP = 4;
const SONG_EN_TAIL = Array.from({ length: 20 }, (_, i) => 71 + i);

function alignGreekToBrenton(gr, song) {
  const at = (chap, n) => (gr[chap] ?? []).find((v) => v.n === n);
  const out = {};
  for (const c of Object.keys(gr).map(Number)) out[c] = [...gr[c]];

  // Chapter 3: the furnace narrative keeps 1-23; the Song is spliced in at
  // 24-90 from S3Y (its verse 1 is Brenton's 3:24); the narrative that the
  // short division numbers 24-30 becomes 91-97.
  const ch3 = [];
  for (let n = 1; n <= 23; n++) {
    const v = at(3, n);
    if (v) ch3.push({ n, text: v.text });
  }
  // The Song deliberately gets NO Greek line, and this is the honest answer
  // rather than a shortfall. Brenton and this Greek edition do not merely
  // number the canticle differently, they order it differently: Brenton's
  // 3:71 is "O ye nights and days" where the Greek at the same point reads
  // "bless ye, cold and heat". Verse 25 and verses 88 to 90 line up, the
  // middle does not, and no offset reconciles them because the mismatch is
  // in the sequence itself. Splicing on a best guess would pair English
  // verses with Greek verses that are not their counterparts, which is worse
  // than an empty column: the reader would have no way to know. The pane
  // renders blank for 3:24-90 until a Greek text on Brenton's own order is
  // sourced.

  for (let n = 24; n <= 30; n++) {
    const v = at(3, n);
    if (v) ch3.push({ n: n + 67, text: v.text });
  }
  out[3] = ch3.sort((a, b) => a.n - b.n);

  // Chapter 4: the short division's 3:31-33 open it, then its own 1-34
  // shift down by three.
  const ch4 = [];
  for (let n = 31; n <= 33; n++) {
    const v = at(3, n);
    if (v) ch4.push({ n: n - 30, text: v.text });
  }
  for (const v of gr[4] ?? []) ch4.push({ n: v.n + 3, text: v.text });
  out[4] = ch4.sort((a, b) => a.n - b.n);

  // Chapter 5 keeps 1-30; its verse 31 is Brenton's 6:1, and chapter 6
  // shifts down by one behind it.
  out[5] = (gr[5] ?? []).filter((v) => v.n <= 30).map((v) => ({ n: v.n, text: v.text }));
  const ch6 = [];
  const darius = at(5, 31);
  if (darius) ch6.push({ n: 1, text: darius.text });
  for (const v of gr[6] ?? []) ch6.push({ n: v.n + 1, text: v.text });
  out[6] = ch6.sort((a, b) => a.n - b.n);

  return out;
}

/**
 * The write stream is opened only after a 200 is in hand.
 *
 * It used to be opened first, which meant a DNS failure or a 404 still
 * created the destination file. That empty file then looked like a cached
 * archive to the next run, so the download was skipped and unzip failed on
 * nothing, reporting a corrupt archive for what was really a network fault.
 * Nothing touches the destination path unless there is a body to write.
 */
function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          if (redirectsLeft <= 0) {
            return reject(new Error(`too many redirects for ${url}`));
          }
          const next = new URL(res.headers.location, url).toString();
          return download(next, dest, redirectsLeft - 1).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const file = fssync.createWriteStream(dest);
        file.on("error", (e) => {
          file.close();
          reject(e);
        });
        res.on("error", (e) => {
          file.close();
          try {
            fssync.unlinkSync(dest);
          } catch {
            /* nothing to clean up */
          }
          reject(e);
        });
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
/**
 * A cached archive is only usable if it is actually an archive.
 *
 * `existsSync` alone is not enough: an earlier run of this script created
 * the write stream before it knew whether the request would succeed, so a
 * DNS failure left a ZERO-BYTE .zip behind. On the next run that file
 * exists, the download is skipped, and unzip fails on an empty archive,
 * which reads as a corrupt download rather than as the network problem it
 * actually was. Checking the PKZip magic bytes also catches the other
 * classic failure here, an HTML error page saved under a .zip name.
 */
function hasUsableArchive(zip) {
  let fd;
  try {
    if (!fssync.existsSync(zip)) return false;
    if (fssync.statSync(zip).size < 1024) return false;
    const magic = Buffer.alloc(2);
    fd = fssync.openSync(zip, "r");
    fssync.readSync(fd, magic, 0, 2, 0);
    return magic.toString("latin1") === "PK";
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fssync.closeSync(fd);
  }
}

async function ensureSource(name, s, { optional = false } = {}) {
  await fs.mkdir(TMP, { recursive: true });
  if (!hasUsableArchive(s.zip)) {
    // Clear the unusable remnant so the download below is not skipped and
    // so a half-written file never reaches unzip.
    try {
      if (fssync.existsSync(s.zip)) {
        console.log(`  discarding unusable ${path.basename(s.zip)}`);
        fssync.unlinkSync(s.zip);
      }
    } catch {
      /* best effort */
    }
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
  let curSuffix = "";
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
      // A stripped marker leaves a space where it stood, so `\add saying\add*,`
      // came out as "saying ,". This affected every verse whose markup sat
      // against punctuation: 135 of Daniel's verses changed wording on the
      // first run purely from this.
      .replace(/\s+([,.;:!?·])/g, "$1")
      .replace(/([([«])\s+/g, "$1")
      .trim();
    if (!clean) {
      buffer = "";
      return;
    }
    // A lettered verse (Brenton numbers two lines of the Song 72a and 72b)
    // is a subdivision of the verse before it, not a new one. Appending
    // keeps one entry per number: emitting three verses numbered 72 gave
    // three DOM nodes the same `v72` id, so the deep link and the
    // commentary anchor both resolved to the wrong line.
    const existing = chapters[curChap];
    const prev = existing.length ? existing[existing.length - 1] : null;
    if (curSuffix && prev && prev.n === curVerse) {
      prev.text += " " + clean;
    } else {
      existing.push({ n: curVerse, text: clean });
    }
    buffer = "";
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("\\c ")) {
      flush();
      curChap = parseInt(line.slice(3).trim(), 10);
      curVerse = null;
      curSuffix = "";
      chapters[curChap] = [];
      continue;
    }
    if (line.startsWith("\\v ")) {
      flush();
      // The letter suffix is captured, not discarded. Dropping it silently
      // turned "\v 72a O ye frost and heat" into verse 72 with the text
      // "a O ye frost and heat".
      const m = line.match(/^\\v\s+(\d+)([a-z]?)\s*(.*)$/);
      if (!m) continue;
      curVerse = parseInt(m[1], 10);
      curSuffix = m[2];
      buffer = m[3];
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

  // A floor is not enough. The first run passed `>= 90` with a chapter 3
  // that carried three verses numbered 72, and nothing here looked at the
  // Greek at all, so the interlinear shipped misaligned through four
  // chapters. These assert the shape, not just the size.
  for (const [c, verses] of Object.entries(en)) {
    const seen = new Set();
    for (const v of verses) {
      if (seen.has(v.n)) fail(`Daniel ${c}:${v.n} appears more than once in the English`);
      seen.add(v.n);
    }
    const stray = verses.find((v) => /^[a-z]\s/.test(v.text));
    if (stray)
      fail(
        `Daniel ${c}:${stray.n} begins with a stray letter (${JSON.stringify(stray.text.slice(0, 20))}). ` +
          `A lettered verse marker leaked into the text.`,
      );
  }
  const spaced = Object.entries(en).flatMap(([c, vs]) =>
    vs.filter((v) => /\s[,.;:]/.test(v.text)).map((v) => `${c}:${v.n}`),
  );
  if (spaced.length)
    fail(`space before punctuation in ${spaced.length} verse(s), e.g. Daniel ${spaced[0]}`);

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
    const grS3y = haveGreek ? await readBook(SOURCES.gr.dir, SONG_CODE) : null;
    const aligned = alignGreekToBrenton(gr, grS3y);
    await fs.mkdir(GR_OUT, { recursive: true });
    for (const c of Object.keys(aligned).map(Number).sort((a, b) => a - b)) {
      await fs.writeFile(
        path.join(GR_OUT, `${c}.json`),
        chapterFile(c, aligned[c], GR_SOURCE),
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
