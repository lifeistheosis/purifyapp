import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A user's email address, looked up where it actually lives.
 *
 * ── The bug this exists to end ──────────────────────────────────────────
 *
 * `public.profiles` HAS NO EMAIL COLUMN and never has. It was created with
 * (id, display_name, joined_at, updated_at) in
 * 20260518_profiles_bookmarks_annotations.sql:9, and no migration since has
 * added one. 20260731_eikon_box.sql:94 even says so in a comment.
 *
 * Six admin routes query it anyway, and every one of them discards the error:
 *
 *   app/api/admin/users/route.ts:24            the whole Users tab
 *   app/api/admin/shop/stores/route.ts:61      every store reads "unassigned"
 *   app/api/admin/shop/conversations/route.ts  buyer emails blank
 *   app/api/admin/carts/route.ts:60            shopper emails blank
 *   app/api/admin/gifts/route.ts:47            recipient emails blank
 *   lib/shop/storeProvision.ts:56              userIdByEmail always null
 *
 * Postgres answers 42703 (undefined_column), supabase-js returns `{data: null,
 * error}`, and each call site does `data ?? []`. So none of them fail: they
 * quietly report that nobody has an email address. The most expensive of those
 * is storeProvision, which is why "assign a console account to this store"
 * answers "No Purify account found for <address>" for EVERY address, and why
 * a store cannot be linked to the person who runs it. That is the exact
 * feature this marketplace work is about.
 *
 * Measured against production 2026-08-24 with the service role:
 * `profiles?select=id,email` -> 42703, and `profiles?select=*` enumerates
 * id, display_name, joined_at, updated_at, has_password, preferred_language,
 * focus, depth.
 *
 * ── Where it does live ──────────────────────────────────────────────────
 *
 * auth.users, reachable with the service role through GoTrue's admin API.
 * Both endpoints were probed against production before this file was written:
 * `GET /auth/v1/admin/users/{id}` returns the user, and
 * `GET /auth/v1/admin/users?filter=<email>` matches on email.
 *
 * NOT PostgREST: the `auth` schema is not exposed to it, so no amount of
 * select-list fixing at the call sites would have worked. This is a different
 * transport, not a different column.
 */

/** Emails for a set of user ids. Ids with no account are simply absent. */
export async function emailsByUserId(
  userIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const admin = createAdminClient();
  // One request per id, in small batches. Deliberate: these call sites resolve
  // a handful of sellers, shoppers or recipients, and walking the whole user
  // table (1,344 rows, 7 pages) to answer one of them would be slower and
  // would go stale the moment it was cached. The Users tab does NOT use this
  // helper for exactly that reason; it already walks every page for provider
  // labels and harvests the address from the same pass.
  const BATCH = 8;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (id) => {
        try {
          const { data, error } = await admin.auth.admin.getUserById(id);
          if (error || !data?.user?.email) return null;
          return [id, data.user.email] as const;
        } catch {
          // A deleted account, or GoTrue being unreachable. Absent, not empty
          // string: the caller renders "unassigned" rather than a blank that
          // looks like an address nobody filled in.
          return null;
        }
      }),
    );
    for (const r of results) if (r) out.set(r[0], r[1]);
  }
  return out;
}

/** Convenience for a single id. */
export async function emailByUserId(userId: string): Promise<string | null> {
  const map = await emailsByUserId([userId]);
  return map.get(userId) ?? null;
}

/**
 * The account id behind an email address, or null.
 *
 * GoTrue's `filter` is a substring match, so the exact comparison below is
 * load-bearing rather than belt-and-braces: filtering for "a@b.com" also
 * returns "xa@b.com", and attaching a store to the wrong account is the
 * failure this whole lookup exists to get right.
 */
export async function userIdByEmail(email: string): Promise<string | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return null;

  try {
    // Raw REST rather than supabase-js: `listUsers` accepts only page and
    // perPage in 2.105.4, with no filter, so the typed client would mean
    // walking every page to find one address.
    const url = `${base}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(wanted)}`;
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      console.warn("[admin] user lookup by email failed", res.status);
      return null;
    }
    const body = (await res.json()) as { users?: { id?: string; email?: string }[] };
    const exact = (body.users ?? []).find(
      (u) => (u.email ?? "").trim().toLowerCase() === wanted,
    );
    return exact?.id ?? null;
  } catch (e) {
    console.warn("[admin] user lookup by email threw", (e as Error).message);
    return null;
  }
}
