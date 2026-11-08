import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { deriveEntitlements, plusEnforcedFor, type EntitlementRow } from "@/lib/entitlements/entitlements";
import { MAX_BODY } from "@/lib/journal/entries";
import { parsePage } from "@/lib/journal/page";
import { monthStart, publicBody, shareTitle, sharesLeft } from "@/lib/journal/share";
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
 *           and whether sharing is ready on the server at all;
 *   POST    share a page: a copy of it, made public at /p/<id>;
 *   DELETE  stop sharing one (?id=), the reader's own only.
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

async function handleGET(req: Request) {
  const who = await whoAndLimit(req);
  if (!who) return NextResponse.json({ error: "Sign in to share a page." }, { status: 401 });
  const { count, error } = await usedThisMonth(who.admin, who.user.id);
  if (absent(error)) return NextResponse.json({ ready: false });
  if (error) return NextResponse.json({ error: "Could not read your shares." }, { status: 500 });
  return NextResponse.json({ ready: true, left: who.limited ? sharesLeft(count ?? 0) : null });
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
  return NextResponse.json({ id, url: `${SITE_URL}/p/${id}`, left: who.limited ? sharesLeft((count ?? 0) + 1) : null });
}

async function handleDELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid share." }, { status: 400 });
  const who = await whoAndLimit(req);
  if (!who) return NextResponse.json({ error: "Sign in to stop sharing." }, { status: 401 });
  // The reader's own share only: owner_id is matched here, with the service role.
  const { error } = await who.admin.from("shared_pages").update({ withdrawn_at: new Date().toISOString() }).eq("id", id).eq("owner_id", who.user.id);
  if (absent(error)) return NextResponse.json({ error: "Sharing is not ready yet." }, { status: 503 });
  if (error) return NextResponse.json({ error: "Could not stop sharing." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
