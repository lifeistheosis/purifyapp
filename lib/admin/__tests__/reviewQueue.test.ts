import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { readReviewQueue, reviewItem } from "@/lib/admin/reviewQueue";

// The clergy review list (1.9, editorial standards 27): every marked file,
// for the team, and never a mark a reader sees.
describe("the clergy review list", () => {
  it("names a marked file by its title, area, date and basis", () => {
    const doc = { title: "The Synodal Letter", review: { status: "awaiting-clergy-review", since: "2026-10-20", basis: "Percival, NPNF2 14" } };
    expect(reviewItem("data/councils/antioch-341/letter.json", doc)).toEqual({
      area: "councils",
      file: "data/councils/antioch-341/letter.json",
      title: "The Synodal Letter",
      since: "2026-10-20",
      basis: "Percival, NPNF2 14",
    });
  });

  it("falls back to the slug, then the file, for a title", () => {
    const mark = { status: "awaiting-clergy-review", drafted: "2026-10-22" };
    expect(reviewItem("data/history/pentecost.json", { slug: "first-council-of-nicaea", review: mark })?.title).toBe("First council of nicaea");
    expect(reviewItem("data/today/machine-verse/tr.json", { review: mark })?.title).toBe("Machine verse tr");
  });

  it("leaves out what is not marked, or marked otherwise", () => {
    expect(reviewItem("data/history/a.json", { slug: "a" })).toBeNull();
    expect(reviewItem("data/history/a.json", { slug: "a", review: { status: "reviewed" } })).toBeNull();
    expect(reviewItem("data/history/a.json", null)).toBeNull();
  });

  it("reads every area but the Bible, sorted, with counts", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "review-"));
    const put = (rel: string, doc: unknown) => {
      mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      writeFileSync(path.join(root, rel), JSON.stringify(doc));
    };
    const mark = { status: "awaiting-clergy-review" };
    put("data/history/b.json", { slug: "b-event", review: mark });
    put("data/history/a.json", { slug: "a-event", review: mark });
    put("data/chants/c.json", { title: "Psalm 117", review: mark });
    put("data/bible/john/1.json", { review: mark });
    put("data/saints/x.json", { name: "Not marked" });
    put("data/history/broken.json", "{ awaiting-clergy-review");
    const q = await readReviewQueue(root);
    expect(q.total).toBe(3);
    expect(q.areas).toEqual([{ area: "history", count: 2 }, { area: "chants", count: 1 }]);
    expect(q.items.map((i) => i.title)).toEqual(["Psalm 117", "A event", "B event"]);
  });

  it("finds the marks in the repository's own data", async () => {
    const q = await readReviewQueue(process.cwd());
    expect(q.total).toBeGreaterThan(0);
    expect(q.items.every((i) => !i.file.startsWith("data/bible/"))).toBe(true);
  });
});
