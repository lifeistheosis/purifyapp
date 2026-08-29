#!/usr/bin/env node
/**
 * Cut the untranslated strings of a locale into batches, and merge them back.
 *
 * WHY BATCHES AND FILES. There are ~35,600 missing strings across twenty
 * locales. That is far too much to carry through a conversation, and a single
 * giant blob is the worst possible unit of work: one malformed character and
 * the whole pass is lost with nothing to resume from. Batches are small,
 * independently valid, independently retryable, and a failed one costs only
 * itself.
 *
 * THE MERGE IS THE SAFETY. Nothing written by a translator is trusted. Every
 * batch is checked before a single key reaches a catalog: the JSON must parse,
 * every key must already exist in en.json, every value must be a non-empty
 * string, placeholders must match the English exactly, and em dashes are
 * rejected outright. A batch that fails is skipped whole and named, so the
 * catalog is never left half-written.
 *
 * Usage:
 *   node scripts/i18n-batch.mjs cut ru --size 120 --ns nav,common,ui
 *   node scripts/i18n-batch.mjs merge ru
 *   node scripts/i18n-batch.mjs status
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "lib", "i18n", "messages");
const WORK = join(ROOT, ".i18n-work");

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const enPath = join(DIR, "en.json");

function placeholders(v) {
  return new Set((String(v).match(/\{[a-zA-Z0-9_]+\}/g) ?? []));
}

/** Keys the locale is missing, in en.json's own order so batches stay coherent. */
function missingFor(code) {
  const en = read(enPath);
  const cur = read(join(DIR, `${code}.json`));
  return Object.keys(en).filter((k) => !(k in cur));
}

/**
 * Keys that are PRESENT but still hold the English text.
 *
 * These are worse than missing, because nothing reports them: the key resolves,
 * the audit counts the locale as covering it, and the reader simply gets
 * English. Twelve locales carry the same eleven, all of them account.* and
 * pwa.install.*, so a Russian reader is told "Sign in to sync" in English on
 * their own account screen.
 *
 * A short value is excluded because plenty are legitimately identical: "Amen",
 * "Email", "Purify Plus", "OK". Three words or more is the point where matching
 * English stops being a coincidence.
 */
function untranslatedFor(code) {
  const en = read(enPath);
  const cur = read(join(DIR, `${code}.json`));
  return Object.keys(en).filter(
    (k) =>
      k in cur &&
      typeof cur[k] === "string" &&
      cur[k] === en[k] &&
      String(en[k]).trim().split(/\s+/).length > 2,
  );
}

function cut(code, size, namespaces, includeUntranslated = true, byteBudget = 6000) {
  const en = read(enPath);
  let keys = missingFor(code);
  if (includeUntranslated) keys = keys.concat(untranslatedFor(code));
  if (namespaces?.length) {
    keys = keys.filter((k) => namespaces.includes(k.split(".")[0]));
  }
  // en.json order, so a batch reads as a coherent run of one screen's strings
  // rather than the missing ones followed by the stale ones.
  const rank = new Map(Object.keys(en).map((k, i) => [k, i]));
  keys.sort((a, b) => rank.get(a) - rank.get(b));
  const dir = join(WORK, code);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });

  // Sized by BYTES, not by key count.
  //
  // The first pilot cut Romanian at a flat 200 keys and produced batches of
  // 4KB and 37KB from the same run, because `nav.today` is two words and
  // `study.theSevenCouncilsOfThe` is a paragraph. The 37KB one was still going
  // long after the 4KB one had finished. A character budget makes every batch
  // roughly the same amount of work, which is what makes the run predictable
  // and a retry cheap. `size` stays as a hard ceiling on key count.
  const groups = [];
  let cur = [];
  let budget = 0;
  for (const k of keys) {
    const cost = k.length + String(en[k]).length + 8;
    if (cur.length && (budget + cost > byteBudget || cur.length >= size)) {
      groups.push(cur);
      cur = [];
      budget = 0;
    }
    cur.push(k);
    budget += cost;
  }
  if (cur.length) groups.push(cur);

  let n = 0;
  for (const slice of groups) {
    const payload = {};
    for (const k of slice) payload[k] = en[k];
    writeFileSync(
      join(dir, `in-${String(n).padStart(3, "0")}.json`),
      JSON.stringify(payload, null, 2),
      "utf8",
    );
    n += 1;
  }
  console.log(`${code}: ${keys.length} strings -> ${n} batches in .i18n-work/${code}`);
  return n;
}

/** Everything a batch has to satisfy before any of it is kept. */
function validateBatch(en, obj) {
  const problems = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!(k in en)) {
      problems.push(`unknown key ${k}`);
      continue;
    }
    if (typeof v !== "string") {
      problems.push(`${k}: not a string`);
      continue;
    }
    if (v.trim() === "") {
      problems.push(`${k}: empty`);
      continue;
    }
    if (v.includes("—")) problems.push(`${k}: em dash`);
    const want = placeholders(en[k]);
    const got = placeholders(v);
    const missing = [...want].filter((p) => !got.has(p));
    const extra = [...got].filter((p) => !want.has(p));
    if (missing.length) problems.push(`${k}: lost ${missing.join(",")}`);
    if (extra.length) problems.push(`${k}: invented ${extra.join(",")}`);
  }
  return problems;
}

function merge(code) {
  const en = read(enPath);
  const dir = join(WORK, code);
  if (!existsSync(dir)) {
    console.log(`${code}: nothing to merge`);
    return { added: 0, rejected: [] };
  }
  const outs = readdirSync(dir).filter((f) => f.startsWith("out-") && f.endsWith(".json")).sort();
  const target = join(DIR, `${code}.json`);
  const cur = read(target);

  let added = 0;
  const rejected = [];
  for (const f of outs) {
    let obj;
    try {
      obj = read(join(dir, f));
    } catch (e) {
      rejected.push(`${f}: will not parse (${e.message})`);
      continue;
    }
    const problems = validateBatch(en, obj);
    if (problems.length) {
      // Whole batch skipped. A partially applied batch is the state nobody can
      // reason about later, and the batch is cheap to redo.
      rejected.push(`${f}: ${problems.slice(0, 4).join("; ")}${problems.length > 4 ? ` (+${problems.length - 4})` : ""}`);
      continue;
    }
    for (const [k, v] of Object.entries(obj)) {
      // A real translation is never overwritten. The one exception is a value
      // that still holds the English text, which is not a translation at all,
      // and is the whole reason untranslatedFor exists.
      if (k in cur && cur[k] !== en[k]) continue;
      if (cur[k] === v) continue;
      cur[k] = v;
      added += 1;
    }
  }

  // Written back in en.json's key order, so a diff shows new strings in the
  // place they belong rather than scattered at the end.
  const ordered = {};
  for (const k of Object.keys(en)) if (k in cur) ordered[k] = cur[k];
  for (const k of Object.keys(cur)) if (!(k in ordered)) ordered[k] = cur[k];
  writeFileSync(target, JSON.stringify(ordered, null, 2) + "\n", "utf8");

  console.log(`${code}: +${added} strings${rejected.length ? `, ${rejected.length} batch(es) rejected` : ""}`);
  for (const r of rejected) console.log(`  REJECTED ${r}`);
  return { added, rejected };
}

function status() {
  const en = read(enPath);
  const total = Object.keys(en).length;
  const codes = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "en.json")
    .map((f) => f.replace(/\.json$/, "")).sort();
  let missing = 0;
  for (const c of codes) {
    const m = missingFor(c).length;
    missing += m;
    const pct = (((total - m) / total) * 100).toFixed(1);
    console.log(`${c.padEnd(4)} ${pct.padStart(6)}%  missing ${String(m).padStart(5)}`);
  }
  console.log(`\ntotal missing: ${missing}`);
}

const [cmd, code, ...rest] = process.argv.slice(2);
const sizeArg = rest.indexOf("--size");
const nsArg = rest.indexOf("--ns");
const size = sizeArg >= 0 ? parseInt(rest[sizeArg + 1], 10) : 200;
const bArg = rest.indexOf("--bytes");
const byteBudget = bArg >= 0 ? parseInt(rest[bArg + 1], 10) : 6000;
const ns = nsArg >= 0 ? rest[nsArg + 1].split(",") : null;

if (cmd === "cut") cut(code, size, ns, true, byteBudget);
else if (cmd === "merge") merge(code);
else if (cmd === "status") status();
else {
  console.error("usage: i18n-batch.mjs <cut|merge|status> [locale] [--size N] [--ns a,b]");
  process.exit(1);
}
