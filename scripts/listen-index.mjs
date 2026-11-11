// The list of texts that have a recording, written from the timings
// themselves (lib/listen/recordings.ts): a text is on it when its timings,
// public/audio/listen/<id>.json, are there AND answer what was read, block
// for block and sentence for sentence (lib/listen/texts.ts, timingsFit). A
// text that was edited after it was recorded falls off the list until it is
// recorded again, so the reader never lights the wrong paragraph.
//
// Its recording is in Purify's bucket (audio.purifyapp.net/listen/<id>.mp3),
// uploaded before the list names it, and never in this repository.
//
// Two copies of the same list: data/listen/index.json, which every build
// carries, and public/audio/listen/index.json, which the apps ask the website
// for, so a text recorded after an app was built still gets Listen there.
//
//   npm run listen:index
import fs from "node:fs";
import path from "node:path";

const { allBatches } = await import("../lib/listen/batches.ts");
const { timingsFit } = await import("../lib/listen/texts.ts");

const ROOT = path.join("public", "audio", "listen");
const list = [];
const refused = [];
for (const { batches } of await allBatches()) {
  for (const batch of batches) {
    const file = path.join(ROOT, `${batch.id}.json`);
    if (!fs.existsSync(file)) continue;
    let why;
    try {
      const timings = JSON.parse(fs.readFileSync(file, "utf8"));
      why = timingsFit(batch, timings);
      // The recording's name and whose words it reads go into its timings, so
      // the player can name a recording it steps to from any page.
      if (!why && (timings.title !== batch.title || timings.by !== batch.by)) {
        fs.writeFileSync(file, `${JSON.stringify({ ...timings, title: batch.title, by: batch.by })}\n`);
      }
    } catch (e) {
      why = `not timings: ${String(e?.message ?? e).split("\n")[0]}`;
    }
    if (why) refused.push(`${batch.id}: ${why}`);
    else list.push(batch.id);
  }
}
list.sort();
const json = `${JSON.stringify(list)}\n`;
fs.mkdirSync(path.join("data", "listen"), { recursive: true });
fs.writeFileSync(path.join("data", "listen", "index.json"), json);
fs.writeFileSync(path.join(ROOT, "index.json"), json);
console.log(`${list.length} texts have a recording`);
if (refused.length) {
  console.log(`${refused.length} timings were not taken:`);
  for (const r of refused) console.log(`  ${r}`);
  process.exitCode = 1;
}
