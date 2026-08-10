#!/usr/bin/env node
// Seed and audit lib/saints/iconRights.ts against public/saints/icons/.
//
// WHY THIS EXISTS
//
// 110 icon files ship in the app and 107 of them have no source, no licence
// and no attribution anywhere in the repo. docs/licensing/icon-provenance.md
// documents three. History media, section media and shop media each carry a
// required rights record enforced by a test; saint icons carry nothing.
// lib/media/__tests__/sections.test.ts names this directory as the reason it
// exists: "A registry without a test is a registry that rots."
//
// WHAT IT WILL AND WILL NOT WRITE
//
// It writes only what can be established WITHOUT OPENING THE IMAGE: which
// registry references the file, the true container from its magic bytes, its
// dimensions, and its size. It never writes a licence, an artist or a source,
// because none of those can be known from the bytes, and a guess recorded in a
// rights file is worse than an admitted gap.
//
// Everything else is a human step, by design. The standing rule is in three
// places in this repo and it says the same thing each time: open the file and
// look at it. A licence field will not tell you that the top hit for "orthodox
// lampada oil lamp" is an electrical wiring diagram.
//
// Usage:
//   node scripts/audit-icon-rights.mjs             report only
//   node scripts/audit-icon-rights.mjs --seed      print the UNVERIFIED_ICONS literal
//   node scripts/audit-icon-rights.mjs --json      machine-readable

import fs from "node:fs";
import path from "node:path";

const ICONS_DIR = path.join(process.cwd(), "public", "saints", "icons");
const URL_PREFIX = "/saints/icons/";

const args = process.argv.slice(2);
const seed = args.includes("--seed");
const asJson = args.includes("--json");

/** JPEG, PNG or WebP from the first bytes, never from the extension. */
function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  return "unknown";
}

/**
 * Pixel dimensions without a decoder dependency. Enough for JPEG SOF markers
 * and the PNG IHDR; returns null for anything else rather than guessing.
 */
function dimensions(buf, kind) {
  try {
    if (kind === "png") {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (kind === "jpg") {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        // SOF0-SOF15, excluding the non-frame markers DHT, JPG and DAC.
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* a malformed header is itself worth reporting, not worth throwing over */
  }
  return null;
}

/** Which registry, if any, points at this file. Read as text, not imported. */
function referencedBy(file) {
  const url = URL_PREFIX + file;
  const out = [];
  const saints = fs.readFileSync(
    path.join(process.cwd(), "lib", "saints", "saints.ts"),
    "utf8",
  );
  if (saints.includes(`"${url}"`)) {
    // Walk back from the iconUrl line to the nearest slug so the note can name
    // the saint rather than just say "a saint somewhere".
    const lines = saints.split(/\r?\n/);
    const i = lines.findIndex((l) => l.includes(`"${url}"`));
    let slug = null;
    for (let j = i; j >= 0 && j > i - 60; j--) {
      const m = lines[j].match(/slug:\s*"([a-z0-9-]+)"/);
      if (m) {
        slug = m[1];
        break;
      }
    }
    out.push(slug ? `SAINTS.iconUrl for ${slug}` : "SAINTS.iconUrl");
  }
  const icons = fs.readFileSync(
    path.join(process.cwd(), "lib", "saints", "icons.ts"),
    "utf8",
  );
  if (icons.includes(`"${url}"`)) out.push("AUTHOR_ICONS");

  const frames = fs.readFileSync(
    path.join(process.cwd(), "lib", "prayers", "slideshowFrames.ts"),
    "utf8",
  );
  if (frames.includes(`"${url}"`)) out.push("the prayer slideshow");

  return out;
}

const files = fs
  .readdirSync(ICONS_DIR)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

const rows = files.map((file) => {
  const abs = path.join(ICONS_DIR, file);
  const buf = fs.readFileSync(abs);
  const bytes = fs.statSync(abs).size;
  const kind = sniff(buf);
  const dim = dimensions(buf, kind);
  const ext = path.extname(file).slice(1).toLowerCase().replace("jpeg", "jpg");
  const refs = referencedBy(file);
  return {
    file,
    bytes,
    kind,
    ext,
    containerMismatch: kind !== ext,
    width: dim?.w ?? null,
    height: dim?.h ?? null,
    refs,
  };
});

if (asJson) {
  console.log(JSON.stringify({ dir: "public/saints/icons", rows }, null, 2));
  process.exit(0);
}

if (seed) {
  // The UNVERIFIED_ICONS literal, ready to paste. Every sentence states only
  // what the bytes and the registries prove. No licence, no artist, no
  // "probably PD-Art": that is the claim this whole exercise exists to stop.
  console.log("export const UNVERIFIED_ICONS: Record<string, string> = {");
  for (const r of rows) {
    const size = `${r.width ?? "?"}x${r.height ?? "?"} ${r.kind.toUpperCase()}, ${Math.round(r.bytes / 1024)} KB`;
    const ref = r.refs.length ? `Referenced by ${r.refs.join(" and ")}.` : "Referenced by nothing.";
    const note =
      `No source, licence or attribution recorded. Fetched before ` +
      `scripts/fetch-missing-icons.mjs had a licence gate. ${ref} ${size}. ` +
      `Not yet opened and inspected.`;
    console.log(`  ${JSON.stringify(r.file)}:`);
    console.log(`    ${JSON.stringify(note)},`);
  }
  console.log("};");
  process.exit(0);
}

const totalBytes = rows.reduce((n, r) => n + r.bytes, 0);
const mismatched = rows.filter((r) => r.containerMismatch);
const unreferenced = rows.filter((r) => r.refs.length === 0);
const oddNames = rows.filter((r) => !/^[a-z0-9.-]+$/.test(r.file));
const tall = rows.filter((r) => r.width && r.height && r.height / r.width > 2.6);
const heavy = rows.filter((r) => r.bytes > 200 * 1024);
const big = rows.filter((r) => r.width && r.height && Math.max(r.width, r.height) > 700);

console.log(`public/saints/icons: ${rows.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB\n`);

const report = [
  ["container does not match extension", mismatched],
  ["referenced by no registry", unreferenced],
  ["filename outside [a-z0-9.-]", oddNames],
  ["taller than 2.6:1, loses its lower half in the 3:4 frame", tall],
  ["over 200 KB", heavy],
  ["longest edge over 700px", big],
];

for (const [label, list] of report) {
  console.log(`${String(list.length).padStart(4)}  ${label}`);
  for (const r of list.slice(0, 8)) {
    console.log(`        ${r.file}  ${r.width ?? "?"}x${r.height ?? "?"}  ${Math.round(r.bytes / 1024)} KB`);
  }
  if (list.length > 8) console.log(`        ... and ${list.length - 8} more`);
}

console.log(
  `\nNothing above is a rights finding. Rights cannot be read from bytes.\n` +
    `Run with --seed to emit the UNVERIFIED_ICONS literal for lib/saints/iconRights.ts.`,
);
