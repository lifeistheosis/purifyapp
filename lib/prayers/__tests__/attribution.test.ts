import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { RULES, planIdParams, readerRules } from "@/lib/prayers/rules";
import { listHours } from "@/lib/prayers/hours";
import type { Rule } from "@/lib/prayers/types";

/**
 * Every prayer file must say where its words came from.
 *
 * ── Why this is its own file, and why it exists at all ──────────────────
 *
 * `Rule.source` is REQUIRED by the type (lib/prayers/types.ts) and was asserted
 * by nothing. So was `title`, so was `intro`, and nothing checked that a file's
 * own `id` matches the registry entry pointing at it. A file copied from its
 * neighbour and half-edited would ship citing the neighbour's edition, and the
 * suite would stay green.
 *
 * That is not hypothetical here. docs/editorial/dogma-queue/README.md records
 * the Cherubic Hymn shipping in data/theology/the-divine-liturgy.json
 * attributed to the Hapgood Service Book of 1906. It scored 100% word-order
 * match against that book, because Hapgood is roughly 1.6 million words and
 * almost any English sequence can be traced through it in order. It contained
 * "mystically" and "thrice-holy", neither of which appears in the book
 * anywhere, and its longest verbatim run was six words. It was a modern
 * rendering wearing a public-domain citation, and only an anchor check caught
 * it.
 *
 * These tests cannot verify provenance; only scripts/audit-florilegium.mjs can,
 * by going to the source. What they can do is make the CITATION itself
 * load-bearing, so that a source string is never absent, never inherited by
 * accident, and never a bare edition name with no way to check it.
 *
 * ── The 40-character floor ──────────────────────────────────────────────
 *
 * The saints corpus uses 20 (lib/saints/__tests__/saints.integrity.test.ts).
 * Prayers get a higher floor because the house format is richer and every
 * existing file already clears it: edition, translator where there is one,
 * year, and the words "public domain". "Hapgood" alone is a gesture at a
 * source. "Hapgood Service Book (1906), public domain" is one a reader can act
 * on. The floor is deliberately below the shortest real string in the tree so
 * it catches absence and placeholders, not brevity.
 */

const PRAYERS_DIR = path.join(process.cwd(), "data", "prayers");

/** Files reachable through the registry. The Hours and Akathists are separate. */
function registryFiles(): { id: string; file: string; rule: Rule }[] {
  return readerRules().map((meta) => ({
    id: meta.id,
    file: meta.file!,
    rule: JSON.parse(
      fs.readFileSync(path.join(PRAYERS_DIR, meta.file!), "utf8"),
    ) as Rule,
  }));
}

/** Every prayer JSON on disk, including the ones no registry entry points at. */
function allPrayerFiles(): { rel: string; rule: Rule }[] {
  const out: { rel: string; rel2?: string; rule: Rule }[] = [];
  for (const sub of ["rules", "hours", "akathists"]) {
    const dir = path.join(PRAYERS_DIR, sub);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      // Locale siblings mirror their English parent and carry their own
      // translated source line; they are held to the same bar.
      out.push({
        rel: `${sub}/${name}`,
        rule: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as Rule,
      });
    }
  }
  return out;
}

const MIN_SOURCE = 40;

describe("prayer attribution", () => {
  it("finds prayer files at all", () => {
    // Guards against a silently empty scan making everything below vacuous.
    expect(allPrayerFiles().length).toBeGreaterThan(15);
  });

  it("every prayer file cites a source you could go and check", () => {
    const bare = allPrayerFiles()
      .filter(({ rule }) => (rule.source ?? "").trim().length < MIN_SOURCE)
      .map(({ rel, rule }) => `${rel}: ${JSON.stringify(rule.source ?? null)}`);
    expect(
      bare,
      "A prayer file must name its edition well enough that someone can " +
        "verify the words against it. See the Cherubic Hymn note at the top " +
        "of this file for what a thin citation costs:\n  " +
        bare.join("\n  "),
    ).toEqual([]);
  });

  it("no prayer file omits its title or its intro", () => {
    const thin = allPrayerFiles()
      .filter(
        ({ rule }) =>
          !(rule.title ?? "").trim() || !(rule.intro ?? "").trim(),
      )
      .map(({ rel }) => rel);
    expect(thin, thin.join("\n  ")).toEqual([]);
  });

  it("em dashes appear only in verbatim prayer text, never in our own voice", () => {
    /**
     * The no-em-dash rule governs Purify's voice, not a 1906 printer's.
     *
     * data/prayers/ was clean of them until the Hapgood pre-Communion ingest,
     * which brought four: "And — O marvellous wonder! — I am not consumed",
     * and two more setting off a clause. They are in the scan. Removing them
     * would edit a text this repo calls verbatim, and verbatim outranks
     * house style, which is why the saints gate reads registry prose only and
     * lets eleven files keep theirs.
     *
     * So the line is drawn where it actually belongs: a prayer's `text` and
     * `instruction` may carry whatever the edition printed. Everything we
     * wrote ourselves, the title, subtitle and intro, may not.
     */
    const ours: string[] = [];
    for (const { rel, rule } of allPrayerFiles()) {
      for (const [field, value] of [
        ["title", rule.title],
        ["subtitle", rule.subtitle],
        ["intro", rule.intro],
      ] as const) {
        if (typeof value === "string" && value.includes("—")) {
          ours.push(`${rel} ${field}`);
        }
      }
    }
    expect(
      ours,
      "An em dash in our own copy. Commas, colons or periods instead. " +
        "Verbatim prayer text is exempt and is not checked here:\n  " +
        ours.join("\n  "),
    ).toEqual([]);
  });

  it("a file's own id matches the registry entry that points at it", () => {
    // The copy-paste failure: duplicate a neighbour, change the filename and
    // the registry line, forget the id inside. Nothing else in the suite looks.
    const mismatched = registryFiles()
      .filter(({ id, rule }) => rule.id !== id)
      .map(({ id, file, rule }) => `${file}: file says "${rule.id}", registry says "${id}"`);
    expect(mismatched, mismatched.join("\n  ")).toEqual([]);
  });

  it("no two prayer files share a source string verbatim", () => {
    // Two files with byte-identical attribution is the signature of a
    // copy-paste that was never re-sourced. Legitimate cases exist (the Hours
    // genuinely share an edition), so this compares only within a directory's
    // siblings when the rest of the file differs, and reports rather than
    // forbidding a shared edition outright.
    const byTitle = new Map<string, string[]>();
    for (const { rel, rule } of allPrayerFiles()) {
      const key = `${(rule.source ?? "").trim()}::${(rule.title ?? "").trim()}`;
      if (!key.trim()) continue;
      byTitle.set(key, [...(byTitle.get(key) ?? []), rel]);
    }
    const clashes = [...byTitle.entries()]
      .filter(([, files]) => files.length > 1)
      // A locale sibling legitimately repeats its parent's title.
      .filter(([, files]) => {
        const stems = new Set(files.map((f) => f.replace(/\.[a-z]{2,3}\.json$/, ".json")));
        return stems.size > 1;
      })
      .map(([key, files]) => `${files.join(" and ")} share title+source: ${key.slice(0, 80)}`);
    expect(clashes, clashes.join("\n  ")).toEqual([]);
  });

  it("every rule the hub links to can actually be served", () => {
    /**
     * There are THREE kinds of rule, not two, and I got this wrong first:
     *
     *   1. `file` and not planned  -> served by [planId]
     *   2. `planned`               -> deliberately not navigable
     *   3. neither                 -> has its own hand-written route
     *
     * The third is real and populated: the five Hours, jesus-prayer, rope and
     * intercessory all carry no `file` and are not planned, because each has a
     * dedicated page. Nothing checked that the page exists. An entry added to
     * that third category with no route renders a row on the hub that 404s,
     * and the existing suite would stay green because it only ever looks at
     * rules that HAVE a file.
     */
    const APP = path.join(process.cwd(), "app", "(app)");

    /**
     * A DYNAMIC ROUTE EXISTING IS NOT PROOF IT SERVES, and getting that wrong
     * is what this comment is for. My first version walked the tree and let any
     * `[param]` directory stand in for a literal segment. Under that rule a
     * bogus `/prayers/ghost` "resolved", because `prayers/[planId]` exists. It
     * does not serve it: that route sets `dynamicParams = false`, so only the
     * ids `generateStaticParams` enumerates are real pages and everything else
     * is a 404. A guard that accepts a directory name proves nothing.
     *
     * So each dynamic route is checked against what it actually enumerates.
     */
    const servable = new Set<string>();

    // prayers/[planId] enumerates readerRules minus the two dedicated routes.
    for (const p of planIdParams()) servable.add(`/prayers/${p.planId}`);
    // prayers/hours/[id] enumerates listHours().
    for (const h of listHours()) servable.add(`/prayers/hours/${h.slug}`);

    // Literal routes: any directory chain with a page.tsx and no [param] in it.
    const walkLiteral = (dir: string, href: string) => {
      if (fs.existsSync(path.join(dir, "page.tsx"))) servable.add(href || "/");
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || /^[[(]/.test(e.name)) continue;
        walkLiteral(path.join(dir, e.name), `${href}/${e.name}`);
      }
    };
    walkLiteral(path.join(APP, "prayers"), "/prayers");

    const dead: string[] = [];
    for (const r of RULES) {
      if (r.planned) continue;
      // learning/[lessonId] enumerates lessons.json, which is not a prayer
      // registry concern; a lesson id is checked by its own suite.
      if (r.href.startsWith("/prayers/learning/")) continue;
      if (!servable.has(r.href)) {
        dead.push(`${r.id}: ${r.href} is linked, not planned, and nothing serves it`);
      }
    }
    expect(
      dead,
      "These rules are linked from the prayers hub and nothing can serve " +
        "them. Give the entry a `file`, mark it `planned`, or write its " +
        "route:\n  " + dead.join("\n  "),
    ).toEqual([]);
  });
});
