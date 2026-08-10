// A store link must never outrun the store.
//
// The marketing home advertised "1.0 · Purify on iPhone" above the fold while
// iOS 1.0 build 12 sat in WAITING_FOR_REVIEW. No listing existed behind it. The
// release record already encoded the truth (iosBuildNumber: 0, held) and no
// marketing surface read it.
//
// These assertions tie the two together, so the only way to open a store link
// is to do the thing that actually opens the store: set that store's build
// number, which the release ritual requires anyway once a build is live.

import { describe, it, expect } from "vitest";
import { CURRENT_RELEASE } from "@/lib/appUpdate/release";
import {
  ANDROID_STORE_LIVE,
  ANY_STORE_LIVE,
  IOS_STORE_LIVE,
  liveStoreLinks,
} from "@/lib/appUpdate/storeLive";

describe("store availability follows the release record", () => {
  it("derives each store from its own build number, not a separate flag", () => {
    expect(ANDROID_STORE_LIVE).toBe(CURRENT_RELEASE.androidVersionCode > 0);
    expect(IOS_STORE_LIVE).toBe(CURRENT_RELEASE.iosBuildNumber > 0);
  });

  it("treats the two stores independently", () => {
    // Play and the App Store will not promote on the same day. Whichever lands
    // first must be able to advertise without waiting for the other.
    expect(ANY_STORE_LIVE).toBe(ANDROID_STORE_LIVE || IOS_STORE_LIVE);
  });

  it("offers no link for a store that has not promoted a build", () => {
    const platforms = liveStoreLinks().map((l) => l.platform);
    if (!ANDROID_STORE_LIVE) expect(platforms).not.toContain("android");
    if (!IOS_STORE_LIVE) expect(platforms).not.toContain("ios");
  });

  it("every offered link carries a real store URL", () => {
    for (const link of liveStoreLinks()) {
      expect(link.url).toMatch(/^https:\/\//);
      expect(link.url.length).toBeGreaterThan(20);
    }
  });

  // The state at the time of writing, and the reason the module exists. When
  // this starts failing it is because a build went live, which is the moment to
  // check that the surfaces which advertise it are the ones you intended.
  it("records that neither store is open yet", () => {
    expect(CURRENT_RELEASE.androidVersionCode).toBe(0);
    expect(CURRENT_RELEASE.iosBuildNumber).toBe(0);
    expect(liveStoreLinks()).toEqual([]);
  });
});
