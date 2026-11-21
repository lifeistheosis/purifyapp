import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Three notes from the look at the admin panel on a phone, 2026-11-21 (the
 * owner's word: "do all"). Each fails on the code as it was.
 */
const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("the admin panel on a phone, 2026-11-21", () => {
  it("folds the status band behind its headline when it holds more than three things, and dismisses nothing", () => {
    const strip = read("components/admin/AttentionStrip.tsx");
    expect(strip).toContain("export const FOLD_OVER = 3;");
    expect(strip).toContain("const folds = chips.length > FOLD_OVER;");
    expect(strip).toContain("hidden={folds && !shown}");
    expect(strip).toContain("aria-expanded={shown}");
    // The count stays in the button, and the button is a 44px target.
    expect(strip).toContain("`Show all ${chips.length}`");
    expect(strip).toMatch(/aria-controls="adm-attention-list"[\s\S]{0,200}className="adm-control ml-auto inline-flex min-h-11 /);
    // No way to wave a fault away: the band has no dismiss.
    expect(strip).not.toMatch(/onDismiss|onClose/);
  });

  it("puts what waits on him before the timeline on a phone, and beside it on a wide screen", () => {
    expect(read("components/admin/tabs/HomeTab.tsx")).toContain('<Panel title="Still waiting on you" pad="px-4 pt-3.5 pb-1.5" className="order-first lg:order-none">');
  });

  it("stands each of Money's three lines under its name on a phone, so the line has the row's width", () => {
    const money = read("components/admin/tabs/MoneyOverviewTab.tsx");
    expect(money).toContain('className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3"');
    expect(money).not.toContain('className="w-[110px] shrink-0 text-[13.5px] font-medium"');
  });
});
