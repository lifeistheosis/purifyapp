// The account and order emails' shell, drawn for his look (Updates 28,
// 2026-11-13): three real emails as the app builds them (lib/email/layout.ts
// and blocks.ts, through the templates and the shop's sender), saved as HTML
// and photographed at a phone's width, so the shell's colours can be seen
// before and after it is brought to Dark (lib/email/theme.ts EMAIL_THEMES.night).
//
//   node docs/1.9-build/drafts/emails-round-3/shell/render.mjs <out-dir> [width ...]
//
// Nothing is sent: the shop's sender is handed a stand-in for the ledger that
// keeps the letter instead. Pictures the letters name on purifyapp.net are
// served from this checkout's public/, so a still shows what the merge serves.
// Sample words are plain and say what they are.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const require = createRequire(path.join(ROOT, "package.json"));
const { createJiti } = require("jiti");

const out = path.resolve(process.argv[2] ?? "shell-stills");
const widths = (process.argv.slice(3).length ? process.argv.slice(3) : ["390"]).map(Number);
fs.mkdirSync(out, { recursive: true });

// Stand-ins: "server-only" (nothing to guard outside a server), and the
// ledger, which keeps the letter it is handed instead of sending it.
const stubs = path.join(out, ".stubs");
fs.mkdirSync(stubs, { recursive: true });
fs.writeFileSync(path.join(stubs, "server-only.mjs"), "export {};\n");
fs.writeFileSync(
  path.join(stubs, "ledger.mjs"),
  "export async function sendLoggedEmail(kind, msg) { (globalThis.__kept ??= []).push({ kind, ...msg }); return { ok: true }; }\n",
);
const jiti = createJiti(import.meta.url, {
  alias: { "@/lib/email/ledger": path.join(stubs, "ledger.mjs"), "server-only": path.join(stubs, "server-only.mjs"), "@": ROOT },
  moduleCache: false,
  fsCache: false,
});
const load = (rel) => jiti.import(path.join(ROOT, rel));

const account = await load("lib/email/templates/account.ts");
const orders = await load("lib/email/templates/orders.ts");
const build = await load("lib/email/templates/build.ts");
const shop = await load("lib/shop/orderEmails.ts");
const { T } = await load("lib/email/theme.ts");

async function kept(send) {
  globalThis.__kept = [];
  await send();
  return globalThis.__kept.at(-1).html;
}

const letters = [
  // An account email, with the first-week guide's line (Updates 23), shown as it is while the guide reaches readers.
  ["welcome", account.welcomeEmail({ firstWeek: build.siteUrl("/email/first-week?t=sample") }).html],
  // An order email with its amounts and its quiet note.
  [
    "order-confirmed",
    await kept(() =>
      shop.sendOrderConfirmationEmail({
        id: "00000000-0000-4000-8000-000000000001",
        email: "reader@example.com",
        total_cents: 4300,
        currency: "usd",
        items: [{ title: "Sample icon", quantity: 1, unit_price_cents: 3800 }],
      }),
    ),
  ],
  // An order email with the value the eye lands on, the tracking number.
  ["order-shipped", orders.orderShippedEmail({ orderNumber: "PUR-SAMPLE", tracking: "SAMPLE 0000 0000 0000", link: { carrier: "USPS", url: "https://example.com/track" } }).html],
];

for (const [name, html] of letters) fs.writeFileSync(path.join(out, `${name}.html`), html);
fs.writeFileSync(path.join(out, "theme.json"), JSON.stringify(T, null, 2));

const { chromium } = require("playwright");
const own = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(fs.existsSync(own) ? { executablePath: own } : {});
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2 });
  await page.route("https://purifyapp.net/**", async (route) => {
    const file = path.join(ROOT, "public", new URL(route.request().url()).pathname);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    return route.fulfill({ status: 404, body: "" });
  });
  for (const [name] of letters) {
    await page.goto(`file://${path.join(out, `${name}.html`)}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(out, `${name}-${w}.png`), fullPage: true });
  }
  await page.close();
}
await browser.close();
fs.rmSync(stubs, { recursive: true, force: true });
console.log(`wrote ${letters.length} letters and ${letters.length * widths.length} stills to ${out}`);
