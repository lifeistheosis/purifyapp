// A fill grown by a scale from one side (a reading progress bar, the mark
// that fills as a reader pulls on to the next chapter or work) grows from
// the start of the line, and so from the right where a page reads right to
// left. Found by Fable voices' checkMock on the three "names in Scripture"
// books (2026-11-11, the arbiter's word to mend it): their keep-reading mark
// filled from the left in Arabic. The Bible's keep-scrolling mark and the
// reading progress bar of every chapter and work had the same fault.
//
// So every `origin-left` in the app's class strings carries its right-to-left
// counterpart on the same line. Keyed on the page's direction,
// `[[dir=rtl]_&]:origin-right`, as the house's own tour strip is in
// globals.css; Tailwind's `rtl:` also matches by language, which checkMock's
// turn of a page already in Arabic does not follow, but it is right for a
// reader and is accepted. The admin panel is his own tool, in English on the
// website, and is not read.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SKIP = ["components/admin", "app/admin"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    const rel = path.relative(ROOT, file);
    if (SKIP.some((s) => rel === s || rel.startsWith(`${s}/`))) continue;
    if (statSync(file).isDirectory()) walk(file, out);
    else if (/\.tsx?$/.test(name)) out.push(file);
  }
  return out;
}

const COMMENT = /^\s*(\/\/|\/?\*|\{\/\*)/;
const FROM_LEFT = /(^|[\s"'`])origin-left(?=[\s"'`]|$)/;
const TURNED = /(\[\[dir=rtl\]_&\]|rtl):origin-right\b/;

describe("a fill grows from the start of its line", () => {
  const files = ["app", "components", "lib"].flatMap((r) => walk(path.join(ROOT, r)));
  const fromLeft = files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ file: path.relative(ROOT, file), line, at: i + 1 }))
      .filter(({ line }) => !COMMENT.test(line) && FROM_LEFT.test(line)),
  );

  it("reads the app's fills", () => {
    expect(files.length).toBeGreaterThan(500);
    // The three mended, and the four that were right already.
    expect(fromLeft.length).toBeGreaterThanOrEqual(7);
  });

  it("turns every fill grown from the left round where the page reads right to left", () => {
    const unturned = fromLeft.filter(({ line }) => !TURNED.test(line)).map(({ file, at, line }) => `${file}:${at} ${line.trim().slice(0, 120)}`);
    expect(unturned).toEqual([]);
  });

  it("keys the three mended on the page's direction, as the tour strip is", () => {
    for (const file of ["components/saints/KeepReading.tsx", "components/bible/KeepScrolling.tsx", "components/ui/ProgressBar.tsx"]) {
      expect(readFileSync(path.join(ROOT, file), "utf8"), file).toContain("origin-left [[dir=rtl]_&]:origin-right");
    }
    const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/\[dir="rtl"\] \.tour-strip > i::after \{\s*transform-origin: 100% 50%;/);
  });
});
