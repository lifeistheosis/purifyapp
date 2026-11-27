// A row's title on the theology shelves is read whole: it wraps, never ends in
// an ellipsis. In German the Creed's row, which council pages show too, read
// "Das Glaubensbekenntnis, Zeile fü…" at 390 px (the guardrail walk, 2026-11-23).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const file = fs.readFileSync(path.join(__dirname, "..", "..", "..", "components/theology/TheologyLibrary.tsx"), "utf8");

describe("the theology rows' titles", () => {
  it("wrap rather than cut", () => {
    const titles = [...file.matchAll(/className="([^"]*font-serif text-\[17px\][^"]*)"/g)].map((m) => m[1]);
    expect(titles.length).toBeGreaterThanOrEqual(2);
    for (const cls of titles) expect(cls, cls).not.toMatch(/\btruncate\b|line-clamp/);
  });
});
