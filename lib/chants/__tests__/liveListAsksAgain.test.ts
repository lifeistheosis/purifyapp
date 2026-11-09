// The list of recordings is asked for again until it is had (1.9).
//
// The owner's report of 2026-11-09: "the chant player actually doesn't load".
// Run against the live website with one request to the list failing, the 1.8
// store bundle left a chant's Play dim under "Plays with a connection" (the
// request dropped, or no answer in time) or "Not available now" (the website
// answered, but not with the list, as while a new version of it starts), on a
// good connection, for as long as the reader stayed on the screen. The list
// was asked for once per screen; nothing asked again.
//
// What a reader would notice if this broke: a chant that will not play on a
// phone that plays everything else, until they give up or think to leave the
// page and come back.
//
// No browser here: fetch, the window and the clock are stood in.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Live from "@/lib/chants/live";

const LIST = { v: 1, live: ["psalm-135/en"], pulled: [] as string[] };
const psalm = { id: "en", audio: { src: "https://audio.purifyapp.net/chants/psalm-135/en.mp3" } };

/** What the website does with each request for the list, in turn; the last, from then on. */
let answers: ("list" | "503" | "drop" | "hang" | { v: 1; live: string[]; pulled: string[] })[] = [];
let asked = 0;
const events = new Map<string, Set<() => void>>();
const target = {
  addEventListener: (type: string, fn: () => void) => {
    if (!events.has(type)) events.set(type, new Set());
    events.get(type)!.add(fn);
  },
  removeEventListener: (type: string, fn: () => void) => void events.get(type)?.delete(fn),
};
const fire = (type: string) => [...(events.get(type) ?? [])].forEach((fn) => fn());

let live: typeof Live;
const availability = () => live.availabilityOf(live.liveListNow(), "psalm-135", psalm);
const pass = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  answers = ["list"];
  asked = 0;
  events.clear();
  vi.stubGlobal("window", target);
  vi.stubGlobal("document", { ...target, visibilityState: "visible" });
  vi.stubGlobal("fetch", (url: string, init?: { signal?: AbortSignal }) => {
    expect(url).toBe("/audio/chants/live.json");
    const answer = answers[Math.min(asked, answers.length - 1)];
    asked += 1;
    if (answer === "drop") return Promise.reject(new TypeError("Failed to fetch"));
    if (answer === "hang") return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    if (answer === "503") return Promise.resolve({ ok: false, json: async () => ({}) });
    return Promise.resolve({ ok: true, json: async () => (answer === "list" ? LIST : answer) });
  });
  live = await import("@/lib/chants/live");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a list that cannot be read at first", () => {
  it("is asked for again at once after a quick failure, and the reader is told nothing", async () => {
    answers = ["503", "list"];
    const stop = live.askForLiveList();
    await pass();
    // Still being checked: no "Not available now" for a failure of a moment.
    expect(availability()).toBe("checking");
    await pass(live.RETRY_AFTER_MS[0]);
    expect(availability()).toBe("playable");
    expect(asked).toBe(2);
    stop();
  });

  it("is had without leaving the screen, however long the website takes to come back", async () => {
    // This is the screen that stayed dim in 1.8.
    answers = ["503", "503", "503", "503", "list"];
    const stop = live.askForLiveList();
    await pass(live.RETRY_AFTER_MS[0]);
    expect(availability()).toBe("unavailable");
    await pass(live.RETRY_AFTER_MS[1] + live.RETRY_AFTER_MS[2] + live.RETRY_AFTER_MS[3]);
    expect(availability()).toBe("playable");
    stop();
  });

  it("says there is no connection when nothing comes back, and plays when one does", async () => {
    answers = ["drop", "drop", "list"];
    const stop = live.askForLiveList();
    await pass(live.RETRY_AFTER_MS[0]);
    expect(availability()).toBe("offline");
    await pass(live.RETRY_AFTER_MS[1]);
    expect(availability()).toBe("playable");
    stop();
  });

  it("gives a request that gets no answer eight seconds, says so, and asks again", async () => {
    answers = ["hang", "list"];
    const stop = live.askForLiveList();
    await pass(7900);
    expect(availability()).toBe("checking");
    await pass(200);
    // No answer in time is not a quick failure: the reader is told.
    expect(availability()).toBe("offline");
    await pass(live.RETRY_AFTER_MS[0]);
    expect(availability()).toBe("playable");
    stop();
  });

  it("keeps the reason on the screen while it asks again: nothing flickers", async () => {
    answers = ["drop"];
    const seen: string[] = [];
    const stop = live.askForLiveList();
    await pass(live.RETRY_AFTER_MS[0]);
    for (let i = 0; i < 6; i++) {
      await pass(live.RETRY_AFTER_MS[live.RETRY_AFTER_MS.length - 1]);
      seen.push(availability());
    }
    expect(new Set(seen)).toEqual(new Set(["offline"]));
    expect(asked).toBeGreaterThan(5);
    stop();
  });

  it("is asked for at once when the app comes back to the front or the phone comes back online", async () => {
    answers = ["drop", "drop", "drop", "list"];
    const stop = live.askForLiveList();
    await pass(live.RETRY_AFTER_MS[0] + live.RETRY_AFTER_MS[1]);
    expect(availability()).toBe("offline");
    const before = asked;
    fire("visibilitychange");
    await pass();
    expect(asked).toBe(before + 1);
    expect(availability()).toBe("playable");
    stop();
  });

  it("is asked for even when the phone says it is offline, which a web view can say wrongly", async () => {
    vi.stubGlobal("navigator", { onLine: false, userAgent: "a phone" });
    const stop = live.askForLiveList();
    await pass();
    expect(asked).toBe(1);
    expect(availability()).toBe("playable");
    stop();
  });

  it("stops asking when no screen needs it", async () => {
    answers = ["drop"];
    const stop = live.askForLiveList();
    await pass(live.RETRY_AFTER_MS[0]);
    stop();
    const before = asked;
    await pass(10 * 60_000);
    expect(asked).toBe(before);
    expect(events.get("online")?.size ?? 0).toBe(0);
    expect(events.get("visibilitychange")?.size ?? 0).toBe(0);
  });

  it("fails closed all the while: a streamed recording never plays before the list names it", async () => {
    answers = ["drop"];
    const stop = live.askForLiveList();
    for (let i = 0; i < 8; i++) {
      await pass(5000);
      expect(availability()).not.toBe("playable");
    }
    stop();
  });
});

describe("a list that was read", () => {
  it("is not asked for again by each screen while it is fresh", async () => {
    const one = live.askForLiveList();
    await pass();
    const two = live.askForLiveList();
    await pass(60_000);
    expect(asked).toBe(1);
    one();
    two();
  });

  it("is read again once it is five minutes old, so a takedown reaches an app left open", async () => {
    answers = ["list", { v: 1, live: [], pulled: ["psalm-135/en"] }];
    const stop = live.askForLiveList();
    await pass();
    expect(availability()).toBe("playable");
    await pass(live.FRESH_MS);
    // The reader comes back to the app, or opens another chant.
    fire("visibilitychange");
    await pass();
    expect(asked).toBe(2);
    expect(availability()).toBe("pulled");
    stop();
  });

  it("stands when a later read fails: what played goes on playing", async () => {
    answers = ["list", "503", "drop"];
    const stop = live.askForLiveList();
    await pass(live.FRESH_MS);
    fire("visibilitychange");
    await pass(60_000);
    expect(asked).toBeGreaterThan(1);
    expect(availability()).toBe("playable");
    stop();
  });
});
