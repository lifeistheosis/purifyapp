// The on-phone voice: write the list of the engine's files (1.9).
//
// The app fetches the engine only from Purify's own storage, and keeps a file
// only when its size and SHA-256 are the ones this list gives
// (lib/listen/phoneVoiceDownload.ts). So the list is made from the very files
// that are uploaded, on the machine that uploads them:
//
//   node scripts/phone-voice-manifest.mjs <folder>
//
// reads every file under <folder> and writes <folder>/manifest.json. Upload
// the folder's contents, the list included, to the bucket's phone-voice/
// (docs/1.9-build/OWNER-STEPS.md, V8). It refuses a Plus voice's file: those
// are never in the public storage (lib/listen/phoneVoices.ts).

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** The Plus voices' file names, read from the app's own list so the two cannot part. */
export function plusVoiceFiles(root = process.cwd()) {
  const src = fs.readFileSync(path.join(root, "lib/listen/phoneVoices.ts"), "utf8");
  return [...src.matchAll(/\{ id: "([a-z_]+)", plus: true/g)].map((m) => `${m[1]}.bin`);
}

export function manifestOf(folder, { version = 1, refuse = [] } = {}) {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name !== "manifest.json" && !e.name.startsWith(".")) {
        if (refuse.includes(e.name)) throw new Error(`${e.name} is a Plus voice: it is never put in the public storage`);
        const body = fs.readFileSync(full);
        if (body.length === 0) throw new Error(`${full} is empty`);
        files.push({
          path: path.relative(folder, full).split(path.sep).join("/"),
          bytes: body.length,
          sha256: createHash("sha256").update(body).digest("hex"),
        });
      }
    }
  };
  walk(folder);
  if (files.length === 0) throw new Error(`no files under ${folder}`);
  return { version, files };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const folder = process.argv[2];
  if (!folder) {
    console.error("usage: node scripts/phone-voice-manifest.mjs <folder>");
    process.exit(1);
  }
  const manifest = manifestOf(path.resolve(folder), { refuse: plusVoiceFiles() });
  fs.writeFileSync(path.join(folder, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const mb = manifest.files.reduce((s, f) => s + f.bytes, 0) / 1e6;
  console.log(`manifest.json: ${manifest.files.length} files, ${mb.toFixed(1)} MB`);
  for (const f of manifest.files) console.log(`  ${(f.bytes / 1e6).toFixed(1).padStart(6)} MB  ${f.path}`);
}
