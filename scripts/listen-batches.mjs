// What his PC reads aloud beside the Bible (1.9): one file a recording, for
// the owner's render tool, written from the same files the pages are drawn
// from (lib/listen/batches.ts). Each file says what is read, sentence by
// sentence, and which paragraph of its page each run of sentences is, so the
// timings the tool hands back let the reader light the paragraph being read.
//
//   npm run listen:batches            every batch, into listen-batches/
//   npm run listen:batches -- --only lives        one group
//
// listen-batches/ is not kept in the repository: it is written fresh from the
// texts as they stand, so a batch is never older than the page.
// listen-batches/order.json lists the groups in the order to record them,
// each batch with its words and its length at the Bible's pace.
import fs from "node:fs";
import path from "node:path";

const { allBatches } = await import("../lib/listen/batches.ts");

const OUT = "listen-batches";
/** The Bible's own pace, from its 260 recorded chapters: 180,798 words in 16.34 hours. */
const WORDS_A_MINUTE = 184.4;
/** His PC makes sound at three quarters of the speed it plays (docs/1.7-build/BRAINSTORM.md). */
const PC_SPEED = 0.75;

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const hours = (words) => words / WORDS_A_MINUTE / 60;
const round = (n) => Math.round(n * 10) / 10;

fs.rmSync(OUT, { recursive: true, force: true });
const order = [];
for (const { group, batches } of await allBatches()) {
  if (only && only !== group) continue;
  let words = 0;
  const list = [];
  for (const batch of batches) {
    const file = path.join(OUT, `${batch.id}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(batch)}\n`);
    words += batch.words;
    list.push({ id: batch.id, words: batch.words, minutes: round(hours(batch.words) * 60) });
  }
  order.push({ group, recordings: list.length, words, hoursOfSound: round(hours(words)), hoursOfHisPc: round(hours(words) / PC_SPEED), batches: list });
  console.log(`${group}: ${list.length} recordings, ${words.toLocaleString("en-US")} words, ${round(hours(words))} hours of sound, about ${round(hours(words) / PC_SPEED)} hours of his PC`);
}
fs.writeFileSync(path.join(OUT, "order.json"), `${JSON.stringify(order, null, 1)}\n`);
const all = order.reduce((n, g) => n + g.words, 0);
console.log(`all: ${order.reduce((n, g) => n + g.recordings, 0)} recordings, ${all.toLocaleString("en-US")} words, ${round(hours(all))} hours of sound, about ${round(hours(all) / PC_SPEED)} hours of his PC`);
