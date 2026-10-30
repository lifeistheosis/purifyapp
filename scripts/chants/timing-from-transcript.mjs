// Times a chant's words from a transcript of its recording (1.7, note 28).
//
//   node scripts/chants/timing-from-transcript.mjs <transcript> <chant slug> <version id> [--duration <seconds>]
//
// The owner transcribes a recording with timestamps in his own pipeline. The
// transcript is never what readers see: speech-to-text gets Arabic dialect,
// Slavonic and old Greek wrong. What readers see is the Church's published
// text, in the chant's data file. The transcript only gives each line its
// time. So this reads the transcript's segments in order, lays them on the
// data file's lines one for one, and writes
// public/audio/chants/<slug>/<id>.json:
//
//   { "v": 1, "durationSec": 126.9, "lines": [{ "at": 3.2, "end": 8.35, "text": "<the data file's line>" }] }
//
// It refuses when the counts differ, and names where they part, so a line is
// never timed by its neighbour's words. Every pair is also printed with how
// many of the data line's words the transcript heard, so a slip shows; a line
// with almost none is flagged. lib/chants/__tests__/data.test.ts then holds
// the file line for line to the data file.
//
// Transcript formats read: .lrc ([mm:ss.xx] text), .srt, .vtt, and .json (an
// array of { start, end, text }, Whisper's { segments: [...] }, or a timing
// file's own { lines: [{ at, end, text }] }). The owner's own format is still
// to be confirmed with him; add a reader below when it is known.
import fs from "node:fs";
import path from "node:path";

import { mp3Duration } from "./mp3.mjs";

const args = process.argv.slice(2);
const [file, slug, id] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--duration");
const durationArg = args.includes("--duration") ? Number(args[args.indexOf("--duration") + 1]) : null;
if (!file || !slug || !id) {
  console.error("usage: node scripts/chants/timing-from-transcript.mjs <transcript> <chant slug> <version id> [--duration <seconds>]");
  process.exit(2);
}

/** "01:02:03.45", "02:03,450", "123.4" -> seconds. */
function seconds(stamp) {
  const parts = stamp.trim().replace(",", ".").split(":").map(Number);
  return parts.reduce((total, n) => total * 60 + n, 0);
}

function readLrc(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g)];
    const words = line.replace(/\[[^\]]*\]/g, "").trim();
    if (!stamps.length || !words) continue;
    for (const s of stamps) out.push({ start: seconds(s[1].replace(/:(\d{1,3})$/, ".$1")), text: words });
  }
  return out.sort((a, b) => a.start - b.start);
}

function readCues(text) {
  const out = [];
  const blocks = text.replace(/^WEBVTT[^\n]*\n/, "").split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const [from, to] = lines[at].split("-->").map((s) => s.trim().split(/\s+/)[0]);
    const words = lines.slice(at + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (words) out.push({ start: seconds(from), end: seconds(to), text: words });
  }
  return out;
}

function readJson(text) {
  const v = JSON.parse(text);
  const list = Array.isArray(v) ? v : Array.isArray(v.segments) ? v.segments : Array.isArray(v.lines) ? v.lines : null;
  if (!list) throw new Error("a JSON transcript is an array of segments, { segments: [...] } or { lines: [...] }");
  return list.map((s) => ({ start: Number(s.start ?? s.at), end: s.end == null ? undefined : Number(s.end), text: String(s.text ?? "").trim() }));
}

const raw = fs.readFileSync(file, "utf8");
const ext = path.extname(file).toLowerCase();
const segments = (ext === ".lrc" ? readLrc(raw) : ext === ".json" ? readJson(raw) : readCues(raw)).filter((s) => Number.isFinite(s.start));

const dataFile = path.resolve("data", "chants", `${slug}.json`);
if (!fs.existsSync(dataFile)) {
  console.error(`no chant at ${path.relative(process.cwd(), dataFile)}: write its data file first (docs/chants/ADDING-A-CHANT.md)`);
  process.exit(1);
}
const chant = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const variant = (chant.variants ?? []).find((v) => v.id === id);
if (!variant) {
  console.error(`${slug} has no version "${id}" (it has: ${(chant.variants ?? []).map((v) => v.id).join(", ")})`);
  process.exit(1);
}
const lines = variant.lines.map((l) => l.text);

/** Letters only, accents and case away, as a set of words. */
const fold = (s) =>
  new Set(
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
const heard = (said, sung) => {
  const want = fold(sung);
  if (!want.size) return 1;
  const got = fold(said);
  let n = 0;
  for (const w of want) if (got.has(w)) n++;
  return n / want.size;
};

if (segments.length !== lines.length) {
  console.error(`refused: the transcript has ${segments.length} segments and the words have ${lines.length} lines.`);
  console.error("Each line must be one segment. Join or split the transcript's segments to match, then run this again.\n");
  const n = Math.max(segments.length, lines.length);
  for (let i = 0; i < n; i++) {
    const seg = segments[i];
    const line = lines[i];
    const mark = seg && line && heard(seg.text, line) >= 0.3 ? " " : "?";
    console.error(`${mark} ${String(i + 1).padStart(3)}  ${(seg ? `${seg.start.toFixed(2)} ${seg.text}` : "(no segment)").slice(0, 60).padEnd(60)}  ${line ?? "(no line)"}`);
  }
  process.exit(1);
}

// A recording on the website is measured; one in Purify's bucket (1.8) is
// not in the repository, so its length is the one its data file records,
// which prepare-audio.mjs printed from the file it made.
const inBucket = /^https:\/\//.test(variant.audio.src);
const audio = inBucket ? null : path.resolve("public", variant.audio.src.replace(/^\//, ""));
const durationSec =
  durationArg ?? (audio && fs.existsSync(audio) && audio.endsWith(".mp3") ? mp3Duration(audio) : inBucket ? variant.audio.durationSec : null);
if (!durationSec) {
  console.error("no length for the recording: put the MP3 in place first (prepare-audio.mjs), or pass --duration <seconds>");
  process.exit(1);
}

const round = (x) => Math.round(x * 100) / 100;
const out = lines.map((text, i) => {
  const at = round(segments[i].start);
  const next = segments[i + 1]?.start;
  const end = round(Math.min(segments[i].end ?? next ?? Math.min(durationSec, at + 6), next ?? durationSec, durationSec));
  return { at, end: end > at ? end : round(Math.min(durationSec, at + 1)), text };
});

let weak = 0;
for (let i = 0; i < out.length; i++) {
  const share = heard(segments[i].text, lines[i]);
  if (share < 0.3) weak++;
  console.log(`${share < 0.3 ? "?" : " "} ${String(i + 1).padStart(3)}  ${out[i].at.toFixed(2).padStart(7)}  ${Math.round(share * 100).toString().padStart(3)}% heard  ${lines[i]}`);
}

const target = path.resolve("public", "audio", "chants", slug, `${id}.json`);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({ v: 1, durationSec: round(durationSec), lines: out }, null, 2) + "\n");
console.log(`\nwrote ${path.relative(process.cwd(), target)}: ${out.length} lines over ${round(durationSec)} s`);
if (weak) console.log(`${weak} line(s) marked ? share few words with the transcript: listen to those, the segments may be off by one.`);
