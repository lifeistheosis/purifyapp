import { describe, it, expect, beforeEach } from "vitest";
import { openNodeStore } from "../storage/nodeStore";
import type { ContentStore } from "../storage/types";
import { importPackage } from "../manifest";
import { ContentRepository, type RepoChapter } from "../repository";
import { buildSamplePackage } from "./fixtures";

describe("ContentRepository (local-first reads)", () => {
  let store: ContentStore;
  let repo: ContentRepository;

  beforeEach(async () => {
    store = await openNodeStore();
    await importPackage(store, await buildSamplePackage("v1"));
    repo = new ContentRepository(store);
  });

  it("reads a saint, prayer, bible chapter, and council locally", async () => {
    const saint = await repo.getSaint<{ name: string }>("john-chrysostom");
    expect(saint?.name).toBe("St. John Chrysostom");

    const prayer = await repo.getPrayer<{ title: string }>("morning");
    expect(prayer?.title).toBe("Morning Rule");

    const chapter = await repo.getBibleChapter("john", 1);
    expect(chapter?.verses[0].text).toMatch(/In the beginning/);

    const council = await repo.getCouncil<{ year: number }>("first-nicaea/symbol");
    expect(council?.year).toBe(325);
  });

  it("returns null for content that isn't installed", async () => {
    expect(await repo.getSaint("not-a-saint")).toBeNull();
    expect(await repo.getBibleChapter("john", 99)).toBeNull();
  });

  it("resolves saints for a feast day", async () => {
    const feasts = await repo.getFeastsForDate("11-13");
    expect(feasts).toHaveLength(1);
    const saints = await repo.getSaintsForDate<{ name: string }>("11-13");
    expect(saints.map((s) => s.name)).toContain("St. John Chrysostom");
  });

  it("searches the local index, ranking title hits first", async () => {
    const byBody = await repo.searchLibrary("beginning");
    expect(byBody.some((r) => r.ref_id === "john/1")).toBe(true);

    const byTitle = await repo.searchLibrary("chrysostom");
    expect(byTitle[0].score).toBe(2); // title hit outranks body
    expect(byTitle.every((r) => r.available)).toBe(true);
  });

  it("supports search type filters and returns empty for blank queries", async () => {
    expect(await repo.searchLibrary("")).toEqual([]);
    const onlyPrayers = await repo.searchLibrary("rule", { types: ["prayer"] });
    expect(onlyPrayers.every((r) => r.type === "prayer")).toBe(true);
  });

  it("tracks downloaded-content status", async () => {
    expect((await repo.getDownloadedStatus("fathers-pack")).status).toBe("absent");
    await repo.markDownloaded("fathers-pack", "installed", "v1", 1234);
    const s = await repo.getDownloadedStatus("fathers-pack");
    expect(s.status).toBe("installed");
    expect(s.bytes).toBe(1234);
    await repo.removeDownloadedContent("fathers-pack");
    expect((await repo.getDownloadedStatus("fathers-pack")).status).toBe("absent");
  });

  it("does not require network: reads work with no fetch available", async () => {
    // No network anything is injected; reads still resolve from local store.
    const chapter: RepoChapter | null = await repo.getBibleChapter("john", 1);
    expect(chapter).not.toBeNull();
  });
});
