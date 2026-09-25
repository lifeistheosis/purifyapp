import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReleaseDetails } from "@/components/whats-new/ReleaseDetails";
import { ENTRIES, type Entry } from "@/lib/whatsNew/entries";
import { hierarchyApplies, itemText } from "@/lib/whatsNew/updateHierarchy";

/**
 * What a reader actually gets on /whats-new, rendered to markup.
 *
 * ReleaseDetails is a pure function of the entry (no hooks, no locale), which
 * is what lets the admin editor preview it and what lets this test render it
 * in node. `.test.ts` with createElement rather than JSX, because vitest only
 * collects lib/**\/__tests__/**\/*.test.ts.
 */

const html = (entry: Entry) => renderToStaticMarkup(createElement(ReleaseDetails, { entry }));

/** Text as React writes it into markup, so every line can be looked for. */
const escaped = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

describe("ReleaseDetails", () => {
  it("renders every committed release as a flat list, exactly as before the hierarchy", () => {
    // All 91 releases before 1.4 are plain strings. None may grow a heading.
    // 1.4 is the first release the hierarchy binds, and the next test holds it.
    const history = ENTRIES.filter((e) => !hierarchyApplies(e.version));
    expect(history.length).toBeGreaterThanOrEqual(91);
    for (const e of history) {
      const out = html(e);
      expect(out, e.version).not.toContain("<h4");
      let checked = 0;
      for (const it of e.items) {
        if (typeof it !== "string" || it.length === 0) continue;
        expect(out, `${e.version} lost a line: ${it.slice(0, 60)}`).toContain(escaped(it));
        checked++;
      }
      expect(checked, `${e.version} rendered no lines`).toBe(e.items.filter((i) => i !== "").length);
    }
  });

  it("draws every line of every release the hierarchy binds, categorised or not", () => {
    const bound = ENTRIES.filter((e) => hierarchyApplies(e.version));
    expect(bound.length, "no committed release is filed under the hierarchy yet").toBeGreaterThan(0);
    for (const e of bound) {
      const out = html(e);
      for (const it of e.items) {
        const text = itemText(it);
        if (!text) continue;
        expect(out, `${e.version} lost a line: ${text.slice(0, 60)}`).toContain(escaped(text));
      }
    }
  });

  it("groups categorised lines under their headings, in hierarchy order, skipping empty ones", () => {
    const out = html({
      version: "1.4",
      kind: "Scratch",
      date: "October 1, 2026",
      blurb: "A scratch release.",
      items: [
        { category: "stats", text: "Three hundred saints in the library." },
        { category: "fixes", text: "Your reading position survives a reload." },
        "A line with no category.",
      ],
    });

    const fixes = out.indexOf("Bugs and Maintenance");
    const stats = out.indexOf("Stats Updates");
    expect(fixes, "fixes heading missing").toBeGreaterThan(-1);
    expect(stats, "stats heading missing").toBeGreaterThan(fixes);
    expect(out).not.toContain("New Saint Additions");
    expect(out).not.toContain("Shop Additions");
    expect(out).toContain("Your reading position survives a reload.");
    expect(out).toContain("A line with no category.");
    expect(out.indexOf("A line with no category.")).toBeLessThan(fixes);
    expect(out).not.toContain("[object Object]");
  });
});
