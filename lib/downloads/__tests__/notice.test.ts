// A download told to the phone (1.9, build 95 note 23): each change of state
// at once, its progress a whole percent at a time and not more than once a
// second, a heartbeat for a slow one, one number for each download, the
// first download asking once whether Purify may notify (in Purify's own words
// first, the phone's prompt only after a yes: his call, 2026-11-13 about
// 18:53 UTC), and nothing at all where the app's own plugin is not.

import { beforeEach, describe, expect, it } from "vitest";

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  },
});

const { tellPhone, clearPhone, askOnceToNotify, onAskToNotify, noticeId, resetNoticeForTests, HEARTBEAT_MS, STEP_MS, ASK_AT_FIRST_DOWNLOAD } = await import("@/lib/downloads/notice");

type Posted = { id: number; title: string; text: string; share: number; state: string };
const posted: Posted[] = [];
const cleared: number[] = [];
const phone = {
  post: async (o: Posted) => void posted.push(o),
  clear: async (o: { id: number }) => void cleared.push(o.id),
};

beforeEach(() => {
  store.clear();
  posted.length = 0;
  cleared.length = 0;
  resetNoticeForTests({ plugin: phone });
});

const d = (state: "running" | "waiting" | "done" | "failed", share: number) => ({ key: "bible:ru-synodal", state, share });

describe("telling the phone", () => {
  it("tells each change of state at once, and progress a whole percent at a time, not more than once a second", async () => {
    const t0 = 1_000_000;
    expect(await tellPhone(d("running", 0), "Синодальный", "Downloading, 0%", t0)).toBe(true);
    expect(await tellPhone(d("running", 0.004), "Синодальный", "Downloading, 0%", t0 + 2000)).toBe(false);
    expect(await tellPhone(d("running", 0.2), "Синодальный", "Downloading, 20%", t0 + 300)).toBe(false);
    expect(await tellPhone(d("running", 0.2), "Синодальный", "Downloading, 20%", t0 + STEP_MS)).toBe(true);
    expect(await tellPhone(d("done", 1), "Синодальный", "Downloaded", t0 + STEP_MS + 1)).toBe(true);
    expect(await tellPhone(d("done", 1), "Синодальный", "Downloaded", t0 + STEP_MS + 5000)).toBe(false);
    expect(posted.map((p) => [p.state, p.text])).toEqual([
      ["running", "Downloading, 0%"],
      ["running", "Downloading, 20%"],
      ["done", "Downloaded"],
    ]);
  });

  it("tells a slow download again within a minute, so the phone never clears it as stale", async () => {
    const t0 = 5_000_000;
    await tellPhone(d("running", 0.5), "Luke", "Saving 12 of 24", t0);
    expect(await tellPhone(d("running", 0.5), "Luke", "Saving 12 of 24", t0 + HEARTBEAT_MS - 1)).toBe(false);
    expect(await tellPhone(d("running", 0.5), "Luke", "Saving 12 of 24", t0 + HEARTBEAT_MS)).toBe(true);
    // The phone's side clears an unrefreshed notice after 150 seconds: more than two beats.
    expect(HEARTBEAT_MS * 2).toBeLessThan(150_000);
  });

  it("gives each download one number, always the same, and takes its notice away when it is let go", async () => {
    expect(noticeId("bible:ru-synodal")).toBe(noticeId("bible:ru-synodal"));
    expect(noticeId("bible:ru-synodal")).not.toBe(noticeId("book:luke"));
    await clearPhone("bible:ru-synodal");
    expect(cleared).toEqual([noticeId("bible:ru-synodal")]);
  });

  it("tells nothing where the app's own plugin is not (the website, a shell built before it)", async () => {
    resetNoticeForTests({ plugin: null });
    expect(await tellPhone(d("running", 0.1), "x", "y", 1)).toBe(false);
    expect(posted).toEqual([]);
  });
});

describe("asking whether Purify may notify", () => {
  /** The phone's prompt as a stand-in, with what was asked, in order. */
  function phoneAnswering(first: string) {
    const said: string[] = [];
    let answer = first;
    resetNoticeForTests({
      plugin: phone,
      permissions: { check: async () => answer, request: async () => (said.push("phone"), (answer = "granted")) },
    });
    return said;
  }

  it("asks in Purify's own words first, and raises the phone's prompt only after a yes, once", async () => {
    expect(ASK_AT_FIRST_DOWNLOAD).toBe(true);
    const said = phoneAnswering("prompt");
    onAskToNotify(async () => (said.push("purify"), true));
    await askOnceToNotify();
    await askOnceToNotify();
    expect(said).toEqual(["purify", "phone"]);
  });

  it("keeps a not now, and never raises the phone's prompt for it", async () => {
    const said = phoneAnswering("prompt");
    onAskToNotify(async () => (said.push("purify"), false));
    await askOnceToNotify();
    await askOnceToNotify();
    expect(said).toEqual(["purify"]);
  });

  it("never raises the phone's prompt when Purify cannot ask in its own words, and asks once it can", async () => {
    const said = phoneAnswering("prompt");
    await askOnceToNotify();
    expect(said).toEqual([]);
    const stop = onAskToNotify(async () => (said.push("purify"), true));
    await askOnceToNotify();
    expect(said).toEqual(["purify", "phone"]);
    stop();
  });

  it("asks once when two downloads begin together", async () => {
    const said = phoneAnswering("prompt");
    let answer: (yes: boolean) => void = () => {};
    onAskToNotify(() => (said.push("purify"), new Promise<boolean>((r) => (answer = r))));
    const both = Promise.all([askOnceToNotify(), askOnceToNotify()]);
    await new Promise((r) => setTimeout(r, 0));
    answer(true);
    await both;
    expect(said).toEqual(["purify", "phone"]);
  });

  it("never asks when the reader already answered the phone, either way", async () => {
    for (const first of ["granted", "denied", "prompt-with-rationale"]) {
      store.clear();
      const said = phoneAnswering(first);
      onAskToNotify(async () => (said.push("purify"), true));
      await askOnceToNotify();
      expect(said, first).toEqual([]);
    }
  });
});
