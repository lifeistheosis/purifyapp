import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isSupabaseStorageUrl } from "@/lib/security/schemas";

/**
 * isSupabaseStorageUrl is the boundary that stops a client from storing an
 * arbitrary absolute URL as a campaign image. A campaign page is public, so a
 * foreign URL there would hotlink anywhere and leak every viewer's IP to a
 * third-party server. These cases are the ones that matter.
 */

const PROJECT = "https://avbqyvjgcrucjwevwixt.supabase.co";
const OK = `${PROJECT}/storage/v1/object/public/campaign-media/c/user/1.jpg`;

describe("isSupabaseStorageUrl", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PROJECT;
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("accepts a public object URL on the project host", () => {
    expect(isSupabaseStorageUrl(OK)).toBe(true);
  });

  it("accepts any bucket, since the route picks the bucket, not the client", () => {
    expect(
      isSupabaseStorageUrl(`${PROJECT}/storage/v1/object/public/avatars/u/1.png`),
    ).toBe(true);
  });

  it("rejects another host entirely", () => {
    expect(
      isSupabaseStorageUrl(
        "https://evil.example.com/storage/v1/object/public/campaign-media/x.jpg",
      ),
    ).toBe(false);
  });

  it("rejects a lookalike host that merely ends with the project host", () => {
    expect(
      isSupabaseStorageUrl(
        "https://evil-avbqyvjgcrucjwevwixt.supabase.co/storage/v1/object/public/campaign-media/x.jpg",
      ),
    ).toBe(false);
  });

  it("rejects the project host over plain http", () => {
    expect(isSupabaseStorageUrl(OK.replace("https:", "http:"))).toBe(false);
  });

  it("rejects a non-public storage path on the right host", () => {
    expect(
      isSupabaseStorageUrl(
        `${PROJECT}/storage/v1/object/authenticated/campaign-media/x.jpg`,
      ),
    ).toBe(false);
  });

  it("rejects a non-storage path on the right host", () => {
    expect(isSupabaseStorageUrl(`${PROJECT}/rest/v1/prayer_campaigns`)).toBe(false);
  });

  it("rejects junk that is not a URL", () => {
    expect(isSupabaseStorageUrl("not a url")).toBe(false);
    expect(isSupabaseStorageUrl("")).toBe(false);
  });

  it("rejects everything when the project URL is unset, rather than failing open", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isSupabaseStorageUrl(OK)).toBe(false);
  });
});
