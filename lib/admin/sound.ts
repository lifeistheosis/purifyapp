"use client";

// Sound for the admin panel: a register ka-ching when money moves, a soft tick
// when any other number does.
//
// SYNTHESIZED, NOT SAMPLED, for the same three reasons lib/gifts/chime.ts gives
// and one more. The ambience MP3s were pulled over provenance and the docs
// record it; the Android bundle is already too large; and a sample cannot be
// tuned once it is in the tree. The extra reason here is that this is the admin
// panel, which is stashed out of the native export entirely, so an audio asset
// shipped for it would be dead weight in every reader's download.
//
// OFF BY DEFAULT, and the default matters more than usual. This panel gets
// opened on a phone in a coffee shop and on a laptop in a room with other
// people in it. A dashboard that makes a cash register noise the first time
// somebody opens it is a dashboard they close.
//
// COALESCED. A single poll can change thirty numbers at once. Thirty ticks is
// a burst of noise that says nothing; one tick per settled batch says "the
// board moved". The scheduler below collects everything that changed inside one
// animation frame plus a short tail, then plays at most one ka-ching and one
// tick run for the whole batch, with the ka-ching winning when both are due.

const KEY = "purify.sound.admin";

/** Has the operator turned admin sound on? Default OFF, deliberately. */
export function adminSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private mode: the toggle simply will not persist */
  }
}

export const ADMIN_SOUND_KEY = KEY;

// One context for the page. Constructing one per sound leaks handles fast, and
// browsers cap them: Chrome stops granting new ones somewhere around six.
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // Autoplay policy parks the context until a gesture. Opening the panel is
    // not a gesture, so the first sound after a cold load would be swallowed
    // silently without this.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * One struck partial. `at` is an offset in seconds from now.
 *
 * Triangle rather than sine: a pure sine reads as a test tone, and the odd
 * harmonics of a triangle are what make a small metallic sound legible on a
 * laptop speaker that reproduces nothing below about 200Hz.
 */
function ping(
  c: AudioContext,
  freq: number,
  at: number,
  decay: number,
  gain: number,
  type: OscillatorType = "triangle",
): void {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  // Attack has to be a ramp, not a jump. Setting gain straight to peak puts a
  // step discontinuity in the waveform, which is a click you hear as a defect
  // rather than as the start of the note.
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  osc.connect(amp).connect(c.destination);
  osc.start(t);
  osc.stop(t + decay + 0.02);
}

/**
 * The register. Two bright strikes a beat apart, the second higher, each a
 * fundamental plus a fifth and a double octave.
 *
 * A real till is a bell struck twice by the drawer mechanism, and the second
 * strike is what makes it read as "ka-ching" rather than "ding". The interval
 * is deliberately a rising minor third: it lands as a small piece of good news,
 * which is what a money number going up is.
 */
export function chaChing(): void {
  if (!adminSoundEnabled()) return;
  const c = audio();
  if (!c) return;
  const PEAK = 0.09; // under speech level even at full device volume
  // Strike one.
  ping(c, 1_047, 0, 0.19, PEAK);
  ping(c, 1_568, 0, 0.15, PEAK * 0.5);
  ping(c, 2_093, 0, 0.11, PEAK * 0.28);
  // Strike two, a minor third up, slightly softer and longer.
  ping(c, 1_245, 0.085, 0.34, PEAK * 0.85);
  ping(c, 1_865, 0.085, 0.26, PEAK * 0.42);
  ping(c, 2_490, 0.085, 0.18, PEAK * 0.22);
}

/**
 * The counter tick. One very short, very quiet blip per settled change.
 *
 * Short enough that a run of them reads as a mechanism turning over rather than
 * as a series of separate notes: 45ms of decay is under the roughly 50ms the
 * ear needs to hear two sounds as distinct, so a fast batch blurs into a whirr
 * the way a real split-flap board does.
 */
export function tick(): void {
  if (!adminSoundEnabled()) return;
  const c = audio();
  if (!c) return;
  ping(c, 2_300, 0, 0.045, 0.035, "square");
}

// ── Coalescing ──────────────────────────────────────────────────────────────
// Every Odometer that changes calls in here. The batch is flushed one frame
// later plus a short tail, so a poll that updates the whole board is one sound.

let pendingMoney = false;
let pendingNumber = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Report that a number changed. `money` picks the register over the tick.
 *
 * Money wins the batch outright rather than playing alongside: a ka-ching and a
 * tick together is two sounds for one event, and the ka-ching already carries
 * the news.
 */
export function reportChange(money: boolean): void {
  if (!adminSoundEnabled()) return;
  if (money) pendingMoney = true;
  else pendingNumber = true;
  if (flushTimer !== null) return;
  // 90ms: long enough that a React commit touching many cards lands inside one
  // batch, short enough that the sound still feels attached to the movement.
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const wasMoney = pendingMoney;
    const wasNumber = pendingNumber;
    pendingMoney = false;
    pendingNumber = false;
    if (wasMoney) chaChing();
    else if (wasNumber) tick();
  }, 90);
}
