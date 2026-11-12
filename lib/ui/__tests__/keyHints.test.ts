// A key to press is said only where there is a keyboard to press it on (the pre-build gate's second rule: no keyboard
// hint on a phone). The Search sheet's head drew "esc" in a <kbd> on every screen 768 wide or more, so a tablet in a
// reader's hands showed a key it does not have (the gate's tap walk at 800 and 1032, 2026-11-12: its only fail at
// both). Every key the app draws as <kbd> is now hidden unless the pointer is a fine one, a desktop's mouse with its
// keyboard: `hidden ... pointer-fine:block` (or inline, or flex). On a touch screen the browser reports a coarse
// pointer, and the key is not there. checkMock's own rule ("keys") finds one that shows on the export's screens;
// this holds the code, every file at once.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...sources(rel));
    } else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Every <kbd ...> opening tag in the app's screens, with its file. */
function keyTags(): { file: string; tag: string }[] {
  const tags: { file: string; tag: string }[] = [];
  for (const file of [...sources("app"), ...sources("components")]) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const m of src.matchAll(/<kbd\b[^>]*>/g)) tags.push({ file, tag: m[0] });
  }
  return tags;
}

describe("a key drawn as <kbd>", () => {
  it("is hidden on a touch screen, and shown only to a fine pointer", () => {
    const tags = keyTags();
    // The Search sheet's "esc" is one of them: the test reads what the app draws.
    expect(tags.some((k) => k.file === path.join("components", "search", "CommandPalette.tsx"))).toBe(true);
    for (const { file, tag } of tags) {
      const cls = /className="([^"]*)"/.exec(tag)?.[1] ?? "";
      const words = cls.split(/\s+/);
      expect(words, `${file}: ${tag}`).toContain("hidden");
      expect(words.some((w) => /^pointer-fine:(block|inline|inline-block|flex|inline-flex)$/.test(w)), `${file}: ${tag}`).toBe(true);
      // Nothing else on it shows it again on a coarse pointer.
      expect(words.filter((w) => /^(block|inline|inline-block|flex|inline-flex)$/.test(w)), `${file}: ${tag}`).toEqual([]);
    }
  });
});
