import { describe, expect, it } from "vitest";

import {
  DRAFT_TTL_MS,
  DRAFTS_KEY,
  MAX_DRAFTS,
  deleteDraft,
  draftAge,
  getDraft,
  listDrafts,
  newDraftId,
  saveDraft,
  type DraftStorage,
  type ProductDraft,
} from "../productDrafts";

function memory(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const draft = (id: string, savedAt: number, title = id): ProductDraft => ({
  id,
  kind: "import",
  productId: null,
  title,
  supplierHost: "temu.com",
  savedAt,
  product: { title },
  sourcing: {},
  supplierName: "",
});

describe("product drafts", () => {
  it("saves, reads back, and replaces by id", () => {
    const s = memory();
    saveDraft(s, draft("new:a", 1_000, "First"), 2_000);
    saveDraft(s, draft("new:a", 1_500, "First, edited"), 2_000);
    expect(listDrafts(s, 2_000)).toHaveLength(1);
    expect(getDraft(s, "new:a", 2_000)?.title).toBe("First, edited");
  });

  it("lists newest first and caps the count", () => {
    const s = memory();
    for (let i = 0; i < MAX_DRAFTS + 5; i++) saveDraft(s, draft(`new:${i}`, 1_000 + i), 5_000);
    const all = listDrafts(s, 5_000);
    expect(all).toHaveLength(MAX_DRAFTS);
    expect(all[0].id).toBe(`new:${MAX_DRAFTS + 4}`);
  });

  it("forgets drafts older than a month", () => {
    const s = memory();
    saveDraft(s, draft("new:old", 0), 0);
    expect(listDrafts(s, DRAFT_TTL_MS + 1)).toEqual([]);
  });

  it("deletes one draft and leaves the rest", () => {
    const s = memory();
    saveDraft(s, draft("new:a", 1), 10);
    saveDraft(s, draft("edit:b", 2), 10);
    deleteDraft(s, "new:a", 10);
    expect(listDrafts(s, 10).map((d) => d.id)).toEqual(["edit:b"]);
  });

  it("survives junk in storage and a browser that refuses to store", () => {
    const s = memory();
    s.data.set(DRAFTS_KEY, "{not json");
    expect(listDrafts(s)).toEqual([]);
    const full: DraftStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(saveDraft(full, draft("new:a", 1), 1)).toBe(false);
  });

  it("makes distinct ids and readable ages", () => {
    expect(newDraftId(() => "x")).toMatch(/^new:[0-9a-z]+x$/);
    expect(draftAge(0, 10_000)).toBe("just now");
    expect(draftAge(0, 5 * 60_000)).toBe("5 min ago");
    expect(draftAge(0, 3 * 3_600_000)).toBe("3 h ago");
    expect(draftAge(0, 3 * 86_400_000)).toBe("3 d ago");
  });
});
