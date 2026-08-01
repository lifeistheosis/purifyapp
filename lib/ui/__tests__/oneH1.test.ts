// A guard against the mobile surfaces announcing themselves twice.
//
// Every mobile shell passes a MobileHeader into MobileShell, and that
// header renders the surface's only <h1>. Discover and Reading also passed
// a `title` to SectionMasthead, which renders a second one directly below,
// so those screens said their own name twice before the reader had read
// anything, with the tab bar saying it a third time. /prayers had the same
// fault from a different element.
//
// The rule: inside components/mobile, MobileHeader owns the <h1> and
// nothing else emits one. This test reads the source, because there is no
// DOM to assert against here: vitest runs in a node environment on purpose
// (see vitest.config.ts) and docs/audit/AUDIT-2026-07-27.md is explicit
// that component testing is not to be opened yet.
//
// If this fails, do not delete the assertion. Use an <h2>: the heading's
// size comes from its classes, not its tag, so nothing moves on screen.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** The mobile shell tree. Every file here renders inside MobileShell. */
const MOBILE_DIR = "components/mobile";

/** The one component allowed to emit an h1 on a mobile surface. */
const H1_OWNER = "components/mobile/MobileHeader.tsx";

const OPENS_H1 = /<h1[\s>]/;

function walk(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.tsx$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Strip comments so a note about the old bug does not read as the bug. */
function codeOf(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const posix = (rel: string) => rel.split(path.sep).join("/");

describe("one h1 per mobile surface", () => {
  it("MobileHeader is the only component in the mobile shell that emits an h1", () => {
    const offenders = walk(MOBILE_DIR)
      .filter((rel) => posix(rel) !== H1_OWNER)
      .filter((rel) =>
        OPENS_H1.test(codeOf(fs.readFileSync(path.join(ROOT, rel), "utf8"))),
      )
      .map(posix);

    expect(
      offenders,
      `These render an <h1> inside the mobile shell, which already gets one ` +
        `from MobileHeader, so the surface says its own name twice. Use an ` +
        `<h2>; the size comes from the classes, not the tag. Offenders:\n  ` +
        `${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("MobileHeader still emits the h1 it is supposed to own", () => {
    // Otherwise the rule above could be satisfied by every surface having
    // no h1 at all, which fails page-has-heading-one instead.
    const src = fs.readFileSync(path.join(ROOT, H1_OWNER), "utf8");
    expect(OPENS_H1.test(codeOf(src))).toBe(true);
  });

  it("SectionMasthead does not reintroduce one through its title prop", () => {
    // The second h1 on Discover and Reading came from here. The plate keeps
    // its eyebrow and its credit; the heading belongs to the header bar.
    const src = fs.readFileSync(
      path.join(ROOT, "components/mobile/SectionMasthead.tsx"),
      "utf8",
    );
    expect(OPENS_H1.test(codeOf(src))).toBe(false);
  });
});
