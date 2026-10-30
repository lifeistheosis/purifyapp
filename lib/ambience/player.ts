"use client";

import { useSyncExternalStore } from "react";

import { getAmbienceTrack, type AmbienceId, type AmbienceTrack } from "@/lib/ambience/ambience";
import { DEFAULT_BALANCE, DEFAULT_VOLUME, clamp01, mixGain, readLevel } from "@/lib/ambience/mix";
import { streamedUrl } from "@/lib/media/streamed";
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
 */
const FADE_IN = 1.4;
const FADE_OUT = 0.8;
/** The master gain's time constant: it settles about 0.4s after a change. */
const FOLLOW = 0.12;

/** Kept on the device. The "purify.ambience." prefix is the one
 *  lib/onboarding/state.ts already reads as a reader who has used Purify. */
const VOLUME_KEY = "purify.ambience.volume";
const BALANCE_KEY = "purify.ambience.balance";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voice: { node: AudioBufferSourceNode; fade: GainNode } | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

let current: AmbienceId | null = null;
let loading: AmbienceId | null = null;
let failed: AmbienceId | null = null;
let volume = DEFAULT_VOLUME;
let balance = DEFAULT_BALANCE;
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
  volume: number;
  balance: number;
};
let snap: Snap = { playing: null, loading: null, failed: null, volume, balance };

function emit() {
  snap = { playing: current, loading, failed, volume, balance };
  for (const l of listeners) l();
}

/** The reader's levels, read once, on first use. */
function prime() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  try {
    volume = readLevel(window.localStorage.getItem(VOLUME_KEY), DEFAULT_VOLUME);
    balance = readLevel(window.localStorage.getItem(BALANCE_KEY), DEFAULT_BALANCE);
  } catch {
    /* private mode: the defaults */
  }
  snap = { ...snap, volume, balance };
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

function bufferFor(src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    const ac = context();
    p = fetch(src, { credentials: "omit" })
      .then((r) => {
        if (!r.ok) throw new Error(`ambience ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => ac.decodeAudioData(data));
    // A failure is not kept: a reader who comes back online can try again.
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
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

/** Let the sound playing now go, over `seconds`. */
function release(seconds: number) {
  if (!ctx || !voice) return;
  const { node, fade } = voice;
  const now = ctx.currentTime;
  fade.gain.cancelScheduledValues(now);
  fade.gain.setValueAtTime(fade.gain.value, now);
  fade.gain.linearRampToValueAtTime(0, now + seconds);
  try {
    node.stop(now + seconds + 0.05);
  } catch {
    /* already stopped */
  }
  voice = null;
}

/** Play a sound, or stop with null. Call from a tap: phones start audio only from one. */
export async function playAmbience(id: AmbienceId | null): Promise<void> {
  prime();
  if (id !== null && id === current) return;
  release(FADE_OUT);
  current = null;
  failed = null;
  const track = getAmbienceTrack(id);
  if (!track) {
    loading = null;
    stopWatchingVoice();
    emit();
    return;
  }
  loading = track.id;
  emit();
  const ac = context();
  if (ac.state === "suspended") await ac.resume().catch(() => {});
  try {
    const buffer = await bufferFor(srcOf(track));
    // Another sound was chosen, or the sound stopped, while this one loaded.
    if (loading !== track.id) return;
    const node = ac.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    const fade = ac.createGain();
    node.connect(fade);
    fade.connect(master!);
    const now = ac.currentTime;
    fade.gain.setValueAtTime(0, now);
    fade.gain.linearRampToValueAtTime(1, now + FADE_IN);
    node.start(now);
    voice = { node, fade };
    current = track.id;
    watchVoice();
  } catch {
    current = null;
    if (loading === track.id) failed = track.id;
  } finally {
    if (loading === track.id) loading = null;
    emit();
  }
}

/** Stop the ambience. */
export function stopAmbience(): void {
  void playAmbience(null);
}

/** The sound playing now, read once (the Plus preview gives it back when its minute ends). */
export function getAmbiencePlaying(): AmbienceId | null {
  return current;
}

/** Go quiet slowly: the sleep timer running out (lib/player/sleep.ts). */
export function fadeOutAmbience(seconds: number): void {
  if (!voice && !loading) return;
  loading = null;
  release(seconds);
  current = null;
  stopWatchingVoice();
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

const SERVER: Snap = { playing: null, loading: null, failed: null, volume: DEFAULT_VOLUME, balance: DEFAULT_BALANCE };

function subscribe(l: () => void) {
  prime();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAmbience(): Snap {
  return useSyncExternalStore(subscribe, () => snap, () => SERVER);
}
