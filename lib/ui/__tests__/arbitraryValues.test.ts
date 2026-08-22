import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Tailwind arbitrary values must have balanced brackets.
 *
 * WHY THIS EXISTS. A v4 sweep rewrote 83 hardcoded colour classes onto the
 * theme tokens with a regex whose trailing \b backtracked past the closing
 * bracket of a `/[0.06]` opacity and left it behind, producing
 *
 *   bg-[color-mix(in_oklab,var(--adm-warn),transparent_94%)]]
 *
 * in 11 places. Tailwind does not emit a rule for a malformed arbitrary
 * value, so those elements silently rendered with no background: warning and
 * error banners across six admin files lost their tinted ground.
 *
 * Nothing caught it. TypeScript does not parse class strings, ESLint has no
 * opinion on them, and every unit test passed. The verification grep used to
 * check the sweep was `bg-\[[^]]*\]`, which stops at the FIRST bracket and was
 * therefore structurally incapable of seeing a doubled one.
 *
 * So the check counts brackets rather than matching the one shape that went
 * wrong. A pattern for `%)]]` would have the same blind spot the grep had:
 * it would catch the bug already found and miss the next variation of it.
 */

const ROOTS = ["app", "components", "lib"];
const SKIP = new Set(["node_modules", ".next", "out", "__tests__", ".native-export-stash"]);

function files(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) files(p, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(p);
  }
  return acc;
}

/**
 * Every token in a quoted string that is unmistakably a Tailwind utility
 * carrying an arbitrary value.
 *
 * The shape required is a utility prefix, optional variants, then `-[`:
 * `bg-[…]`, `hover:bg-[…]`, `lg:rounded-[…]`. That deliberately excludes the
 * things a naive "contains a bracket" scan trips over, all of which are real
 * and none of which are classes: CSS attribute selectors (`[data-idx=`),
 * character classes inside regex literals (`,\n\r]/`), array indexing that
 * happens to sit in a template string, and bare `]` fragments left by
 * splitting a line on quotes.
 */
const UTILITY_WITH_ARBITRARY = /^-?[a-z][a-z0-9]*(?:[-:][a-z0-9]+)*-\[/;

function bracketTokens(source: string): { token: string; line: number }[] {
  const out: { token: string; line: number }[] = [];
  source.split(/\r?\n/).forEach((line, i) => {
    // Class tokens live in className="…", className={"…"}, and in the string
    // halves of a ternary. Scanning every quoted run on a line catches all
    // three without parsing JSX.
    for (const m of line.matchAll(/["'`]([^"'`]*)["'`]/g)) {
      for (const token of m[1].split(/\s+/)) {
        if (UTILITY_WITH_ARBITRARY.test(token)) out.push({ token, line: i + 1 });
      }
    }
  });
  return out;
}

/**
 * True when the token closes a bracket it never opened.
 *
 * ONLY the extra-closing case is checked, and the reason is a real limitation
 * rather than laziness. This scanner finds class tokens by splitting a line on
 * quote characters, and `after:content-['']` legitimately contains quotes
 * inside its arbitrary value, so that token arrives here truncated to
 * `after:content-[`. An unclosed bracket and a truncated one are
 * indistinguishable at this point, so flagging depth > 0 would report a
 * permanent false positive on valid code.
 *
 * Extra-closing has no such ambiguity, and it is exactly the shape the sweep
 * produced. Catching a bug class precisely beats catching two vaguely.
 */
function hasStrayCloser(token: string): boolean {
  let depth = 0;
  for (const ch of token) {
    if (ch === "[") depth++;
    else if (ch === "]" && --depth < 0) return true;
  }
  return false;
}

describe("Tailwind arbitrary values", () => {
  const all = ROOTS.flatMap((r) => files(r));

  it("scans a plausible number of files", () => {
    // Guards against a moved directory silently making this test vacuous,
    // the same way fetchGuards pins its own file count.
    expect(all.length).toBeGreaterThan(200);
  });

  it("never closes an arbitrary value it did not open", () => {
    const bad: string[] = [];
    for (const file of all) {
      const src = readFileSync(file, "utf8");
      for (const { token, line } of bracketTokens(src)) {
        if (hasStrayCloser(token)) {
          bad.push(`${file.replace(/\\/g, "/")}:${line}  ${token}`);
        }
      }
    }
    expect(bad, `Malformed Tailwind arbitrary values:\n${bad.join("\n")}`).toEqual([]);
  });
});
