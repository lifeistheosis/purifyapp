// Every pill of the practise sheet is 44 px each way, whatever word it holds.
// In Arabic "Change" is "غيّر", and the button that says it was 41.9 px wide
// (Updates 98v): its height was fixed at 44 and its width was only its word.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sheet = fs.readFileSync(path.join(__dirname, "..", "..", "..", "components/you/PractiseSheet.tsx"), "utf8");

describe("the practise sheet's pills", () => {
  it("are never narrower than they are tall", () => {
    const pills = [...sheet.matchAll(/(?:className="|const PILL = ")((?:[^"]*\s)?h-11(?:\s[^"]*)?)"/g)].map((m) => m[1]);
    expect(pills.length).toBeGreaterThanOrEqual(2);
    for (const cls of pills) expect(cls, cls).toMatch(/\bmin-w-11\b/);
  });
});
