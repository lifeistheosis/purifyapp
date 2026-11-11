// A stolen auth lock, end to end (1.9, Fable Themes on a slow signal,
// 2026-11-11: an uncaught "Lock broken by another request with the 'steal'
// option"). supabase-js's own navigatorLock (2.105) steals a lock it has
// waited on past its timeout, and the Web Locks API then rejects the holder's
// request while the holder's work runs on. Three calls overlapping on a slow
// signal show both faults the wrapper had: the first holder's work was run a
// second time beside itself, and the second's request, stolen in turn,
// answered with the raw AbortError.
//
// What would go wrong if this broke: a session read, a code exchange after a
// sign-in or a token refresh that answers with an error while its work goes
// on and lands; the same work run twice at once; or an uncaught error on the
// page. The fake below keeps the Web Locks API's rules that matter here: one
// holder at a time, a waiting request that gives up on its signal, a steal
// that takes the lock at once and rejects the holder's request while the
// holder's callback runs on, and "if available" that answers null when held.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resilientNavigatorLock } from "../resilientLock";

type Callback = (lock: { name: string } | null) => Promise<unknown>;
type Holder = { reject: (e: unknown) => void };

class FakeLocks {
  private holder: Holder | null = null;
  private waiting: { grant: () => void; drop: () => void }[] = [];

  request(name: string, options: { mode?: string; ifAvailable?: boolean; signal?: AbortSignal; steal?: boolean }, callback: Callback): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const grant = () => {
        const me: Holder = { reject };
        this.holder = me;
        callback({ name }).then(
          (value) => {
            this.release(me);
            resolve(value);
          },
          (error) => {
            this.release(me);
            reject(error);
          },
        );
      };
      if (options.steal) {
        const old = this.holder;
        this.holder = null;
        old?.reject(new DOMException("Lock broken by another request with the 'steal' option.", "AbortError"));
        grant();
        return;
      }
      if (!this.holder) {
        grant();
        return;
      }
      if (options.ifAvailable) {
        callback(null).then(resolve, reject);
        return;
      }
      const entry = {
        grant,
        drop: () => reject(new DOMException("The request was aborted.", "AbortError")),
      };
      this.waiting.push(entry);
      options.signal?.addEventListener("abort", () => {
        const at = this.waiting.indexOf(entry);
        if (at >= 0) {
          this.waiting.splice(at, 1);
          entry.drop();
        }
      });
    });
  }

  private release(me: Holder) {
    if (this.holder !== me) return;
    this.holder = null;
    this.waiting.shift()?.grant();
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  vi.stubGlobal("navigator", { locks: new FakeLocks() });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a stolen auth lock, with supabase's own navigatorLock", () => {
  it("lets each call's work run once and answer with its own outcome, though three overlap and the lock is stolen twice", async () => {
    const runs = { a: 0, b: 0, c: 0 };
    const work = (key: keyof typeof runs, ms: number) => async () => {
      runs[key] += 1;
      await wait(ms);
      return key;
    };
    // A holds the lock on a slow call; B gives up waiting after 30ms and steals
    // it; C gives up waiting on B and steals it from B in turn.
    const a = resilientNavigatorLock("lock:test", 30, work("a", 150));
    await wait(5);
    const b = resilientNavigatorLock("lock:test", 30, work("b", 150));
    await wait(45);
    const c = resilientNavigatorLock("lock:test", 30, work("c", 60));
    const settled = await Promise.allSettled([a, b, c]);
    expect(settled).toEqual([
      { status: "fulfilled", value: "a" },
      { status: "fulfilled", value: "b" },
      { status: "fulfilled", value: "c" },
    ]);
    expect(runs).toEqual({ a: 1, b: 1, c: 1 });
  });

  it("answers with the work's own failure when its lock was taken while it ran", async () => {
    const failing = resilientNavigatorLock("lock:test", 30, async () => {
      await wait(120);
      throw new Error("the refresh itself failed");
    });
    await wait(5);
    const thief = resilientNavigatorLock("lock:test", 30, async () => "thief");
    await expect(failing).rejects.toThrow("the refresh itself failed");
    await expect(thief).resolves.toBe("thief");
  });

  it("tells supabase's refresh tick the lock is busy, so the tick skips instead of running beside the holder", async () => {
    let tickRan = false;
    const holder = resilientNavigatorLock("lock:test", 30, () => wait(80).then(() => "held"));
    await wait(5);
    await expect(
      resilientNavigatorLock("lock:test", 0, async () => {
        tickRan = true;
      }),
    ).rejects.toMatchObject({ isAcquireTimeout: true });
    expect(tickRan).toBe(false);
    await expect(holder).resolves.toBe("held");
  });
});
