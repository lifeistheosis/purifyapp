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
  /** Human version, shown to the reader. */
  versionName: string;
  /** Store listing. Android app links hand this to the Play app. */
  androidStoreUrl: string;
};

export const CURRENT_RELEASE: ReleaseInfo = {
  // 0 until Beta 3.0 is actually promoted on Play. Nobody is prompted while
  // this is 0, which is the correct state for a release that is still held.
  androidVersionCode: 0,
  versionName: "Beta 3.0",
  androidStoreUrl:
    "https://play.google.com/store/apps/details?id=net.purifyapp.purify",
};
