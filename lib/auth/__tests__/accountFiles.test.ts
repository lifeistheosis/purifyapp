import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, PROJECT, publicUrl, world, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * Which files go when a reader deletes their account, run for real against an
 * in-memory Supabase: the delete route, and the listing it relies on.
 *
 * Before this, none did: the auth user was deleted, the rows cascaded, and
 * the reader's pictures stayed at their public addresses, while the record of
 * whose they were went with the account. The cases that matter are the edges
 * of "theirs": another reader's files, a banner another profile names, the
 * recipe photo that outlives its author, and an id that must never widen a
 * listing.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }), signOut: async () => ({ error: null }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/email/accountEvents", () => ({ scheduleAccountDeleted: () => {} }));

import { POST as deleteAccount } from "@/app/api/auth/delete/route";

import { accountFiles, accountFolders, deleteAccountFiles } from "../accountFiles";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const SITE = "https://purifyapp.net";

/** Ben's files, and whether each goes with his account. */
const BENS = {
  goes: [
    `avatars/u/${BEN}/1759400000000.jpg`,
    `avatars/u/${BEN}/1759400009999.png`,
    "avatars/b/3f2b8c1e-5a4d-4e6f-8a9b-0c1d2e3f4a5b.png",
    "kitchen/r/0b6c2f7e-3d1a-4c55-9e8f-12ab34cd56ef.jpg",
    `kitchen/r/${BEN}/1759400000001-abc123.jpg`,
    "campaign-media/c/7c1d9e2f-4b3a-4d66-8f9a-23bc45de67f0.webp",
    `campaign-media/c/${BEN}/1759400000002.jpg`,
  ],
  // The photos sent with his recipes: the recipes stay, and still show them.
  stays: ["kitchen/s/5d4c3b2a-1f0e-4d9c-8b7a-695847362514.jpg", `kitchen/s/${BEN}/1759400000003-def456.jpg`],
};
const OTHERS = [
  `avatars/u/${ANNA}/1759400000004.jpg`,
  "avatars/b/9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d.jpg",
  "kitchen/r/1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.jpg",
  "kitchen/h/7f0e6d5c-4b3a-4291-8a0b-1c2d3e4f5a6b/1759400000005.jpg",
  "campaign-media/c/2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e.jpg",
];
/** What the upload routes wrote down: every random path, and nothing in a folder named by an id. */
const RECORDED: [owner: string, object: string][] = [
  [BEN, BENS.goes[2]],
  [BEN, BENS.goes[3]],
  [BEN, BENS.goes[5]],
  [BEN, BENS.stays[0]],
  [ANNA, OTHERS[1]],
  [ANNA, OTHERS[2]],
  [ANNA, OTHERS[4]],
];

let w: World;
const admin = () => state.admin as SupabaseClient;
const stored = () => [...w.objects].sort();
const split = (object: string) => [object.slice(0, object.indexOf("/")), object.slice(object.indexOf("/") + 1)];

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  w.objects = new Set([...BENS.goes, ...BENS.stays, ...OTHERS]);
  w.tables.upload_owners = RECORDED.map(([owner_id, object]) => ({ bucket: split(object)[0], path: split(object)[1], owner_id }));
  w.tables.profiles = [
    { id: ANNA, handle: "anna", banner_url: publicUrl("avatars", split(OTHERS[1])[1]) },
    { id: BEN, handle: "ben", banner_url: publicUrl("avatars", split(BENS.goes[2])[1]) },
  ];
  state.admin = client(w);
  state.user = { id: BEN, email: "ben@example.com" };
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const post = () => deleteAccount(new Request(`${SITE}/api/auth/delete`, { method: "POST" }));

describe("deleting an account", () => {
  it("takes the reader's own files with it, and leaves the recipe photos and everybody else's", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(w.users.has(BEN)).toBe(false);
    expect(stored()).toEqual([...BENS.stays, ...OTHERS].sort());
    // Their records went with the account; nobody else's did.
    expect(w.tables.upload_owners!.map((r) => r.owner_id)).toEqual([ANNA, ANNA, ANNA]);
  });

  it("deletes no file when the account could not be deleted", async () => {
    w.fail.deleteUser = true;
    const before = stored();
    const res = await post();
    expect(res.status).toBe(500);
    expect(w.users.has(BEN)).toBe(true);
    expect(stored()).toEqual(before);
    expect(w.tables.upload_owners).toHaveLength(RECORDED.length);
  });

  it("still deletes the account when storage is failing, and says what it left", async () => {
    w.fail.remove = "avatars";
    const warn = vi.mocked(console.warn);
    expect((await post()).status).toBe(200);
    expect(w.users.has(BEN)).toBe(false);
    expect(warn).toHaveBeenCalledWith("[account] files left behind", "avatars", "storage is down");
    expect(stored().filter((o) => o.startsWith("kitchen/") || o.startsWith("campaign-media/"))).toEqual(
      [...BENS.stays, ...OTHERS].filter((o) => !o.startsWith("avatars/")).sort(),
    );
  });

  it("turns away a reader who is not signed in", async () => {
    state.user = null;
    const before = stored();
    expect((await post()).status).toBe(401);
    expect(stored()).toEqual(before);
  });

  it("lists the files before the account goes, and deletes them only after it has", () => {
    const src = readFileSync(join(process.cwd(), "app/api/auth/delete/route.ts"), "utf8");
    const listed = src.indexOf("await accountFiles(admin, user.id)");
    const gone = src.indexOf("admin.auth.admin.deleteUser(user.id)");
    const failed = src.indexOf("Couldn't delete the account");
    const deleted = src.indexOf("await deleteAccountFiles(admin, files)");
    expect(listed).toBeGreaterThan(0);
    expect(gone).toBeGreaterThan(listed);
    expect(failed).toBeGreaterThan(gone);
    expect(deleted).toBeGreaterThan(failed);
  });
});

describe("accountFiles", () => {
  const flat = async (id: string) =>
    (await accountFiles(admin(), id)).flatMap(({ bucket, paths }) => paths.map((p) => `${bucket}/${p}`)).sort();

  it("finds what the record gives the reader and what sits in a folder named by their id", async () => {
    expect(await flat(BEN)).toEqual([...BENS.goes].sort());
  });

  it("lists nothing at all for an id that is not a uuid", async () => {
    for (const id of ["", "u", "..", `${BEN}/..`, `${BEN} `, "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", "%"]) {
      expect(accountFolders(id), id).toEqual([]);
      const before = { ...w.calls };
      expect(await accountFiles(admin(), id), id).toEqual([]);
      expect(w.calls, id).toEqual(before);
    }
  });

  it("takes a banner from before the record existed, but never one another profile names", async () => {
    w.tables.upload_owners = [];
    const banner = split(BENS.goes[2])[1];
    expect(await flat(BEN)).toContain(`avatars/${banner}`);

    // His row names Anna's banner instead: it is hers, and it stays.
    w.tables.profiles!.find((p) => p.id === BEN)!.banner_url = w.tables.profiles!.find((p) => p.id === ANNA)!.banner_url;
    const found = await flat(BEN);
    expect(found).not.toContain(OTHERS[1]);
    expect(found).not.toContain(`avatars/${banner}`);
  });

  it("still takes the folders named by their id where the record is not there yet", async () => {
    w.tables.upload_owners = null;
    expect(await flat(BEN)).toEqual(
      [BENS.goes[0], BENS.goes[1], BENS.goes[4], BENS.goes[6], BENS.goes[2]].sort(),
    );
  });

  it("takes files only, not a folder nested inside", async () => {
    w.objects.add(`avatars/u/${BEN}/old/2.jpg`);
    expect(await flat(BEN)).not.toContain(`avatars/u/${BEN}/old/2.jpg`);
    expect(await flat(BEN)).not.toContain(`avatars/u/${BEN}/old`);
  });

  it("reads a folder and the record past their first page", async () => {
    const many = Array.from({ length: 2300 }, (_, i) => `avatars/u/${BEN}/${String(1760000000000 + i)}.jpg`);
    for (const object of many) w.objects.add(object);
    const uploads = Array.from({ length: 25 }, (_, i) => `r/${String(i).padStart(8, "0")}-0000-4000-8000-000000000000.jpg`);
    for (const path of uploads) {
      w.objects.add(`kitchen/${path}`);
      w.tables.upload_owners!.push({ bucket: "kitchen", path, owner_id: BEN });
    }
    w.maxRows = 10;
    const found = await flat(BEN);
    for (const object of [...many, ...uploads.map((p) => `kitchen/${p}`)]) expect(found).toContain(object);
    expect(new Set(found).size).toBe(found.length);
  });

  it("never throws: a storage fault must not stand between a reader and deleting their account", async () => {
    const fake = state.admin as { storage: { from: (bucket: string) => unknown } };
    vi.spyOn(fake.storage, "from").mockImplementation(() => {
      throw new Error("network down");
    });
    await expect(accountFiles(admin(), BEN)).resolves.toBeDefined();
  });
});

describe("deleteAccountFiles", () => {
  it("sends a long list in batches", async () => {
    const remove = vi.fn(async (paths: string[]) => ({ data: paths, error: null }));
    const fake = { storage: { from: () => ({ remove }) } } as unknown as SupabaseClient;
    await deleteAccountFiles(fake, [{ bucket: "avatars", paths: Array.from({ length: 250 }, (_, i) => `u/${BEN}/${i}.jpg`) }]);
    expect(remove.mock.calls.map(([paths]) => paths.length)).toEqual([100, 100, 50]);
  });

  it("never throws, and goes on to the next bucket", async () => {
    const calls: string[] = [];
    const fake = {
      storage: {
        from: (bucket: string) => ({
          remove: async () => {
            calls.push(bucket);
            if (bucket === "avatars") throw new Error("network down");
            return { data: [], error: null };
          },
        }),
      },
    } as unknown as SupabaseClient;
    await expect(
      deleteAccountFiles(fake, [
        { bucket: "avatars", paths: ["u/x/1.jpg"] },
        { bucket: "kitchen", paths: ["r/x/1.jpg"] },
      ]),
    ).resolves.toBeUndefined();
    expect(calls).toEqual(["avatars", "kitchen"]);
  });
});
