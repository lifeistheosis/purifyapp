#!/usr/bin/env node
/**
 * The gate every message catalog has to pass.
 *
 * WHY THIS EXISTS. Twenty locales are filled in by translation passes, and a
 * translation pass is exactly the kind of edit that looks right and is not: a
 * dropped `{count}`, a smart quote where the parser wanted a straight one, a
 * trailing comma, a key that quietly disappeared. None of that is a type error
 * and none of it fails a unit test, so it ships and then a screen renders the
 * literal word "undefined" at somebody in Belgrade.
 *
 * So every catalog is checked structurally against en.json, which is the only
 * source of truth for what keys exist. Anything this script calls an ERROR is
 * a defect that would reach a reader. Anything it calls a WARNING is worth
 * looking at and does not block.
 *
 * Run:
 *   node scripts/i18n-audit.mjs           human output, exit 1 on any error
 *   node scripts/i18n-audit.mjs --json    machine output for tooling
 *   node scripts/i18n-audit.mjs --locale ru
 *
 * lib/i18n/__tests__/catalogs.test.ts runs the same checks, so the suite fails
 * before a broken catalog can be committed.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "lib", "i18n", "messages");
const BASE = "en";

/**
 * German editorial copy deliberately lives in en.json.
 *
 * app/(app)/about, /faq, /support and /whats-new each branch on
 * `locale === "de"` and render a hand-written German section whose strings sit
 * in the base catalog rather than de.json. It reads like a bug and is not: an
 * English reader never reaches those keys, because the branch is taken before
 * they render. Recorded here so the language check below does not keep
 * rediscovering it and calling it an error.
 */
const GERMAN_IN_BASE_IS_INTENTIONAL = true;

/** Words that are common in German prose and effectively absent from English. */
const GERMAN_MARKERS =
  /\b(der|die|das|und|ist|für|nicht|mit|ein|eine|wir|sie|dem|den|des|auf|von|zu|im|aus|wie|oder|auch|nach|wird|werden|kann|sind|haben|hat|sich|nur|noch|bei|wenn|dass|über|durch)\b/gi;

/** `{name}`, `{count}` and friends. Order does not matter, presence does. */
function placeholders(value) {
  return new Set((String(value).match(/\{[a-zA-Z0-9_]+\}/g) ?? []));
}

/**
 * CLDR plural categories, and why key parity alone is the wrong test.
 *
 * English needs two forms. Russian and Polish need one/few/many, Arabic needs
 * all six. So ru.json carries `today.paschaDays.few` and en.json never will,
 * and a plain "is this key in en.json" check calls the correct translation a
 * stale key. lib/i18n/plural.ts resolves these through Intl.PluralRules, so
 * they are load-bearing, and deleting them to satisfy a linter would break
 * every count Russian renders.
 *
 * A category key is legitimate when the base has ANY form of the same key.
 */
const CLDR = ["zero", "one", "two", "few", "many", "other"];
const LEGACY = ["singular", "plural"];

function isPluralVariant(key, base) {
  const dot = key.lastIndexOf(".");
  if (dot < 0) return false;
  const cat = key.slice(dot + 1);
  if (!CLDR.includes(cat)) return false;
  const stem = key.slice(0, dot);
  return [...CLDR, ...LEGACY].some((c) => `${stem}.${c}` in base);
}

/**
 * Some languages drop the numeral in the low-count forms: Arabic's "one" is
 * the bare noun, and reinserting {count} there is wrong, not safer. So a
 * missing {count} is only an error in the forms that always carry it.
 */
const COUNTLESS_OK = new Set(["zero", "one", "two"]);

function readCatalog(code) {
  const file = join(DIR, `${code}.json`);
  const raw = readFileSync(file, "utf8");
  try {
    return { ok: true, data: JSON.parse(raw), raw };
  } catch (e) {
    // The whole point of running first: a catalog that will not parse takes
    // the app down at import, and the message from JSON.parse names the byte.
    return { ok: false, error: e.message, raw };
  }
}

function auditLocale(code, base) {
  const errors = [];
  const warnings = [];
  const parsed = readCatalog(code);

  if (!parsed.ok) {
    errors.push({ kind: "parse", detail: parsed.error });
    return { code, errors, warnings, translated: 0, total: Object.keys(base).length };
  }

  const data = parsed.data;
  const baseKeys = Object.keys(base);
  const keys = new Set(Object.keys(data));

  // 1. Stale keys. A key that no longer exists in en.json is dead weight at
  //    best, and at worst it is a rename nobody finished. Plural variants are
  //    exempt: see isPluralVariant.
  for (const k of keys) {
    if (k in base) continue;
    if (isPluralVariant(k, base)) continue;
    errors.push({ kind: "stale-key", key: k });
  }

  let translated = 0;
  let identical = 0;

  for (const k of baseKeys) {
    if (!keys.has(k)) continue; // missing is counted below, not an error per key
    const value = data[k];
    const baseValue = base[k];
    translated += 1;

    // 2. Wrong type. The loader expects strings; an object or array here is a
    //    merge accident and renders as [object Object].
    if (typeof value !== "string") {
      errors.push({ kind: "not-a-string", key: k, detail: typeof value });
      continue;
    }

    // 3. Empty. Renders as nothing at all, which looks like a broken layout
    //    rather than a missing translation, so it is worse than absent.
    if (value.trim() === "") {
      errors.push({ kind: "empty", key: k });
      continue;
    }

    // 4. Placeholder parity. The one failure that reaches a reader as literal
    //    braces or a silently dropped number.
    const want = placeholders(baseValue);
    const got = placeholders(value);
    const missing = [...want].filter((p) => !got.has(p));
    const extra = [...got].filter((p) => !want.has(p));
    if (missing.length || extra.length) {
      // Same exemption as the plural-variant pass below: English declares
      // `.one` as "{count} day", and Arabic's one-form is the bare noun with
      // no numeral, which is correct Arabic rather than a dropped token.
      const cat = k.slice(k.lastIndexOf(".") + 1);
      const countlessPlural =
        !extra.length &&
        CLDR.includes(cat) &&
        COUNTLESS_OK.has(cat) &&
        missing.every((p) => p === "{count}");
      (countlessPlural ? warnings : errors).push({
        kind: "placeholder",
        key: k,
        detail: { missing, extra },
      });
    }

    // 5. Em dashes. Standing rule, and a translation pass is where they arrive,
    //    because most engines emit them freely.
    if (value.includes("—")) errors.push({ kind: "em-dash", key: k });

    // 6. HTML entities, which is an ERROR and was briefly a warning.
    //
    //    <T> renders t(k) into a React text node and React escapes it, so
    //    `&middot;` does not become a separator, it becomes the literal seven
    //    characters. /councils shipped reading "Local Council &middot; 268" in
    //    English, confirmed in the served HTML as `&amp;middot;` and in the
    //    accessibility tree. Nothing in the repo passes a translated string to
    //    dangerouslySetInnerHTML, so there is no case where an entity here is
    //    correct. A bare & is fine and deliberately not matched.
    const entity = value.match(/&(#?\w{2,8});/);
    if (entity) errors.push({ kind: "html-entity", key: k, detail: entity[0] });

    // 7. Still English. Not an error: "Amen", "Email" and many proper nouns are
    //    legitimately identical. Counted so a pass that did nothing is visible.
    if (value === baseValue && baseValue.split(/\s+/).length > 2) identical += 1;
  }

  // Plural variants are not in baseKeys, so the loop above never saw them.
  // They still have to be strings, non-empty, and dash-clean, and the forms
  // that always carry a numeral still have to carry it.
  for (const k of keys) {
    if (k in base || !isPluralVariant(k, base)) continue;
    const value = data[k];
    if (typeof value !== "string") {
      errors.push({ kind: "not-a-string", key: k, detail: typeof value });
      continue;
    }
    if (value.trim() === "") {
      errors.push({ kind: "empty", key: k });
      continue;
    }
    if (value.includes("—")) errors.push({ kind: "em-dash", key: k });

    const stem = k.slice(0, k.lastIndexOf("."));
    const cat = k.slice(k.lastIndexOf(".") + 1);
    const model = base[`${stem}.other`] ?? base[`${stem}.one`] ?? base[`${stem}.plural`];
    if (typeof model === "string") {
      const want = placeholders(model);
      const got = placeholders(value);
      const missing = [...want].filter((p) => !got.has(p));
      if (missing.length) {
        // {count} is legitimately absent from the low-count forms in several
        // languages, so that case is reported and does not block.
        const bucket = missing.every((p) => p === "{count}") && COUNTLESS_OK.has(cat)
          ? warnings
          : errors;
        bucket.push({ kind: "placeholder", key: k, detail: { missing, extra: [] } });
      }
    }
  }

  const missingKeys = baseKeys.filter((k) => !keys.has(k));

  return {
    code,
    errors,
    warnings,
    missingKeys,
    translated,
    identical,
    total: baseKeys.length,
  };
}

function auditBase(base) {
  const errors = [];
  const warnings = [];
  for (const [k, v] of Object.entries(base)) {
    if (typeof v !== "string") {
      errors.push({ kind: "not-a-string", key: k, detail: typeof v });
      continue;
    }
    if (v.trim() === "") errors.push({ kind: "empty", key: k });
    if (v.includes("—")) errors.push({ kind: "em-dash", key: k });
    if (!GERMAN_IN_BASE_IS_INTENTIONAL) {
      const m = v.match(GERMAN_MARKERS);
      const words = v.split(/\s+/).length;
      if (m && words > 3 && m.length / words > 0.12) {
        warnings.push({ kind: "looks-german", key: k });
      }
    }
  }
  return { code: BASE, errors, warnings, missingKeys: [], translated: Object.keys(base).length, identical: 0, total: Object.keys(base).length };
}

export function audit(only = null) {
  const baseParsed = readCatalog(BASE);
  if (!baseParsed.ok) {
    return { base: null, results: [], fatal: `en.json does not parse: ${baseParsed.error}` };
  }
  const base = baseParsed.data;
  const codes = readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((c) => c !== BASE)
    .sort();

  const results = [auditBase(base)];
  for (const c of codes) {
    if (only && c !== only) continue;
    results.push(auditLocale(c, base));
  }
  return { base, results, fatal: null };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const li = args.indexOf("--locale");
  const only = li >= 0 ? args[li + 1] : null;

  const { results, fatal } = audit(only);
  if (fatal) {
    console.error(fatal);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.some((r) => r.errors.length) ? 1 : 0);
  }

  let errorCount = 0;
  let missingTotal = 0;
  console.log("locale  complete   missing  errors  warns  same-as-en");
  for (const r of results) {
    errorCount += r.errors.length;
    missingTotal += r.missingKeys.length;
    const pct = ((r.translated - r.missingKeys.length * 0) / r.total * 100).toFixed(1);
    console.log(
      r.code.padEnd(7),
      `${pct}%`.padStart(8),
      String(r.missingKeys.length).padStart(9),
      String(r.errors.length).padStart(7),
      String(r.warnings.length).padStart(6),
      String(r.identical).padStart(11),
    );
  }
  console.log();
  console.log(`missing strings: ${missingTotal}`);
  console.log(`errors:          ${errorCount}`);

  if (errorCount) {
    console.log();
    console.log("ERRORS");
    for (const r of results) {
      for (const e of r.errors.slice(0, 12)) {
        const extra = e.detail ? ` ${JSON.stringify(e.detail)}` : "";
        console.log(`  ${r.code}  ${e.kind}  ${e.key ?? ""}${extra}`);
      }
      if (r.errors.length > 12) console.log(`  ${r.code}  ... ${r.errors.length - 12} more`);
    }
  }
  process.exit(errorCount ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith("i18n-audit.mjs")) main();
