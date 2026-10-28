// Offline listening for Plus (1.8): a book's readings saved on the phone, the
// player choosing the saved copy, and nothing kept that is not really there.

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
const files = new Map<string, string>();

Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    Capacitor: { convertFileSrc: (u: string) => u.replace("file:///data/", "https://localhost/_capacitor_file_/data/") },
  },
});

const plugin = {
  Directory: { Data: "DATA" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    writeFile: async ({ path }: { path: string; data: string }) => {
      files.set(path, "x");
      return { uri: `file:///data/app/files/${path}` };
    },
    rmdir: async ({ path }: { path: string }) => {
      for (const k of [...files.keys()]) if (k.startsWith(path)) files.delete(k);
    },
    stat: async ({ path }: { path: string }) => {
      if (!files.has(path)) throw new Error("no such file");
      return {};
    },
  },
} as unknown as typeof import("@capacitor/filesystem");

const fetchMock = vi.fn(async (url: string) => {
  if (url.includes("/9.")) return new Response("", { status: 404 });
  return url.endsWith(".mp3") ? new Response(new Uint8Array(1500)) : new Response('{"verses":[]}');
});
vi.stubGlobal("fetch", fetchMock);

const { checkSaved, removeBook, saveChapters, savedBytes, savedChapters, savedSrc } = await import("../offline");
const { readAloudSrc } = await import("../chapters");

const urls = (book: string) => (chapter: number) => ({
  mp3: `https://purifyapp.net/audio/read/${book}/${chapter}.mp3`,
  json: `https://purifyapp.net/audio/read/${book}/${chapter}.json`,
});

beforeEach(() => {
  store.clear();
  files.clear();
});

describe("saving a book", () => {
  it("keeps both files of each chapter and plays the saved copy from then on", async () => {
    const seen: string[] = [];
    const result = await saveChapters("jude", [1], urls("jude"), (d, t) => seen.push(`${d}/${t}`), plugin);
    expect(result).toEqual({ saved: 1, failed: 0 });
    expect(seen).toEqual(["1/1"]);
    expect([...files.keys()].sort()).toEqual(["audio/read/jude/1.json", "audio/read/jude/1.mp3"]);
    expect(savedSrc("jude", 1)).toBe("https://localhost/_capacitor_file_/data/app/files/audio/read/jude/1.mp3");
    expect(savedSrc("jude", 1, "json")).toBe("https://localhost/_capacitor_file_/data/app/files/audio/read/jude/1.json");
    expect(savedBytes()).toBe(1500);
    expect(readAloudSrc("jude", 1, true)).toBe(savedSrc("jude", 1));
  });

  it("leaves a chapter it cannot get to stream, and keeps the rest", async () => {
    const result = await saveChapters("mark", [8, 9, 10], urls("mark"), undefined, plugin);
    expect(result).toEqual({ saved: 2, failed: 1 });
    expect(Object.keys(savedChapters()).sort()).toEqual(["mark/10", "mark/8"]);
    expect(savedSrc("mark", 9)).toBeNull();
  });

  it("still streams on the website, saved or not", async () => {
    await saveChapters("jude", [1], urls("jude"), undefined, plugin);
    expect(readAloudSrc("jude", 1, false)).toBe("https://audio.purifyapp.net/read/jude/1.mp3");
  });
});

describe("taking it off again", () => {
  it("removes one book's files and list, and no other's", async () => {
    await saveChapters("jude", [1], urls("jude"), undefined, plugin);
    await saveChapters("mark", [8], urls("mark"), undefined, plugin);
    await removeBook("jude", plugin);
    expect(Object.keys(savedChapters())).toEqual(["mark/8"]);
    expect([...files.keys()].some((k) => k.includes("jude"))).toBe(false);
  });

  it("drops a chapter from the list when its recording is gone from the phone", async () => {
    await saveChapters("mark", [8, 10], urls("mark"), undefined, plugin);
    files.delete("audio/read/mark/10.mp3");
    await checkSaved(plugin);
    expect(Object.keys(savedChapters())).toEqual(["mark/8"]);
  });
});
