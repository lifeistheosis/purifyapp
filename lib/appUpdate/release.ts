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
  versionName: "1.1",
  androidStoreUrl:
    "https://play.google.com/store/apps/details?id=net.purifyapp.purify",
  // The real Adam ID, from the App Store Connect record created 2026-08-06
  // ("Purify: Orthodox Hub", bundle net.purifyapp.purify). Apple does not
  // resolve a listing from the slug, so this numeric id is the only form that
  // works. Still unreachable until iosBuildNumber rises above 0, because
  // checkForUpdate returns before reading it.
  iosStoreUrl: "https://apps.apple.com/app/id6798897857",
};
