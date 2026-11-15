// The first launch's campaigns ask goes out from every first screen, Today among
// them (Updates 88, 1.9).
//
// What a reader would notice if this broke: a new reader opens the app on Today and
// goes to Community. The ask was the (app) frame's, which Today is outside, so it went
// out only as Community was drawn, with the Pray together switch's place held, and its
// no closed that place under the reader: the sign-in line and every post rose 77px in
// one frame with motion reduced, in 4 of 4 runs on the export, online and offline
// (docs/handoffs/updates-88.md; the motion walk's Gate 3c finding of Updates 85).

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const code = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("the first launch's campaigns ask", () => {
  it("is mounted by the root frame, which every page has", () => {
    expect(code("app/layout.tsx")).toMatch(/<RootFrame\b/);
    expect(code("components/layout/RootFrame.tsx")).toMatch(/\n {2}useAskCampaignsAtFirstLaunch\(\);\n/);
  });

  it("is not left to the (app) frame alone, which Today is outside", () => {
    expect(fs.existsSync(path.join(process.cwd(), "app/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "app/(app)/page.tsx"))).toBe(false);
    expect(code("components/layout/AppFrame.tsx")).not.toMatch(/useAskCampaignsAtFirstLaunch\(\)/);
  });
});
