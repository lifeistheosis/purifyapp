// A review reel (scripts/promo/README.md): one look's five moves back to
// back, each named in the corner, for choosing. Never for the ad itself: the
// clips stay clean. Needs ffmpeg and the look's clips (motion.mjs).
//
//   node scripts/promo/reel.mjs <look> [words|clean]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { LOOKS } from "./looks.mjs";
import { VARIANTS } from "./moves.mjs";
import { PROMO, dir, launch } from "./lib.mjs";

const NAMES = { rise: "Rise", reveal: "Reveal", focus: "Focus", push: "Push", float: "Float" };
const [lookArg, version = "words"] = process.argv.slice(2);
const look = LOOKS.find((l) => l.id === lookArg || l.id.startsWith(`${lookArg}-`));
if (!look) throw new Error(`no look ${lookArg}`);
const clips = VARIANTS.map((v) => path.join(PROMO, "clips", `${look.id}-${version}-${v}.mp4`));
for (const c of clips) if (!fs.existsSync(c)) throw new Error(`missing ${path.basename(c)}: run motion.mjs first`);

// The labels, in the app's own sans.
const labels = dir("labels");
const browser = await launch();
const tab = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
const files = [];
for (const [k, v] of VARIANTS.entries()) {
  const file = path.join(labels, `${k + 1}-${v}.png`);
  await tab.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: "DM Sans"; src: url(file://${path.join(PROMO, "fonts", "dmsans.woff2")}) format("woff2"); font-weight: 100 1000; }
    html, body { margin: 0; background: transparent; }
    .pill { position: absolute; left: 36px; top: 36px; display: flex; align-items: center; gap: 14px; padding: 14px 24px 14px 16px; border-radius: 999px;
      background: rgba(10,10,12,.72); color: #f4f1ea; font: 600 30px/1 "DM Sans"; letter-spacing: .01em; }
    .n { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 999px; background: #f4f1ea; color: #101013; font-size: 24px; }
  </style></head><body><div class="pill"><span class="n">${k + 1}</span>${NAMES[v]}</div></body></html>`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: file, omitBackground: true });
  files.push(file);
}
await browser.close();

const mp4 = path.join(dir("reels"), `${look.id}-${version}-five-moves.mp4`);
const n = VARIANTS.length;
const graph = `${VARIANTS.map((_, k) => `[${k}:v][${k + n}:v]overlay=0:0[v${k}]`).join(";")};${VARIANTS.map((_, k) => `[v${k}]`).join("")}concat=n=${n}:v=1:a=0,format=yuv420p[out]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...clips.flatMap((c) => ["-i", c]), ...files.flatMap((f) => ["-i", f]),
  "-filter_complex", graph, "-map", "[out]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", mp4]);
console.log("reel", path.basename(mp4));
