#!/usr/bin/env node
// The Forever edit's one new take: the Fathers on the verse.
// Genesis 1, as the store picture for the Fathers has it (St Basil the Great; John 1 shows a picture on the heritage list), and a tap on verse 1's own commentary mark: the app's own sheet rises with the Fathers on that verse.
// Everything else is the first cut's way of filming (../record.mjs): a reader's finger, nothing drawn.
//
//   VIDEO_SHARP=4 VIDEO_SLOW=12 node docs/plans/v1.9/video/release/forever-take.mjs          the take
//   node docs/plans/v1.9/video/release/forever-take.mjs --dry                                no film: stills and the words in view
import { go, launchCamera, take, wait } from "../lib.mjs";

const dry = process.argv.includes("--dry");
const browser = await launchCamera();
const h = await take(browser, "fathers-verse", { film: !dry });
try {
  await go(h.page, "/bible/genesis/1");
  const mark = h.page.locator('button[aria-label="Open commentary on verse 1"]');
  await mark.waitFor({ state: "visible" });
  await wait(1500);
  await h.roll();
  h.mark("start");
  await h.rest(700);
  await h.look("genesis 1");
  if (dry) console.log(await h.still("before"));
  await h.tap(mark, { name: "the commentary on verse 1" });
  await h.page.getByText("It is right that any one beginning").first().waitFor({ state: "visible", timeout: 30000 });
  h.mark("fathers");
  await h.rest(1600);
  const seen = await h.look("the Fathers on the verse");
  if (dry) console.log(await h.still("fathers"), "\n", seen.words.slice(0, 900));
  await h.drag(220, 1300, { at: { x: 206, y: 600 }, name: "the commentary drawn up" });
  await h.rest(900);
  await h.look("the Fathers, lower");
  if (dry) console.log(await h.still("lower"));
} finally {
  const record = await h.end();
  console.log(`${record.problems.length ? "NO  " : "ok  "} fathers-verse: ${record.seconds}s of the app's time, ${record.frames.length} frames`);
  for (const p of record.problems) console.log(`      ${p}`);
  await browser.close();
  if (record.problems.length) process.exitCode = 1;
}
