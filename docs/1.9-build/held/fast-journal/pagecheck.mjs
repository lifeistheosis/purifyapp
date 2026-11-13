// The page itself: no sideways scroll at 360, 390, 412 and 1032, and one still at 390 for my eye.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
const DIR = path.resolve(process.argv[2]);
const server = http.createServer((req, res) => {
  const f = path.join(DIR, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html; charset=utf-8" : "image/jpeg" });
  res.end(f.endsWith(".html") ? `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${fs.readFileSync(f, "utf8")}</body></html>` : fs.readFileSync(f));
}).listen(4177);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const w of [360, 390, 412, 1032]) {
  const p = await b.newPage({ viewport: { width: w, height: 844 }, colorScheme: "dark" });
  await p.goto("http://localhost:4177/fast-and-journal.html", { waitUntil: "load" });
  await p.waitForTimeout(1200);
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight, bad: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length, dash: /—/.test(document.body.innerText) }));
  console.log(w, JSON.stringify(m));
  if (w === 390) { await p.screenshot({ path: path.join(DIR, "..", "page-top.png") }); await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(600); await p.screenshot({ path: path.join(DIR, "..", "page-mid.png") }); await p.evaluate(() => document.querySelector("#s-fast").parentElement.querySelector("table").scrollIntoView()); await p.waitForTimeout(600); await p.screenshot({ path: path.join(DIR, "..", "page-why.png") }); }
  await p.close();
}
await b.close(); server.close();
