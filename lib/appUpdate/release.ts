/**
 * The release the store is currently serving.
 *
 * This is the ONE place the current shipped build is declared. The native app
 * compares the version it is running against this and offers an update.
 *
 * Why it lives in the repo rather than in a database: the answer changes
 * exactly once per release, in the same commit that bumps the four version
 * identifiers, and a value that only moves on a deploy has no business being
 * a row someone can forget to write.
 *
 * RELEASE RITUAL. `androidVersionCode` must be the versionCode of the build
 * actually promoted on Play, which CI derives from the workflow run number
 * (see android/app/build.gradle). It is NOT the versionName. Leaving it
 * behind the shipped build is harmless (nobody is prompted); pushing it
 * ahead of the shipped build prompts every reader to fetch an update that
 * does not exist yet, which is the one failure mode worth being careful of.
 * So: bump this AFTER the AAB is live on the track, not before.
 */

export type ReleaseInfo = {
  /** Play versionCode of the current release. 0 disables the prompt entirely. */
  androidVersionCode: number;
  /**
   * iOS CFBundleVersion of the current release, which the workflow derives from
   * its own run number exactly as Android does. 0 disables the prompt.
   *
   * Its own counter, not shared with Android: the two workflows have separate
   * run numbers, and App Store Connect only requires the build number to
   * increase within a CFBundleShortVersionString train.
   */
  iosBuildNumber: number;
  /** Human version, shown to the reader. */
  versionName: string;
  /** Store listing. Android app links hand this to the Play app. */
  androidStoreUrl: string;
  /** Store listing. iOS opens this in the App Store app. */
  iosStoreUrl: string;
};

export const CURRENT_RELEASE: ReleaseInfo = {
  // Both 0 until 1.0 is actually live on each store, and they move
  // independently: Play and the App Store will not promote on the same day, and
  // whichever lands first should start prompting without waiting for the other.
  // Nobody is prompted while a number is 0, which is the correct state for a
  // release that is still held.
  androidVersionCode: 0,
  iosBuildNumber: 0,
  versionName: "1.3",
  androidStoreUrl:
    "https://play.google.com/store/apps/details?id=net.purifyapp.purify",
  // The real Adam ID, from the App Store Connect record created 2026-08-06
  // ("Purify: Orthodox Hub", bundle net.purifyapp.purify). Apple does not
  // resolve a listing from the slug, so this numeric id is the only form that
  // works. Still unreachable until iosBuildNumber rises above 0, because
  // checkForUpdate returns before reading it.
  iosStoreUrl: "https://apps.apple.com/app/id6798897857",
};

/**
 * The release record as it should actually be SERVED, env overrides applied.
 *
 * ── Why an override exists at all ───────────────────────────────────────
 *
 * androidVersionCode and iosBuildNumber are 0 in the constant above, which
 * means nobody is prompted to update. That is the correct resting state for an
 * unreleased branch, and it is also a state the panel can sit in forever
 * without anybody noticing: nothing surfaces it, and the only way out was a
 * code edit, a commit and a deploy, performed at the exact moment a store
 * approval lands. In practice that moment is a weekday afternoon and the
 * numbers stayed at 0.
 *
 * These read the number a store is actually serving, so it can be set from the
 * host's environment the hour approval comes through, with no deploy. The
 * release ritual in AGENTS.md is unchanged; this is another way to perform the
 * same step, and the constant above remains the committed record.
 *
 * ── Why it cannot be set carelessly ─────────────────────────────────────
 *
 * Setting these too early is the harmful direction: every installed app is
 * told a newer build exists and sent to a store listing that does not have it.
 * So a value is only honoured when it parses as a positive integer, and an
 * unparseable one falls back to the committed constant rather than to
 * something surprising. Late is harmless, early is not.
 *
 * iOS additionally will not rise while iosStoreUrl is a placeholder. That rule
 * is held by lib/appUpdate/__tests__/release.test.ts against the constant, and
 * it is repeated here because an env var bypasses the constant entirely.
 */
function positiveIntFromEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.warn(`[release] ${name}=${raw} is not a positive integer, ignoring`);
    return null;
  }
  return n;
}

export function servedRelease(): ReleaseInfo {
  const android = positiveIntFromEnv("ANDROID_VERSION_CODE");
  const ios = positiveIntFromEnv("IOS_BUILD_NUMBER");
  const iosPlaceholder = !/id\d{6,}/.test(CURRENT_RELEASE.iosStoreUrl);
  if (ios !== null && iosPlaceholder) {
    console.warn(
      "[release] IOS_BUILD_NUMBER set while iosStoreUrl is a placeholder, ignoring",
    );
  }
  return {
    ...CURRENT_RELEASE,
    androidVersionCode: android ?? CURRENT_RELEASE.androidVersionCode,
    iosBuildNumber:
      ios !== null && !iosPlaceholder ? ios : CURRENT_RELEASE.iosBuildNumber,
  };
}
