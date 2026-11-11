// Marks on any words of a paragraph (build 93 note 13), across devices.
//
// They need the owner's SQL (docs/1.9-build/sql/annotation-marks.sql): a
// marks column, and the text-paragraph kind for the texts beside the Fathers'
// works. Until it has run they must stay safe on the device that made them:
// never sent to a table that cannot hold them, and never taken away by a row
// that comes down without them.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

let client: SupabaseClient;
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
vi.mock("@/lib/entitlements/client", () => ({ canSync: async () => true }));

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

const { annotationKeyOf, forgetColorProbe, forgetMarksProbe, pullServerAnnotations, pushAllLocalAnnotations, pushAnnotationKeys } = await import("../annotations");

const reader = { id: "reader" };
const mark = { id: "m1", s: 4, e: 11, q: "kingdom", pre: "The ", suf: " of God", color: "blue", at: "2026-11-11T00:00:00.000Z" };
const work = { saintSlug: "cyprian-of-carthage", workSlug: "on-the-mortality", sectionN: 2, paragraphIdx: 0 };
const workKey = "purify:saint:cyprian-of-carthage:on-the-mortality:2:0";
const council = { text: "council", slug: "nicaea-i", doc: "the-canons", sectionN: 1, paragraphIdx: 0 };
const councilKey = "purify:text:council:nicaea-i:the-canons:1:0";

// The second read of the table is the probe for the marks column (the first is the colour's).
const noMarksColumn = ({ table, n }: { table: string; n: number }) => (table === "annotations" && n === 2 ? { code: "42703", message: "column annotations.marks does not exist" } : null);

beforeEach(() => {
  stored.clear();
  forgetColorProbe();
  forgetMarksProbe();
});

describe("before the owner's SQL has run", () => {
  it("a row from the server never takes a paragraph's marks away", async () => {
    const annotations = [{ id: "a1", user_id: "reader", kind: "saint-paragraph", locator: { ...work }, highlighted: true, highlighted_words: null, note: null, updated_at: "2026-11-12T00:00:00Z" }];
    ({ client } = cappedApi({ annotations }, {}, { user: reader, fail: noMarksColumn }));
    stored.set(workKey, JSON.stringify({ marks: [mark], at: "2026-11-11T00:00:00Z" }));
    await pullServerAnnotations();
    const now = JSON.parse(stored.get(workKey) ?? "{}");
    expect(now.highlighted).toBe(true);
    expect(now.marks).toEqual([mark]);
  });

  it("a paragraph that holds only marks is not sent, and neither is another text's", async () => {
    const annotations: Record<string, unknown>[] = [];
    ({ client } = cappedApi({ annotations }, {}, { user: reader, fail: noMarksColumn, upserts: true }));
    stored.set(workKey, JSON.stringify({ marks: [mark], at: "2026-11-11T00:00:00Z" }));
    stored.set(councilKey, JSON.stringify({ highlighted: true, color: "green", marks: [mark], at: "2026-11-11T00:00:00Z" }));
    await pushAnnotationKeys([workKey, councilKey]);
    await pushAllLocalAnnotations();
    expect(annotations).toHaveLength(0);
  });

  it("a Father's paragraph with a highlight and marks still sends its highlight, without the column", async () => {
    const annotations: Record<string, unknown>[] = [];
    ({ client } = cappedApi({ annotations }, {}, { user: reader, fail: noMarksColumn }));
    stored.set(workKey, JSON.stringify({ highlighted: true, color: "rose", marks: [mark], at: "2026-11-11T00:00:00Z" }));
    await pushAnnotationKeys([workKey]);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toMatchObject({ kind: "saint-paragraph", highlighted: true });
    expect("marks" in annotations[0]).toBe(false);
  });
});

describe("once the marks column is there", () => {
  it("sends a paragraph's marks, and another text's paragraph under its own kind", async () => {
    const annotations: Record<string, unknown>[] = [];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    stored.set(workKey, JSON.stringify({ marks: [mark], at: "2026-11-11T00:00:00Z" }));
    stored.set(councilKey, JSON.stringify({ marks: [mark], at: "2026-11-11T00:00:00Z" }));
    await pushAnnotationKeys([workKey, councilKey]);
    expect(annotations).toHaveLength(2);
    expect(annotations.find((r) => r.kind === "saint-paragraph")).toMatchObject({ locator: work, marks: [mark], highlighted: false });
    expect(annotations.find((r) => r.kind === "text-paragraph")).toMatchObject({ locator: council, marks: [mark] });
  });

  it("brings them down to a new device, well formed ones only", async () => {
    const annotations = [
      { id: "a1", user_id: "reader", kind: "saint-paragraph", locator: { ...work }, highlighted: false, highlighted_words: null, note: null, marks: [mark, { id: 7 }, "nonsense"], updated_at: "2026-11-12T00:00:00Z" },
      { id: "a2", user_id: "reader", kind: "text-paragraph", locator: { ...council }, highlighted: false, highlighted_words: null, note: null, marks: [mark], updated_at: "2026-11-12T00:00:00Z" },
      // A place this app does not know is left alone.
      { id: "a3", user_id: "reader", kind: "text-paragraph", locator: { text: "unknown", slug: "x", doc: "-", sectionN: 1, paragraphIdx: 0 }, highlighted: true, highlighted_words: null, note: null, marks: null, updated_at: "2026-11-12T00:00:00Z" },
    ];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    await pullServerAnnotations();
    expect(JSON.parse(stored.get(workKey) ?? "{}").marks).toEqual([mark]);
    expect(JSON.parse(stored.get(councilKey) ?? "{}").marks).toEqual([mark]);
    expect([...stored.keys()].filter((k) => k.startsWith("purify:text:"))).toEqual([councilKey]);
  });

  it("a mark taken away on another device goes here too", async () => {
    const annotations = [{ id: "a1", user_id: "reader", kind: "saint-paragraph", locator: { ...work }, highlighted: true, highlighted_words: null, note: null, marks: null, updated_at: "2026-11-12T00:00:00Z" }];
    ({ client } = cappedApi({ annotations }, {}, { user: reader }));
    stored.set(workKey, JSON.stringify({ highlighted: true, marks: [mark], at: "2026-11-11T00:00:00Z" }));
    await pullServerAnnotations();
    expect(JSON.parse(stored.get(workKey) ?? "{}").marks).toBeUndefined();
  });
});

describe("the key a change names", () => {
  it("is the other texts' own", () => {
    expect(annotationKeyOf({ kind: "text-paragraph", ...council })).toBe(councilKey);
    expect(annotationKeyOf({ kind: "saint-paragraph", ...work })).toBe(workKey);
  });
});
