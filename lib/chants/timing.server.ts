import "server-only";

import fs from "node:fs";
import path from "node:path";

import { readTiming } from "./media";
import { allChants } from "./registry.server";
import type { ChantTiming } from "./types";

/**
 * Every version's timing file, kept beside the words in
 * data/chants/timing/<slug>/<id>.json (1.8, build 86 note 78), and written
 * out at build time by app/chant-timing/[slug]/[file] as
 * /chant-timing/<slug>/<id>.json. So the apps carry the timing of the words
 * they show, and never ask a website that may still run an older build
 * (lib/chants/types.ts, CHANT_TIMING). A few kilobytes each.
 */
const DIR = path.join(process.cwd(), "data", "chants", "timing");
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Every timing file there is, as the route's params: { slug, file: "<id>.json" }. */
export function timingFiles(): { slug: string; file: string }[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((slug) => NAME.test(slug) && fs.statSync(path.join(DIR, slug)).isDirectory())
    .sort()
    .flatMap((slug) =>
      fs
        .readdirSync(path.join(DIR, slug))
        .filter((file) => file.endsWith(".json") && NAME.test(file.slice(0, -5)))
        .sort()
        .map((file) => ({ slug, file })),
    );
}

/** One timing file, checked; null when there is none or it does not read. */
export function timingFile(slug: string, file: string): ChantTiming | null {
  if (!NAME.test(slug) || !file.endsWith(".json") || !NAME.test(file.slice(0, -5))) return null;
  const at = path.join(DIR, slug, file);
  if (!fs.existsSync(at)) return null;
  try {
    return readTiming(JSON.parse(fs.readFileSync(at, "utf8")));
  } catch {
    return null;
  }
}

/**
 * A timing file as the app is given it: without the lines its version hides
 * (build 93, ChantLine.hidden), so the words a page shows and the times it is
 * given stay line for line, and Pray with chant, which draws a timing file's
 * own words (lib/chants/play.ts captionsFromTiming), never shows a hidden
 * line. The file on disk keeps every line, the hidden ones with their times.
 */
export function servedTiming(slug: string, file: string): ChantTiming | null {
  const timing = timingFile(slug, file);
  if (!timing) return null;
  const id = file.slice(0, -".json".length);
  const variant = allChants()
    .find((c) => c.slug === slug)
    ?.variants.find((v) => v.id === id);
  if (!variant || variant.lines.length !== timing.lines.length) return timing;
  return { ...timing, lines: timing.lines.filter((_, i) => !variant.lines[i].hidden) };
}
