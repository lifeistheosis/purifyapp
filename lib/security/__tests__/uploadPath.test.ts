import { describe, expect, it } from "vitest";

import { campaignImage, CAMPAIGN_BUCKET } from "@/lib/campaigns/image";
import { publicPrefix, uploadRef } from "@/lib/security/uploadPath";
import { KITCHEN_BUCKET } from "@/lib/trapeza/photos";
import { STORES } from "@/scripts/migrate-upload-paths.mjs";

// What a reader's upload address looks like, and what it may say about them.

const base = "https://proj.supabase.co";
const kitchen = publicPrefix(base, "kitchen");
const uid = "11111111-2222-4333-8444-555555555555";
const file = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("uploadRef", () => {
  it("builds the bucket prefix the way getPublicUrl does", () => {
    expect(kitchen).toBe("https://proj.supabase.co/storage/v1/object/public/kitchen/");
    expect(publicPrefix(`${base}//`, "kitchen")).toBe(kitchen);
  });

  it("reads a random path, which names nobody", () => {
    expect(uploadRef(`${kitchen}r/${file}.jpg`, kitchen, "r")).toEqual({
      path: `r/${file}.jpg`,
      ext: "jpg",
      legacyOwner: null,
    });
    expect(uploadRef(`${kitchen}s/${file}.webp`, kitchen, "s")?.ext).toBe("webp");
  });

  it("reads the old shape, and says whose id it carried", () => {
    expect(uploadRef(`${kitchen}r/${uid}/1727500000000-abc123.jpg`, kitchen, "r")).toEqual({
      path: `r/${uid}/1727500000000-abc123.jpg`,
      ext: "jpg",
      legacyOwner: uid,
    });
    const campaigns = publicPrefix(base, "campaign-media");
    expect(uploadRef(`${campaigns}c/${uid}/1727500000000.png`, campaigns, "c")?.legacyOwner).toBe(uid);
  });

  it("refuses another folder, bucket or host", () => {
    expect(uploadRef(`${kitchen}s/${file}.jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}h/${file}/1.jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${publicPrefix(base, "avatars")}r/${file}.jpg`, kitchen, "r")).toBeNull();
    expect(
      uploadRef(`https://evil.example/storage/v1/object/public/kitchen/r/${file}.jpg`, kitchen, "r"),
    ).toBeNull();
    expect(uploadRef(`${kitchen}r/${file}.jpg`, "", "r")).toBeNull();
  });

  it("refuses paths that climb, nest, carry a query, or are not a picture", () => {
    expect(uploadRef(`${kitchen}r/../avatars/${file}.jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${uid}/sub/x.jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${uid}/..jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${file}.jpg?download=1`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${file}.jpg#x`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${file}.svg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${file}`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/not-a-uuid.jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(`${kitchen}r/${file.toUpperCase()}.jpg`, kitchen, "r")).toBeNull();
    expect(uploadRef(kitchen, kitchen, "r")).toBeNull();
    expect(uploadRef(null, kitchen, "r")).toBeNull();
    expect(uploadRef(42, kitchen, "r")).toBeNull();
  });
});

describe("campaignImage", () => {
  const campaigns = publicPrefix(base, CAMPAIGN_BUCKET);

  it("reads a campaign picture in either shape", () => {
    expect(campaignImage(`${campaigns}c/${file}.png`, base)).toEqual({
      path: `c/${file}.png`,
      ext: "png",
      legacyOwner: null,
    });
    expect(campaignImage(`${campaigns}c/${uid}/1727500000000.jpg`, base)?.legacyOwner).toBe(uid);
  });

  it("is not fooled by another public file of ours, which the schema's host check lets through", () => {
    expect(campaignImage(`${publicPrefix(base, "avatars")}b/${file}.jpg`, base)).toBeNull();
    expect(campaignImage(`${kitchen}r/${file}.jpg`, base)).toBeNull();
    expect(campaignImage(null, base)).toBeNull();
  });
});

describe("the script's list of stores", () => {
  it("names the buckets the routes write to", () => {
    const buckets = new Set(STORES.map((s: { bucket: string }) => s.bucket));
    expect([...buckets].sort()).toEqual([CAMPAIGN_BUCKET, KITCHEN_BUCKET].sort());
  });
});
