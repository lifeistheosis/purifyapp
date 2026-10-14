import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  backRefusal,
  readWayBack,
  SECTION_HEADING,
  wayBackVerdict,
  writeWayBack,
} from "@/scripts/lib/release-back.mjs";

/**
 * `node scripts/release.mjs back`, which writes down the commit on
 * origin/main that a release's push replaces, and the line `check` reads.
 * The git half is in release.mjs; everything it decides is here.
 */

const ROOT = path.resolve(__dirname, "../../..");
const TEMPLATE = fs.readFileSync(path.join(ROOT, "docs/release/TEMPLATE.md"), "utf8");
const SECTION = TEMPLATE.slice(TEMPLATE.indexOf(SECTION_HEADING));

const MAIN = "ac35f621e3c3a98bc27c5838a50f092d93b0247b";
const LATER = "1324ac3d0000000000000000000000000000beef";
const RECORD = { sha: MAIN, subject: "Admin panel: the SSM board's look, black and white" };
const LINE = `Way back: ${MAIN} Admin panel: the SSM board's look, black and white`;

describe("the Way back line", () => {
  it("is read from a checklist, whatever its line endings", () => {
    expect(readWayBack(`# 9.1\r\n\r\n${LINE}\r\n\r\nMore.\r\n`)).toEqual(RECORD);
    expect(readWayBack("# 9.1\n\nNothing recorded.\n")).toBeNull();
    expect(readWayBack(undefined)).toBeNull();
  });

  it("is not the template's placeholder, so a new checklist records none", () => {
    expect(SECTION.startsWith(SECTION_HEADING)).toBe(true);
    expect(SECTION).toMatch(/^Way back: not recorded yet/m);
    expect(readWayBack(TEMPLATE)).toBeNull();
  });

  it("takes the placeholder's place, and writing it again changes nothing", () => {
    const once = writeWayBack(TEMPLATE, RECORD, SECTION);
    expect(readWayBack(once)).toEqual(RECORD);
    expect(once).toContain(`\n${LINE}\n`);
    expect(once).not.toMatch(/^Way back: not recorded yet/m);
    expect(once.split(SECTION_HEADING)).toHaveLength(2);
    expect(writeWayBack(once, RECORD, SECTION)).toBe(once);
  });

  it("moves to a new origin/main after a rebase, in the same place", () => {
    const once = writeWayBack(TEMPLATE, RECORD, SECTION);
    const moved = writeWayBack(once, { sha: LATER, subject: "A hotfix" }, SECTION);
    expect(readWayBack(moved)).toEqual({ sha: LATER, subject: "A hotfix" });
    expect(moved.match(/^Way back:/gm)).toHaveLength(1);
  });

  it("goes under the heading when there is one, and brings the section when there is not", () => {
    const headed = writeWayBack(`# 9.1\n\n${SECTION_HEADING}\n\nWhat to do.\n`, RECORD, SECTION);
    expect(headed).toBe(`# 9.1\n\n${SECTION_HEADING}\n\n${LINE}\n\nWhat to do.\n`);
    // A checklist written before 1.6 has neither: it gets the template's section.
    const old = writeWayBack("# 1.5.2: release checklist\n\n- [x] Pushed.\n", RECORD, SECTION);
    expect(old.startsWith("# 1.5.2: release checklist\n\n- [x] Pushed.\n\n## If it goes wrong\n")).toBe(true);
    expect(readWayBack(old)).toEqual(RECORD);
  });

  it("keeps a subject as it was, except an em dash", () => {
    const dash = String.fromCharCode(0x2014);
    const text = writeWayBack(SECTION, { sha: MAIN, subject: `One ${dash} two` }, SECTION);
    expect(readWayBack(text)?.subject).toBe("One - two");
  });
});

describe("when back may record it", () => {
  const at = { path: "docs/plans/v9.1/RELEASE.md", originMain: MAIN, head: LATER, isAncestor: true, onMain: null };

  it("may, on a branch that follows origin/main", () => {
    expect(backRefusal(at)).toBeNull();
  });

  it("may not without origin/main, on origin/main itself, or off it", () => {
    expect(backRefusal({ ...at, originMain: null })).toMatch(/git fetch origin/);
    expect(backRefusal({ ...at, head: MAIN })).toMatch(/nothing to push/);
    expect(backRefusal({ ...at, isAncestor: false })).toMatch(/not an ancestor/);
  });

  it("may not once the release is out with its line on origin/main", () => {
    expect(backRefusal({ ...at, onMain: RECORD })).toMatch(/This release is out/);
  });
});

describe("what check says", () => {
  const file = "docs/plans/v9.1/RELEASE.md";

  it("NO without a way back, with the command", () => {
    expect(wayBackVerdict({ path: file, recorded: null, originMain: MAIN, onMain: null })).toEqual({
      ok: false,
      text: `${file} records no way back`,
      fix: "node scripts/release.mjs back",
    });
  });

  it("ok while it is origin/main, short or full", () => {
    expect(wayBackVerdict({ path: file, recorded: RECORD, originMain: MAIN, onMain: null }).ok).toBe(true);
    expect(wayBackVerdict({ path: file, recorded: { ...RECORD, sha: MAIN.slice(0, 8) }, originMain: MAIN, onMain: null }).ok).toBe(true);
  });

  it("NO once origin/main has moved past it before the push", () => {
    const v = wayBackVerdict({ path: file, recorded: RECORD, originMain: LATER, onMain: null });
    expect(v.ok).toBe(false);
    expect(v.text).toContain("origin/main is 1324ac3d now");
  });

  it("ok after the push, when origin/main carries the same line", () => {
    expect(wayBackVerdict({ path: file, recorded: RECORD, originMain: LATER, onMain: RECORD })).toMatchObject({
      ok: true,
      text: "the push is out, and its way back is ac35f621 Admin panel: the SSM board's look, black and white",
    });
  });
});
