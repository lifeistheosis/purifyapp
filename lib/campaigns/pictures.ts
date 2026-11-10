import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { AUTO, logMod, type ModActor, type ModResult } from "@/lib/community/moderation";
import { subscriptionTier } from "@/lib/profile/cosmetics";
import { forgetUploads, recordUploadOwner } from "@/lib/security/uploadOwners";
import { normalizeShopImage } from "@/lib/shop/imageNormalize";

import { CAMPAIGN_BUCKET } from "./image";
import {
  PICTURES_FREE,
  PICTURES_PLUS,
  PICTURE_ALT_MAX,
  PICTURE_MAX_BYTES,
  PICTURE_TYPES,
  isJulyRow,
  isOver,
  type CampaignPicture,
  type CampaignPictures,
  type WaitingPicture,
} from "./model";
import { pictureCheck } from "./pictureCheck";
import { reportsSay } from "./reportsSay";
import type { CampaignRow, Read } from "./server";

// A campaign's pictures (his item 121): three, or twenty with Purify Plus.
//
// BUILT, AND SWITCHED OFF ON THE SERVER (./parts.ts). The routes that call
// this file answer 404 while the part is off. And with the part on, no
// picture is accepted until an automatic check is wired in (./pictureCheck.ts):
// two locks, both his to open.
//
// WHAT HAPPENS TO A PICTURE, in order:
//
//   1. The server makes it again from its pixels (lib/shop/imageNormalize.ts):
//      turned upright, 1600 pixels at most, and written with no EXIF at all.
//      Only that new copy is ever stored, so no place, no device and no
//      hidden text in a photograph reaches anyone. A test uploads a photo
//      that carries a place and reads back what was kept.
//   2. The automatic check looks at that copy, before any person does.
//   3. It is stored in a PRIVATE bucket, under a random name that says
//      nothing of whose it is, and marked held. Nobody can load it but its
//      creator and the moderators, each through an address that expires.
//   4. A moderator looks. Cleared, it is copied to the public bucket under a
//      new random name and the private copy is deleted. Refused, the file is
//      deleted and the row is kept as the record.
//   5. Shown, a reader can report it from its viewer. Reports hide it until
//      a moderator looks, by the rule that hides a campaign (./reportsSay.ts):
//      its file goes BACK to the private bucket under a new name, so the
//      address readers had opens nothing. Kept by a moderator after that, it
//      is not hidden by reports again.
//   6. It goes when its creator removes it, when the campaign is taken down
//      or deleted, and with the account (lib/auth/accountFiles.ts deletes
//      every file upload_owners gives a reader, and every copy is written
//      there in its creator's name before it exists).
//
// THE LIMIT IS THE SERVER'S, from the creator's own entitlement at the
// moment of the upload, as the profile banner's is. What the app believes
// about Plus is never asked. If Plus lapses, pictures already up stay up and
// no more can be added past three: what was given is not taken back.
//
// No faces are read, matched or named, here or anywhere.

/** Where a picture waits: private, so its address alone opens nothing. */
export const HELD_BUCKET = "campaign-held";
/** How long an address into the private bucket lasts. */
const HELD_URL_SECONDS = 3600;
/** What the server writes after making a picture again. */
const STORED_TYPES = ["image/jpeg", "image/png"];

const PICTURE_COLS = "id, campaign_id, bucket, path, position, width, height, alt, status, check_result, created_at";

type PictureRow = {
  id: string;
  campaign_id: string;
  bucket: string;
  path: string;
  position: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  status: string;
  check_result: string | null;
  created_at: string;
};

type Failure = { code?: string | null; message?: string | null } | null | undefined;

/** The pictures' table is not there: file three has not run. */
const absent = (error: Failure) => isTableAbsent(error);

/** Whether a campaign takes pictures: it waits for a moderator or runs, and it is one of the rework's. */
function takesPictures(campaign: CampaignRow, now: number): boolean {
  if (isJulyRow(campaign)) return false;
  return campaign.status === "held" || (campaign.status === "active" && !isOver(campaign, now));
}

/** How many pictures this reader's campaigns may carry right now: twenty with Plus, three without. */
export async function pictureLimit(admin: SupabaseClient, userId: string): Promise<number> {
  const { data } = await admin.from("entitlements").select("plus_until, pro_until").eq("user_id", userId).maybeSingle();
  return subscriptionTier(data as { plus_until?: string | null; pro_until?: string | null } | null) ? PICTURES_PLUS : PICTURES_FREE;
}

/** A campaign's pictures that have not been removed, in their order. */
async function rowsOf(admin: SupabaseClient, campaignId: string): Promise<Read<PictureRow[]>> {
  const { data, error } = await admin
    .from("prayer_campaign_pictures")
    .select(PICTURE_COLS)
    .eq("campaign_id", campaignId)
    .neq("status", "removed")
    .order("position", { ascending: true })
    .limit(PICTURES_PLUS);
  if (error) {
    if (absent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] pictures read failed", error.message);
    return { ok: false, why: "failed" };
  }
  return { ok: true, value: (data ?? []) as unknown as PictureRow[] };
}

/** An address that expires, into the private bucket. Null when it could not be made. */
async function heldUrl(admin: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await admin.storage.from(HELD_BUCKET).createSignedUrl(path, HELD_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function shownUrl(admin: SupabaseClient, row: PictureRow): string {
  return admin.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl;
}

/**
 * A campaign's pictures, for a reader who may open the campaign (the route
 * has asked). Everyone is handed the ones a moderator has cleared. Its
 * creator is also handed their own that still wait, each marked so, with an
 * address that expires; nobody else ever learns that one waits.
 */
export async function readPictures(
  admin: SupabaseClient,
  campaign: CampaignRow,
  reader: { id: string } | null,
  now: number = Date.now(),
): Promise<Read<CampaignPictures>> {
  const mine = reader !== null && campaign.creator_id === reader.id;
  const rows = await rowsOf(admin, campaign.id);
  if (!rows.ok) return rows;
  const pictures: CampaignPicture[] = [];
  for (const row of rows.value) {
    if (row.status === "shown") {
      pictures.push({ id: row.id, url: shownUrl(admin, row), width: row.width, height: row.height, alt: row.alt, held: false });
    } else if (row.status === "held" && mine) {
      const url = await heldUrl(admin, row.path);
      if (url) pictures.push({ id: row.id, url, width: row.width, height: row.height, alt: row.alt, held: true });
    }
  }
  if (!mine) return { ok: true, value: { pictures, limit: null, canAdd: false } };
  const limit = await pictureLimit(admin, reader.id);
  return {
    ok: true,
    value: { pictures, limit, canAdd: takesPictures(campaign, now) && rows.value.length < limit && pictureCheck() !== null },
  };
}

export type Added =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string; code?: string; limit?: number; plus?: boolean };

/**
 * Its creator puts a picture on their campaign.
 *
 * The route has asked the two lines a picture needs ("I am 18 or older", and
 * that it is theirs to share with the blessing of anyone in it). Here: only
 * the campaign's creator; only on a campaign that waits or runs; only while
 * an automatic check exists; a still JPEG, PNG or WebP of 4 MB at most; and
 * only up to their limit, read from their entitlement now.
 */
export async function addPicture(
  admin: SupabaseClient,
  user: { id: string },
  campaign: CampaignRow,
  file: { bytes: ArrayBuffer; type: string; size: number },
  said: { alt?: string | null } = {},
  now: number = Date.now(),
): Promise<Added> {
  if (campaign.creator_id !== user.id) {
    return { ok: false, status: 403, error: "Only the person who started a campaign can add a picture to it." };
  }
  if (!takesPictures(campaign, now)) {
    return { ok: false, status: 409, error: "That campaign is not running.", code: "not_running" };
  }
  // The second lock: no service, no picture, whatever the switch says.
  const check = pictureCheck();
  if (!check) {
    return { ok: false, status: 503, error: "Pictures are not open yet.", code: "no_check" };
  }
  if (!PICTURE_TYPES.includes(file.type)) {
    return { ok: false, status: 400, error: "Use a JPEG, PNG, or WebP image.", code: "picture_type" };
  }
  if (file.size === 0 || file.size > PICTURE_MAX_BYTES || file.bytes.byteLength > PICTURE_MAX_BYTES) {
    return { ok: false, status: 400, error: "A picture can be up to 4 MB.", code: "picture_size" };
  }

  const limit = await pictureLimit(admin, user.id);
  const existing = await rowsOf(admin, campaign.id);
  if (!existing.ok) {
    return existing.why === "absent" ? { ok: false, status: 404, error: "Not found." } : { ok: false, status: 500, error: "Couldn't add the picture. Please try again." };
  }
  if (existing.value.length >= limit) {
    return {
      ok: false,
      status: 409,
      error: limit === PICTURES_FREE ? "A campaign can carry three pictures." : "A campaign can carry twenty pictures.",
      code: "picture_limit",
      limit,
      // Whether Plus would give more room: said so that the screen can show where Plus is met.
      plus: limit === PICTURES_FREE,
    };
  }

  // 1. Made again from its pixels: upright, 1600 pixels at most, no EXIF.
  const made = await normalizeShopImage(file.bytes);
  if ("error" in made) return { ok: false, status: 400, error: made.error, code: "picture_unreadable" };

  // 2. The automatic check, on the copy that would be stored.
  let verdict: Awaited<ReturnType<typeof check>>;
  try {
    verdict = await check(made.bytes, made.contentType);
  } catch (e) {
    console.warn("[campaigns] picture check failed", e instanceof Error ? e.message : String(e));
    // A check that cannot answer is not a pass.
    return { ok: false, status: 503, error: "Pictures can't be added just now. Please try again later.", code: "check_failed" };
  }
  if (verdict.verdict !== "clear") {
    if (verdict.verdict === "report") {
      // NOT TO BE RELIED ON YET. What the law says must be kept and who must
      // be told when a service answers "report" is a lawyer's answer (the
      // notes, 8.3), and it is not written here. Until it is, this only
      // makes sure of the two things that are certain: nothing is stored
      // where anyone can load it, and the team is told at once, with the
      // service's own words and no picture.
      await logMod(admin, AUTO, { action: "picture_flagged", target: "campaign", targetId: campaign.id, summary: verdict.detail });
    }
    // The same plain words either way: the uploader is told no more than this.
    return { ok: false, status: 422, error: "That picture can't be used here.", code: "picture_refused" };
  }

  // 3. Stored privately, under a random name, and written down first.
  if (!(await ensureBucket(admin, HELD_BUCKET))) return { ok: false, status: 500, error: "Couldn't add the picture. Please try again." };
  const path = `c/${crypto.randomUUID()}.${made.extension}`;
  const recorded = await recordUploadOwner(admin, HELD_BUCKET, path, user.id);
  if (recorded !== "recorded") {
    return recorded === "absent" ? { ok: false, status: 503, error: "Pictures are not open yet.", code: "no_owners" } : { ok: false, status: 500, error: "Couldn't add the picture. Please try again." };
  }
  const { error: uploadError } = await admin.storage.from(HELD_BUCKET).upload(path, made.bytes, { contentType: made.contentType, upsert: false });
  if (uploadError) {
    await forgetUploads(admin, HELD_BUCKET, [path]);
    console.warn("[campaigns] picture not stored", uploadError.message);
    return { ok: false, status: 500, error: "Couldn't add the picture. Please try again." };
  }

  // Its place: the first one free.
  const taken = new Set(existing.value.map((r) => r.position));
  let position = 0;
  while (taken.has(position)) position++;
  const alt = (said.alt ?? "").replace(/\s+/g, " ").trim().slice(0, PICTURE_ALT_MAX) || null;
  const { data: created, error } = await admin
    .from("prayer_campaign_pictures")
    .insert({
      campaign_id: campaign.id,
      bucket: HELD_BUCKET,
      path,
      position,
      width: made.width,
      height: made.height,
      alt,
      status: "held",
      check_result: verdict.detail.slice(0, 120) || "clear",
      consent_at: new Date(now).toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) {
    // Nothing is left stored that no row names.
    await admin.storage.from(HELD_BUCKET).remove([path]);
    await forgetUploads(admin, HELD_BUCKET, [path]);
    if (absent(error)) return { ok: false, status: 404, error: "Not found." };
    // Two pictures added at once took the same place: the second is asked to try again.
    if (error?.code === "23505") return { ok: false, status: 409, error: "Please try that again.", code: "picture_busy" };
    console.warn("[campaigns] picture row failed", error?.message);
    return { ok: false, status: 500, error: "Couldn't add the picture. Please try again." };
  }
  return { ok: true, id: (created as { id: string }).id };
}

/** A bucket of ours, made on first use: the public one as July made it, the private one private. */
async function ensureBucket(admin: SupabaseClient, bucket: string): Promise<boolean> {
  const { error } = await admin.storage.createBucket(bucket, {
    public: bucket === CAMPAIGN_BUCKET,
    fileSizeLimit: PICTURE_MAX_BYTES,
    allowedMimeTypes: bucket === CAMPAIGN_BUCKET ? [...PICTURE_TYPES] : STORED_TYPES,
  });
  if (error && !/already exists/i.test(error.message)) {
    console.warn("[campaigns] bucket", bucket, error.message);
    return false;
  }
  return true;
}

/** Delete one stored file and its record. Never throws. False when the file may still be there. */
async function deleteFile(admin: SupabaseClient, bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await admin.storage.from(bucket).remove([path]);
    if (error) {
      console.warn("[campaigns] picture file not deleted", bucket, error.message);
      return false;
    }
    await forgetUploads(admin, bucket, [path]);
    return true;
  } catch (e) {
    console.warn("[campaigns] picture file not deleted", bucket, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * Move a picture's file to the other bucket, under a NEW random name: out to
 * the public one when it is cleared, back to the private one when reports
 * hide it. A new name each way, so an address someone kept from before
 * opens nothing after. Written down in its creator's name before it exists,
 * so the account's deletion finds it. Null when it could not be moved, and
 * then the file is where it was.
 */
async function moveFile(admin: SupabaseClient, row: PictureRow, to: string, creatorId: string): Promise<string | null> {
  if (!(await ensureBucket(admin, to))) return null;
  const extension = row.path.slice(row.path.lastIndexOf(".") + 1) || "jpg";
  const path = `c/${crypto.randomUUID()}.${extension}`;
  if ((await recordUploadOwner(admin, to, path, creatorId)) !== "recorded") return null;
  const { error } = await admin.storage.from(row.bucket).copy(row.path, path, { destinationBucket: to });
  if (error) {
    console.warn("[campaigns] picture not moved", error.message);
    await forgetUploads(admin, to, [path]);
    return null;
  }
  return path;
}

async function readRow(admin: SupabaseClient, pictureId: string): Promise<PictureRow | null> {
  const { data, error } = await admin.from("prayer_campaign_pictures").select(PICTURE_COLS).eq("id", pictureId).maybeSingle();
  if (error) {
    if (!absent(error)) console.warn("[campaigns] picture not read", error.message);
    return null;
  }
  return (data as unknown as PictureRow | null) ?? null;
}

/** Whose campaign a picture is on, and whether that campaign can still show one. */
async function campaignOf(admin: SupabaseClient, campaignId: string): Promise<{ creator_id: string; status: string; title: string; creator_name: string | null } | null> {
  const { data } = await admin.from("prayer_campaigns").select("id, creator_id, status, title, creator_name").eq("id", campaignId).maybeSingle();
  const c = data as { creator_id?: string; status?: string; title?: string; creator_name?: string | null } | null;
  if (!c?.creator_id) return null;
  return { creator_id: c.creator_id, status: String(c.status ?? ""), title: String(c.title ?? ""), creator_name: c.creator_name ?? null };
}

const flat = (text: string | null | undefined, max = 80): string => {
  const one = (text ?? "").replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
};

export type Taken = { ok: true } | { ok: false; status: number; error: string };

/**
 * Its creator removes one of their own pictures: "removed from the page and
 * from storage at once" (the notes, 4.4). The file first, and the row only
 * once the file is gone, so a picture is never left stored with nothing
 * naming it; a second try finishes what a first could not.
 */
export async function removeOwnPicture(admin: SupabaseClient, user: { id: string }, campaign: CampaignRow, pictureId: string): Promise<Taken> {
  if (campaign.creator_id !== user.id) return { ok: false, status: 403, error: "Only the person who started a campaign can remove its pictures." };
  const row = await readRow(admin, pictureId);
  if (!row || row.campaign_id !== campaign.id || row.status === "removed") return { ok: false, status: 404, error: "Not found." };
  if (!(await deleteFile(admin, row.bucket, row.path))) return { ok: false, status: 500, error: "Couldn't remove the picture. Please try again." };
  const { error } = await admin.from("prayer_campaign_pictures").delete().eq("id", pictureId);
  if (error) return { ok: false, status: 500, error: "Couldn't remove the picture. Please try again." };
  await closePictureReports(admin, pictureId, "actioned");
  return { ok: true };
}

/**
 * Every stored picture of these campaigns is deleted, files first. Called
 * before a campaign's row goes (its creator's take-down, the housekeeping),
 * since the database deletes the pictures' rows by itself and would leave
 * their files; and when a moderator removes a campaign, so that nothing of
 * it stays where an address could still load it. Quiet before file three
 * has run. Never throws: it follows a decision already made, and a file it
 * could not delete is logged and still written down under its creator, so
 * the account's deletion takes it.
 */
export async function deletePicturesOf(admin: SupabaseClient, campaignIds: readonly string[], opts: { keepRows?: string } = {}): Promise<void> {
  if (campaignIds.length === 0) return;
  try {
    const { data, error } = await admin
      .from("prayer_campaign_pictures")
      .select("id, bucket, path")
      .in("campaign_id", [...campaignIds])
      .neq("status", "removed")
      .limit(PICTURES_PLUS * 50);
    if (error) {
      if (!absent(error)) console.warn("[campaigns] pictures of removed campaigns not read", error.message);
      return;
    }
    const gone: string[] = [];
    for (const row of (data ?? []) as { id: string; bucket: string; path: string }[]) {
      if (await deleteFile(admin, row.bucket, row.path)) gone.push(row.id);
    }
    if (gone.length === 0) return;
    // A moderator's removal keeps the campaign's row for an appeal, so the
    // pictures' rows are kept too, marked, with no file behind them.
    // Otherwise the rows go now, with their files, and not only when the
    // campaign's row does: if that delete then fails, the campaign is left
    // without pictures and never with pictures that cannot load.
    const { error: settled } = opts.keepRows
      ? await admin
          .from("prayer_campaign_pictures")
          .update({ status: "removed", removed_reason: opts.keepRows.slice(0, 300), reviewed_at: new Date().toISOString() })
          .in("id", gone)
      : await admin.from("prayer_campaign_pictures").delete().in("id", gone);
    if (settled) console.warn("[campaigns] deleted pictures' rows not settled", settled.message);
  } catch (e) {
    console.warn("[campaigns] pictures of removed campaigns", e instanceof Error ? e.message : String(e));
  }
}

// ── Reports of a picture ────────────────────────────────────────────────────

async function closePictureReports(admin: SupabaseClient, pictureId: string, status: "actioned" | "dismissed"): Promise<void> {
  const { error } = await admin
    .from("prayer_campaign_reports")
    .update({ status, closed_at: new Date().toISOString() })
    .eq("target_kind", "picture")
    .eq("target_id", pictureId)
    .eq("status", "open");
  if (error) console.warn("[campaigns] picture reports not closed", error.message);
}

export type PictureReported = { ok: true } | { ok: false; status: number; error: string };

/**
 * A reader reports one picture, from its viewer: a reason to tick, and words
 * if they have some. One open report a reader for each picture. Then it may
 * hide itself until a moderator looks, by the rule a campaign is hidden by
 * (./reportsSay.ts). The answer never says which happened.
 */
export async function reportPicture(
  admin: SupabaseClient,
  reporter: { id: string },
  campaign: CampaignRow,
  pictureId: string,
  reason: string,
  words: string | null,
  now: number = Date.now(),
): Promise<PictureReported> {
  const row = await readRow(admin, pictureId);
  // Only one that readers are shown: nobody but its creator knows a waiting one exists.
  if (!row || row.campaign_id !== campaign.id || row.status !== "shown") return { ok: false, status: 404, error: "Not found." };
  const { error } = await admin.from("prayer_campaign_reports").insert({
    campaign_id: campaign.id,
    reporter_id: reporter.id,
    target_kind: "picture",
    target_id: pictureId,
    reason_code: reason,
    reason: words?.trim().slice(0, 500) || null,
    status: "open",
  });
  // 23505: this reader has already reported this picture, which is a success from where they stand.
  if (error && error.code !== "23505") {
    console.warn("[campaigns] picture report failed", error.message);
    return { ok: false, status: 500, error: "Could not send that report." };
  }
  if (!error) await maybeHidePicture(admin, row, campaign.creator_id, now);
  return { ok: true };
}

/**
 * Hide a reported picture until a moderator looks, when its reports say so:
 * its file goes back to the private bucket under a new name, so the address
 * readers had opens nothing. Never one a moderator has already kept after
 * reports (a dismissed report of it says so), so that reports cannot be
 * used to take a picture down twice. Never throws.
 */
async function maybeHidePicture(admin: SupabaseClient, row: PictureRow, creatorId: string, now: number): Promise<boolean> {
  try {
    const { data: reports } = await admin
      .from("prayer_campaign_reports")
      .select("reporter_id, reason_code, status")
      .eq("target_kind", "picture")
      .eq("target_id", row.id)
      .in("status", ["open", "dismissed"])
      .limit(100);
    const all = (reports ?? []) as { reporter_id: string | null; reason_code: string | null; status: string }[];
    if (all.some((r) => r.status === "dismissed")) return false;
    const say = await reportsSay(admin, creatorId, all, now);
    if (!say.hide) return false;

    const path = await moveFile(admin, row, HELD_BUCKET, creatorId);
    if (!path) return false;
    const { data: changed, error } = await admin
      .from("prayer_campaign_pictures")
      .update({ bucket: HELD_BUCKET, path, status: "held" })
      .eq("id", row.id)
      .eq("status", "shown")
      .select("id");
    if (error || !changed || (changed as unknown[]).length === 0) {
      // It was not shown any more (removed, or hidden a moment ago): the copy just made goes.
      await deleteFile(admin, HELD_BUCKET, path);
      return false;
    }
    await deleteFile(admin, row.bucket, row.path);
    await logMod(admin, AUTO, {
      action: "auto_hide",
      target: "picture",
      targetId: row.id,
      summary: say.aboutMe ? "A picture hidden on a report that it shows someone without their blessing" : `A picture hidden after ${say.reporters} reports`,
    });
    return true;
  } catch (e) {
    console.warn("[campaigns] picture auto-hide failed", e instanceof Error ? e.message : String(e));
    return false;
  }
}

// ── A moderator's two decisions ─────────────────────────────────────────────

/**
 * Clear a picture: it is copied to the public bucket under a new random
 * name, the private copy is deleted, and from then on every reader who may
 * open the campaign is handed it. Reports of it are set aside, and after
 * that reports do not hide it again.
 */
export async function approvePicture(admin: SupabaseClient, actor: ModActor, pictureId: string): Promise<ModResult> {
  const row = await readRow(admin, pictureId);
  if (!row) return { ok: false, status: 404, error: "That picture is gone." };
  if (row.status === "removed") return { ok: false, status: 409, error: "That picture is not waiting." };
  const campaign = await campaignOf(admin, row.campaign_id);
  if (!campaign || campaign.status === "removed") return { ok: false, status: 409, error: "Its campaign is gone." };
  const about = `${campaign.creator_name ?? "A reader"}: ${flat(campaign.title)}`;

  // Still shown, with reports that had not hidden it: kept, and the reports
  // are set aside, after which reports do not hide it.
  if (row.status === "shown") {
    await closePictureReports(admin, pictureId, "dismissed");
    await logMod(admin, actor, { action: "approve_picture", target: "picture", targetId: pictureId, summary: about });
    return { ok: true };
  }

  const path = await moveFile(admin, row, CAMPAIGN_BUCKET, campaign.creator_id);
  if (!path) return { ok: false, status: 500, error: "Couldn't clear the picture." };
  const { data: changed, error } = await admin
    .from("prayer_campaign_pictures")
    .update({ bucket: CAMPAIGN_BUCKET, path, status: "shown", reviewed_by_email: actor.email ?? actor.name, reviewed_at: new Date().toISOString() })
    .eq("id", pictureId)
    .eq("status", "held")
    .select("id");
  if (error || !changed || (changed as unknown[]).length === 0) {
    // Not shown after all: the public copy goes, and the picture is where it was.
    await deleteFile(admin, CAMPAIGN_BUCKET, path);
    return error ? { ok: false, status: 500, error: error.message } : { ok: false, status: 409, error: "That picture is not waiting." };
  }
  await deleteFile(admin, row.bucket, row.path);
  await closePictureReports(admin, pictureId, "dismissed");
  await logMod(admin, actor, { action: "approve_picture", target: "picture", targetId: pictureId, summary: about });
  return { ok: true };
}

/**
 * Refuse a waiting picture or take down a shown one: its file is deleted
 * wherever it is, and the row is kept as the record of what was decided,
 * with no picture behind it.
 */
export async function removePictureAsModerator(admin: SupabaseClient, actor: ModActor, pictureId: string, reason?: string | null): Promise<ModResult> {
  const row = await readRow(admin, pictureId);
  if (!row) return { ok: false, status: 404, error: "That picture is gone." };
  if (row.status === "removed") return { ok: false, status: 409, error: "That picture is already removed." };
  if (!(await deleteFile(admin, row.bucket, row.path))) return { ok: false, status: 500, error: "Couldn't delete the picture's file. It is still there; please try again." };
  const { error } = await admin
    .from("prayer_campaign_pictures")
    .update({ status: "removed", removed_reason: reason?.trim().slice(0, 300) || null, reviewed_by_email: actor.email ?? actor.name, reviewed_at: new Date().toISOString() })
    .eq("id", pictureId);
  if (error) return { ok: false, status: 500, error: error.message };
  await closePictureReports(admin, pictureId, "actioned");
  const campaign = await campaignOf(admin, row.campaign_id);
  await logMod(admin, actor, {
    action: "remove_picture",
    target: "picture",
    targetId: pictureId,
    summary: [campaign ? `${campaign.creator_name ?? "A reader"}: ${flat(campaign.title)}` : null, reason?.trim() || null].filter(Boolean).join(". ") || null,
  });
  return { ok: true };
}

/**
 * The pictures a moderator has to look at, oldest first, as the queue shows
 * them: every picture that waits (new, or hidden by readers' reports), and
 * every picture still shown that a reader has reported. An explicit
 * projection: the picture through an address that expires (or its public
 * one, when it is still shown), what its creator says it shows, what the
 * check answered, the reasons readers ticked, and its campaign by title.
 * Never an account, never who reported, and never where the file is kept.
 */
export async function readWaitingPictures(admin: SupabaseClient): Promise<{ rows: WaitingPicture[]; live: boolean }> {
  const [held, reported] = await Promise.all([
    admin.from("prayer_campaign_pictures").select(PICTURE_COLS).eq("status", "held").order("created_at", { ascending: true }).limit(60),
    admin.from("prayer_campaign_reports").select("target_id, reason_code, reason").eq("target_kind", "picture").eq("status", "open").order("created_at", { ascending: true }).limit(300),
  ]);
  if (held.error) {
    if (!absent(held.error)) console.warn("[campaigns] waiting pictures not read", held.error.message);
    return { rows: [], live: false };
  }
  const said = new Map<string, { reason_code: string | null; reason: string | null }[]>();
  for (const r of (reported.data ?? []) as { target_id: string | null; reason_code: string | null; reason: string | null }[]) {
    if (r.target_id) said.set(r.target_id, [...(said.get(r.target_id) ?? []), { reason_code: r.reason_code, reason: r.reason }]);
  }
  const rows = (held.data ?? []) as unknown as PictureRow[];
  // Reported, and still shown: not among those that wait, so read by name.
  const more = [...said.keys()].filter((id) => !rows.some((r) => r.id === id));
  if (more.length > 0) {
    const { data } = await admin.from("prayer_campaign_pictures").select(PICTURE_COLS).eq("status", "shown").in("id", more.slice(0, 60));
    rows.push(...((data ?? []) as unknown as PictureRow[]));
  }
  if (rows.length === 0) return { rows: [], live: true };
  const { data: campaigns } = await admin
    .from("prayer_campaigns")
    .select("id, title, creator_name, status")
    .in("id", [...new Set(rows.map((r) => r.campaign_id))]);
  const byId = new Map(((campaigns ?? []) as { id: string; title: string; creator_name: string | null; status: string }[]).map((c) => [c.id, c]));
  const out: WaitingPicture[] = [];
  for (const row of rows) {
    const c = byId.get(row.campaign_id);
    // One whose campaign a moderator removed a moment ago has nothing to wait for.
    if (!c || c.status === "removed") continue;
    out.push({
      id: row.id,
      url: row.status === "shown" ? shownUrl(admin, row) : await heldUrl(admin, row.path),
      shown: row.status === "shown",
      alt: row.alt,
      check_result: row.check_result,
      created_at: row.created_at,
      reports: said.get(row.id) ?? [],
      campaign: { id: c.id, title: c.title, creator_name: c.creator_name ?? null },
    });
  }
  return { rows: out, live: true };
}
