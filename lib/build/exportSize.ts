import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * What the native export weighs, and whether that is too much.
 *
 * The apps carry `out/` whole, so its weight is the weight a reader installs.
 * Until 1.6 the build had one check: it summed the raw bytes of `out/` without
 * `_next`, compared them with 0.6 GB and printed a warning. Three things were
 * wrong with that as a limit. It never stopped a build. It skipped `_next`,
 * which is where the code and all 21 language files live, so a language could
 * grow without the check seeing it. And it counted bytes on disk only, when an
 * Android phone downloads the files compressed and that is the number a
 * reader on a metered connection pays.
 *
 * So the build now measures everything, both ways, prints both, and can stop.
 * It is run last by scripts/native-build.mjs through scripts/export-size.mjs,
 * which also measures any export on its own: `node --experimental-strip-types
 * scripts/export-size.mjs [out]`.
 *
 * Only node built-ins, and no "@/" import: the script loads this file with
 * plain type stripping.
 */

/** A weight: how many files, their bytes on disk, their bytes packed. */
export type Weight = { files: number; bytes: number; packed: number };

export type ExportSize = {
  /** Everything in the export. */
  total: Weight;
  /** `_next` alone: the app's code and the language files. */
  next: Weight;
  /** The top-level folders, heaviest on disk first. Loose files are "(files)". */
  folders: ({ name: string } & Weight)[];
};

export type SizeLimits = {
  /**
   * The old budget, kept as it was: bytes on disk WITHOUT `_next`. Over it the
   * build warns and goes on.
   */
  warnWithoutNextBytes: number;
  /** Over this many bytes on disk, counting everything, the build stops. */
  stopDiskBytes: number | null;
  /** Over this many packed bytes, counting everything, the build stops. */
  stopPackedBytes: number | null;
};

const MB = 1024 ** 2;
const GB = 1024 ** 3;

/**
 * The limits a build is held to.
 *
 * The warning stays where it has been since 1.5.1: 0.52 GB measured then,
 * plus 15 percent. docs/build/app-size.md says it wants to come down to about
 * 0.38 GB once a store build has confirmed the number.
 *
 * THE TWO CEILINGS: 235 MB on disk, 85 MB packed. The owner set them on
 * 2026-10-12 (Master Board, "Megabyte ceiling"), the day the app weighed
 * 255.4 MB and 90.7 MB with the unused content package in it and about
 * 222.7 and 79.8 without. They sit a little over the second pair on purpose:
 * room for a release's ordinary growth, and none for a second Bible or a
 * package nobody reads to come back unnoticed. A build over either one fails
 * with the measure in its last lines. Raising one is his decision: change
 * the number here and say why in the commit.
 */
export const EXPORT_LIMITS: SizeLimits = {
  warnWithoutNextBytes: 0.6 * GB,
  stopDiskBytes: 235 * MB,
  stopPackedBytes: 85 * MB,
};

/**
 * A file's weight as an Android phone downloads it, near enough: deflated on
 * its own at level 6. The store's own packing differs a little and a picture
 * or a font hardly shrinks, which is the truth about them. It is the measure
 * docs/build/app-size.md has used since 1.5.2, so the numbers line up.
 */
function packedSize(file: string): number {
  return zlib.deflateRawSync(fs.readFileSync(file), { level: 6 }).length;
}

/**
 * Walk an export and weigh it. `pack: false` skips the compression, which is
 * most of the time this takes, and reports packed as 0.
 */
export function measureExport(dir: string, { pack = true }: { pack?: boolean } = {}): ExportSize {
  const total: Weight = { files: 0, bytes: 0, packed: 0 };
  const next: Weight = { files: 0, bytes: 0, packed: 0 };
  const byFolder = new Map<string, Weight>();

  const walk = (d: string, top: string | null) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p, top ?? entry.name);
        continue;
      }
      if (!entry.isFile()) continue;
      const bytes = fs.statSync(p).size;
      const packed = pack ? packedSize(p) : 0;
      const name = top ?? "(files)";
      const folder = byFolder.get(name) ?? { files: 0, bytes: 0, packed: 0 };
      for (const w of name === "_next" ? [total, folder, next] : [total, folder]) {
        w.files += 1;
        w.bytes += bytes;
        w.packed += packed;
      }
      byFolder.set(name, folder);
    }
  };
  if (fs.existsSync(dir)) walk(dir, null);

  const folders = [...byFolder]
    .map(([name, w]) => ({ name, ...w }))
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  return { total, next, folders };
}

export type SizeVerdict = {
  /** Reasons to stop the build. Empty while no ceiling is set. */
  stop: string[];
  /** Things to look at that do not stop it. */
  warn: string[];
};

const mb = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;
const gb = (bytes: number) => `${(bytes / GB).toFixed(2)} GB`;

/** Hold a measure to the limits. Pure: the same measure gives the same verdict. */
export function judgeSize(size: ExportSize, limits: SizeLimits = EXPORT_LIMITS): SizeVerdict {
  const stop: string[] = [];
  const warn: string[] = [];
  const withoutNext = size.total.bytes - size.next.bytes;
  if (withoutNext > limits.warnWithoutNextBytes) {
    warn.push(
      `out/ without _next is ${gb(withoutNext)}, over the ${gb(limits.warnWithoutNextBytes)} budget: look for text that became a prop again before shipping`,
    );
  }
  if (limits.stopDiskBytes !== null && size.total.bytes > limits.stopDiskBytes) {
    stop.push(`the export is ${mb(size.total.bytes)} on disk, over the ${mb(limits.stopDiskBytes)} ceiling`);
  }
  if (limits.stopPackedBytes !== null && size.total.packed > limits.stopPackedBytes) {
    stop.push(`the export is ${mb(size.total.packed)} packed, over the ${mb(limits.stopPackedBytes)} ceiling`);
  }
  return { stop, warn };
}

/**
 * The lines a build prints: both numbers for the whole export, `_next` on its
 * own so a language's growth shows, and where the ceilings stand.
 */
export function sizeLines(size: ExportSize, limits: SizeLimits = EXPORT_LIMITS, top = 0): string[] {
  const packed = (w: Weight) => (w.packed ? `, ${mb(w.packed)} packed` : "");
  const lines = [
    `• export size: ${mb(size.total.bytes)} on disk in ${size.total.files.toLocaleString("en-US")} files${packed(size.total)}`,
    `  _next (the code and the language files): ${mb(size.next.bytes)} on disk${packed(size.next)}`,
    `  without _next: ${gb(size.total.bytes - size.next.bytes)} of the ${gb(limits.warnWithoutNextBytes)} budget`,
    limits.stopDiskBytes === null && limits.stopPackedBytes === null
      ? "  ceiling: none set, so no build is stopped for its weight"
      : `  ceiling: ${limits.stopDiskBytes === null ? "none" : mb(limits.stopDiskBytes)} on disk, ${limits.stopPackedBytes === null ? "none" : mb(limits.stopPackedBytes)} packed`,
  ];
  for (const f of size.folders.slice(0, top)) {
    lines.push(`  ${f.name.padEnd(18)} ${mb(f.bytes).padStart(9)}${f.packed ? ` ${mb(f.packed).padStart(9)} packed` : ""}  ${f.files.toLocaleString("en-US")} files`);
  }
  return lines;
}
