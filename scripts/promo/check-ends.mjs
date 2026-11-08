// Proves the "in" moves end on the still (scripts/promo/README.md): for
// every look, version and in-move, the page is moved to its last frame and
// drawn at 2x, and compared with the still frames.mjs drew. Any pixel more
// than 40 levels apart fails it. The grain is set back to where the still
// has it, since in a clip it moves every frame on purpose.
//
//   node scripts/promo/check-ends.mjs
import path from "node:path";
import sharp from "sharp";
import { LOOKS, page } from "./looks.mjs";
import { MOTION } from "./moves.mjs";
import { PROMO, dir, launch, openLook } from "./lib.mjs";

const browser = await launch();
const tab = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 })).newPage();
const OUT = dir("qa", "ends");
let worst = 0;
for (const look of LOOKS) {
  for (const words of [true, false]) {
    for (const v of ["rise", "reveal", "focus"]) {
      const version = words ? "words" : "clean";
      await openLook(tab, `${look.id}-${version}`, page(look.html(words)));
      await tab.addScriptTag({ content: MOTION });
      await tab.evaluate((x) => window.__setup(x), v);
      await tab.evaluate(() => {
        window.__seek(1983);
        for (const g of document.querySelectorAll("[data-m=grain]")) g.style.backgroundPosition = "";
      });
      const end = path.join(OUT, `${look.id}-${version}-${v}.png`);
      await tab.screenshot({ path: end });
      const [a, b] = await Promise.all([end, path.join(PROMO, "stills", `${look.id}-${version}.png`)].map((f) => sharp(f).removeAlpha().raw().toBuffer()));
      let off = 0;
      for (let i = 0; i < a.length; i += 3) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 40) off++;
      worst = Math.max(worst, off);
      console.log(`${off ? "OFF " : "ok  "} ${look.id}-${version}-${v}${off ? `: ${off} pixels` : ""}`);
    }
  }
}
await browser.close();
if (worst) {
  console.error("an in-move does not end on its still");
  process.exit(1);
}
console.log("every in-move ends on its still");
