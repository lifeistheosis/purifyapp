import { describe, expect, it } from "vitest";

import { avatarSrc } from "@/lib/community/avatarSrc";

const SITE = "https://purifyapp.net";
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocLcMmRERj3vffVPw-ncdlKBngWMfXqq=s96-c";

describe("avatarSrc", () => {
  it("sends a Google account picture through the site's image optimizer", () => {
    expect(avatarSrc(GOOGLE, SITE)).toBe(
      `${SITE}/_next/image?url=${encodeURIComponent(GOOGLE)}&w=128&q=75`,
    );
  });

  it("uses a width and quality the optimizer accepts by default", () => {
    const out = new URL(avatarSrc(GOOGLE, SITE) as string);
    expect([32, 48, 64, 96, 128, 256, 384]).toContain(Number(out.searchParams.get("w")));
    expect(out.searchParams.get("q")).toBe("75");
    expect(out.searchParams.get("url")).toBe(GOOGLE);
  });

  it("leaves our own uploads, other hosts and nothing at all alone", () => {
    const upload = "https://avbqyvjgcrucjwevwixt.supabase.co/storage/v1/object/public/avatars/u/x/1.jpg";
    expect(avatarSrc(upload, SITE)).toBe(upload);
    expect(avatarSrc("https://example.com/a/me.png", SITE)).toBe("https://example.com/a/me.png");
    expect(avatarSrc(null, SITE)).toBeNull();
    expect(avatarSrc("", SITE)).toBeNull();
    expect(avatarSrc("not a url", SITE)).toBe("not a url");
  });

  it("touches only Google's account-picture paths, never the rest of that host", () => {
    const photos = "https://lh3.googleusercontent.com/pw/AP1GczM/some-album-photo";
    expect(avatarSrc(photos, SITE)).toBe(photos);
    const withQuery = `${GOOGLE}?x=1`;
    expect(avatarSrc(withQuery, SITE)).toBe(withQuery);
    const plainHttp = GOOGLE.replace("https:", "http:");
    expect(avatarSrc(plainHttp, SITE)).toBe(plainHttp);
  });

  it("is stable when applied twice, since the API and the page both apply it", () => {
    const once = avatarSrc(GOOGLE, SITE);
    expect(avatarSrc(once, SITE)).toBe(once);
  });

  it("tolerates a trailing slash on the site origin", () => {
    expect(avatarSrc(GOOGLE, `${SITE}/`)?.startsWith(`${SITE}/_next/image?`)).toBe(true);
  });
});
