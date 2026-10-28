import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Now Playing's two views (1.8, the owner's pick of 2026-10-27, round 8):
// the cover and the words, switched, and the one the reader last chose kept
// on the device, under 1.7's key so a reader who had the captions on opens
// on the words.

const KEY = "purify:player.captions";

function storage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
  };
}

async function fresh(store: ReturnType<typeof storage> | { getItem: () => never; setItem: () => never }) {
  vi.stubGlobal("window", { localStorage: store });
  return import("../sheet");
}

describe("Now Playing's view", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("opens on the cover for a reader who never chose", async () => {
    const sheet = await fresh(storage());
    sheet.openNowPlaying();
    expect(sheet.getNowPlaying()).toEqual({ open: true, view: "cover" });
  });

  it("keeps the reader's choice on the device", async () => {
    const store = storage();
    const sheet = await fresh(store);
    sheet.openNowPlaying();
    sheet.setPlayerView("words");
    expect(sheet.getNowPlaying().view).toBe("words");
    expect(store.map.get(KEY)).toBe("1");
    sheet.setPlayerView("cover");
    expect(store.map.get(KEY)).toBe("0");
  });

  it("opens on the words for a reader who chose them before, 1.7's captions included", async () => {
    const sheet = await fresh(storage({ [KEY]: "1" }));
    sheet.openNowPlaying();
    expect(sheet.getNowPlaying().view).toBe("words");
  });

  it("opens on the view a caller asks for this once, without changing the reader's choice", async () => {
    const store = storage({ [KEY]: "0" });
    const sheet = await fresh(store);
    sheet.openNowPlaying({ view: "words" });
    expect(sheet.getNowPlaying().view).toBe("words");
    expect(store.map.get(KEY)).toBe("0");
    sheet.closeNowPlaying();
    expect(sheet.getNowPlaying()).toEqual({ open: false, view: "words" });
  });

  it("lasts the session where the device keeps nothing (a private window)", async () => {
    const shut = {
      getItem: (): never => {
        throw new Error("denied");
      },
      setItem: (): never => {
        throw new Error("denied");
      },
    };
    const sheet = await fresh(shut);
    sheet.openNowPlaying();
    expect(sheet.getNowPlaying().view).toBe("cover");
    expect(() => sheet.setPlayerView("words")).not.toThrow();
    expect(sheet.getNowPlaying().view).toBe("words");
  });
});
