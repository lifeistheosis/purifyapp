// The downloaded Bibles (1.9): a Bible downloaded book by book to the phone,
// checked before it is kept, picked up where a download stopped, taken off
// again, and a book read for a page from the phone in the apps and from the
// website in a browser.

import fs from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

const { bibleDownload, downloadBible, readBibleBook, removeBible, savedBibles, resetBibleStoreForTests, bookUrl } = await import("@/lib/bible/downloads/store");
const { readBibleChoice, writeBibleChoice } = await import("@/lib/bible/downloads/choice");
const { SITE_URL } = await import("@/lib/site");

const ROOT = path.resolve(__dirname, "../../../..");
const RU = "ru-synodal" as const;

/** The phone's data folder. */
const files = new Map<string, string>();
const dirs: string[] = [];
/** Folders on the "phone": a save into a missing folder makes it, as the plugin's own code in a browser does, and two at once race. */
const folders = new Set<string>();
const tick = () => new Promise((r) => setTimeout(r, 0));
async function mkdir({ path: p }: { path: string }) {
  await tick();
  if (folders.has(p)) throw new Error("Current directory does already exist.");
  folders.add(p);
}
const plugin = {
  Directory: { Data: "DATA", LibraryNoCloud: "LIBRARY_NO_CLOUD" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    mkdir,
    writeFile: async ({ path: p, data, directory, recursive }: { path: string; data: string; directory: string; recursive?: boolean }) => {
      dirs.push(directory);
      const folder = p.slice(0, p.lastIndexOf("/"));
      if (!folders.has(folder)) {
        if (!recursive) throw new Error("Parent directory must exist");
        await mkdir({ path: folder });
      }
      files.set(p, data);
      return { uri: `file:///data/${p}` };
    },
    readFile: async ({ path: p }: { path: string }) => {
      const data = files.get(p);
      if (data === undefined) throw new Error("File does not exist");
      return { data };
    },
    rmdir: async ({ path: p }: { path: string }) => {
      for (const k of [...files.keys()]) if (k.startsWith(`${p}/`)) files.delete(k);
    },
  },
} as unknown as typeof import("@capacitor/filesystem");

/** The website: public/bibles as it is, asked for by its address. */
const asked: { url: string; cache?: RequestCache }[] = [];
function website(change?: (url: string, body: string) => string | null) {
  return async (url: string, init?: RequestInit) => {
    asked.push({ url, cache: init?.cache });
    if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
    const rel = url.replace(SITE_URL, "");
    const file = path.join(ROOT, "public", rel);
    if (!rel.startsWith("/bibles/") || !fs.existsSync(file)) return new Response("not found", { status: 404 });
    const body = fs.readFileSync(file, "utf8");
    const out = change ? change(url, body) : body;
    if (out === null) throw new TypeError("Failed to fetch");
    return new Response(out, { status: 200 });
  };
}

beforeEach(() => {
  store.clear();
  files.clear();
  dirs.length = 0;
  folders.clear();
  asked.length = 0;
  resetBibleStoreForTests();
});

describe("downloading a Bible", () => {
  it("asks the website for its list and every book, checks each, keeps each on the phone, and lists the Bible", async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public/bibles", RU, "index.json"), "utf8"));
    const result = await downloadBible(RU, { fetcher: website(), plugin, native: true });
    expect(result).toBe("saved");
    expect(asked[0].url).toBe(`${SITE_URL}/bibles/${RU}/index.json`);
    expect(asked.filter((a) => a.url.endsWith(".json") && !a.url.endsWith("index.json"))).toHaveLength(78);
    expect(files.size).toBe(78);
    expect(files.get(`bibles/${RU}/john.json`)).toBe(fs.readFileSync(path.join(ROOT, "public/bibles", RU, "john.json"), "utf8"));
    expect(savedBibles()[RU]).toMatchObject({ version: manifest.version, bytes: manifest.bytes });
    expect(savedBibles()[RU].books).toHaveLength(78);
    expect(bibleDownload(RU)).toBeNull();
    // Kept out of an iPhone's iCloud backup, as Apple asks of what can be downloaded again.
    expect(new Set(dirs)).toEqual(new Set(["LIBRARY_NO_CLOUD"]));
  });

  it("keeps nothing it cannot check, and asks the website itself before giving up on a book", async () => {
    // A cache answering with another version's John every time.
    const stale = website((url, body) => (url.endsWith("/john.json") ? body.replace(/"hash":"[0-9a-f]+"/, '"hash":"000000000000"') : body));
    expect(await downloadBible(RU, { fetcher: stale, plugin, native: true })).toBe("failed");
    expect(asked.filter((a) => a.url.endsWith("/john.json")).map((a) => a.cache)).toEqual(["default", "reload"]);
    expect(savedBibles()[RU]).toBeUndefined();
    expect(files.has(`bibles/${RU}/john.json`)).toBe(false);
  });

  it("begins again where a download stopped, and does not download a kept book twice", async () => {
    let cut = true;
    const flaky = website((url, body) => (cut && url.endsWith("/revelation.json") ? null : body));
    expect(await downloadBible(RU, { fetcher: flaky, plugin, native: true })).toBe("failed");
    expect(bibleDownload(RU)).toEqual({ state: "failed", reason: "offline" });
    const kept = files.size;
    expect(kept).toBeGreaterThan(0);
    expect(savedBibles()[RU]).toBeUndefined();
    cut = false;
    asked.length = 0;
    expect(await downloadBible(RU, { fetcher: flaky, plugin, native: true })).toBe("saved");
    const books = asked.filter((a) => !a.url.endsWith("index.json"));
    expect(books.length).toBe(78 - kept);
    expect(files.size).toBe(78);
  });

  it("makes the Bible's folder once, so three books saved at a time never race to make it", async () => {
    // Without it the second save into a new folder fails, as the plugin's code in a browser fails.
    expect(await downloadBible(RU, { fetcher: website(), plugin, native: true })).toBe("saved");
    expect(files.size).toBe(78);
  });

  it("tries a failed save once more, and says a save that failed is a save, not a full phone", async () => {
    let failures = 1;
    const once = { ...plugin, Filesystem: { ...plugin.Filesystem, writeFile: async (o: Parameters<typeof plugin.Filesystem.writeFile>[0]) => {
      if (o.path.endsWith("/john.json") && failures-- > 0) throw new Error("I/O error");
      return plugin.Filesystem.writeFile(o);
    } } } as typeof plugin;
    expect(await downloadBible(RU, { fetcher: website(), plugin: once, native: true })).toBe("saved");
    resetBibleStoreForTests();
    store.clear();
    files.clear();
    folders.clear();
    const never = { ...plugin, Filesystem: { ...plugin.Filesystem, writeFile: async (o: Parameters<typeof plugin.Filesystem.writeFile>[0]) => {
      if (o.path.endsWith("/john.json")) throw new Error("I/O error");
      return plugin.Filesystem.writeFile(o);
    } } } as typeof plugin;
    expect(await downloadBible(RU, { fetcher: website(), plugin: never, native: true })).toBe("failed");
    expect(bibleDownload(RU)).toEqual({ state: "failed", reason: "save" });
  });

  it("says a full phone is a full phone", async () => {
    const full = { ...plugin, Filesystem: { ...plugin.Filesystem, writeFile: async () => { throw new Error("No space left on device"); } } } as typeof plugin;
    expect(await downloadBible(RU, { fetcher: website(), plugin: full, native: true })).toBe("failed");
    expect(bibleDownload(RU)).toEqual({ state: "failed", reason: "space" });
  });
});

describe("taking a Bible off the phone", () => {
  it("removes its books and its listing, and a reader who read in it goes back to the English", async () => {
    await downloadBible(RU, { fetcher: website(), plugin, native: true });
    writeBibleChoice(RU);
    await removeBible(RU, plugin);
    expect(files.size).toBe(0);
    expect(savedBibles()[RU]).toBeUndefined();
    expect(readBibleChoice()).toBeNull();
  });

  it("tapped while it downloads, stops it and waits for it, so no book is saved after the folder has gone", async () => {
    // A phone that takes a moment to write each book: Remove is tapped while
    // three are being written, and they land after it unless it waits.
    let writing = 0;
    const slowPhone = {
      ...plugin,
      Filesystem: {
        ...plugin.Filesystem,
        writeFile: async (o: Parameters<typeof plugin.Filesystem.writeFile>[0]) => {
          writing += 1;
          await new Promise((r) => setTimeout(r, 20));
          writing -= 1;
          return plugin.Filesystem.writeFile(o);
        },
      },
    } as typeof plugin;
    const going = downloadBible(RU, { fetcher: website(), plugin: slowPhone, native: true });
    // Into the download, with books written and three being written now.
    for (let i = 0; i < 200 && (files.size === 0 || writing === 0); i++) await new Promise((r) => setTimeout(r, 2));
    expect(files.size).toBeGreaterThan(0);
    expect(writing).toBeGreaterThan(0);
    await removeBible(RU, slowPhone);
    expect(await going).toBe("cancelled");
    // Nothing comes after: wait as long as a few more books would take.
    await new Promise((r) => setTimeout(r, 60));
    expect(files.size).toBe(0);
    expect(savedBibles()[RU]).toBeUndefined();
    expect(bibleDownload(RU)).toBeNull();
  });
});

describe("reading a book for a page", () => {
  it("in the apps, from the phone, and only once the Bible is on it", async () => {
    expect(await readBibleBook(RU, "john", { native: true, plugin })).toBeNull();
    await downloadBible(RU, { fetcher: website(), plugin, native: true });
    const john = await readBibleBook(RU, "john", { native: true, plugin });
    expect(john?.chapters[0][0]).toEqual([1, "В начале было Слово, и Слово было у Бога, и Слово было Бог."]);
  });

  it("on the website, from the website's own folder, once while it is read", async () => {
    const fetcher = website();
    const a = await readBibleBook(RU, "psalms", { native: false, fetcher });
    const b = await readBibleBook(RU, "psalms", { native: false, fetcher });
    expect(a).toBe(b);
    expect(asked.map((x) => x.url)).toEqual([`/bibles/${RU}/psalms.json`]);
    expect(bookUrl(RU, "psalms", true)).toBe(`${SITE_URL}/bibles/${RU}/psalms.json`);
  });

  it("asks again for a book it could not have", async () => {
    let offline = true;
    const fetcher = website((_, body) => (offline ? null : body));
    expect(await readBibleBook(RU, "mark", { native: false, fetcher })).toBeNull();
    offline = false;
    expect((await readBibleBook(RU, "mark", { native: false, fetcher }))?.book).toBe("mark");
  });
});
