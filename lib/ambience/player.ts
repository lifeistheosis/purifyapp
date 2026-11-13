"use client";

import { useSyncExternalStore } from "react";

import { getAmbienceTrack, type AmbienceId, type AmbienceTrack } from "@/lib/ambience/ambience";
import { DEFAULT_BALANCE, DEFAULT_VOLUME, clamp01, mixGain, readLevel } from "@/lib/ambience/mix";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";
import { getAudioSnapshot, subscribeAudio } from "@/lib/prayers/persistentAudioStore";

/**
 * The ambience under the reading (1.7): one sound at a time, looped without a
 * gap through Web Audio (an <audio> element's loop leaves a click at the
 * seam), faded in and out, and kept playing from chapter to chapter and on
 * every screen until it is stopped.
 *
 * Two gains, one after the other. Each sound has its own, which fades it in
 * and out, so a switch crossfades and a sleep timer can let it go slowly.
 * The master gain is the reader's level (lib/ambience/mix.ts): the volume,
 * lowered by the balance while the app's player has a voice playing. It
 * follows the voice starting and stopping, and the sliders, over a fraction
 * of a second. Gains are the volume on every phone, iPhones included, where
 * an <audio> element's volume cannot be set.
 *
 * From 1.9 (s2-06 of docs/1.9-build/ideas.json: "layer two sounds, rain and
 * a distant bell, each with its own volume") two sounds can play together:
 * the sheet's tiles each add or take away a layer (layerAmbience), a third
 * taking the place of the one that began first. Each layer has a third gain
 * of its own between its fade and the master, its own volume, kept on the
 * device. playAmbience still plays one sound alone, as the previews and
 * night reading ask.
 */
const FADE_IN = 1.4;
const FADE_OUT = 0.8;
/** The master gain's time constant: it settles about 0.4s after a change. */
const FOLLOW = 0.12;

/** Kept on the device. The "purify.ambience." prefix is the one
 *  lib/onboarding/state.ts already reads as a reader who has used Purify. */
const VOLUME_KEY = "purify.ambience.volume";
const BALANCE_KEY = "purify.ambience.balance";
/** The last sound the reader chose and heard (1.9, s2-09 of docs/1.9-build/ideas.json). */
const LAST_KEY = "purify.ambience.last";
/** Each sound's own volume, while it is one of two (1.9, s2-06): { [id]: 0 to 1 }. */
const LEVELS_KEY = "purify.ambience.levels";

/** How many sounds play together at most. */
export const MAX_LAYERS = 2;
/** A sound's own volume before the reader sets one: all of the master's. */
export const DEFAULT_LEVEL = 1;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** A sound playing: its source, its fade, and its own volume. */
type Layer = { id: AmbienceId; node: AudioBufferSourceNode; fade: GainNode; level: GainNode };
/** The sounds playing, the one that began first first. */
let layers: Layer[] = [];
const buffers = new Map<string, Promise<AudioBuffer>>();

let loading: AmbienceId | null = null;
let failed: AmbienceId | null = null;
/** Why `failed` could not be played (build 95, note 11). */
export type AmbienceFailure = "connection" | "error";
let failedFor: AmbienceFailure | null = null;
let volume = DEFAULT_VOLUME;
let balance = DEFAULT_BALANCE;
/** The last sound the reader chose and heard, kept when it stops: the one to offer again. */
let last: AmbienceId | null = null;
let levels: Partial<Record<AmbienceId, number>> = {};
let primed = false;

/** Whether the app's player has a voice (or a chant) sounding now. */
let voicePlaying = false;
let unwatchVoice: (() => void) | null = null;

const listeners = new Set<() => void>();

type Snap = {
  playing: AmbienceId | null;
  loading: AmbienceId | null;
  /** The sound that could not be played, until another is chosen. */
  failed: AmbienceId | null;
  /**
   * Why: "connection", its file is the website's and the website could not
   * be reached (on the website every sound is; in the apps only a "web"
   * one); "error", anything else (the file, its decoding, the phone). A
   * failure is not kept, so a tap tries again. Null while nothing failed.
   */
  failedFor: AmbienceFailure | null;
  volume: number;
  balance: number;
  /** The last sound the reader chose and heard, playing or not; null before the first. */
  last: AmbienceId | null;
  /** Every sound playing, the one that began first first (1.9); `playing` is the first of them. */
  layers: AmbienceId[];
  /** Each sound's own volume, where the reader has set one. */
  levels: Partial<Record<AmbienceId, number>>;
};
let snap: Snap = { playing: null, loading: null, failed: null, failedFor: null, volume, balance, last, layers: [], levels };

function emit() {
  const ids = layers.map((l) => l.id);
  snap = { playing: ids[0] ?? null, loading, failed, failedFor, volume, balance, last, layers: ids, levels };
  for (const l of listeners) l();
}

/** A sound's own volume: the reader's, or all of the master's. */
function levelOf(id: AmbienceId): number {
  return levels[id] ?? DEFAULT_LEVEL;
}

/** The reader's levels, read once, on first use. */
function prime() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  try {
    volume = readLevel(window.localStorage.getItem(VOLUME_KEY), DEFAULT_VOLUME);
    balance = readLevel(window.localStorage.getItem(BALANCE_KEY), DEFAULT_BALANCE);
    // A sound taken out of the list since is no sound: nothing is offered.
    last = getAmbienceTrack(window.localStorage.getItem(LAST_KEY))?.id ?? null;
    const kept = JSON.parse(window.localStorage.getItem(LEVELS_KEY) ?? "{}") as Record<string, unknown>;
    for (const [id, v] of Object.entries(kept ?? {})) {
      const track = getAmbienceTrack(id);
      if (track && typeof v === "number") levels[track.id] = clamp01(v);
    }
  } catch {
    /* private mode: the defaults */
  }
  snap = { ...snap, volume, balance, last, levels };
}

/** Keep the sound the reader chose, now that it plays. */
function remember(id: AmbienceId) {
  last = id;
  try {
    window.localStorage.setItem(LAST_KEY, id);
  } catch {
    /* private mode: it lasts the session */
  }
}

function context(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = mixGain(volume, balance, voicePlaying);
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Where a sound's file is read from: the bundle's own, or the website's. */
function srcOf(track: AmbienceTrack): string {
  return track.where === "web" ? streamedUrl(track.src) : track.src;
}

/** Whether a sound's file comes over the network: every one on the website, a "web" one in the apps. */
function fromWebsite(track: AmbienceTrack): boolean {
  return track.where === "web" || !isNativeClient();
}

/** The request never reached the file: no signal, or the website did not answer. */
class Unreached extends Error {}

/**
 * Whether an answer carries the file (build 95, note 11). Inside the iPhone
 * app a file of the bundle is answered by the app's shell, and for a sound
 * asked for whole (fetch asks so) the shell sends no HTTP status at all:
 * Capacitor's WebViewAssetHandler.swift answers a media file with a plain
 * URLResponse, WebKit gives that the status 0 (ResourceResponseCocoa.mm),
 * and `ok` is false for any status outside 200 to 299, though every byte
 * has come. Taken as a failure, that put "Could not play" on every sound in
 * the iPhone app. So a status of 0 counts when the answer is the page's own
 * (not an opaque one) and has bytes; the decoding then proves it a sound.
 */
function carriesFile(r: Response): boolean {
  return r.ok || (r.status === 0 && r.type !== "opaque" && r.type !== "opaqueredirect" && r.type !== "error");
}

function bufferFor(ac: AudioContext, src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src, { credentials: "omit" })
      .catch((e: unknown) => {
        throw new Unreached(String(e));
      })
      .then((r) => {
        if (!carriesFile(r)) throw new Error(`ambience ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => {
        if (!data.byteLength) throw new Error("ambience: an empty answer");
        return ac.decodeAudioData(data);
      });
    // A failure is not kept: a reader who comes back online can try again.
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
}

/**
 * The page's audio session: WebKit's, on iPhones and iPads from iOS 17, in
 * Safari and in the app; no other browser has one yet. By default a page's
 * Web Audio is an "ambient" sound, which the ring/silent switch mutes (WebKit
 * bug 237322; the reading voice, an <audio> element, plays as media and is
 * heard). So while a sound the reader chose plays, the session is
 * "playback", as for the voice; once the last has faded, it is given back,
 * so the gift's chime (lib/gifts/chime.ts), which a reader in church keeps
 * on silent, still obeys the switch.
 */
type AudioSessionLike = { type: string };
let sessionBefore: string | null = null;
let sessionTimer: ReturnType<typeof setTimeout> | null = null;
/** When the session is due back (Date.now()), so a later fade is never cut short by an earlier stop. */
let sessionDue = 0;

function audioSession(): AudioSessionLike | null {
  if (typeof navigator === "undefined") return null;
  const s = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  return s && typeof s.type === "string" ? s : null;
}

/** A sound is starting: play as media. Call from the tap, before the context starts. */
function holdSession() {
  if (sessionTimer !== null) clearTimeout(sessionTimer);
  sessionTimer = null;
  const s = audioSession();
  if (!s || s.type === "playback") return;
  try {
    sessionBefore = s.type;
    s.type = "playback";
  } catch {
    sessionBefore = null;
  }
}

/** Once no sound plays or loads, give the session back, after the last fade of `seconds`. */
function releaseSession(seconds: number) {
  if (layers.length || loading || sessionBefore === null) return;
  const due = Date.now() + Math.max(0, seconds) * 1000 + 100;
  if (sessionTimer !== null && due <= sessionDue) return;
  if (sessionTimer !== null) clearTimeout(sessionTimer);
  sessionDue = due;
  sessionTimer = setTimeout(() => {
    sessionTimer = null;
    const s = audioSession();
    if (layers.length || loading || sessionBefore === null || !s) return;
    try {
      s.type = sessionBefore;
    } catch {
      /* the session is the page's again at the next load */
    }
    sessionBefore = null;
  }, due - Date.now());
}

/** Move the master gain to the reader's level, gently. */
function follow() {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.setTargetAtTime(mixGain(volume, balance, voicePlaying), now, FOLLOW);
}

/** While a sound plays, lower it under the voice and raise it after. */
function watchVoice() {
  if (unwatchVoice) return;
  voicePlaying = getAudioSnapshot().playing;
  follow();
  unwatchVoice = subscribeAudio(() => {
    const now = getAudioSnapshot().playing;
    if (now === voicePlaying) return;
    voicePlaying = now;
    follow();
  });
}

function stopWatchingVoice() {
  unwatchVoice?.();
  unwatchVoice = null;
}

/** Let one sound go, over `seconds`. */
function release(layer: Layer, seconds: number) {
  layers = layers.filter((l) => l !== layer);
  if (!ctx) return;
  const { node, fade } = layer;
  const now = ctx.currentTime;
  fade.gain.cancelScheduledValues(now);
  fade.gain.setValueAtTime(fade.gain.value, now);
  fade.gain.linearRampToValueAtTime(0, now + seconds);
  try {
    node.stop(now + seconds + 0.05);
  } catch {
    /* already stopped */
  }
}

/** Let every sound go, over `seconds`. */
function releaseAll(seconds: number) {
  for (const layer of [...layers]) release(layer, seconds);
}

/**
 * Start a sound beside any that play: loaded, then faded in through its own
 * volume. Another tap while it loads (another sound, or a stop) wins.
 */
async function start(track: AmbienceTrack, opts: { remember?: boolean }): Promise<void> {
  loading = track.id;
  failed = null;
  failedFor = null;
  emit();
  try {
    holdSession();
    // Inside the try: a phone that cannot make an AudioContext is told the
    // sound could not play, and is not left on "Loading".
    const ac = context();
    // Suspended, or "interrupted" (WebKit, after a call or Siri): the tap wakes it.
    if (ac.state !== "running") await ac.resume().catch(() => {});
    const buffer = await bufferFor(ac, srcOf(track));
    // Another sound was chosen, or the sound stopped, while this one loaded.
    if (loading !== track.id) return;
    const node = ac.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    const fade = ac.createGain();
    const level = ac.createGain();
    level.gain.value = levelOf(track.id);
    node.connect(fade);
    fade.connect(level);
    level.connect(master!);
    const now = ac.currentTime;
    fade.gain.setValueAtTime(0, now);
    fade.gain.linearRampToValueAtTime(1, now + FADE_IN);
    node.start(now);
    layers.push({ id: track.id, node, fade, level });
    if (opts.remember) remember(track.id);
    watchVoice();
  } catch (e) {
    if (loading === track.id) {
      failed = track.id;
      failedFor = e instanceof Unreached && fromWebsite(track) ? "connection" : "error";
    }
  } finally {
    if (loading === track.id) loading = null;
    releaseSession(0);
    emit();
  }
}

/**
 * Play a sound alone, or stop with null. Call from a tap: phones start audio
 * only from one. `remember`: the reader chose it (the ambience sheet), so
 * once it plays it is the sound offered next time. A Plus preview's minute
 * of a sound, and the sound it gives back after, are not the reader's
 * choice.
 */
export async function playAmbience(id: AmbienceId | null, opts: { remember?: boolean } = {}): Promise<void> {
  prime();
  if (id !== null && layers.length === 1 && layers[0].id === id) return;
  releaseAll(FADE_OUT);
  failed = null;
  failedFor = null;
  const track = getAmbienceTrack(id);
  if (!track) {
    loading = null;
    stopWatchingVoice();
    releaseSession(FADE_OUT);
    emit();
    return;
  }
  await start(track, opts);
}

/**
 * The sheet's tile (1.9): a sound playing stops; any other joins the ones
 * playing, taking the place of the one that began first when two already
 * play. Call from a tap.
 */
export async function layerAmbience(id: AmbienceId, opts: { remember?: boolean } = {}): Promise<void> {
  prime();
  const track = getAmbienceTrack(id);
  if (!track) return;
  const playing = layers.find((l) => l.id === id);
  if (playing || loading === id) {
    if (playing) release(playing, FADE_OUT);
    if (loading === id) loading = null;
    if (!layers.length) stopWatchingVoice();
    releaseSession(FADE_OUT);
    emit();
    return;
  }
  while (layers.length >= MAX_LAYERS) release(layers[0], FADE_OUT);
  await start(track, opts);
}

/** One sound's own volume, 0 to 1, kept on the device (1.9). */
export function setAmbienceLevel(id: AmbienceId, v: number): void {
  prime();
  levels = { ...levels, [id]: clamp01(v) };
  try {
    window.localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
  } catch {
    /* private mode: it lasts the session */
  }
  const layer = layers.find((l) => l.id === id);
  if (ctx && layer) {
    const now = ctx.currentTime;
    layer.level.gain.cancelScheduledValues(now);
    layer.level.gain.setValueAtTime(layer.level.gain.value, now);
    layer.level.gain.setTargetAtTime(levelOf(id), now, FOLLOW);
  }
  emit();
}

/** Stop the ambience. */
export function stopAmbience(): void {
  void playAmbience(null);
}

/** The sound playing now (the first, when two play), read once (the Plus preview gives it back when its minute ends). */
export function getAmbiencePlaying(): AmbienceId | null {
  return layers[0]?.id ?? null;
}

/** Every sound playing now, read once (1.9). */
export function getAmbienceLayers(): AmbienceId[] {
  return layers.map((l) => l.id);
}

/** The last sound the reader chose and heard, read once; null before the first. */
export function getLastAmbience(): AmbienceId | null {
  prime();
  return last;
}

/** Go quiet slowly, every sound: the sleep timer running out (lib/player/sleep.ts). */
export function fadeOutAmbience(seconds: number): void {
  if (!layers.length && !loading) return;
  loading = null;
  releaseAll(seconds);
  stopWatchingVoice();
  releaseSession(seconds);
  emit();
}

/** The volume, 0 to 1, kept on the device. */
export function setAmbienceVolume(v: number): void {
  prime();
  volume = clamp01(v);
  try {
    window.localStorage.setItem(VOLUME_KEY, volume.toFixed(2));
  } catch {
    /* private mode: it lasts the session */
  }
  follow();
  emit();
}

/** The balance against the voice, 0 (the voice) to 1 (the sound), kept on the device. */
export function setAmbienceBalance(b: number): void {
  prime();
  balance = clamp01(b);
  try {
    window.localStorage.setItem(BALANCE_KEY, balance.toFixed(2));
  } catch {
    /* private mode: it lasts the session */
  }
  follow();
  emit();
}

const SERVER: Snap = { playing: null, loading: null, failed: null, failedFor: null, volume: DEFAULT_VOLUME, balance: DEFAULT_BALANCE, last: null, layers: [], levels: {} };

function subscribe(l: () => void) {
  prime();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export type AmbienceSnapshot = Snap;

/** The sounds' state, read once, outside React: the player in Android's shade (lib/player/lockScreen.ts, 1.9). */
export function getAmbienceSnapshot(): AmbienceSnapshot {
  prime();
  return snap;
}

/** Told of every change, outside React; returns the way to stop listening. */
export function subscribeAmbience(listener: () => void): () => void {
  return subscribe(listener);
}

export function useAmbience(): Snap {
  return useSyncExternalStore(subscribe, () => snap, () => SERVER);
}
