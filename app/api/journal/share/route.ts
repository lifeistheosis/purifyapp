import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { deriveEntitlements, plusEnforcedFor, type EntitlementRow } from "@/lib/entitlements/entitlements";
import { MAX_BODY } from "@/lib/journal/entries";
import { parsePage } from "@/lib/journal/page";
import { monthStart, publicBody, SHARE_DAILY_CAP, SHARE_LIMIT_FREE, shareTitle, sharesLeft } from "@/lib/journal/share";
import { isNativeRequest } from "@/lib/platform/nativeRequest";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Share a journal page (1.9, docs/1.9-build/JOURNAL.md, step 3).
 *
 *   GET     how many shares the reader has left this month (null: no limit),
 *           and whether sharing is ready on the server at all; with
 *           ?recordId=, how many copies of that page are shared now;
 *   POST    share a page: a copy of it, made public at /p/<id>;
 *   DELETE  stop sharing: one copy (?id=) or every copy of a page
 *           (?recordId=), the reader's own only. Stopping deletes the copy,
 *           and the reports on it with it, as the privacy page says (his
 *           yes, 2026-11-09, to its version B).
 *
 * Signed in only. The copy is made from what lib/journal/share.ts lets a
 * page show in public (no notebook, no tags, no library mark), checked here
 * again, never trusted from the app. The month's count is made here, from
 * the table, for a reader without Plus where Plus is enforced; a reader with
 * Plus shares without limit. Writes are the service role's (the table has no
 * write policy), behind zod and a rate limit.
 *
 * Until the owner has run docs/1.9-build/sql/shared-pages.sql the table is
 * absent, and every answer here says so (ready: false, or 503), so the app
 * keeps Share out of sight rather than offering what fails.
 */

const postSchema = z.object({
  recordId: z.string().uuid().optional(),
  body: z.string().min(1).max(MAX_BODY),
});

const uuid = z.string().uuid();

function absent(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42P01" || error.code === "PGRST205" || /shared_pages/.test(error.message ?? ""));
}

async function whoAndLimit(req: Request) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  // Plus is asked of the server's own table, as every entitlement is.
  const enforced = plusEnforcedFor((await isNativeRequest()) ? "native-unknown" : "web");
  let limited = false;
  if (enforced) {
    const { data } = await admin.from("entitlements").select("is_supporter, plus_until, plus_source, pro_until").eq("user_id", user.id).maybeSingle();
    limited = !deriveEntitlements(data as EntitlementRow | null, { enforced: true }).plusFeatures;
  }
  return { user, admin, limited };
}

async function usedThisMonth(admin: ReturnType<typeof createAdminClient>, userId: string) {
  return admin
    .from("shared_pages")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", monthStart(new Date()).toISOString());
}

/** This account's shares in the last day, for the daily guard. */
async function usedToday(admin: ReturnType<typeof createAdminClient>, userId: string) {
  return admin
    .from("shared_pages")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
}

/** How many copies of one of the reader's pages are shared now. */
async function sharedCopies(admin: ReturnType<typeof createAdminClient>, userId: string, recordId: string) {
  return admin
    .from("shared_pages")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("record_id", recordId)
    .is("withdrawn_at", null);
}

async function handleGET(req: Request) {
  const recordId = new URL(req.url).searchParams.get("recordId");
  const who = await whoAndLimit(req);
  if (!who) return NextResponse.json({ error: "Sign in to share a page." }, { status: 401 });
  const { count, error } = await usedThisMonth(who.admin, who.user.id);
  if (absent(error)) return NextResponse.json({ ready: false });
  if (error) return NextResponse.json({ error: "Could not read your shares." }, { status: 500 });
  // The page's own copies, so the app can offer Stop sharing on it.
  let shared = 0;
  if (recordId && uuid.safeParse(recordId).success) {
    const { count: copies, error: copiesError } = await sharedCopies(who.admin, who.user.id, recordId);
    if (copiesError) return NextResponse.json({ error: "Could not read your shares." }, { status: 500 });
    shared = copies ?? 0;
  }
  return NextResponse.json({ ready: true, left: who.limited ? sharesLeft(count ?? 0) : null, shared });
}

async function handlePOST(req: Request) {
  if (await rateLimited(`journal-share:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json({ error: "Too many shares just now. Please try again shortly." }, { status: 429 });
  }
  const who = await whoAndLimit(req);
  if (!who) return NextResponse.json({ error: "Sign in to share a page." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  const body = publicBody(parsed.data.body);
  if (!body) return NextResponse.json({ error: "There is nothing on this page to share." }, { status: 400 });

  const { count, error: countError } = await usedThisMonth(who.admin, who.user.id);
  if (absent(countError)) return NextResponse.json({ error: "Sharing is not ready yet." }, { status: 503 });
  if (countError) return NextResponse.json({ error: "Could not share this page." }, { status: 500 });
  if (who.limited && sharesLeft(count ?? 0) === 0) {
    return NextResponse.json({ error: "No shares left this month.", left: 0 }, { status: 403 });
  }
  // A guard against abuse, with Plus or without, far above a reader's use (SHARE_DAILY_CAP).
  const { count: today, error: todayError } = await usedToday(who.admin, who.user.id);
  if (todayError) return NextResponse.json({ error: "Could not share this page." }, { status: 500 });
  if ((today ?? 0) >= SHARE_DAILY_CAP) {
    return NextResponse.json({ error: "That is a lot of sharing for one day. Please try again tomorrow." }, { status: 429 });
  }

  const { data, error } = await who.admin
    .from("shared_pages")
    .insert({ owner_id: who.user.id, record_id: parsed.data.recordId ?? null, title: shareTitle(parsePage(body)), body })
    .select("id")
    .single();
  if (absent(error)) return NextResponse.json({ error: "Sharing is not ready yet." }, { status: 503 });
  if (error || !data) {
    console.error("[journal] share failed", error?.message);
    return NextResponse.json({ error: "Could not share this page." }, { status: 500 });
  }
  const id = (data as { id: string }).id;
  if (who.limited) {
    // Two shares sent at once both read the same count before either was
    // made. Settled after the fact: the month's shares in the order they
    // were made, and this one withdrawn again if it came after the limit.
    const { data: month } = await who.admin
      .from("shared_pages")
      .select("id")
      .eq("owner_id", who.user.id)
      .gte("created_at", monthStart(new Date()).toISOString())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    const place = ((month ?? []) as { id: string }[]).findIndex((r) => r.id === id);
    if (place >= SHARE_LIMIT_FREE) {
      await who.admin.from("shared_pages").delete().eq("id", id).eq("owner_id", who.user.id);
      return NextResponse.json({ error: "No shares left this month.", left: 0 }, { status: 403 });
    }
  }
  return NextResponse.json({ id, url: `${SITE_URL}/p/${id}`, left: who.limited ? sharesLeft((count ?? 0) + 1) : null });
}

async function handleDELETE(req: Request) {
  if (await rateLimited(`journal-share-stop:${ipKey(req.headers)}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests just now. Please try again shortly." }, { status: 429 });
  }
  const params = new URL(req.url).searchParams;
  const id = params.get("id");
  const recordId = params.get("recordId");
  const one = id !== null && uuid.safeParse(id).success;
  const page = !one && recordId !== null && uuid.safeParse(recordId).success;
  if (!one && !page) return NextResponse.json({ error: "Invalid share." }, { status: 400 });
  const who = await whoAndLimit(req);
  if (!who) return NextResponse.json({ error: "Sign in to stop sharing." }, { status: 401 });
  // The reader's own copies only: owner_id is matched here, with the service
  // role. Stopping a share deletes the copy, and the reports on it with it
  // (shared_page_reports cascades), as the privacy page says.
  const mine = who.admin.from("shared_pages").delete().eq("owner_id", who.user.id);
  const { error } = one ? await mine.eq("id", id) : await mine.eq("record_id", recordId);
  if (absent(error)) return NextResponse.json({ error: "Sharing is not ready yet." }, { status: 503 });
  if (error) return NextResponse.json({ error: "Could not stop sharing." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
