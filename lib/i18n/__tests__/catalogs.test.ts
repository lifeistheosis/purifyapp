import { describe, expect, it } from "vitest";

// @ts-expect-error plain ESM script, no types, deliberately shared with the CLI
import { audit } from "../../../scripts/i18n-audit.mjs";

/**
 * The catalogs are filled in by translation passes, and a translation pass is
 * the exact edit that looks right and is not.
 *
 * Nothing else in this repo catches it. A dropped `{count}` is a valid string,
 * a stale key is a valid key, an empty value is valid JSON, and none of the
 * three is a type error. They surface as a reader in Belgrade seeing the word
 * "undefined", or a blank tab label, which is how `nav.you` sat empty in
 * Spanish while every other locale had it.
 *
 * So the same audit the CLI runs is a test. scripts/i18n-audit.mjs holds the
 * rules and the reasoning, including why CLDR plural variants are NOT stale
 * keys even though en.json will never contain them.
 */

type Finding = { kind: string; key?: string; detail?: unknown };
type Result = {
  code: string;
  errors: Finding[];
  warnings: Finding[];
  missingKeys: string[];
  translated: number;
  total: number;
};

const { results, fatal } = audit() as { results: Result[]; fatal: string | null };

describe("message catalogs", () => {
  it("all parse", () => {
    // Reported first and on its own: a catalog that will not parse takes the
    // app down at import, and every other assertion below is noise until it does.
    expect(fatal).toBeNull();
    const unparsed = results.filter((r) => r.errors.some((e) => e.kind === "parse"));
    expect(unparsed.map((r) => r.code)).toEqual([]);
  });

  it("carry no structural errors", () => {
    const broken = results
      .filter((r) => r.errors.length)
      .map((r) => `${r.code}: ${r.errors.map((e) => `${e.kind} ${e.key ?? ""}`).join(", ")}`);
    expect(broken).toEqual([]);
  });

  it("never lose a placeholder", () => {
    // Called out separately from the blanket check above because this is the
    // one that reaches a reader as literal braces or a missing number.
    const bad = results.flatMap((r) =>
      r.errors.filter((e) => e.kind === "placeholder").map((e) => `${r.code} ${e.key}`),
    );
    expect(bad).toEqual([]);
  });

  it("hold no empty values", () => {
    const empty = results.flatMap((r) =>
      r.errors.filter((e) => e.kind === "empty").map((e) => `${r.code} ${e.key}`),
    );
    expect(empty).toEqual([]);
  });

  it("hold no em dashes, in any language", () => {
    // Standing rule, and a translation pass is where they arrive: most engines
    // emit them freely and no reviewer reading Georgian will notice.
    const dashes = results.flatMap((r) =>
      r.errors.filter((e) => e.kind === "em-dash").map((e) => `${r.code} ${e.key}`),
    );
    expect(dashes).toEqual([]);
  });

  it("keeps English complete, since every other catalog is measured against it", () => {
    const en = results.find((r) => r.code === "en");
    expect(en).toBeDefined();
    expect(en!.errors).toEqual([]);
  });
});
