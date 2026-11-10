// How many readers a test needs (1.9; docs/1.9-build/notes/onboarding-fable.md,
// 4.3). A test names this number before it starts (./tests.ts, `needs`), so
// nobody stops one early because it looks good on a Wednesday.

/**
 * Readers per arm to tell a rate of `from` from a rate of `to`, at the usual
 * 5% threshold (two-sided) with 80% power: the normal approximation for two
 * proportions. With Purify's numbers only a large difference is findable,
 * which is the point of asking before a test is written.
 */
export function readersPerArm(from: number, to: number): number {
  if (!(from > 0 && from < 1 && to > 0 && to < 1) || from === to) return Infinity;
  const z = 1.959964 + 0.841621;
  return Math.ceil((z * z * (from * (1 - from) + to * (1 - to))) / (from - to) ** 2);
}
