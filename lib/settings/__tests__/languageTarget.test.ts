import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The language picker's button is 44px to the touch, as every control is
 * (CLAUDE.md's guardrails; checkMock's target check). It was 36px tall, found
 * by checkMock on Settings while walking the Themes chat's contrast sweep
 * (2026-11-10). The picker is Settings' Language row and the profile's.
 */
describe("the language picker", () => {
  it("is 44px tall to the touch", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/i18n/LanguagePicker.tsx"), "utf8");
    const button = /<button[\s\S]*?aria-haspopup=\{asSheet \? "dialog" : "listbox"\}[\s\S]*?className="([^"]*)"/.exec(source)?.[1] ?? "";
    expect(button, "the picker's button").not.toBe("");
    expect(button.split(/\s+/)).toContain("h-11");
    expect(button).not.toMatch(/\bh-\[(?:[0-3]\d|4[0-3])px\]|\bh-(?:[1-9]|10)\b/);
  });
});
