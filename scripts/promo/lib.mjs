// Shared by the promo scripts (scripts/promo/README.md): where things are
// made, a browser, the house fonts out of an export, and the page each look
// is drawn in.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Everything made lives here, out of git: screens, fonts, art, pages, pictures, clips. */
export const PROMO = process.env.PROMO_DIR ? path.resolve(process.env.PROMO_DIR) : path.join(REPO, ".promo");

/** A folder under PROMO, made if it is not there. */
export function dir(...parts) {
  const d = path.join(PROMO, ...parts);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

/** The cloud sessions carry their own Chromium (as scripts/mock-check.mjs does); elsewhere Playwright's. */
export function launch() {
  const own = "/opt/pw-browsers/chromium";
  return chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
}

/**
 * Lora and DM Sans as the export carries them (next/font), the basic Latin
 * file of each, copied to PROMO/fonts as lora.woff2 and dmsans.woff2.
 */
export function copyFonts(exportDir) {
  const chunks = path.join(exportDir, "_next", "static", "chunks");
  const want = { Lora: "lora.woff2", "DM Sans": "dmsans.woff2" };
  const found = {};
  for (const name of fs.readdirSync(chunks).filter((f) => f.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(chunks, name), "utf8");
    for (const [, body] of css.matchAll(/@font-face\{([^}]*)\}/g)) {
      const family = /font-family:\s*"?([^;"]+)"?;/.exec(body)?.[1];
      const latin = /unicode-range:\s*U\+(?:\?\?|0000-00FF)/i.test(body);
      const src = /url\(([^)]+\.woff2)\)/.exec(body)?.[1];
      if (family in want && latin && src && /font-style:\s*normal/.test(body)) found[family] = path.resolve(chunks, src);
    }
  }
  const out = dir("fonts");
  for (const [family, file] of Object.entries(want)) {
    if (!found[family]) throw new Error(`no ${family} in ${chunks}: is it a local-first export?`);
    fs.copyFileSync(found[family], path.join(out, file));
  }
}

/** The art the looks use, from the app's own public folder, its credit kept in the looks. */
export function copyArt() {
  const out = dir("art");
  fs.copyFileSync(path.join(REPO, "public", "saints", "icons", "john-chrysostom.v2.jpg"), path.join(out, "john-chrysostom.v2.jpg"));
  fs.copyFileSync(path.join(REPO, "public", "purify-cross-mark.png"), path.join(out, "purify-cross-mark.png"));
}

/** Opens a look's page (PROMO/html/<name>.html) with its fonts and pictures in. */
export async function openLook(tab, name, html) {
  const file = path.join(dir("html"), `${name}.html`);
  fs.writeFileSync(file, html);
  await tab.goto(`file://${file}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
}
