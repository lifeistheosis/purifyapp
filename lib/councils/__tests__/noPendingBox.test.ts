// A council's page shows no placeholder for what is not there (build 93, the
// fresh-eyes walk, 2026-11-11). Discover, Councils, the Synod of Jerusalem of
// 1672 drew a dashed box headed "Pending" over a document "not yet shipped".
// His rules: no dashed placeholder boxes, and no words for what is not
// there. The documents still to come stay in lib/councils/councils.ts for the
// editors (lib/councils/__tests__/documents.test.ts holds them), and no reader
// sees them.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const PAGE = path.join(process.cwd(), "app/(app)/councils/[slug]/page.tsx");

describe("a council's page", () => {
  const src = fs.readFileSync(PAGE, "utf8");
  // What the page draws, without the comments that explain what it leaves out.
  const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/[^\n]*/g, "");

  it("draws no dashed box", () => {
    expect(code).not.toMatch(/border-dashed/);
  });

  it("shows readers no documents still to come", () => {
    expect(code).not.toMatch(/pendingDocuments/);
    expect(code).not.toMatch(/study\.pending/);
  });
});
