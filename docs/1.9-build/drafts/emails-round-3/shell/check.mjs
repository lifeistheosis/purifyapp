// checkMock on the account and order shell's letters, as the kit's own email
// check measures its nine (docs/brand/kit/email/check.mjs): each letter at
// 360, 390, 412 and 1032, on the five palettes, and nothing past a phone's
// edge. Reads the HTML that render.mjs wrote.
//
//   node docs/1.9-build/drafts/emails-round-3/shell/check.mjs <dir-from-render.mjs>

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const require = createRequire(path.join(ROOT, "package.json"));
const { checkMock, printMockCheck, PALETTES } = await import(pathToFileURL(path.join(ROOT, "scripts/mock-check.mjs")).href);
const dir = path.resolve(process.argv[2]);
const letters = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
const { chromium } = require("playwright");
const own = "/opt/pw-browsers/chromium";
const b = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
let ok = true;
for (const file of letters) {
  for (const width of [360, 390, 412, 1032]) {
    const ctx = await b.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, colorScheme: "dark", isMobile: width < 500, hasTouch: width < 500 });
    const page = await ctx.newPage();
    await page.route("https://purifyapp.net/**", async (route) => {
      const f = path.join(ROOT, "public", new URL(route.request().url()).pathname);
      return fs.existsSync(f) && fs.statSync(f).isFile() ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: "" });
    });
    await page.goto(pathToFileURL(path.join(dir, file)).href, { waitUntil: "load" });
    const result = await checkMock(page, "body", { palettes: PALETTES });
    // A letter a reader gets is Dark, written inline, on every screen (his
    // word, 2026-11-13: "Dark for everyone"), so the palette rule, which asks
    // an app screen to follow the reader's palette, is not this letter's. The
    // kit's own check measures a drawing made to wear the palettes; the shell
    // has none. Every other rule is held: contrast on its own Dark, targets,
    // and the rest. What is set aside is said, never hidden.
    const palette = result.failures.filter((f) => f.check === "palette").length;
    result.failures = result.failures.filter((f) => f.check !== "palette");
    ok = printMockCheck(result, `${file}, ${width} wide`) && ok;
    if (palette) console.log(`  --   set aside: ${palette} palette finding(s), the letter being Dark by design`);
    const spill = await page.evaluate((asked) => {
      const out = [];
      if (document.documentElement.scrollWidth > asked) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth} wide)`);
      for (const el of document.body.querySelectorAll("p, td, a, h1")) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > asked + 0.5 || r.left < -0.5)) out.push(`past the edge: ${(el.innerText || "").slice(0, 40)}`);
      }
      return out;
    }, width);
    if (spill.length) {
      ok = false;
      console.log(`  FAIL spill at ${width}: ${spill.join("; ")}`);
    }
    await ctx.close();
  }
}
await b.close();
console.log(ok ? `the shell's ${letters.length} letters pass at 360, 390, 412 and 1032` : "the shell's letters FAIL");
process.exit(ok ? 0 : 1);
