// Listening with the phone locked (1.8). What a reader would notice if this
// broke: the voice stopping when the screen locks, a lock screen that does
// not know what is playing or does not answer its buttons, or, on the
// website, an error. The why is in ../lockScreen.ts.

import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { lockScreenArtData, lockScreenState } from "../lockScreen";

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

/** A stand-in for the sounds under the reading (lib/ambience/player.ts), driven by the test. */
function sounds() {
  const subs = new Set<() => void>();
  const a = {
    snapshot: { layers: [] as string[], loading: null as string | null },
    set(patch: Partial<{ layers: string[]; loading: string | null }>) {
      a.snapshot = { ...a.snapshot, ...patch };
      for (const s of subs) s();
    },
    module: {
      getAmbienceSnapshot: () => a.snapshot,
      subscribeAmbience: (cb: () => void) => (subs.add(cb), () => void subs.delete(cb)),
      playAmbience: async (id: string | null) => a.set({ layers: id ? [id] : [] }),
      layerAmbience: async (id: string) => a.set({ layers: [...a.snapshot.layers, id] }),
      stopAmbience: () => a.set({ layers: [] }),
    },
  };
  return a;
}

/**
 * The bridge with the shell, the player and Capacitor standing in. `shell` is
 * what the page reads before Capacitor loads (null when it cannot tell yet);
 * `capacitor` what Capacitor itself says once loaded.
 */
async function load(
  isNative: boolean,
  pl: ReturnType<typeof plugin>,
  audio: ReturnType<typeof player>,
  shell: "android" | "ios" | null = "android",
  capacitor: "android" | "ios" = shell ?? "android",
  amb: ReturnType<typeof sounds> = sounds(),
) {
  vi.resetModules();
  vi.doMock("@/lib/ambience/player", () => amb.module);
  vi.doMock("@/lib/platform/native", () => ({ isNativeClient: () => isNative, nativePlatform: () => (isNative ? shell : null) }));
  vi.doMock("@/lib/prayers/persistentAudioStore", () => audio.module);
  vi.doMock("@capacitor/core", () => {
    pl.loads += 1;
    return {
      Capacitor: { isPluginAvailable: (name: string) => name === "MediaSession", getPlatform: () => capacitor },
      registerPlugin: (name: string) => (name === "MediaSession" ? pl.api : {}),
    };
  });
  vi.stubGlobal("window", { location: { href: "https://localhost/bible/john/1/" } });
  return import("../lockScreen");
}

afterEach(() => {
  vi.doUnmock("@/lib/platform/native");
  vi.doUnmock("@/lib/prayers/persistentAudioStore");
  vi.doUnmock("@/lib/ambience/player");
  vi.doUnmock("@capacitor/core");
  vi.unstubAllGlobals();
});

/** The web view's fetch, picture decoder and canvas, standing in: a cover of 600 by 750 becomes a data: picture. */
function stubPicture(drawn: unknown[][]) {
  vi.stubGlobal("fetch", async (url: string) => ({ ok: !url.includes("missing"), blob: async () => new Blob(["jpeg"]) }));
  vi.stubGlobal("createImageBitmap", async () => ({ width: 600, height: 750, close: () => {} }));
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: (...a: unknown[]) => void drawn.push(a) }), toDataURL: () => "data:image/jpeg;base64,COVER" }),
  });
}

describe("what the lock screen is handed", () => {
  it("a cover made in the web view, so the plugin downloads nothing (1.9, his report of 2026-11-10)", async () => {
    const drawn: unknown[][] = [];
    stubPicture(drawn);
    expect(await lockScreenArtData("/covers/john.v1.jpg", "https://localhost/bible/john/1/")).toBe("data:image/jpeg;base64,COVER");
    // The middle square of a portrait cover, at 512.
    expect(drawn[0].slice(1)).toEqual([0, 75, 600, 600, 0, 0, 512, 512]);
    // None when it cannot be had; the lock screen shows the words alone.
    expect(await lockScreenArtData("/covers/missing.jpg", "https://localhost/")).toBeNull();
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

describe("on the iPhone", () => {
  // The iPhone's web view fills Now Playing itself from the player's own media
  // session (persistentAudioStore.ts), as the plugin's own JavaScript does there.
  it("leaves Now Playing to the web view, and never loads the plugin", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(true, pl, audio, "ios");
    connectLockScreen();
    audio.set({ src: "/a.mp3", title: "John 1", playing: true, duration: 300 });
    await new Promise((r) => setTimeout(r, 0));
    expect(pl.loads).toBe(0);
    expect(pl.calls).toEqual([]);
  });

  it("calls nothing even when the page could not tell the shell before Capacitor said", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(true, pl, audio, null, "ios");
    const disconnect = connectLockScreen();
    audio.set({ src: "/a.mp3", title: "John 1", playing: true, duration: 300 });
    await vi.waitFor(() => expect(pl.loads).toBe(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(pl.calls).toEqual([]);
    expect(pl.handlers.size).toBe(0);
    disconnect();
  });
});

describe("in the Android app", () => {
  it("shows what plays, follows play and pause, and lets go when it is put away", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(true, pl, audio);
    const disconnect = connectLockScreen();
    audio.set({ src: "/audio/read/john/1.mp3", title: "John 1", artist: "Read by Purify", art: "/sections/bible.jpg", playing: true, duration: 300 });
    await vi.waitFor(() => expect(pl.calls.some(([m]) => m === "setPositionState")).toBe(true));
    const meta = pl.calls.find(([m]) => m === "setMetadata")?.[1] as { title: string; artist: string; album: string; artwork?: { src: string }[] };
    expect(meta.title).toBe("John 1");
    expect(meta.artist).toBe("Read by Purify");
    expect(meta.album).toBe("Purify");
    // Playing goes first: on Android it starts the media service and its notification while the app is open.
    const order = pl.calls.map(([m]) => m);
    expect(order.indexOf("setPlaybackState")).toBeLessThan(order.indexOf("setMetadata"));
    // The words never wait for a cover, and clear the last track's: the plugin reads "" as none (here no web view can make one).
    expect(meta.artwork).toEqual([{ src: "" }]);
    audio.set({ playing: false });
    audio.set({ src: null, playing: false });
    await vi.waitFor(() => expect(pl.calls.filter(([m]) => m === "setPlaybackState").map(([, s]) => s)).toEqual(["playing", "paused", "none"]));
    disconnect();
  });

  it("hands the cover after the words, as a picture of its own, when it is made", async () => {
    const pl = plugin();
    const audio = player();
    const { connectLockScreen } = await load(true, pl, audio);
    stubPicture([]);
    const disconnect = connectLockScreen();
    audio.set({ src: "/audio/chants/x.mp3", title: "Christ is risen", artist: "Sung by a choir", art: "/covers/pascha.v1.jpg", playing: true, duration: 200 });
    await vi.waitFor(() => expect(pl.calls.filter(([m]) => m === "setMetadata")).toHaveLength(2));
    const [first, second] = pl.calls.filter(([m]) => m === "setMetadata").map(([, o]) => o as { title: string; artwork?: { src: string; sizes?: string }[] });
    expect(first.artwork).toEqual([{ src: "" }]);
    expect(second.title).toBe("Christ is risen");
    expect(second.artwork?.[0]).toMatchObject({ src: "data:image/jpeg;base64,COVER", sizes: "512x512" });
    expect(pl.calls.map(([m]) => m).indexOf("setPlaybackState")).toBe(0);
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

describe("the sounds under the reading, in the Android app (1.9)", () => {
  const SPANISH: Record<string, string> = { "ambience.rain": "Lluvia", "ambience.bell": "Campana y quietud", "ambience.title": "Ambiente" };
  const states = (pl: ReturnType<typeof plugin>) => pl.calls.filter(([m]) => m === "setPlaybackState").map(([, s]) => s);

  it("are in the shade when no voice is loaded, by name in the reader's words, with no bar", async () => {
    const pl = plugin();
    const amb = sounds();
    const { connectLockScreen } = await load(true, pl, player(), "android", "android", amb);
    const disconnect = connectLockScreen((key) => SPANISH[key] ?? key);
    amb.set({ layers: ["rain", "bell"] });
    await vi.waitFor(() => expect(pl.calls.some(([m]) => m === "setPositionState")).toBe(true));
    expect(states(pl)).toEqual(["playing"]);
    expect(pl.calls.find(([m]) => m === "setMetadata")?.[1]).toEqual({ title: "Lluvia, Campana y quietud", artist: "Ambiente", album: "Purify", artwork: [{ src: "" }] });
    expect(pl.calls.find(([m]) => m === "setPositionState")?.[1]).toEqual({ duration: 0, position: 0, playbackRate: 1 });
    disconnect();
  });

  it("pause there holds them, play brings the same ones back, stop puts them away", async () => {
    const pl = plugin();
    const amb = sounds();
    const { connectLockScreen } = await load(true, pl, player(), "android", "android", amb);
    const disconnect = connectLockScreen((key) => SPANISH[key] ?? key);
    await vi.waitFor(() => expect(pl.handlers.size).toBe(6));
    amb.set({ layers: ["rain", "bell"] });
    pl.handlers.get("pause")!({ action: "pause" });
    expect(amb.snapshot.layers).toEqual([]);
    // A sound has no place to go to: the bar's buttons leave it be.
    pl.handlers.get("seekforward")!({ action: "seekforward" });
    pl.handlers.get("play")!({ action: "play" });
    await vi.waitFor(() => expect(amb.snapshot.layers).toEqual(["rain", "bell"]));
    pl.handlers.get("stop")!({ action: "stop" });
    // Never nothing between: that would stop the service, which Android starts again only with the app open.
    await vi.waitFor(() => expect(states(pl)).toEqual(["playing", "paused", "playing", "none"]));
    disconnect();
  });

  it("follow the voice in the shade without passing through nothing", async () => {
    const pl = plugin();
    const audio = player();
    const amb = sounds();
    const { connectLockScreen } = await load(true, pl, audio, "android", "android", amb);
    const disconnect = connectLockScreen((key) => SPANISH[key] ?? key);
    audio.set({ src: "/audio/read/john/1.mp3", title: "John 1", artist: "Read by Purify", playing: true, duration: 300 });
    amb.set({ layers: ["rain"] });
    // The voice has the shade while it is loaded; a tap on pause there pauses the voice, not the rain.
    await vi.waitFor(() => expect(pl.handlers.size).toBe(6));
    pl.handlers.get("pause")!({ action: "pause" });
    expect(audio.snapshot.playing).toBe(false);
    expect(amb.snapshot.layers).toEqual(["rain"]);
    audio.set({ src: null, playing: false });
    await vi.waitFor(() => expect(pl.calls.filter(([m]) => m === "setMetadata").at(-1)?.[1]).toMatchObject({ title: "Lluvia" }));
    expect(states(pl)).toEqual(["playing", "paused", "playing"]);
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

  it("hand the phone's media buttons to the player only while it runs (1.9, F-51)", () => {
    // androidx's receiver, which the plugin brings, would start the plugin's
    // service for a button pressed after the player has gone, and Android
    // would stop the app for it. Ours takes its place and lets such a button go.
    const plugin = fs.readFileSync(path.join(ROOT, "node_modules/@capgo/capacitor-media-session/android/src/main/AndroidManifest.xml"), "utf8");
    expect(plugin).toContain('android:name="androidx.media.session.MediaButtonReceiver"');
    const manifest = fs.readFileSync(path.join(ROOT, "android/app/src/main/AndroidManifest.xml"), "utf8");
    expect(manifest).toMatch(/<receiver\s+android:name="androidx\.media\.session\.MediaButtonReceiver"\s+tools:node="remove"\s*\/>/);
    const ours = manifest.match(/<receiver\s+android:name="\.media\.PlayerButtonReceiver"\s+android:exported="true">[\s\S]*?<\/receiver>/)?.[0];
    expect(ours).toContain('<action android:name="android.intent.action.MEDIA_BUTTON" />');
    // The one receiver for the buttons, so the plugin's session and notification find it.
    expect(manifest.match(/android\.intent\.action\.MEDIA_BUTTON/g)).toHaveLength(1);

    const java = fs.readFileSync(path.join(ROOT, "android/app/src/main/java/net/purifyapp/purify/media/PlayerButtonReceiver.java"), "utf8");
    expect(java).toContain("package net.purifyapp.purify.media;");
    expect(java).toContain("public class PlayerButtonReceiver extends BroadcastReceiver");
    // The plugin's own service, by its namespace and its manifest's name.
    const namespace = fs.readFileSync(path.join(ROOT, "node_modules/@capgo/capacitor-media-session/android/build.gradle"), "utf8").match(/namespace\s*=?\s*"([^"]+)"/)?.[1];
    const service = plugin.match(/<service\s+android:name="\.([A-Za-z]+)"/)?.[1];
    expect(java).toContain(`static final String PLAYER_SERVICE = "${namespace}.${service}";`);
    // A button goes on only while that service runs in the foreground.
    expect(java).toMatch(/if \(!playerRuns\(context\)\) return;/);
    expect(java).toMatch(/PLAYER_SERVICE\.equals\(info\.service\.getClassName\(\)\) && info\.foreground/);
  });

  it("pin the plugin to one version, so the native side never changes unseen", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.dependencies["@capgo/capacitor-media-session"]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
