import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No box around a tapped field (the owner's word of 2026-11-10, build 89
 * note 11): "A lot of times when you click something and you have to search,
 * it appears a white box or a red box. like outline. I don't like that."
 *
 * A field a finger has reached shows it is active the house's quiet way: its
 * own fill and a fine edge in the palette's ink, with the caret. Never a
 * thick ring, never red. The keyboard's ring stays for keyboard users.
 *
 * What would go wrong if this broke: the thick white ring back round every
 * field after a tap (it came from the keyboard's ring, kept on text fields,
 * and from rings each field drew of its own), or brought back mid-word by a
 * typed space, which used to count as reaching for the page by keyboard.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const css = read("app/globals.css");

/** Every .tsx under a folder, but the admin's (a tool of its own, with its own theme). */
function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === "admin" || d.name === "__tests__" ? [] : sources(rel);
    return d.name.endsWith(".tsx") ? [rel] : [];
  });
}

/** Each text field's own attributes: from its tag to the first unbraced ">". */
function fields(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/<(input|textarea|select)\b/g)) {
    let depth = 0;
    let j = m.index! + m[0].length;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const attrs = src.slice(m.index!, j);
    if (/type=["'](checkbox|radio|range|button|submit|reset|file|hidden|color)["']/.test(attrs)) continue;
    out.push(attrs);
  }
  return out;
}

describe("a tapped field", () => {
  it("shows a fine edge in the palette's ink, not the keyboard's ring", () => {
    const rule = css.slice(css.indexOf(':where(html[data-input="pointer"]) :where(input:not('));
    expect(rule.length).toBeGreaterThan(0);
    const body = rule.slice(rule.indexOf("{"), rule.indexOf("}"));
    expect(body).toContain("outline: 1px solid color-mix(in srgb, var(--color-paper) 32%, transparent);");
    expect(body).toContain("outline-offset: -1px;");
    // At the weight of :focus-visible alone, so a field's own way wins.
    expect(rule.slice(0, rule.indexOf("{"))).not.toMatch(/(^|[^(])\b(html|input|textarea)\[/);
    // A field inside a box that lights as a whole draws nothing of its own.
    expect(css).toMatch(/:where\(\[class\*="focus-within:"\]\) :where\(input, textarea, select\):focus-visible \{\s*outline: none;/);
  });

  it("fades its edge in from clear, never flashing the text's colour first", () => {
    // transition-colors moves outline-color too: at rest a field's edge is clear.
    expect(css).toMatch(/@layer base \{\s*:where\(input, textarea, select, \[contenteditable="true"\]\) \{\s*outline-color: transparent;/);
  });

  it("keeps the keyboard's ring for keyboard users", () => {
    expect(css).toMatch(/\*:focus-visible \{[^}]*outline: 2px solid color-mix\(in srgb, var\(--color-paper\) 70%, transparent\);/);
    expect(css).toContain('html[data-input="pointer"] *:focus-visible:not(input, textarea, select, [contenteditable="true"])');
  });

  it("is not counted as keyboard use when a space or Enter is typed into it", () => {
    const modality = read("components/ui/InputModality.tsx");
    expect(modality).toContain('if (e.key !== "Tab" && e.key !== "Escape" && isEditable(e.target)) return;');
    expect(modality.indexOf("isEditable(e.target)")).toBeLessThan(modality.indexOf('if (NAV_KEYS.has(e.key)) set("keyboard");'));
  });

  it("draws no ring of its own, and nothing gold or red, anywhere a reader types", () => {
    const files = [...sources("app"), ...sources("components")];
    const found = files.flatMap((f) => fields(read(f)).map((attrs) => ({ f, attrs })));
    // The sweep found 136 fields in 2026-11; far fewer means the scan broke.
    expect(found.length).toBeGreaterThan(100);
    const bad = found
      .filter(({ attrs }) => /\b(?:focus|focus-visible|focus-within):(?:ring\b|ring-|outline-(?!none)|border-(?:gold|crimson|red)|ring-(?:gold|crimson|red))/.test(attrs))
      .map(({ f, attrs }) => `${f}: ${attrs.slice(0, 80).replace(/\s+/g, " ")}`);
    expect(bad).toEqual([]);
  });
});
