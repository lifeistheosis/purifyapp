#!/usr/bin/env node
// The release film's own take: the translations list, drawn up through the Bibles to download.
// The first cut's take (../record.mjs bibles) waits for a sheet named "Translation", which main 6700c2e65 does not
// name so; this one waits for the list's own first Bible to download. Everything else is that take's: a reader's
// finger, the app's own sheet, nothing drawn.
//
//   VIDEO_SHARP=4 VIDEO_SLOW=12 node docs/plans/v1.9/video/release/take.mjs
import { go, launchCamera, take, wait } from "../lib.mjs";

const browser = await launchCamera();
const h = await take(browser, "bibles", {});
try {
  await go(h.page, "/bible/john/1");
  await h.page.waitForSelector('button[aria-label="Open commentary on verse 1"]');
  await wait(1500);
  await h.roll();
  h.mark("start");
  await h.rest(500);
  await h.tap(h.page.getByRole("button", { name: /Switch translation/ }), { name: "KJV" });
  await h.page.getByText("World English Bible", { exact: true }).first().waitFor({ state: "visible" });
  h.mark("list");
  await h.rest(900);
  await h.look("translations");
  await h.drag(330, 1300, { at: { x: 206, y: 640 }, name: "to the Bibles to download" });
  await h.rest(500);
  await h.drag(300, 1200, { at: { x: 206, y: 640 }, name: "further" });
  await h.rest(1100);
  await h.look("the Bibles to download");
} finally {
  const record = await h.end();
  console.log(`${record.problems.length ? "NO  " : "ok  "} bibles: ${record.seconds}s of the app's time, ${record.frames.length} frames`);
  for (const p of record.problems) console.log(`      ${p}`);
  await browser.close();
  if (record.problems.length) process.exitCode = 1;
}
