// Where a reader chooses their patron saint (build 89, note 17).
//
// The owner's words: "when you click on it, it directs you to the app but
// there's no setting for it in the app". The My saint widget asked for a
// saint and its tap opened Today; the picker lived only on the reader's own
// page under You, and Settings had no row for it.
//
// What it holds: the widget's address for the choice is the reader's own page
// with the picker named (#patron), which that page draws and brings into view
// once it has its list.
//
// What a reader would notice if this broke: a widget that asks for a saint and
// a tap that leads nowhere to choose one.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PATRON_ANCHOR, PATRON_HOME } from "@/lib/profile/patronEvent";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("the patron saint's picker", () => {
  it("is where the widget sends a reader: the reader's own page, the picker named", () => {
    expect(PATRON_HOME).toBe(`/account/profile#${PATRON_ANCHOR}`);
    expect(existsSync(join(process.cwd(), "app/(app)/account/(signed)/profile/page.tsx"))).toBe(true);
    expect(read("app/(app)/account/(signed)/profile/page.tsx")).toContain("<ProfileTabClient />");
    expect(read("components/profile/ProfileTabClient.tsx")).toContain("<PatronSaintPicker />");
  });

  it("is named on that page and brought into view when the address asks for it", () => {
    const picker = read("components/profile/PatronSaintPicker.tsx");
    expect(picker).toContain("<section id={PATRON_ANCHOR}");
    expect(picker).toContain("window.location.hash !== `#${PATRON_ANCHOR}`");
    expect(picker).toMatch(/scrollIntoView\(\{ block: "center", behavior: prefersReducedMotion\(\) \? "auto" : "smooth" \}\)/);
  });
});
