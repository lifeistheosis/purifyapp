// The two supporter-mark timestamps are selected by the public read paths
// and must never be emitted by them.
//
// publicColumnExposure.test.ts guards the uuid by refusing the select. That
// shape does not fit here: the routes have to select author_plus_until and
// author_pro_until to compare them to the clock. So this guards the other
// end, the projection. A response object literal naming either column as a
// key, or a spread of the row into the response, is refused at the source,
// because a delete-after-spread leaves the value in the object until the
// line that removes it, and one early return past that line is a leak.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const MARK_READ_PATHS = [
  "app/api/community/posts/route.ts",
  "app/api/community/posts/[id]/replies/route.ts",
];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("the supporter mark read paths", () => {
  for (const rel of MARK_READ_PATHS) {
    const src = read(rel);

    it(`${rel} selects the two timestamps through AUTHOR_MARK_COLS`, () => {
      // The select is deliberate and shared, so a rename of the columns has
      // one place to happen.
      expect(src).toContain("AUTHOR_MARK_COLS");
      expect(src).toContain("deriveAuthorMark(");
    });

    it(`${rel} never names a timestamp as a response key`, () => {
      // `author_plus_until:` or `author_pro_until:` as an object key is the
      // shape of a projection that forwards the raw value.
      expect(src).not.toMatch(/author_(plus|pro)_until\s*:/);
    });

    it(`${rel} never spreads a row into a response`, () => {
      expect(src).not.toMatch(/\.\.\.\s*(row|r|data)\b/);
    });

    it(`${rel} falls back to the pre-migration column list`, () => {
      expect(src).toContain("isColumnAbsent(");
      expect(src).toMatch(/COLS_BEFORE_MARK/);
    });
  }
});
