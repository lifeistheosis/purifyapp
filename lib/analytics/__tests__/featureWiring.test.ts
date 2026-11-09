// Where the app sends the 1.9 counts (admin A5, lib/analytics/featureCount.ts),
// wired by the Updates chat: a Bible download finishing, a plan begun and
// finished (each once per plan on a device), a new journal page first saved,
// a share the server confirmed, and the version in use with the visit's count.

import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/featureCount", () => ({
  countBibleDownloaded: vi.fn(),
  countPlanBegun: vi.fn(),
  countPlanFinished: vi.fn(),
  countJournalPageWritten: vi.fn(),
  countJournalPageShared: vi.fn(),
  countVersionInUse: vi.fn(),
}));

import { countJournalPageWritten, countPlanBegun, countPlanFinished } from "@/lib/analytics/featureCount";
import { addRecord, updateRecord } from "@/lib/journal/entries";
import { getPlan } from "@/lib/plans/plans";
import { completeDay, resetPlan, startPlan } from "@/lib/plans/progress";

const local = new Map<string, string>();
const store = (m: Map<string, string>) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => void m.set(k, v),
  removeItem: (k: string) => void m.delete(k),
});
const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

beforeEach(() => {
  local.clear();
  vi.clearAllMocks();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: store(local), sessionStorage: store(new Map()), dispatchEvent: () => true },
  });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: class { constructor(public type: string) {} } });
});
afterEach(() => {
  // @ts-expect-error -- the node test environment has no window of its own.
  delete globalThis.window;
});

describe("a plan begun and finished (A5)", () => {
  it("counts a plan begun once, starting over included", () => {
    startPlan("psalter");
    startPlan("psalter");
    resetPlan("psalter");
    startPlan("psalter");
    expect(countPlanBegun).toHaveBeenCalledTimes(1);
    expect(countPlanBegun).toHaveBeenCalledWith("psalter");
    startPlan("gospels");
    expect(countPlanBegun).toHaveBeenCalledTimes(2);
  });

  it("counts a plan finished once, when its last day is marked", () => {
    const plan = getPlan("proverbs")!;
    startPlan(plan.id);
    plan.days.slice(0, -1).forEach((_, i) => completeDay(plan, i));
    expect(countPlanFinished).not.toHaveBeenCalled();
    completeDay(plan, plan.days.length - 1);
    completeDay(plan, plan.days.length - 1);
    expect(countPlanFinished).toHaveBeenCalledTimes(1);
    expect(countPlanFinished).toHaveBeenCalledWith(plan.id);
  });
});

describe("a journal page (A5)", () => {
  it("is counted when it is first saved, never on an edit", () => {
    const page = addRecord({ kind: "reflection", body: "Lord, have mercy." });
    expect(countJournalPageWritten).toHaveBeenCalledTimes(1);
    updateRecord(page.id, { body: "Lord, have mercy on me." });
    expect(countJournalPageWritten).toHaveBeenCalledTimes(1);
  });

  it("is counted as shared only once the server made the link", () => {
    const button = source("components/journal/SharePageButton.tsx");
    expect(button).toMatch(/if \(!res\.ok \|\| !data\.url\) return;\s*\/\/[^\n]*\n\s*countJournalPageShared\(\);/);
  });
});

describe("a Bible downloaded, and the version in use (A5)", () => {
  it("counts a Bible when its download is saved whole", () => {
    expect(source("lib/bible/downloads/store.ts")).toMatch(/countBibleDownloaded\(id\);\s*return "saved";/);
  });

  it("counts the version with the visit's own count, after a person's input", () => {
    const tracker = source("components/analytics/AnalyticsTracker.tsx");
    expect(tracker.match(/countVersionInUse\(\);/g)?.length).toBe(2);
    expect(tracker).toMatch(/countVisit\(\);\s*\/\/[^\n]*\n\s*countVersionInUse\(\);/);
  });
});
