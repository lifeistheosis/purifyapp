// Times a chant version's words word by word (1.8, build 86 note 78: "each
// word timestamped and followed in the lyrics section"), and checks them
// against what a speech model hears.
//
//   node scripts/chants/time-words.mjs <chant slug> <version id> --wav <recording, 16 kHz mono WAV>
//        [--words <file.json>] [--out <file.json>] [--groups <file.json>] [--report <file.txt>]
//        [--transformers <transformers.node.mjs>] [--cache <model folder>] [--keep <file.json>] [--dry]
//
// The words are the printed words, never the model's (note 28). For each line
// the speech model (Whisper small, with its alignment heads: the
// "_timestamped" ONNX builds) is handed the line's own words and asked where
// in the line's stretch of the recording each of them falls: its
// cross-attention, laid along the sound by dynamic time warping, gives each
// word's start, and the end-of-text token where the words end; each start
// is taken a tenth of a second early, as the model's run late. The line's
// first word starts where the line is first heard, at or just after the
// line's own start (the version 1 timing file). Then the model hears the
// same stretches on its own, unprompted, and a word it did not hear is listed
// as unheard on its line, so the hard lines can be read again by a person.
//
// Writes data/chants/timing/<slug>/<id>.json as a version 2 file: each line
// keeps its start and end and its words, and gains `words` (each word's
// [start, end] in seconds) and, where any, `unheard` (the places, from 0, of
// the words the model's own hearing did not find). The data test holds the
// words line for line and word for word to the data file.
//
//   --words   time other words than the data file's (cleared words entered in
//             the admin, note 78): a JSON array of the lines' texts, as many
//             as the version's timing file has lines; with --out.
//   --groups  lines with no times yet: [{ "from": s, "to": s, "lines": [first, last] }],
//             each group's words aligned along its stretch together and each
//             line starting where its first word does (a new verse sung in a
//             stretch already known).
//   --keep    a file to keep what the model found, by stretch and words: a
//             second run asks the model only what it has not answered.
//   --dry     the report only, nothing written.
//
// The model is not part of this repository or its packages: on the owner's
// PC it is purify-ads' (@huggingface/transformers 4.2 and the two models in
// purify-ads/.hf-cache), passed with --transformers and --cache. Nothing is
// fetched. Run it through purify-ads/tools/renderlock.mjs: it takes a core
// and about a gigabyte for some minutes.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { cutLongLine, heardWords, serializeTiming, wordTimes, wordsOf } from "./wordtime.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const [slug, id] = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && args[i - 1] !== "--dry"));
const wavFile = flag("wav");
if (!slug || !id || !wavFile) {
  console.error("usage: node scripts/chants/time-words.mjs <slug> <id> --wav <16 kHz mono wav> [--words f] [--out f] [--groups f] [--report f] [--transformers f] [--cache d] [--dry]");
  process.exit(2);
}
const dry = args.includes("--dry");

const SR = 16000;
/** The stretch heard around a line: a little either side of it, and silence round that. */
const AROUND = 0.12;
const PAD = 0.3;
/** Longest stretch heard at once: the model hears 30 seconds. */
const MOST = 27;
const LANGUAGES = { en: "english", fr: "french", ar: "arabic", el: "greek", sr: "serbian", ru: "russian", ro: "romanian", ka: "georgian" };

// ---- the words and their lines
const chant = JSON.parse(fs.readFileSync(path.resolve("data", "chants", `${slug}.json`), "utf8"));
const variant = chant.variants.find((v) => v.id === id);
if (!variant) throw new Error(`${slug} has no version ${id}`);
const lang = variant.language.slice(0, 2);
const timingPath = path.resolve("data", "chants", "timing", slug, `${id}.json`);
const wordsFile = flag("words");
const texts = wordsFile ? JSON.parse(fs.readFileSync(wordsFile, "utf8")) : variant.lines.map((l) => l.text);
if (!Array.isArray(texts) || !texts.every((t) => typeof t === "string" && t.trim())) throw new Error("--words: a JSON array of the lines' texts");
const before = fs.existsSync(timingPath) ? JSON.parse(fs.readFileSync(timingPath, "utf8")) : null;
const groups = flag("groups") ? JSON.parse(fs.readFileSync(flag("groups"), "utf8")) : null;
const durationSec = before?.durationSec ?? variant.audio.durationSec;
/** Each line's start and end, where known. */
const known = texts.map((text, i) => {
  const was = before && before.lines.length === texts.length ? before.lines[i] : null;
  return was ? { at: was.at, end: was.end } : null;
});
if (!groups && known.some((k) => !k)) {
  throw new Error(`the timing file has ${before?.lines.length ?? 0} lines and the words ${texts.length}: give --groups for the lines with no times`);
}

// ---- the recording
function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  let fmt = null;
  while (p + 8 <= b.length) {
    const tag = b.toString("ascii", p, p + 4);
    const n = b.readUInt32LE(p + 4);
    if (tag === "fmt ") fmt = { channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (tag === "data") {
      if (!fmt || fmt.channels !== 1 || fmt.rate !== SR || fmt.bits !== 16) throw new Error(`${file}: a 16 kHz mono 16-bit WAV is wanted`);
      const out = new Float32Array(Math.floor(n / 2));
      for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(p + 8 + i * 2) / 32768;
      return out;
    }
    p += 8 + n + (n % 2);
  }
  throw new Error(`${file}: no sound in it`);
}
const audio = readWav(wavFile);
if (Math.abs(audio.length / SR - durationSec) > 1.5) throw new Error(`${wavFile} is ${(audio.length / SR).toFixed(1)} s and the version ${durationSec} s: not the same cut`);

/** The level of the sound, 10 ms steps, in dB. */
const HOP = 0.01;
const level = (() => {
  const n = Math.floor(audio.length / (SR * HOP));
  const out = new Float32Array(n);
  const w = SR * HOP;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = i * w; k < (i + 1) * w; k++) s += audio[k] * audio[k];
    out[i] = 10 * Math.log10(s / w + 1e-10);
  }
  return out;
})();
/** The quietest moment between two times. */
function quiet(from, to) {
  let best = Math.round(from / HOP);
  for (let i = Math.round(from / HOP); i <= Math.min(level.length - 1, Math.round(to / HOP)); i++) if (level[i] < level[best]) best = i;
  return best * HOP;
}
/** A stretch of the recording as the model hears it: silence either side. */
function clip(from, to) {
  const a = Math.max(0, Math.round(from * SR));
  const z = Math.min(audio.length, Math.round(to * SR));
  const pad = Math.round(PAD * SR);
  const fade = Math.round(SR * 0.006);
  const x = new Float32Array(pad + (z - a) + pad);
  for (let i = 0; i < z - a; i++) x[pad + i] = audio[a + i] * Math.min(1, i / fade, (z - a - 1 - i) / fade);
  return { samples: x, offset: a / SR - PAD };
}

// ---- the model, loaded only when something has not been heard before
//
// What it finds is kept by the stretch and the words asked (--keep <file>),
// so timing a version again (a lead changed, new lines among old ones) asks
// the model only what it has not answered already.
const cache = flag("cache");
const lib = flag("transformers") ?? "@huggingface/transformers";
const modelId = lang === "en" ? "onnx-community/whisper-small.en_timestamped" : "onnx-community/whisper-small_timestamped";
const keepFile = flag("keep");
const kept = keepFile && fs.existsSync(keepFile) ? JSON.parse(fs.readFileSync(keepFile, "utf8")) : {};
if (kept.model && kept.model !== modelId) throw new Error(`${keepFile} was heard by ${kept.model}, not ${modelId}`);
kept.model = modelId;
kept.align ??= {};
kept.hear ??= {};
let loaded = null;
async function whisper() {
  if (loaded) return loaded;
  const { AutoProcessor, AutoTokenizer, WhisperForConditionalGeneration, env } = await import(
    lib.endsWith(".mjs") || lib.endsWith(".js") ? pathToFileURL(path.resolve(lib)).href : lib
  );
  if (cache) env.cacheDir = cache;
  env.allowRemoteModels = false;
  const config = JSON.parse(fs.readFileSync(path.join(cache ?? ".", modelId, "generation_config.json"), "utf8"));
  const multilingual = Boolean(config.is_multilingual);
  const language = LANGUAGES[lang];
  if (multilingual && !language) throw new Error(`no speech model language for ${variant.language}`);
  loaded = {
    config,
    multilingual,
    language,
    processor: await AutoProcessor.from_pretrained(modelId),
    tokenizer: await AutoTokenizer.from_pretrained(modelId),
    model: await WhisperForConditionalGeneration.from_pretrained(modelId, { dtype: "q8", device: "cpu" }),
    prefix: multilingual
      ? [config.decoder_start_token_id, config.lang_to_id[`<|${lang}|>`], config.task_to_id.transcribe, config.no_timestamps_token_id]
      : [config.decoder_start_token_id, config.no_timestamps_token_id],
  };
  return loaded;
}
const keyOf = (from, to, words = []) => `${from.toFixed(2)}|${to.toFixed(2)}|${words.join(" ")}`;

/**
 * Where each of `words` starts in a stretch, and where the words end: the
 * words handed to the model whole, its attention laid along the sound
 * (dynamic time warping over its alignment heads, as Whisper times words).
 */
async function align(from, to, words) {
  const key = keyOf(from, to, words);
  if (kept.align[key]) return kept.align[key];
  const { config, processor, tokenizer, model, prefix } = await whisper();
  const { samples, offset } = clip(from, to);
  const { input_features } = await processor(samples);
  const ids = [];
  const first = [];
  for (const w of words) {
    first.push(ids.length);
    ids.push(...tokenizer.encode(` ${w}`, { add_special_tokens: false }));
  }
  const out = await model.generate({
    inputs: input_features,
    decoder_input_ids: [...prefix, ...ids, config.eos_token_id],
    max_new_tokens: 1,
    output_attentions: true,
    return_dict_in_generate: true,
  });
  const frames = Math.min(1500, Math.floor((samples.length / SR) * 50));
  const ts = model._extract_token_timestamps(out, config.alignment_heads, frames, 0.02, prefix.length).tolist()[0];
  const at = (k) => Math.round((offset + Number(ts[prefix.length + k])) * 1000) / 1000;
  kept.align[key] = { starts: first.map(at), end: at(ids.length) };
  return kept.align[key];
}

/** What the model hears in a stretch on its own. */
async function hear(from, to) {
  const key = keyOf(from, to);
  if (typeof kept.hear[key] === "string") return kept.hear[key];
  const { processor, tokenizer, model, multilingual, language } = await whisper();
  const { samples } = clip(from, to);
  const { input_features } = await processor(samples);
  const out = await model.generate({
    inputs: input_features,
    ...(multilingual ? { language, task: "transcribe" } : {}),
    max_new_tokens: 220,
  });
  const seqs = typeof out.tolist === "function" ? out.tolist() : out;
  kept.hear[key] = String(tokenizer.batch_decode(seqs, { skip_special_tokens: true })[0] ?? "").trim();
  return kept.hear[key];
}

/**
 * The model's word starts run late, a tenth of a second or so on these
 * recordings (read against the voice's own picture, purify-ads/edits/tools/
 * speechmap.mjs, on the English Anthem): each start after a line's first is
 * taken this much earlier, so a word lights as it is sung and not after.
 */
const LEAD = 0.1;

/**
 * Where a line's first word is first heard: the line's start (the checked
 * first sound after a breath) is often a little before the voice, and after
 * a silence the first word waits for the voice. The first moment, in the
 * line's first two and a half seconds, within 24 dB of the loudest there.
 */
function firstSound(at, end) {
  const a = Math.round(at / HOP);
  const z = Math.min(level.length - 1, Math.round(Math.min(end - 0.05, at + 2.5) / HOP));
  let top = -Infinity;
  for (let i = a; i <= z; i++) top = Math.max(top, level[i]);
  for (let i = a; i <= z; i++) if (level[i] >= top - 24) return i * HOP;
  return at;
}

/** A stretch's word starts, the first from the sound and the rest a lead earlier. */
const led = (starts) => starts.map((s, k) => (k ? s - LEAD : s));

// ---- each line's words, timed
const lines = texts.map((text, i) => ({ i, text, words: wordsOf(text), at: known[i]?.at, end: known[i]?.end }));
const report = [];
const round = (x) => Math.round(x * 100) / 100;

async function timeLine(line) {
  const n = line.words.length;
  if (n === 1) {
    line.times = [[round(Math.min(firstSound(line.at, line.end), line.end - 0.05)), round(line.end)]];
    return;
  }
  const span = line.end - line.at;
  if (span <= MOST) {
    const { starts, end } = await align(line.at - AROUND, line.end + AROUND, line.words);
    line.times = wordTimes(led(starts), firstSound(line.at, line.end), line.end, end);
    return;
  }
  // Too long to hear at once (a hymn of the Canon): cut where it is quietest.
  const pieces = cutLongLine(line.words, line.at, line.end, Math.ceil(span / (MOST - 2)), quiet);
  const times = [];
  for (const p of pieces) {
    const words = line.words.slice(p.first, p.first + p.count);
    if (words.length === 1) {
      times.push([round(p.from), round(p.to)]);
      continue;
    }
    const { starts, end } = await align(p.from - AROUND, p.to + AROUND, words);
    times.push(...wordTimes(led(starts), p.first ? p.from : firstSound(p.from, p.to), p.to, end));
  }
  line.times = times;
}

if (groups) {
  // New lines in a known stretch: the group's words aligned together, and
  // each line from its first word to the next line's.
  for (const g of groups) {
    const members = lines.slice(g.lines[0], g.lines[1] + 1);
    const words = members.flatMap((l) => l.words);
    const { starts, end } = await align(g.from - AROUND, g.to + AROUND, words);
    const times = wordTimes(led(starts), firstSound(g.from, g.to), g.to, end);
    let k = 0;
    for (const l of members) {
      l.at = times[k][0];
      k += l.words.length;
    }
    members.forEach((l, j) => {
      l.end = j + 1 < members.length ? members[j + 1].at : round(g.to);
    });
  }
}
for (const line of lines) {
  if (line.at === undefined || line.end === undefined) throw new Error(`line ${line.i + 1} has no time`);
  await timeLine(line);
}

// ---- the model's own hearing, a stretch of lines at a time
const stretches = [];
for (const line of lines) {
  const last = stretches[stretches.length - 1];
  if (last && line.end - last.from <= MOST && line.at - last.to < 2) {
    last.to = line.end;
    last.lines.push(line);
  } else stretches.push({ from: line.at, to: line.end, lines: [line] });
}
for (const s of stretches) {
  // A line longer than one hearing (a hymn of the Canon) is heard in turns.
  let heard = "";
  for (let a = s.from; a < s.to - 0.5; a += MOST) heard += ` ${await hear(a - AROUND, Math.min(a + MOST, s.to) + AROUND)}`;
  heard = heard.trim();
  const printed = s.lines.flatMap((l) => l.words);
  const flags = heardWords(printed, wordsOf(heard), variant.language);
  let k = 0;
  for (const l of s.lines) {
    l.unheard = l.words.map((_, j) => j).filter((j) => !flags[k + j]);
    k += l.words.length;
  }
  report.push(`${s.from.toFixed(2)} to ${s.to.toFixed(2)}  heard: ${heard}`);
  for (const l of s.lines) {
    const got = l.words.length - l.unheard.length;
    report.push(
      `  ${String(l.i + 1).padStart(3)}  ${l.at.toFixed(2).padStart(7)}  ${String(got).padStart(2)}/${String(l.words.length).padEnd(2)} ${got / l.words.length < 0.5 ? "?" : " "} ${l.text}` +
        (l.unheard.length ? `   [not heard: ${l.unheard.map((j) => l.words[j]).join(" ")}]` : ""),
    );
  }
}

const timing = {
  v: 2,
  durationSec,
  made: {
    by: `${modelId.replace("onnx-community/", "")} (q8): each line's printed words aligned to its stretch of the recording (starts ${LEAD} s early, the first at the first sound), then checked against the model's own hearing`,
    on: new Date().toISOString().slice(0, 10),
  },
  lines: lines.map((l) => ({
    at: round(l.at),
    end: round(l.end),
    text: l.text,
    words: l.times,
    ...(l.unheard?.length ? { unheard: l.unheard } : {}),
  })),
};
const heardAll = lines.reduce((a, l) => a + l.words.length - (l.unheard?.length ?? 0), 0);
const total = lines.reduce((a, l) => a + l.words.length, 0);
report.unshift(`${slug}/${id}: ${lines.length} lines, ${total} words, ${heardAll} heard by the model on its own (${Math.round((heardAll / total) * 100)}%)`);
const reportFile = flag("report");
if (reportFile) fs.writeFileSync(reportFile, report.join("\n") + "\n");
if (keepFile) fs.writeFileSync(keepFile, JSON.stringify(kept));
console.log(report.join("\n"));
if (!dry) {
  const out = flag("out") ?? (wordsFile ? null : timingPath);
  if (!out) throw new Error("--words needs --out: cleared words are entered in the admin, not written into the repository");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, serializeTiming(timing));
  console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
}
