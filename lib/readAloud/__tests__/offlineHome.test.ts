// Offline recordings kept out of the iPhone's iCloud backup (1.9, his yes to
// the sheet's 7, "just do the safer route"): saved in LibraryNoCloud from now
// on, and what a reader saved before moved there from Data once, the list's
// addresses with it, nothing lost on the way.

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

/** A phone's files: each folder a root, each file "<folder>:<path>". */
function phone(roots: Record<"DATA" | "LIBRARY_NO_CLOUD", string>, failMove: (path: string) => boolean = () => false) {
  const files = new Set<string>();
  const where = (directory: string, path: string) => `${roots[directory as keyof typeof roots]}/${path}`;
  const renames: string[] = [];
  const plugin = {
    Directory: { Data: "DATA", LibraryNoCloud: "LIBRARY_NO_CLOUD" },
    Encoding: { UTF8: "utf8" },
    Filesystem: {
      getUri: async ({ path, directory }: { path: string; directory: string }) => ({ uri: `file://${where(directory, path)}` }),
      writeFile: async ({ path, directory }: { path: string; directory: string }) => {
        files.add(where(directory, path));
        return { uri: `file://${where(directory, path)}` };
      },
      mkdir: async () => {},
      rename: async ({ from, directory, to, toDirectory }: { from: string; directory: string; to: string; toDirectory: string }) => {
        renames.push(from);
        if (failMove(from)) throw new Error("the phone said no");
        if (!files.has(where(directory, from))) throw new Error("no such file");
        files.delete(where(directory, from));
        files.add(where(toDirectory, to));
      },
      stat: async ({ path, directory }: { path: string; directory: string }) => {
        if (!files.has(where(directory, path))) throw new Error("no such file");
        return {};
      },
      deleteFile: async ({ path, directory }: { path: string; directory: string }) => void files.delete(where(directory, path)),
      rmdir: async ({ path, directory }: { path: string; directory: string }) => {
        for (const f of [...files]) if (f.startsWith(where(directory, path))) files.delete(f);
      },
    },
  } as unknown as typeof import("@capacitor/filesystem");
  return { plugin, files, renames, where };
}

const IPHONE = { DATA: "/app/Documents", LIBRARY_NO_CLOUD: "/app/Library/NoCloud" };
const ANDROID = { DATA: "/data/app/files", LIBRARY_NO_CLOUD: "/data/app/files" };

/** Two chapters saved before 1.9, in Data, listed with Data's addresses. */
function savedBefore(p: ReturnType<typeof phone>) {
  const list: Record<string, { mp3: string; json: string; bytes: number }> = {};
  for (const key of ["jude/1", "mark/8"]) {
    for (const ext of ["mp3", "json"]) p.files.add(p.where("DATA", `audio/read/${key}.${ext}`));
    list[key] = { mp3: `file://${p.where("DATA", `audio/read/${key}.mp3`)}`, json: `file://${p.where("DATA", `audio/read/${key}.json`)}`, bytes: 1500 };
  }
  store.set("purify:readAloud.saved", JSON.stringify(list));
}

const saved = () => JSON.parse(store.get("purify:readAloud.saved") ?? "{}") as Record<string, { mp3: string; json: string; bytes: number }>;

vi.stubGlobal(
  "fetch",
  vi.fn(async (url: string) => (url.endsWith(".mp3") ? new Response(new Uint8Array(10)) : new Response("{}"))),
);
const { checkSaved, moveSavedHome, saveChapters } = await import("../offline");

beforeEach(() => store.clear());

describe("on an iPhone, the recordings leave the iCloud-backed folder", () => {
  it("saves a new chapter in LibraryNoCloud", async () => {
    const p = phone(IPHONE);
    await saveChapters("jude", [1], (c) => ({ mp3: `https://x/${c}.mp3`, json: `https://x/${c}.json` }), undefined, p.plugin);
    expect([...p.files].sort()).toEqual(["/app/Library/NoCloud/audio/read/jude/1.json", "/app/Library/NoCloud/audio/read/jude/1.mp3"]);
  });

  it("moves what was saved before, once, with the list's addresses", async () => {
    const p = phone(IPHONE);
    savedBefore(p);
    await moveSavedHome(p.plugin);
    expect([...p.files].every((f) => f.startsWith("/app/Library/NoCloud/"))).toBe(true);
    expect(p.files.size).toBe(4);
    expect(saved()["jude/1"]).toEqual({ mp3: "file:///app/Library/NoCloud/audio/read/jude/1.mp3", json: "file:///app/Library/NoCloud/audio/read/jude/1.json", bytes: 1500 });
    expect(store.get("purify:readAloud.home")).toBe("1");
    const asked = p.renames.length;
    await moveSavedHome(p.plugin);
    expect(p.renames.length).toBe(asked);
  });

  it("keeps a chapter that would not move where it was, playable and listed, and moves it next time", async () => {
    let refuse = true;
    const p = phone(IPHONE, (path) => refuse && path === "audio/read/mark/8.mp3");
    savedBefore(p);
    await checkSaved(p.plugin);
    expect(store.get("purify:readAloud.home")).toBeUndefined();
    expect(Object.keys(saved()).sort()).toEqual(["jude/1", "mark/8"]);
    expect(saved()["jude/1"].mp3).toContain("/Library/NoCloud/");
    expect(saved()["mark/8"].mp3).toBe("file:///app/Documents/audio/read/mark/8.mp3");
    refuse = false;
    await checkSaved(p.plugin);
    expect(saved()["mark/8"].mp3).toBe("file:///app/Library/NoCloud/audio/read/mark/8.mp3");
    expect(store.get("purify:readAloud.home")).toBe("1");
  });
});

describe("on Android, where the two folders are one", () => {
  it("moves nothing and keeps the addresses", async () => {
    const p = phone(ANDROID);
    savedBefore(p);
    const before = saved();
    await moveSavedHome(p.plugin);
    expect(p.renames).toEqual([]);
    expect(saved()).toEqual(before);
    expect(store.get("purify:readAloud.home")).toBe("1");
  });
});
