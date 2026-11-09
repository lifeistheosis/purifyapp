// Shared journal pages, moderated (1.9, admin item A1): where a share stands,
// what the queue makes of a reported one, and the words the admin reads.

import { describe, expect, it } from "vitest";

import { serializePage, type PageBlock } from "@/lib/journal/page";

import { buildQueue, waitingKeys, type QueueSources } from "../communityQueue";
import { openReports, sharedKey, sharedState, sharedWords, waitsForDecision, type SharedPageIn } from "../sharedPages";

/** A page body as a share keeps it: the journal's own serialized page. */
const body = (blocks: PageBlock[], title = "") => serializePage({ title, blocks });

const share = (over: Partial<SharedPageIn> = {}): SharedPageIn => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "On the Psalms",
  body: body([{ type: "text", text: "The Psalter teaches us to pray." }, { type: "verse", book: "john", chapter: 3, from: 16, to: 17 }], "On the Psalms"),
  created_at: "2026-11-01T10:00:00Z",
  withdrawn_at: null,
  hidden_at: null,
  reviewed_at: null,
  reports: [],
  ...over,
});

const EMPTY: QueueSources = { holds: [], reports: [], pendingRecipes: [], campaignReports: [], recipeReports: [], reviewReports: [] };

describe("where a share stands", () => {
  it("not reviewed, reviewed, reported, hidden, taken down", () => {
    expect(sharedState(share())).toBe("unreviewed");
    expect(sharedState(share({ reviewed_at: "2026-11-02T00:00:00Z" }))).toBe("reviewed");
    expect(sharedState(share({ reports: [{ reason: null, created_at: "2026-11-03T00:00:00Z" }] }))).toBe("reported");
    expect(sharedState(share({ hidden_at: "2026-11-03T00:00:00Z", reports: [{ reason: null, created_at: "2026-11-02T00:00:00Z" }] }))).toBe("hidden");
    expect(sharedState(share({ withdrawn_at: "2026-11-04T00:00:00Z", hidden_at: "2026-11-03T00:00:00Z" }))).toBe("withdrawn");
  });

  it("a report filed after it was kept puts it back in the queue; one filed before does not", () => {
    const kept = share({ reviewed_at: "2026-11-05T00:00:00Z", reports: [{ reason: "Spam", created_at: "2026-11-04T00:00:00Z" }] });
    expect(waitsForDecision(kept)).toBe(false);
    const again = { ...kept, reports: [...kept.reports, { reason: "Rude", created_at: "2026-11-06T00:00:00Z" }] };
    expect(waitsForDecision(again)).toBe(true);
    expect(openReports(again)).toEqual([{ reason: "Rude", created_at: "2026-11-06T00:00:00Z" }]);
  });
});

describe("the words the admin reads", () => {
  it("the title, the text, and a verse card by its reference, as the public page shows it", () => {
    expect(sharedWords(share())).toBe("On the Psalms\nThe Psalter teaches us to pray.\nJohn 3:16-17");
  });

  it("cut short when long, and said plainly when there is nothing", () => {
    const long = share({ body: body([{ type: "text", text: "word ".repeat(400) }]) });
    expect(sharedWords(long, 100).length).toBeLessThanOrEqual(101);
    expect(sharedWords(long, 100).endsWith("…")).toBe(true);
    expect(sharedWords(share({ title: "", body: body([]) }))).toBe("Nothing on the page to show.");
  });
});

describe("a reported share in the one queue", () => {
  const reported = share({
    reports: [
      { reason: "Not kind", created_at: "2026-11-02T10:00:00Z" },
      { reason: "Not kind", created_at: "2026-11-03T10:00:00Z" },
      { reason: "Spam", created_at: "2026-11-03T11:00:00Z" },
    ],
  });

  it("is one row, the oldest report's time, the reasons tallied, nobody named", () => {
    const rows = buildQueue({ ...EMPTY, sharedPages: [reported, share({ id: "22222222-2222-4222-8222-222222222222" })] });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.key).toBe(sharedKey(reported.id));
    expect(row.what).toBe("Reported · 3 reports · a shared journal page");
    expect(row.at).toBe("2026-11-02T10:00:00Z");
    expect(row.who).toBeNull();
    expect(row.reasons).toBe("Not kind 2 · Spam");
    expect(row.note).toMatch(/Kept out of search engines until reviewed/);
  });

  it("hides with Undo, or keeps it, which marks it reviewed", () => {
    const [row] = buildQueue({ ...EMPTY, sharedPages: [reported] });
    const hide = row.actions.find((a) => a.id === "hide")!;
    expect(hide).toMatchObject({ removal: true, tone: "danger" });
    expect(hide.calls).toEqual([{ url: "/api/admin/shared-pages", body: { action: "hide", id: reported.id, reason: "Not kind" } }]);
    const keep = row.actions.find((a) => a.id === "keep")!;
    expect(keep).toMatchObject({ removal: false });
    expect(keep.calls).toEqual([{ url: "/api/admin/shared-pages", body: { action: "keep", id: reported.id } }]);
  });

  it("counts on the rail as the page shows it", () => {
    expect(waitingKeys({ ...EMPTY, sharedPages: [reported] })).toEqual([sharedKey(reported.id)]);
    expect(waitingKeys(EMPTY)).toEqual([]);
  });
});
