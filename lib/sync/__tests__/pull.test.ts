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

const { pullServerAnnotations } = await import("../annotations");
const { pullServerBookmarks } = await import("../bookmarks");
const { pullServerFlorilegia } = await import("../florilegium");

const pad = (i: number) => String(i).padStart(5, "0");
const reader = { id: "reader" };

beforeEach(() => stored.clear());

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
