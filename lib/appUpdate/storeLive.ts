// Is each store actually open?
//
// WHY THIS EXISTS
//
// The marketing home advertised "1.0 · Purify on iPhone" above the fold while
// iOS 1.0 build 12 sat in WAITING_FOR_REVIEW and was not approved. There is no
// listing behind an App Store badge until Apple promotes the build, so anyone
// who followed it reached nothing.
//
// The release record already knows this. lib/appUpdate/release.ts sets a store's
// number to 0 while its release is held, and says so in its own comment: nobody
// is prompted while a number is 0. That fact was available and simply not read
// by any marketing surface.
//
// So: one predicate, derived from the same record that governs update prompts,
// so a store link and an update prompt can never disagree about whether a store
// is open. Any surface that offers a download asks here first.
//
// This is deliberately NOT a NEXT_PUBLIC_ flag. A flag is a second source of
// truth that has to be remembered at flip time; this reads the number that the
// release ritual already requires you to set (AGENTS.md step 1a). Setting the
// build number IS opening the store.

import { CURRENT_RELEASE } from "./release";

/** Play has promoted a build, so the Android listing resolves. */
export const ANDROID_STORE_LIVE = CURRENT_RELEASE.androidVersionCode > 0;

/** Apple has promoted a build, so the App Store listing resolves. */
export const IOS_STORE_LIVE = CURRENT_RELEASE.iosBuildNumber > 0;

/** Is there any store at all to send a reader to? */
export const ANY_STORE_LIVE = ANDROID_STORE_LIVE || IOS_STORE_LIVE;

/**
 * The store links worth showing right now. Empty until a build is live, which
 * is the correct resting state and means a surface can map over this without
 * branching: no entries, no badges, and by the standing rule an empty section
 * renders nothing rather than a placeholder.
 */
export function liveStoreLinks(): { platform: "android" | "ios"; url: string }[] {
  const out: { platform: "android" | "ios"; url: string }[] = [];
  if (ANDROID_STORE_LIVE) {
    out.push({ platform: "android", url: CURRENT_RELEASE.androidStoreUrl });
  }
  if (IOS_STORE_LIVE) {
    out.push({ platform: "ios", url: CURRENT_RELEASE.iosStoreUrl });
  }
  return out;
}
