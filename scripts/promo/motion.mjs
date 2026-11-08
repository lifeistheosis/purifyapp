// Two-second clips of the promo looks (scripts/promo/README.md): each drawn
// from the look's own page, moved by moves.mjs frame by frame, captured at
// 2x and scaled down, 60 frames a second, H.264 for any editor. Needs ffmpeg.
//
//   node scripts/promo/motion.mjs <look | all> [words|clean|both] [variant,... | all]
//
// PREVIEW=1 draws five moments of each clip side by side instead, small, for
// checking a move before the long render.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { LOOKS, page } from "./looks.mjs";
import { MOTION, VARIANTS } from "./moves.mjs";
import { dir, launch, openLook } from "./lib.mjs";

const FPS = 60;
const SECONDS = 2;
const PREVIEW = process.env.PREVIEW === "1";

const [lookArg = "all", wordsArg = "both", variantArg = "all"] = process.argv.slice(2);
const looks = lookArg === "all" ? LOOKS : LOOKS.filter((l) => l.id === lookArg || l.id.startsWith(`${lookArg}-`));
if (!looks.length) throw new Error(`no look ${lookArg}`);
const versions = wordsArg === "both" ? [true, false] : [wordsArg === "words"];
const variants = variantArg === "all" ? VARIANTS : variantArg.split(",");
for (const v of variants) if (!VARIANTS.includes(v)) throw new Error(`no variant ${v}: ${VARIANTS.join(", ")}`);

const browser = await launch();
const tab = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: PREVIEW ? 0.25 : 2 })).newPage();
const OUT = dir("clips");

for (const look of looks) {
  for (const words of versions) {
    for (const variant of variants) {
      const version = words ? "words" : "clean";
      const name = `${look.id}-${version}-${variant}`;
      await openLook(tab, `${look.id}-${version}`, page(look.html(words)));
      await tab.addScriptTag({ content: MOTION });
      await tab.evaluate((v) => window.__setup(v), variant);
      if (PREVIEW) {
        const pdir = dir("qa", "preview", name);
        for (const [k, s] of [0.05, 0.3, 0.6, 1.0, 1.98].entries()) {
          await tab.evaluate((ms) => window.__seek(ms), s * 1000);
          await tab.screenshot({ path: path.join(pdir, `${k}.png`) });
        }
        console.log("preview", name);
        continue;
      }
      const frames = fs.mkdtempSync(path.join(dir("tmp"), `${name}-`));
      const started = Date.now();
      for (let i = 0; i < FPS * SECONDS; i++) {
        await tab.evaluate((ms) => window.__seek(ms), (i * 1000) / FPS);
        await tab.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 95 });
      }
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "f%04d.jpg"),
        "-vf", "scale=1080:1920:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "12",
        "-movflags", "+faststart", path.join(OUT, `${name}.mp4`)]);
      fs.rmSync(frames, { recursive: true, force: true });
      console.log("clip", name, `${Math.round((Date.now() - started) / 1000)}s`);
    }
  }
}
await browser.close();
