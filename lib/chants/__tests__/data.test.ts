// Every chant file in data/chants, held to the shape, the words and the rights.
//
// A chant is added by adding files (docs/chants/ADDING-A-CHANT.md), and this
// is what says the files agree with each other and with the app: the schema,
// the slug, the two catalog lines in all twenty-one languages, the
// recordings and timing files on disk, the words line for line, the
// provenance record, and the standing rules (no em dash, no invented
// licence, prose marked for a future clergy review).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { bucketRecording, chantPaths, inBucket, isStreamed, legacyTimingPath, readTiming } from "@/lib/chants/media";
import { timingFiles } from "@/lib/chants/timing.server";
import { chantLineKey, chantTitleKey, kindKey, traditionKey } from "@/lib/chants/names";
import { allChants, chantIndex } from "@/lib/chants/registry.server";
import { chantSchema, timingSchema } from "@/lib/chants/schema";
import { CHANT_KINDS, CHANT_TIMING, CHANT_TRADITIONS } from "@/lib/chants/types";
// Plain ESM, shared with the intake script that prints a recording's length.
import { mp3Duration } from "../../../scripts/chants/mp3.mjs";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "chants");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
const catalog = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "i18n", "messages", `${code}.json`), "utf8")) as Record<string, string>;
const CATALOGS = Object.fromEntries(LOCALES.map((l) => [l.code, catalog(l.code)]));
const EN = CATALOGS.en;
const LONG_DASH = String.fromCharCode(0x2014);
const onDisk = (webPath: string) => path.join(ROOT, "public", webPath.replace(/^\//, ""));
/** A timing file's source: /chant-timing/<slug>/<id>.json is data/chants/timing/<slug>/<id>.json. */
const inData = (webPath: string) => path.join(ROOT, "data", "chants", "timing", webPath.slice(CHANT_TIMING.length));

/** Letters of a script other than Latin: a line in it is given a transliteration. */
const NON_LATIN = /[Ͱ-Ͽἀ-῿Ѐ-ԯ֐-׿؀-ۿݐ-ݿႠ-ჿᲐ-Ჿ԰-֏]/;

describe("the chant files", () => {
  const chants = allChants();

  it("are there, each read and named by its slug", () => {
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(chants.length).toBe(files.length);
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
      const parsed = chantSchema.safeParse(raw);
      expect(parsed.success, `${file}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues[0])}`).toBe(true);
      expect(`${raw.slug}.json`).toBe(file);
    }
    expect(new Set(chants.map((c) => c.key)).size).toBe(chants.length);
  });

  it("have no em dash anywhere", () => {
    for (const file of files) expect(fs.readFileSync(path.join(DIR, file), "utf8").includes(LONG_DASH), file).toBe(false);
  });

  it("name each chant in all twenty-one languages, the English as the file has it", () => {
    expect(LOCALES.length).toBe(21);
    const gaps: string[] = [];
    for (const c of chants) {
      expect(EN[chantTitleKey(c.key)], c.slug).toBe(c.title);
      for (const { code } of LOCALES) {
        for (const key of [chantTitleKey(c.key), chantLineKey(c.key)]) {
          const v = CATALOGS[code][key];
          if (typeof v !== "string" || !v.trim()) gaps.push(`${code}: ${key}`);
          else if (v.includes(LONG_DASH)) gaps.push(`${code}: ${key} has a long dash`);
        }
      }
    }
    expect(gaps).toEqual([]);
  });

  it("name every tradition and kind of chant in all twenty-one languages", () => {
    // Computed keys (lib/chants/names.ts): keysExist.test.ts cannot see them.
    const gaps: string[] = [];
    for (const { code } of LOCALES) {
      for (const key of [...CHANT_TRADITIONS.map(traditionKey), ...CHANT_KINDS.map(kindKey)]) {
        const v = CATALOGS[code][key];
        if (typeof v !== "string" || !v.trim()) gaps.push(`${code}: ${key}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it("use catalog keys for their prose only where the English is the file's", () => {
    for (const c of chants) {
      for (const part of ["what", "history", "when"] as const) {
        const key = c.aboutKeys?.[part];
        if (key) expect(EN[key], `${c.slug} ${part}`).toBe(c.about[part]);
      }
    }
  });

  it("are marked for a future clergy review until one is done", () => {
    // The owner's standing note of 2026-10-16: no priest reviews Purify yet,
    // so every chant's prose ships marked (docs/editorial-standards.md).
    for (const c of chants) expect(c.review.status, c.slug).toBe("awaiting-clergy-review");
  });

  it("cite a source for every chant of the Church's services", () => {
    // A song of our own time (the Anthem) has no printed source to cite, and
    // says so in its words' source line instead.
    for (const c of chants) {
      const liturgical = c.variants.some((v) => v.tradition !== "contemporary");
      if (liturgical) expect(c.sources.length, `${c.slug} cites nothing`).toBeGreaterThan(0);
    }
  });

  it("point only at chants that exist", () => {
    const slugs = new Set(chants.map((c) => c.slug));
    for (const c of chants) for (const r of c.related ?? []) expect(slugs.has(r), `${c.slug} -> ${r}`).toBe(true);
  });
});

describe("each version of a chant", () => {
  const versions = allChants().flatMap((c) => c.variants.map((v) => ({ c, v, id: `${c.slug}/${v.id}` })));

  it("has its own id, says where its words come from, and plays a stretch it has", () => {
    for (const c of allChants()) expect(new Set(c.variants.map((v) => v.id)).size, c.slug).toBe(c.variants.length);
    for (const { v, id } of versions) {
      expect(v.wordsSource.trim().length, id).toBeGreaterThan(10);
      expect(v.preview.to, id).toBeGreaterThan(v.preview.from);
      expect(v.preview.to, id).toBeLessThanOrEqual(v.audio.durationSec);
    }
  });

  it("keeps a streamed recording and its cover where the apps look for them", () => {
    for (const { c, v, id } of versions) {
      if (!isStreamed(v.audio.src)) continue;
      const want = chantPaths(c.slug, v.id);
      if (inBucket(v.audio.src)) {
        // 1.8: the sound is the bucket's alone, and never also in the
        // repository.
        expect(v.audio.src, id).toBe(bucketRecording(c.slug, v.id));
        expect(fs.existsSync(onDisk(want.audio)), `${id}: a copy of a bucket recording is in the repository`).toBe(false);
        continue;
      }
      expect(v.audio.src, id).toBe(want.audio);
      expect(fs.existsSync(onDisk(v.audio.src)), `${id}: ${v.audio.src} is not on disk`).toBe(true);
    }
    for (const c of allChants()) if (c.cover) expect(fs.existsSync(onDisk(c.cover.src)), `${c.slug} cover`).toBe(true);
  });

  it("carries its timing file in the app, beside its words (note 78)", () => {
    // Build 86: the apps asked the website for each timing file, the website
    // still ran 1.8 as launched, and Psalm 135 and Psalm 117 were not timed
    // on the owner's phone. The file is in the bundle now, written out at
    // build time from data/chants/timing by app/chant-timing.
    const served = new Set(timingFiles().map((f) => `${CHANT_TIMING}${f.slug}/${f.file}`));
    for (const { c, v, id } of versions) {
      if (!v.timing) continue;
      expect(v.timing, id).toBe(chantPaths(c.slug, v.id).timing);
      expect(fs.existsSync(inData(v.timing)), `${id}: ${inData(v.timing)} is not on disk`).toBe(true);
      expect(served.has(v.timing), `${id}: ${v.timing} is not written out by app/chant-timing`).toBe(true);
    }
    // Nothing written out that no version reads.
    const read = new Set(versions.map(({ v }) => v.timing).filter(Boolean));
    expect([...served].filter((p) => !read.has(p))).toEqual([]);
  });

  it("leaves the website's old timing files as the builds through 86 read them", () => {
    // Those builds ask the website for /audio/chants/<slug>/<id>.json and
    // read only a version 1 file whose lines are their own words, so the
    // copies stay there, frozen as build 86 had them. Never edit one.
    for (const { c, v, id } of versions) {
      const legacy = onDisk(legacyTimingPath(c.slug, v.id));
      if (!fs.existsSync(legacy)) continue;
      const old = JSON.parse(fs.readFileSync(legacy, "utf8")) as { v: number; lines: unknown[] };
      expect(old.v, `${id}: ${legacy}`).toBe(1);
      expect(Array.isArray(old.lines) && old.lines.length > 0, id).toBe(true);
    }
  });

  it("records the length its recording really has", () => {
    // A bucket recording's length was read from the file that was uploaded
    // (scripts/chants/prepare-audio.mjs prints it); its timing file, below,
    // holds the same length.
    for (const { v, id } of versions) {
      if (inBucket(v.audio.src)) continue;
      const file = onDisk(v.audio.src);
      if (!fs.existsSync(file) || !file.endsWith(".mp3")) continue;
      expect(Math.abs(mp3Duration(file) - v.audio.durationSec), id).toBeLessThan(1);
    }
  });

  it("keeps every recording since the Anthem out of the repository", () => {
    // The owner, 2026-10-30: the recordings live in the bucket, not in the
    // public repository. Only the Anthem's three, from 1.7, stay.
    expect(fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8")).toMatch(/^public\/audio\/chants\/\*\*\/\*\.mp3$/m);
    const mp3s = fs
      .readdirSync(path.join(ROOT, "public", "audio", "chants"), { recursive: true })
      .map((f) => String(f).split(path.sep).join("/"))
      .filter((f) => f.endsWith(".mp3"));
    expect(mp3s.sort()).toEqual(["prayer-rope-anthem/ar.mp3", "prayer-rope-anthem/en.mp3", "prayer-rope-anthem/fr.mp3"]);
  });

  it("is timed line for line on the Church's words, never the transcript's", () => {
    // Note 28: the words shown are the published text; a transcript only
    // gives each line its time. So the timing file's text must be the data
    // file's, line for line, and its times must run forward inside the
    // recording.
    for (const { v, id } of versions) {
      if (!v.timing) continue;
      const timing = readTiming(JSON.parse(fs.readFileSync(inData(v.timing), "utf8")));
      expect(timing, `${id}: the timing file does not read`).not.toBeNull();
      expect(timing!.lines.map((l) => l.text), id).toEqual(v.lines.map((l) => l.text));
      expect(Math.abs(timing!.durationSec - v.audio.durationSec), id).toBeLessThan(1);
      let last = -1;
      for (const l of timing!.lines) {
        expect(l.at, id).toBeGreaterThan(last);
        expect(l.end, id).toBeGreaterThan(l.at);
        expect(l.end, id).toBeLessThanOrEqual(timing!.durationSec + 0.01);
        last = l.at;
      }
    }
  });

  it("times every word it shows, each inside its line and in order (note 78)", () => {
    // The owner: "each word timestamped and followed in the lyrics section".
    // Every timing file is version 2 (scripts/chants/time-words.mjs): a start
    // and an end for every word of every line, as the app splits the line.
    for (const { v, id } of versions) {
      if (!v.timing) continue;
      const raw = JSON.parse(fs.readFileSync(inData(v.timing), "utf8"));
      const parsed = timingSchema.safeParse(raw);
      expect(parsed.success, `${id}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues[0])}`).toBe(true);
      expect(raw.v, `${id} is not timed word by word`).toBe(2);
      raw.lines.forEach((l: { at: number; end: number; text: string; words: [number, number][]; unheard?: number[] }, i: number) => {
        const where = `${id} line ${i + 1}`;
        const words = l.text.split(/\s+/).filter(Boolean);
        expect(l.words.length, where).toBe(words.length);
        let last = -Infinity;
        for (const [at, end] of l.words) {
          expect(at, where).toBeGreaterThanOrEqual(l.at - 0.005);
          expect(end, where).toBeLessThanOrEqual(l.end + 0.005);
          expect(end, where).toBeGreaterThanOrEqual(at);
          expect(at, where).toBeGreaterThan(last);
          last = at;
        }
        for (const k of l.unheard ?? []) expect(k, where).toBeLessThan(words.length);
      });
    }
  });

  it("transliterates only a script that is not Latin, and puts English only under another language", () => {
    for (const { v, id } of versions) {
      for (const line of v.lines) {
        if (line.translit) expect(NON_LATIN.test(line.text), `${id}: "${line.text}" is Latin and has a transliteration`).toBe(true);
        if (line.en) expect(v.language.startsWith("en"), `${id}: an English line under English`).toBe(false);
      }
      const withEnglish = v.lines.some((l) => l.en);
      if (withEnglish) expect(v.translation, `${id}: English with no word of where it comes from`).toBeDefined();
    }
  });

  it("gives every Arabic line its sound, and every sound a word for each word sung (notes 56 and 59)", () => {
    // The owner: "you should also have the option to switch it to English
    // transliteration. So you could see the pronunciation of each Arabic
    // word." Both together draws each word over its sound, so a line's
    // transliteration has exactly as many words as the line.
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    for (const { v, id } of versions) {
      if (v.language === "ar") for (const line of v.lines) expect(line.translit, `${id}: "${line.text}" has no transliteration`).toBeTruthy();
      for (const line of v.lines) {
        if (!line.translit) continue;
        expect(words(line.translit).length, `${id}: "${line.text}" / "${line.translit}"`).toBe(words(line.text).length);
        // One plain scheme an English reader can say: Latin letters, an
        // apostrophe and a hyphen, no scholar's marks.
        expect(line.translit, `${id}: "${line.translit}"`).toMatch(/^[A-Za-z' ,.;:!?-]+$/);
      }
    }
  });

  it("sings Psalm 135's English as the choir does, every line verbatim from a public-domain printing", () => {
    // The owner, 2026-10-31: "give thanks unto the Lord. You can't copyright
    // those words." The choir sings a modern psalter; each line here is the
    // King James's, or where its wording differs from the singing, the
    // nearest line of another public-domain printing, word for word
    // (docs/chants/psalm-135-english.md). Never the choir's own psalter.
    const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/chants/__tests__/fixtures/psalm-135-en-printings.json"), "utf8")) as {
      printings: Record<string, { halves: string[]; refrain?: string }>;
    };
    const printings = Object.values(fixture.printings);
    expect(printings.every((p) => p.halves.length === 26)).toBe(true);
    const en = allChants().find((c) => c.slug === "psalm-135")!.variants.find((v) => v.id === "en")!;
    expect(en.lines).toHaveLength(104);
    en.lines.forEach((line, i) => {
      const verse = Math.floor(i / 4);
      if (i % 2 === 1) expect(line.text, `line ${i + 1}`).toBe("Alleluia.");
      else if (i % 4 === 2) expect(line.text, `line ${i + 1}`).toBe(fixture.printings.kjv.refrain);
      else expect(printings.some((p) => p.halves[verse] === line.text), `line ${i + 1}: "${line.text}" is in no printing of verse ${verse + 1}`).toBe(true);
    });
    // The King James is the base: the choir's first verse, its refrain and its last verse are its words.
    expect(en.lines[0].text).toBe(fixture.printings.kjv.halves[0]);
    expect(en.lines[100].text).toBe(fixture.printings.kjv.halves[25]);
    // The fixture holds Brenton as Purify's Bible has it.
    const brenton135 = (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", "psalms", "135.json"), "utf8")) as { verses: { text: string }[] }).verses
      .map((x) => x.text)
      .join(" ");
    for (const half of fixture.printings.brenton.halves) expect(brenton135.includes(half), half).toBe(true);
  });

  it("sings a psalm in Brenton's words, verbatim, when its English is Brenton's", () => {
    // Alleluia, sung after each half verse of the Polyeleos, is the Church's
    // refrain (Hapgood, 1906, p. 28) and Brenton's own title of the psalm
    // (Psalms 117 and 135 open "Alleluia."), not a line of its verses.
    const REFRAIN = "Alleluia.";
    for (const { c, v, id } of versions) {
      if (c.kind !== "psalm" || !c.psalm) continue;
      // Psalm 135's English is held line by line to its printings, above.
      if (c.slug === "psalm-135" && v.language.startsWith("en")) continue;
      const brenton = (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", "psalms", `${c.psalm}.json`), "utf8")) as {
        verses: { text: string }[];
      }).verses
        .map((x) => x.text)
        .join(" ");
      const english = v.language.startsWith("en") ? v.lines.map((l) => l.text) : v.lines.map((l) => l.en).filter(Boolean);
      const isBrenton = v.translation?.title.includes("Brenton") || v.language.startsWith("en");
      if (!isBrenton) continue;
      for (const line of english) {
        if (line === REFRAIN) continue;
        expect(brenton.includes(line as string), `${id}: "${line}" is not Brenton's`).toBe(true);
      }
    }
  });

  it("shows every Alleluia where it is sung in Psalm 135, one line after each half verse (note 59)", () => {
    // The owner: "he says hallelujah at the end, and it's not referenced in
    // the caption." Every version of the psalm sings it after each half.
    const psalm = allChants().find((c) => c.slug === "psalm-135")!;
    const ALLELUIA: Record<string, string> = { en: "Alleluia.", el: "Ἀλληλούϊα.", "sr-Latn": "Aliluja.", ar: "الليلويا." };
    for (const v of psalm.variants) {
      const refrain = ALLELUIA[v.language];
      expect(refrain, v.id).toBeDefined();
      v.lines.forEach((line, i) => expect(line.text === refrain, `${v.id} line ${i + 1}: "${line.text}"`).toBe(i % 2 === 1));
      // Every version is timed now, so the lit line follows the voice.
      expect(v.timing, `${v.id} has no timing file`).toBeDefined();
    }
  });
});

describe("the rights and the takedown list", () => {
  const doc = fs.readFileSync(path.join(ROOT, "docs", "licensing", "audio-provenance.md"), "utf8");
  const live = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "audio", "chants", "live.json"), "utf8")) as {
    live: string[];
    pulled: string[];
  };
  const refs = new Set(allChants().flatMap((c) => c.variants.map((v) => `${c.slug}/${v.id}`)));

  it("records every recording in the provenance document, by its path or its address", () => {
    for (const c of allChants()) {
      for (const v of c.variants) {
        const file = inBucket(v.audio.src) ? v.audio.src : `public${v.audio.src}`;
        expect(doc.includes("`" + file + "`"), `${file} has no row in docs/licensing/audio-provenance.md`).toBe(true);
      }
    }
  });

  it("never claims a licence for a chant recording", () => {
    // The owner's decision of 2026-10-16: the recordings he sends are not
    // licensed, and the record says so. The chants' rows say "none".
    const section = doc.slice(doc.indexOf("## Chants"));
    expect(doc.indexOf("## Chants"), "the Chants section of the provenance document").toBeGreaterThan(-1);
    const rows = section.split("\n").filter((l) => l.startsWith("| `public/audio/chants/") || l.startsWith("| `https://audio.purifyapp.net/chants/"));
    expect(rows.length).toBeGreaterThanOrEqual(allChants().flatMap((c) => c.variants).length);
    for (const row of rows) expect(row, row).toMatch(/\|\s*none\s*\|/i);
  });

  it("can take every recording down with one line, each row naming its own", () => {
    // The takedown line is the row's last cell: the "<slug>/<id>" that moves
    // from live to pulled in live.json.
    for (const c of allChants()) {
      for (const v of c.variants) {
        const file = inBucket(v.audio.src) ? v.audio.src : `public${v.audio.src}`;
        const row = doc.split("\n").find((l) => l.startsWith("| `" + file + "`"));
        expect(row, file).toBeDefined();
        expect(row!.trim().endsWith("| `" + `${c.slug}/${v.id}` + "` |"), `${file}: its takedown line`).toBe(true);
      }
    }
  });

  it("names only real recordings, each in one list", () => {
    for (const ref of [...live.live, ...live.pulled]) expect(refs.has(ref), `live.json names ${ref}`).toBe(true);
    expect(live.live.filter((r) => live.pulled.includes(r))).toEqual([]);
  });

  it("lists every streamed recording one way or the other", () => {
    // A recording in neither list never plays (it fails closed), which is
    // safe and also almost certainly a forgotten step.
    for (const c of allChants()) {
      for (const v of c.variants) {
        if (!isStreamed(v.audio.src)) continue;
        const ref = `${c.slug}/${v.id}`;
        expect(live.live.includes(ref) || live.pulled.includes(ref), `${ref} is in neither list`).toBe(true);
      }
    }
  });

  it("keeps the index small: no words and no prose in it", () => {
    const json = JSON.stringify(chantIndex());
    expect(json).not.toContain('"lines"');
    expect(json).not.toContain('"about"');
    expect(json).not.toContain('"wordsSource"');
  });
});
