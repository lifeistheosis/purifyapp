// checkMock on every preview of the claude.ai design system (https://claude.ai/artifact/PJnQQWqgVybxZKzy2H3tt5),
// wearing the system's own tokens on the five palettes, at 360, 390 and 1032.
//
//   node docs/brand/kit/design-system-check.mjs <folder>
//
// <folder> is the system's project/ folder as the Artifact tool saves it when its files are read
// (tokens.json and components/<Name>/preview.html). The system lives on claude.ai, not in this
// repository, so read its files first. The cover is one fixed 960 layout by the type's own rule and
// is expected to be flagged for its width and its placement; every other preview must pass.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const D = process.argv[2];
const { checkMock, printMockCheck } = await import(path.join(ROOT, "scripts/mock-check.mjs"));
const { browser } = await import(path.join(ROOT, "docs/brand/kit/email/build.mjs"));
const t = JSON.parse(fs.readFileSync(path.join(D, "tokens.json"), "utf8"));
const themes = t.color.themes.map((x) => x.id);
const val = (tok, th) => (typeof tok.value === "string" ? tok.value : tok.value[th] ?? tok.value[themes[0]]);
const colours = (th) => [...t.color.tokens, ...(t.shadow?.tokens ?? [])].map((k) => `--${k.name}:${val(k, th)}`).join(";");
const rest = [...t.spacing.tokens, ...t.radius.tokens, ...(t.nightSky?.tokens ?? [])].map((k) => `--${k.name}:${k.value}`).join(";") + ";" + Object.entries(t.type.families).map(([k, v]) => `--font-${k}:${v}`).join(";");
const MODE = { light: "parchment", black: "black", candlelight: "candlelight", monastery: "monastery" };
const css = `:root,[data-theme="${themes[0]}"]{${colours(themes[0])}}\n` + themes.slice(1).map((th) => `html[data-theme="${th}"],html[data-reading-mode="${MODE[th]}"]{${colours(th)}}`).join("\n") + `\n:root{${rest}}`;
const b = await browser();
let ok = true;
const tmp = path.join(D, ".check.html");
try {
  for (const name of fs.readdirSync(path.join(D, "components")).filter((n) => fs.existsSync(path.join(D, "components", n, "preview.html"))).sort()) {
    const html = fs.readFileSync(path.join(D, "components", name, "preview.html"), "utf8").replace("<head>", `<head><style>${css}</style>`);
    fs.writeFileSync(tmp, html);
    for (const width of [360, 390, 1032]) {
      const ctx = await b.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, colorScheme: "dark" });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
      await page.waitForTimeout(150);
      const result = await checkMock(page, "body");
      const spill = await page.evaluate((w) => document.documentElement.scrollWidth > w, width);
      const good = result.failures.length === 0 && !spill;
      console.log(`${good ? "ok  " : "FAIL"}  ${name} at ${width}${spill ? " (scrolls sideways)" : ""}${result.allowed.length ? `  [allowed: ${[...new Set(result.allowed.map((a) => String(a).split(":")[0]))].join("; ").slice(0, 120)}]` : ""}`);
      if (!good) { ok = false; printMockCheck(result, `${name}, ${width} wide`); }
      await ctx.close();
    }
  }
} finally { await b.close(); fs.rmSync(tmp, { force: true }); }
console.log(ok ? "\nEvery preview passes." : "\nSome previews FAIL.");
