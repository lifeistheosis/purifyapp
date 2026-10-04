import { describe, expect, it } from "vitest";

import { bannerPath } from "../bannerPath";

/**
 * Which address counts as one of our banners. It decides what a delete may
 * ever be pointed at, so the cases that matter are the ones that must NOT
 * match: another host, another bucket, a picture that is not a banner, and
 * anything trailing the path.
 */

const BASE = "https://avbqyvjgcrucjwevwixt.supabase.co";
const PREFIX = `${BASE}/storage/v1/object/public/avatars/`;
const MINE = "b/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.jpg";

describe("bannerPath", () => {
  it("reads the path out of the address the upload route saves", () => {
    for (const ext of ["jpg", "png", "webp"]) {
      const path = `b/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.${ext}`;
      expect(bannerPath(PREFIX + path, BASE), ext).toBe(path);
    }
    // A trailing slash on the configured URL changes nothing.
    expect(bannerPath(PREFIX + MINE, `${BASE}/`)).toBe(MINE);
  });

  it("matches nothing on another host, however alike the rest looks", () => {
    const no = [
      `https://evil.example/storage/v1/object/public/avatars/${MINE}`,
      `${BASE}.evil.example/storage/v1/object/public/avatars/${MINE}`,
      `https://evil.example/?next=${PREFIX}${MINE}`,
    ];
    for (const url of no) expect(bannerPath(url, BASE), url).toBeNull();
  });

  it("matches nothing in another bucket or folder, and no profile picture", () => {
    const no = [
      `${BASE}/storage/v1/object/public/campaign-media/${MINE}`,
      `${PREFIX}u/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b/1759400000000.jpg`,
      `${PREFIX}a/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.jpg`,
      // The old shape other uploads had, <folder>/<user id>/<file>: a banner never did.
      `${PREFIX}b/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b/1759400000000.jpg`,
    ];
    for (const url of no) expect(bannerPath(url, BASE), url).toBeNull();
  });

  it("allows nothing after the path, no other shape, and no escaped spelling of it", () => {
    const no = [
      `${PREFIX}${MINE}?download=1`,
      `${PREFIX}${MINE}#x`,
      `${PREFIX}${MINE.replace("/", "%2F")}`,
      `${PREFIX}x/../${MINE}`,
      `${PREFIX}b/3F2B8C1E-5A4D-4E6F-8A9B-0C1D2E3F4A5B.jpg`,
      `${PREFIX}b/------------------------------------.jpg`,
      `${PREFIX}b/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.gif`,
    ];
    for (const url of no) expect(bannerPath(url, BASE), url).toBeNull();
  });

  it("answers null for no address, and when the project's own URL is unknown", () => {
    expect(bannerPath(null, BASE)).toBeNull();
    expect(bannerPath(undefined, BASE)).toBeNull();
    expect(bannerPath("", BASE)).toBeNull();
    expect(bannerPath(PREFIX + MINE, "")).toBeNull();
  });
});
