// Move every stored kitchen photo and campaign picture off a path that names
// its owner.
//
// WHY. /api/trapeza/upload used to store a member's photos in the PUBLIC
// kitchen bucket at r/<user id>/... (reviews) and s/<user id>/... (recipe
// submissions), and /api/campaigns/image stored at c/<user id>/... in
// campaign-media. A public bucket serves a file at a URL that is its path, so
// the Supabase auth uuid (also the RevenueCat appUserID) sat in every review
// photo every reader is served, although 20260928000000_kitchen.sql says no
// uuid ever reaches a browser. The routes now write
// <folder>/<random uuid>.<ext> and record the owner in upload_owners; this
// moves what is already stored.
//
// WHAT IT DOES, for each old file a row still points at:
//   1. copies it to <folder>/<random uuid>.<ext> in the same bucket,
//   2. writes down whose it is in upload_owners: the id the old path carried,
//      which is the only proof there ever was. If that account is gone the
//      file still moves, with no owner,
//   3. points every row that names the old URL at the copy: photo_urls in
//      trapeza_recipe_reviews, photo_url in trapeza_recipes, image_url in
//      prayer_campaigns,
//   4. deletes the old file, and only once every row has moved.
//
// WHAT IT LEAVES.
//   - Old files that no row points at: abandoned uploads. Nothing serves
//     them, and a photo with no copy cannot be brought back.
//   - Reviews and campaigns that were taken down. No reader is served them,
//     and their files were deleted when they came down.
//   - A recipe's own photo under h/<recipe id>/. That id is the recipe's,
//     and it is public already.
//
// RUN IT IN THIS ORDER, or it does harm:
//   1. supabase/migrations/20261007000000_upload_owners.sql is applied.
//      Without it this stops before writing anything.
//   2. The new routes are live. The old review route only accepts a photo
//      under r/<the member's id>/, so on the old code a member whose photos
//      this has moved could not save an edit to their own review.
//   3. Then this. A member who had their review open in the edit form while
//      it ran has to reload the page before saving.
//
// DRY RUN BY DEFAULT. Without --apply it reads and counts, and writes
// nothing. --limit N moves at most N files, for a trial. Safe to run again:
// a run that stops part way leaves every row on a file that exists, and the
// next run picks up what is left (at worst leaving a spare copy, and an old
// file nothing names). A finished run is followed by a fresh scan, which
// should find nothing.
//
// PRINTS COUNTS ONLY. Never an email, an id, a URL or a path (an old path IS
// an id). Error text is passed through redact() before it is printed.
//
// Service role only, never in CI. Reads .env.local like
// scripts/grandfather-plus.mjs.
//
// Usage:
//   node scripts/migrate-upload-paths.mjs                     dry run
//   node scripts/migrate-upload-paths.mjs --apply --limit 1   move one, then look
//   node scripts/migrate-upload-paths.mjs --apply             move them all

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { isTableAbsent } from "../lib/admin/tableAbsent.ts";
import { UPLOAD_OWNERS_TABLE, uploadRef } from "../lib/security/uploadPath.ts";
import { isColumnAbsent } from "../lib/supabase/columnAbsent.ts";

const PAGE = 1000;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Every column that holds the URL of a reader's own upload, with the bucket
 * and folder the route wrote it under.
 *
 *   list     the column is an array of URLs, not one.
 *   stamp    for a list: the column every save of the row sets, so a row
 *            that changed between being read and being written is seen.
 *   hidden   a status no reader is served; those rows are left alone.
 */
export const STORES = [
  {
    table: "trapeza_recipe_reviews",
    column: "photo_urls",
    list: true,
    stamp: "updated_at",
    hidden: "removed",
    bucket: "kitchen",
    folder: "r",
    label: "kitchen reviews",
  },
  {
    table: "trapeza_recipes",
    column: "photo_url",
    list: false,
    hidden: null,
    bucket: "kitchen",
    folder: "s",
    label: "recipes",
  },
  {
    table: "prayer_campaigns",
    column: "image_url",
    list: false,
    hidden: "removed",
    bucket: "campaign-media",
    folder: "c",
    label: "prayer campaigns",
  },
];

/** Message text with every uuid and email address taken out. */
export function redact(text) {
  return String(text)
    .replace(new RegExp(UUID, "gi"), "<id>")
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, "<email>");
}

function code(error) {
  return redact(error?.code ?? error?.status ?? "error");
}

/**
 * Every old file a row still names, keyed by bucket and path, with the id its
 * path carries.
 */
export async function findNamedUploads(admin) {
  const files = new Map();
  const tally = { rows: {}, refs: {}, skipped: {}, unrecognized: 0 };

  for (const store of STORES) {
    const prefix = admin.storage.from(store.bucket).getPublicUrl("").data.publicUrl;
    // An old-shape URL this cannot place: another host, or an odd file name.
    const oldShape = new RegExp(`/storage/v1/object/public/${store.bucket}/${store.folder}/${UUID}/`);
    tally.rows[store.table] = 0;
    tally.refs[store.table] = 0;

    // Paged until a page comes back empty, never "until a short page": the
    // server may cap a page below PAGE (PostgREST's max-rows), and stopping
    // at the first short page would skip the rest and report a clean zero.
    for (let from = 0; ; ) {
      let query = admin.from(store.table).select(`id, ${store.column}`);
      if (store.hidden) query = query.neq("status", store.hidden);
      const { data, error } = await query.order("id").range(from, from + PAGE - 1);
      if (error) {
        if (isTableAbsent(error) || isColumnAbsent(error)) {
          tally.skipped[store.table] = isTableAbsent(error) ? "table" : "column";
          break;
        }
        throw new Error(`reading ${store.label} failed (${code(error)})`);
      }
      const rows = data ?? [];
      if (rows.length === 0) break;
      for (const row of rows) {
        const value = row[store.column];
        for (const url of store.list ? (value ?? []) : [value]) {
          if (typeof url !== "string") continue;
          const ref = uploadRef(url, prefix, store.folder);
          if (ref?.legacyOwner) {
            const key = `${store.bucket}/${ref.path}`;
            if (!files.has(key)) files.set(key, { store, url, path: ref.path, ext: ref.ext, owner: ref.legacyOwner });
            tally.refs[store.table]++;
          } else if (!ref && oldShape.test(url)) {
            tally.unrecognized++;
          }
        }
      }
      tally.rows[store.table] += rows.length;
      from += rows.length;
    }
  }

  return { files, tally };
}

/**
 * Point every row that names `oldUrl` at `newUrl`. Returns how many rows
 * moved, and whether every one did: false leaves the old file in place.
 */
async function repoint(admin, store, oldUrl, newUrl) {
  if (!store.list) {
    const { data, error } = await admin
      .from(store.table)
      .update({ [store.column]: newUrl })
      .eq(store.column, oldUrl)
      .select("id");
    return error ? { rows: 0, ok: false } : { rows: (data ?? []).length, ok: true };
  }

  const { data, error } = await admin
    .from(store.table)
    .select(`id, ${store.column}, ${store.stamp}`)
    .contains(store.column, [oldUrl]);
  if (error) return { rows: 0, ok: false };
  let rows = 0;
  let ok = true;
  for (const row of data ?? []) {
    const next = row[store.column].map((url) => (url === oldUrl ? newUrl : url));
    // Only if the row is as it was read. A member saving their review in
    // between must not have that save overwritten with the list read here;
    // the row is left for the next run instead.
    const { data: saved, error: saveError } = await admin
      .from(store.table)
      .update({ [store.column]: next })
      .eq("id", row.id)
      .eq(store.stamp, row[store.stamp])
      .select("id");
    if (saveError || (saved ?? []).length === 0) ok = false;
    else rows++;
  }
  return { rows, ok };
}

/** One "label ... count" line. */
function line(label, value) {
  return `  ${label}`.padEnd(52) + value;
}

function printScan(log, title, { files, tally }) {
  log(title);
  for (const store of STORES) {
    if (tally.skipped[store.table]) {
      log(line(store.label, `${tally.skipped[store.table]} not there, skipped`));
      continue;
    }
    log(line(`${store.label} read`, tally.rows[store.table]));
    log(line(`  URLs in them that name their owner`, tally.refs[store.table]));
  }
  log(line("old files to move", files.size));
  if (tally.unrecognized > 0) {
    log(line("old-shape URLs it cannot place, left alone", tally.unrecognized));
    log("    (if that is most of them, check NEXT_PUBLIC_SUPABASE_URL)");
  }
}

/**
 * The whole job. `admin` is a service-role client. Returns ok: false when a
 * write failed or something is left that should have moved, so the caller
 * can exit non-zero.
 */
export async function migrateUploadPaths(
  admin,
  { apply = false, limit = Infinity, log = console.log } = {},
) {
  const origin = new URL(admin.storage.from(STORES[0].bucket).getPublicUrl("").data.publicUrl).origin;
  log(`Project ${redact(origin)}`);

  // Nothing moves without the record of whose each file is.
  const { error: ownersError } = await admin.from(UPLOAD_OWNERS_TABLE).select("path").limit(1);
  if (ownersError && !isTableAbsent(ownersError)) {
    throw new Error(`reading upload_owners failed (${code(ownersError)})`);
  }
  const ownersThere = !ownersError;

  const before = await findNamedUploads(admin);
  printScan(log, apply ? "Before:" : "Dry run, nothing written:", before);
  if (!ownersThere) {
    log("The upload_owners table is not there. Nothing was written. Apply");
    log("supabase/migrations/20261007000000_upload_owners.sql first.");
    return { ok: !apply, moved: 0, remaining: before.files.size };
  }
  if (!apply) {
    if (before.files.size > 0) log("Run again with --apply to move them.");
    return { ok: true, moved: 0, remaining: before.files.size };
  }

  const done = {
    copied: 0,
    missing: 0,
    copyFailed: 0,
    recorded: 0,
    ownerGone: 0,
    recordFailed: 0,
    rows: 0,
    removed: 0,
    kept: 0,
    removeFailed: 0,
  };
  const todo = [...before.files.values()].slice(0, limit);

  for (const file of todo) {
    const { store } = file;
    const bucket = admin.storage.from(store.bucket);
    const newPath = `${store.folder}/${crypto.randomUUID()}.${file.ext}`;
    const newUrl = bucket.getPublicUrl(newPath).data.publicUrl;

    const { error: copyError } = await bucket.copy(file.path, newPath);
    if (copyError) {
      // Already gone: whatever names it shows no photo today, and is left.
      if (String(copyError.statusCode ?? copyError.status) === "404" || /not.?found/i.test(copyError.message ?? "")) {
        done.missing++;
      } else {
        done.copyFailed++;
      }
      continue;
    }
    done.copied++;

    const { error: ownerError } = await admin
      .from(UPLOAD_OWNERS_TABLE)
      .insert({ bucket: store.bucket, path: newPath, owner_id: file.owner });
    if (!ownerError) {
      done.recorded++;
    } else if (ownerError.code === "23503") {
      // The foreign key to auth.users: that account has been deleted. The
      // row that names the file is still served, so the file still moves.
      done.ownerGone++;
    } else {
      // Unrecorded, the copy would be a file nobody can be shown to own.
      done.recordFailed++;
      await bucket.remove([newPath]);
      continue;
    }

    const moved = await repoint(admin, store, file.url, newUrl);
    done.rows += moved.rows;
    // A row that did not move still shows the old file, so it stays.
    if (!moved.ok) {
      done.kept++;
      continue;
    }
    const { error: removeError } = await bucket.remove([file.path]);
    if (removeError) done.removeFailed++;
    else done.removed++;
  }

  log("Moved:");
  log(line("files copied to a random path", done.copied));
  log(line("owners written down", done.recorded));
  log(line("rows repointed", done.rows));
  log(line("old files deleted", done.removed));
  if (done.ownerGone > 0) log(line("moved with no owner (account deleted)", done.ownerGone));
  const trouble = [
    [done.missing, "old files already gone (rows left as they are)"],
    [done.copyFailed, "copies that failed"],
    [done.recordFailed, "owners that could not be written down"],
    [done.kept, "old files kept, a row did not move"],
    [done.removeFailed, "old files that could not be deleted"],
  ].filter(([n]) => n > 0);
  for (const [n, what] of trouble) log(line(what, n));

  const after = await findNamedUploads(admin);
  printScan(log, "After, a fresh scan:", after);
  const finished = todo.length === before.files.size;
  if (after.files.size === 0) log("No row names its owner in a photo URL any more.");
  else if (!finished) log(`Limited to ${todo.length}; run again for the rest.`);

  return {
    ok: trouble.length === 0 && (!finished || after.files.size === 0),
    moved: done.removed,
    remaining: after.files.size,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limitAt = process.argv.indexOf("--limit");
  const limit = limitAt >= 0 ? Number(process.argv[limitAt + 1]) : Infinity;
  if (!(limit > 0)) {
    console.error("--limit takes a number above zero.");
    process.exit(1);
  }

  // Minimal .env.local loader, as in scripts/grandfather-plus.mjs, CRLF-safe.
  try {
    const env = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* rely on the process env */
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const result = await migrateUploadPaths(admin, { apply, limit });
  if (!result.ok) process.exitCode = 1;
}

// Run only when started as a script, so the test can import the functions.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`Stopped: ${redact(err?.message ?? err)}`);
    process.exit(1);
  });
}
