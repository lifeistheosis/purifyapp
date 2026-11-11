import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What the app keeps of a campaign's thread as the server answers it
 * (lib/campaigns/client.ts, fetchThread).
 *
 * The client names each field it keeps, so an answer the server adds is not
 * the app's until it is named here. That is how the line "Tell me when
 * there is an update" was first lost: the server said whether a reader had
 * asked, the route's tests passed, and the screen never drew the line,
 * because this function dropped the answer on the way. A walk in a browser
 * found it; this file is so that a test does next time.
 *
 * What would go wrong if this broke: a reader who asked to be told of
 * updates could never see or change their choice.
 */

const state = vi.hoisted(() => ({ answer: {} as unknown, status: 200 }));

vi.mock("@/lib/api/client", () => ({
  apiFetch: async () => new Response(JSON.stringify(state.answer), { status: state.status, headers: { "content-type": "application/json" } }),
}));
vi.mock("@/lib/campaigns/flags", async (original) => ({ ...(await original<typeof import("@/lib/campaigns/flags")>()), campaignsInBuild: () => true }));

import { fetchThread } from "@/lib/campaigns/client";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const base = { updates: [], comments: [], commentsOpen: true, signedIn: true, canUpdate: false, canComment: true };

beforeEach(() => {
  state.answer = base;
  state.status = 200;
});
afterEach(() => vi.restoreAllMocks());

describe("a campaign's thread, as the app keeps it", () => {
  it("keeps whether this reader asked to be told of updates, yes or no, when the server says", async () => {
    state.answer = { ...base, tellMe: false };
    const off = await fetchThread(ID);
    expect(off.state === "ok" && off.thread.tellMe).toBe(false);
    expect(off.state === "ok" && "tellMe" in off.thread).toBe(true);
    state.answer = { ...base, tellMe: true };
    const on = await fetchThread(ID);
    expect(on.state === "ok" && on.thread.tellMe).toBe(true);
  });

  it("has no such answer when the server gave none, or gave something that is not a yes or a no", async () => {
    for (const answer of [base, { ...base, tellMe: null }, { ...base, tellMe: "yes" }, { ...base, tellMe: 1 }]) {
      state.answer = answer;
      const got = await fetchThread(ID);
      expect(got.state === "ok" && "tellMe" in got.thread, JSON.stringify(answer)).toBe(false);
    }
  });

  it("keeps what a reader may do as plain yes or no, and nothing the app has no name for", async () => {
    state.answer = { ...base, canUpdate: "yes", canComment: true, creator_id: "someone", count: 12 };
    const got = await fetchThread(ID);
    expect(got.state).toBe("ok");
    if (got.state !== "ok") return;
    expect(got.thread.canUpdate).toBe(false);
    expect(got.thread.canComment).toBe(true);
    expect(Object.keys(got.thread).sort()).toEqual(["canComment", "canUpdate", "comments", "commentsOpen", "signedIn", "updates"]);
  });

  it("says missing for a campaign that is not there, and an error for an answer that is not one", async () => {
    state.status = 404;
    expect((await fetchThread(ID)).state).toBe("missing");
    state.status = 500;
    expect((await fetchThread(ID)).state).toBe("error");
  });
});
