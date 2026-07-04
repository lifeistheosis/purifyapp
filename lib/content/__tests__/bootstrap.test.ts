import { describe, it, expect } from "vitest";
import { openNodeStore } from "../storage/nodeStore";
import { initLocalContent } from "../bootstrap";
import { scanBetaData, type KeyValueSnapshot } from "../betaImport";
import { buildSamplePackage, SAMPLE_RECORDS } from "./fixtures";
import type { MigratedRecord } from "../migration";

function fakeStorage(entries: Record<string, string>): KeyValueSnapshot {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (i) => keys[i] ?? null,
    getItem: (k) => entries[k] ?? null,
  };
}

describe("native bootstrap", () => {
  it("first run: imports the bundled package and migrates beta data", async () => {
    const store = await openNodeStore();
    const beta: MigratedRecord[] = [
      { kind: "bookmark", id: "purify:bookmark:john-1-1", data: { ref: "john/1" } },
    ];
    const res = await initLocalContent({
      store,
      loadStarterPackage: () => buildSamplePackage("v1"),
      betaData: () => beta,
    });
    expect(res.firstRun).toBe(true);
    expect(res.contentVersion).toBe("v1");
    expect(res.migration?.imported).toBe(1);
    // content + user data both present
    expect(await res.repo.getPrayer("morning")).not.toBeNull();
    const bm = await store.get("SELECT 1 FROM user_record WHERE kind='bookmark'");
    expect(bm).toBeDefined();
  });

  it("second boot: no re-import, no re-migration (idempotent)", async () => {
    const store = await openNodeStore();
    const deps = {
      store,
      loadStarterPackage: () => buildSamplePackage("v1"),
      betaData: () => [
        { kind: "note" as const, id: "purify:note:1", data: { text: "x" } },
      ],
    };
    await initLocalContent(deps);
    const second = await initLocalContent(deps);
    expect(second.firstRun).toBe(false);
    expect(second.migration).toBeNull(); // migrationDone → skipped
    const n = await store.get<{ n: number }>("SELECT COUNT(*) AS n FROM content");
    expect(n?.n).toBe(SAMPLE_RECORDS.length); // not doubled
  });

  it("survives with no bundled package (no crash, no content)", async () => {
    const store = await openNodeStore();
    const res = await initLocalContent({
      store,
      loadStarterPackage: async () => null,
    });
    expect(res.firstRun).toBe(false);
    expect(res.contentVersion).toBeNull();
    expect(await res.repo.getPrayer("morning")).toBeNull();
  });

  it("scanBetaData preserves all known purify:* keys without loss", async () => {
    const records = scanBetaData(
      fakeStorage({
        "purify:bookmark:john-1": JSON.stringify({ ref: "john/1" }),
        "purify:note:abc": JSON.stringify({ text: "hi", updatedAt: "2026-02-02T00:00:00Z" }),
        "purify:florileg:fav": JSON.stringify({ items: [] }),
        "purify_install_visits": "3", // not a user-data key → ignored
        "unrelated": "x",
      }),
    );
    const kinds = records.map((r) => r.kind).sort();
    expect(kinds).toEqual(["bookmark", "florilegium", "note"]);
    const note = records.find((r) => r.kind === "note");
    expect(note?.updatedAt).toBe("2026-02-02T00:00:00Z"); // carried through
  });
});
