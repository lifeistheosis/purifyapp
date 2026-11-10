import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { feastMonthDay, saintFeasts } from "../feastIndex";

/**
 * A nameday chosen by the saint whose feast it is (build 89 note 11), never
 * typed as "MM-DD": the saints' fixed feasts as month and day, and the For
 * the living sheet that offers them.
 */
describe("the saints' feasts, as a nameday is chosen", () => {
  it("reads a profile's plain date, and leaves a movable feast out", () => {
    expect(feastMonthDay("August 9")).toBe("08-09");
    expect(feastMonthDay("December 6")).toBe("12-06");
    expect(feastMonthDay("Fifth Sunday of Great Lent")).toBeNull();
    expect(feastMonthDay("Smarch 3")).toBeNull();
  });

  it("holds every saint with a fixed feast, St Nicholas on the sixth of December among them", () => {
    const feasts = saintFeasts();
    expect(feasts.length).toBeGreaterThan(100);
    for (const f of feasts) for (const d of f.days) expect(d, f.slug).toMatch(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    expect(feasts.find((f) => /Nicholas/.test(f.name))?.days).toContain("12-06");
  });

  it("is a file the apps carry, fetched when the choice opens, not a prop", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "app/saint-feasts.json/route.ts"), "utf8");
    expect(route).toContain('export const dynamic = "force-static";');
    const form = fs.readFileSync(path.join(process.cwd(), "components/prayers/NameForm.tsx"), "utf8");
    expect(form).toContain('fetch("/saint-feasts.json")');
    expect(form).not.toMatch(/from "@\/lib\/saints\/saints"/);
  });
});

describe("the For the living sheet (build 89 note 11)", () => {
  const form = fs.readFileSync(path.join(process.cwd(), "components/prayers/NameForm.tsx"), "utf8");

  it("asks the nameday as a month and a day, never typed as MM-DD", () => {
    expect(form).not.toMatch(/pattern="\\d\{2\}-\\d\{2\}"/);
    expect(form).toContain('label={t("prayers.diptychs.namedayMonth")} cols={4}');
    expect(form).toContain('label={t("prayers.diptychs.namedayDay")} cols={7}');
  });

  it("offers the relationship as words to tap, or written, and asks no tags", () => {
    expect(form).toMatch(/<Track<Relationship>/);
    expect(form).toContain('placeholder={t("prayers.diptychs.relationshipOther")}');
    expect(form).not.toContain("prayers.diptychs.tags");
    // A name's own tags are kept as they were.
    expect(form).toContain("tags: initial?.tags ?? []");
  });

  it("says the note's limit only as it nears, and saves with the house's own button", () => {
    expect(form).toMatch(/note\.length >= NOTE_NEAR \?/);
    expect(form).toContain('<Button variant="inverse"');
  });
});
