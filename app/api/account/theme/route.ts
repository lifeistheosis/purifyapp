import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { DEV_PLUS_COOKIE, DEV_PLUS_ENTITLEMENTS, isDeveloperEmail } from "@/lib/dev/developer";
import { plusEnforcedFor, type EntitlementRow } from "@/lib/entitlements/entitlements";
import { NATIVE_UA_TOKEN } from "@/lib/platform/token";
import { decideThemeWrite } from "@/lib/reader/themeWrite";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record the palette a signed-in reader applied, after the entitlement check.
 *
 * The rule is lib/reader/themeWrite.ts, where it is tested; this file is the
 * HTTP around it. The client applies a collection palette only after this
 * answers 200 (components/catechism/ThemeRow.tsx), so the entitlement is
 * enforced on the server at the write and the client gate is the fast path
 * only. The row is written with the service role: user_theme is self-select,
 * and a client cannot grant itself a palette by writing the table directly.
 *
 * Surface. The server sees one "PurifyNative" UA token for both store
 * builds (lib/platform/native.ts), so a native request is judged as
 * "native-unknown", which enforces only when both stores are launched; the
 * web is judged under PLUS_ENFORCED_WEB. That is the same call
 * lib/entitlements/server.ts makes.
 *
 * SHIPS DARK. When user_theme is not there yet the decision still stands
 * and the answer is 200 with stored:false: the entitlement was checked, the
 * record could not be kept, and the palette is cosmetic.
 */
const bodySchema = z.object({ theme_id: z.string().max(40) });

function devOverrideRequested(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").some((c) => c.trim() === `${DEV_PLUS_COOKIE}=1`);
}

async function handlePUT(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false, error: "json only" }, { status: 415 });
  }
  if (await rateLimited(`account-theme:${ipKey(req.headers)}`, 60, 30)) {
    return new NextResponse(null, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "sign in" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const native = (req.headers.get("user-agent") ?? "").includes(NATIVE_UA_TOKEN);
  const enforced = plusEnforcedFor(native ? "native-unknown" : "web");

  // The developer test-premium override, verified against the allowlist
  // exactly as lib/entitlements/server.ts does; a forged cookie grants
  // a normal account nothing.
  const override =
    devOverrideRequested(req) && isDeveloperEmail(user.email) ? DEV_PLUS_ENTITLEMENTS : undefined;

  let row: EntitlementRow | null = null;
  if (enforced && !override) {
    const { data, error } = await supa
      .from("entitlements")
      .select("is_supporter, plus_until, plus_source, pro_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) console.error("[theme] entitlement read failed", error.message);
    row = (data as EntitlementRow | null) ?? null;
  }

  const decision = decideThemeWrite(parsed.data.theme_id, row, { enforced, override });
  if (!decision.ok) {
    return NextResponse.json(decision, { status: decision.status, headers: { "Cache-Control": "no-store" } });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_theme")
    .upsert(
      { user_id: user.id, theme_id: decision.theme, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  let stored = true;
  if (error) {
    stored = false;
    if (!isTableAbsent(error)) console.error("[theme] user_theme upsert failed", error.message);
  }

  return NextResponse.json(
    { ok: true, theme: decision.theme, stored },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export const PUT = corsRoute(handlePUT);
export const OPTIONS = corsPreflight;
