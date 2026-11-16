import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { timingsFit, type ListenBatch, type ListenTimings } from "@/lib/listen/texts";
import type { ReadAloudManifest } from "@/lib/readAloud/chapters";

/**
 * The voices recorder (scripts/voices/record.py, 1.9) hands back what the app
 * reads: Heart's chapter files for a Bible chapter, V1's timings for a batch
 * (docs/1.9-build/OWNER-STEPS.md), each with a row for every verse, block and
 * sentence it was handed, and its sound exactly as long as its timings say.
 * Run with the recorder's stand-in voice, so no model is needed: what is held
 * here is the shape, the counts, the pauses and the length, the same for every
 * voice. Needs Python 3.10 or later; skipped, and said so, where there is none.
 */

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "voices", "record.py");
const SR = 24000;

const python = ["python3", "python"].find((cmd) => spawnSync(cmd, ["-c", "import sys; assert sys.version_info >= (3, 10)"]).status === 0);
if (!python) console.warn("recorder.test.ts: no Python 3.10 here, so the recorder's formats are not checked on this machine");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voices-recorder-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function record(...args: string[]) {
  return spawnSync(python as string, ["-I", SCRIPT, ...args], { encoding: "utf8", cwd: ROOT });
}

/** Samples in a 16-bit mono wav the stand-in writes. */
function wavSamples(file: string): number {
  const b = fs.readFileSync(file);
  const data = b.indexOf("data");
  return b.readUInt32LE(data + 4) / 2;
}

const hundredths = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const BATCH: ListenBatch = {
  id: "history/the-recorder-test",
  href: "/history/the-recorder-test",
  title: "A test of the recorder",
  by: "Purify",
  words: 40,
  blocks: [
    { kind: "title", sentences: ["A test of the recorder."] },
    { kind: "para", at: { sectionN: 1, paragraphIdx: 0 }, sentences: ["The first sentence is read.", "The second follows it.", "And a third."] },
    { kind: "quote", sentences: ["A passage quoted, read with no place of its own."] },
    { kind: "para", at: { sectionN: 2, paragraphIdx: 3 }, sentences: ["The last paragraph has one sentence."] },
  ],
};

describe.skipIf(!python)("the voices recorder's formats", () => {
  const out = path.join(tmp, "out");
  const batchFile = path.join(tmp, "batches", `${BATCH.id}.json`);
  fs.mkdirSync(path.dirname(batchFile), { recursive: true });
  fs.writeFileSync(batchFile, JSON.stringify(BATCH));
  const run = python ? record("record", "--engine", "stand-in", "--voice", "bf_emma", "--chapter", "jude/1", "--batch", batchFile, "--out", out) : null;

  it("records a chapter and a batch, each into the voice's own place", () => {
    expect(run?.status, run?.stderr).toBe(0);
    for (const f of ["plus/bf_emma/read/jude/1.json", "plus/bf_emma/read/jude/1.wav", `plus/bf_emma/listen/${BATCH.id}.json`, `plus/bf_emma/listen/${BATCH.id}.wav`]) {
      expect(fs.existsSync(path.join(out, f)), f).toBe(true);
    }
  });

  it("writes a chapter's timings in the shape of Heart's, a row for every verse, 0.45 s after each", () => {
    const chapter = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", "jude", "1.json"), "utf8")) as { verses: { n: number; text: string }[] };
    const heart = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "audio", "read", "john", "1.json"), "utf8")) as ReadAloudManifest;
    const t = JSON.parse(fs.readFileSync(path.join(out, "plus/bf_emma/read/jude/1.json"), "utf8")) as ReadAloudManifest;
    expect(Object.keys(t)).toEqual(Object.keys(heart));
    expect(Object.keys(t.verses[0])).toEqual(Object.keys(heart.verses[0]));
    expect(t.voice).toBe("bf_emma");
    expect(t.verses.map((v) => v.n)).toEqual(chapter.verses.map((v) => v.n));
    expect(t.verses.map((v) => v.text)).toEqual(chapter.verses.map((v) => v.text));
    expect(t.verses[0].at).toBe(0);
    t.verses.forEach((v, i) => {
      expect(hundredths(v.at) && hundredths(v.end)).toBe(true);
      expect(v.end).toBeGreaterThan(v.at);
      if (i > 0) expect(close(v.at - t.verses[i - 1].end, 0.45)).toBe(true);
    });
    expect(close(t.seconds - t.verses[t.verses.length - 1].end, 0.45)).toBe(true);
    expect(wavSamples(path.join(out, "plus/bf_emma/read/jude/1.wav"))).toBe(Math.round(t.seconds * SR));
  });

  it("writes a batch's timings as V1 says, which the app's own check accepts", () => {
    const t = JSON.parse(fs.readFileSync(path.join(out, `plus/bf_emma/listen/${BATCH.id}.json`), "utf8")) as ListenTimings;
    expect(Object.keys(t)).toEqual(["voice", "seconds", "blocks"]);
    expect(timingsFit(BATCH, t)).toBeNull();
    expect(t.blocks.map((b) => b.s.length)).toEqual(BATCH.blocks.map((b) => b.sentences.length));
    expect(t.blocks.map((b) => b.at ?? null)).toEqual(BATCH.blocks.map((b) => b.at ?? null));
    const flat = t.blocks.flatMap((b, i) => b.s.map((s, j) => ({ s, last: j === b.s.length - 1, i })));
    flat.forEach(({ s }, k) => {
      expect(hundredths(s[0]) && hundredths(s[1])).toBe(true);
      if (k > 0) expect(close(s[0] - flat[k - 1].s[1], flat[k - 1].last ? 0.9 : 0.45)).toBe(true);
    });
    expect(close(t.seconds - flat[flat.length - 1].s[1], 0.9)).toBe(true);
    expect(wavSamples(path.join(out, `plus/bf_emma/listen/${BATCH.id}.wav`))).toBe(Math.round(t.seconds * SR));
  });

  it("puts Heart where the app reads Heart, and never records Heart's published New Testament for the bucket", () => {
    const heartOut = path.join(tmp, "heart");
    const r = record("record", "--engine", "stand-in", "--voice", "af_heart", "--chapter", "obadiah/1", "--out", heartOut);
    expect(r.status, r.stderr).toBe(0);
    expect(fs.existsSync(path.join(heartOut, "read/obadiah/1.json"))).toBe(true);
    const order = [{ group: "history", batches: [{ id: BATCH.id, words: 40, minutes: 0.2 }] }];
    fs.writeFileSync(path.join(tmp, "batches", "order.json"), JSON.stringify(order));
    const runFile = path.join(tmp, "run-nt.json");
    fs.writeFileSync(runFile, JSON.stringify({ run: 1, mode: "full", rtf: 6, shardHours: 2.5, work: [{ voice: "af_heart", groups: ["new-testament"] }] }));
    const refused = record("plan", "--run", runFile, "--batches", path.join(tmp, "batches"), "--out", path.join(tmp, "plan-nt.json"));
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain("never recorded again");
    const dry = record("record", "--engine", "stand-in", "--voice", "af_heart", "--chapter", "jude/1", "--out", heartOut, "--upload");
    expect(dry.status).not.toBe(0);
    expect(dry.stderr).toContain("uploads nothing");
  });

  it("plans every recording once, in shards under their hours, in whole waves of 20", () => {
    const runFile = path.join(tmp, "run-full.json");
    fs.writeFileSync(
      runFile,
      JSON.stringify({ run: 2, mode: "full", rtf: 6, shardHours: 2.5, work: [{ voice: "af_heart", groups: ["history", "old-testament"] }, { voice: "am_fenrir", groups: ["new-testament", "history"] }] }),
    );
    const planFile = path.join(tmp, "plan.json");
    const r = record("plan", "--run", runFile, "--batches", path.join(tmp, "batches"), "--out", planFile);
    expect(r.status, r.stderr).toBe(0);
    const plan = JSON.parse(fs.readFileSync(planFile, "utf8")) as {
      shards: { hours: number; items: { voice: string; kind: string; id: string; minutes: number }[] }[];
      plus: boolean;
    };
    const items = plan.shards.flatMap((s) => s.items);
    const keys = items.map((i) => `${i.voice}|${i.kind}|${i.id}`);
    expect(new Set(keys).size).toBe(keys.length);
    const books = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", "books.json"), "utf8")) as { slug: string; testament: string; chapters: number }[];
    const chapters = (t: string) => books.filter((b) => b.testament === t).reduce((n, b) => n + b.chapters, 0);
    expect(items.filter((i) => i.voice === "af_heart" && i.kind === "chapter").length).toBe(chapters("OT"));
    expect(items.filter((i) => i.voice === "am_fenrir" && i.kind === "chapter").length).toBe(chapters("NT"));
    expect(items.filter((i) => i.kind === "batch").length).toBe(2);
    expect(plan.plus).toBe(true);
    expect(plan.shards.length % 20 === 0 || plan.shards.length < 20).toBe(true);
    const longest = Math.max(...items.map((i) => i.minutes / 6 / 60));
    for (const s of plan.shards) expect(s.hours).toBeLessThanOrEqual(2.5 + longest);
  });
});
