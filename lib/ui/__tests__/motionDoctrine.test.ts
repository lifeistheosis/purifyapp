// A guard on the one motion rule in this codebase that has already cost a
// shipped bug twice.
//
// `transform: translateY(0)` is not `transform: none`. Any transform value
// other than `none` makes an element a containing block for `position: fixed`
// descendants AND a stacking context. So a route-level entrance that ends
// holding a transform displaces every fixed thing inside it, forever; and an
// opacity animation with `animation-fill-mode: both` leaves a permanent
// stacking context even with no transform at all, which is what put the z-50
// tab bar over the z-[60] commentary sheet (commit 5ee95ed3, reported twice
// from the Android beta before it was understood).
//
// The rules this enforces:
//   1. `.route-fade` never carries a transform, and never fills forwards.
//   2. Anything that DOES translate on entry fills `backwards`, so the
//      element is handed back to `transform: none` when it finishes.
//   3. Every animation class added for the route transition has a
//      prefers-reduced-motion escape.
//   4. `cascade-rise` never reaches a reader route, whose pills, toolbars,
//      progress bars and sheets are `fixed` and not portaled.
//
// This reads source, because there is no DOM to assert against: vitest runs
// in a node environment on purpose (see vitest.config.ts) and
// docs/audit/AUDIT-2026-07-27.md is explicit that component testing is not to
// be opened yet.
//
// If one of these fails, do not delete the assertion. Read the doctrine block
// in app/globals.css above `.cascade-rise` first; there is a `.rise-none`
// escape hatch for the one-child case.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

/** Strip comments so the prose explaining a rule cannot satisfy the rule. */
function rules(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The body of the first rule whose selector matches. `selector` is a regex
 * fragment, already escaped by the caller, so that `.route-fade` matches the
 * standalone rule and not `.route-fade .cascade > *`.
 */
function block(selector: string): string {
  const re = new RegExp(`(^|\\})\\s*${selector}\\s*\\{([^}]*)\\}`, "m");
  const m = re.exec(rules(CSS));
  const body = m ? m[2] : "";
  if (!body) throw new Error(`No CSS rule found for selector /${selector}/`);
  return body;
}

/** Every `@media (prefers-reduced-motion: reduce) { ... }` body, concatenated. */
function reducedMotionBodies(): string {
  const out: string[] = [];
  const src = rules(CSS);
  const needle = "@media (prefers-reduced-motion: reduce)";
  let i = src.indexOf(needle);
  while (i !== -1) {
    // Walk braces from the opening one so nested rules are included.
    const start = src.indexOf("{", i);
    let depth = 0;
    let j = start;
    for (; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(src.slice(start, j));
    i = src.indexOf(needle, j);
  }
  return out.join("\n");
}

const REDUCED = reducedMotionBodies();

describe("motion doctrine", () => {
  it("the route entrance carries no transform", () => {
    expect(block("\\.route-fade")).not.toMatch(/transform/);
    const keyframes = /@keyframes\s+route-fade\s*\{([\s\S]*?)\r?\n\}/.exec(
      rules(CSS),
    );
    expect(keyframes, "@keyframes route-fade not found").not.toBeNull();
    expect(keyframes![1]).not.toMatch(/transform/);
  });

  it("the route entrance does not fill forwards", () => {
    // `both` or `forwards` here means the wrapper is a stacking context for
    // the life of the page, which traps every z-index inside it.
    const decl = block("\\.route-fade");
    expect(decl).toMatch(/backwards/);
    expect(decl).not.toMatch(/\b(both|forwards)\b/);
  });

  it("the route exit fades opacity only", () => {
    const decl = block("body\\[data-route-exit\\] \\[data-route-content\\]");
    expect(decl).toMatch(/opacity/);
    expect(decl).not.toMatch(/transform/);
  });

  it("everything that translates on entry fills backwards", () => {
    for (const selector of ["\\.title-in", "\\.cascade\\.cascade-rise > \\*"]) {
      expect(block(selector), `${selector} must fill backwards`).toMatch(
        /backwards/,
      );
      expect(block(selector), `${selector} must not fill forwards`).not.toMatch(
        /\b(both|forwards)\b/,
      );
    }
  });

  it("every new motion class has a reduced-motion escape", () => {
    for (const cls of [
      "route-fade",
      "data-route-exit",
      "title-in",
      "cascade-rise",
      "check-draw",
    ]) {
      expect(REDUCED, `${cls} needs a prefers-reduced-motion block`).toContain(
        cls,
      );
    }
  });

  it("cascade-rise never reaches a reader route", () => {
    // These trees render `fixed` chrome inline and do not portal it: the
    // chapter pill, the next-chapter FAB, the verse toolbar, the commentary
    // sheet, both progress bars and the work pill. A translating ancestor
    // would become their containing block and drag them out of position.
    const FORBIDDEN = ["components/reader", "components/bible", "components/saints"];
    const offenders: string[] = [];
    for (const dir of FORBIDDEN) {
      const abs = path.join(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      const stack = [dir];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const entry of fs.readdirSync(path.join(ROOT, cur), {
          withFileTypes: true,
        })) {
          const rel = path.join(cur, entry.name);
          if (entry.isDirectory()) stack.push(rel);
          else if (/\.tsx?$/.test(entry.name)) {
            const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
            if (/cascade-rise/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")))
              offenders.push(rel.split(path.sep).join("/"));
          }
        }
      }
    }
    expect(
      offenders,
      `cascade-rise translates its children, and these trees render fixed ` +
        `chrome inline (chapter pill, next-chapter FAB, verse toolbar, ` +
        `commentary sheet, progress bars, work pill). A transform on an ` +
        `ancestor becomes their containing block and moves them off the ` +
        `viewport. Use .rise-none on the offending child, or leave the ` +
        `screen opacity-only. Offenders:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the tight stagger is scoped, not a retune of the shared token", () => {
    // Ten-plus existing .cascade call sites depend on --stagger-step: 70ms.
    expect(rules(CSS)).toMatch(/--stagger-step:\s*70ms/);
    expect(block("\\.cascade-tight")).toMatch(
      /--stagger-step:\s*var\(--stagger-step-tight\)/,
    );
  });
});
