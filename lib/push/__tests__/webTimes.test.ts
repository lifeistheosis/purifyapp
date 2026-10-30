import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A browser's reminder times: where they are read from for the account
 * screen, what a change sends, and what happens to a change the server does
 * not take. The route's half is subscribeRoute.test.ts.
 *
 * A browser's times live in its push_subscriptions row and nowhere else once
 * it is saved, so the screen reads the row (as the reader, under RLS). Before
 * 2026-10-30 it read nothing and showed the defaults. And a change made while
 * signed out was dropped: updateReminderTimes looked for an ok and did
 * nothing else, so after the sign-in the browser went on at its old times.
 */

type Row = { endpoint: string; user_id: string; morning_time: string | null; evening_time: string | null };

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  user: null as null | { id: string },
  rows: [] as Row[],
  reads: [] as [string, unknown][][],
  posts: [] as Record<string, unknown>[],
  answer: { status: 200 } as { status: number } | "offline",
}));

vi.mock("@/lib/supabase/localSession", () => ({ readLocalSessionUser: () => state.user }));
vi.mock("../vapid", () => ({ browserVapidKey: () => ({ ok: true, value: "BAAA" }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      expect(table).toBe("push_subscriptions");
      return {
        select: (columns: string) => {
          expect(columns).toBe("endpoint, morning_time, evening_time");
          const filters: [string, unknown][] = [];
          state.reads.push(filters);
          const chain = {
            eq(k: string, v: unknown) {
              filters.push([k, v]);
              return chain;
            },
            then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
              // push_subscriptions_self_select: the reader's own rows only.
              const data = state.rows.filter(
                (r) => r.user_id === state.user?.id && filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v),
              );
              return Promise.resolve({ data, error: null }).then(resolve, reject);
            },
          };
          return chain;
        },
      };
    },
  }),
}));

import { flushPending, healWebPush, updateWebTimes, webReminderTimes } from "../client";

const ANNA = "11111111-1111-4111-8111-111111111111";
const THIS = "https://push.example/this-browser";
const PENDING = "purify:push.pending";
const SAVED = "purify:push.saved";

const subscription = {
  endpoint: THIS,
  options: { applicationServerKey: null },
  getKey: () => new Uint8Array([1, 2, 3]).buffer,
  unsubscribe: async () => true,
};

beforeEach(() => {
  state.store = new Map();
  state.user = { id: ANNA };
  state.rows = [
    { endpoint: THIS, user_id: ANNA, morning_time: "06:15", evening_time: "22:30" },
    { endpoint: "https://push.example/annas-laptop", user_id: ANNA, morning_time: "05:00", evening_time: "20:00" },
  ];
  state.reads = [];
  state.posts = [];
  state.answer = { status: 200 };
  const registration = { pushManager: { getSubscription: async () => subscription } };
  vi.stubGlobal("window", {
    PushManager: class {},
    Notification: { permission: "granted" },
    localStorage: {
      getItem: (k: string) => state.store.get(k) ?? null,
      setItem: (k: string, v: string) => void state.store.set(k, v),
      removeItem: (k: string) => void state.store.delete(k),
    },
  });
  vi.stubGlobal("Notification", { permission: "granted" });
  vi.stubGlobal("navigator", { serviceWorker: { ready: Promise.resolve(registration) } });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    expect(url).toBe("/api/push/subscribe");
    state.posts.push(JSON.parse(String(init.body)));
    if (state.answer === "offline") throw new TypeError("Failed to fetch");
    return { status: state.answer.status, ok: state.answer.status < 300 } as Response;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const times = (body: Record<string, unknown>) => ({ morningTime: body.morningTime, eveningTime: body.eveningTime });

describe("the times the account screen shows", () => {
  it("shows this browser's saved times, not the defaults", async () => {
    expect(await webReminderTimes()).toEqual({ morning: "06:15", evening: "22:30" });
  });

  it("asks for the reader's rows without putting this browser's address in the request", async () => {
    await webReminderTimes();
    expect(state.reads).toEqual([[["user_id", ANNA]]]);
  });

  it("shows a change still waiting to be sent over the saved row", async () => {
    state.store.set(PENDING, JSON.stringify({ endpoint: THIS, p256dh: "k", auth: "a", eveningTime: "23:00", timezone: "UTC" }));
    expect(await webReminderTimes()).toEqual({ morning: "06:15", evening: "23:00" });
  });

  it("shows the defaults only where nothing is saved", async () => {
    state.rows = [];
    expect(await webReminderTimes()).toEqual({ morning: "07:00", evening: "21:00" });
    state.user = null;
    state.reads = [];
    expect(await webReminderTimes()).toEqual({ morning: "07:00", evening: "21:00" });
    expect(state.reads).toEqual([]);
  });
});

describe("a change to one time", () => {
  it("sends that time and not the other", async () => {
    expect(await updateWebTimes({ evening: "23:00" })).toBe("saved");
    expect(state.posts).toHaveLength(1);
    expect(times(state.posts[0])).toEqual({ morningTime: undefined, eveningTime: "23:00" });
    expect(state.store.get(SAVED)).toBe(THIS);
  });

  it("signed out: is kept on this browser and sent at the sign-in, the other time untouched", async () => {
    state.answer = { status: 401 };
    expect(await updateWebTimes({ evening: "23:00" })).toBe("kept");
    const kept = JSON.parse(state.store.get(PENDING)!);
    expect(kept).toMatchObject({ endpoint: THIS, eveningTime: "23:00" });
    expect(kept).not.toHaveProperty("morningTime");
    expect(state.store.has(SAVED)).toBe(false);

    // The sign-in (PostSignInBridge) sends exactly what the reader changed.
    state.answer = { status: 200 };
    state.posts = [];
    await flushPending();
    expect(times(state.posts[0])).toEqual({ morningTime: undefined, eveningTime: "23:00" });
    expect(state.store.has(PENDING)).toBe(false);
    expect(state.store.get(SAVED)).toBe(THIS);
  });

  it("signed out: is sent by the next visit that is signed in, if the sign-in did not", async () => {
    state.answer = { status: 401 };
    await updateWebTimes({ morning: "05:30" });
    state.answer = { status: 200 };
    state.posts = [];
    expect(await healWebPush()).toBe("healed");
    expect(times(state.posts[0])).toEqual({ morningTime: "05:30", eveningTime: undefined });
    expect(state.store.has(PENDING)).toBe(false);
  });

  it("keeps a second change beside the first while both wait", async () => {
    state.answer = { status: 401 };
    await updateWebTimes({ evening: "23:00" });
    await updateWebTimes({ morning: "05:30" });
    expect(JSON.parse(state.store.get(PENDING)!)).toMatchObject({ morningTime: "05:30", eveningTime: "23:00" });
    // And the second request carried both, since both were waiting.
    expect(times(state.posts[1])).toEqual({ morningTime: "05:30", eveningTime: "23:00" });
  });

  it("offline, or a failed save: kept for the next visit", async () => {
    state.answer = "offline";
    expect(await updateWebTimes({ evening: "23:00" })).toBe("kept");
    state.answer = { status: 500 };
    expect(await updateWebTimes({ morning: "05:30" })).toBe("kept");
    expect(JSON.parse(state.store.get(PENDING)!)).toMatchObject({ morningTime: "05:30", eveningTime: "23:00" });
  });

  it("refused for what it is: not kept, or it would be refused at every visit", async () => {
    state.answer = { status: 400 };
    expect(await updateWebTimes({ evening: "23:00" })).toBe("failed");
    expect(state.store.has(PENDING)).toBe(false);
  });
});

describe("the visit that finishes an unsaved browser", () => {
  it("sends no times for a browser kept without any, never the defaults", async () => {
    // Not marked saved and nothing kept: the row, if there is one, keeps its
    // own times, and the route gives a new one the defaults.
    expect(await healWebPush()).toBe("healed");
    expect(times(state.posts[0])).toEqual({ morningTime: undefined, eveningTime: undefined });
  });

  it("sends the times onboarding kept, both of them", async () => {
    state.store.set(
      PENDING,
      JSON.stringify({ endpoint: THIS, p256dh: "k", auth: "a", morningTime: "07:00", eveningTime: "21:00", timezone: "UTC" }),
    );
    expect(await healWebPush()).toBe("healed");
    expect(times(state.posts[0])).toEqual({ morningTime: "07:00", eveningTime: "21:00" });
  });
});
