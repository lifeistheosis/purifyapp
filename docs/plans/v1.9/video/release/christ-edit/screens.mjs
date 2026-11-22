#!/usr/bin/env node
// The Christ edit's app screens: four real screens of the native export (main 6700c2e65), as a new reader with no
// Plus, Dark, Sunday 6 December 2026, each reached as a reader reaches it and taken sharp (1030 by 2115).
//
//   node docs/plans/v1.9/video/release/christ-edit/screens.mjs
import fs from "node:fs";
import path from "node:path";
import { dir, go, launchCamera, take, wait } from "../../lib.mjs";

const OUT = dir("christ");
const ONLY = process.argv[2] ?? null;
const browser = await launchCamera();
const h = await take(browser, "christ-screens", { film: false });
const shot = async (name) => {
  if (ONLY && name !== ONLY) return;
  await h.page.waitForFunction(() => [...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).every((i) => i.complete && i.naturalWidth > 0)).catch(() => {});
  await wait(900);
  const seen = await h.look(name);
  fs.writeFileSync(path.join(OUT, `${name}.png`), await h.page.screenshot({ type: "png" }));
  console.log(`  ${name}: ${seen.words.replace(/\s+/g, " ").slice(0, 90)}`);
};
try {
  const dismiss = h.page.locator('button[aria-label="Dismiss"]').first();
  await dismiss.waitFor({ state: "visible", timeout: 20000 });
  for (let n = 0; n < 4 && (await dismiss.isVisible()); n++) {
    await wait(600);
    await h.page.touchscreen.tap(...Object.values(await h.spot(dismiss)));
    await dismiss.waitFor({ state: "hidden", timeout: 4000 }).catch(() => {});
  }
  await h.page.evaluate(() => window.scrollTo(0, 0));
  await wait(1200);
  await shot("today");
  await h.tap(h.page.getByRole("link", { name: "You", exact: true }));
  await h.page.getByText("Your journal", { exact: true }).first().waitFor({ state: "visible" });
  await wait(900);
  await h.tap(h.page.getByText("Your journal", { exact: true }));
  await h.page.waitForSelector("[data-journal-today]");
  await wait(2500);
  await shot("journal");
  await go(h.page, "/saints/nicholas-the-wonderworker/");
  await wait(2500);
  await shot("saint");
  // John 14, drawn up until verse 6, the film's own words, is in the middle of the screen.
  await go(h.page, "/bible/john/14");
  await wait(2500);
  await h.page.waitForSelector('button[aria-label="Open commentary on verse 6"]');
  const at = await h.page.evaluate(() => {
    if (!document.body.textContent.replace(/\s+/g, " ").includes("I am the way, the truth, and the life: no man cometh unto the Father, but by me.")) return null;
    const r = document.querySelector('button[aria-label="Open commentary on verse 6"]').getBoundingClientRect();
    return r.top + r.height / 2;
  });
  if (at === null) throw new Error("John 14 does not show verse 6 as the film quotes it");
  await h.drag(Math.round(at - 400), 900);
  await wait(1500);
  await shot("bible");
} finally {
  const record = await h.end();
  console.log(`${record.problems.length ? "NO  " : "ok  "} screens; pictures: ${record.picturesSeen.map((p) => p.split("/").pop().split("?")[0]).join(", ") || "none"}`);
  for (const p of record.problems) console.log(`      ${p}`);
  await browser.close();
  if (record.problems.length) process.exitCode = 1;
}
