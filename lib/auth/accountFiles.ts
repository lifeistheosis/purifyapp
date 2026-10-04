import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { CAMPAIGN_BUCKET } from "@/lib/campaigns/image";
import { ownBannerPaths } from "@/lib/profile/bannerFile";
import { BANNER_BUCKET } from "@/lib/profile/bannerPath";
import { UPLOAD_OWNERS_TABLE } from "@/lib/security/uploadPath";
import { KITCHEN_BUCKET } from "@/lib/trapeza/photos";

// The files a reader leaves in storage, for app/api/auth/delete to take with
// the account. Deleting the auth user cascades to their rows, upload_owners
// among them; nothing cascades to a bucket. So until this their pictures
// stayed at their public addresses after the account was gone, and the record
// of whose they were went with the account.
//
// Only what is provably theirs AND has nothing left to show it:
//
//   whatever upload_owners gives them   review photos, campaign pictures, their
//                                       banner and their profile picture
//                                       (avatars/a/...). Read BEFORE the account
//                                       goes: afterwards the rows are gone.
//   avatars/u/<id>/...                  uploads from before paths were random:
//   kitchen/r/<id>/...                  the folder is their id. They stay
//   campaign-media/c/<id>/...           until scripts/migrate-avatar-paths.mjs
//                                       and scripts/migrate-upload-paths.mjs
//                                       have moved them
//   a banner from before the record     by the rule in lib/profile/bannerFile.ts
//
// Left alone on purpose:
//
//   kitchen/s/...   the photo sent with a recipe, on an old path or a new one.
//                   A recipe stays when its author leaves (author_id is set
//                   null) and still shows it.
//   shop-media      a store's pictures belong to the store, which stays.

const AVATAR_BUCKET = "avatars";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Rows or names asked for per read, and paths sent per delete. */
const PAGE = 1000;
const BATCH = 100;
/** A read goes this many pages deep at most, so one request stays bounded. */
const MAX_PAGES = 10;

export type AccountFiles = { bucket: string; paths: string[] }[];

/** A recipe's photo outlives its author, whichever shape its path has. */
const staysWithRecipe = (bucket: string, path: string) => bucket === KITCHEN_BUCKET && path.startsWith("s/");

/**
 * The folders that are one reader's alone, by the id in their name. An id
 * that is not a uuid has none: the folder name is built from it, and an empty
 * or odd one must never widen the listing to somebody else's files.
 */
export function accountFolders(userId: string): { bucket: string; folder: string }[] {
  if (!UUID.test(userId)) return [];
  return [
    { bucket: AVATAR_BUCKET, folder: `u/${userId}` },
    { bucket: KITCHEN_BUCKET, folder: `r/${userId}` },
    { bucket: CAMPAIGN_BUCKET, folder: `c/${userId}` },
  ];
}

async function filesIn(admin: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const out: string[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: PAGE, offset: page * PAGE });
    if (error) {
      // A bucket nobody has uploaded to yet does not exist, and holds nothing.
      console.warn("[account] folder not listed", bucket, error.message);
      break;
    }
    // A folder inside a folder comes back with no id; only files are taken.
    out.push(...(data ?? []).filter((f) => f.id !== null).map((f) => `${folder}/${f.name}`));
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

/** Every file the record gives this reader, in every bucket. */
async function recordedFiles(admin: SupabaseClient, userId: string): Promise<{ bucket: string; path: string }[]> {
  const out: { bucket: string; path: string }[] = [];
  // Paged until a page comes back empty, never "until a short page": the
  // server may cap a page below what was asked for.
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin
      .from(UPLOAD_OWNERS_TABLE)
      .select("bucket, path")
      .eq("owner_id", userId)
      .order("path")
      .range(out.length, out.length + PAGE - 1);
    if (error) {
      if (!isTableAbsent(error)) console.warn("[account] upload records not read", error.message);
      break;
    }
    const rows = (data ?? []) as { bucket: string; path: string }[];
    if (rows.length === 0) break;
    out.push(...rows);
  }
  return out;
}

/**
 * Every file to delete with a reader's account. Read it BEFORE the account
 * goes: the record of which uploads were theirs goes with it. Never throws,
 * so a storage fault cannot stand between a reader and deleting their account.
 */
export async function accountFiles(admin: SupabaseClient, userId: string): Promise<AccountFiles> {
  const found = new Map<string, string[]>();
  const add = (bucket: string, paths: string[]) => {
    const have = found.get(bucket) ?? [];
    const fresh = paths.filter((p) => !have.includes(p) && !staysWithRecipe(bucket, p));
    if (fresh.length > 0) found.set(bucket, [...have, ...fresh]);
  };
  try {
    const folders = accountFolders(userId);
    if (folders.length === 0) return [];
    for (const { bucket, path } of await recordedFiles(admin, userId)) add(bucket, [path]);
    for (const { bucket, folder } of folders) add(bucket, await filesIn(admin, bucket, folder));
    const { data } = await admin
      .from("profiles")
      .select("banner_url")
      .eq("id", userId)
      .maybeSingle<{ banner_url: string | null }>();
    add(BANNER_BUCKET, await ownBannerPaths(admin, userId, data?.banner_url ?? null));
  } catch (e) {
    console.warn("[account] files not listed", e instanceof Error ? e.message : e);
  }
  return [...found].map(([bucket, paths]) => ({ bucket, paths }));
}

/**
 * Delete them. Call it once the account is gone, never before: a file must
 * not go while the account that shows it still stands. Never throws: by now
 * the deletion has happened, and a file left behind is logged for a sweep.
 * Their records went with the account, so there is nothing to forget.
 */
export async function deleteAccountFiles(admin: SupabaseClient, files: AccountFiles): Promise<void> {
  for (const { bucket, paths } of files) {
    for (let i = 0; i < paths.length; i += BATCH) {
      try {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + BATCH));
        if (error) console.warn("[account] files left behind", bucket, error.message);
      } catch (e) {
        console.warn("[account] files left behind", bucket, e instanceof Error ? e.message : e);
      }
    }
  }
}
