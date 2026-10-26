import { isNativeClient } from "@/lib/platform/native";
import {
  getAudioSnapshot,
  pause,
  play,
  seek,
  skipBy,
  stop,
  subscribeAudio,
  type AudioSnapshot,
} from "@/lib/prayers/persistentAudioStore";
import { SITE_URL } from "@/lib/site";

/**
 * Listening with the phone locked (1.8, the owner's yes of 2026-10-26).
 *
 * The apps' web view has no lock screen of its own. On Android a
 * backgrounded app's audio may be stopped by the system and shows no
 * controls; on the iPhone the lock screen does not know what is playing.
 * The open-source plugin @capgo/capacitor-media-session (MPL-2.0, used as it
 * is published) gives both phones the system's media session: on Android a
 * media-playback service that runs while something plays or is paused, with
 * the controls in the notification shade and on the lock screen; on the
 * iPhone the lock screen's Now Playing, where UIBackgroundModes "audio"
 * (ios/App/App/Info.plist) keeps the voice going with the screen locked.
 *
 * This hands the plugin what the one player has (lib/prayers/
 * persistentAudioStore.ts): the title, who reads or sings, the cover,
 * playing or paused, and where the track is; and it hands the lock screen's
 * buttons back to the player. The rules are the widget bridge's
 * (lib/widget/bridge.ts): nothing on the website, where the browser's own
 * media session already does this; nothing in a shell built before the
 * plugin; never an error; and the calls go one after another, so an older
 * state never lands after a newer one.
 */

type Action = "play" | "pause" | "seekbackward" | "seekforward" | "previoustrack" | "nexttrack" | "seekto" | "stop";

type MediaSessionPlugin = {
  setMetadata(options: { title?: string; artist?: string; album?: string; artwork?: { src: string; sizes?: string; type?: string }[] }): Promise<void>;
  setPlaybackState(options: { playbackState: "none" | "paused" | "playing" }): Promise<void>;
  setActionHandler(options: { action: Action }, handler: ((details: { action: Action; seekTime?: number | null }) => void) | null): Promise<void>;
  setPositionState(options: { duration?: number; playbackRate?: number; position?: number }): Promise<void>;
};

/** How often, while playing, the lock screen's progress is set again (it runs on by itself between). */
const POSITION_EVERY_S = 15;

let plugin: Promise<MediaSessionPlugin | null> | null = null;
let queue: Promise<void> = Promise.resolve();
let connected = false;

function loadPlugin(): Promise<MediaSessionPlugin | null> {
  plugin ??= import("@capacitor/core")
    .then(({ Capacitor, registerPlugin }) =>
      Capacitor.isPluginAvailable("MediaSession") ? registerPlugin<MediaSessionPlugin>("MediaSession") : null,
    )
    .catch(() => {
      plugin = null;
      return null;
    });
  return plugin;
}

/** One call to the plugin, after the ones before it; never throws. */
function call(run: (p: MediaSessionPlugin) => Promise<unknown>): void {
  queue = queue
    .then(async () => {
      const p = await loadPlugin();
      if (p) await run(p);
    })
    .catch(() => {});
}

/**
 * A picture the phone itself can fetch. The lock screen loads it outside the
 * web view, where the app's own address (https://localhost) answers nothing,
 * so a picture in the bundle is asked of the website, which has the same file.
 */
export function lockScreenArt(art: string, here: string, site: string = SITE_URL): string {
  const url = new URL(art, here);
  return url.hostname === "localhost" ? `${site.replace(/\/$/, "")}${url.pathname}${url.search}` : url.href;
}

/** What the lock screen shows of a snapshot: none when nothing is loaded. */
export function lockScreenState(s: Pick<AudioSnapshot, "src" | "playing">): "none" | "paused" | "playing" {
  if (!s.src) return "none";
  return s.playing ? "playing" : "paused";
}

/**
 * Start mirroring the player to the lock screen, once, inside the apps.
 * Returns the way to stop (for a test, or a hot reload).
 */
export function connectLockScreen(): () => void {
  if (connected || typeof window === "undefined" || !isNativeClient()) return () => {};
  connected = true;

  const handlers: [Action, (d: { seekTime?: number | null }) => void][] = [
    ["play", () => play()],
    ["pause", () => pause()],
    ["stop", () => stop()],
    // Back 15 and forward 15, as in the player and the browser's lock screen.
    ["seekbackward", () => skipBy(-15)],
    ["seekforward", () => skipBy(15)],
    ["seekto", (d) => (typeof d.seekTime === "number" ? seek(d.seekTime) : undefined)],
  ];
  for (const [action, handler] of handlers) call((p) => p.setActionHandler({ action }, handler));

  let meta = "";
  // Nothing loaded is where the phone starts too: nothing to tell it yet.
  let state = "none";
  let positionAt = -Infinity;
  let lastTime = 0;

  const sync = () => {
    const s = getAudioSnapshot();
    const key = JSON.stringify([s.src, s.title, s.artist, s.art]);
    if (s.src && key !== meta) {
      meta = key;
      const art = s.art ? lockScreenArt(s.art, window.location.href) : null;
      call((p) =>
        p.setMetadata({
          title: s.title ?? "",
          artist: s.artist ?? "",
          album: "Purify",
          ...(art ? { artwork: [{ src: art, sizes: "512x512", type: /\.png(\?|$)/i.test(art) ? "image/png" : "image/jpeg" }] } : {}),
        }),
      );
    }
    const now = lockScreenState(s);
    const stateChanged = now !== state;
    if (stateChanged) {
      state = now;
      call((p) => p.setPlaybackState({ playbackState: now }));
    }
    // Where the track is: when it starts or stops, after a jump, and now and
    // then while it plays.
    const jumped = Math.abs(s.currentTime - lastTime) > 3;
    lastTime = s.currentTime;
    if (now !== "none" && s.duration > 0 && (stateChanged || jumped || s.currentTime - positionAt >= POSITION_EVERY_S || s.currentTime < positionAt)) {
      positionAt = s.currentTime;
      // The rate stays the reading speed when paused: the paused state says it is still.
      call((p) => p.setPositionState({ duration: s.duration, position: Math.min(s.currentTime, s.duration), playbackRate: s.rate }));
    }
    if (now === "none") meta = "";
  };

  const unsubscribe = subscribeAudio(sync);
  sync();
  return () => {
    unsubscribe();
    connected = false;
  };
}
