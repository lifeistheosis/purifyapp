import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PROJECT, client, publicUrl, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * July's campaign rows, deleted thirty days after 1.9 ships
 * (lib/campaigns/julyRows.ts; his word of 2026-11-10, "all recs yes",
 * docs/1.9-build/OWNER-STEPS.md R9), run against an in-memory Supabase.
 *
 * What would go wrong if these broke: a running campaign of 1.9 deleted with
 * July's; July's rows deleted before their day, or on a day nobody wrote; a
 * sick person's picture left at a public address with nothing left that
 * knows where it is; a reading circle deleted with a campaign it never
 * belonged to; a second run that does something the first did not.
 *
 * What these cannot hold is the database's own part: that the rows hanging
 * from a campaign go with it. That is the tables' keys, read here from the
 * SQL that made them, and it was run on a scratch PostgreSQL standing on the
 * migrations folder (docs/1.9-build/notes/campaigns-fable.md, section 23).
 */

// The heartbeat's other jobs are not what is tried here.
vi.mock("@/lib/ops/prune", () => ({ pruneReports: async () => ({}) }));
vi.mock("@/lib/shop/abandonedSweep", () => ({ sweepAbandonedCheckouts: async () => ({ swept: 0 }) }));
vi.mock("@/lib/ambassadors/payouts", () => ({ clearMatured: async () => ({}), runAmbassadorPayouts: async () => ({}) }));
vi.mock("@/lib/email/jobs", () => ({ runEmailJobs: async () => ({ running: 0, allowance: 0, reports: [] }) }));
vi.mock("@/lib/shop/cartReminderSweep", () => ({ sendCartReminders: async () => ({}) }));
vi.mock("@/lib/admin/plannerDigest", () => ({ sendPlannerDigest: async () => ({}) }));
vi.mock("@/lib/admin/weeklyLetter", () => ({ sendWeeklyLetter: async () => ({}) }));
vi.mock("@/lib/campaigns/upkeep", () => ({ runCampaignUpkeep: async () => ({}) }));

import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import {
  A_RUN,
  JULY_GROUPS_GO,
  JULY_KEPT_DAYS,
  JULY_MADE_BEFORE,
  JULY_MARK,
  NOT_BEFORE,
  SHIPPED_ON,
  forgetJulyRows,
  julyRowsDay,
} from "@/lib/campaigns/julyRows";
import { isDay } from "@/lib/campaigns/model";
import { runMaintenance } from "@/lib/ops/maintenance";

const ANNA = "11111111-1111-4111-8111-111111111111";
const JOHN = "22222222-2222-4222-8222-222222222222";
const BUCKET = "campaign-media";

/** 1.9 shipped on 20 November: July's rows go on 20 December. */
const SHIPPED = "2026-11-20";
const THE_DAY = Date.parse("2026-12-20T00:00:30.000Z");
const THE_EVE = Date.parse("2026-12-19T23:59:59.000Z");

/** Anna's picture, stored under a random name with the record that says it is hers. */
const ANNAS = "c/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1.jpg";
/** John's, stored the old way, under his own id. */
const JOHNS = `c/${JOHN}/1720000000000.jpg`;

let w: World;
/** Every table a run asked of, in order. */
let asked: string[];
const db = () => {
  const real = client(w);
  return {
    ...real,
    from: (table: string) => {
      asked.push(table);
      return real.from(table);
    },
  } as never;
};

function july(id: string, over: Row = {}): Row {
  return { id, creator_id: ANNA, title: "July's", intention: "healing", for_whom: "living", status: "active", days: null, image_url: null, created_at: "2026-07-20T10:00:00.000Z", ...over };
}
const ids = () => (w.tables.prayer_campaigns ?? []).map((row) => row.id).sort();
const run = (now = THE_DAY, opts: Parameters<typeof forgetJulyRows>[2] = {}) => forgetJulyRows(db(), now, { shippedOn: SHIPPED, ...opts });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROJECT);
  asked = [];
  w = world();
  w.users = new Set([ANNA, JOHN]);
  w.tables.prayer_campaign_groups = [];
  w.tables.prayer_campaign_pictures = [];
  w.tables.data_moves = [];
  w.tables.upload_owners = [{ bucket: BUCKET, path: ANNAS, owner_id: ANNA }];
  w.objects = new Set([`${BUCKET}/${ANNAS}`, `${BUCKET}/${JOHNS}`]);
  w.tables.prayer_campaigns = [
    july("july-anna", { image_url: publicUrl(BUCKET, ANNAS), created_at: "2026-07-15T10:00:00.000Z" }),
    july("july-john", { creator_id: JOHN, image_url: publicUrl(BUCKET, JOHNS), created_at: "2026-08-01T10:00:00.000Z" }),
    july("july-plain", { created_at: "2026-08-20T10:00:00.000Z", status: "removed" }),
    // A campaign of 1.9: it has a length.
    july("of-1-9", { days: 7, created_at: "2026-11-21T10:00:00.000Z" }),
  ];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  __setCampaignsOpening(CAMPAIGNS_OPENING);
});

describe("the day July's rows go", () => {
  it("is thirty days after the day 1.9 shipped, as he said", () => {
    expect(JULY_KEPT_DAYS).toBe(30);
    expect(julyRowsDay("2026-11-20")).toBe("2026-12-20");
    expect(julyRowsDay("2026-12-15")).toBe("2027-01-14");
    expect(julyRowsDay("2028-02-01")).toBe("2028-03-02");
    expect(julyRowsDay(NOT_BEFORE)).toBe("2026-12-10");
  });

  it("is no day at all while none is written, or what is written is not a day, or is before his word", () => {
    for (const written of [null, "", "soon", "20261120", "2026-13-01", "2026-02-30", "2026-11-20T00:00:00Z", "2026-11-09", "2025-12-25"]) {
      expect(julyRowsDay(written), String(written)).toBeNull();
    }
  });

  it("as committed: not written yet, or a real day on or after his word, and never anything else", () => {
    // The release commit writes the day 1.9 shipped here and changes nothing
    // else. Until it does, the constant is null and the job does nothing.
    expect(SHIPPED_ON === null || (isDay(SHIPPED_ON) && SHIPPED_ON >= NOT_BEFORE)).toBe(true);
    expect(julyRowsDay()).toBe(SHIPPED_ON === null ? null : julyRowsDay(SHIPPED_ON));
    // What was put to him is that everything hanging from a row goes with it.
    expect(JULY_GROUPS_GO).toBe(true);
  });
});

describe("before the day", () => {
  it("reads nothing and deletes nothing while no day is written", async () => {
    const before = structuredClone(w.tables);
    expect(await forgetJulyRows(db(), THE_DAY, { shippedOn: null })).toEqual({ state: "unset", why: "the day 1.9 shipped is not written yet" });
    expect(await forgetJulyRows(db(), THE_DAY, { shippedOn: "2026-02-30" })).toEqual({ state: "unset", why: "the day written is not one to count from" });
    expect(await forgetJulyRows(db(), THE_DAY, { shippedOn: "2026-11-09" })).toMatchObject({ state: "unset" });
    expect(asked).toEqual([]);
    expect(w.tables).toEqual(before);
    expect(w.calls.remove).toBe(0);
  });

  it("reads nothing and deletes nothing until the thirtieth day has come", async () => {
    const before = structuredClone(w.tables);
    expect(await run(THE_EVE)).toEqual({ state: "waiting", from: "2026-12-20" });
    expect(await run(Date.parse("2026-11-20T12:00:00Z"))).toEqual({ state: "waiting", from: "2026-12-20" });
    expect(asked).toEqual([]);
    expect(w.tables).toEqual(before);
    expect(w.objects.size).toBe(2);
  });
});

describe("on the day", () => {
  it("deletes July's rows and their pictures, and leaves a campaign of 1.9 exactly as it is", async () => {
    const kept = structuredClone(w.tables.prayer_campaigns!.find((row) => row.id === "of-1-9"));
    expect(await run()).toEqual({
      state: "ran",
      from: "2026-12-20",
      deleted: 3,
      pictures: 2,
      picturesLeft: 0,
      kept: { picture: 0, circle: 0, groups: 0 },
      strays: 0,
      left: false,
      marked: true,
    });
    expect(ids()).toEqual(["of-1-9"]);
    expect(w.tables.prayer_campaigns![0]).toEqual(kept);
    // Both files are gone, and the record that named Anna's with them.
    expect([...w.objects]).toEqual([]);
    expect(w.tables.upload_owners).toEqual([]);
    // One public mark: a name, and nothing of anyone.
    expect(w.tables.data_moves!.map((row) => row.name)).toEqual([JULY_MARK]);
  });

  it("runs on every day after it as well", async () => {
    expect(await run(Date.parse("2027-03-01T08:00:00Z"))).toMatchObject({ state: "ran", deleted: 3 });
    expect(ids()).toEqual(["of-1-9"]);
  });

  it("a second run changes nothing", async () => {
    await run();
    const after = structuredClone(w.tables);
    const again = await run(THE_DAY + 86_400_000);
    expect(again).toEqual({ state: "ran", from: "2026-12-20", deleted: 0, pictures: 0, picturesLeft: 0, kept: { picture: 0, circle: 0, groups: 0 }, strays: 0, left: false, marked: true });
    expect(w.tables).toEqual(after);
    expect(w.tables.data_moves).toHaveLength(1);
  });
});

describe("only July's", () => {
  it("takes a row only when it has no length AND was made before July's end: either alone is not enough", async () => {
    w.tables.prayer_campaigns!.push(
      // No length, but made after the withdrawal: not July's. Left alone, and said.
      july("stray", { created_at: "2026-11-21T10:00:00.000Z" }),
      july("stray-on-the-line", { created_at: JULY_MADE_BEFORE }),
      // Made in July, but it has a length: not July's either.
      july("old-with-a-length", { days: 40, created_at: "2026-07-01T10:00:00.000Z" }),
    );
    const report = await run();
    expect(report).toMatchObject({ state: "ran", deleted: 3, strays: 2, left: false });
    expect(ids()).toEqual(["of-1-9", "old-with-a-length", "stray", "stray-on-the-line"]);
  });

  it("names both conditions again at the delete, by id, so a row given a length in between is kept", () => {
    const source = readFileSync(join(process.cwd(), "lib/campaigns/julyRows.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");
    // One delete in the whole file, and it goes through july(), which names both.
    expect(source.match(/\.delete\(\)/g)).toHaveLength(1);
    expect(source).toContain('july(admin.from("prayer_campaigns").delete()).in("id", go).select("id")');
    expect(source).toContain('.is("days", null).lt("created_at", JULY_MADE_BEFORE)');
    // And every read of July's rows goes through it too.
    expect(source.match(/july\(admin\.from\("prayer_campaigns"\)/g)).toHaveLength(3);
    // Nothing else in the file writes to campaigns or to groups.
    expect(source).not.toMatch(/\.update\(|\.insert\(/);
  });

  it("says the rework's columns are absent, and deletes nothing, where its SQL has not run", async () => {
    // Without `days` a row of July's cannot be told from any other.
    w.missing.prayer_campaigns = ["days"];
    const before = structuredClone(w.tables);
    expect(await run()).toEqual({ state: "absent", from: "2026-12-20" });
    expect(w.tables).toEqual(before);
    expect(w.objects.size).toBe(2);
  });

  it("takes a hundred a run, oldest first, and marks nothing until the last have gone", async () => {
    w.tables.prayer_campaigns = [
      ...Array.from({ length: A_RUN + 5 }, (_, i) => july(`july-${String(i).padStart(3, "0")}`, { created_at: new Date(Date.parse("2026-07-13T00:00:00Z") + i * 60_000).toISOString() })),
      july("of-1-9", { days: 7, created_at: "2026-11-21T10:00:00.000Z" }),
    ];
    const first = await run();
    expect(first).toMatchObject({ state: "ran", deleted: A_RUN, left: true, marked: false });
    expect(w.tables.data_moves).toEqual([]);
    // The newest five wait for the next day.
    expect(ids()).toEqual([...Array.from({ length: 5 }, (_, i) => `july-${A_RUN + i}`), "of-1-9"]);
    const second = await run(THE_DAY + 86_400_000);
    expect(second).toMatchObject({ state: "ran", deleted: 5, left: false, marked: true });
    expect(ids()).toEqual(["of-1-9"]);
  });
});

describe("a picture is deleted before its row, and only when it is its creator's own", () => {
  it("keeps the row for the next run when the storage will not delete the file", async () => {
    // The row is the only thing that knows where the file is.
    w.fail.remove = BUCKET;
    const report = await run();
    expect(report).toMatchObject({ state: "ran", deleted: 1, pictures: 0, kept: { picture: 2, circle: 0, groups: 0 }, left: true, marked: false });
    expect(ids()).toEqual(["july-anna", "july-john", "of-1-9"]);
    expect(w.objects.size).toBe(2);
    expect(w.tables.data_moves).toEqual([]);

    // The next day the storage answers.
    w.fail.remove = null;
    expect(await run(THE_DAY + 86_400_000)).toMatchObject({ state: "ran", deleted: 2, pictures: 2, kept: { picture: 0 }, left: false, marked: true });
    expect(ids()).toEqual(["of-1-9"]);
    expect([...w.objects]).toEqual([]);
  });

  it("leaves a file that is not provably the creator's, says where it is, and deletes the row", async () => {
    // July once took a picture's address from the app with only its host
    // checked, so a row can name another reader's file. It is not ours to delete.
    const someoneElses = "c/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2.jpg";
    w.objects.add(`${BUCKET}/${someoneElses}`);
    w.tables.upload_owners!.push({ bucket: BUCKET, path: someoneElses, owner_id: JOHN });
    w.tables.prayer_campaigns!.push(
      july("names-johns-file", { image_url: publicUrl(BUCKET, someoneElses) }),
      july("names-an-avatar", { image_url: publicUrl("avatars", `u/${ANNA}/1720000000000.jpg`) }),
    );
    const warned = vi.spyOn(console, "warn").mockImplementation(() => {});
    const report = await run();
    expect(report).toMatchObject({ state: "ran", deleted: 5, pictures: 2, picturesLeft: 2 });
    expect(ids()).toEqual(["of-1-9"]);
    expect([...w.objects]).toEqual([`${BUCKET}/${someoneElses}`]);
    expect(w.tables.upload_owners).toEqual([{ bucket: BUCKET, path: someoneElses, owner_id: JOHN }]);
    expect(warned.mock.calls.map((call) => call.join(" "))).toEqual(
      expect.arrayContaining([expect.stringContaining(`${BUCKET}/${someoneElses}`), expect.stringContaining("outside the campaigns' bucket")]),
    );
  });
});

describe("what hangs from a row", () => {
  const group = (id: string, over: Row) => ({ id, creator_id: ANNA, name: "A group", invite_code: "ABC123", kind: "parish", path_id: null, campaign_id: null, ...over });

  it("a parish group made inside one of July's campaigns goes with it", async () => {
    w.tables.prayer_campaign_groups = [group("julys-parish", { campaign_id: "july-anna" })];
    expect(await run()).toMatchObject({ state: "ran", deleted: 3, kept: { groups: 0, circle: 0 } });
    expect(w.tables.prayer_campaign_groups).toEqual([]);
  });

  it("a reading circle is never deleted: one on a path has no campaign, and nothing reaches it", async () => {
    w.tables.prayer_campaign_groups = [group("circle", { path_id: "gospels", kind: "friends" })];
    const before = structuredClone(w.tables.prayer_campaign_groups);
    expect(await run()).toMatchObject({ state: "ran", deleted: 3 });
    expect(w.tables.prayer_campaign_groups).toEqual(before);
  });

  it("and should a circle ever hang from one of July's campaigns, that campaign is kept and the report says so", async () => {
    w.tables.prayer_campaign_groups = [group("circle-on-july", { campaign_id: "july-plain", path_id: "gospels" })];
    const before = structuredClone(w.tables.prayer_campaign_groups);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const report = await run();
    expect(report).toMatchObject({ state: "ran", deleted: 2, kept: { circle: 1, groups: 0, picture: 0 }, left: false, marked: true });
    expect(ids()).toEqual(["july-plain", "of-1-9"]);
    expect(w.tables.prayer_campaign_groups).toEqual(before);
    // And it stays kept: the next run deletes nothing.
    expect(await run(THE_DAY + 86_400_000)).toMatchObject({ deleted: 0, kept: { circle: 1 } });
  });

  it("nor is a campaign of 1.9 deleted by way of a group: one kept to a group of July's keeps that campaign of July's", async () => {
    // prayer_campaigns.circle_id deletes a campaign with the group it is kept
    // to, so deleting July's campaign would run on, through its group, to a
    // campaign of 1.9. On a scratch PostgreSQL that is what happens.
    w.tables.prayer_campaign_groups = [group("julys-parish", { campaign_id: "july-anna" })];
    w.tables.prayer_campaigns!.push(july("kept-to-julys-parish", { days: 7, audience: "circle", circle_id: "julys-parish", created_at: "2026-11-22T10:00:00.000Z" }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const report = await run();
    expect(report).toMatchObject({ state: "ran", deleted: 2, kept: { circle: 1, groups: 0, picture: 0 }, left: false, marked: true });
    expect(ids()).toEqual(["july-anna", "kept-to-julys-parish", "of-1-9"]);
    expect(w.tables.prayer_campaign_groups!.map((row) => row.id)).toEqual(["julys-parish"]);
    // Anna's picture stays with her campaign.
    expect([...w.objects]).toEqual([`${BUCKET}/${ANNAS}`]);
  });

  it("deletes nothing at all when the campaigns kept to their groups cannot be read", async () => {
    w.tables.prayer_campaign_groups = [group("julys-parish", { campaign_id: "july-anna" })];
    const real = client(w);
    let reads = 0;
    const broken: Record<string, unknown> = {};
    for (const method of ["select", "in", "order", "range", "is", "lt", "limit"]) broken[method] = () => broken;
    broken.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: { code: "XX000", message: "boom" } }).then(resolve);
    // The first read of campaigns is July's rows; the second asks which are kept to their groups.
    const half = { ...real, from: (table: string) => (table === "prayer_campaigns" && ++reads === 2 ? broken : real.from(table)) } as never;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const before = structuredClone(w.tables);
    expect(await forgetJulyRows(half, THE_DAY, { shippedOn: SHIPPED })).toEqual({
      state: "failed",
      from: "2026-12-20",
      why: "the campaigns kept to their groups could not be read, so nothing was deleted",
    });
    expect(w.tables).toEqual(before);
    expect(w.objects.size).toBe(2);
  });

  it("deletes nothing at all when the groups cannot be read", async () => {
    const real = client(w);
    const broken: Record<string, unknown> = {};
    for (const method of ["select", "in", "order", "range"]) broken[method] = () => broken;
    broken.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: { code: "XX000", message: "boom" } }).then(resolve);
    const half = { ...real, from: (table: string) => (table === "prayer_campaign_groups" ? broken : real.from(table)) } as never;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const before = structuredClone(w.tables);
    expect(await forgetJulyRows(half, THE_DAY, { shippedOn: SHIPPED })).toEqual({
      state: "failed",
      from: "2026-12-20",
      why: "the groups that hang from them could not be read, so nothing was deleted",
    });
    expect(w.tables).toEqual(before);
    expect(w.objects.size).toBe(2);
  });

  it("the one switch, if he says the groups stay: a campaign a group hangs from stays with it", async () => {
    w.tables.prayer_campaign_groups = [group("julys-parish", { campaign_id: "july-anna" })];
    const before = structuredClone(w.tables.prayer_campaign_groups);
    const report = await run(THE_DAY, { groupsGo: false });
    expect(report).toMatchObject({ state: "ran", deleted: 2, pictures: 1, kept: { groups: 1, circle: 0 }, left: false, marked: true });
    expect(ids()).toEqual(["july-anna", "of-1-9"]);
    expect(w.tables.prayer_campaign_groups).toEqual(before);
    // Its picture stays with it too.
    expect([...w.objects]).toEqual([`${BUCKET}/${ANNAS}`]);
  });

  it("is what the tables' own keys say: read from the SQL that made them", () => {
    const sql = (file: string) => readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8").replace(/\s+/g, " ");
    const first = sql("20260713000200_prayer_campaigns.sql");
    // Who joined, and the reports.
    expect(first).toContain("create table if not exists public.prayer_campaign_prayers ( campaign_id uuid not null references public.prayer_campaigns on delete cascade");
    expect(first).toMatch(/create table if not exists public\.prayer_campaign_reports \( id [^;]*campaign_id uuid not null references public\.prayer_campaigns on delete cascade/);
    const groups = sql("20260811000000_campaign_groups_and_streaks.sql");
    // The day log, a parish group, and its members.
    expect(groups).toMatch(/create table if not exists public\.prayer_campaign_days \([^;]*references public\.prayer_campaigns \(id\) on delete cascade/);
    expect(groups).toMatch(/create table if not exists public\.prayer_campaign_groups \([^;]*campaign_id uuid not null references public\.prayer_campaigns \(id\) on delete cascade/);
    expect(groups).toMatch(/create table if not exists public\.prayer_campaign_group_members \( group_id uuid not null references public\.prayer_campaign_groups \(id\) on delete cascade/);
    // A group's private thread.
    expect(sql("20260811000100_community_group_threads.sql")).toContain("add column if not exists group_id uuid references public.prayer_campaign_groups (id) on delete cascade");
    // A campaign kept to a circle goes with that group: the key the job's second question is for.
    expect(sql("20261110084116_campaigns_rework.sql")).toMatch(/circle_id[^;]*references public\.prayer_campaign_groups ?\(id\) on delete cascade/);
    // And a circle on a path is made with no campaign, so none of that reaches it.
    const circles = readFileSync(join(process.cwd(), "app/api/circles/route.ts"), "utf8");
    expect(circles).toContain("campaign_id: null,");
    expect(circles.match(/campaign_id:/g)).toHaveLength(1);
  });
});

describe("on the heartbeat", () => {
  it("rides it once a day, in a build that has campaigns, with nothing passed but the time", async () => {
    __setCampaignsOpening("closed");
    expect(await runMaintenance(db(), THE_DAY)).not.toHaveProperty("julyCampaignRows");

    __setCampaignsOpening("testers");
    const ran = await runMaintenance(db(), THE_DAY + 60_000);
    // As committed the day is not written, so it says so and has read nothing of campaigns.
    expect(ran.julyCampaignRows).toEqual(
      SHIPPED_ON === null
        ? { ran: true, ok: true, detail: { state: "unset", why: "the day 1.9 shipped is not written yet" } }
        : expect.objectContaining({ ran: true, ok: true }),
    );
    if (SHIPPED_ON === null) expect(asked.filter((table) => table.startsWith("prayer_campaign"))).toEqual([]);
    // An hour on: not again. A day on: again.
    expect((await runMaintenance(db(), THE_DAY + 3_600_000)).julyCampaignRows).toEqual({ ran: false });
    expect((await runMaintenance(db(), THE_DAY + 21 * 3_600_000)).julyCampaignRows).toMatchObject({ ran: true });

    const source = readFileSync(join(process.cwd(), "lib/ops/maintenance.ts"), "utf8");
    // The heartbeat passes no day and no switch of its own: what runs is what the constants say.
    expect(source).toContain('report.julyCampaignRows = await every("julyCampaignRows", 20 * 3_600_000, now, () => forgetJulyRows(admin, now));');
    expect(source.match(/forgetJulyRows\(/g)).toHaveLength(1);
  });
});
