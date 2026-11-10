import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, PROJECT, publicUrl, world, type Row, type World } from "./fakeSupabase";

/**
 * The upload routes and everything that trusts what they return, run for
 * real against an in-memory Supabase: the Kitchen (upload, review, recipe
 * submission) and prayer campaigns (July's picture upload, and taking a
 * campaign down).
 *
 * These cannot be walked in a browser without signing in to, and writing to,
 * the production project, so this is where the flow is exercised. What is
 * pinned: no URL a reader is served carries anyone's id, a photo is only
 * attached by the reader who uploaded it, and a file is only deleted for the
 * reader it belongs to.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown> },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/trapeza/flags", () => ({ trapezaEnabled: () => true }));
// Campaigns are closed (lib/campaigns/flags.ts). July's picture upload is
// retired with July's other routes and kept, so it is tested as it stands;
// taking a campaign down is the rework's route, tested as it runs once
// campaigns are open. Starting one takes no picture any more: pictures come
// back in a later phase with a table and a route of their own
// (docs/1.9-build/notes/campaigns-fable.md, 2.5), and the rework's own routes
// are tested in lib/campaigns/__tests__/routes.test.ts.
vi.mock("@/lib/campaigns/flags", () => ({
  julyCampaignRoutes: () => true,
  campaignsOpening: () => "open",
  campaignsInBuild: () => true,
  campaignsEnabled: () => true,
}));

import { DELETE as takeDownCampaign } from "@/app/api/campaigns/[id]/route";
import { POST as uploadCampaignImage } from "@/app/api/campaigns/image/route";
import { DELETE as deleteReview, POST as saveReview } from "@/app/api/trapeza/[id]/reviews/route";
import { POST as submitRecipe } from "@/app/api/trapeza/route";
import { POST as uploadKitchenPhoto } from "@/app/api/trapeza/upload/route";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const RECIPE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RANDOM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const SITE = "https://purifyapp.net";

let w: World;

function signIn(id: string | null) {
  state.user = id ? { id, email: `${id.slice(0, 4)}@example.com`, user_metadata: { display_name: "Reader" } } : null;
}

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  w.tables.trapeza_recipes!.push({ id: RECIPE, author_id: null, status: "published", photo_url: null });
  state.admin = client(w);
  signIn(ANNA);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function photo(type = "image/jpeg") {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "photo", { type }));
  return form;
}
const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const params = (id: string) => ({ params: Promise.resolve({ id }) });

/** Upload one Kitchen photo as the signed-in reader; returns its URL. */
async function upload(kind: "review" | "recipe", type?: string): Promise<string> {
  const res = await uploadKitchenPhoto(
    new Request(`${SITE}/api/trapeza/upload?kind=${kind}`, { method: "POST", body: photo(type) }),
  );
  expect(res.status).toBe(200);
  return ((await res.json()) as { url: string }).url;
}

const review = (photoUrls: string[], extra: Row = {}) =>
  saveReview(
    new Request(`${SITE}/api/trapeza/${RECIPE}/reviews`, json({ stars: 5, body: "Good.", photoUrls, ownPhotos: true, ...extra })),
    params(RECIPE),
  );
const reviewRow = (author: string) =>
  w.tables.trapeza_recipe_reviews!.find((r) => r.author_id === author);
const owners = () => w.tables.upload_owners!;
const kitchenPath = (url: string) => url.slice(publicUrl("kitchen", "").length);

describe("Kitchen photo upload", () => {
  it("stores a review photo on a random path and writes down whose it is", async () => {
    const url = await upload("review");
    const path = kitchenPath(url);
    expect(url.startsWith(publicUrl("kitchen", "r/"))).toBe(true);
    expect(path.slice(2)).toMatch(RANDOM);
    expect(url).not.toContain(ANNA);
    expect(w.objects.has(`kitchen/${path}`)).toBe(true);
    expect(owners()).toMatchObject([{ bucket: "kitchen", path, owner_id: ANNA }]);
  });

  it("stores a recipe photo under s/, with the right extension", async () => {
    const url = await upload("recipe", "image/webp");
    expect(kitchenPath(url)).toMatch(/^s\/.*\.webp$/);
    expect(url).not.toContain(ANNA);
  });

  it("turns away a reader who is not signed in", async () => {
    signIn(null);
    const res = await uploadKitchenPhoto(
      new Request(`${SITE}/api/trapeza/upload?kind=review`, { method: "POST", body: photo() }),
    );
    expect(res.status).toBe(401);
    expect(w.objects.size).toBe(0);
  });

  it("stores nothing while the owners table is not there", async () => {
    w.tables.upload_owners = null;
    const res = await uploadKitchenPhoto(
      new Request(`${SITE}/api/trapeza/upload?kind=review`, { method: "POST", body: photo() }),
    );
    expect(res.status).toBe(503);
    expect(w.objects.size).toBe(0);
    expect(w.calls.upload).toBe(0);
  });

  it("stores nothing it could not write an owner down for", async () => {
    w.fail.insert = "upload_owners";
    const res = await uploadKitchenPhoto(
      new Request(`${SITE}/api/trapeza/upload?kind=review`, { method: "POST", body: photo() }),
    );
    expect(res.status).toBe(500);
    expect(w.calls.upload).toBe(0);
  });

  it("takes the record back when the file does not go up", async () => {
    w.fail.upload = true;
    const res = await uploadKitchenPhoto(
      new Request(`${SITE}/api/trapeza/upload?kind=review`, { method: "POST", body: photo() }),
    );
    expect(res.status).toBe(500);
    expect(owners()).toEqual([]);
  });
});

describe("Kitchen reviews", () => {
  it("attaches the caller's own uploads", async () => {
    const one = await upload("review");
    const two = await upload("review");
    const res = await review([one, two]);
    expect(res.status).toBe(200);
    expect(reviewRow(ANNA)?.photo_urls).toEqual([one, two]);
  });

  it("refuses a photo another member uploaded", async () => {
    signIn(BEN);
    const bens = await upload("review");
    signIn(ANNA);
    const res = await review([bens]);
    expect(res.status).toBe(400);
    expect(reviewRow(ANNA)).toBeUndefined();
  });

  it("refuses a recipe photo, an avatar, another host, and a path nobody uploaded", async () => {
    const recipePhoto = await upload("recipe");
    for (const url of [
      recipePhoto,
      publicUrl("avatars", "b/99999999-9999-4999-8999-999999999999.jpg"),
      "https://evil.example/storage/v1/object/public/kitchen/r/99999999-9999-4999-8999-999999999999.jpg",
      publicUrl("kitchen", "r/99999999-9999-4999-8999-999999999999.jpg"),
    ]) {
      expect((await review([url])).status, url).toBe(400);
    }
    expect(reviewRow(ANNA)).toBeUndefined();
  });

  it("attaches nothing new from an old path, even the caller's own", async () => {
    const old = publicUrl("kitchen", `r/${ANNA}/1727500000000-abc123.jpg`);
    w.objects.add(`kitchen/r/${ANNA}/1727500000000-abc123.jpg`);
    expect((await review([old])).status).toBe(400);
  });

  it("refuses photos nobody said were their own", async () => {
    const one = await upload("review");
    expect((await review([one], { ownPhotos: false })).status).toBe(400);
  });

  it("lets an edit keep the photos the review already carries, old path and all", async () => {
    const oldPath = `r/${ANNA}/1727500000000-abc123.jpg`;
    const old = publicUrl("kitchen", oldPath);
    w.objects.add(`kitchen/${oldPath}`);
    w.tables.trapeza_recipe_reviews!.push({
      id: "k1", recipe_id: RECIPE, author_id: ANNA, author_name: "Anna", stars: 4,
      photo_urls: [old], status: "published",
    });
    // Nothing recorded and no record to read: the edit still goes through.
    w.tables.upload_owners = null;
    expect((await review([old])).status).toBe(200);

    w.tables.upload_owners = [];
    const added = await upload("review");
    expect((await review([old, added])).status).toBe(200);
    expect(reviewRow(ANNA)?.photo_urls).toEqual([old, added]);
    expect(reviewRow(ANNA)?.stars).toBe(5);
  });

  it("deletes a photo the edit drops, and forgets it", async () => {
    const one = await upload("review");
    const two = await upload("review");
    await review([one, two]);
    expect((await review([two])).status).toBe(200);
    expect(w.objects.has(`kitchen/${kitchenPath(one)}`)).toBe(false);
    expect(w.objects.has(`kitchen/${kitchenPath(two)}`)).toBe(true);
    expect(owners().map((r) => r.path)).toEqual([kitchenPath(two)]);
  });

  it("deletes the review's photos with the review", async () => {
    const one = await upload("review");
    await review([one]);
    const res = await deleteReview(
      new Request(`${SITE}/api/trapeza/${RECIPE}/reviews`, { method: "DELETE" }),
      params(RECIPE),
    );
    expect(res.status).toBe(200);
    expect(reviewRow(ANNA)).toBeUndefined();
    expect(w.objects.size).toBe(0);
    expect(owners()).toEqual([]);
  });

  it("does not let an edit bring back a review a moderator took down", async () => {
    const one = await upload("review");
    await review([one]);
    reviewRow(ANNA)!.status = "removed";
    expect((await review([one])).status).toBe(403);
  });
});

describe("Kitchen recipe submission", () => {
  const recipe = (photoUrl: string | null, ownPhoto = true) =>
    submitRecipe(
      new Request(
        `${SITE}/api/trapeza`,
        json({
          title: "Lentil soup", fastLevel: "xerophagy", season: "lent", tradition: "greek",
          ingredients: "Lentils", steps: "Boil them.", photoUrl, ownPhoto,
        }),
      ),
    );
  const submitted = () => w.tables.trapeza_recipes!.find((r) => r.author_id === ANNA);

  it("attaches the caller's own photo", async () => {
    const url = await upload("recipe");
    expect((await recipe(url)).status).toBe(200);
    expect(submitted()).toMatchObject({ photo_url: url, status: "pending" });
  });

  it("refuses another member's photo, a review photo, and an old path", async () => {
    signIn(BEN);
    const bens = await upload("recipe");
    signIn(ANNA);
    const reviewPhoto = await upload("review");
    const old = publicUrl("kitchen", `s/${ANNA}/1727500000000-abc123.jpg`);
    for (const url of [bens, reviewPhoto, old]) expect((await recipe(url)).status, url).toBe(400);
    expect(submitted()).toBeUndefined();
  });

  it("still takes a recipe with no photo, with no record to read", async () => {
    w.tables.upload_owners = null;
    expect((await recipe(null, false)).status).toBe(200);
    expect(submitted()).toMatchObject({ photo_url: null });
  });
});

describe("prayer campaign pictures", () => {
  const mediaPath = (url: string) => url.slice(publicUrl("campaign-media", "").length);

  async function uploadPicture(): Promise<string> {
    const res = await uploadCampaignImage(
      new Request(`${SITE}/api/campaigns/image`, { method: "POST", body: photo("image/png") }),
    );
    expect(res.status).toBe(200);
    return ((await res.json()) as { url: string }).url;
  }
  /** A July campaign row, as the table held them: the creator and the one picture it names. */
  function julyCampaign(creator: string, imageUrl: string | null, id: string = crypto.randomUUID()): string {
    w.tables.prayer_campaigns!.push({ id, creator_id: creator, title: "For Maria", status: "active", audience: "public", image_url: imageUrl });
    return id;
  }
  const takeDown = (id: string) =>
    takeDownCampaign(new Request(`${SITE}/api/campaigns/${id}`, { method: "DELETE" }), params(id));
  const campaign = (id: string) => w.tables.prayer_campaigns!.find((r) => r.id === id);

  it("stores a picture on a random path and writes down whose it is", async () => {
    const url = await uploadPicture();
    const path = mediaPath(url);
    expect(path).toMatch(/^c\//);
    expect(path.slice(2)).toMatch(RANDOM);
    expect(url).not.toContain(ANNA);
    expect(w.objects.has(`campaign-media/${path}`)).toBe(true);
    expect(owners()).toMatchObject([{ bucket: "campaign-media", path, owner_id: ANNA }]);
  });

  it("stores nothing while the owners table is not there", async () => {
    w.tables.upload_owners = null;
    const res = await uploadCampaignImage(
      new Request(`${SITE}/api/campaigns/image`, { method: "POST", body: photo() }),
    );
    expect(res.status).toBe(503);
    expect(w.objects.size).toBe(0);
  });

  it("deletes the creator's own picture when they take the campaign down, and the row with it", async () => {
    const url = await uploadPicture();
    const id = julyCampaign(ANNA, url);
    expect((await takeDown(id)).status).toBe(200);
    expect(campaign(id)).toBeUndefined();
    expect(w.objects.size).toBe(0);
    expect(owners()).toEqual([]);
  });

  it("deletes a picture on an old path that carries the creator's own id", async () => {
    const oldPath = `c/${ANNA}/1727500000000.jpg`;
    w.objects.add(`campaign-media/${oldPath}`);
    const id = julyCampaign(ANNA, publicUrl("campaign-media", oldPath));
    expect((await takeDown(id)).status).toBe(200);
    expect(w.objects.has(`campaign-media/${oldPath}`)).toBe(false);
  });

  it("never deletes somebody else's picture that a campaign row names", async () => {
    // Anna's campaign, with her picture.
    const annas = await uploadPicture();
    julyCampaign(ANNA, annas);
    const annasOld = `c/${ANNA}/1727500000000.jpg`;
    w.objects.add(`campaign-media/${annasOld}`);
    // Rows as July's create route once accepted them, with only a host
    // check: Ben's campaigns name Anna's pictures as their own.
    const first = julyCampaign(BEN, annas);
    const second = julyCampaign(BEN, publicUrl("campaign-media", annasOld));
    signIn(BEN);
    expect((await takeDown(first)).status).toBe(200);
    expect((await takeDown(second)).status).toBe(200);
    expect(campaign(first)).toBeUndefined();
    expect(w.objects.has(`campaign-media/${mediaPath(annas)}`)).toBe(true);
    expect(w.objects.has(`campaign-media/${annasOld}`)).toBe(true);
    expect(w.calls.remove).toBe(0);
  });

  it("only lets the creator take a campaign down", async () => {
    const url = await uploadPicture();
    const id = julyCampaign(ANNA, url);
    signIn(BEN);
    expect((await takeDown(id)).status).toBe(403);
    expect(campaign(id)).toBeDefined();
    expect(w.objects.size).toBe(1);
  });
});
