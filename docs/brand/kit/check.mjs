// The Purify design kit's check (docs/brand/design-kit.md).
//
//   node docs/brand/kit/check.mjs            check both templates
//   node docs/brand/kit/check.mjs --write    first write tokens.css and pieces.css
//                                            (and the mark's picture) into the
//                                            artifact template, then check
//   node docs/brand/kit/check.mjs --shots <dir>   also save a still of each
//                                            template on each palette there, at 390
//
// Phone first (the owner, 2026-11-13: "the design must be optimized for
// mobile"). Each template is opened at 360, 390 and 412 wide (touch) and at
// 1032 (a laptop), and at each width held to checkMock (scripts/mock-check.mjs)
// on the app's five palettes, and to no sideways scroll: contrast,
// 44px targets, glyph icons, palette tokens, no gold, no side stripes,
// Arabic mirroring, no em dashes, no rays, no sparkle, no empty picture, no
// dashed box, no keyboard hint, no name cut short. It exits 1 on any fail,
// and when the artifact template does not hold the kit's CSS as written.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkMock, printMockCheck, PALETTES } from "../../../scripts/mock-check.mjs";

const KIT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(KIT, "../../..");
const args = process.argv.slice(2);
const shotsAt = args.includes("--shots") ? path.resolve(args[args.indexOf("--shots") + 1]) : null;

const WIDTHS = [360, 390, 412, 1032];
const ARTIFACT = path.join(KIT, "artifact-template.html");
const EMAIL = path.join(KIT, "email-template.html");
const LOGO = path.join(ROOT, "public/purify-logo.jpg");

const BEGIN = "/* kit:begin. Written by `node docs/brand/kit/check.mjs --write` from tokens.css and pieces.css; edit those, not this. */";
const END = "/* kit:end */";

/** The kit's CSS as the artifact template must hold it. */
function kitCss() {
  const read = (f) => fs.readFileSync(path.join(KIT, f), "utf8").trim();
  return `${BEGIN}\n${read("tokens.css")}\n\n${read("pieces.css")}\n${END}`;
}

function writeArtifact() {
  let html = fs.readFileSync(ARTIFACT, "utf8");
  const a = html.indexOf(BEGIN);
  const b = html.indexOf(END);
  if (a < 0 || b < 0) throw new Error("artifact-template.html has lost its kit:begin and kit:end markers");
  html = html.slice(0, a) + kitCss() + html.slice(b + END.length);
  const logo = `data:image/jpeg;base64,${fs.readFileSync(LOGO).toString("base64")}`;
  html = html.replace(/src="(kit:purify-logo|data:image\/jpeg;base64,[^"]+)"/, `src="${logo}"`);
  fs.writeFileSync(ARTIFACT, html);
}

function artifactInStep() {
  const html = fs.readFileSync(ARTIFACT, "utf8");
  return html.includes(kitCss()) && !html.includes('src="kit:purify-logo"');
}

async function main() {
  if (args.includes("--write")) writeArtifact();
  let ok = true;
  if (!artifactInStep()) {
    console.log("NO   the artifact template does not hold tokens.css and pieces.css as written: run with --write");
    ok = false;
  }

  const { chromium } = await import("playwright");
  const own = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
  try {
    for (const [name, file] of [["the artifact template", ARTIFACT], ["the email template", EMAIL]]) for (const width of WIDTHS) {
      const phone = width < 600;
      const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: "dark", isMobile: phone, hasTouch: phone });
      // The email's picture is the one purifyapp.net serves; read it from the repository so the check needs no network.
      await ctx.route("https://purifyapp.net/purify-logo.jpg", (r) => r.fulfill({ path: LOGO, contentType: "image/jpeg" }));
      const page = await ctx.newPage();
      await page.goto(`file://${file}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const result = await checkMock(page, "body", { palettes: PALETTES });
      ok = printMockCheck(result, `${name} at ${width}`) && ok;
      // Nothing wider than the screen: the page never scrolls sideways.
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (wide > 0) {
        console.log(`  NO   width       ${name} at ${width}: the page is ${wide}px wider than the screen`);
        ok = false;
      }
      if (shotsAt && width === 390) {
        fs.mkdirSync(shotsAt, { recursive: true });
        for (const [palette, mode] of PALETTES) {
          await page.evaluate((m) => (m ? document.documentElement.setAttribute("data-reading-mode", m) : document.documentElement.removeAttribute("data-reading-mode")), mode);
          await page.screenshot({ path: path.join(shotsAt, `${path.basename(file, ".html")}-${palette}.png`), fullPage: true });
        }
        // And as a client in light mode shows it, with no palette worn.
        await page.evaluate(() => document.documentElement.removeAttribute("data-reading-mode"));
        await page.emulateMedia({ colorScheme: "light" });
        await page.screenshot({ path: path.join(shotsAt, `${path.basename(file, ".html")}-system-light.png`), fullPage: true });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log(ok ? "\nkit check: both templates pass on the five palettes at 360, 390, 412 and 1032" : "\nkit check: FAILED");
  return ok;
}

main().then(
  (ok) => process.exit(ok ? 0 : 1),
  (e) => {
    console.error(String(e?.stack ?? e));
    process.exit(1);
  },
);
