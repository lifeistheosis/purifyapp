// What a reader keeps that had no table, carried between their devices (1.9,
// lib/sync/kept.ts): the merge rules item by item, and the exchange with the
// server, against a stand-in that answers the way the API does.

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import {
  cleanPlacesSlice,
  cleanPlansSlice,
  cleanReadingSlice,
  cleanRememberSlice,
  mergePlaces,
  mergePlans,
  mergeReading,
  mergeRemember,
  sameValue,
} from "../keptMerge";

let client: SupabaseClient;
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }));
vi.mock("@/lib/entitlements/client", () => ({ canSync: async () => true }));

// The device: its storage, and the events the stores send.
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
const events: { type: string; source?: string }[] = [];
vi.stubGlobal("localStorage", localStorage);
vi.stubGlobal("window", {
  localStorage,
  dispatchEvent: (e: Event) => {
    events.push({ type: e.type, source: ((e as CustomEvent).detail as { source?: string } | undefined)?.source });
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
});

const { forgetKeptProbe, syncKept } = await import("../kept");

const reader = { id: "reader" };
const DAY = 86_400_000;

beforeEach(() => {
  stored.clear();
  events.length = 0;
  forgetKeptProbe();
});

describe("plans, by when each last changed", () => {
  const plan = (at: number | undefined, done: Record<string, string>) => ({ startedOn: "2026-11-01", done, ...(at ? { at } : {}) });

  it("keeps the copy changed last", () => {
    const merged = mergePlans(
      { plans: { john21: plan(2_000, { "0": "2026-11-01", "1": "2026-11-02" }) }, resets: {} },
      { plans: { john21: plan(1_000, { "0": "2026-11-01" }) }, resets: {} },
    );
    expect(Object.keys(merged.plans.john21.done)).toEqual(["0", "1"]);
    // And the other way round: a day taken back on the tablet stays taken back.
    const back = mergePlans(
      { plans: { john21: plan(1_000, { "0": "2026-11-01", "1": "2026-11-02" }) }, resets: {} },
      { plans: { john21: plan(2_000, { "0": "2026-11-01" }) }, resets: {} },
    );
    expect(Object.keys(back.plans.john21.done)).toEqual(["0"]);
  });

  it("does not bring back a plan started over since, but keeps one begun again after", () => {
    const old = { plans: { psalter: plan(1_000, { "0": "2026-11-01" }) }, resets: {} };
    expect(mergePlans(old, { plans: {}, resets: { psalter: 2_000 } }).plans).toEqual({});
    const again = { plans: { psalter: plan(3_000, {}) }, resets: { psalter: 2_000 } };
    expect(mergePlans(old, again).plans.psalter).toEqual(plan(3_000, {}));
  });

  it("loses no day read when neither copy can say which is newer (both from before 1.9)", () => {
    const merged = mergePlans(
      { plans: { john21: plan(undefined, { "0": "2026-11-01" }) }, resets: {} },
      { plans: { john21: { startedOn: "2026-10-30", done: { "1": "2026-11-02" } } }, resets: {} },
    );
    expect(merged.plans.john21).toEqual({ startedOn: "2026-10-30", done: { "0": "2026-11-01", "1": "2026-11-02" } });
  });

  it("reads a server copy as it reads its own, keeping only what has the shape", () => {
    expect(cleanPlansSlice({ plans: { a: { startedOn: "nope", done: {} }, b: plan(5, { "0": "2026-11-01", x: "y" }) }, resets: { a: "soon" } })).toEqual({
      plans: { b: plan(5, { "0": "2026-11-01" }) },
      resets: {},
    });
    expect(cleanPlansSlice(null)).toEqual({ plans: {}, resets: {} });
  });
});

describe("Remember the verse, verse by verse", () => {
  it("keeps the newer answer of each verse, and the later day's answer", () => {
    const merged = mergeRemember(
      { entries: { "john/3/16": { box: 3, due: "2026-11-13", at: 1_000 }, "psalms/22/1": { box: 1, due: "2026-11-10", at: 5_000 } }, answeredOn: "2026-11-09", answeredKey: "psalms/22/1" },
      // "Not yet" on the tablet, later: back to the first box, whatever the phone thought.
      { entries: { "john/3/16": { box: 1, due: "2026-11-11", at: 9_000 } }, answeredOn: "2026-11-10", answeredKey: "john/3/16" },
    );
    expect(merged.entries["john/3/16"]).toEqual({ box: 1, due: "2026-11-11", at: 9_000 });
    expect(merged.entries["psalms/22/1"]).toEqual({ box: 1, due: "2026-11-10", at: 5_000 });
    expect([merged.answeredOn, merged.answeredKey]).toEqual(["2026-11-10", "john/3/16"]);
  });

  it("leaves out an answer that is not one", () => {
    expect(cleanRememberSlice({ entries: { "john/3/16": { box: 9, due: "x" }, "../x": { box: 1, due: "2026-11-10" } }, answeredKey: "john/3/16" })).toEqual({
      entries: {},
      answeredOn: undefined,
      answeredKey: undefined,
    });
  });
});

describe("the places, by when each was kept", () => {
  const bible = (ts: number, chapter: number) => ({ book: "john", bookName: "John", chapter, verse: 4, totalVerses: 51, ts });

  it("keeps the Bible's newer place, and each work's", () => {
    const merged = mergePlaces(
      { bible: bible(1_000, 1), works: { "john-cassian/conferences": { sectionN: 10, paragraph: 3, savedAt: 5_000 } }, cleared: {} },
      { bible: bible(2_000, 3), works: { "john-cassian/conferences": { sectionN: 9, paragraph: 0, savedAt: 4_000 }, "basil-the-great/hexaemeron": { sectionN: 2, paragraph: 1, savedAt: 1 } }, cleared: {} },
    );
    expect(merged.bible?.chapter).toBe(3);
    expect(merged.works).toEqual({
      "john-cassian/conferences": { sectionN: 10, paragraph: 3, savedAt: 5_000 },
      "basil-the-great/hexaemeron": { sectionN: 2, paragraph: 1, savedAt: 1 },
    });
  });

  it("lets go of a work's place once the work was finished, after the place was kept", () => {
    const merged = mergePlaces(
      { bible: null, works: { "john-cassian/institutes": { sectionN: 12, paragraph: 0, savedAt: 1_000 } }, cleared: {} },
      { bible: null, works: {}, cleared: { "john-cassian/institutes": 2_000 } },
    );
    expect(merged.works).toEqual({});
    expect(merged.cleared).toEqual({ "john-cassian/institutes": 2_000 });
  });

  it("leaves out a place that names no work", () => {
    expect(cleanPlacesSlice({ bible: { book: "../../x", chapter: 1 }, works: { "https://x": { sectionN: 1, savedAt: 1 } }, cleared: { a: 1 } })).toEqual({
      bible: null,
      works: {},
      cleared: {},
    });
  });
});

describe("the palette and the reader's settings, as one", () => {
  it("keeps the copy changed last", () => {
    const phone = cleanReadingSlice({ at: 2_000, values: { "purify.reader.theme": "candlelight", "purify.reader.size": "lg" } });
    const tablet = cleanReadingSlice({ at: 1_000, values: { "purify.reader.theme": "parchment" } });
    expect(mergeReading(tablet, phone)).toBe(phone);
    expect(mergeReading(phone, tablet)).toBe(phone);
  });

  it("carries only the settings it names, and nothing long", () => {
    expect(cleanReadingSlice({ at: 1, values: { "purify.reader.theme": "x".repeat(41), "purify:cart": "[]", "purify.reader.font": "sans" } }).values).toEqual({
      "purify.reader.font": "sans",
    });
  });
});

// Fable's release check 1, M2: newer-wins on a plan's first exchange lost a
// phone's 200 days to a tablet's 5 when the tablet was touched last.
describe("plans, the first time they meet the server", () => {
  const days = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i), "2026-11-01"]));
  const phone = { plans: { psalter: { startedOn: "2026-05-01", done: days(200), at: 1_000 } }, resets: {} };
  const tablet = { plans: { psalter: { startedOn: "2026-10-30", done: { ...days(3), "300": "2026-11-08", "301": "2026-11-09" }, at: 5_000 } }, resets: {} };

  it("join both copies' days on a plan's first exchange, whichever was touched last", () => {
    const merged = mergePlans(phone, tablet, new Set());
    expect(Object.keys(merged.plans.psalter.done)).toHaveLength(202);
    expect(merged.plans.psalter).toMatchObject({ startedOn: "2026-05-01", at: 5_000 });
    // And from the tablet's side the same days.
    expect(Object.keys(mergePlans(tablet, phone, new Set()).plans.psalter.done)).toHaveLength(202);
  });

  it("keep the copy changed last once the plan has met the server", () => {
    expect(Object.keys(mergePlans(phone, tablet, new Set(["psalter"])).plans.psalter.done)).toHaveLength(5);
  });

  it("never join a copy from before the plan was started over", () => {
    const begunAgain = { plans: { psalter: { startedOn: "2026-11-05", done: { "0": "2026-11-05" }, at: 9_000 } }, resets: { psalter: 8_000 } };
    expect(mergePlans(phone, begunAgain, new Set()).plans.psalter).toEqual(begunAgain.plans.psalter);
  });
});

describe("the exchange with the server", () => {
  it("does nothing, and asks once, while the owner's table is not there", async () => {
    stored.set("purify:plans", JSON.stringify({ john21: { startedOn: "2026-11-01", done: { "0": "2026-11-01" }, at: 1 } }));
    const { client: c } = cappedApi({}, {}, { user: reader });
    let asked = 0;
    const from = c.from.bind(c);
    client = Object.assign(Object.create(c), {
      from: (table: string) => {
        if (table === "user_kept") asked += 1;
        return from(table);
      },
      auth: c.auth,
    }) as SupabaseClient;
    await syncKept();
    await syncKept();
    expect(asked).toBe(1);
    expect(JSON.parse(stored.get("purify:sync:keptTable")!)).toMatchObject({ ok: false });
  });

  it("hands the server what this device keeps, and only what there is", async () => {
    const rows: Record<string, unknown>[] = [];
    client = cappedApi({ user_kept: rows }, {}, { user: reader, upserts: true }).client;
    stored.set("purify:plans", JSON.stringify({ john21: { startedOn: "2026-11-01", done: { "0": "2026-11-01" }, at: 7 } }));
    stored.set("purify.reader.size", "lg");
    stored.set("purify:kept.readingAt", "9");
    await syncKept();
    expect(rows.map((r) => r.slice).sort()).toEqual(["plans", "reading"]);
    expect(rows.find((r) => r.slice === "plans")).toMatchObject({ user_id: "reader", value: { plans: { john21: { at: 7 } } } });
  });

  it("brings another device's newer progress here, marked as the sync's, and does not send it back", async () => {
    const tablet = {
      plans: { john21: { startedOn: "2026-11-01", done: { "0": "2026-11-01", "1": "2026-11-02" }, at: 2 * DAY } },
      resets: {},
    };
    const rows: Record<string, unknown>[] = [{ user_id: "reader", slice: "plans", value: tablet }];
    client = cappedApi({ user_kept: rows }, {}, { user: reader, upserts: true }).client;
    stored.set("purify:plans", JSON.stringify({ john21: { startedOn: "2026-11-01", done: { "0": "2026-11-01" }, at: DAY } }));
    await syncKept(["plans"]);
    expect(JSON.parse(stored.get("purify:plans")!).john21.done).toEqual({ "0": "2026-11-01", "1": "2026-11-02" });
    expect(events).toContainEqual({ type: "purify:plans", source: "sync" });
    // The server already had the newer copy: nothing was written over it.
    expect(rows).toHaveLength(1);
    expect(sameValue(rows[0].value, tablet)).toBe(true);
  });

  it("merges before it writes, so a push never writes over what another device sent since", async () => {
    const rows: Record<string, unknown>[] = [
      { user_id: "reader", slice: "remember", value: { entries: { "psalms/22/1": { box: 2, due: "2026-11-12", at: 50 } } } },
    ];
    client = cappedApi({ user_kept: rows }, {}, { user: reader, upserts: true }).client;
    stored.set("purify:remember", JSON.stringify({ entries: { "john/3/16": { box: 1, due: "2026-11-10", at: 60 } }, texts: { "john/3/16": "For God so loved" } }));
    await syncKept(["remember"]);
    const server = rows[0].value as { entries: Record<string, unknown> };
    expect(Object.keys(server.entries).sort()).toEqual(["john/3/16", "psalms/22/1"]);
    // The verses' words stay on the device: the server is never handed them.
    expect(JSON.stringify(server)).not.toContain("For God so loved");
    expect(JSON.parse(stored.get("purify:remember")!).texts["john/3/16"]).toBe("For God so loved");
  });

  it("puts the palette and settings in place, and tells the readers and the palette to redraw", async () => {
    const rows: Record<string, unknown>[] = [
      { user_id: "reader", slice: "reading", value: { at: 5_000, values: { "purify.reader.theme": "candlelight", "purify.reader.size": null } } },
    ];
    client = cappedApi({ user_kept: rows }, {}, { user: reader, upserts: true }).client;
    stored.set("purify.reader.size", "lg");
    stored.set("purify:kept.readingAt", "1000");
    await syncKept(["reading"]);
    expect(stored.get("purify.reader.theme")).toBe("candlelight");
    expect(stored.has("purify.reader.size")).toBe(false);
    expect(events).toContainEqual({ type: "purify:reader-prefs", source: "sync" });
  });
  it("remembers which plans met the server, for whom, and only once the server holds them", async () => {
    const days = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i), "2026-11-01"]));
    const rows: Record<string, unknown>[] = [
      { user_id: "reader", slice: "plans", value: { plans: { psalter: { startedOn: "2026-11-01", done: days(5), at: 5 * DAY } }, resets: {} } },
    ];
    // The write fails: nothing is marked, so the next exchange joins again.
    const { client: c } = cappedApi({ user_kept: rows }, {}, { user: reader, upserts: true });
    const from = c.from.bind(c);
    client = Object.assign(Object.create(c), {
      from: (table: string) => {
        const q = from(table);
        return Object.assign(Object.create(q), { select: q.select.bind(q), upsert: async () => ({ data: null, error: { code: "500", message: "down" } }) });
      },
      auth: c.auth,
    }) as SupabaseClient;
    stored.set("purify:plans", JSON.stringify({ psalter: { startedOn: "2026-11-01", done: days(200), at: DAY } }));
    await syncKept(["plans"]);
    expect(stored.has("purify:kept.plansMet")).toBe(false);
    // The phone's 200 days stayed on the phone, joined with the tablet's.
    expect(Object.keys(JSON.parse(stored.get("purify:plans")!).psalter.done)).toHaveLength(200);

    // The write goes through: the server holds every day, and the plan is met.
    client = cappedApi({ user_kept: rows }, {}, { user: reader, upserts: true }).client;
    await syncKept(["plans"]);
    expect(Object.keys((rows[0].value as { plans: { psalter: { done: object } } }).plans.psalter.done)).toHaveLength(200);
    expect(JSON.parse(stored.get("purify:kept.plansMet")!)).toEqual({ user: "reader", ids: ["psalter"] });

    // Another account on this device has met nothing.
    client = cappedApi({ user_kept: [] }, {}, { user: { id: "someone-else" }, upserts: true }).client;
    stored.set("purify:plans", JSON.stringify({ john21: { startedOn: "2026-11-01", done: { "0": "2026-11-01" }, at: DAY } }));
    await syncKept(["plans"]);
    expect(JSON.parse(stored.get("purify:kept.plansMet")!)).toEqual({ user: "someone-else", ids: ["john21"] });
  });
});
