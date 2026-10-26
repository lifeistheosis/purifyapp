// Listening with the phone locked (1.8). What a reader would notice if this
// broke: the voice stopping when the screen locks, a lock screen that does
// not know what is playing or does not answer its buttons, or, on the
// website, an error. The why is in ../lockScreen.ts.

import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { lockScreenArt, lockScreenState } from "../lockScreen";

const ROOT = path.resolve(__dirname, "..", "..", "..");

type Snapshot = { src: string | null; title: string | null; artist: string | null; art: string | null; playing: boolean; currentTime: number; duration: number; rate: number };

/** A stand-in for the native plugin, keeping every call. */
function plugin() {
  const calls: [string, unknown][] = [];
  const handlers = new Map<string, (d: { action: string; seekTime?: number | null }) => void>();
  return {
    calls,
    handlers,
    loads: 0,
    api: {
      setMetadata: async (o: unknown) => void calls.push(["setMetadata", o]),
      setPlaybackState: async (o: { playbackState: string }) => void calls.push(["setPlaybackState", o.playbackState]),
      setPositionState: async (o: unknown) => void calls.push(["setPositionState", o]),
      setActionHandler: async (o: { action: string }, h: (d: { action: string; seekTime?: number | null }) => void) => {
        handlers.set(o.action, h);
      },
    },
  };
}

/** A stand-in for the one player, driven by the test. */
function player() {
  const subs = new Set<() => void>();
  const p = {
    snapshot: { src: null, title: null, artist: null, art: null, playing: false, currentTime: 0, duration: 0, rate: 1 } as Snapshot,
    played: 0,
    set(patch: Partial<Snapshot>) {
      p.snapshot = { ...p.snapshot, ...patch };
      for (const s of subs) s();
    },
    module: {
      getAudioSnapshot: () => p.snapshot,
      subscribeAudio: (cb: () => void) => (subs.add(cb), () => subs.delete(cb)),
      play: () => void (p.played += 1),
      pause: () => p.set({ playing: false }),
      stop: () => p.set({ playing: false, currentTime: 0 }),
      seek: (t: number) => p.set({ currentTime: t }),
      skipBy: (s: number) => p.set({ currentTime: p.snapshot.currentTime + s }),
    },
  };
  return p;
}

async function load(isNative: boolean, pl: ReturnType<typeof plugin>, audio: ReturnType<typeof player>) {
  vi.resetModules();
  vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => isNative }));
  vi.doMock("@/lib/prayers/persistentAudioStore", () => audio.module);
  vi.doMock("@capacitor/core", () => {
    pl.loads += 1;
    return {
      Capacitor: { isPluginAvailable: (name: string) => name === "MediaSession" },
      registerPlugin: (name: string) => (name === "MediaSession" ? pl.api : {}),
    };
  });
  vi.stubGlobal("window", { location: { href: "https://localhost/bible/john/1/" } });
  return import("../lockScreen");
}

afterEach(() => {
  vi.doUnmock("@/lib/platform/native");
  vi.doUnmock("@/lib/prayers/persistentAudioStore");
  vi.doUnmock("@capacitor/core");
  vi.unstubAllGlobals();
});

describe("what the lock screen is handed", () => {
  it("a picture the phone can fetch itself", () => {
    expect(lockScreenArt("/sections/bible.jpg", "https://localhost/bible/john/1/", "https://purifyapp.net")).toBe("https://purifyapp.net/sections/bible.jpg");
    expect(lockScreenArt("https://purifyapp.net/covers/john.jpg", "https://localhost/", "https://purifyapp.net")).toBe("https://purifyapp.net/covers/john.jpg");
  });

  it("nothing when nothing is loaded, else playing or paused", () => {
    expect(lockScreenState({ src: null, playing: false })).toBe("none");
    expect(lockScreenState({ src: "/a.mp3", playing: true })).toBe("playing");
    expect(lockScreenState({ src: "/a.mp3", playing: false })).toBe("paused");
  });
});

describe("on the website", () => {
  it("does nothing, and never loads the plugin", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(false, pl, audio);
    connectLockScreen();
    audio.set({ src: "/a.mp3", title: "John 1", playing: true, duration: 300 });
    await new Promise((r) => setTimeout(r, 0));
    expect(pl.loads).toBe(0);
    expect(pl.calls).toEqual([]);
  });
});

describe("in the apps", () => {
  it("shows what plays, follows play and pause, and lets go when it is put away", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(true, pl, audio);
    const disconnect = connectLockScreen();
    audio.set({ src: "/audio/read/john/1.mp3", title: "John 1", artist: "Read by Purify", art: "/sections/bible.jpg", playing: true, duration: 300 });
    await vi.waitFor(() => expect(pl.calls.some(([m]) => m === "setPositionState")).toBe(true));
    const meta = pl.calls.find(([m]) => m === "setMetadata")?.[1] as { title: string; artist: string; album: string; artwork: { src: string }[] };
    expect(meta.title).toBe("John 1");
    expect(meta.artist).toBe("Read by Purify");
    expect(meta.album).toBe("Purify");
    expect(meta.artwork[0].src).toMatch(/^https:\/\/[^/]+\/sections\/bible\.jpg$/);
    expect(meta.artwork[0].src.startsWith("https://localhost")).toBe(false);
    audio.set({ playing: false });
    audio.set({ src: null, playing: false });
    await vi.waitFor(() => expect(pl.calls.filter(([m]) => m === "setPlaybackState").map(([, s]) => s)).toEqual(["playing", "paused", "none"]));
    disconnect();
  });

  it("answers the lock screen's buttons through the player", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(true, pl, audio);
    const disconnect = connectLockScreen();
    await vi.waitFor(() => expect(pl.handlers.size).toBe(6));
    pl.handlers.get("play")!({ action: "play" });
    expect(audio.played).toBe(1);
    audio.set({ src: "/a.mp3", currentTime: 100, duration: 300 });
    pl.handlers.get("seekbackward")!({ action: "seekbackward" });
    expect(audio.snapshot.currentTime).toBe(85);
    pl.handlers.get("seekto")!({ action: "seekto", seekTime: 42 });
    expect(audio.snapshot.currentTime).toBe(42);
    disconnect();
  });
});

describe("the apps' own settings for it", () => {
  it("let Android run the media-playback service and the iPhone play with the screen locked", () => {
    const manifest = fs.readFileSync(path.join(ROOT, "android/app/src/main/AndroidManifest.xml"), "utf8");
    expect(manifest).toContain('android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"');
    const plist = fs.readFileSync(path.join(ROOT, "ios/App/App/Info.plist"), "utf8");
    expect(plist).toMatch(/<key>UIBackgroundModes<\/key>\s*<array>\s*<string>audio<\/string>/);
  });

  it("pin the plugin to one version, so the native side never changes unseen", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.dependencies["@capgo/capacitor-media-session"]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
