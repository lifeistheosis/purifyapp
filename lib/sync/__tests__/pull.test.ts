// A new phone is handed everything the reader has on the server: every note
// and highlight, every bookmark, every gathered passage.
//
// The API returns at most 1,000 rows a request and says nothing when it stops
// (docs/audit/findings.yaml F-31, F-38). The three pulls named no limit, so a
// reader with more than a thousand of anything got a thousand of them on
// sign-in and no sign that there were more. Nothing was lost on the server;
// it simply never arrived. The stand-in here caps the way the real API does.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

let client: SupabaseClient;
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
vi.mock("@/lib/entitlements/client", () => ({ canSync: async () => true }));

// The device: localStorage and the events the hooks listen for.
const stored = new Map<string, string>();
const localStorage = {
  get length() {
    return stored.size;
  },
  key: (i: number) => [...stored.keys()][i] ?? null,
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, v),
  removeItem: (k: string) => void stored.delete(k),
};
vi.stubGlobal("window", { localStorage, dispatchEvent: () => true });

const { forgetColorProbe, pullServerAnnotations, pushAnnotationKeys, syncAnnotations } = await import("../annotations");
const { pullServerBookmarks, pushAllLocalBookmarks } = await import("../bookmarks");
const { pullServerFlorilegia } = await import("../florilegium");
const { forgetJournalProbe, pullJournal, pushJournal } = await import("../journal");

const pad = (i: number) => String(i).padStart(5, "0");
const reader = { id: "reader" };

beforeEach(() => {
  stored.clear();
  forgetColorProbe();
  forgetJournalProbe();
});

describe("signing in on a new device", () => {
  it("brings down every note and highlight, past the first thousand", async () => {
    const annotations = Array.from({ length: 1500 }, (_, i) => ({
      id: `a${pad(i)}`,
      user_id: "reader",
      kind: "bible-verse",
      locator: { book: "psalms", chapter: Math.floor(i / 20) + 1, verse: (i % 20) + 1 },
      highlighted: true,
      highlighted_words: null,
      note: i === 1499 ? "The last one written." : null,
      updated_at: "2026-10-01T00:00:00Z",
    }));
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));

    await pullServerAnnotations();

    const keys = [...stored.keys()].filter((k) => k.startsWith("purify:bible:"));
    expect(keys).toHaveLength(1500);
    expect(JSON.parse(stored.get("purify:bible:psalms:75:20") ?? "{}")).toMatchObject({
      highlighted: true,
      note: "The last one written.",
    });
  });

  it("brings down every bookmark, past the first thousand", async () => {
    const bookmarks = Array.from({ length: 1300 }, (_, i) => ({
      id: `b${pad(i)}`,
      user_id: "reader",
      kind: "bible-verse",
      locator: { book: "john", chapter: Math.floor(i / 50) + 1, verse: (i % 50) + 1 },
      label: "John",
      added_at: new Date(Date.parse("2026-01-01T00:00:00Z") + i * 60_000).toISOString(),
    }));
    ({ client } = cappedApi({ bookmarks }, {}, { user: reader }));

    await pullServerBookmarks();

    const local = JSON.parse(stored.get("purify:bookmarks") ?? "[]") as { id: string }[];
    expect(local).toHaveLength(1300);
    // The oldest is the one a single request, newest first, never reached.
    expect(local.some((b) => b.id === "b00000")).toBe(true);
  });

  it("brings down every gathered passage, each in its own collection", async () => {
    const florilegia = ["on-prayer", "on-fasting", "on-mercy"].map((id, i) => ({
      id,
      user_id: "reader",
      title: id,
      description: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: `2026-09-0${i + 1}T00:00:00Z`,
    }));
    const florilegium_items = Array.from({ length: 1400 }, (_, i) => ({
      id: `i${pad(i)}`,
      florilegium_id: florilegia[i % 3].id,
      user_id: "reader",
      kind: "verse",
      payload: { ref: `Psalm ${i}` },
      note: null,
      added_at: new Date(Date.parse("2026-01-01T00:00:00Z") + i * 60_000).toISOString(),
    }));
    ({ client } = cappedApi({ florilegia, florilegium_items }, {}, { user: reader }));

    await pullServerFlorilegia();

    const local = JSON.parse(stored.get("purify:florilegia") ?? "[]") as { id: string; items: { id: string }[] }[];
    expect(local).toHaveLength(3);
    expect(local.reduce((n, f) => n + f.items.length, 0)).toBe(1400);
    expect(local.flatMap((f) => f.items).some((it) => it.id === "i00000")).toBe(true);
  });

  it("does nothing for a reader who is not signed in", async () => {
    ({ client } = cappedApi({ annotations: [{ id: "a", kind: "bible-verse", locator: { book: "john", chapter: 1, verse: 1 }, highlighted: true }] }));
    await pullServerAnnotations();
    expect(stored.size).toBe(0);
  });
});

// 1.7: what a reader takes away or changes on this device stays taken away or
// changed. Both syncs only ever inserted, and every (app) page pulls, so a
// verse swiped off Saved came back on the next page and an edited note went
// back to its first words (the owner's note 21; docs/1.7-build/specs).
describe("removals and edits stick", () => {
  const john316 = { book: "john", chapter: 3, verse: 16 };
  const key = "purify:bible:john:3:16";
  const bury = (table: string, kind: string, locator: object, at: string) =>
    stored.set("purify:sync:removed", JSON.stringify([{ table, kind, locator, at }]));

  it("a bookmark removed here does not come back on the pull, and the push deletes it", async () => {
    const bookmarks = [
      { id: "b1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, label: "John 3:16", added_at: "2026-10-01T00:00:00Z" },
      { id: "b2", user_id: "reader", kind: "bible-verse", locator: { book: "john", chapter: 1, verse: 1 }, label: "John 1:1", added_at: "2026-10-02T00:00:00Z" },
    ];
    ({ client } = cappedApi({ bookmarks }, {}, { user: reader }));
    bury("bookmarks", "bible-verse", john316, "2026-10-05T00:00:00Z");

    await pullServerBookmarks();
    const local = JSON.parse(stored.get("purify:bookmarks") ?? "[]") as { id: string }[];
    expect(local.map((b) => b.id)).toEqual(["b2"]);

    await pushAllLocalBookmarks();
    expect(bookmarks.map((b) => b.id)).toEqual(["b2"]);
    // Sent, and kept a while so a device that still has it cannot hand it back.
    const left = JSON.parse(stored.get("purify:sync:removed") ?? "[]") as { flushed?: boolean }[];
    expect(left).toHaveLength(1);
    expect(left[0].flushed).toBe(true);
  });

  it("a bookmark saved again elsewhere after it was removed here does come back", async () => {
    const bookmarks = [{ id: "b1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, label: "John 3:16", added_at: "2026-10-09T00:00:00Z" }];
    ({ client } = cappedApi({ bookmarks }, {}, { user: reader }));
    bury("bookmarks", "bible-verse", john316, "2026-10-05T00:00:00Z");
    await pullServerBookmarks();
    expect(JSON.parse(stored.get("purify:bookmarks") ?? "[]")).toHaveLength(1);
  });

  it("an edited note is not overwritten by the server's older copy, and the sync sends the new words", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, highlighted: false, highlighted_words: null, note: "First words.", updated_at: "2026-10-01T00:00:00Z" },
    ];
    ({ client } = cappedApi({ annotations }, {}, { user: reader, upserts: true }));
    stored.set(key, JSON.stringify({ note: "Second thoughts.", noteAt: "2026-10-06T00:00:00Z", at: "2026-10-06T00:00:00Z" }));

    await pullServerAnnotations();
    expect(JSON.parse(stored.get(key) ?? "{}").note).toBe("Second thoughts.");

    await syncAnnotations();
    expect(annotations).toHaveLength(1);
    expect(annotations[0].note).toBe("Second thoughts.");
    expect(annotations[0].updated_at).toBe("2026-10-06T00:00:00Z");
  });

  it("a newer note from another device does replace this one's older copy", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, highlighted: true, highlighted_words: null, note: "From the tablet.", updated_at: "2026-10-08T00:00:00Z" },
    ];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    stored.set(key, JSON.stringify({ note: "From the phone.", at: "2026-10-02T00:00:00Z" }));
    await pullServerAnnotations();
    expect(JSON.parse(stored.get(key) ?? "{}")).toMatchObject({ note: "From the tablet.", highlighted: true, at: "2026-10-08T00:00:00Z" });
  });

  it("a highlight's colour survives a pull from a server that keeps none", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, highlighted: true, highlighted_words: null, note: null, updated_at: "2026-10-08T00:00:00Z" },
    ];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    stored.set(key, JSON.stringify({ highlighted: true, color: "blue", at: "2026-10-02T00:00:00Z" }));
    await pullServerAnnotations();
    expect(JSON.parse(stored.get(key) ?? "{}")).toMatchObject({ highlighted: true, color: "blue" });
  });

  it("and takes the server's colour once the column is there", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, highlighted: true, highlighted_words: null, note: null, color: "green", updated_at: "2026-10-08T00:00:00Z" },
    ];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    stored.set(key, JSON.stringify({ highlighted: true, color: "blue", at: "2026-10-02T00:00:00Z" }));
    await pullServerAnnotations();
    expect(JSON.parse(stored.get(key) ?? "{}").color).toBe("green");
  });

  it("without the colour column, nothing asks for it and the push still goes through", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, highlighted: false, highlighted_words: null, note: "Old.", updated_at: "2026-10-01T00:00:00Z" },
    ];
    const missing = { code: "42703", message: "column annotations.color does not exist" };
    // The first read of the table is the probe for the column.
    ({ client } = cappedApi({ annotations }, {}, { user: reader, fail: ({ table, n }) => (table === "annotations" && n === 1 ? missing : null) }));
    stored.set(key, JSON.stringify({ highlighted: true, color: "rose", note: "New.", at: "2026-10-06T00:00:00Z" }));
    await pushAnnotationKeys([key]);
    expect(annotations[0]).toMatchObject({ highlighted: true, note: "New." });
    expect("color" in annotations[0]).toBe(false);
  });

  it("a highlight cleared here is deleted from the server and not pulled back", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "bible-verse", locator: { ...john316 }, highlighted: true, highlighted_words: null, note: null, updated_at: "2026-10-01T00:00:00Z" },
    ];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    bury("annotations", "bible-verse", john316, "2026-10-05T00:00:00Z");
    await pullServerAnnotations();
    expect(stored.has(key)).toBe(false);
    await pushAnnotationKeys([key]);
    expect(annotations).toHaveLength(0);
  });
});

describe("the journal's own entries", () => {
  const entry = (id: string, updatedAt: string, extra: object = {}) => ({
    id,
    kind: "reflection",
    body: `Entry ${id}`,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt,
    ...extra,
  });

  it("stay on the device while the table is not there, and nothing fails", async () => {
    ({ client } = cappedApi({}, {}, { user: reader }));
    stored.set("purify:journal", JSON.stringify([entry("e1", "2026-10-01T08:00:00Z")]));
    await pushJournal();
    await pullJournal();
    expect(JSON.parse(stored.get("purify:journal") ?? "[]")).toHaveLength(1);
    expect(JSON.parse(stored.get("purify:sync:journalTable") ?? "{}").ok).toBe(false);
  });

  it("push what changed, by id, and pull the newer copy of each, a removal included", async () => {
    const journal_entries = [
      { id: "e2", user_id: "reader", kind: "prayer", body: "From the tablet.", prompt: null, source: null, created_at: "2026-10-02T08:00:00Z", updated_at: "2026-10-02T08:00:00Z", deleted_at: null },
      { id: "e1", user_id: "reader", kind: "reflection", body: "Entry e1", prompt: null, source: null, created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-04T08:00:00Z", deleted_at: "2026-10-04T08:00:00Z" },
    ];
    ({ client } = cappedApi({ journal_entries }, {}, { user: reader, upserts: true }));
    stored.set(
      "purify:journal",
      JSON.stringify([entry("e1", "2026-10-01T08:00:00Z"), entry("e3", "2026-10-03T08:00:00Z", { kind: "question", prompt: { key: "gospels.d5.q", text: "Which of the Beatitudes asks the most of you?" } })]),
    );

    await pushJournal();
    const e3 = journal_entries.find((r) => r.id === "e3");
    expect(e3).toMatchObject({ user_id: "reader", kind: "question", prompt: { key: "gospels.d5.q" } });

    await pullJournal(Date.parse("2026-10-05T00:00:00Z"));
    const local = JSON.parse(stored.get("purify:journal") ?? "[]") as { id: string; deletedAt?: string }[];
    expect(local.map((r) => r.id).sort()).toEqual(["e1", "e2", "e3"]);
    // Removed on the tablet after this phone last changed it: removed here too.
    expect(local.find((r) => r.id === "e1")?.deletedAt).toBe("2026-10-04T08:00:00.000Z");
  });
});
