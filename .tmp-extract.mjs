import fs from "node:fs";
const path = process.argv[2];
if (!path) { console.error("usage: node .tmp-extract.mjs <html>"); process.exit(1); }
let s = fs.readFileSync(path, "utf-8");
const m = s.match(/mw-parser-output([\s\S]*?)<!--\s*NewPP/);
if (m) s = m[1];
s = s.replace(/<script[\s\S]*?<\/script>/g, "")
     .replace(/<style[\s\S]*?<\/style>/g, "")
     .replace(/<sup[\s\S]*?<\/sup>/g, "")
     .replace(/<span class="mw-editsection[\s\S]*?<\/span>/g, "")
     .replace(/<table[\s\S]*?<\/table>/g, "")
     .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g, "\n\n###H$1### $2\n\n")
     .replace(/<\/p\s*>/g, "\n\n")
     .replace(/<br\s*\/?>/g, "\n")
     .replace(/<[^>]+>/g, "")
     .replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
     .replace(/&hellip;/g, "…").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
     .replace(/&lsquo;/g, "‘").replace(/&rsquo;/g, "’").replace(/&amp;/g, "&")
     .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
     .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
     .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const paras = s.split(/\n\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
console.log(paras.join("\n\n"));
