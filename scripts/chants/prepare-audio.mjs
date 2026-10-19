// Puts one recording of a chant where the website serves it (1.7).
//
//   node scripts/chants/prepare-audio.mjs <recording> <chant slug> <version id>
//
// It writes public/audio/chants/<slug>/<id>.mp3 and prints what the chant's
// data file records for it: the address, the length and the timing file's
// address. With ffmpeg on the PATH it also trims the silence at both ends,
// evens the loudness to about -16 LUFS (so one chant is not twice as loud as
// the next) and encodes a 128 kbps MP3; without it an MP3 is copied as it is
// and the line says so. Nothing here goes into the apps: the folder is set
// aside by scripts/native-build.mjs, and the apps stream it from the website.
//
// The recording still needs its row in docs/licensing/audio-provenance.md and
// its line in public/audio/chants/live.json before it plays anywhere
// (docs/chants/ADDING-A-CHANT.md).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { mp3Duration } from "./mp3.mjs";

const [, , input, slug, id] = process.argv;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!input || !slug || !id || !SLUG.test(slug) || !SLUG.test(id)) {
  console.error("usage: node scripts/chants/prepare-audio.mjs <recording> <chant slug> <version id>");
  console.error("       slug and id are lowercase words joined by hyphens, e.g. christ-is-risen el-byzantine");
  process.exit(2);
}
if (!fs.existsSync(input)) {
  console.error(`no file at ${input}`);
  process.exit(2);
}

const dir = path.resolve("public", "audio", "chants", slug);
const out = path.join(dir, `${id}.mp3`);
fs.mkdirSync(dir, { recursive: true });

function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (hasFfmpeg()) {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      input,
      "-af",
      // Silence off the start and the end, then the loudness evened.
      "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.2,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.4,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      out,
    ],
    { stdio: "inherit" },
  );
  console.log("prepared with ffmpeg: silence trimmed, loudness about -16 LUFS, 128 kbps");
} else if (input.toLowerCase().endsWith(".mp3")) {
  fs.copyFileSync(input, out);
  console.log("copied as it is: ffmpeg is not installed, so the silence and loudness were not touched");
} else {
  console.error("ffmpeg is not installed and the recording is not an MP3: convert it to MP3 first, or install ffmpeg");
  process.exit(1);
}

const seconds = mp3Duration(out);
const bytes = fs.statSync(out).size;
const web = `/audio/chants/${slug}/${id}`;
console.log(`\n${path.relative(process.cwd(), out)}: ${seconds} s, ${(bytes / 1048576).toFixed(2)} MB`);
console.log("\nFor the version in data/chants/" + slug + ".json:");
console.log(JSON.stringify({ audio: { src: `${web}.mp3`, durationSec: seconds }, timing: `${web}.json` }, null, 2));
console.log("\nNext: the timed words (scripts/chants/timing-from-transcript.mjs), the provenance row, and the live list.");
