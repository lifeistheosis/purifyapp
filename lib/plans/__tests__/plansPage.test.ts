// The reading plans page (1.9, the owner's pick for Practice, "a mix of A and
// B"): Continue first, the other plans as picture tiles. Vitest has no DOM
// here; the walk at phone size checked the screen. This holds what an edit
// could quietly undo.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lastRead } from "@/components/plans/PlansClient";
import { READING_PLANS, getPlan } from "@/lib/plans/plans";
import { readAloudCover } from "@/lib/readAloud/covers";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const PAGE = read("components/plans/PlansClient.tsx");
const CSS = read("app/globals.css");

describe("the plan to continue", () => {
  it("is the one read most lately, or begun most lately when none of its days is read", () => {
    expect(lastRead(undefined)).toBe("");
    expect(lastRead({ startedOn: "2026-11-01", done: {} })).toBe("2026-11-01");
    expect(lastRead({ startedOn: "2026-11-01", done: { 0: "2026-11-02", 1: "2026-11-05", 2: "2026-11-03" } })).toBe("2026-11-05");
  });

  it("opens its day as Begin does on the plan's own page, or the upgrade sheet without Plus", () => {
    expect(PAGE).toMatch(/if \(locked\) \{\s*upgrade\.open\("plans"\);\s*return;\s*\}\s*startPlan\(plan\.id\);\s*const session = startPlanSession\(plan, day\);/);
  });
});

describe("a plan's tile", () => {
  it("wears its first book's cover, streamed and never carried in the apps, or its season's picture", () => {
    expect(PAGE).toContain(
      "const cover = plan.season ? { src: SEASON_PICTURES[plan.season], fallback: SEASON_PICTURES[plan.season] } : readAloudCover(plan.cover ?? plan.days[0][0].book);",
    );
    expect(PAGE).toContain("<CoverArt");
  });

  it("never wears the same figure as another plan's tile (1.9: the New Testament wears St Paul)", () => {
    const worn = READING_PLANS.filter((p) => !p.season).map((p) => readAloudCover(p.cover ?? p.days[0][0].book).src);
    expect(new Set(worn).size).toBe(worn.length);
    expect(readAloudCover(getPlan("newtestament")!.cover!).nameKey).toBe("readAloud.cover.paul");
  });

  it("melts its picture into the tile's ground by a mask, with nothing laid over it", () => {
    expect(PAGE).toContain('className="plan-tile-picture absolute inset-0 h-full w-full"');
    expect(PAGE).not.toMatch(/bg-gradient-to-|from-night/);
    const rule = CSS.slice(CSS.indexOf(".plan-tile-picture {"), CSS.indexOf("}", CSS.indexOf(".plan-tile-picture {")));
    expect(rule).toContain("mask-image: linear-gradient(to bottom,");
    expect(rule).toContain("-webkit-mask-image:");
  });

  it("shows Plus with its mark, never hidden", () => {
    expect(PAGE).toContain('{locked ? <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span> : null}');
  });
});
