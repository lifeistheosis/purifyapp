import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  forgetUploads,
  ownsUploads,
  recordUploadOwner,
  removeOwnedUpload,
} from "@/lib/security/uploadOwners";
import { publicPrefix, uploadRef } from "@/lib/security/uploadPath";

import { client, PROJECT, world, type World } from "./fakeSupabase";

// The record of whose upload is whose, against an in-memory upload_owners.
// What is pinned here: it fails closed, and a file is only ever deleted for
// the reader it provably belongs to.

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const P1 = "r/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg";
const P2 = "r/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg";

let w: World;
let admin: SupabaseClient;
const owners = () => w.tables.upload_owners!;

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  admin = client(w) as unknown as SupabaseClient;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("recordUploadOwner", () => {
  it("writes one row per file", async () => {
    expect(await recordUploadOwner(admin, "kitchen", P1, ANNA)).toBe("recorded");
    expect(owners()).toMatchObject([{ bucket: "kitchen", path: P1, owner_id: ANNA }]);
  });

  it("says so when the table has not been applied", async () => {
    w.tables.upload_owners = null;
    expect(await recordUploadOwner(admin, "kitchen", P1, ANNA)).toBe("absent");
  });

  it("never hands a recorded path to a second reader", async () => {
    await recordUploadOwner(admin, "kitchen", P1, ANNA);
    expect(await recordUploadOwner(admin, "kitchen", P1, BEN)).toBe("failed");
    expect(owners()).toHaveLength(1);
    expect(owners()[0].owner_id).toBe(ANNA);
  });
});

describe("ownsUploads", () => {
  beforeEach(async () => {
    await recordUploadOwner(admin, "kitchen", P1, ANNA);
    await recordUploadOwner(admin, "kitchen", P2, BEN);
  });

  it("is true only when every path is that reader's", async () => {
    expect(await ownsUploads(admin, "kitchen", [P1], ANNA)).toBe(true);
    expect(await ownsUploads(admin, "kitchen", [P1, P1], ANNA)).toBe(true);
    expect(await ownsUploads(admin, "kitchen", [P1, P2], ANNA)).toBe(false);
    expect(await ownsUploads(admin, "kitchen", [P2], ANNA)).toBe(false);
  });

  it("does not carry over to another bucket", async () => {
    expect(await ownsUploads(admin, "campaign-media", [P1], ANNA)).toBe(false);
  });

  it("asks nothing when there is nothing to ask", async () => {
    w.tables.upload_owners = null;
    expect(await ownsUploads(admin, "kitchen", [], ANNA)).toBe(true);
  });

  it("is false when the record cannot be read", async () => {
    w.tables.upload_owners = null;
    expect(await ownsUploads(admin, "kitchen", [P1], ANNA)).toBe(false);
  });
});

describe("forgetUploads", () => {
  it("drops the rows of deleted files, and only those", async () => {
    await recordUploadOwner(admin, "kitchen", P1, ANNA);
    await recordUploadOwner(admin, "kitchen", P2, BEN);
    await recordUploadOwner(admin, "campaign-media", P1, ANNA);
    await forgetUploads(admin, "kitchen", [P1]);
    expect(owners().map((r) => `${r.bucket}/${r.path}`).sort()).toEqual(
      [`campaign-media/${P1}`, `kitchen/${P2}`].sort(),
    );
  });

  it("never throws, whatever the database says", async () => {
    w.tables.upload_owners = null;
    await expect(forgetUploads(admin, "kitchen", [P1])).resolves.toBeUndefined();
    const broken = { from: () => { throw new TypeError("fetch failed"); } } as unknown as SupabaseClient;
    await expect(forgetUploads(broken, "kitchen", [P1])).resolves.toBeUndefined();
  });
});

describe("removeOwnedUpload", () => {
  const prefix = publicPrefix(PROJECT, "campaign-media");
  const RANDOM = "c/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg";
  const LEGACY = `c/${ANNA}/1727500000000.jpg`;
  const ref = (path: string) => uploadRef(prefix + path, prefix, "c");

  beforeEach(async () => {
    w.objects = new Set([`campaign-media/${RANDOM}`, `campaign-media/${LEGACY}`]);
    await recordUploadOwner(admin, "campaign-media", RANDOM, ANNA);
  });

  it("deletes a file the record says is theirs, and forgets it", async () => {
    expect(await removeOwnedUpload(admin, "campaign-media", ref(RANDOM), ANNA)).toBe("removed");
    expect(w.objects.has(`campaign-media/${RANDOM}`)).toBe(false);
    expect(owners()).toEqual([]);
  });

  it("deletes an old path that carries their own id", async () => {
    expect(await removeOwnedUpload(admin, "campaign-media", ref(LEGACY), ANNA)).toBe("removed");
    expect(w.objects.has(`campaign-media/${LEGACY}`)).toBe(false);
  });

  it("leaves a file that is somebody else's, by record or by path", async () => {
    expect(await removeOwnedUpload(admin, "campaign-media", ref(RANDOM), BEN)).toBe("not-theirs");
    expect(await removeOwnedUpload(admin, "campaign-media", ref(LEGACY), BEN)).toBe("not-theirs");
    expect(w.objects.size).toBe(2);
    expect(w.calls.remove).toBe(0);
    expect(owners()).toHaveLength(1);
  });

  it("leaves everything when there is no file, no owner, or no record to read", async () => {
    expect(await removeOwnedUpload(admin, "campaign-media", null, ANNA)).toBe("not-theirs");
    expect(await removeOwnedUpload(admin, "campaign-media", ref(RANDOM), null)).toBe("not-theirs");
    w.tables.upload_owners = null;
    expect(await removeOwnedUpload(admin, "campaign-media", ref(RANDOM), ANNA)).toBe("not-theirs");
    expect(w.objects.size).toBe(2);
  });
});
