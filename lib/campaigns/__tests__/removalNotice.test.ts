import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * A moderator's removal of a campaign or of a picture tells its creator why
 * (lib/campaigns/moderation.ts, lib/campaigns/pictures.ts; the notice itself
 * is lib/community/removal.ts, the Admin chat's). His yes of 2026-11-10 to
 * the Terms: "When we remove something you posted, we tell you why, unless
 * the law or someone's safety stops us."
 *
 * What would go wrong if these broke: a campaign taken down with its creator
 * told nothing; told "the house rules" whatever reason the moderator chose;
 * told twice because a moderator tapped twice, or because two moderators
 * decided at once; a removal that fails because its notice could not be
 * written; a creator told that "we removed" a campaign that only ran out,
 * or that they took down themselves.
 */

import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import { approveCampaign, dismissCampaignReport, removeCampaign, restoreCampaign, runCampaignModAction } from "@/lib/campaigns/moderation";
import { __resetCampaignParts, __setCampaignPart } from "@/lib/campaigns/parts";
import { removePictureAsModerator } from "@/lib/campaigns/pictures";
import { runCampaignUpkeep } from "@/lib/campaigns/upkeep";
import { DEFAULT_REMOVAL_REASON, REMOVAL_REASONS } from "@/lib/community/removal";

const ANNA = "11111111-1111-4111-8111-111111111111";
const TEAM = "55555555-5555-4555-8555-555555555555";
const MOD = { id: TEAM, name: "A moderator", email: "team@example.com", admin: true };
const CAMPAIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PICTURE = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const FILE = "c/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1.jpg";
const BUCKET = "campaign-media";
const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const DAY = 86_400_000;

let w: World;
const db = () => client(w) as never;
/** The notices written, without the two fields the database gives each. */
const notices = () =>
  (w.tables.community_notifications ?? []).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id" && key !== "created_at")));
const logged = () => (w.tables.community_mod_log ?? []).map((row) => row.action);
const campaign = () => w.tables.prayer_campaigns!.find((row) => row.id === CAMPAIGN)!;
const picture = () => w.tables.prayer_campaign_pictures!.find((row) => row.id === PICTURE)!;

function seed(over: Row = {}) {
  w.tables.prayer_campaigns = [
    {
      id: CAMPAIGN,
      creator_id: ANNA,
      title: "For   Maria before\nher operation",
      intention: "healing",
      for_whom: "living",
      status: "active",
      days: 7,
      ends_at: new Date(NOW + 3 * DAY).toISOString(),
      creator_name: "Anna",
      mod_cleared_at: null,
      held_reason: null,
      image_url: null,
      updated_at: new Date(NOW - DAY).toISOString(),
      created_at: new Date(NOW - 2 * DAY).toISOString(),
      ...over,
    },
  ];
  w.tables.prayer_campaign_pictures = [
    { id: PICTURE, campaign_id: CAMPAIGN, bucket: BUCKET, path: FILE, position: 0, status: "shown", alt: null, consent_at: new Date(NOW - DAY).toISOString(), created_at: new Date(NOW - DAY).toISOString() },
  ];
  w.objects = new Set([`${BUCKET}/${FILE}`]);
  w.tables.upload_owners = [{ bucket: BUCKET, path: FILE, owner_id: ANNA }];
}

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, TEAM]);
  w.tables.prayer_campaign_reports = [];
  w.tables.community_mod_log = [];
  w.tables.community_notifications = [];
  seed();
  __setCampaignsOpening("open");
  __resetCampaignParts();
  __setCampaignPart("pictures", true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  __setCampaignsOpening(CAMPAIGNS_OPENING);
  __resetCampaignParts();
  vi.restoreAllMocks();
});

describe("a campaign a moderator takes down", () => {
  it("tells its creator once: what was removed, why, and its title in one line", async () => {
    expect(await removeCampaign(db(), MOD, CAMPAIGN, "Names a neighbour who did not agree", NOW, "consent")).toEqual({ ok: true });
    expect(campaign().status).toBe("removed");
    expect(notices()).toEqual([
      {
        user_id: ANNA,
        kind: "removed",
        target_kind: "campaign",
        reason: "consent",
        post_id: null,
        reply_id: null,
        actor_name: "Purify",
        excerpt: "For Maria before her operation",
      },
    ]);
    // The moderator's own words stay with the campaign and the log, and are not in the notice.
    expect(JSON.stringify(notices())).not.toContain("neighbour");
    expect(JSON.stringify(notices())).not.toContain("team@example.com");
  });

  it("says the house rules when the moderator chose no reason, as the moderators' page does today", async () => {
    await removeCampaign(db(), MOD, CAMPAIGN, null, NOW);
    expect(notices().map((n) => n.reason)).toEqual([DEFAULT_REMOVAL_REASON]);
  });

  it("carries every reason on the list from the action that removes", async () => {
    for (const code of REMOVAL_REASONS) {
      seed();
      w.tables.community_notifications = [];
      expect(await runCampaignModAction(db(), MOD, "remove_campaign", CAMPAIGN, null, code)).toEqual({ ok: true });
      expect(notices().map((n) => [n.target_kind, n.reason]), code).toEqual([["campaign", code]]);
    }
  });

  it("a second tap tells nobody again, and does not start its thirty days again", async () => {
    await removeCampaign(db(), MOD, CAMPAIGN, "Asks for money", NOW, "spam");
    const first = structuredClone(campaign());
    expect(await removeCampaign(db(), MOD, CAMPAIGN, "Another reason", NOW + 5 * DAY, "unkind")).toEqual({ ok: true });
    expect(notices()).toHaveLength(1);
    expect(notices()[0].reason).toBe("spam");
    // Why, by whom and from when it was taken down stay as they were: the upkeep counts thirty days from then.
    expect(campaign()).toEqual(first);
    expect(logged()).toEqual(["remove_campaign"]);
  });

  it("a second tap does try once more for a picture's file the first could not delete", async () => {
    w.fail.remove = BUCKET;
    await removeCampaign(db(), MOD, CAMPAIGN, null, NOW, "spam");
    expect([...w.objects]).toEqual([`${BUCKET}/${FILE}`]);
    w.fail.remove = null;
    await removeCampaign(db(), MOD, CAMPAIGN, null, NOW + DAY, "spam");
    expect([...w.objects]).toEqual([]);
    expect(notices()).toHaveLength(1);
  });

  it("two moderators at once: the one whose removal took it down tells its creator, and the other tells nobody", async () => {
    // The other moderator's removal lands between this one's read and its write.
    w.beforeUpdate = () => {
      Object.assign(campaign(), { status: "removed", removed_reason: "The first one's reason", updated_at: new Date(NOW).toISOString() });
    };
    expect(await removeCampaign(db(), MOD, CAMPAIGN, "The second one's reason", NOW + 1000, "spam")).toEqual({ ok: true });
    expect(campaign().removed_reason).toBe("The first one's reason");
    expect(notices()).toEqual([]);
    expect(logged()).toEqual([]);
  });

  it("is taken down all the same where the notice cannot be written: before its SQL has run, or with no inbox at all", async () => {
    // supabase/migrations/20261110204814_removal_notices.sql (signed; the merge of 1.9 runs it): until it has run the inbox has no such columns.
    w.missing.community_notifications = ["target_kind", "reason"];
    expect(await removeCampaign(db(), MOD, CAMPAIGN, null, NOW, "spam")).toEqual({ ok: true });
    expect(campaign().status).toBe("removed");
    expect(notices()).toEqual([]);
    expect(logged()).toEqual(["remove_campaign"]);

    seed();
    w.missing = {};
    w.tables.community_notifications = null;
    expect(await removeCampaign(db(), MOD, CAMPAIGN, null, NOW, "spam")).toEqual({ ok: true });
    expect(campaign().status).toBe("removed");
  });
});

describe("a picture a moderator takes down", () => {
  it("tells whoever put it up, the campaign's creator, once: a picture, why, and no words of anyone's", async () => {
    expect(await removePictureAsModerator(db(), MOD, PICTURE, "Shows a child who is not theirs", "not_theirs")).toEqual({ ok: true });
    expect(picture().status).toBe("removed");
    expect([...w.objects]).toEqual([]);
    expect(notices()).toEqual([
      { user_id: ANNA, kind: "removed", target_kind: "picture", reason: "not_theirs", post_id: null, reply_id: null, actor_name: "Purify", excerpt: null },
    ]);
  });

  it("carries the reason from the action that removes, and the house rules when there is none", async () => {
    expect(await runCampaignModAction(db(), MOD, "remove_picture", PICTURE, null, "private")).toEqual({ ok: true });
    seed();
    expect(await runCampaignModAction(db(), MOD, "remove_picture", PICTURE)).toEqual({ ok: true });
    expect(notices().map((n) => [n.target_kind, n.reason])).toEqual([
      ["picture", "private"],
      ["picture", DEFAULT_REMOVAL_REASON],
    ]);
  });

  it("a second tap is told it is down already, and tells nobody again", async () => {
    await removePictureAsModerator(db(), MOD, PICTURE, null, "spam");
    expect(await removePictureAsModerator(db(), MOD, PICTURE, null, "unkind")).toMatchObject({ ok: false, status: 409 });
    expect(notices()).toHaveLength(1);
    expect(logged()).toEqual(["remove_picture"]);
  });

  it("two moderators at once: only the one whose removal took it down tells anyone", async () => {
    w.beforeUpdate = () => {
      Object.assign(picture(), { status: "removed", removed_reason: "The first one's reason" });
    };
    expect(await removePictureAsModerator(db(), MOD, PICTURE, "The second one's reason", "spam")).toMatchObject({ ok: false, status: 409 });
    expect(picture().removed_reason).toBe("The first one's reason");
    expect(notices()).toEqual([]);
    expect(logged()).toEqual([]);
  });
});

describe("nobody is told that we removed what we did not", () => {
  it("not when a moderator reads it, keeps it, puts it back or sets a report aside", async () => {
    Object.assign(campaign(), { status: "held" });
    expect(await approveCampaign(db(), MOD, CAMPAIGN, NOW)).toEqual({ ok: true });
    w.tables.prayer_campaign_reports = [{ id: "r1", campaign_id: CAMPAIGN, reporter_id: TEAM, status: "open", target_kind: "campaign", target_id: null }];
    expect(await dismissCampaignReport(db(), MOD, "r1")).toEqual({ ok: true });
    Object.assign(campaign(), { status: "removed" });
    expect(await restoreCampaign(db(), MOD, CAMPAIGN, NOW)).toEqual({ ok: true });
    // Its creator was told one thing, at the first read: that it is up (lib/campaigns/notices.ts, on since
    // 2026-11-11). Nothing of a removal, and nothing for the report set aside or the putting back.
    expect(notices().map((n) => n.kind)).toEqual(["approved"]);
    expect(notices().some((n) => n.kind === "removed")).toBe(false);
  });

  it("not when a campaign's days are over and the upkeep deletes it thirty days on", async () => {
    Object.assign(campaign(), { status: "ended", ends_at: new Date(NOW - 40 * DAY).toISOString(), ended_at: new Date(NOW - 40 * DAY).toISOString() });
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report.deleted.living).toBe(1);
    expect(w.tables.prayer_campaigns).toEqual([]);
    expect(notices()).toEqual([]);
  });

  it("and the notice is written from the two removals a moderator makes and from nowhere else in campaigns", () => {
    const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
    const writes = (rel: string) => (read(rel).match(/writeRemovalNotice\(/g) ?? []).length;
    expect(writes("lib/campaigns/moderation.ts")).toBe(1);
    expect(read("lib/campaigns/moderation.ts")).toContain('await writeRemovalNotice(admin, { userId: c.creator_id, target: "campaign", reason: code, excerpt: c.title });');
    expect(writes("lib/campaigns/pictures.ts")).toBe(1);
    expect(read("lib/campaigns/pictures.ts")).toContain('if (campaign) await writeRemovalNotice(admin, { userId: campaign.creator_id, target: "picture", reason: code });');
    // The upkeep's deletes, July's rows, a creator's own take-down, their own picture, their own comment: none is ours to announce.
    for (const quiet of ["lib/campaigns/upkeep.ts", "lib/campaigns/julyRows.ts", "lib/campaigns/thread.ts", "lib/campaigns/server.ts", "app/api/campaigns/[id]/route.ts", "app/api/campaigns/[id]/pictures/route.ts"]) {
      expect(writes(quiet), quiet).toBe(0);
    }
  });

  it("the team's panel sends the reason it asked for, and the moderators' page, which asks none yet, sends none", () => {
    const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
    expect(read("app/api/admin/community/route.ts")).toContain("runCampaignModAction(admin, actor, action, id, reason, reason_code)");
    expect(read("app/api/community/moderation/route.ts")).toContain("runCampaignModAction(who.admin, who.actor, action, id, reason)");
  });
});
