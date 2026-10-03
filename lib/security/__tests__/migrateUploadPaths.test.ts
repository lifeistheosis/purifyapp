import { describe, expect, it } from "vitest";

import { migrateUploadPaths, redact } from "@/scripts/migrate-upload-paths.mjs";

import { client, publicUrl, world as emptyWorld, type Row, type World } from "./fakeSupabase";

/**
 * scripts/migrate-upload-paths.mjs, run against an in-memory stand-in for the
 * few Supabase calls it makes. The owner runs it once against production, so
 * this is where its behaviour is pinned before that: what a dry run leaves
 * alone, what --apply moves, that a failure part way never leaves a row
 * naming a file that is gone, that it never overwrites a review a member is
 * saving at that moment, and that a second run does nothing.
 */

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const RANDOM = /^[rsc]\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
/** Sent a recipe with a photo, then deleted their account. */
const GONE = "33333333-3333-4333-8333-333333333333";

const A_R1 = `r/${ANNA}/1700000000001-aaaaaa.jpg`;
const A_R2 = `r/${ANNA}/1700000000002-bbbbbb.png`;
const B_R1 = `r/${BEN}/1700000000003-cccccc.webp`;
const B_GONE = `r/${BEN}/1600000000000-dddddd.jpg`;
const A_ORPHAN = `r/${ANNA}/1500000000000-orphan.jpg`;
const A_S = `s/${ANNA}/1700000000004-eeeeee.jpg`;
const G_S = `s/${GONE}/1700000000005-ffffff.jpg`;
const A_C = `c/${ANNA}/1700000000006.jpg`;
const B_C_GONE = `c/${BEN}/1700000000007.jpg`;
/** Already on a random path: uploaded after the fix. */
const NEW_R = "r/99999999-9999-4999-8999-999999999999.jpg";
const HOUSE = "h/77777777-7777-4777-8777-777777777777/1727500000000.jpg";
const ELSEWHERE = `https://elsewhere.example/storage/v1/object/public/campaign-media/c/${BEN}/1.jpg`;

const kitchen = (path: string) => publicUrl("kitchen", path);
const media = (path: string) => publicUrl("campaign-media", path);

function world(): World {
  const w = emptyWorld();
  w.users = new Set([ANNA, BEN]);
  w.tables.trapeza_recipe_reviews = [
    { id: "k1", author_id: ANNA, status: "published", updated_at: "2026-09-29T10:00:00.000+00:00", photo_urls: [kitchen(A_R1), kitchen(A_R2)] },
    { id: "k2", author_id: BEN, status: "published", updated_at: "2026-09-29T11:00:00.000+00:00", photo_urls: [kitchen(B_R1), kitchen(NEW_R)] },
    // Taken down by a moderator: its photo was deleted then, and no reader is served it.
    { id: "k3", author_id: BEN, status: "removed", updated_at: "2026-09-29T12:00:00.000+00:00", photo_urls: [kitchen(B_GONE)] },
    { id: "k4", author_id: ANNA, status: "published", updated_at: "2026-09-29T13:00:00.000+00:00", photo_urls: [] },
  ];
  w.tables.trapeza_recipes = [
    { id: "p1", author_id: ANNA, status: "pending", photo_url: kitchen(A_S) },
    { id: "p2", author_id: null, status: "published", photo_url: kitchen(G_S) },
    { id: "p3", author_id: null, status: "published", photo_url: kitchen(HOUSE) },
    { id: "p4", author_id: null, status: "published", photo_url: null },
  ];
  w.tables.prayer_campaigns = [
    { id: "c1", creator_id: ANNA, status: "active", image_url: media(A_C) },
    { id: "c2", creator_id: BEN, status: "removed", image_url: media(B_C_GONE) },
    { id: "c3", creator_id: BEN, status: "answered", image_url: ELSEWHERE },
    { id: "c4", creator_id: BEN, status: "active", image_url: null },
  ];
  w.tables.upload_owners = [{ bucket: "kitchen", path: NEW_R, owner_id: BEN, created_at: "2026-10-03T00:00:00.000Z" }];
  for (const p of [A_R1, A_R2, B_R1, A_ORPHAN, A_S, G_S, NEW_R, HOUSE]) w.objects.add(`kitchen/${p}`);
  w.objects.add(`campaign-media/${A_C}`);
  return w;
}

async function run(w: World, opts: { apply?: boolean; limit?: number } = {}) {
  const lines: string[] = [];
  const result = await migrateUploadPaths(client(w), { ...opts, log: (s: string) => lines.push(s) });
  return { result, out: lines.join("\n") };
}

const snapshot = (w: World) => JSON.stringify({ tables: w.tables, objects: [...w.objects].sort() });
const row = (w: World, table: string, id: string) => w.tables[table]!.find((r) => r.id === id) as Row;
const photos = (w: World, id: string) => row(w, "trapeza_recipe_reviews", id).photo_urls as string[];
const pathOf = (url: string) => url.slice(url.indexOf("/public/") + "/public/".length).replace(/^[^/]+\//, "");
const owner = (w: World, bucket: string, path: string) =>
  w.tables.upload_owners!.find((r) => r.bucket === bucket && r.path === path)?.owner_id;

/** Every URL a reader can be served: rows that are not taken down. */
function served(w: World): string[] {
  const out: unknown[] = [];
  for (const r of w.tables.trapeza_recipe_reviews ?? []) if (r.status !== "removed") out.push(...(r.photo_urls as string[]));
  for (const r of w.tables.trapeza_recipes ?? []) out.push(r.photo_url);
  for (const r of w.tables.prayer_campaigns ?? []) if (r.status !== "removed") out.push(r.image_url);
  return out.filter((u): u is string => typeof u === "string");
}

/** Served URLs of ours whose file does not exist: a photo that would not load. */
function dangling(w: World): string[] {
  const ours = "https://proj.supabase.co/storage/v1/object/public/";
  return served(w).filter((u) => u.startsWith(ours) && !w.objects.has(u.slice(ours.length)));
}

/** Served URLs of ours that still carry somebody's id. */
function naming(w: World): string[] {
  return served(w).filter((u) => u.startsWith("https://proj.supabase.co/") && [ANNA, BEN, GONE].some((id) => u.includes(id)));
}

describe("migrate-upload-paths, dry run", () => {
  it("counts and writes nothing", async () => {
    const w = world();
    const before = snapshot(w);
    const { result, out } = await run(w);
    expect(snapshot(w)).toBe(before);
    expect(w.calls).toEqual({ upload: 0, copy: 0, remove: 0, writes: 0 });
    expect(result).toEqual({ ok: true, moved: 0, remaining: 6 });
    expect(out).toMatch(/old files to move\s+6/);
    expect(out).toMatch(/kitchen reviews read\s+3/);
    expect(out).toMatch(/old-shape URLs it cannot place, left alone\s+1/);
  });

  it("finds everything when the server pages smaller than the script asks", async () => {
    const w = world();
    w.maxRows = 1;
    const { result } = await run(w);
    expect(result.remaining).toBe(6);
  });

  it("says so when the owners table has not been applied", async () => {
    const w = world();
    w.tables.upload_owners = null;
    const { result, out } = await run(w);
    expect(result.ok).toBe(true);
    expect(out).toContain("20261007000000_upload_owners.sql");
  });
});

describe("migrate-upload-paths --apply", () => {
  it("moves every served photo to a random path and repoints every row", async () => {
    const w = world();
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 6, remaining: 0 });
    expect(out).toContain("No row names its owner in a photo URL any more.");
    expect(out).toMatch(/moved with no owner \(account deleted\)\s+1/);

    expect(naming(w)).toEqual([]);
    expect(dangling(w)).toEqual([]);

    // Anna's review: both photos moved, order kept, each on its own path.
    const [one, two] = photos(w, "k1");
    expect(pathOf(one)).toMatch(RANDOM);
    expect(pathOf(one)).toMatch(/\.jpg$/);
    expect(pathOf(two)).toMatch(/\.png$/);
    expect(one).not.toBe(two);
    // Whose each file is, now written where only the server reads.
    expect(owner(w, "kitchen", pathOf(one))).toBe(ANNA);
    expect(owner(w, "kitchen", pathOf(two))).toBe(ANNA);
    // The stamp is untouched: the review itself did not change.
    expect(row(w, "trapeza_recipe_reviews", "k1").updated_at).toBe("2026-09-29T10:00:00.000+00:00");

    // Ben's: the old one moved, the one already on a random path left as it was.
    expect(photos(w, "k2")[1]).toBe(kitchen(NEW_R));
    expect(owner(w, "kitchen", pathOf(photos(w, "k2")[0]))).toBe(BEN);

    const pending = row(w, "trapeza_recipes", "p1").photo_url as string;
    expect(pathOf(pending)).toMatch(/^s\/.*\.jpg$/);
    expect(owner(w, "kitchen", pathOf(pending))).toBe(ANNA);

    // A deleted account's recipe photo still moves; nobody is recorded for it.
    const orphaned = row(w, "trapeza_recipes", "p2").photo_url as string;
    expect(pathOf(orphaned)).toMatch(RANDOM);
    expect(owner(w, "kitchen", pathOf(orphaned))).toBeUndefined();

    const picture = row(w, "prayer_campaigns", "c1").image_url as string;
    expect(pathOf(picture)).toMatch(/^c\/.*\.jpg$/);
    expect(owner(w, "campaign-media", pathOf(picture))).toBe(ANNA);

    // Untouched: taken-down rows, a recipe's own photo, another host, and a
    // file nothing names.
    expect(photos(w, "k3")).toEqual([kitchen(B_GONE)]);
    expect(row(w, "prayer_campaigns", "c2").image_url).toBe(media(B_C_GONE));
    expect(row(w, "trapeza_recipes", "p3").photo_url).toBe(kitchen(HOUSE));
    expect(row(w, "prayer_campaigns", "c3").image_url).toBe(ELSEWHERE);
    expect(w.objects.has(`kitchen/${A_ORPHAN}`)).toBe(true);

    for (const p of [A_R1, A_R2, B_R1, A_S, G_S]) expect(w.objects.has(`kitchen/${p}`)).toBe(false);
    expect(w.objects.has(`campaign-media/${A_C}`)).toBe(false);
  });

  it("does nothing the second time", async () => {
    const w = world();
    await run(w, { apply: true });
    const after = snapshot(w);
    const calls = { ...w.calls };
    const { result } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 0, remaining: 0 });
    expect(w.calls).toEqual(calls);
    expect(snapshot(w)).toBe(after);
  });

  it("writes nothing without the owners table", async () => {
    const w = world();
    w.tables.upload_owners = null;
    const before = snapshot(w);
    const { result, out } = await run(w, { apply: true });
    expect(result.ok).toBe(false);
    expect(out).toContain("20261007000000_upload_owners.sql");
    expect(snapshot(w)).toBe(before);
    expect(w.calls).toEqual({ upload: 0, copy: 0, remove: 0, writes: 0 });
  });

  it("keeps an old file while a row still names it, and finishes on the next run", async () => {
    const w = world();
    w.fail.update = "trapeza_recipe_reviews";
    const first = await run(w, { apply: true });
    expect(first.result.ok).toBe(false);
    expect(first.out).toMatch(/old files kept, a row did not move\s+3/);
    for (const p of [A_R1, A_R2, B_R1]) expect(w.objects.has(`kitchen/${p}`)).toBe(true);
    expect(dangling(w)).toEqual([]);

    w.fail.update = null;
    const second = await run(w, { apply: true });
    expect(second.result).toEqual({ ok: true, moved: 3, remaining: 0 });
    expect(naming(w)).toEqual([]);
    expect(dangling(w)).toEqual([]);
  });

  it("never overwrites a review its author saves while it runs", async () => {
    const w = world();
    const added = kitchen("r/88888888-8888-4888-8888-888888888888.jpg");
    w.objects.add("kitchen/r/88888888-8888-4888-8888-888888888888.jpg");
    // Between this script reading Anna's review and writing it, she adds a photo.
    w.beforeUpdate = () => {
      const review = row(w, "trapeza_recipe_reviews", "k1");
      review.photo_urls = [...(review.photo_urls as string[]), added];
      review.updated_at = "2026-10-03T09:00:00.000+00:00";
    };
    const first = await run(w, { apply: true });
    expect(first.result.ok).toBe(false);
    expect(photos(w, "k1")).toContain(added);
    expect(dangling(w)).toEqual([]);

    const second = await run(w, { apply: true });
    expect(second.result.ok).toBe(true);
    expect(photos(w, "k1")).toHaveLength(3);
    expect(photos(w, "k1")).toContain(added);
    expect(naming(w)).toEqual([]);
    expect(dangling(w)).toEqual([]);
  });

  it("moves nothing it could not write an owner down for", async () => {
    const w = world();
    w.fail.insert = "upload_owners";
    const before = snapshot(w);
    const { result, out } = await run(w, { apply: true });
    expect(result.ok).toBe(false);
    expect(out).toMatch(/owners that could not be written down\s+6/);
    // Every copy was taken back, and no row or old file was touched.
    expect(snapshot(w)).toBe(before);
  });

  it("leaves a row whose file is already gone, and says so", async () => {
    const w = world();
    w.objects.delete(`kitchen/${A_S}`);
    const { result, out } = await run(w, { apply: true });
    expect(result.ok).toBe(false);
    expect(out).toMatch(/old files already gone \(rows left as they are\)\s+1/);
    expect(row(w, "trapeza_recipes", "p1").photo_url).toBe(kitchen(A_S));
    expect(result.moved).toBe(5);
  });

  it("skips a table or a column that is not there yet", async () => {
    const w = world();
    w.tables.prayer_campaigns = null;
    const { result, out } = await run(w, { apply: true });
    expect(result).toEqual({ ok: true, moved: 5, remaining: 0 });
    expect(out).toMatch(/prayer campaigns\s+table not there, skipped/);
  });

  it("moves no more than --limit", async () => {
    const w = world();
    const { result } = await run(w, { apply: true, limit: 2 });
    expect(result).toEqual({ ok: true, moved: 2, remaining: 4 });
    expect(dangling(w)).toEqual([]);
  });

  it("prints no email, id, URL or path", async () => {
    const dry = await run(world());
    const applied = await run(world(), { apply: true });
    const failed = world();
    failed.fail.update = "trapeza_recipes";
    const partial = await run(failed, { apply: true });
    for (const { out } of [dry, applied, partial]) {
      expect(out).not.toMatch(UUID);
      expect(out).not.toContain("@");
      expect(out).not.toContain("/storage/v1/");
      expect(out).not.toMatch(/\b[rsc]\/\w/);
    }
  });
});

describe("redact", () => {
  it("takes out uuids and email addresses", () => {
    expect(redact(`no user ${ANNA} for a@example.com`)).toBe("no user <id> for <email>");
  });
});
