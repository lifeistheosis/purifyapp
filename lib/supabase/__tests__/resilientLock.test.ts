import { afterEach, describe, expect, it, vi } from "vitest";

import { resilientNavigatorLock } from "../resilientLock";

// The wrapper delegates to supabase's navigatorLock; stub it per case.
const navigatorLock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  navigatorLock: (...args: unknown[]) => navigatorLock(...args),
}));

class FakeAcquireTimeout extends Error {
  isAcquireTimeout = true;
}

function withLocksApi() {
  vi.stubGlobal("navigator", { locks: {} });
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigatorLock.mockReset();
});

describe("resilientNavigatorLock", () => {
  it("runs the operation under the lock when acquisition succeeds", async () => {
    withLocksApi();
    navigatorLock.mockImplementation(
      (_name: string, _timeout: number, fn: () => Promise<unknown>) => fn(),
    );
    const result = await resilientNavigatorLock("lock:x", 5000, async () => 42);
    expect(result).toBe(42);
    expect(navigatorLock).toHaveBeenCalledTimes(1);
  });

  it("falls back to running WITHOUT the lock when acquisition times out (jammed tab)", async () => {
    withLocksApi();
    navigatorLock.mockRejectedValue(new FakeAcquireTimeout("jammed"));
    const fn = vi.fn().mockResolvedValue("ran-lockless");
    await expect(resilientNavigatorLock("lock:x", 5000, fn)).resolves.toBe(
      "ran-lockless",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("answers with the operation's own outcome, run once, when its lock is stolen while it runs (supabase's typed error)", async () => {
    // supabase-js 2.105: the holder whose lock another request steals gets
    // its typed timeout error while its operation runs on. The wrapper used
    // to run the operation a second time beside the first.
    withLocksApi();
    navigatorLock.mockImplementation(async (_name: string, _timeout: number, fn: () => Promise<unknown>) => {
      void fn();
      throw new FakeAcquireTimeout('Lock "lock:x" was released because another request stole it');
    });
    const fn = vi.fn().mockResolvedValue("its own outcome");
    await expect(resilientNavigatorLock("lock:x", 5000, fn)).resolves.toBe("its own outcome");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("answers with the operation's own outcome when the lock it took is stolen in turn (the raw AbortError)", async () => {
    // Three calls overlapping on a slow signal: the second steals from the
    // first, the third from the second, whose request then rejects with the
    // Web Locks API's own AbortError, which reached the page uncaught.
    withLocksApi();
    navigatorLock.mockImplementation(async (_name: string, _timeout: number, fn: () => Promise<unknown>) => {
      void fn();
      throw new DOMException("Lock broken by another request with the 'steal' option.", "AbortError");
    });
    const fn = vi.fn().mockResolvedValue("its own outcome");
    await expect(resilientNavigatorLock("lock:x", 5000, fn)).resolves.toBe("its own outcome");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes an \"only if free\" timeout (0) on as asked, so supabase's refresh tick skips a busy lock", async () => {
    withLocksApi();
    const busy = new FakeAcquireTimeout('Acquiring an exclusive Navigator LockManager lock "lock:x" immediately failed');
    navigatorLock.mockRejectedValue(busy);
    const fn = vi.fn();
    await expect(resilientNavigatorLock("lock:x", 0, fn)).rejects.toBe(busy);
    expect(fn).not.toHaveBeenCalled();
  });

  it("rethrows every non-timeout error from the locked operation", async () => {
    withLocksApi();
    navigatorLock.mockRejectedValue(new Error("real failure inside the lock"));
    const fn = vi.fn();
    await expect(resilientNavigatorLock("lock:x", 5000, fn)).rejects.toThrow(
      "real failure inside the lock",
    );
    expect(fn).not.toHaveBeenCalled();
  });

  it("caps every wait-forever acquireTimeout (undefined, -1, Infinity) to a real deadline", async () => {
    withLocksApi();
    const seen: unknown[] = [];
    navigatorLock.mockImplementation(
      (_name: string, timeout: number, fn: () => Promise<unknown>) => {
        seen.push(timeout);
        return fn();
      },
    );
    // GoTrueClient passes `undefined` to custom locks (observed live with
    // supabase.gotrue-js.locks.debug); navigatorLock treats it as "wait
    // forever", which is the jammed-tab outage itself. -1 and Infinity are
    // the documented/edge spellings of the same thing.
    await resilientNavigatorLock(
      "lock:x",
      undefined as unknown as number,
      async () => null,
    );
    await resilientNavigatorLock("lock:x", -1, async () => null);
    await resilientNavigatorLock("lock:x", Infinity, async () => null);
    expect(seen).toEqual([5000, 5000, 5000]);
  });

  it("runs directly when the Locks API is absent (older WebViews)", async () => {
    vi.stubGlobal("navigator", {});
    const result = await resilientNavigatorLock("lock:x", 5000, async () => "ok");
    expect(result).toBe("ok");
    expect(navigatorLock).not.toHaveBeenCalled();
  });
});
