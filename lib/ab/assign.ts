// Which version of a test a device shows (1.9): decided on the device, from
// a number that never leaves it (docs/1.9-build/notes/onboarding-fable.md,
// 4.1).
//
// The device draws a random seed once and keeps it. Its arm in a test is
// worked out from the seed and the test's id, so the same device always
// shows the same version of a test, and its arm in one test says nothing of
// its arm in another. The seed is not sent, not copied to an account, and is
// no field of any event: the server's closed list has nowhere to put it.
//
// Pure but for readSeed, so the rule is tested directly
// (lib/ab/__tests__/assign.test.ts).

import type { AbTest } from "./tests";

const SEED_KEY = "purify:ab.seed";

/** FNV-1a over the seed and a word, as a number from 0 up to 1. */
export function fraction(seed: string, word: string): number {
  let h = 0x811c9dc5;
  const s = `${seed}/${word}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // A last stir, so words that differ by one letter land far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 0x1_0000_0000;
}

/**
 * The device's arm in a test, or null when it is not in the test at all
 * (outside the test's share). Two draws from the one seed: whether it is in,
 * and which arm, so widening a test's share never moves a device that was
 * already in from one arm to another.
 *
 * `weights` are the shares the test has learned so far (./bandit.ts), one
 * public setting the same for every device; without them the arms are
 * equal. The device's own draw is laid along the shares in the arms' order,
 * so the choice is still the device's, by a number that never leaves it.
 */
export function armOf(
  test: Pick<AbTest, "id" | "arms" | "share">,
  seed: string,
  weights?: Readonly<Record<string, number>> | null,
): string | null {
  if (!seed || fraction(seed, `${test.id}#in`) >= test.share) return null;
  const draw = fraction(seed, `${test.id}#arm`);
  const w = test.arms.map((arm) => Math.max(0, weights?.[arm] ?? NaN));
  const sum = w.reduce((a, b) => a + b, 0);
  // Shares that are missing, or are not shares: equal arms.
  if (!weights || !(sum > 0) || w.some((x) => Number.isNaN(x))) {
    return test.arms[Math.floor(draw * test.arms.length)] ?? test.arms[0];
  }
  let run = 0;
  for (let i = 0; i < test.arms.length; i++) {
    run += w[i] / sum;
    if (draw < run) return test.arms[i];
  }
  return test.arms[test.arms.length - 1];
}

function newSeed(): string {
  try {
    const n = new Uint32Array(2);
    globalThis.crypto.getRandomValues(n);
    return `${n[0].toString(36)}${n[1].toString(36)}`;
  } catch {
    return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
}

/** The device's seed, drawn the first time it is asked for. Empty where nothing can be kept: such a device is in no test. */
export function readSeed(): string {
  if (typeof window === "undefined") return "";
  try {
    const kept = window.localStorage.getItem(SEED_KEY);
    if (kept) return kept;
    const seed = newSeed();
    window.localStorage.setItem(SEED_KEY, seed);
    return seed;
  } catch {
    return "";
  }
}
