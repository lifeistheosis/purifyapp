import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * A campaign's pictures (his item 121; lib/campaigns/pictures.ts), run
 * against an in-memory Supabase with real images, made here, through the
 * decoder and encoder the route really runs.
 *
 * They ship in 1.9 BUILT AND SWITCHED OFF, behind two locks that are both
 * his: the pictures' switch on the server (lib/campaigns/parts.ts), and an
 * automatic check that does not exist yet (lib/campaigns/pictureCheck.ts).
 *
 * What would go wrong if these broke: a photograph stored with the place it
 * was taken inside it; a picture of a sick person, or of a child, loadable
 * by anyone before a moderator has looked; a picture left at a public
 * address after its creator removed it, after its campaign was taken down,
 * or after readers said it shows someone who did not agree; a reader given
 * twenty pictures by telling the server they have Plus; and any of it
 * answering at all while it is switched off.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> },
  admins: new Set<string>(),
  standing: "reader" as "reader" | "admin" | "held",
  staff: new Set<string>(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }), getSession: async () => ({ data: { session: null } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: (email?: string | null) => Boolean(email && state.admins.has(email)) }));
vi.mock("@/lib/community/adminStanding", () => ({ requestStanding: async () => state.standing, standingOf: () => state.standing }));
vi.mock("@/lib/community/trustServer", () => ({ staffAmong: async () => state.staff, STAFF_BADGES: ["team", "moderator"] }));
vi.mock("@/lib/profile/server", () => ({ identity: async () => ({ name: "A moderator" }) }));
vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => {}, ownBannerPaths: async () => [] }));
vi.mock("@/lib/community/notify", () => ({
  insertNotifications: async () => {},
  notifyClergyOfQuestion: async () => {},
  notifyMentions: async () => {},
  notifyOfReply: async () => {},
}));
vi.mock("@/lib/community/moderation", async (original) => {
  const real = await original<typeof import("@/lib/community/moderation")>();
  return {
    ...real,
    readPendingHolds: async () => ({ rows: [], live: true }),
    readOpenReports: async () => [],
    readModLog: async () => ({ rows: [], live: true }),
    runModAction: async () => ({ ok: true }),
  };
});

import { DELETE as takeDown } from "@/app/api/campaigns/[id]/route";
import { DELETE as removeOne, GET as list, POST as add } from "@/app/api/campaigns/[id]/pictures/route";
import { POST as report } from "@/app/api/campaigns/[id]/report/route";
import { GET as queue, POST as decide } from "@/app/api/community/moderation/route";
import { accountFiles } from "@/lib/auth/accountFiles";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { CAMPAIGN_BUCKET } from "@/lib/campaigns/image";
import { PICTURES_FREE, PICTURES_PLUS, showsPlusPlace, type CampaignPictures, type WaitingPicture } from "@/lib/campaigns/model";
import { approveCampaign, removeCampaign } from "@/lib/campaigns/moderation";
import { __resetCampaignParts, __setCampaignPart } from "@/lib/campaigns/parts";
import { PICTURE_CHECK, __setPictureCheck, type PictureVerdict } from "@/lib/campaigns/pictureCheck";
import { HELD_BUCKET } from "@/lib/campaigns/pictures";
import { runCampaignUpkeep } from "@/lib/campaigns/upkeep";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const DAN = "44444444-4444-4444-8444-444444444444";
const TEAM = "99999999-9999-4999-8999-999999999999";
const SITE = "https://purifyapp.net";
const DAY = 86_400_000;
const MOD = { id: TEAM, name: "The team", email: "team@example.com", admin: true };
const source = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

let w: World;
/** What the automatic check was shown, in order. */
let checked: { bytes: Buffer; type: string }[];

function signIn(id: string | null) {
  state.user = id ? { id, email: `${id.slice(0, 4)}@example.com`, created_at: new Date(Date.now() - 90 * DAY).toISOString(), user_metadata: {} } : null;
  state.standing = "reader";
}
/** The team's own account, past the sign-in code. */
function signInTeam() {
  state.user = { id: TEAM, email: "team@example.com", created_at: new Date(Date.now() - 400 * DAY).toISOString(), user_metadata: {} };
  state.admins = new Set(["team@example.com"]);
  state.standing = "admin";
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: unknown, method = "POST") => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const plus = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const today = () => new Date().toISOString().slice(0, 10);

/** A phone's photograph: landscape pixels tagged "turn on display", carrying where it was taken. */
async function phonePhoto(): Promise<Buffer> {
  return sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#7a4b2a" } })
    .jpeg()
    .withExif({
      IFD0: { Make: "Phone", Model: "Test" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "40/1 44/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "73/1 59/1 0/1" },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}
let small: Buffer;
/** A small picture, for the cases that are not about what is inside it. */
async function smallPhoto(): Promise<Buffer> {
  small ??= await sharp({ create: { width: 64, height: 48, channels: 3, background: "#335577" } }).jpeg().toBuffer();
  return small;
}

function running(over: Row = {}): string {
  const id = crypto.randomUUID();
  w.tables.prayer_campaigns!.push({
    id,
    creator_id: ANNA,
    title: "For Maria's healing",
    intention: "healing",
    for_whom: "living",
    subject_name: "Maria",
    details: null,
    note: null,
    days: 7,
    starts_on: today(),
    ends_on: new Date(Date.now() + 6 * DAY).toISOString().slice(0, 10),
    ends_at: plus(7),
    ended_at: null,
    prayer_rule: null,
    prayer_id: null,
    status: "active",
    audience: "public",
    listed: true,
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: new Date().toISOString(),
    held_reason: null,
    mod_cleared_at: null,
    keep_after_end: false,
    comments_open: true,
    ...over,
  });
  return id;
}

type Sent = { adult?: string | null; consent?: string | null; alt?: string; type?: string; name?: string };
/** Send one picture to a campaign as whoever is signed in. */
async function send(id: string, bytes: Buffer, said: Sent = {}) {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(bytes)], said.name ?? "photo.jpg", { type: said.type ?? "image/jpeg" }));
  if (said.adult !== null) form.set("adult", said.adult ?? "yes");
  if (said.consent !== null) form.set("consent", said.consent ?? "yes");
  if (said.alt !== undefined) form.set("alt", said.alt);
  return add(new Request(`${SITE}/api/campaigns/${id}/pictures`, { method: "POST", body: form }), params(id));
}
/** Add one and say which. */
async function added(id: string, said: Sent = {}): Promise<string> {
  const res = await send(id, await smallPhoto(), said);
  expect(res.status).toBe(200);
  return ((await res.json()) as { id: string }).id;
}
const shown = async (id: string) => (await (await list(new Request(`${SITE}/api/campaigns/${id}/pictures`), params(id))).json()) as CampaignPictures;
const pictures = () => w.tables.prayer_campaign_pictures!;
const picture = (id: string) => pictures().find((p) => p.id === id)!;
const stored = (bucket: string) => [...w.objects].filter((o) => o.startsWith(`${bucket}/`));
const owners = () => w.tables.upload_owners!.map((o) => `${o.bucket}/${o.path}:${o.owner_id}`).sort();
const log = () => w.tables.community_mod_log!.map((l) => `${l.action}:${l.target_kind}`);
const act = (action: string, id: string, reason?: string) => decide(new Request(`${SITE}/api/community/moderation`, json({ action, id, reason })));
const tell = (campaign: string, body: Record<string, unknown>) => report(new Request(`${SITE}/api/campaigns/${campaign}/report`, json(body)), params(campaign));

/** Every picture is cleared by the check unless a case says otherwise. */
function checkAnswers(verdict: PictureVerdict | (() => never)) {
  __setPictureCheck(async (bytes, type) => {
    checked.push({ bytes, type });
    if (typeof verdict === "function") return verdict();
    return verdict;
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "1";
  w = world();
  w.users = new Set([ANNA, BEN, CARA, DAN, TEAM]);
  w.emails.set(TEAM, "team@example.com");
  w.tables.prayer_campaigns = [];
  w.tables.prayer_campaign_pictures = [];
  w.tables.prayer_campaign_reports = [];
  w.tables.prayer_campaign_prayers = [];
  w.tables.community_blocks = [];
  w.tables.community_mutes = [];
  w.tables.community_mod_log = [];
  w.tables.community_posts = [];
  w.tables.entitlements = [];
  w.tables.user_badges = [];
  w.tables.profiles = [ANNA, BEN, CARA, DAN, TEAM].map((id) => ({ id, joined_at: new Date(Date.now() - 90 * DAY).toISOString(), banner_url: null }));
  state.admin = client(w);
  state.admins = new Set();
  state.staff = new Set();
  checked = [];
  __setCampaignsOpening("open");
  __resetCampaignParts();
  __setCampaignPart("pictures", true);
  checkAnswers({ verdict: "clear", detail: "nothing found" });
  signIn(ANNA);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setCampaignsOpening("closed");
  __resetCampaignParts();
  __setPictureCheck(PICTURE_CHECK);
  vi.restoreAllMocks();
});

describe("switched off, as it ships", () => {
  /** A client that says which tables were asked, and holds nothing. */
  function watched() {
    const asked: string[] = [];
    const real = client(w);
    state.admin = { ...real, from: (table: string) => (asked.push(table), real.from(table)) };
    return asked;
  }

  it("answers nothing and reads nothing: not the list, not an upload, not a removal", async () => {
    const id = running();
    const kept = await added(id);
    __resetCampaignParts();
    const asked = watched();
    const before = [...w.objects];
    expect((await list(new Request(`${SITE}/api/campaigns/${id}/pictures`), params(id))).status).toBe(404);
    expect((await send(id, await smallPhoto())).status).toBe(404);
    expect((await removeOne(new Request(`${SITE}/api/campaigns/${id}/pictures?picture=${kept}`, { method: "DELETE" }), params(id))).status).toBe(404);
    expect(asked).toEqual([]);
    expect([...w.objects]).toEqual(before);
    expect(pictures()).toHaveLength(1);
  });

  it("is not something a moderator can decide, the team's queue does not carry it, and a picture cannot be reported", async () => {
    const id = running();
    const kept = await added(id);
    __resetCampaignParts();
    signInTeam();
    expect((await act("approve_picture", kept)).status).toBe(404);
    expect((await act("remove_picture", kept)).status).toBe(404);
    expect(picture(kept).status).toBe("held");
    const asked = watched();
    const body = (await (await queue(new Request(`${SITE}/api/community/moderation`))).json()) as { campaigns: Record<string, unknown> };
    expect(body.campaigns).toBeDefined();
    expect("pictures" in body.campaigns).toBe(false);
    expect(asked).not.toContain("prayer_campaign_pictures");
    signIn(BEN);
    expect((await tell(id, { reason: "picture", picture: kept })).status).toBe(400);
    expect(w.tables.prayer_campaign_reports).toEqual([]);
  });

  it("has a second lock: with the switch on and no checking service, no picture is accepted at all", async () => {
    // What is committed: no service.
    expect(PICTURE_CHECK).toBeNull();
    __setPictureCheck(PICTURE_CHECK);
    const id = running();
    const res = await send(id, await smallPhoto());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("no_check");
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
    // And its creator is not offered a place to add one.
    expect((await shown(id)).canAdd).toBe(false);
  });

  it("loads only on the server, both files", () => {
    for (const file of ["lib/campaigns/pictures.ts", "lib/campaigns/pictureCheck.ts", "lib/campaigns/reportsSay.ts"]) {
      expect(source(file).startsWith('import "server-only";'), file).toBe(true);
    }
  });
});

describe("what is stored", () => {
  it("is the picture made again: no place, no device, upright, 1600 pixels at most", async () => {
    const original = await phonePhoto();
    // The photo sent really carries where it was taken (tag 0x8825, the GPS block).
    expect((await sharp(original).metadata()).exif?.includes(Buffer.from([0x25, 0x88]))).toBe(true);
    const id = running();
    expect((await send(id, original)).status).toBe(200);

    const [object] = stored(HELD_BUCKET);
    const kept = w.bodies.get(object) as Buffer;
    expect(Buffer.isBuffer(kept)).toBe(true);
    expect(kept.equals(original)).toBe(false);
    const meta = await sharp(kept).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(kept.includes(Buffer.from("Phone"))).toBe(false);
    // Turned as it was meant to be seen, then made smaller.
    expect([meta.width, meta.height]).toEqual([1200, 1600]);
    expect(picture(pictures()[0].id as string)).toMatchObject({ width: 1200, height: 1600 });
    // Nothing else was stored anywhere: the photo as it was sent is kept nowhere.
    expect([...w.objects]).toEqual([object]);
  });

  it("is what the automatic check was shown, and the check is never told whose it is", async () => {
    const id = running();
    await send(id, await phonePhoto());
    expect(checked).toHaveLength(1);
    expect((await sharp(checked[0].bytes).metadata()).exif).toBeUndefined();
    expect(checked[0].bytes.equals(w.bodies.get(stored(HELD_BUCKET)[0]) as Buffer)).toBe(true);
    expect(checked[0].type).toBe("image/jpeg");
  });

  it("waits in a private place under a name that says nothing, written down as its creator's", async () => {
    const id = running();
    const pic = await added(id, { alt: "  Maria   in the garden " });
    expect(w.buckets.get(HELD_BUCKET)).toEqual({ public: false });
    const row = picture(pic);
    expect(row).toMatchObject({ campaign_id: id, bucket: HELD_BUCKET, status: "held", position: 0, alt: "Maria in the garden", check_result: "nothing found" });
    expect(String(row.path)).toMatch(/^c\/[0-9a-f-]{36}\.jpg$/);
    expect(String(row.path)).not.toContain(ANNA);
    expect(String(row.path)).not.toContain(id);
    expect(typeof row.consent_at).toBe("string");
    expect(owners()).toEqual([`${HELD_BUCKET}/${row.path}:${ANNA}`]);
    expect(stored(CAMPAIGN_BUCKET)).toEqual([]);
  });
});

describe("who is handed a picture that waits", () => {
  it("its creator alone, by an address that expires; nobody else learns that one waits", async () => {
    const id = running();
    await added(id);
    const mine = await shown(id);
    expect(mine).toMatchObject({ limit: PICTURES_FREE, canAdd: true });
    expect(mine.pictures).toHaveLength(1);
    expect(mine.pictures[0].held).toBe(true);
    expect(mine.pictures[0].url).toContain(`/object/sign/${HELD_BUCKET}/`);
    expect(mine.pictures[0].url).not.toContain("/object/public/");
    for (const who of [BEN, null]) {
      signIn(who);
      expect(await shown(id)).toEqual({ pictures: [], limit: null, canAdd: false });
    }
  });

  it("nobody at all on a campaign they may not open", async () => {
    const id = running({ status: "held" });
    await added(id);
    signIn(BEN);
    expect((await list(new Request(`${SITE}/api/campaigns/${id}/pictures`), params(id))).status).toBe(404);
  });
});

describe("what is asked before a picture is taken", () => {
  it("both lines, each with a yes", async () => {
    const id = running();
    for (const said of [{ adult: null }, { consent: null }, { adult: "no" }, { consent: "true" }] as Sent[]) {
      const res = await send(id, await smallPhoto(), said);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("affirm");
    }
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(checked).toEqual([]);
  });

  it("only from the campaign's own creator, signed in", async () => {
    const id = running();
    signIn(BEN);
    expect((await send(id, await smallPhoto())).status).toBe(404);
    signIn(null);
    expect((await send(id, await smallPhoto())).status).toBe(401);
    expect(pictures()).toEqual([]);
  });

  it("a still picture of the three kinds, and nothing that is not one", async () => {
    const id = running();
    expect((await send(id, await smallPhoto(), { type: "image/gif", name: "a.gif" })).status).toBe(400);
    expect((await send(id, Buffer.from("not a picture at all"))).status).toBe(400);
    expect((await send(id, Buffer.alloc(4 * 1024 * 1024 + 1))).status).toBe(400);
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
  });

  it("a body that is too large is dropped as it arrives, whatever it says of its own length", async () => {
    const id = running();
    // Five megabytes sent as a stream, with no length declared.
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 5 * 1024 * 1024) return controller.close();
        sent += 64 * 1024;
        controller.enqueue(new Uint8Array(64 * 1024));
      },
    });
    const res = await add(
      new Request(`${SITE}/api/campaigns/${id}/pictures`, { method: "POST", body, headers: { "content-type": "multipart/form-data; boundary=x" }, duplex: "half" } as RequestInit),
      params(id),
    );
    expect(res.status).toBe(413);
    // It stopped reading soon after the limit, and did not take the whole of it in.
    expect(sent).toBeLessThan(5 * 1024 * 1024);
    expect(pictures()).toEqual([]);
    // And one that only claims to be too large is refused before a byte is read.
    const claims = await add(
      new Request(`${SITE}/api/campaigns/${id}/pictures`, { method: "POST", body: "x", headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(50 * 1024 * 1024) } }),
      params(id),
    );
    expect(claims.status).toBe(413);
  });

  it("the words for what it shows cannot carry a link, as nothing in a campaign can", async () => {
    const id = running();
    const res = await send(id, await smallPhoto(), { alt: "See more at example.com/maria" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("campaign_link");
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
  });

  it("by what its bytes are, not by what the upload calls itself", async () => {
    const id = running();
    // A drawing in SVG is a program for a renderer, and the image library
    // would open it. A moving GIF is not a still. Each says it is a JPEG.
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#335577"/></svg>');
    const gif = await sharp({ create: { width: 8, height: 6, channels: 3, background: "#335577" } }).gif().toBuffer();
    for (const [what, bytes] of [["svg", svg], ["gif", gif]] as const) {
      const res = await send(id, bytes, { type: "image/jpeg", name: "photo.jpg" });
      expect(res.status, what).toBe(400);
      expect(((await res.json()) as { code: string }).code, what).toBe("picture_type");
    }
    // A real WebP is one of the three, and is stored as a JPEG like the rest.
    const webp = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#335577" } }).webp().toBuffer();
    expect((await send(id, webp, { type: "image/webp", name: "photo.webp" })).status).toBe(200);
    expect(checked).toHaveLength(1);
    expect(pictures()).toHaveLength(1);
    expect(String(pictures()[0].path)).toMatch(/\.jpg$/);
  });

  it("only on a campaign that waits or runs, and never on one of July's", async () => {
    const waiting = running({ status: "held" });
    expect((await send(waiting, await smallPhoto())).status).toBe(200);
    for (const over of [{ status: "ended" }, { status: "answered" }, { ends_at: plus(-1) }, { days: null }, { status: "removed" }] as Row[]) {
      const id = running(over);
      const res = await send(id, await smallPhoto());
      expect([404, 409], JSON.stringify(over)).toContain(res.status);
    }
    expect(pictures()).toHaveLength(1);
  });
});

describe("three, or twenty with Plus, by the server's own record", () => {
  const give = (until: string | null) => {
    w.tables.entitlements = [{ user_id: ANNA, plus_until: until, pro_until: null }];
  };

  it("stops at three and says where Plus is met", async () => {
    const id = running();
    for (let i = 0; i < PICTURES_FREE; i++) await added(id);
    const res = await send(id, await smallPhoto());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "picture_limit", limit: 3, plus: true });
    expect(pictures()).toHaveLength(3);
    expect(stored(HELD_BUCKET)).toHaveLength(3);
    expect(await shown(id)).toMatchObject({ limit: 3, canAdd: false });
    expect(pictures().map((p) => p.position)).toEqual([0, 1, 2]);
  });

  it("takes twenty from a reader whose entitlement says Plus now, and no more", async () => {
    give(plus(30));
    const id = running();
    for (let i = 0; i < PICTURES_PLUS; i++) await added(id);
    const res = await send(id, await smallPhoto());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "picture_limit", limit: 20, plus: false });
    expect(pictures()).toHaveLength(20);
  });

  it("never believes the request about Plus", async () => {
    const id = running();
    for (let i = 0; i < PICTURES_FREE; i++) await added(id);
    const form = new FormData();
    form.set("file", new File([new Uint8Array(await smallPhoto())], "p.jpg", { type: "image/jpeg" }));
    form.set("adult", "yes");
    form.set("consent", "yes");
    form.set("plus", "true");
    form.set("limit", "20");
    const res = await add(new Request(`${SITE}/api/campaigns/${id}/pictures?plus=1`, { method: "POST", body: form, headers: { "x-plus": "1" } }), params(id));
    expect(res.status).toBe(409);
    expect(pictures()).toHaveLength(3);
  });

  it("when Plus lapses, leaves what is up and adds no more past three", async () => {
    give(plus(30));
    const id = running();
    for (let i = 0; i < 5; i++) await added(id);
    give(plus(-1));
    expect((await send(id, await smallPhoto())).status).toBe(409);
    expect(pictures()).toHaveLength(5);
    expect((await shown(id)).pictures).toHaveLength(5);
  });

  it("gives a removed picture's place to the next one", async () => {
    const id = running();
    const [, second] = [await added(id), await added(id), await added(id)];
    expect((await removeOne(new Request(`${SITE}/api/campaigns/${id}/pictures?picture=${second}`, { method: "DELETE" }), params(id))).status).toBe(200);
    const next = await added(id);
    expect(picture(next).position).toBe(1);
  });
});

describe("the place that wears the Plus mark", () => {
  // Its creator, at the three everyone has, where Plus can be bought.
  const met = { mine: true, canAdd: false, limit: PICTURES_FREE, pictures: PICTURES_FREE, plusSold: true };

  it("is drawn where Plus is met: its creator, at three, on a device that can buy it", () => {
    expect(showsPlusPlace(met)).toBe(true);
  });

  it("is never promised to every reader, and never where it cannot be bought", () => {
    // Another reader is told no limit at all.
    expect(showsPlusPlace({ ...met, mine: false, limit: null })).toBe(false);
    // A phone whose store does not sell Plus: the limit there is three, and no door is shown.
    expect(showsPlusPlace({ ...met, plusSold: false })).toBe(false);
    // While a place is still free, "Add a picture" stands there.
    expect(showsPlusPlace({ ...met, canAdd: true, pictures: 2 })).toBe(false);
    // With Plus, twenty is the whole of it.
    expect(showsPlusPlace({ ...met, limit: PICTURES_PLUS, pictures: PICTURES_PLUS })).toBe(false);
    // Nothing can be added because the campaign has ended, with one picture up: that is not the limit, and Plus would not change it.
    expect(showsPlusPlace({ ...met, pictures: 1 })).toBe(false);
  });
});

describe("the automatic check, before any person", () => {
  it("refused: nothing is stored, and its writer is told only that it cannot be used", async () => {
    checkAnswers({ verdict: "refuse", detail: "nudity" });
    const id = running();
    const res = await send(id, await smallPhoto());
    expect(res.status).toBe(422);
    const text = await res.text();
    expect(JSON.parse(text)).toMatchObject({ code: "picture_refused" });
    expect(text).not.toContain("nudity");
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
  });

  it("flagged for a report: nothing is stored or shown, the same words to its writer, and the team is told", async () => {
    checkAnswers({ verdict: "report", detail: "known image, list A" });
    const id = running();
    const res = await send(id, await smallPhoto());
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "picture_refused" });
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(w.tables.community_mod_log).toMatchObject([{ action: "picture_flagged", target_kind: "campaign", target_id: id, actor_name: "Auto-moderation", summary: "known image, list A" }]);
  });

  it("a check that cannot answer is not a pass", async () => {
    checkAnswers(() => {
      throw new Error("the service is down");
    });
    const id = running();
    expect((await send(id, await smallPhoto())).status).toBe(503);
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
  });
});

describe("a moderator looks", () => {
  it("cleared: it moves to the public place under a new name, and every reader is handed it", async () => {
    const id = running();
    const pic = await added(id);
    const heldPath = String(picture(pic).path);
    signInTeam();
    expect((await act("approve_picture", pic)).status).toBe(200);

    const row = picture(pic);
    expect(row).toMatchObject({ bucket: CAMPAIGN_BUCKET, status: "shown", reviewed_by_email: "team@example.com" });
    expect(row.path).not.toBe(heldPath);
    expect(stored(HELD_BUCKET)).toEqual([]);
    expect(stored(CAMPAIGN_BUCKET)).toEqual([`${CAMPAIGN_BUCKET}/${row.path}`]);
    // Written down as its creator's, so the account's deletion takes it; the old record is gone.
    expect(owners()).toEqual([`${CAMPAIGN_BUCKET}/${row.path}:${ANNA}`]);
    expect(log()).toEqual(["approve_picture:picture"]);

    signIn(null);
    const seen = await shown(id);
    expect(seen.pictures).toHaveLength(1);
    expect(seen.pictures[0]).toMatchObject({ id: pic, held: false });
    expect(seen.pictures[0].url).toContain(`/object/public/${CAMPAIGN_BUCKET}/${row.path}`);
  });

  it("refused: the file is deleted, the row is kept as the record, and its place is free", async () => {
    const id = running();
    const pic = await added(id);
    signInTeam();
    expect((await act("remove_picture", pic, "Shows a child who is not theirs")).status).toBe(200);
    expect([...w.objects]).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
    expect(picture(pic)).toMatchObject({ status: "removed", removed_reason: "Shows a child who is not theirs" });
    expect(log()).toEqual(["remove_picture:picture"]);
    signIn(ANNA);
    expect((await shown(id)).pictures).toEqual([]);
    expect(picture(await added(id)).position).toBe(0);
  });

  it("is the team alone: a reader with the Moderator badge decides nothing about a picture and is shown none", async () => {
    const id = running();
    const pic = await added(id);
    signIn(BEN);
    w.tables.user_badges = [{ user_id: BEN, badge: "moderator" }];
    expect((await act("approve_picture", pic)).status).toBe(404);
    expect((await act("remove_picture", pic)).status).toBe(404);
    expect(picture(pic).status).toBe("held");
    const body = (await (await queue(new Request(`${SITE}/api/community/moderation`))).json()) as { campaigns: Record<string, unknown> };
    expect(body.campaigns).toBeDefined();
    expect("pictures" in body.campaigns).toBe(false);
  });

  it("the team's queue shows each waiting picture by an address that expires, with its campaign and never an account", async () => {
    const id = running();
    const pic = await added(id, { alt: "Maria in the garden" });
    signInTeam();
    const res = await queue(new Request(`${SITE}/api/community/moderation`));
    const text = await res.text();
    const { campaigns } = JSON.parse(text) as { campaigns: { pictures: WaitingPicture[] } };
    expect(campaigns.pictures).toHaveLength(1);
    expect(campaigns.pictures[0]).toMatchObject({ id: pic, shown: false, alt: "Maria in the garden", check_result: "nothing found", reports: [], campaign: { id, title: "For Maria's healing", creator_name: "Anna" } });
    expect(campaigns.pictures[0].url).toContain(`/object/sign/${HELD_BUCKET}/`);
    expect(Object.keys(campaigns.pictures[0]).sort()).toEqual(["alt", "campaign", "check_result", "created_at", "id", "reports", "shown", "url"]);
    // Where the file is kept is the server's alone.
    expect(text).not.toContain('"path"');
    expect(text).not.toContain('"bucket"');
    expect(text).not.toContain(ANNA);
    // And the button in Community counts it.
    const summary = (await (await queue(new Request(`${SITE}/api/community/moderation?summary=1`))).json()) as { waiting: number };
    expect(summary.waiting).toBe(1);
  });

  it("a file that could not be deleted is not called removed", async () => {
    const id = running();
    const pic = await added(id);
    signInTeam();
    w.fail.remove = HELD_BUCKET;
    expect((await act("remove_picture", pic)).status).toBe(500);
    expect(picture(pic).status).toBe("held");
    expect(stored(HELD_BUCKET)).toHaveLength(1);
  });
});

describe("its creator removes one", () => {
  it("from the page and from storage at once, waiting or shown", async () => {
    const id = running();
    const waiting = await added(id);
    const cleared = await added(id);
    signInTeam();
    await act("approve_picture", cleared);
    signIn(ANNA);
    for (const pic of [waiting, cleared]) {
      expect((await removeOne(new Request(`${SITE}/api/campaigns/${id}/pictures?picture=${pic}`, { method: "DELETE" }), params(id))).status).toBe(200);
    }
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
  });

  it("nobody else can, and not a picture of another campaign", async () => {
    const id = running();
    const other = running();
    const pic = await added(id);
    expect((await removeOne(new Request(`${SITE}/api/campaigns/${other}/pictures?picture=${pic}`, { method: "DELETE" }), params(other))).status).toBe(404);
    signIn(BEN);
    expect((await removeOne(new Request(`${SITE}/api/campaigns/${id}/pictures?picture=${pic}`, { method: "DELETE" }), params(id))).status).toBe(404);
    expect(pictures()).toHaveLength(1);
    expect(stored(HELD_BUCKET)).toHaveLength(1);
  });

  it("keeps the row while the file could not be deleted, so a second try finishes it", async () => {
    const id = running();
    const pic = await added(id);
    w.fail.remove = HELD_BUCKET;
    const url = `${SITE}/api/campaigns/${id}/pictures?picture=${pic}`;
    expect((await removeOne(new Request(url, { method: "DELETE" }), params(id))).status).toBe(500);
    expect(pictures()).toHaveLength(1);
    w.fail.remove = null;
    expect((await removeOne(new Request(url, { method: "DELETE" }), params(id))).status).toBe(200);
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
  });
});

describe("a reader reports a picture", () => {
  /** A campaign with one picture a moderator has cleared. */
  async function withShown() {
    const id = running();
    const pic = await added(id);
    signInTeam();
    await act("approve_picture", pic);
    w.tables.community_mod_log = [];
    return { id, pic, path: String(picture(pic).path) };
  }

  it("that it shows them: it is hidden at once, and the address readers had opens nothing", async () => {
    const { id, pic, path } = await withShown();
    signIn(BEN);
    const res = await tell(id, { reason: "about_me", words: "That is my mother.", picture: pic });
    expect(res.status).toBe(200);
    // The reporter is told it was sent, and nothing about what happened next.
    expect(await res.json()).toEqual({ ok: true });

    const row = picture(pic);
    expect(row).toMatchObject({ status: "held", bucket: HELD_BUCKET });
    expect(w.objects.has(`${CAMPAIGN_BUCKET}/${path}`)).toBe(false);
    expect(stored(CAMPAIGN_BUCKET)).toEqual([]);
    expect(stored(HELD_BUCKET)).toEqual([`${HELD_BUCKET}/${row.path}`]);
    expect(owners()).toEqual([`${HELD_BUCKET}/${row.path}:${ANNA}`]);
    expect(w.tables.prayer_campaign_reports).toMatchObject([{ campaign_id: id, reporter_id: BEN, target_kind: "picture", target_id: pic, reason_code: "about_me", status: "open" }]);
    expect(log()).toEqual(["auto_hide:picture"]);
    // The campaign itself is as it was.
    expect(w.tables.prayer_campaigns![0].status).toBe("active");
    signIn(null);
    expect((await shown(id)).pictures).toEqual([]);
  });

  it("the team sees why it waits, and never who said so", async () => {
    const { id, pic } = await withShown();
    signIn(BEN);
    await tell(id, { reason: "about_me", words: "That is my mother.", picture: pic });
    signInTeam();
    const text = await (await queue(new Request(`${SITE}/api/community/moderation`))).text();
    const { campaigns } = JSON.parse(text) as { campaigns: { pictures: WaitingPicture[] } };
    expect(campaigns.pictures[0].reports).toEqual([{ reason_code: "about_me", reason: "That is my mother." }]);
    expect(text).not.toContain(BEN);
  });

  it("kept by a moderator after that, it is shown again and reports do not hide it twice", async () => {
    const { id, pic } = await withShown();
    signIn(BEN);
    await tell(id, { reason: "about_me", picture: pic });
    signInTeam();
    expect((await act("approve_picture", pic)).status).toBe(200);
    expect(picture(pic).status).toBe("shown");
    expect(w.tables.prayer_campaign_reports!.map((r) => r.status)).toEqual(["dismissed"]);
    for (const who of [BEN, CARA, DAN]) {
      signIn(who);
      expect((await tell(id, { reason: "about_me", picture: pic })).status).toBe(200);
    }
    expect(picture(pic).status).toBe("shown");
    expect(stored(CAMPAIGN_BUCKET)).toHaveLength(1);
  });

  it("one report that does not hide it still reaches the team, who can keep it or remove it", async () => {
    const { id, pic } = await withShown();
    signIn(BEN);
    await tell(id, { reason: "picture", words: "Is this hers to share?", picture: pic });
    expect(picture(pic).status).toBe("shown");

    signInTeam();
    const read = async () => ((await (await queue(new Request(`${SITE}/api/community/moderation`))).json()) as { campaigns: { pictures: WaitingPicture[]; reports: unknown[] } }).campaigns;
    const first = await read();
    expect(first.pictures).toMatchObject([{ id: pic, shown: true, reports: [{ reason_code: "picture", reason: "Is this hers to share?" }] }]);
    expect(first.pictures[0].url).toContain(`/object/public/${CAMPAIGN_BUCKET}/`);
    // It is not also drawn as a report of the whole campaign.
    expect(first.reports).toEqual([]);

    // Kept: the report is set aside, the picture stays, and the queue is clear.
    expect((await act("approve_picture", pic)).status).toBe(200);
    expect(picture(pic).status).toBe("shown");
    expect(w.tables.prayer_campaign_reports!.map((r) => r.status)).toEqual(["dismissed"]);
    expect((await read()).pictures).toEqual([]);
    expect(stored(CAMPAIGN_BUCKET)).toHaveLength(1);
  });

  it("three readers hide it, and two do not", async () => {
    const { id, pic } = await withShown();
    signIn(BEN);
    await tell(id, { reason: "picture", picture: pic });
    signIn(CARA);
    await tell(id, { reason: "other", words: "Not sure this belongs.", picture: pic });
    expect(picture(pic).status).toBe("shown");
    signIn(DAN);
    await tell(id, { reason: "picture", picture: pic });
    expect(picture(pic).status).toBe("held");
    expect(stored(CAMPAIGN_BUCKET)).toEqual([]);
  });

  it("once a reader for each picture, beside their report of the campaign; and only with a picture's own reasons", async () => {
    const { id, pic } = await withShown();
    signIn(BEN);
    expect((await tell(id, { reason: "picture", picture: pic })).status).toBe(200);
    expect((await tell(id, { reason: "picture", picture: pic })).status).toBe(200);
    expect((await tell(id, { reason: "unkind" })).status).toBe(200);
    expect(w.tables.prayer_campaign_reports!.map((r) => r.target_kind).sort()).toEqual(["campaign", "picture"]);
    // "money" is a reason for a campaign; "picture" is not one for a campaign.
    expect((await tell(id, { reason: "money", picture: pic })).status).toBe(400);
    expect((await tell(id, { reason: "picture" })).status).toBe(400);
  });

  it("cannot be used to find out that a picture waits, or to report another campaign's", async () => {
    const id = running();
    const other = running();
    const waiting = await added(id);
    signIn(BEN);
    expect((await tell(id, { reason: "picture", picture: waiting })).status).toBe(404);
    expect((await tell(other, { reason: "picture", picture: waiting })).status).toBe(404);
    expect(w.tables.prayer_campaign_reports).toEqual([]);
  });

  it("keeping the campaign does not answer a report of its picture", async () => {
    const { id, pic } = await withShown();
    // Two readers report the picture; three report the campaign, which hides it.
    signIn(BEN);
    await tell(id, { reason: "picture", picture: pic });
    for (const who of [BEN, CARA, DAN]) {
      signIn(who);
      await tell(id, { reason: "unkind" });
    }
    expect(w.tables.prayer_campaigns![0].status).toBe("held");
    expect(await approveCampaign(client(w) as never, MOD, id)).toEqual({ ok: true });
    const open = w.tables.prayer_campaign_reports!.filter((r) => r.status === "open");
    expect(open).toMatchObject([{ target_kind: "picture", target_id: pic }]);
  });
});

describe("when its campaign goes, its pictures' files go", () => {
  /** A campaign with one picture waiting and one shown. */
  async function withBoth(over: Row = {}) {
    const id = running(over);
    const waiting = await added(id);
    const cleared = await added(id);
    signInTeam();
    await act("approve_picture", cleared);
    signIn(ANNA);
    // One file in each place, for this campaign.
    expect(picture(waiting)).toMatchObject({ bucket: HELD_BUCKET, status: "held" });
    expect(picture(cleared)).toMatchObject({ bucket: CAMPAIGN_BUCKET, status: "shown" });
    for (const pic of [waiting, cleared]) expect(w.objects.has(`${picture(pic).bucket}/${picture(pic).path}`)).toBe(true);
    return { id, waiting, cleared };
  }

  it("its creator takes it down: every file and every row", async () => {
    const { id } = await withBoth();
    expect((await takeDown(new Request(`${SITE}/api/campaigns/${id}`, { method: "DELETE" }), params(id))).status).toBe(200);
    expect(w.tables.prayer_campaigns).toEqual([]);
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
  });

  it("a moderator removes it: no file is left at any address, and the rows are kept, marked", async () => {
    const { id, waiting, cleared } = await withBoth();
    expect(await removeCampaign(client(w) as never, MOD, id, "Not a request for prayer")).toEqual({ ok: true });
    expect([...w.objects]).toEqual([]);
    expect(picture(waiting)).toMatchObject({ status: "removed", removed_reason: "its campaign was removed" });
    expect(picture(cleared)).toMatchObject({ status: "removed" });
    // The team's queue no longer carries the one that waited.
    signInTeam();
    const { campaigns } = (await (await queue(new Request(`${SITE}/api/community/moderation`))).json()) as { campaigns: { pictures: WaitingPicture[] } };
    expect(campaigns.pictures).toEqual([]);
  });

  it("the housekeeping deletes it thirty days on: its files first, and nobody else's", async () => {
    // It took its pictures while it ran; its last day was thirty-one days ago.
    const old = await withBoth();
    Object.assign(w.tables.prayer_campaigns!.find((c) => c.id === old.id)!, { ends_at: plus(-31), status: "ended" });
    const kept = await withBoth();
    const report = await runCampaignUpkeep(client(w) as never);
    expect(report.deleted.living).toBe(1);
    expect(w.tables.prayer_campaigns!.map((c) => c.id)).toEqual([kept.id]);
    // Only the campaign that stays has pictures or files.
    expect(pictures().map((p) => p.campaign_id)).toEqual([kept.id, kept.id]);
    expect([...w.objects].sort()).toEqual(pictures().map((p) => `${p.bucket}/${p.path}`).sort());
    expect(pictures().some((p) => p.campaign_id === old.id)).toBe(false);
  });

  it("the housekeeping misses no file when many campaigns go at once, past the thousand rows one read returns", async () => {
    // Sixty campaigns, twenty pictures each, all thirty-one days past their
    // last day: twelve hundred pictures, and the API returns a thousand rows
    // a request and says nothing when it stops.
    w.maxRows = 1000;
    for (let c = 0; c < 60; c++) {
      const id = running({ ends_at: plus(-31), status: "ended" });
      for (let i = 0; i < PICTURES_PLUS; i++) {
        const path = `c/${crypto.randomUUID()}.jpg`;
        w.objects.add(`${CAMPAIGN_BUCKET}/${path}`);
        w.tables.upload_owners!.push({ bucket: CAMPAIGN_BUCKET, path, owner_id: ANNA });
        pictures().push({ id: crypto.randomUUID(), campaign_id: id, bucket: CAMPAIGN_BUCKET, path, position: i, status: "shown", created_at: new Date().toISOString() });
      }
    }
    expect(w.objects.size).toBe(1200);
    const report = await runCampaignUpkeep(client(w) as never);
    expect(report.deleted.living).toBe(60);
    expect(w.tables.prayer_campaigns).toEqual([]);
    expect([...w.objects]).toEqual([]);
    expect(pictures()).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
  });

  it("the account's deletion finds every copy, waiting and shown", async () => {
    const { waiting, cleared } = await withBoth();
    const files = await accountFiles(client(w) as never, ANNA);
    const found = files.flatMap((f) => f.paths.map((p) => `${f.bucket}/${p}`)).sort();
    expect(found).toEqual([`${picture(cleared).bucket}/${picture(cleared).path}`, `${picture(waiting).bucket}/${picture(waiting).path}`].sort());
    expect(found).toEqual([...w.objects].sort());
  });

  it("is quiet before the pictures' SQL has run: a take-down, a removal and the housekeeping still work", async () => {
    w.tables.prayer_campaign_pictures = null;
    const mine = running();
    const theirs = running();
    running({ ends_at: plus(-31), status: "ended" });
    expect((await takeDown(new Request(`${SITE}/api/campaigns/${mine}`, { method: "DELETE" }), params(mine))).status).toBe(200);
    expect(await removeCampaign(client(w) as never, MOD, theirs)).toEqual({ ok: true });
    expect((await runCampaignUpkeep(client(w) as never)).deleted.living).toBe(1);
    expect(w.tables.prayer_campaigns!.map((c) => c.id)).toEqual([theirs]);
  });
});
