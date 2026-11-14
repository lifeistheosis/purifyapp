// Updates 69: one tap on the export, recorded and judged by the motion walk's own frame judge
// (scripts/gate/frames.mjs), the walk's phone and the walk's way of reaching the page and
// tapping, so a variant of the stylesheet can be compared with the export as it stands.
//
//   node docs/handoffs/updates-69-runners/judge69.mjs <out> [--from /bible/john/1/]
//     [--link "Next: John 2"] [--mode on|reduce] [--runs 3] [--css "<rules added before the tap>"]
//
// Prints, for each run, the judge's fails and every dip and glide it listed.

import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { judgeFrames, recordFrames } from "../../../scripts/gate/frames.mjs";
import { installGate } from "../../../scripts/gate/inpage.mjs";
import { motionOptions, pinMotion } from "../../../scripts/lib/motion.mjs";
import { NATIVE_UA, go, serveLikeTheShell } from "../../../scripts/lib/shell-server.mjs";
import { firstTouch, fresh, tapAt } from "../../../scripts/lib/tap.mjs";

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv.splice(i, 2)[1] : d;
};
const FROM = flag("--from", "/bible/john/1/");
const LINK = flag("--link", "Next: John 2");
const MODE = flag("--mode", "on");
const RUNS = Number(flag("--runs", "3"));
const CSS = flag("--css", "");
const OUT = path.resolve(argv[0] ?? "out");
const RECORD = { moves: MODE === "reduce", width: 390, height: 844, minMs: 900, stillMs: 450, maxMs: 2600 };

const OWN = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(OWN) ? { executablePath: OWN } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: true, hasTouch: true, userAgent: NATIVE_UA, ...motionOptions(MODE) });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("purify:onboarded", "99");
    localStorage.setItem("purify:whatsNewSeen", "99");
  } catch {}
});
await pinMotion(ctx, MODE);
await installGate(ctx);
await serveLikeTheShell(ctx, OUT, {});
const first = await ctx.newPage();
await go(first, "/", { timeout: 60000 });
await first.waitForTimeout(1500);
const kept = await first.evaluate(() => Object.entries({ ...localStorage }));
await first.close();

console.log(`${FROM} tap "${LINK}", motion ${MODE}${CSS ? `, with: ${CSS}` : ", the export as it stands"}`);
for (let run = 1; run <= RUNS; run++) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await fresh(page, FROM, kept);
  if (CSS) await page.addStyleTag({ content: CSS });
  await firstTouch(page, cdp);
  await page.waitForTimeout(300);
  const box = await page.getByRole("link", { name: LINK, exact: true }).first().boundingBox();
  if (!box) throw new Error(`no link named ${LINK} on ${FROM}`);
  const rec = await recordFrames(page, cdp, () => tapAt(cdp, box.x + box.width / 2, box.y + box.height / 2), RECORD);
  const v = await judgeFrames(rec, { motion: MODE });
  const said = [...v.fails.map((f) => `FAIL ${f.kind}: ${f.detail}`), ...(v.dips ?? []).map((d) => `dip: ${d}`), ...(v.glides ?? []).map((g) => `glide: ${g}`)];
  console.log(`  run ${run}: answered ${v.answered}ms, ${said.length ? said.join(" | ") : "nothing listed"}${v.unsure.length ? ` (unsure: ${v.unsure.length})` : ""}`);
  await page.close();
}
await browser.close();
