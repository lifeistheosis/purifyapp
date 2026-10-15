"use client";

import { useSyncExternalStore } from "react";

import { getAmbienceTrack, type AmbienceId } from "@/lib/ambience/ambience";

/**
 * The ambience under the reading (1.7): one sound at a time, looped without a
 * gap through Web Audio (an <audio> element's loop leaves a click at the
 * seam), faded in and out, and kept playing from chapter to chapter. The
 * gain is the volume on every phone, iPhones included, where an <audio>
 * element's volume cannot be set.
 */
const LEVEL = 0.55;
const FADE_IN = 1.4;
const FADE_OUT = 0.8;

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();
let current: AmbienceId | null = null;
let loading: AmbienceId | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function context(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
  }
  return ctx;
}

function bufferFor(src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    const ac = context();
    p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`ambience ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => ac.decodeAudioData(data));
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
}

function fadeOutAndStop(): void {
  if (!ctx || !gain || !source) return;
  const old = source;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + FADE_OUT);
  old.stop(now + FADE_OUT + 0.05);
  source = null;
}

/** Play a sound, or stop with null. Call from a tap: phones start audio only from one. */
export async function playAmbience(id: AmbienceId | null): Promise<void> {
  if (id === current && id !== null) return;
  fadeOutAndStop();
  current = null;
  const track = getAmbienceTrack(id);
  if (!track) {
    loading = null;
    emit();
    return;
  }
  loading = track.id;
  emit();
  const ac = context();
  if (ac.state === "suspended") await ac.resume().catch(() => {});
  try {
    const buffer = await bufferFor(track.src);
    // Another sound was chosen while this one loaded.
    if (loading !== track.id) return;
    const node = ac.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.connect(gain!);
    const now = ac.currentTime;
    gain!.gain.cancelScheduledValues(now);
    gain!.gain.setValueAtTime(0, now);
    gain!.gain.linearRampToValueAtTime(LEVEL, now + FADE_IN);
    node.start(now);
    source = node;
    current = track.id;
  } catch {
    current = null;
  } finally {
    if (loading === track.id) loading = null;
    emit();
  }
}

type Snap = { playing: AmbienceId | null; loading: AmbienceId | null };
let snap: Snap = { playing: null, loading: null };
function read(): Snap {
  if (snap.playing !== current || snap.loading !== loading) snap = { playing: current, loading };
  return snap;
}
const SERVER: Snap = { playing: null, loading: null };

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAmbience(): Snap {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}
