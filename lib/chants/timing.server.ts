import "server-only";

import fs from "node:fs";
import path from "node:path";

import { readTiming } from "./media";
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
