#!/usr/bin/env node
// Positional auto-extractor for hardcoded UI strings (Beta 2.3).
//
// Default mode: runs eslint on the given directories and, for every
// react/jsx-no-literals error, rewrites the literal in place:
//   client component ("use client")  ->  {t("key")}   (+ hook + import)
//   server component                 ->  <T k="key" /> (+ import)
// --props mode: walks the given directories and rewrites quoted
// user-facing props (placeholder=, aria-label=, title=, label=, ...)
// in CLIENT components only (server prop conversions need ReactNode
// widening, left for a human).
//
// Keys are <prefix>.<camelCasedWords> derived from the text, deduped so
// identical strings share a key; keys whose en value already equals the
// text are reused. New keys append to en.json. Idempotent.
//
// Usage: node scripts/i18n-extract.mjs [--props] <keyPrefix> <dir> [dir...]

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const propsMode = process.argv.includes("--props");
const [prefix, ...dirs] = process.argv.slice(2).filter((a) => a !== "--props");
if (!prefix || dirs.length === 0) {
  console.error("usage: node scripts/i18n-extract.mjs [--props] <keyPrefix> <dir> [dir...]");
  process.exit(2);
}

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

function makeKeyFactory(prefixStr, enObj, extraObj) {
  const textToKey = new Map();
  for (const [k, v] of Object.entries(enObj)) if (!textToKey.has(v)) textToKey.set(v, k);
  return function keyOf(clean) {
    let key = textToKey.get(clean);
    if (key) return { key, isNew: false };
    const words = clean
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 5);
    if (words.length === 0 || !words.join("")) return null;
    key =
      prefixStr +
      "." +
      words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join("");
    while (
      Object.prototype.hasOwnProperty.call(enObj, key) ||
      Object.prototype.hasOwnProperty.call(extraObj, key)
    )
      key += "X";
    textToKey.set(clean, key);
    extraObj[key] = clean;
    return { key, isNew: true };
  };
}

function addHookAndImport(src) {
  if (!src.includes("components/i18n/MessagesProvider")) {
    const lines = src.split("\n");
    let last = -1,
      inBlock = false;
    lines.forEach((l, i) => {
      if (/^import\b/.test(l)) {
        last = i;
        inBlock = !l.includes(";");
      } else if (inBlock && l.includes(";")) {
        last = i;
        inBlock = false;
      }
    });
    lines.splice(last + 1, 0, `import { useTranslate } from "@/components/i18n/MessagesProvider";`);
    src = lines.join("\n");
  }
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
  return src;
}

function addTImportLine(src) {
  if (src.includes(`from "@/components/i18n/T"`)) return src;
  const lines = src.split("\n");
  let last = -1,
    inBlock = false;
  lines.forEach((l, i) => {
    if (/^import\b/.test(l)) {
      last = i;
      inBlock = !l.includes(";");
    } else if (inBlock && l.includes(";")) {
      last = i;
      inBlock = false;
    }
  });
  lines.splice(last + 1, 0, `import { T } from "@/components/i18n/T";`);
  return lines.join("\n");
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".tsx")) yield p;
  }
}

const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));
const newKeys = {};
const keyOf = makeKeyFactory(prefix, en, newKeys);
const skipped = [];

if (propsMode) {
  const allow = JSON.parse(fs.readFileSync("scripts/i18n/scan-allowlist.json", "utf8"));
  const PROP = /((?:placeholder|aria-label|title|label|alt|confirmLabel|cancelLabel|emptyLabel)=)"([^"\n]{2,})"/g;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const rel = file.replace(/\\/g, "/");
      if (allow.files.some((f) => rel.endsWith(f))) continue;
      let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const isClient = src.trimStart().startsWith('"use client"');
      let n = 0;
      src = src.replace(PROP, (mFull, propEq, text) => {
        if (!/[A-Za-z]{2}/.test(text)) return mFull;
        if (allow.substrings.some((a) => text.includes(a))) return mFull;
        const clean = decodeEntities(text).trim();
        const res = keyOf(clean);
        if (!res) return mFull;
        if (!isClient) {
          skipped.push([rel, "SERVER PROP: " + clean.slice(0, 44)]);
          return mFull;
        }
        n++;
        return propEq + `{t("${res.key}")}`;
      });
      if (n > 0) {
        src = addHookAndImport(src);
        fs.writeFileSync(file, src);
        console.log(rel.split(/orthoapp[\\/]/).pop(), "->", n, "prop rewrites");
      }
    }
  }
} else {
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

  for (const r of results) {
    const file = r.filePath;
    const msgs = r.messages.filter(
      (m) => m.ruleId === "react/jsx-no-literals" && m.severity === 2,
    );
    if (msgs.length === 0) continue;
    let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const isClient = src.trimStart().startsWith('"use client"');
    const lineStarts = [0];
    for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
    const posOf = (line, col) => lineStarts[line - 1] + col - 1;

    const edits = [];
    for (const m of msgs) {
      const idx = posOf(m.line, m.column);
      if (src[idx] === '"' || src[idx] === "'") {
        const q = src[idx];
        const close = src.indexOf(q, idx + 1);
        if (close < 0) {
          skipped.push([file, "unterminated@" + m.line]);
          continue;
        }
        const raw = src.slice(idx + 1, close);
        const clean = decodeEntities(raw).replace(/\s+/g, " ").trim();
        if (!/[A-Za-z]/.test(clean)) {
          skipped.push([file, raw]);
          continue;
        }
        if (!isClient) {
          skipped.push([file, "SERVER PROP: " + clean.slice(0, 44)]);
          continue;
        }
        const res = keyOf(clean);
        if (!res) {
          skipped.push([file, raw]);
          continue;
        }
        edits.push([idx, close + 1, `{t("${res.key}")}`]);
      } else if (src[idx] === "`") {
        skipped.push([file, "template literal @" + m.line]);
        continue;
      } else {
        let end = idx;
        while (end < src.length && src[end] !== "<" && src[end] !== "{") end++;
        const raw = src.slice(idx, end);
        const clean = decodeEntities(raw).replace(/\s+/g, " ").trim();
        if (!/[A-Za-z]/.test(clean)) {
          skipped.push([file, raw.trim()]);
          continue;
        }
        const lead = raw.length - raw.trimStart().length;
        const trail = raw.length - raw.trimEnd().length;
        const res = keyOf(clean);
        if (!res) {
          skipped.push([file, raw.trim()]);
          continue;
        }
        const expr = isClient ? `{t("${res.key}")}` : `<T k="${res.key}" />`;
        edits.push([idx + lead, end - trail, expr]);
      }
    }
    edits.sort((a, b) => b[0] - a[0]);
    for (const [a, b, repl] of edits) src = src.slice(0, a) + repl + src.slice(b);

    if (edits.length > 0) {
      src = isClient ? addHookAndImport(src) : addTImportLine(src);
      fs.writeFileSync(file, src);
      console.log(
        file.split(/orthoapp[\\/]/).pop(),
        "->",
        edits.length,
        "rewrites",
        isClient ? "(client)" : "(server)",
      );
    }
  }
}

if (Object.keys(newKeys).length) {
  const d = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8"));
  Object.assign(d, newKeys);
  fs.writeFileSync("lib/i18n/messages/en.json", JSON.stringify(d, null, 2) + "\n");
  console.log("added", Object.keys(newKeys).length, "keys to en.json");
}
if (skipped.length) {
  console.log("SKIPPED (manual):");
  for (const [f, txt] of skipped.slice(0, 40))
    console.log("  ", String(f).split(/orthoapp[\\/]/).pop(), String(txt).slice(0, 56));
}
