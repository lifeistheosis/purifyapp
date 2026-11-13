import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { checkMock, printMockCheck } from "../../../../scripts/mock-check.mjs";
const DIR = path.resolve(process.argv[2]);
const server = http.createServer((req, res) => {
  const f = path.join(DIR, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : "image/jpeg" });
  res.end(f.endsWith(".html") ? `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${fs.readFileSync(f, "utf8").replace(/loading="lazy"/g, "")}</body></html>` : fs.readFileSync(f));
}).listen(4178);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let all = true;
for (const w of [390, 1032]) {
  const p = await b.newPage({ viewport: { width: w, height: 844 }, colorScheme: "dark" });
  await p.goto("http://localhost:4178/fast-and-journal.html", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  const r = await checkMock(p, "main");
  const ok = r.failures.length === 0;
  all &&= ok;
  console.log(`${ok ? "PASS" : "FAIL"} the page at ${w}`);
  if (!ok) printMockCheck(r, `the page at ${w}`);
  if (w === 390) { await p.evaluate(() => document.querySelector("#s-fast").parentElement.querySelector("table").scrollIntoView()); await p.waitForTimeout(500); await p.screenshot({ path: path.join(DIR, "..", "page-why.png") }); }
  await p.close();
}
await b.close(); server.close();
process.exit(all ? 0 : 1);
