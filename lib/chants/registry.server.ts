import "server-only";

import fs from "node:fs";
import path from "node:path";

import { chantSchema } from "./schema";
import type { Chant, ChantIndexRow, ChantTradition } from "./types";

/**
 * Every chant, read from data/chants/<slug>.json when the pages are built.
 *
 * A new chant is a new file in that folder and nothing here changes
 * (docs/chants/ADDING-A-CHANT.md). Each file is checked against the schema
 * as it is read, and its name must be its slug, so a file that does not
 * match stops the build with its name rather than drawing a broken page.
 *
 * Server only: the pages are built from it, and each hands its client the
 * part it shows (AGENTS.md, "a page carries what it shows"). The home gets
 * the index (no words), a chant's page gets that chant, and Pray with chant
 * fetches the index the export writes as a file (app/chants-index.json).
 */
const DIR = path.join(process.cwd(), "data", "chants");

let cache: Chant[] | null = null;

/** Every chant file, hidden ones included, sorted by slug. */
export function allChants(): Chant[] {
  if (cache) return cache;
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort() : [];
  cache = files.map((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as unknown;
    const parsed = chantSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new Error(`data/chants/${file}: ${first?.path.join(".") ?? ""} ${first?.message ?? "does not match the chant schema"}`);
    }
    const chant = parsed.data as Chant;
    if (`${chant.slug}.json` !== file) throw new Error(`data/chants/${file}: its slug is "${chant.slug}", so the file must be ${chant.slug}.json`);
    return chant;
  });
  return cache;
}

/** The chants readers see. */
export function liveChants(): Chant[] {
  return allChants().filter((c) => c.status === "live");
}

export function chantBySlug(slug: string): Chant | null {
  return liveChants().find((c) => c.slug === slug) ?? null;
}

/** A chant as a list shows it: no words, no prose. */
export function indexRow(chant: Chant): ChantIndexRow {
  const traditions: ChantTradition[] = [];
  for (const v of chant.variants) if (!traditions.includes(v.tradition)) traditions.push(v.tradition);
  return {
    slug: chant.slug,
    key: chant.key,
    title: chant.title,
    ...(chant.originalTitle ? { originalTitle: chant.originalTitle } : {}),
    kind: chant.kind,
    ...(chant.tone ? { tone: chant.tone } : {}),
    ...(chant.psalm ? { psalm: chant.psalm } : {}),
    when: chant.when,
    ...(chant.cover ? { cover: chant.cover } : {}),
    addedOn: chant.addedOn,
    traditions,
    shortest: Math.min(...chant.variants.map((v) => v.audio.durationSec)),
    // Everything a list or a player needs of each recording, and not the words.
    variants: chant.variants.map((v) => ({
      id: v.id,
      language: v.language,
      label: v.label,
      tradition: v.tradition,
      ...(v.setting ? { setting: v.setting } : {}),
      performer: v.performer,
      audio: v.audio,
      ...(v.timing ? { timing: v.timing } : {}),
      preview: v.preview,
      ...(v.underPrayer ? { underPrayer: true } : {}),
      ...(v.rtl ? { rtl: true } : {}),
    })),
  };
}

/** Every live chant, newest first, as the lists take them. */
export function chantIndex(): ChantIndexRow[] {
  return liveChants()
    .map(indexRow)
    .sort((a, b) => b.addedOn.localeCompare(a.addedOn) || a.title.localeCompare(b.title));
}

/** The first sentence of a text, for a page's description. */
export function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return (m ? m[1] : text).trim();
}
