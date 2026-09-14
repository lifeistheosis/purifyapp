import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PatchNoteInput, describeChange, emDashField } from "@/lib/whatsNew/patchNoteShape";
import {
  HIERARCHY_SINCE,
  UPDATE_CATEGORIES,
  UPDATE_CATEGORY_IDS,
  checklistProblems,
  coverage,
  groupByCategory,
  hierarchyApplies,
  normaliseItem,
  normaliseItems,
  type ChecklistEntry,
  type NoteItem,
  type ReleaseChecklist,
} from "@/lib/whatsNew/updateHierarchy";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

/**
 * The Update Hierarchy, held.
 *
 * The owner's board says six things "must be included in every update". The
 * last describe block below is the part that makes that true: from 1.4, the
 * release bump cannot go green unless the newest note and its checklist
 * account for all six. Everything above it proves the pieces that check runs
 * on, so a red release build points at the note, not at the checker.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");

const shipped: ChecklistEntry = { status: "shipped" };
const skipped = (reason: string): ChecklistEntry => ({ status: "skipped", reason });

function fullChecklist(version: string): ReleaseChecklist {
  return {
    version,
    categories: Object.fromEntries(
      UPDATE_CATEGORY_IDS.map((id) => [id, skipped("Nothing this cycle.")]),
    ) as ReleaseChecklist["categories"],
  };
}

describe("the six categories", () => {
  it("are the board's six, in the board's order", () => {
    expect(UPDATE_CATEGORIES.map((c) => c.label)).toEqual([
      "Bugs and Maintenance",
      "New Saint Additions",
      "Library Experience",
      "Shop Additions",
      "Subscription Perks",
      "Stats Updates",
    ]);
    expect(UPDATE_CATEGORIES.map((c) => c.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("carry the board's sub-items, numbered under their category", () => {
    for (const c of UPDATE_CATEGORIES) {
      expect(c.subItems.length, c.label).toBeGreaterThan(0);
      for (const s of c.subItems) expect(s.id.startsWith(`${c.rank}.`), s.id).toBe(true);
    }
  });

  it("carry no em dash anywhere a reader or the owner reads them", () => {
    expect(JSON.stringify(UPDATE_CATEGORIES)).not.toMatch(/—/);
  });

  it("match the copy in scripts/patch-notes.mjs, which cannot import TypeScript", () => {
    const script = fs.readFileSync(path.join(ROOT, "scripts/patch-notes.mjs"), "utf8");
    const m = script.match(/const CATEGORY_IDS = (\[[^\]]*\]);/);
    expect(m, "CATEGORY_IDS not found in scripts/patch-notes.mjs").toBeTruthy();
    expect(JSON.parse(m![1])).toEqual([...UPDATE_CATEGORY_IDS]);
  });
});

describe("a note's lines", () => {
  it("keep every old plain-string line exactly as written", () => {
    expect(normaliseItem("Fixed the prayer rope count.")).toBe("Fixed the prayer rope count.");
  });

  it("keep a categorised line, and never lose a line with a bad category", () => {
    expect(normaliseItem({ category: "saints", text: "St John of Kronstadt." })).toEqual({
      category: "saints",
      text: "St John of Kronstadt.",
    });
    // A typo in a category must not blank a reader's line; it renders as text.
    expect(normaliseItem({ category: "saint", text: "St John of Kronstadt." })).toBe("St John of Kronstadt.");
    expect(normaliseItem({ category: "saints" })).toBeNull();
    expect(normaliseItems(["a", null, { category: "fixes", text: "b" }, 7])).toEqual([
      "a",
      { category: "fixes", text: "b" },
      "7",
    ]);
  });

  it("group in hierarchy order and leave empty categories out", () => {
    const items: NoteItem[] = [
      { category: "stats", text: "300 saints." },
      "An old-style line.",
      { category: "fixes", text: "Reading position survives a reload." },
      { category: "stats", text: "Eleven new books." },
    ];
    const g = groupByCategory(items);
    expect(g.uncategorised).toEqual(["An old-style line."]);
    expect(g.groups.map((x) => x.category.id)).toEqual(["fixes", "stats"]);
    expect(g.groups[1].items).toEqual(["300 saints.", "Eleven new books."]);
  });

  it("count toward coverage only when they have text", () => {
    const c = coverage([{ category: "shop", text: "  " }, { category: "shop", text: "New prints." }]);
    expect(c.shop).toBe(1);
    expect(c.fixes).toBe(0);
  });

  it("pass the one schema, and a bad category is refused there rather than stored", () => {
    const ok = PatchNoteInput.safeParse({
      version: "1.4",
      date: "2026-10-01",
      items: ["plain", { category: "library", text: "Candlelight mode." }],
    });
    expect(ok.success).toBe(true);
    const bad = PatchNoteInput.safeParse({
      version: "1.4",
      date: "2026-10-01",
      items: [{ category: "misc", text: "x" }],
    });
    expect(bad.success).toBe(false);
  });

  it("are checked for em dashes and diffed by content, categorised or not", () => {
    const base = { version: "1.4", kind: "", date: "2026-10-01", title: "", blurb: "" };
    expect(emDashField({ ...base, items: ["fine", { category: "fixes", text: "not — fine" }] })).toBe("item 2");
    const a = { ...base, items: [{ category: "fixes" as const, text: "Same." }] };
    const b = { ...base, items: [{ category: "fixes" as const, text: "Same." }] };
    expect(describeChange(a, b)).toBeNull();
    const moved = { ...base, items: [{ category: "library" as const, text: "Same." }] };
    expect(describeChange(a, moved)).toBe("Claude changed item 1 in 1.4");
  });
});

describe("which releases the hierarchy binds", () => {
  it("binds 1.4 and everything after it", () => {
    expect(HIERARCHY_SINCE).toBe("1.4");
    expect(hierarchyApplies("1.4")).toBe(true);
    expect(hierarchyApplies("1.4.1")).toBe(true);
    expect(hierarchyApplies("1.10")).toBe(true);
    expect(hierarchyApplies("2.0")).toBe(true);
  });

  it("leaves history alone, including the Beta series that numbered higher", () => {
    expect(hierarchyApplies("1.3")).toBe(false);
    expect(hierarchyApplies("1.0")).toBe(false);
    expect(hierarchyApplies("Beta 2.3")).toBe(false);
  });
});

describe("checklistProblems", () => {
  const note = (items: NoteItem[]) => ({ version: "1.4", items });

  it("passes a release that files lines and gives reasons for the rest", () => {
    const list = fullChecklist("1.4");
    list.categories.fixes = shipped;
    expect(
      checklistProblems(list, note([{ category: "fixes", text: "Layout no longer jumps on Safari." }])),
    ).toEqual([]);
  });

  it("refuses a missing checklist, and says where it goes", () => {
    const p = checklistProblems(null, note([]));
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("data/changelog/checklists/1.4.json");
  });

  it("refuses a category nobody accounted for", () => {
    const list = fullChecklist("1.4") as { version: string; categories: Record<string, unknown> };
    delete list.categories.saints;
    expect(checklistProblems(list, note([]))).toEqual([
      "2. New Saint Additions is not accounted for. Mark it shipped or skipped with a reason.",
    ]);
  });

  it("refuses shipped with no line, and skipped with lines", () => {
    const list = fullChecklist("1.4");
    list.categories.shop = shipped;
    list.categories.stats = skipped("No numbers this time.");
    const p = checklistProblems(list, note([{ category: "stats", text: "300 saints." }]));
    expect(p).toContain("4. Shop Additions is marked shipped, but the note files no line under it.");
    expect(p).toContain("6. Stats Updates is marked skipped, but the note files 1 line(s) under it.");
  });

  it("refuses a skip with no reason, a wrong version and an unknown key", () => {
    const list = fullChecklist("1.5") as { version: string; categories: Record<string, unknown> };
    list.categories.perks = { status: "skipped", reason: "  " };
    list.categories.misc = shipped;
    const p = checklistProblems(list, note([]));
    expect(p).toContain("The checklist names version 1.5, but the release is 1.4.");
    expect(p).toContain("5. Subscription Perks is skipped without a reason.");
    expect(p).toContain('The checklist has an unknown category "misc".');
  });
});

describe("the current release", () => {
  // The rule itself. Reads the files a release actually ships, the way
  // lib/appUpdate/__tests__/release.test.ts reads build.gradle.
  it("accounts for all six categories of the Update Hierarchy, from 1.4 on", () => {
    if (!hierarchyApplies(CURRENT_VERSION)) {
      // 1.3 and earlier predate the hierarchy. Nothing to hold yet; this goes
      // live on the bump to 1.4 without anyone remembering to switch it on.
      expect(hierarchyApplies(CURRENT_VERSION)).toBe(false);
      return;
    }

    const entries = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data/changelog/entries.json"), "utf8"),
    ) as { version: string; items: unknown[] }[];
    const newest = entries[0];
    expect(newest?.version, "the newest entries.json release is not CURRENT_VERSION").toBe(CURRENT_VERSION);

    const file = path.join(ROOT, "data/changelog/checklists", `${CURRENT_VERSION}.json`);
    const checklist = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;

    const problems = checklistProblems(checklist, {
      version: CURRENT_VERSION,
      items: normaliseItems(newest.items),
    });
    expect(problems, `Release ${CURRENT_VERSION} does not satisfy the Update Hierarchy:\n- ${problems.join("\n- ")}`).toEqual([]);
  });
});
