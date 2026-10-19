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
import { isStreamed, readTiming, streamedPaths } from "@/lib/chants/media";
import { chantLineKey, chantTitleKey, kindKey, traditionKey } from "@/lib/chants/names";
import { allChants, chantIndex } from "@/lib/chants/registry.server";
import { chantSchema } from "@/lib/chants/schema";
import { CHANT_KINDS, CHANT_TRADITIONS } from "@/lib/chants/types";
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

  it("keeps a streamed recording, its timing file and its cover where the apps look for them", () => {
    for (const { c, v, id } of versions) {
      if (!isStreamed(v.audio.src)) continue;
      const want = streamedPaths(c.slug, v.id);
      expect(v.audio.src, id).toBe(want.audio);
      expect(v.timing, id).toBe(want.timing);
      expect(fs.existsSync(onDisk(v.audio.src)), `${id}: ${v.audio.src} is not on disk`).toBe(true);
      expect(fs.existsSync(onDisk(v.timing!)), `${id}: ${v.timing} is not on disk`).toBe(true);
    }
    for (const c of allChants()) if (c.cover) expect(fs.existsSync(onDisk(c.cover.src)), `${c.slug} cover`).toBe(true);
  });

  it("records the length its recording really has", () => {
    for (const { v, id } of versions) {
      const file = onDisk(v.audio.src);
      if (!fs.existsSync(file) || !file.endsWith(".mp3")) continue;
      expect(Math.abs(mp3Duration(file) - v.audio.durationSec), id).toBeLessThan(1);
    }
  });

  it("is timed line for line on the Church's words, never the transcript's", () => {
    // Note 28: the words shown are the published text; a transcript only
    // gives each line its time. So the timing file's text must be the data
    // file's, line for line, and its times must run forward inside the
    // recording.
    for (const { v, id } of versions) {
      if (!v.timing) continue;
      const timing = readTiming(JSON.parse(fs.readFileSync(onDisk(v.timing), "utf8")));
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

  it("sings a psalm in Brenton's words, verbatim, when its English is Brenton's", () => {
    for (const { c, v, id } of versions) {
      if (c.kind !== "psalm" || !c.psalm) continue;
      const brenton = (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", "psalms", `${c.psalm}.json`), "utf8")) as {
        verses: { text: string }[];
      }).verses
        .map((x) => x.text)
        .join(" ");
      const english = v.language.startsWith("en") ? v.lines.map((l) => l.text) : v.lines.map((l) => l.en).filter(Boolean);
      const isBrenton = v.translation?.title.includes("Brenton") || v.language.startsWith("en");
      if (!isBrenton) continue;
      for (const line of english) expect(brenton.includes(line as string), `${id}: "${line}" is not Brenton's`).toBe(true);
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

  it("records every recording in the provenance document, by its path", () => {
    for (const c of allChants()) {
      for (const v of c.variants) {
        const file = `public${v.audio.src}`;
        expect(doc.includes("`" + file + "`"), `${file} has no row in docs/licensing/audio-provenance.md`).toBe(true);
      }
    }
  });

  it("never claims a licence for a chant recording", () => {
    // The owner's decision of 2026-10-16: the recordings he sends are not
    // licensed, and the record says so. The chants' rows say "none".
    const section = doc.slice(doc.indexOf("## Chants"));
    expect(doc.indexOf("## Chants"), "the Chants section of the provenance document").toBeGreaterThan(-1);
    for (const row of section.split("\n").filter((l) => l.startsWith("| `public/audio/chants/"))) {
      expect(row, row).toMatch(/\|\s*none\s*\|/i);
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
