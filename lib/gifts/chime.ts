"use client";

// A struck-bell tone for the gift box, synthesized at play time.
//
// Deliberately NOT an audio file. Purify's ambience MP3s were removed over
// provenance (docs record it), and the Android bundle is already far too
// large, so shipping another sample would reopen both problems. An oscillator
// stack costs zero bytes, carries no licensing question, and cannot be the
// wrong recording.
//
// A real bell is a fundamental plus inharmonic partials that decay at
// different rates, the higher ones fastest. Four partials is enough to read as
// "struck bronze" rather than "beep", and the ratios below are the classic
// minor-third bell set. Grander gifts get more partials, a longer tail, and a
// second strike.
//
// Opt-in only (see GIFT_SOUND_KEY) and always quiet: peak gain is 0.12, so it
// sits under speech volume even at full device volume.

export const GIFT_SOUND_KEY = "purify.sound.gift";

/** Has the reader turned the gift sound on? Default OFF, deliberately: a
 * prayer app is opened in church, in bed, at 5am. */
export function giftSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(GIFT_SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGiftSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(GIFT_SOUND_KEY, on ? "1" : "0");
  } catch {
    /* private mode: the toggle simply won't persist */
  }
}

/** Inharmonic partials of a struck bell, as ratios of the fundamental. */
const PARTIALS = [1, 2, 2.4, 3, 4.2];

type Ctor = typeof AudioContext;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C: Ctor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!C) return null;
  try {
    return new C();
  } catch {
    return null;
  }
}

function strike(
  ctx: AudioContext,
  at: number,
  fundamental: number,
  partials: number,
  decay: number,
  peak: number,
): void {
  for (let i = 0; i < partials; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    // Slight detune keeps it from sounding synthetic and dead.
    osc.frequency.value = fundamental * PARTIALS[i] * (1 + (i % 2 ? 0.002 : -0.002));

    // Higher partials are quieter and die away faster, as on real bronze.
    const level = peak / (i + 1.6);
    const tail = decay / (1 + i * 0.55);

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tail);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + tail + 0.05);
  }
}

/**
 * Play the chime for a gift of `level` (1-5). No-op when the reader has not
 * opted in, when Web Audio is unavailable, or when anything throws — sound is
 * never allowed to break the claim.
 *
 * MUST be called synchronously from the Claim tap: autoplay policy only lets
 * a context start inside a user gesture. `delaySec` then lines the strike up
 * with the seal breaking, scheduled on Web Audio's own clock rather than a
 * setTimeout, which would both drift and land outside the gesture.
 */
export function playGiftChime(level: number, delaySec = 0): void {
  if (!giftSoundEnabled()) return;
  const ctx = audioContext();
  if (!ctx) return;

  try {
    void ctx.resume?.();
    const now = ctx.currentTime + 0.02 + Math.max(0, delaySec);

    // Grander gifts: lower, fuller, longer, and struck twice.
    const fundamental = 523.25 - Math.min(4, level) * 22; // C5 down toward A4
    const partials = Math.min(PARTIALS.length, 2 + level);
    const decay = 1.5 + level * 0.42;

    strike(ctx, now, fundamental, partials, decay, 0.12);

    // The great reliquary answers itself an octave up, softly.
    if (level >= 5) {
      strike(ctx, now + 0.34, fundamental * 2, 3, decay * 0.55, 0.05);
    }

    // Release the context once the tail has run, so repeated claims don't
    // leak audio contexts (browsers cap them).
    const total = (Math.max(0, delaySec) + decay + 0.6) * 1000;
    window.setTimeout(() => void ctx.close().catch(() => {}), total);
  } catch {
    void ctx.close?.().catch(() => {});
  }
}
