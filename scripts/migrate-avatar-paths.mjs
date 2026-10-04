// Move every stored profile picture off a path that names its owner.
//
// WHY. app/api/community/avatar/route.ts used to store pictures in the PUBLIC
// avatars bucket at u/<user id>/<time>.<ext>, so the Supabase auth uuid (also
// the RevenueCat appUserID) sat in every avatar URL that the feed, replies,
// kitchen reviews and the public profile serve to anyone. Keeping that id out
// of public reads is what 20260802000100_revoke_public_user_id.sql is for. The
// route now writes a/<random uuid>.<ext> and records the owner in
// upload_owners, as scripts/migrate-upload-paths.mjs describes for the
// Kitchen and campaigns; this moves the profile pictures already stored.
//
// WHAT IT DOES, in two passes.
//   1. Pictures of record: each old picture a profiles row names
//      (profiles.avatar_url, 20261003000000_profile_pictures.sql). The file
//      is copied to a/<random uuid>.<ext>; whose it is goes in upload_owners,
//      the id the old path carried, so their next upload may delete it; the
//      profile is pointed at the copy, which moves the reader's posts and
//      replies with it by trigger; their metadata and their kitchen reviews
//      are pointed at the copy wherever they named ANY old picture of theirs;
//      and anyone else whose metadata or rows named this file is moved with
//      it.
//   2. What is still named after that, found by a fresh scan: a picture only
//      a post, a review or somebody's metadata names. Each is copied,
//      recorded and every reference moved, as above. References are found by
//      URL, not through each owner: a row copies the URL when it is written,
//      and that URL carries the id just the same. If the account the old
//      path named is gone, the file still moves, with no owner.
// An old file is deleted only once every reference to it has moved.
//
// WHAT IT LEAVES. Old pictures that nothing points at any more (every picture
// change before this fix left one behind) stay where they are. Nothing serves
// them, and deleting a picture that has no copy cannot be undone. They go
// with the reader's account (lib/auth/accountFiles.ts).
//
// RUN IT IN THIS ORDER.
//   1. supabase/migrations/20261007000000_upload_owners.sql is applied.
//      Without it this stops before writing anything.
//   2. supabase/migrations/20261008000000_avatar_random_path.sql is applied.
//      Before it, profiles.avatar_url refuses the new path: the first refusal
//      stops the run, with nothing moved.
//   3. The new route is live. The old route keeps writing u/<id> paths, and a
//      second run would be needed for those.
//   4. Then this.
//
// DRY RUN BY DEFAULT. Without --apply it reads and counts, and writes nothing.
// --limit N moves at most N pictures, for a trial. Safe to run again: a run
// that stops part way leaves every reference on a file that exists, and the
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
//   node scripts/migrate-avatar-paths.mjs                     dry run
//   node scripts/migrate-avatar-paths.mjs --apply --limit 1   move one, then look
//   node scripts/migrate-avatar-paths.mjs --apply             move them all

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { isTableAbsent } from "../lib/admin/tableAbsent.ts";
import { AVATAR_BUCKET, AVATAR_COPIES, avatarRef } from "../lib/community/avatarPath.ts";
import { UPLOAD_OWNERS_TABLE } from "../lib/security/uploadPath.ts";
import { isColumnAbsent } from "../lib/supabase/columnAbsent.ts";

const PAGE = 1000;
/** Any URL that looks like an old avatar path, on any host. */
const LEGACY_MARK = `/storage/v1/object/public/${AVATAR_BUCKET}/u/`;
/** The migration that lets profiles.avatar_url hold the new path. */
const MIGRATION = "20261008000000_avatar_random_path.sql";

/** The old-shape picture behind a URL, and the id its path carries, or null. */
function legacyAvatar(url, prefix) {
  const ref = avatarRef(url, prefix);
  return ref?.legacyOwner ? { path: ref.path, owner: ref.legacyOwner } : null;
}

const LABEL = {
  community_posts: "posts",
  community_post_replies: "replies",
  trapeza_recipe_reviews: "kitchen reviews",
};

/** Message text with every uuid and email address taken out. */
export function redact(text) {
  return String(text)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, "<email>");
}

function code(error) {
  // A request that never reached the server has an empty code.
  return redact(error?.code || error?.status || "no answer");
}

/**
 * Everything that still names an old u/<id> picture, grouped by the file it
 * names: the profiles whose picture of record it is, and the accounts whose
 * metadata names it.
 */
export async function findLegacyAvatars(admin, prefix) {
  const pictures = new Map();
  const tally = {
    accounts: 0,
    accountRefs: 0,
    profileRefs: 0,
    rowRefs: {},
    unrecognized: 0,
    absentTables: [],
    noPictureColumn: false,
  };
  const picture = ({ path: objectPath, owner }) => {
    if (!pictures.has(objectPath)) pictures.set(objectPath, { owner, accounts: [], profiles: [] });
    return pictures.get(objectPath);
  };

  // Paged until a page comes back empty, never "until a short page": the
  // server may cap a page below PAGE (PostgREST's max-rows, GoTrue's own
  // limit), and stopping at the first short page would skip the rest and
  // report a clean zero. auth-js's nextPage is no help either, since it
  // parses only the first digit of the page number.
  const seen = new Set();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`listing accounts failed (${code(error)})`);
    const users = (data?.users ?? []).filter((user) => !seen.has(user.id));
    if (users.length === 0) break;
    for (const user of users) {
      seen.add(user.id);
      const url = user.user_metadata?.avatar_url;
      const legacy = legacyAvatar(url, prefix);
      if (legacy) {
        picture(legacy).accounts.push(user.id);
        tally.accountRefs++;
      } else if (typeof url === "string" && url.includes(LEGACY_MARK)) {
        tally.unrecognized++;
      }
    }
  }
  tally.accounts = seen.size;

  for (let from = 0; ; ) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, avatar_url")
      .like("avatar_url", `%${LEGACY_MARK}%`)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      // Before 20261003 there is no picture of record, only metadata.
      if (isColumnAbsent(error)) {
        tally.noPictureColumn = true;
        break;
      }
      throw new Error(`reading profiles failed (${code(error)})`);
    }
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      const legacy = legacyAvatar(row.avatar_url, prefix);
      if (legacy) {
        picture(legacy).profiles.push(row.id);
        tally.profileRefs++;
      } else {
        tally.unrecognized++;
      }
    }
    from += rows.length;
  }

  for (const { table } of AVATAR_COPIES) {
    tally.rowRefs[table] = 0;
    for (let from = 0; ; ) {
      const { data, error } = await admin
        .from(table)
        .select("id, author_avatar")
        .like("author_avatar", `%${LEGACY_MARK}%`)
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) {
        if (isTableAbsent(error)) {
          tally.absentTables.push(table);
          break;
        }
        throw new Error(`reading ${LABEL[table]} failed (${code(error)})`);
      }
      const rows = data ?? [];
      if (rows.length === 0) break;
      for (const row of rows) {
        const legacy = legacyAvatar(row.author_avatar, prefix);
        if (legacy) {
          picture(legacy);
          tally.rowRefs[table]++;
        } else {
          tally.unrecognized++;
        }
      }
      from += rows.length;
    }
  }

  return { pictures, tally };
}

/**
 * Point one account's picture at the copy, if it still names the old file.
 * Read again first: the reader may have changed their picture since the scan.
 */
async function moveAccount(admin, id, oldUrl, newUrl) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data?.user) return "failed";
  const user = data.user;
  if (user.user_metadata?.avatar_url !== oldUrl) return "skipped";
  const { error: saveError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { ...user.user_metadata, avatar_url: newUrl },
  });
  return saveError ? "failed" : "moved";
}

/**
 * The reader whose picture of record just moved. Their metadata follows when
 * it named ANY old picture of theirs, and is left alone otherwise: a Google
 * sign-in may have put their Google photo there.
 */
async function moveOwner(admin, id, newUrl, prefix) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data?.user) return "failed";
  const user = data.user;
  if (legacyAvatar(user.user_metadata?.avatar_url, prefix)?.owner !== id) return "skipped";
  const { error: saveError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { ...user.user_metadata, avatar_url: newUrl },
  });
  return saveError ? "failed" : "moved";
}

/** One "label ... count" line. */
function line(label, value) {
  return `  ${label}`.padEnd(48) + value;
}

function printScan(log, title, { pictures, tally }) {
  log(title);
  log(line("accounts scanned", tally.accounts));
  if (tally.noPictureColumn) log(line("profiles", "no picture column yet, skipped"));
  else log(line("profiles whose picture is on a u/<id> path", tally.profileRefs));
  log(line("accounts whose metadata names a u/<id> path", tally.accountRefs));
  for (const { table } of AVATAR_COPIES) {
    if (tally.absentTables.includes(table)) log(line(LABEL[table], "table not there, skipped"));
    else log(line(`${LABEL[table]} naming a u/<id> picture`, tally.rowRefs[table]));
  }
  log(line("old pictures to move", pictures.size));
  const ofRecord = [...pictures.values()].filter((p) => p.profiles.length > 0).length;
  log(line("  of which a profile names", ofRecord));
  if (tally.unrecognized > 0) {
    log(line("u/ URLs on another host, left alone", tally.unrecognized));
    log("    (if that is most of them, check NEXT_PUBLIC_SUPABASE_URL)");
  }
}

/** Thrown when profiles.avatar_url refuses the new path: nothing further is attempted. */
class NotMigrated extends Error {}

/**
 * Move each of `todo`, an array of [old path, picture]. Adds to `done`.
 * `ofRecord` is pass 1: the picture's owner has their metadata and their own
 * rows realigned to it, from any old picture of theirs.
 */
async function movePictures(admin, bucket, prefix, scan, todo, done, ofRecord) {
  for (const [oldPath, pic] of todo) {
    const ext = oldPath.slice(oldPath.lastIndexOf(".") + 1);
    const newPath = `a/${crypto.randomUUID()}.${ext}`;
    const oldUrl = bucket.getPublicUrl(oldPath).data.publicUrl;
    const newUrl = bucket.getPublicUrl(newPath).data.publicUrl;

    const { error: copyError } = await bucket.copy(oldPath, newPath);
    if (copyError) {
      // Already gone: whatever names it shows no picture today, and is left.
      if (/not.?found/i.test(copyError.message ?? "")) done.missing++;
      else done.copyFailed++;
      continue;
    }
    done.copied++;
    const dropCopy = async () => {
      await bucket.remove([newPath]);
      await admin.from(UPLOAD_OWNERS_TABLE).delete().eq("bucket", AVATAR_BUCKET).eq("path", newPath);
      done.copied--;
    };

    // Whose the copy is: the id the old path carried, which is the only proof
    // there ever was.
    const { error: ownerError } = await admin
      .from(UPLOAD_OWNERS_TABLE)
      .insert({ bucket: AVATAR_BUCKET, path: newPath, owner_id: pic.owner });
    if (!ownerError) {
      done.recorded++;
    } else if (ownerError.code === "23503") {
      // The foreign key to auth.users: that account has been deleted. A row
      // somebody else wrote still names the file, so it still moves.
      done.ownerGone++;
    } else {
      // Unrecorded, the copy would be a file nobody can be shown to own.
      done.recordFailed++;
      await bucket.remove([newPath]);
      done.copied--;
      continue;
    }

    let moved = true;

    // The picture of record first: posts and replies follow it by trigger.
    if (!scan.tally.noPictureColumn) {
      const { data, error } = await admin
        .from("profiles")
        .update({ avatar_url: newUrl })
        .eq("avatar_url", oldUrl)
        .select("id");
      if (error?.code === "23514") {
        await dropCopy();
        if (!ownerError) done.recorded--;
        throw new NotMigrated(`profiles.avatar_url refuses the new path. Apply ${MIGRATION} first, then run this again.`);
      }
      if (error) {
        done.profileFailed++;
        moved = false;
      } else {
        done.profiles += (data ?? []).length;
      }
    }

    const owner = ofRecord && pic.profiles.includes(pic.owner) ? pic.owner : null;
    if (owner) {
      const result = await moveOwner(admin, owner, newUrl, prefix);
      if (result === "moved") done.accounts++;
      if (result === "failed") {
        done.accountFailed++;
        moved = false;
      }
    }
    for (const id of pic.accounts) {
      if (id === owner) continue;
      const result = await moveAccount(admin, id, oldUrl, newUrl);
      if (result === "moved") done.accounts++;
      if (result === "failed") {
        done.accountFailed++;
        moved = false;
      }
    }

    for (const { table, owner: ownerColumn } of AVATAR_COPIES) {
      if (scan.tally.absentTables.includes(table)) continue;
      const updates = [admin.from(table).update({ author_avatar: newUrl }).eq("author_avatar", oldUrl).select("id")];
      // Their own rows follow the picture of record from ANY old picture of
      // theirs, as their posts and replies already do by trigger.
      if (owner) {
        updates.push(
          admin
            .from(table)
            .update({ author_avatar: newUrl })
            .eq(ownerColumn, owner)
            .like("author_avatar", `${prefix}u/${owner}/%`)
            .select("id"),
        );
      }
      for (const update of updates) {
        const { data, error } = await update;
        if (error) {
          done.rowFailed++;
          moved = false;
        } else {
          done.rows += (data ?? []).length;
        }
      }
    }

    // A reference that did not move still shows the old file, so it stays.
    if (!moved) {
      done.kept++;
      continue;
    }
    const { error: removeError } = await bucket.remove([oldPath]);
    if (removeError) done.removeFailed++;
    else done.removed++;
  }
}

/**
 * The whole job. `admin` is a service-role client. Returns ok: false when a
 * write failed or something is left that should have moved, so the caller
 * can exit non-zero.
 */
export async function migrateAvatarPaths(
  admin,
  { apply = false, limit = Infinity, log = console.log } = {},
) {
  const bucket = admin.storage.from(AVATAR_BUCKET);
  const prefix = bucket.getPublicUrl("").data.publicUrl;
  log(`Project ${redact(new URL(prefix).origin)}`);

  // Nothing moves without the record of whose each file is.
  const { error: ownersError } = await admin.from(UPLOAD_OWNERS_TABLE).select("path").limit(1);
  if (ownersError && !isTableAbsent(ownersError)) {
    throw new Error(`reading upload_owners failed (${code(ownersError)})`);
  }
  const ownersThere = !ownersError;

  const before = await findLegacyAvatars(admin, prefix);
  printScan(log, apply ? "Before:" : "Dry run, nothing written:", before);
  if (!ownersThere) {
    log("The upload_owners table is not there. Nothing was written. Apply");
    log("supabase/migrations/20261007000000_upload_owners.sql first.");
    return { ok: !apply, moved: 0, remaining: before.pictures.size };
  }
  if (!apply) {
    if (before.pictures.size > 0) log("Run again with --apply to move them.");
    return { ok: true, moved: 0, remaining: before.pictures.size };
  }

  const done = {
    copied: 0,
    missing: 0,
    copyFailed: 0,
    recorded: 0,
    ownerGone: 0,
    recordFailed: 0,
    profiles: 0,
    profileFailed: 0,
    accounts: 0,
    accountFailed: 0,
    rows: 0,
    rowFailed: 0,
    removed: 0,
    kept: 0,
    removeFailed: 0,
  };

  let attempted = 0;
  let stopped = null;
  try {
    // Pass 1: the pictures of record.
    const first = [...before.pictures].filter(([, pic]) => pic.profiles.length > 0).slice(0, limit);
    attempted += first.length;
    await movePictures(admin, bucket, prefix, before, first, done, true);

    // Pass 2: whatever is still named, by a fresh scan. Pass 1 has realigned
    // each owner's metadata, posts, replies and reviews, so their older
    // pictures are no longer among them.
    if (attempted < limit) {
      const between = await findLegacyAvatars(admin, prefix);
      // Not one pass 1 already tried: if a reference to it did not move, a
      // second copy would not move it either. The next run takes it.
      const tried = new Set(first.map(([oldPath]) => oldPath));
      const second = [...between.pictures]
        .filter(([oldPath, pic]) => pic.profiles.length === 0 && !tried.has(oldPath))
        .slice(0, limit - attempted);
      attempted += second.length;
      await movePictures(admin, bucket, prefix, between, second, done, false);
    }
  } catch (err) {
    if (!(err instanceof NotMigrated)) throw err;
    stopped = err.message;
  }

  log("Moved:");
  log(line("pictures copied to a random path", done.copied));
  log(line("owners written down", done.recorded));
  if (done.ownerGone > 0) log(line("  moved with no owner, the account is gone", done.ownerGone));
  log(line("profiles repointed", done.profiles));
  log(line("accounts repointed", done.accounts));
  log(line("rows repointed", done.rows));
  log(line("old files deleted", done.removed));
  const trouble = [
    [done.missing, "old pictures already gone (references left)"],
    [done.copyFailed, "copies that failed"],
    [done.recordFailed, "owners not written down, picture not moved"],
    [done.profileFailed, "profiles that could not be repointed"],
    [done.accountFailed, "accounts that could not be repointed"],
    [done.rowFailed, "row updates that failed"],
    [done.kept, "old files kept, a reference did not move"],
    [done.removeFailed, "old files that could not be deleted"],
  ].filter(([n]) => n > 0);
  for (const [n, what] of trouble) log(line(what, n));
  if (stopped) log(`Stopped: ${stopped}`);

  const after = await findLegacyAvatars(admin, prefix);
  printScan(log, "After, a fresh scan:", after);
  const limited = Number.isFinite(limit) && attempted >= limit && after.pictures.size > 0;
  if (after.pictures.size === 0) log("Nothing names a u/<id> picture any more.");
  else if (limited && !stopped) log(`Limited to ${limit}; run again for the rest.`);

  return {
    ok: !stopped && trouble.length === 0 && (limited || after.pictures.size === 0),
    moved: done.removed,
    remaining: after.pictures.size,
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
  const result = await migrateAvatarPaths(admin, { apply, limit });
  if (!result.ok) process.exitCode = 1;
}

// Run only when started as a script, so the test can import the functions.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`Stopped: ${redact(err?.message ?? err)}`);
    process.exit(1);
  });
}
