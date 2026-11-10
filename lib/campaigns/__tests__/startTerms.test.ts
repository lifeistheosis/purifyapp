import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { isSheetUp, sheetLeaves, sheetRises } from "@/lib/ui/overlay";

// The Terms of Service on the page that starts a campaign (1.9; his word of
// 2026-11-10, the notes' section 18). What the server requires and keeps is
// held by routes.test.ts and model.test.ts; this holds the page's side, and
// the fault its first walk found: Escape over the Terms' sheet closed the
// sheet and left the page under it, with everything written on it.

const code = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("the Terms of Service, on starting a campaign", () => {
  const page = code("components/campaigns/StartCampaign.tsx");

  it("is a line to tick whose last words open the Terms in their sheet, in the sign-up form's own words", () => {
    const line = page.slice(page.indexOf("data-campaign-terms"), page.indexOf("data-campaign-terms") + 700);
    expect(line).toContain("on={terms}");
    expect(line).toContain('<LegalLink doc="terms"');
    expect(line).toContain('t("ui.termsOfServiceX")');
    expect(line).toContain('t("ui.iAgreeToThe")');
    // Never a bare link to the page: the sheet keeps the reader where they are.
    expect(page).not.toMatch(/href="\/terms"/);
  });

  it("keeps Create dim until it is ticked, and says so to the server only then", () => {
    const ready = page.slice(page.indexOf("const ready ="), page.indexOf("const ready =") + 400);
    expect(ready).toMatch(/rules &&\s+terms &&\s+!busy;/);
    // Sent as literally true, from the one place that sends, which runs only when ready.
    expect(page.match(/termsAccepted: true/g)).toHaveLength(1);
    expect(page).toContain("if (!ready) return;");
  });

  it("the tick with a link is a button and its label, never a link inside a button", () => {
    const tick = code("components/campaigns/TickLines.tsx");
    const withLink = tick.slice(tick.indexOf("if (link) {"), tick.indexOf("if (link) {") + 900);
    expect(withLink).toContain('role="checkbox"');
    expect(withLink).toContain("<label htmlFor={id}");
    // The button closes before the label opens, and the link stands in the label.
    expect(withLink.indexOf("</button>")).toBeLessThan(withLink.indexOf("<label"));
    expect(withLink.indexOf("{link}")).toBeGreaterThan(withLink.indexOf("<label"));
  });

  it("does not leave the page on Escape while a sheet stands over it", () => {
    expect(page).toContain('if (e.key === "Escape" && !e.defaultPrevented && opened === null && !askFiltered && !isSheetUp()) leave();');
  });
});

describe("a sheet stands over the page", () => {
  it("from when it rises until it has gone, its way out included", () => {
    expect(isSheetUp()).toBe(false);
    const fallen = sheetRises();
    expect(isSheetUp()).toBe(true);
    // It begins to leave: it is no longer risen, and not yet gone.
    const gone = sheetLeaves();
    fallen();
    expect(isSheetUp()).toBe(true);
    gone();
    expect(isSheetUp()).toBe(false);
  });

  it("counts every sheet: the page is clear only when the last has gone", () => {
    const a = sheetRises();
    const b = sheetRises();
    a();
    expect(isSheetUp()).toBe(true);
    b();
    expect(isSheetUp()).toBe(false);
  });
});
