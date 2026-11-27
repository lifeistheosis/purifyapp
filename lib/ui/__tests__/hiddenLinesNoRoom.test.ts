// A line hidden with `sr-only` takes no room anywhere in the app: no padding or
// margin of its own while it is hidden. On You, KeptVerse's hidden status line
// kept its pb-3, stood 12 px out of a card that clips, and Share fell 12 px
// under the finger when it appeared (Updates 98v; lib/you/__tests__/youBack.test.ts
// holds the You tab). ChooseSheet's note kept its mt-2 the same way (named by 98v).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..", "..");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []));

describe("A hidden line takes no room", () => {
  it("toggles `sr-only` only on a line with no padding or margin of its own while hidden, in every component", () => {
    const found: string[] = [];
    for (const file of walk(path.join(ROOT, "components"))) {
      for (const call of fs.readFileSync(file, "utf8").match(/cn\((?:[^()]|\([^()]*\))*\)/g) ?? []) {
        if (!/["']sr-only["']/.test(call)) continue;
        const always = call
          .replace(/[\w.!?]+\s*&&\s*["'][^"']*["']/g, "")
          .replace(/\?\s*["'][^"']*["']\s*:\s*["'][^"']*["']/g, "")
          .match(/["'][^"']*["']/g);
        const room = (always ?? []).join(" ").match(/(?:^|[\s"'])-?(?:p|m)[xytblrse]?-[\w.[\]/-]+/g);
        if (room) found.push(`${path.relative(ROOT, file)}: ${call.replace(/\s+/g, " ")}`);
      }
    }
    expect(found).toEqual([]);
  });
});
