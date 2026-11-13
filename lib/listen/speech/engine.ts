"use client";

import { nativePlugin } from "@/lib/platform/nativePlugin";

/**
 * What speaks, for the phone's own voices (1.9, build 95 note 25, his word of
 * 2026-11-13: "Both", the choice of voices in 1.9 by the phone's own voices).
 * One seam, three sides:
 *
 *  - In the Android app, the phone's TextToSpeech, and on an iPhone or iPad,
 *    AVSpeechSynthesizer, through the apps' own plugin `PurifySpeech`
 *    (android/app/src/main/java/net/purifyapp/purify/speech/, ios/App/App/
 *    PurifySpeechPlugin.swift). The Android web view has no speech of its
 *    own, and the iPhone's would be muted by the silent switch and stop when
 *    the screen locks.
 *  - On the website, the browser's own speech, where it has voices on the
 *    device.
 *
 * Only voices on the device are offered: a voice that sends the text away to
 * be spoken is never listed (the phone's voices are fast and offline, which
 * is why they were chosen). The text goes as a list of pieces (verses, or
 * paragraphs) queued at once, so the phone reads on with the screen off
 * while the app sleeps, and every report names the piece it is about and the
 * ask it answers (`token`), so a report from a reading stopped a moment ago
 * is never taken for the one now.
 */

export type PhoneVoice = {
  /** The phone's own name for it, kept as the reader's choice. */
  id: string;
  /** What the reader sees. */
  name: string;
  /** BCP 47: "en-GB", "ru-RU". */
  lang: string;
  /** The phone's own voice for its language. */
  default?: boolean;
  /** The phone's better voices ("enhanced", "premium" on an iPhone), drawn first. */
  quality?: number;
};

export type SpeechEvent =
  | { type: "start"; token: number; index: number }
  /** The word being spoken: its letters' place in the piece, as the piece was given. */
  | { type: "word"; token: number; index: number; start: number; end: number }
  | { type: "done"; token: number; index: number }
  | { type: "end"; token: number }
  | { type: "error"; token: number; index: number; message?: string }
  /** The lock screen's controls (the iPhone's; Android's come through the player's own). */
  | { type: "remote"; action: "play" | "pause" | "toggle" | "skip"; seconds?: number }
  /**
   * The phone took the sound (a call, Siri or the assistant, an alarm, another
   * app playing) and has stopped the voice (`began`), or gave the sound back
   * (`began: false`), with `resume` where the phone says the reading may go on:
   * a call or Siri over, as a recording goes on after one. Android's audio
   * focus, the iPhone's audio session interruption.
   */
  | { type: "interruption"; began: boolean; resume?: boolean };

export type SpeakAsk = {
  token: number;
  pieces: string[];
  /** The piece to begin at, and the letter in it (a pause is taken up at its word). */
  from: number;
  offset: number;
  lang: string;
  /** A voice's id, or null for the phone's own voice for `lang`. */
  voice: string | null;
  /** The reader's speed: 1 is the voice's own. */
  rate: number;
  volume: number;
  /** What the lock screen shows, where the plugin draws it (the iPhone). */
  title?: string;
  artist?: string;
  duration?: number;
  elapsed?: number;
};

export type SpeechEngine = {
  side: "android" | "ios" | "web";
  voices(): Promise<PhoneVoice[]>;
  speak(ask: SpeakAsk): Promise<void>;
  stop(): Promise<void>;
  /** One line, for a voice's "Hear it". */
  preview(ask: { text: string; lang: string; voice: string | null; rate: number }): Promise<void>;
  /** What the lock screen shows while paused (the iPhone's; elsewhere nothing). */
  nowPlaying(info: { title: string; artist: string; duration: number; elapsed: number; playing: boolean } | null): Promise<void>;
  onEvent(listener: (e: SpeechEvent) => void): () => void;
};

/** The plugin as the apps answer it (both shells, one shape). */
type PurifySpeechPlugin = {
  voices(): Promise<{ voices: PhoneVoice[] }>;
  speak(ask: SpeakAsk): Promise<void>;
  stop(): Promise<void>;
  preview(ask: { text: string; lang: string; voice: string | null; rate: number }): Promise<void>;
  nowPlaying(info: { title?: string; artist?: string; duration?: number; elapsed?: number; playing?: boolean; clear?: boolean }): Promise<void>;
  addListener(event: "speech", listener: (e: SpeechEvent) => void): Promise<{ remove(): Promise<void> }>;
};

const listeners = new Set<(e: SpeechEvent) => void>();
function tell(e: SpeechEvent): void {
  for (const l of listeners) {
    try {
      l(e);
    } catch {
      /* one listener's fault is its own */
    }
  }
}
function listen(listener: (e: SpeechEvent) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether a voice is on the device and the ask is for its language: "en" takes "en-GB", "en-GB" takes "en-GB" and "en". */
export function speaksLanguage(voice: Pick<PhoneVoice, "lang">, lang: string): boolean {
  const v = voice.lang.toLowerCase().replace("_", "-");
  const l = lang.toLowerCase().replace("_", "-");
  return v === l || v.split("-")[0] === l.split("-")[0];
}

let nativeEngine: Promise<SpeechEngine | null> | null = null;

function fromPlugin(): Promise<SpeechEngine | null> {
  nativeEngine ??= nativePlugin<PurifySpeechPlugin>("PurifySpeech").then((box) => {
    if (!box) return null;
    const side = box.platform === "ios" ? "ios" : "android";
    let attached = false;
    const attach = () => {
      if (attached) return;
      attached = true;
      void box.api.addListener("speech", tell).catch(() => {
        attached = false;
      });
    };
    const engine: SpeechEngine = {
      side,
      voices: () =>
        box.api
          .voices()
          .then((r) => r?.voices ?? [])
          .catch(() => []),
      speak: (ask) => {
        attach();
        return box.api.speak(ask);
      },
      stop: () => box.api.stop().catch(() => {}),
      preview: (ask) => {
        attach();
        return box.api.preview(ask);
      },
      nowPlaying: (info) => (side === "ios" ? box.api.nowPlaying(info ?? { clear: true }).catch(() => {}) : Promise.resolve()),
      onEvent: (l) => {
        attach();
        return listen(l);
      },
    };
    return engine;
  });
  return nativeEngine;
}

/** The browser's own speech, on the website: voices on the device only. */
function fromBrowser(): SpeechEngine | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return null;
  const synth = window.speechSynthesis;
  const local = () =>
    synth
      .getVoices()
      .filter((v) => v.localService)
      .map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang, ...(v.default ? { default: true } : {}) }));
  const find = (id: string | null, lang: string) => {
    const all = synth.getVoices().filter((v) => v.localService);
    return (id ? all.find((v) => v.voiceURI === id) : undefined) ?? all.find((v) => v.default && speaksLanguage(v, lang)) ?? all.find((v) => speaksLanguage(v, lang)) ?? null;
  };
  return {
    side: "web",
    voices: () =>
      new Promise((resolve) => {
        const now = local();
        if (now.length || synth.getVoices().length) return resolve(now);
        // The list fills a moment after the page opens.
        const done = () => {
          synth.removeEventListener("voiceschanged", done);
          clearTimeout(timer);
          resolve(local());
        };
        const timer = setTimeout(done, 1500);
        synth.addEventListener("voiceschanged", done);
      }),
    speak: async (ask) => {
      synth.cancel();
      const voice = find(ask.voice, ask.lang);
      for (let i = ask.from; i < ask.pieces.length; i++) {
        const shift = i === ask.from ? ask.offset : 0;
        const u = new SpeechSynthesisUtterance(ask.pieces[i].slice(shift));
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? ask.lang;
        u.rate = ask.rate;
        u.volume = ask.volume;
        const index = i;
        u.onstart = () => tell({ type: "start", token: ask.token, index });
        u.onboundary = (e) => {
          if (e.name && e.name !== "word") return;
          tell({ type: "word", token: ask.token, index, start: e.charIndex + shift, end: e.charIndex + shift + (e.charLength || 1) });
        };
        u.onend = () => {
          tell({ type: "done", token: ask.token, index });
          if (index === ask.pieces.length - 1) tell({ type: "end", token: ask.token });
        };
        u.onerror = (e) => {
          // A reading stopped by the reader is no fault.
          if (e.error === "interrupted" || e.error === "canceled") return;
          tell({ type: "error", token: ask.token, index, message: e.error });
        };
        synth.speak(u);
      }
    },
    stop: async () => synth.cancel(),
    preview: async (ask) => {
      synth.cancel();
      const voice = find(ask.voice, ask.lang);
      const u = new SpeechSynthesisUtterance(ask.text);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? ask.lang;
      u.rate = ask.rate;
      synth.speak(u);
    },
    nowPlaying: async () => {},
    onEvent: listen,
  };
}

/**
 * Whether this device can speak at all, known at once (for drawing Listen
 * before any voice is asked for): in the apps, the shell has the plugin (a
 * shell built before 1.9 has none); in a browser, it has speech.
 */
export function canSpeak(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean; isPluginAvailable?: (name: string) => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return Boolean(cap.isPluginAvailable?.("PurifySpeech"));
  return "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

let browser: SpeechEngine | null | undefined;

/**
 * The speech of this device: the apps' plugin, else the browser's, else null
 * (an app shell built before the plugin, a browser with no speech).
 */
export async function speechEngine(): Promise<SpeechEngine | null> {
  const native = await fromPlugin();
  if (native) return native;
  if (browser === undefined) browser = fromBrowser();
  return browser;
}

/** For tests: forget what was found. */
export function resetSpeechEngine(): void {
  nativeEngine = null;
  browser = undefined;
  listeners.clear();
}
