import { getAmbienceTrack, type AmbienceId } from "@/lib/ambience/ambience";
import { getAmbienceSnapshot, layerAmbience, playAmbience, stopAmbience, subscribeAmbience } from "@/lib/ambience/player";
import { isNativeClient, nativePlatform } from "@/lib/platform/native";
import { nativePlugin } from "@/lib/platform/nativePlugin";
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

/**
 * Listening with the phone locked (1.8, the owner's yes of 2026-10-26).
 *
 * Android's web view has no lock screen of its own: a backgrounded app's
 * audio may be stopped by the system and shows no controls. The open-source
 * plugin @capgo/capacitor-media-session (MPL-2.0, used as it is published)
 * gives it the system's media session: a media-playback service that runs
 * while something plays or is paused, with the player in the notification
 * shade and on the lock screen. This hands the plugin what the one player
 * has (lib/prayers/persistentAudioStore.ts): the title, who reads or sings,
 * the cover, playing or paused, and where the track is; and it hands the
 * player's buttons back to the player.
 *
 * Android only (1.9). The iPhone's web view has the media session itself:
 * the player hands it the same title, cover and buttons
 * (navigator.mediaSession, persistentAudioStore.ts), it fills the lock
 * screen's Now Playing, and UIBackgroundModes "audio" (ios/App/App/
 * Info.plist) keeps the voice going with the screen locked. The plugin's own
 * JavaScript does the same on the iPhone; its Swift side sends the buttons
 * as events this never heard, and a second hand on Now Playing would only
 * fight the first.
 *
 * Mended in 1.9 (his report of 2026-11-10: on Android the voice went on when
 * he left the app, and no player showed in the shade). Until then no call
 * had ever reached the plugin: it was handed back bare from a promise, which
 * never settles (lib/platform/nativePlugin.ts says why). And the calls go in
 * order of need. Playing or paused goes first, because it is what starts the
 * plugin's service and its notification, which Android allows only while
 * the app is open or just left; later it refuses, the plugin does not catch
 * the refusal, and Capacitor turns it into a crash. The words go next. The cover goes last, as a small picture made here in
 * the web view: given an address, the plugin fetches it itself, on the one
 * thread every plugin shares and with no time limit, and every call behind
 * it waits.
 *
 * The rest are the widget bridge's rules (lib/widget/bridge.ts): nothing on
 * the website, where the browser's own media session already does this;
 * nothing in a shell built before the plugin; never an error; and the calls
 * go one after another, so an older state never lands after a newer one.
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

/** The cover's side on the lock screen and in the notification, in pixels. */
const ART_PX = 512;
/** How long the cover may take to come before the lock screen goes on without it. */
const ART_WAIT_MS = 8000;

let queue: Promise<void> = Promise.resolve();
let connected = false;

/** One call to the plugin, after the ones before it; never throws. Android only. */
function call(run: (p: MediaSessionPlugin) => Promise<unknown>): void {
  queue = queue
    .then(async () => {
      const box = await nativePlugin<MediaSessionPlugin>("MediaSession");
      if (box?.platform === "android") await run(box.api);
    })
    .catch(() => {});
}

/**
 * The cover as a small picture of its own (a data: address), made in the web
 * view, where the cover is already drawn or cached, so the plugin downloads
 * nothing. Any address the web view can read will do: the bundle's own, or
 * the website's, which lets the apps read its covers (Access-Control-Allow-
 * Origin). Null when the cover cannot be had in time; the lock screen then
 * shows the words alone.
 */
export async function lockScreenArtData(art: string, here: string): Promise<string | null> {
  if (typeof document === "undefined" || typeof fetch === "undefined" || typeof createImageBitmap === "undefined") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ART_WAIT_MS);
  try {
    const res = await fetch(new URL(art, here).href, { signal: controller.signal });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = document.createElement("canvas");
    canvas.width = ART_PX;
    canvas.height = ART_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // The middle square of the cover.
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, ART_PX, ART_PX);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** What the lock screen shows of a snapshot: none when nothing is loaded. */
export function lockScreenState(s: Pick<AudioSnapshot, "src" | "playing">): "none" | "paused" | "playing" {
  if (!s.src) return "none";
  return s.playing ? "playing" : "paused";
}

/** The words of the reader's language, by catalog key: the bar's own t (components/prayers/NowPlayingBar.tsx). */
export type LockScreenWords = (key: string) => string;

/** A cover the plugin keeps from the last track is cleared with an empty one (the plugin reads "" as none). */
const NO_COVER = [{ src: "" }];

/**
 * Start mirroring the player to the lock screen, once, inside the Android
 * app (the iPhone's web view does it itself). Returns the way to stop (for a
 * test, or a hot reload).
 *
 * The voice comes first: a track loaded is what the shade shows. With none,
 * the sounds under the reading are Purify's sound too (1.9, the arbiter's
 * yes of 2026-11-10: "the player for Purify's sound, whatever plays"), shown
 * by name in the reader's words. They have no pause of their own, so pause
 * in the shade stops them and keeps a paused player, from which play brings
 * the same sounds back, and stop puts it away. Between a voice and a sound,
 * and while a sound comes back, the shade never passes through nothing: that
 * would stop the plugin's service, which Android lets start again only with
 * the app open.
 */
export function connectLockScreen(words: LockScreenWords = (key) => key): () => void {
  if (connected || typeof window === "undefined" || !isNativeClient() || nativePlatform() === "ios") return () => {};
  connected = true;

  /** The sounds paused from the shade, to bring back from there. */
  let held: AmbienceId[] = [];
  /** Whether the shade shows the sounds: no voice loaded, and a sound playing, coming or held. */
  const soundsOnly = () => {
    const a = getAmbienceSnapshot();
    return !getAudioSnapshot().src && (a.layers.length > 0 || a.loading !== null || held.length > 0);
  };
  const holdSounds = () => {
    held = [...getAmbienceSnapshot().layers];
    stopAmbience();
  };
  const bringBackSounds = () => {
    const [first, second] = held;
    if (!first || getAmbienceSnapshot().layers.length) return;
    // held stays until a sound plays, so the shade goes from paused to playing.
    void playAmbience(first).then(() => (second ? layerAmbience(second) : undefined));
  };
  const endSounds = () => {
    held = [];
    stopAmbience();
  };

  const handlers: [Action, (d: { seekTime?: number | null }) => void][] = [
    ["play", () => (soundsOnly() ? bringBackSounds() : play())],
    ["pause", () => (soundsOnly() ? holdSounds() : pause())],
    ["stop", () => (soundsOnly() ? endSounds() : stop())],
    // Back 15 and forward 15, as in the player and the browser's lock screen. A sound has no place to go to.
    [
      "seekbackward",
      () => {
        if (!soundsOnly()) skipBy(-15);
      },
    ],
    [
      "seekforward",
      () => {
        if (!soundsOnly()) skipBy(15);
      },
    ],
    [
      "seekto",
      (d) => {
        if (!soundsOnly() && typeof d.seekTime === "number") seek(d.seekTime);
      },
    ],
  ];
  for (const [action, handler] of handlers) call((p) => p.setActionHandler({ action }, handler));

  let meta = "";
  // Nothing loaded is where the phone starts too: nothing to tell it yet.
  let state = "none";
  let positionAt = -Infinity;
  let lastTime = 0;

  const sync = () => {
    const s = getAudioSnapshot();
    const a = getAmbienceSnapshot();
    // Sounds held in the shade are let go once a sound plays again, or a voice takes the shade.
    if (a.layers.length || s.src) held = [];
    const sounds: AmbienceId[] = s.src ? [] : a.layers.length ? a.layers : a.loading ? [a.loading] : held;
    // Playing or paused first: it starts the media service and its
    // notification, which Android allows only while the app is open.
    const now = s.src ? lockScreenState(s) : a.layers.length || a.loading ? "playing" : held.length ? "paused" : "none";
    const stateChanged = now !== state;
    if (stateChanged) {
      state = now;
      call((p) => p.setPlaybackState({ playbackState: now }));
    }
    if (s.src) {
      const key = JSON.stringify([s.src, s.title, s.artist, s.art]);
      if (key !== meta) {
        meta = key;
        // The words at once, clearing the last cover; this cover when it is made, if this is still the track.
        const named = { title: s.title ?? "", artist: s.artist ?? "", album: "Purify" };
        call((p) => p.setMetadata({ ...named, artwork: NO_COVER }));
        if (s.art) {
          void lockScreenArtData(s.art, window.location.href).then((data) => {
            if (!data || meta !== key) return;
            call((p) => p.setMetadata({ ...named, artwork: [{ src: data, sizes: `${ART_PX}x${ART_PX}`, type: "image/jpeg" }] }));
          });
        }
      }
      // Where the track is: when it starts or stops, after a jump, and now
      // and then while it plays.
      const jumped = Math.abs(s.currentTime - lastTime) > 3;
      lastTime = s.currentTime;
      if (s.duration > 0 && (stateChanged || jumped || s.currentTime - positionAt >= POSITION_EVERY_S || s.currentTime < positionAt)) {
        positionAt = s.currentTime;
        // The rate stays the reading speed when paused: the paused state says it is still.
        call((p) => p.setPositionState({ duration: s.duration, position: Math.min(s.currentTime, s.duration), playbackRate: s.rate }));
      }
    } else if (sounds.length) {
      const title = sounds.map((id) => words(getAmbienceTrack(id)?.labelKey ?? id)).join(", ");
      const key = JSON.stringify(["sounds", title]);
      if (key !== meta) {
        meta = key;
        call((p) => p.setMetadata({ title, artist: words("ambience.title"), album: "Purify", artwork: NO_COVER }));
        // A sound has no length, and no bar.
        positionAt = -Infinity;
        call((p) => p.setPositionState({ duration: 0, position: 0, playbackRate: 1 }));
      }
    }
    if (now === "none") meta = "";
  };

  const unsubscribe = subscribeAudio(sync);
  const unsubscribeSounds = subscribeAmbience(sync);
  sync();
  return () => {
    unsubscribe();
    unsubscribeSounds();
    connected = false;
  };
}
