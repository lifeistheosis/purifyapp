#!/usr/bin/env node
// Positional auto-extractor for jsx-no-literals violations (Beta 2.3).
//
// Runs eslint on the given directories, and for every react/jsx-no-literals
// error rewrites the literal in place:
//   client component ("use client")  ->  {t("key")}   (+ hook + import)
//   server component                 ->  <T k="key" /> (+ import)
//   quoted prop in a client file     ->  {t("key")}
// Keys are <prefix>.<camelCasedWords> derived from the text, deduped so
// identical strings share a key. New keys are appended to en.json with the
// entity-decoded, whitespace-collapsed English as the value.
//
// Usage: node scripts/i18n-extract.mjs <keyPrefix> <dir> [dir...]
// Prints every rewrite; skips (and lists) literals it cannot handle so a
// human finishes those. Idempotent: rerunning finds no violations.

import { execSync } from "node:child_process";
import fs from "node:fs";

const [prefix, ...dirs] = process.argv.slice(2);
if (!prefix || dirs.length === 0) {
  console.error("usage: node scripts/i18n-extract.mjs <keyPrefix> <dir> [dir...]");
  process.exit(2);
}

let out;
try {
  out = execSync(`npx eslint ${dirs.map((d) => `"${d}"`).join(" ")} --format json`, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
} catch (e) {
  out = e.stdout;
}
const results = JSON.parse(out);

function decodeEntities(s) {
  return s
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&lsquo;|&#8216;/g, "‘")
    .replace(/&ldquo;|&#8220;/g, "“")
    .replace(/&rdquo;|&#8221;/g, "”")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#9734;/g, "☆");
}

function keyFor(text) {
  const words = decodeEntities(text)
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5);
  if (words.length === 0 || !words.join("")) return null;
  const camel = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
  return `${prefix}.${camel}`;
}

const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));
const textToKey = new Map();
// Reuse keys whose en value already equals the text.
for (const [k, v] of Object.entries(en)) {
  if (!textToKey.has(v)) textToKey.set(v, k);
}
const newKeys = {};
const skipped = [];

for (const r of results) {
  const file = r.filePath;
  const msgs = r.messages.filter(
    (m) => m.ruleId === "react/jsx-no-literals" && m.severity === 2,
  );
  if (msgs.length === 0) continue;
  let src = fs.readFileSync(file, "utf8");
  const usedCrlf = src.includes("\r\n");
  src = src.replace(/\r\n/g, "\n");
  const isClient = src.trimStart().startsWith('"use client"');
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  const posOf = (line, col) => lineStarts[line - 1] + col - 1;

  // Collect edits, then apply last-to-first.
  const edits = [];
  for (const m of msgs) {
    const idx = posOf(m.line, m.column);
    if (src[idx] === '"' || src[idx] === "'") {
      // Quoted literal (prop or expression).
      const q = src[idx];
      const close = src.indexOf(q, idx + 1);
      if (close < 0) { skipped.push([file, m.line, "unterminated"]); continue; }
      const raw = src.slice(idx + 1, close);
      const clean = decodeEntities(raw).replace(/\s+/g, " ").trim();
      if (!/[A-Za-z]/.test(clean)) { skipped.push([file, m.line, raw]); continue; }
      if (!isClient) { skipped.push([file, m.line, "SERVER PROP: " + clean.slice(0, 40)]); continue; }
      let key = textToKey.get(clean);
      if (!key) { key = keyFor(clean); if (!key) { skipped.push([file, m.line, raw]); continue; }
        while (Object.prototype.hasOwnProperty.call(en, key) || Object.values(newKeys).length && Object.prototype.hasOwnProperty.call(newKeys, key)) key += "X";
        textToKey.set(clean, key); newKeys[key] = clean; }
      edits.push([idx, close + 1, `{t("${key}")}`]);
    } else {
      // JSXText: node runs to the next < or {.
      let end = idx;
      while (end < src.length && src[end] !== "<" && src[end] !== "{") end++;
      const raw = src.slice(idx, end);
      const clean = decodeEntities(raw).replace(/\s+/g, " ").trim();
      if (!/[A-Za-z]/.test(clean)) { skipped.push([file, m.line, raw.trim()]); continue; }
      // Trim region: preserve surrounding whitespace/newlines.
      const lead = raw.length - raw.trimStart().length;
      const trail = raw.length - raw.trimEnd().length;
      let key = textToKey.get(clean);
      if (!key) { key = keyFor(clean); if (!key) { skipped.push([file, m.line, raw.trim()]); continue; }
        while (Object.prototype.hasOwnProperty.call(en, key) || Object.prototype.hasOwnProperty.call(newKeys, key)) key += "X";
        textToKey.set(clean, key); newKeys[key] = clean; }
      const expr = isClient ? `{t("${key}")}` : `<T k="${key}" />`;
      edits.push([idx + lead, end - trail, expr]);
    }
  }
  edits.sort((a, b) => b[0] - a[0]);
  for (const [a, b, repl] of edits) src = src.slice(0, a) + repl + src.slice(b);

  if (edits.length > 0) {
    // imports + hooks
    if (isClient) {
      if (!src.includes("components/i18n/MessagesProvider")) {
        const lines = src.split("\n");
        let last = -1, inBlock = false;
        lines.forEach((l, i) => {
          if (/^import\b/.test(l)) { last = i; inBlock = !l.includes(";"); }
          else if (inBlock && l.includes(";")) { last = i; inBlock = false; }
        });
        lines.splice(last + 1, 0, `import { useTranslate } from "@/components/i18n/MessagesProvider";`);
        src = lines.join("\n");
      }
      // hook per component fn that uses t( but lacks it
      const sigRe = /^(?:export )?(?:default )?function [A-Z][A-Za-z]*\(/gm;
      let changed = true;
      while (changed) {
        changed = false;
        const sigs = [...src.matchAll(sigRe)].map((x) => x.index);
        for (let k = 0; k < sigs.length; k++) {
          const start = sigs[k];
          const end2 = k + 1 < sigs.length ? sigs[k + 1] : src.length;
          const brace = src.indexOf(") {", start);
          if (brace < 0 || brace > end2) continue;
          const body = src.slice(brace, end2);
          if (/[^a-zA-Z.]t\(["'`]/.test(body) && !body.slice(0, 240).includes("useTranslate()")) {
            src = src.slice(0, brace + 3) + "\n  const { t } = useTranslate();" + src.slice(brace + 3);
            changed = true;
            break;
          }
        }
      }
    } else if (!src.includes(`from "@/components/i18n/T"`)) {
      const lines = src.split("\n");
      let last = -1, inBlock = false;
      lines.forEach((l, i) => {
        if (/^import\b/.test(l)) { last = i; inBlock = !l.includes(";"); }
        else if (inBlock && l.includes(";")) { last = i; inBlock = false; }
      });
      lines.splice(last + 1, 0, `import { T } from "@/components/i18n/T";`);
      src = lines.join("\n");
    }
  }
  fs.writeFileSync(file, usedCrlf ? src : src);
  if (edits.length) console.log(file.split(/orthoapp[\\/]/)[1], "->", edits.length, "rewrites", isClient ? "(client)" : "(server)");
}

// Append new keys to en.json (end of file; grouped by prefix at write time).
if (Object.keys(newKeys).length) {
  const d = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));
  Object.assign(d, newKeys);
  fs.writeFileSync("lib/i18n/messages/en.json", JSON.stringify(d, null, 2) + "\n");
  console.log("added", Object.keys(newKeys).length, "keys to en.json");
}
if (skipped.length) {
  console.log("SKIPPED (manual):");
  for (const [f, l, txt] of skipped.slice(0, 30)) console.log("  ", f.split(/orthoapp[\\/]/)[1], "L" + l, String(txt).slice(0, 50));
}
