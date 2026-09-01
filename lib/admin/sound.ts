"use client";

// Sound for the admin panel: a register ka-ching when money moves, a soft tick
// when any other number does.
//
// MOSTLY SYNTHESIZED. The register and the tick are oscillators, for the reasons
// lib/gifts/chime.ts gives: the ambience MP3s were pulled over provenance, the
// Android bundle is already too large, and a sample cannot be tuned once it is
// in the tree.
//
// The reel ratchet is the one exception, and it is an exception on the owner's
// instruction: a specific recording, asked for by name. The weight objection is
// answered by trimming rather than by refusing, 156KB down to 1.2KB, and by
// inlining it in a module the native bundle tree-shakes rather than dropping it
// in public/ where it would ship to every reader. See lib/admin/clickSample.ts,
// which also records that the provenance question is NOT settled.
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

import { CLICK_WAV_BASE64 } from "./clickSample";
import { clickGain, clickTimes, thinClicks } from "./reelClicks";

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

// ── The output bus ──────────────────────────────────────────────────────────
//
// EVERYTHING GOES THROUGH HERE, and the reason is the distortion the owner
// reported on the first spin of a page load.
//
// A reel fires one click per digit it passes, and at the start of a spin those
// are about 10ms apart while the sample itself is 26ms long, so roughly three
// overlap at any instant on ONE reel. On a cold load every reel on the board
// mounts in the same commit and starts together, so a five digit figure is
// five of those runs stacked in phase. Fifteen near-identical transients
// summing coherently is not fifteen times quieter than one, it is fifteen
// times louder, and anything past 1.0 is clipped hard by the output stage.
// Clipping a 26ms transient is exactly the sound that was described as super
// distorted, and it was worst on the first spin because that is the one where
// every reel is aligned.
//
// Lowering the per-click gain alone cannot fix this: the safe value would be
// set by the worst case, which is the widest number the panel might ever show,
// and every ordinary spin would then be inaudible. A limiter is the right tool
// because it does nothing at all until the sum actually approaches the ceiling.
//
// The compressor is configured as a LIMITER, not as a compressor: a high ratio
// and a fast attack so peaks are caught, with the threshold set high enough
// that a single click passes through completely untouched.
let bus: GainNode | null = null;
function output(c: AudioContext): GainNode {
  if (bus && bus.context === c) return bus;
  const g = c.createGain();
  g.gain.value = 0.9;
  const limiter = c.createDynamicsCompressor();
  // -6dBFS: a lone click peaks at -23 and a ka-ching at -21, so neither ever
  // reaches this. Only a pile-up does, which is the only thing being caught.
  limiter.threshold.setValueAtTime(-6, c.currentTime);
  // A hard knee. A soft one would round the tops of ordinary sounds too and
  // the ratchet would lose the attack that makes it read as a mechanism.
  limiter.knee.setValueAtTime(0, c.currentTime);
  limiter.ratio.setValueAtTime(20, c.currentTime);
  // 1ms, because the thing being caught IS the attack. A slower one lets the
  // first millisecond of the pile-up through unlimited, which is the part that
  // clips.
  limiter.attack.setValueAtTime(0.001, c.currentTime);
  // Long enough not to pump between clicks 10ms apart, short enough to recover
  // before the reel finishes.
  limiter.release.setValueAtTime(0.12, c.currentTime);
  g.connect(limiter).connect(c.destination);
  bus = g;
  return g;
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
  osc.connect(amp).connect(output(c));
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
  // A REAL REGISTER IF WE HAVE ONE. The owner supplied a recording and asked
  // for it on sales and money, so the synthesised bell below is now the
  // fallback rather than the sound. It stays, and it is not dead code: the
  // recording is fetched over the network, and a money figure moving while
  // that request is in flight, or after it has failed, still has to make a
  // noise. Falling silent on a sale would be the worse failure.
  if (playRegister(c)) return;
  synthChaChing(c);
}

/** The oscillator register. See chaChing: this is the fallback path now. */
function synthChaChing(c: AudioContext): void {
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

// ── The register recording ──────────────────────────────────────────────────
//
// A FILE, NOT A BASE64 MODULE, and that is a deliberate departure from
// lib/admin/clickSample.ts. Inlining is right for 1.2KB and wrong for 56KB:
// base64 costs a third again in size, lands inside a JS chunk that cannot be
// cached or replaced independently, and would be parsed by every admin page
// load whether or not sound is even switched on.
//
// The objection inlining answers is that public/ ships wholesale to every
// reader in the native bundle. That is answered here instead by
// scripts/native-build.mjs, which stashes public/admin-audio out of the export
// exactly as it stashes app/admin. Readers never download it.
//
// LAZY, AND ONLY ONCE SOUND IS ON. Nothing is fetched until the operator has
// actually enabled sound, so an admin page load costs nothing extra.

const REGISTER_URL = "/admin-audio/register.mp3";
/** Peak of the loudest moment of the register, as a real output level. */
const REGISTER_PEAK = 0.5;

let registerBuffer: AudioBuffer | null = null;
let registerNormalise = 1;
let registerPending: Promise<AudioBuffer | null> | null = null;
/** True once the fetch has failed, so a dead URL is not retried per sale. */
let registerFailed = false;

function loadRegister(c: AudioContext): Promise<AudioBuffer | null> {
  if (registerBuffer) return Promise.resolve(registerBuffer);
  if (registerPending) return registerPending;
  registerPending = (async () => {
    try {
      const res = await fetch(REGISTER_URL, { cache: "force-cache" });
      if (!res.ok) throw new Error(`register ${res.status}`);
      const buf = await c.decodeAudioData(await res.arrayBuffer());
      // Normalised the same way the click is, and for the same reason: a
      // recording's own level is arbitrary, so multiplying a constant into it
      // means the constant describes nothing. See CLICK_PEAK, where getting
      // this wrong made the ratchet 23dB too quiet and inaudible.
      const pcm = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < pcm.length; i++) {
        const v = Math.abs(pcm[i]);
        if (v > peak) peak = v;
      }
      registerNormalise = peak > 0.01 ? peak : 1;
      registerBuffer = buf;
      return buf;
    } catch (e) {
      console.warn("[admin sound] register would not load", e);
      registerFailed = true;
      return null;
    }
  })();
  return registerPending;
}

/**
 * Play the register recording if it is already decoded.
 *
 * Returns whether it played, SYNCHRONOUSLY, because the caller has to decide
 * between this and the synthesised bell right now: awaiting the load would
 * either delay the sound past the moment it belongs to or play both.
 *
 * The first money event after sound is switched on therefore gets the
 * oscillator while this warms up, and every one after it gets the recording.
 */
function playRegister(c: AudioContext): boolean {
  if (registerFailed) return false;
  if (!registerBuffer) {
    void loadRegister(c);
    return false;
  }
  const src = c.createBufferSource();
  const amp = c.createGain();
  src.buffer = registerBuffer;
  amp.gain.setValueAtTime(REGISTER_PEAK / registerNormalise, c.currentTime);
  src.connect(amp).connect(output(c));
  src.start();
  return true;
}

/** Warm the register up so the first real sale is not the fallback bell. */
export function primeRegister(): void {
  if (!adminSoundEnabled()) return;
  const c = audio();
  if (c) void loadRegister(c);
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

// ── The reel ratchet ────────────────────────────────────────────────────────

let clickBuffer: AudioBuffer | null = null;
let clickPending: Promise<AudioBuffer | null> | null = null;

/**
 * The decoded sample's own peak amplitude, 0..1, measured once.
 *
 * THIS IS WHY THE RATCHET WAS SILENT. The trimmed WAV peaks at about 0.25,
 * roughly -12 dBFS, because it is a slice of a field recording and was never
 * normalised. CLICK_PEAK was being multiplied straight into that, so a
 * "peak 0.05" click actually left the mixer at 0.0063, about -44 dBFS: some
 * 23 dB under the ka-ching beside it and far below anything audible over a
 * room. The bug was invisible from the code because the constant looked
 * reasonable; only the sample's own amplitude gave it away.
 *
 * Dividing by this makes CLICK_PEAK mean what it says, an actual output peak,
 * and keeps it meaning that if the sample is ever replaced, which the
 * provenance note in clickSample.ts says it may have to be.
 */
let clickNormalise = 1;

/** Decode the inlined click once, and remember the promise so a dashboard of
 *  reels asking at the same moment decodes it once rather than five times. */
function loadClick(c: AudioContext): Promise<AudioBuffer | null> {
  if (clickBuffer) return Promise.resolve(clickBuffer);
  if (clickPending) return clickPending;
  clickPending = (async () => {
    try {
      const bin = atob(CLICK_WAV_BASE64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      clickBuffer = await c.decodeAudioData(bytes.buffer);
      const pcm = clickBuffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < pcm.length; i++) {
        const v = Math.abs(pcm[i]);
        if (v > peak) peak = v;
      }
      // Guard a silent or near-silent buffer: dividing by ~0 would ask for a
      // gain of thousands and blow the operator's ears off.
      clickNormalise = peak > 0.01 ? peak : 1;
      return clickBuffer;
    } catch (e) {
      console.warn("[admin sound] click sample would not decode", e);
      return null;
    }
  })();
  return clickPending;
}

/**
 * Wait, briefly, for a context to actually be running.
 *
 * audio() calls resume() but resume() is ASYNCHRONOUS, so a caller inside a
 * click handler can find state still "suspended" on the very next line even
 * though the gesture will unlock it a moment later. Checking state alone
 * therefore drops the first run after the operator turns sound on, which is
 * the one run they are listening for.
 *
 * Bounded, because the other case is a cold page load with no gesture at all,
 * where resume() never resolves and waiting forever would leak a pending
 * promise per reel. 120ms is far longer than an unlock takes and far shorter
 * than the spin it belongs to.
 */
async function running(c: AudioContext): Promise<boolean> {
  // Read through a widened accessor. Comparing c.state directly narrows the
  // type after the first check, and tsc then rejects every later comparison
  // against "running" as having no overlap, which is true of the static type
  // and false of the value: the whole point is that it changes underneath us.
  const state = (): string => c.state;
  if (state() === "running") return true;
  void c.resume();
  // One self-terminating poll rather than a race against a timer. A race
  // leaves the losing side running: the polling chain would keep re-arming
  // every 10ms forever on a context that never unlocks, once per wheel per
  // mount, which on a board of five-digit reels is a lot of dead timers.
  const deadline = performance.now() + 120;
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (state() === "running" || performance.now() >= deadline) resolve();
      else setTimeout(tick, 10);
    };
    tick();
  });
  return state() === "running";
}

/**
 * Fire one click per digit as a reel spins past it.
 *
 * SCHEDULED, NOT TICKED. Every click is placed on the audio clock up front,
 * at the offsets lib/admin/reelClicks.ts solved from the same cubic-bezier the
 * CSS animation uses. WebAudio keeps its own clock in the audio thread, so the
 * run stays aligned with the animation even while the main thread is busy
 * rendering a poll. A setInterval or a rAF loop would drift exactly when the
 * dashboard is doing its most work, which is when the reels are spinning.
 *
 * The decode is async and the spin has already started by the time it lands on
 * a cold context, so `startedAt` anchors the schedule to when the animation
 * actually began. Clicks already in the past are dropped rather than fired
 * late in a burst.
 */
export function scheduleReelClicks(
  offsetsMs: number[],
  gains: number[],
  startedAt: number,
  /**
   * Pitch offset for this reel, in cents. Small, and it matters.
   *
   * Five reels playing the SAME 26ms sample at the same pitch sum into one
   * timbre, so a board of them reads as a single buzzy source rather than five
   * mechanisms. A few percent of detune per column is what separates them, and
   * it is what a real machine has anyway: no two reels are built identically.
   * Deterministic per column, so a reel sounds the same on every spin.
   */
  detuneCents = 0,
): void {
  if (!adminSoundEnabled() || offsetsMs.length === 0) return;
  const c = audio();
  if (!c) return;
  void loadClick(c).then(async (buf) => {
    if (!buf || !adminSoundEnabled()) return;
    // A SUSPENDED CONTEXT CANNOT BE SCHEDULED INTO. The reels animate on
    // mount, which on a cold load is before any gesture, so the autoplay
    // policy still has the context parked. currentTime does not advance while
    // it is parked, so every offset computed below lands in the past and the
    // guard drops the lot: a whole ratchet, scheduled and discarded.
    //
    // Nothing can be done about that first spin, and no browser will let it
    // be: audio before a gesture is forbidden. Every spin after the operator
    // touches anything is fine, which is what running() is for.
    if (!(await running(c))) return;
    // How far into the spin we already are, in seconds.
    const elapsed = (performance.now() - startedAt) / 1000;
    const base = c.currentTime - elapsed;
    for (let i = 0; i < offsetsMs.length; i++) {
      const at = base + offsetsMs[i] / 1000;
      // Past crossings are gone. Firing them now would stack a dozen clicks on
      // one instant, which is a clack rather than a ratchet.
      if (at < c.currentTime) continue;
      const src = c.createBufferSource();
      const amp = c.createGain();
      src.buffer = buf;
      if (detuneCents !== 0) src.detune.setValueAtTime(detuneCents, at);
      amp.gain.setValueAtTime(
        (Math.max(0.0001, gains[i] ?? 0.3) * CLICK_PEAK) / clickNormalise,
        at,
      );
      src.connect(amp).connect(output(c));
      src.start(at);
    }
  });
}

/**
 * Output level for a click at clickGain 1.0, as a real amplitude.
 *
 * Normalised by clickNormalise above, so this is what actually reaches the
 * mixer rather than a number multiplied into an unknown sample level.
 *
 * READ THE FACTOR OF TWO. clickGain in reelClicks.ts runs from 0.5 down to
 * 0.16 across a spin, never 1.0, so the LOUDEST click in a run comes out at
 * half of this: 0.055, about -25 dBFS, against the register's 0.09 at -20.9.
 * That is the relationship wanted, since a 26ms transient reads as louder
 * than a bell ringing for 340ms at the same peak. The quietest click at the
 * end of a run lands near -33 dBFS.
 *
 * Two earlier values are worth keeping as warnings. 0.05 UNNORMALISED came
 * out at -44 dBFS and could not be heard at all. 0.07 normalised looked right
 * on paper but forgot the clickGain ceiling and measured -29, still 8 dB under
 * the register. Both times the arithmetic was checked and the OUTPUT was not.
 * If this is retuned, measure the decoded peak times the gain, do not reason
 * about the constant alone.
 */
const CLICK_PEAK = 0.14;

/**
 * Play one representative ratchet, on demand.
 *
 * The Sound toggle plays this when it is switched on, next to the register.
 * Until it did, the only sound on enabling was the ka-ching, so an operator
 * could turn sound on, hear the bell, conclude sound worked, and still never
 * once hear the reel clicks: those only fire on a spin, and the spin they
 * would have heard is the one on page load that the autoplay policy has
 * already eaten. That is exactly how a ratchet running 23 dB too quiet went
 * unnoticed.
 *
 * Uses the real solver rather than an evenly spaced burst, so what the
 * operator hears when they enable sound is what a spin actually sounds like.
 */
export function reelDemo(): void {
  if (!adminSoundEnabled()) return;
  // A mid-length run: enough clicks to hear the deceleration, short enough to
  // sit under the ka-ching playing beside it.
  const times = thinClicks(clickTimes(20, 1_100));
  scheduleReelClicks(
    times,
    times.map((_, i) => clickGain(i, times.length)),
    performance.now(),
  );
}
