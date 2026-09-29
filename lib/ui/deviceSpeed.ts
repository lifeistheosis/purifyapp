// Is this phone too slow to animate smoothly?
//
// The phone apps keep their motion whatever the OS hint says (the owner's
// decision of 2026-09-29, see ./motionPreference.ts), with one exception: a
// device that cannot draw it smoothly. A rise that stutters reads as broken,
// so there the app goes still instead.
//
// Two inputs. Before anything is measured, the hardware hints: 2 GB of
// memory or less (Android reports it, iPhones do not) or two cores or fewer.
// Then, once, when the app has settled and is on screen, a short sample of
// frames: if the typical frame takes longer than SLOW_FRAME_MS the phone is
// slow. The verdict is kept on the device and taken again now and then, so a
// phone that happened to be busy the first time gets another look.
//
// Pure where it can be, so the verdict is tested directly
// (lib/ui/__tests__/deviceSpeed.test.ts). The pre-paint script
// (./motionPrepaint.ts) reads the same two keys before the first paint.

/** "slow" or "ok"; absent until measured. */
export const DEVICE_SPEED_KEY = "purify.motion.device";
/** When the verdict was taken, in ms since the epoch. */
export const DEVICE_SPEED_AT_KEY = "purify.motion.device.at";

export type DeviceSpeed = "slow" | "ok";

/** About 42 frames a second: below this a slide or a rise visibly stutters. */
export const SLOW_FRAME_MS = 24;
/** Frames to sample: a second and a half at 60 Hz. */
export const SAMPLE_FRAMES = 90;
/** Wait for the app to settle first, so hydration is not what gets measured. */
export const START_DELAY_MS = 4000;
/** A good verdict stands for a week; a slow one is retried the next day. */
export const REMEASURE_OK_MS = 7 * 24 * 60 * 60 * 1000;
export const REMEASURE_SLOW_MS = 24 * 60 * 60 * 1000;

export function isDeviceSpeed(v: unknown): v is DeviceSpeed {
  return v === "slow" || v === "ok";
}

/** The hardware hints, for a device not yet measured. */
export function hintSlow(nav: { deviceMemory?: number; hardwareConcurrency?: number }): boolean {
  const mem = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  return (
    (typeof mem === "number" && mem > 0 && mem <= 2) ||
    (typeof cores === "number" && cores > 0 && cores <= 2)
  );
}

/**
 * The verdict from a run of frame intervals, in ms. The median, so one long
 * frame from a garbage collection does not condemn a good phone. Null when
 * there is too little to go on.
 */
export function classifyFrames(intervals: readonly number[]): DeviceSpeed | null {
  const xs = intervals.filter((x) => Number.isFinite(x) && x > 0 && x < 1000).sort((a, b) => a - b);
  if (xs.length < 30) return null;
  const median = xs[Math.floor(xs.length / 2)];
  return median > SLOW_FRAME_MS ? "slow" : "ok";
}

/** Whether a stored verdict is old enough to take again. */
export function isStale(speed: DeviceSpeed | null, at: number, now: number): boolean {
  if (!speed || !Number.isFinite(at) || at <= 0) return true;
  return now - at > (speed === "slow" ? REMEASURE_SLOW_MS : REMEASURE_OK_MS);
}

/** Measured verdict first; the hardware hints only while there is none. */
export function slowFrom(stored: DeviceSpeed | null, nav: { deviceMemory?: number; hardwareConcurrency?: number }): boolean {
  if (stored) return stored === "slow";
  return hintSlow(nav);
}

export function readDeviceSpeed(): DeviceSpeed | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(DEVICE_SPEED_KEY);
    return isDeviceSpeed(v) ? v : null;
  } catch {
    return null;
  }
}

/** True when this device should not animate. Browser only; false on the server. */
export function isSlowDevice(): boolean {
  if (typeof window === "undefined") return false;
  return slowFrom(readDeviceSpeed(), navigator as Navigator & { deviceMemory?: number });
}

function writeDeviceSpeed(speed: DeviceSpeed): void {
  try {
    window.localStorage.setItem(DEVICE_SPEED_KEY, speed);
    window.localStorage.setItem(DEVICE_SPEED_AT_KEY, String(Date.now()));
  } catch {
    /* storage shut: the hints keep deciding */
  }
}

/**
 * Take the measurement if it is due, then call `onVerdict`. Browser only.
 * Samples only while the page is on screen; a hidden page gives up and tries
 * at the next launch. Returns a cancel function.
 */
export function checkDeviceSpeed(onVerdict: () => void): () => void {
  if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") return () => {};
  let at = 0;
  try {
    at = Number(window.localStorage.getItem(DEVICE_SPEED_AT_KEY) ?? 0);
  } catch {
    return () => {};
  }
  if (!isStale(readDeviceSpeed(), at, Date.now())) return () => {};

  let cancelled = false;
  let raf = 0;
  const timer = window.setTimeout(() => {
    if (cancelled || document.visibilityState !== "visible") return;
    const intervals: number[] = [];
    let last = 0;
    const step = (t: number) => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (last) intervals.push(t - last);
      last = t;
      if (intervals.length < SAMPLE_FRAMES) {
        raf = requestAnimationFrame(step);
        return;
      }
      const verdict = classifyFrames(intervals);
      if (verdict) {
        writeDeviceSpeed(verdict);
        onVerdict();
      }
    };
    raf = requestAnimationFrame(step);
  }, START_DELAY_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (raf) cancelAnimationFrame(raf);
  };
}
