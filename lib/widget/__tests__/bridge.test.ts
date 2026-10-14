// The bridge is for the phone apps. A browser must not load the plugin, a
// value the widgets already have is not sent again, and nothing it does may
// ever reach the screen as an error. The why is in ../bridge.ts.

import { afterEach, describe, expect, it, vi } from "vitest";

type Entries = Record<string, string | null>;

/** A stand-in for the native plugin, keeping what each update was handed. */
function plugin(update: (entries: Entries) => Promise<unknown> = async () => ({ stored: 1 })) {
  const p = {
    loads: 0,
    calls: [] as Entries[],
    update: vi.fn(async ({ entries }: { entries: Entries }) => {
      p.calls.push(entries);
      return update(entries);
    }),
  };
  return p;
}

/** The bridge, loaded fresh: in the app or a browser, with or without the plugin. */
async function load(isNative: boolean, p: ReturnType<typeof plugin>, available = true) {
  vi.resetModules();
  vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => isNative }));
  vi.doMock("@capacitor/core", () => {
    p.loads += 1;
    return {
      Capacitor: { isPluginAvailable: (name: string) => available && name === "WidgetBridge" },
      registerPlugin: (name: string) => (name === "WidgetBridge" ? { update: p.update } : {}),
    };
  });
  return import("../bridge");
}

afterEach(() => {
  vi.doUnmock("@/lib/platform/native");
  vi.doUnmock("@capacitor/core");
});

describe("on the website", () => {
  it("does nothing, and never loads the plugin", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(false, p);
    await pushWidgetState({ calendarStyle: "new", labels: "{}" });
    expect(p.loads).toBe(0);
    expect(p.calls).toEqual([]);
  });
});

describe("in the apps", () => {
  it("hands the plugin the keys of the contract", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(true, p);
    await pushWidgetState({ calendarStyle: "old", streak: '{"count":3}', patron: null });
    expect(p.calls).toEqual([{ calendarStyle: "old", streak: '{"count":3}', patron: null }]);
  });

  it("sends nothing the widgets already have", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(true, p);
    await pushWidgetState({ calendarStyle: "new", labels: "{}", patron: null });
    await pushWidgetState({ calendarStyle: "new", labels: "{}", patron: null });
    await pushWidgetState({ calendarStyle: "old", labels: "{}", patron: null });
    expect(p.calls).toEqual([{ calendarStyle: "new", labels: "{}", patron: null }, { calendarStyle: "old" }]);
  });

  it("leaves alone a key it was not handed, or handed undefined", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(true, p);
    await pushWidgetState({ calendarStyle: "new", patron: undefined });
    expect(p.calls).toEqual([{ calendarStyle: "new" }]);
  });

  it("never hands over a key outside the contract", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(true, p);
    await pushWidgetState({ calendarStyle: "new", secret: "x" } as never);
    expect(p.calls).toEqual([{ calendarStyle: "new" }]);
  });

  it("forgets a value the app no longer has", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(true, p);
    await pushWidgetState({ patron: '{"slug":"nicholas-the-wonderworker"}' });
    await pushWidgetState({ patron: null });
    expect(p.calls).toEqual([{ patron: '{"slug":"nicholas-the-wonderworker"}' }, { patron: null }]);
  });

  it("sends the pushes in the order they were asked for", async () => {
    let release: () => void = () => {};
    const first = new Promise<void>((resolve) => (release = resolve));
    let n = 0;
    const p = plugin(async () => {
      n += 1;
      if (n === 1) await first;
      return { stored: 1 };
    });
    const { pushWidgetState } = await load(true, p);
    const a = pushWidgetState({ calendarStyle: "new" });
    const b = pushWidgetState({ calendarStyle: "old" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(p.calls).toEqual([{ calendarStyle: "new" }]);
    release();
    await Promise.all([a, b]);
    expect(p.calls).toEqual([{ calendarStyle: "new" }, { calendarStyle: "old" }]);
  });
});

describe("when something goes wrong", () => {
  it("does nothing in a shell without the plugin, and does not throw", async () => {
    const p = plugin();
    const { pushWidgetState } = await load(true, p, false);
    await expect(pushWidgetState({ calendarStyle: "new" })).resolves.toBeUndefined();
    expect(p.calls).toEqual([]);
  });

  it("never throws, and sends again what the plugin did not take", async () => {
    let fail = true;
    const p = plugin(async () => {
      if (fail) throw new Error("the phone said no");
      return { stored: 1 };
    });
    const { pushWidgetState } = await load(true, p);
    await expect(pushWidgetState({ calendarStyle: "new" })).resolves.toBeUndefined();
    fail = false;
    await pushWidgetState({ calendarStyle: "new" });
    expect(p.calls).toEqual([{ calendarStyle: "new" }, { calendarStyle: "new" }]);
    // And a push after a failure is still sent.
    await pushWidgetState({ calendarStyle: "old" });
    expect(p.calls.at(-1)).toEqual({ calendarStyle: "old" });
  });

  it("keeps going when the plugin's code cannot be loaded", async () => {
    vi.resetModules();
    vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => true }));
    vi.doMock("@capacitor/core", () => {
      throw new Error("the chunk did not load");
    });
    const { pushWidgetState } = await import("../bridge");
    await expect(pushWidgetState({ calendarStyle: "new" })).resolves.toBeUndefined();
  });
});
