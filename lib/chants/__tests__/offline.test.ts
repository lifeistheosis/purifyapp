// A chant kept on the phone (1.9, item 8; s3-02): saved as a book's
// readings are, played with no signal, and taken off the phone by the first
// list of recordings that no longer names it, so the owner's right to take a
// recording down holds on a phone that saved it.
//
// What a reader would notice if this broke: a chant they saved will not play
// in church with no signal; or, the other way, a recording the owner took
// down goes on playing from a phone that saved it.
//
// No phone here: the window, the file plugin, fetch and the player are stood in.

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Live from "@/lib/chants/live";
import type * as Offline from "@/lib/chants/offline";

const store = new Map<string, string>();
const files = new Map<string, Uint8Array>();
let playingSrc: string | null = null;
const unload = vi.fn(() => {
  playingSrc = null;
});

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ src: playingSrc }),
  unload: () => unload(),
}));

const fromBase64 = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));
const join = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

const plugin = {
  Directory: { LibraryNoCloud: "NOCLOUD", Data: "DATA" },
  Filesystem: {
    writeFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
      files.set(path, fromBase64(data));
      return { uri: `file:///data/app/files/${path}` };
    }),
    appendFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
      files.set(path, join(files.get(path) ?? new Uint8Array(), fromBase64(data)));
    }),
    deleteFile: vi.fn(async ({ path }: { path: string }) => {
      if (!files.delete(path)) throw new Error("no such file");
    }),
    stat: async ({ path }: { path: string }) => {
      if (!files.has(path)) throw new Error("no such file");
      return {};
    },
    getUri: async ({ path }: { path: string }) => ({ uri: `file:///data/app2/files/${path}` }),
  },
} as unknown as typeof import("@capacitor/filesystem");

const BUCKET = "https://audio.purifyapp.net/chants/psalm-135/en.mp3";
const psalm = { id: "en", audio: { src: BUCKET, durationSec: 534.96 } };
const anthem = { id: "fr", audio: { src: "/audio/chants/prayer-rope-anthem/fr.mp3", durationSec: 140.23 } };

/** A recording's bytes, as the bucket would send them. */
let body = new Uint8Array(0);
let answer: "ok" | "404" | "drop" | "short" = "ok";

function response(): Response {
  if (answer === "404") return { ok: false, status: 404, headers: new Headers(), body: null } as unknown as Response;
  const sent = answer === "short" ? body.subarray(0, body.length - 10) : body;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      // In two pieces, as a network sends them.
      c.enqueue(sent.subarray(0, Math.floor(sent.length / 2)));
      c.enqueue(sent.subarray(Math.floor(sent.length / 2)));
      c.close();
    },
  });
  return { ok: true, status: 200, headers: new Headers({ "content-length": String(body.length) }), body: stream } as unknown as Response;
}

let offline: typeof Offline;
let live: typeof Live;

beforeEach(async () => {
  vi.resetModules();
  store.clear();
  files.clear();
  playingSrc = null;
  unload.mockClear();
  answer = "ok";
  body = new Uint8Array(7 * 1024 * 1024 + 5);
  for (let i = 0; i < body.length; i++) body[i] = i % 251;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    Capacitor: { convertFileSrc: (u: string) => u.replace("file:///data/", "https://localhost/_capacitor_file_/data/") },
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/audio/chants/live.json")) {
      return { ok: true, json: async () => ({ v: 1, live: ["psalm-135/en", "prayer-rope-anthem/fr"], pulled: [] }) };
    }
    if (answer === "drop") throw new TypeError("Failed to fetch");
    return response();
  }));
  offline = await import("@/lib/chants/offline");
  live = await import("@/lib/chants/live");
});

describe("the one switch", () => {
  it("makes keeping a chant Plus, as keeping a book's readings is, and the Plus line names chants with it", async () => {
    const { CHANT_SAVING } = await import("@/lib/chants/saving");
    const { PLUS_ROWS } = await import("@/lib/premium/plusRows");
    const row = PLUS_ROWS.find((r) => r.id === "offline")!;
    expect(["plus", "free"]).toContain(CHANT_SAVING);
    expect(row.body).toBe(CHANT_SAVING === "plus" ? "plus.offline.bodyChants" : "plus.offline.body");
  });
});

describe("saving a chant", () => {
  it("keeps the recording whole on the phone, written in pieces, and plays it from there", async () => {
    expect(await offline.saveChant("psalm-135", psalm, plugin)).toBe(true);
    const path = "audio/chants/psalm-135/en.mp3";
    expect(Buffer.from(files.get(path)!).equals(Buffer.from(body))).toBe(true);
    // Over 3 MB crosses to the phone in pieces, never as one string.
    expect(plugin.Filesystem.appendFile).toHaveBeenCalled();
    expect(offline.isChantSaved("psalm-135", psalm)).toBe(true);
    expect(offline.chantSrc("psalm-135", psalm)).toBe(`https://localhost/_capacitor_file_/data/app/files/${path}`);
    expect(offline.savedChants()["psalm-135/en"]).toMatchObject({ bytes: body.length, src: BUCKET });
  });

  it("asks the recording where it streams from: the bucket's own address", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(BUCKET);
  });

  it("keeps nothing, and lists nothing, when the recording cannot be had or comes short", async () => {
    for (const a of ["404", "drop", "short"] as const) {
      answer = a;
      expect(await offline.saveChant("psalm-135", psalm, plugin), a).toBe(false);
      expect(files.has("audio/chants/psalm-135/en.mp3"), a).toBe(false);
      expect(offline.isChantSaved("psalm-135", psalm), a).toBe(false);
      expect(offline.chantSrc("psalm-135", psalm), a).toBe(BUCKET);
    }
  });

  it("does not take a copy kept from a recording that has since moved for this one", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    const moved = { ...psalm, audio: { ...psalm.audio, src: "https://audio.purifyapp.net/chants/psalm-135/en-2.mp3" } };
    expect(offline.isChantSaved("psalm-135", moved)).toBe(false);
  });

  it("tells its size from its length: 128 kbps, as the bucket's recordings are", () => {
    expect(offline.chantBytes(534.96)).toBe(8_559_360);
  });
});

describe("whether a saved chant plays", () => {
  it("plays with no signal, and when the website answers with no list", () => {
    expect(live.availabilityOf("offline", "psalm-135", psalm, true)).toBe("playable");
    expect(live.availabilityOf("unavailable", "psalm-135", psalm, true)).toBe("playable");
    expect(live.availabilityOf("offline", "psalm-135", psalm, false)).toBe("offline");
  });

  it("waits while the list is being read, so a recording taken down never starts from its copy", () => {
    expect(live.availabilityOf("unknown", "psalm-135", psalm, true)).toBe("checking");
  });

  it("follows a list that was read, whatever is saved", () => {
    const list = (live: string[], pulled: string[] = []) => ({ live, pulled });
    expect(live.availabilityOf(list(["psalm-135/en"]), "psalm-135", psalm, true)).toBe("playable");
    expect(live.availabilityOf(list([], ["psalm-135/en"]), "psalm-135", psalm, true)).toBe("pulled");
    expect(live.availabilityOf(list(["psalm-117/ar"]), "psalm-135", psalm, true)).toBe("pulled");
  });
});

describe("a recording taken down", () => {
  it("leaves the phone with the first list that does not name it, and stops if it is playing", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    await offline.saveChant("prayer-rope-anthem", anthem, plugin);
    playingSrc = offline.chantSrc("psalm-135", psalm);
    const gone = await offline.keepOnlyListed({ live: ["prayer-rope-anthem/fr"], pulled: [] }, plugin);
    expect(gone).toEqual(["psalm-135/en"]);
    expect(files.has("audio/chants/psalm-135/en.mp3")).toBe(false);
    expect(offline.isChantSaved("psalm-135", psalm)).toBe(false);
    expect(unload).toHaveBeenCalledTimes(1);
    // The other stays, and plays from the phone.
    expect(offline.isChantSaved("prayer-rope-anthem", anthem)).toBe(true);
  });

  it("leaves the phone when the list names it pulled, even if it is also named live", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    await offline.keepOnlyListed({ live: ["psalm-135/en"], pulled: ["psalm-135/en"] }, plugin);
    expect(offline.isChantSaved("psalm-135", psalm)).toBe(false);
  });

  it("is taken off by the app itself, the moment it reads the list (lib/chants/live.ts)", async () => {
    await offline.saveChant("psalm-117", { id: "ar", audio: { src: "https://audio.purifyapp.net/chants/psalm-117/ar.mp3" } }, plugin);
    expect(Object.keys(offline.savedChants())).toEqual(["psalm-117/ar"]);
    await live.loadLiveList();
    await vi.waitFor(() => expect(Object.keys(offline.savedChants())).toEqual([]));
  });

  it("is kept when the list cannot be read: only a list read takes a copy away", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    vi.mocked(fetch).mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    await live.loadLiveList();
    expect(offline.isChantSaved("psalm-135", psalm)).toBe(true);
  });

  it("is the reader's to remove, and a copy that is playing finishes", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    playingSrc = offline.chantSrc("psalm-135", psalm);
    await offline.removeChant("psalm-135/en", plugin);
    expect(offline.isChantSaved("psalm-135", psalm)).toBe(false);
    expect(unload).not.toHaveBeenCalled();
  });
});

describe("at each launch", () => {
  it("forgets a copy whose file is gone, and finds the rest where the update moved them", async () => {
    await offline.saveChant("psalm-135", psalm, plugin);
    await offline.saveChant("prayer-rope-anthem", anthem, plugin);
    files.delete("audio/chants/prayer-rope-anthem/fr.mp3");
    expect(await offline.checkSavedChants(plugin)).toBe(1);
    expect(offline.isChantSaved("prayer-rope-anthem", anthem)).toBe(false);
    expect(offline.chantSrc("psalm-135", psalm)).toBe("https://localhost/_capacitor_file_/data/app2/files/audio/chants/psalm-135/en.mp3");
  });
});

describe("the player knows a saved copy for its recording", () => {
  it("by the end of its address, wherever it is kept", async () => {
    const { recordingTail, sameRecording } = await import("@/lib/chants/media");
    const android = "https://localhost/_capacitor_file_/data/user/0/net.purifyapp.app/files/audio/chants/psalm-135/en.mp3";
    const iphone = "capacitor://localhost/_capacitor_file_/var/mobile/Containers/Data/Application/X/Library/NoCloud/audio/chants/psalm-135/en.mp3";
    expect(recordingTail(BUCKET)).toBe("/chants/psalm-135/en.mp3");
    expect(sameRecording(android, BUCKET)).toBe(true);
    expect(sameRecording(iphone, BUCKET)).toBe(true);
    expect(sameRecording("https://purifyapp.net/audio/chants/prayer-rope-anthem/fr.mp3", "/audio/chants/prayer-rope-anthem/fr.mp3")).toBe(true);
    expect(sameRecording(android, "https://audio.purifyapp.net/chants/psalm-135/el.mp3")).toBe(false);
    expect(sameRecording("https://audio.purifyapp.net/read/john/1.mp3", BUCKET)).toBe(false);
    expect(recordingTail("https://audio.purifyapp.net/read/john/1.mp3")).toBeNull();
    expect(sameRecording(null, BUCKET)).toBe(false);
  });

  it("as the player's chant: Now Playing's Read and steps find its chant (lib/player/steps.ts)", async () => {
    const { chantVersionOf, playingOf } = await import("@/lib/player/steps");
    const android = "https://localhost/_capacitor_file_/data/user/0/net.purifyapp.app/files/audio/chants/psalm-135/en.mp3";
    const rows = [{ slug: "psalm-135", variants: [psalm, { id: "el", audio: { src: "https://audio.purifyapp.net/chants/psalm-135/el.mp3" } }] }];
    expect(chantVersionOf(android, rows)?.variant.id).toBe("en");
    expect(playingOf(android)).toEqual({ kind: "chant", slug: "psalm-135" });
  });
});
