// Prepares one recording of a chant for Purify's bucket (1.7; the bucket
// since 1.8).
//
//   node scripts/chants/prepare-audio.mjs <recording> <chant slug> <version id> --out <folder>
//
// It writes <folder>/<slug>/<id>.mp3 and prints what the chant's data file
// records for it: its address in the bucket, its length, and its timing
// file's address on the website. The folder is a staging folder outside the
// repository: since the owner's word of 2026-10-30 ("R2, like the Bible
// audio") a chant's recording is in Purify's bucket on Cloudflare R2, never
// in this public repository (.gitignore holds public/audio/chants/**/*.mp3),
// so the folder is then uploaded as it is:
//
//   node Homebase/tools/r2/upload.mjs <folder> chants --dry     (then without --dry)
//
// With ffmpeg (the FFMPEG variable names one; else the one on the PATH) it
// trims the silence at both ends, evens the loudness to about -16 LUFS (so
// one chant is not twice as loud as the next) and encodes a 128 kbps MP3.
// Without it an MP3 is copied as it is, and the line says so. It needs only
// silencedetect, atrim, loudnorm and libmp3lame, so the small ffmpeg that
// Remotion carries does it as well as a full one (on the owner's PC:
// FFMPEG=Homebase/projects/purify-ads/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe).
//
// The recording still needs its row in docs/licensing/audio-provenance.md and
// its line in public/audio/chants/live.json before it plays anywhere
// (docs/chants/ADDING-A-CHANT.md).
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { mp3Duration } from "./mp3.mjs";

const BUCKET = "https://audio.purifyapp.net/chants/"; // lib/chants/types.ts CHANT_RECORDINGS
const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const outRoot = outAt >= 0 ? args[outAt + 1] : null;
const [input, slug, id] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!input || !slug || !id || !outRoot || !SLUG.test(slug) || !SLUG.test(id)) {
  console.error("usage: node scripts/chants/prepare-audio.mjs <recording> <chant slug> <version id> --out <folder>");
  console.error("       slug and id are lowercase words joined by hyphens, e.g. christ-is-risen el-byzantine;");
  console.error("       the folder is a staging folder outside the repository, uploaded to the bucket after");
  process.exit(2);
}
if (!fs.existsSync(input)) {
  console.error(`no file at ${input}`);
  process.exit(2);
}
const repo = path.resolve(".");
if (path.resolve(outRoot).startsWith(repo + path.sep)) {
  console.error("the staging folder must be outside the repository: a chant's recording is never committed");
  process.exit(2);
}

const dir = path.resolve(outRoot, slug);
const out = path.join(dir, `${id}.mp3`);
fs.mkdirSync(dir, { recursive: true });
const FFMPEG = process.env.FFMPEG || "ffmpeg";

function hasFfmpeg() {
  try {
    execFileSync(FFMPEG, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** ffmpeg's report (it writes to stderr), or a throw with its last lines. */
function ff(ffArgs) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostats", ...ffArgs], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${(r.stderr || "").trim().split("\n").slice(-3).join(" | ")}`);
  return r.stderr;
}

/** The last JSON object in ffmpeg's report: what loudnorm printed. */
const lastJson = (report) => JSON.parse(report.slice(report.lastIndexOf("{"), report.lastIndexOf("}") + 1));

if (hasFfmpeg()) {
  const total = mp3Duration(input);
  // Silence at either end, below -50 dB, cut leaving 0.2 s before the first
  // sound and 0.4 s after the last.
  const sd = ff(["-i", input, "-map", "0:a:0", "-af", "silencedetect=noise=-50dB:d=0.1", "-f", "null", "-"]);
  const starts = [...sd.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  let from = 0;
  let to = total;
  if (starts.length && starts[0] <= 0.05 && ends.length) from = Math.max(0, ends[0] - 0.2);
  // A silence that never ends, or ends with the file, is the tail.
  const tail = starts.length > ends.length || (ends.length && total - ends[ends.length - 1] < 0.05);
  if (tail && total - starts[starts.length - 1] > 0.4) to = starts[starts.length - 1] + 0.4;
  from = Math.round(from * 1000) / 1000;
  to = Math.round(to * 1000) / 1000;
  const trim = `atrim=start=${from}:end=${to},asetpts=PTS-STARTPTS`;

  // The loudness of what is kept, measured, then set in one step: evenly,
  // where the peaks allow it (loudnorm says which it did).
  const target = "I=-16:TP=-1.5:LRA=11";
  const m = lastJson(ff(["-i", input, "-map", "0:a:0", "-af", `${trim},loudnorm=${target}:print_format=json`, "-f", "null", "-"]));
  const norm = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  const done = lastJson(
    ff(["-y", "-i", input, "-map", "0:a:0", "-vn", "-map_metadata", "-1", "-af", `${trim},${norm},aresample=44100`, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", out]),
  );
  console.log(`prepared with ffmpeg: ${from} s to ${to} s of ${total} s kept, loudness ${m.input_i} to ${done.output_i} LUFS (${done.normalization_type}), 128 kbps`);
} else if (input.toLowerCase().endsWith(".mp3")) {
  fs.copyFileSync(input, out);
  console.log("copied as it is: no ffmpeg was found, so the silence and loudness were not touched");
} else {
  console.error("no ffmpeg was found and the recording is not an MP3: convert it to MP3 first, or name an ffmpeg with FFMPEG");
  process.exit(1);
}

const seconds = mp3Duration(out);
const bytes = fs.statSync(out).size;
console.log(`\n${out}: ${seconds} s, ${(bytes / 1048576).toFixed(2)} MB`);
console.log("\nFor the version in data/chants/" + slug + ".json:");
console.log(JSON.stringify({ audio: { src: `${BUCKET}${slug}/${id}.mp3`, durationSec: seconds }, timing: `/audio/chants/${slug}/${id}.json` }, null, 2));
console.log(`\nNext: upload ${path.resolve(outRoot)} (Homebase/tools/r2/upload.mjs, prefix chants), the timed words`);
console.log("(scripts/chants/timing-from-transcript.mjs; leave out `timing` where none can be made), the provenance row, and the live list.");
