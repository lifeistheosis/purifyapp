import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { DEV_PLUS_COOKIE, DEV_PLUS_ENTITLEMENTS, isDeveloperEmail } from "@/lib/dev/developer";
import { plusEnforcedFor, type EntitlementRow } from "@/lib/entitlements/entitlements";
import { decidePhoneVoice } from "@/lib/listen/phoneVoices";
import { NATIVE_UA_TOKEN } from "@/lib/platform/token";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A Plus voice's file for the on-phone voice, after the entitlement check.
 *
 * The rule is lib/listen/phoneVoices.ts, where it is tested; this file is the
 * HTTP around it, shaped as app/api/account/theme/route.ts is. The phone
 * sends the voice's name and nothing else: whether the reader has Plus is
 * read here, from their own entitlements row under RLS, never from the
 * request.
 *
 * Where the files are. data/listen/phone-voices/<voice>.bin, on the server
 * and outside public/, so no address serves one without this check. Each is
 * about half a megabyte. No storage key is needed and none is held.
 *
 * A voice that is offered but whose file is not on the server yet answers
 * 404 not_ready: the picker shows no voice it cannot fetch.
 *
 * Two honest limits, the same as every Plus surface: a voice already on a
 * phone keeps speaking after Plus lapses until the app next checks, and a
 * surface where Plus is not enforced (lib/entitlements/entitlements.ts)
 * answers every signed-in reader.
 */

const FILES = path.join(process.cwd(), "data", "listen", "phone-voices");

function devOverrideRequested(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").some((c) => c.trim() === `${DEV_PLUS_COOKIE}=1`);
}

const refuse = (status: number, error: string) =>
  NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

async function handleGET(req: Request) {
  if (await rateLimited(`phone-voice:${ipKey(req.headers)}`, 60, 20)) {
    return new NextResponse(null, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return refuse(401, "sign_in");

  const native = (req.headers.get("user-agent") ?? "").includes(NATIVE_UA_TOKEN);
  const enforced = plusEnforcedFor(native ? "native-unknown" : "web");
  const override = devOverrideRequested(req) && isDeveloperEmail(user.email) ? DEV_PLUS_ENTITLEMENTS : undefined;

  let row: EntitlementRow | null = null;
  if (enforced && !override) {
    const { data, error } = await supa
      .from("entitlements")
      .select("is_supporter, plus_until, plus_source, pro_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) console.error("[phone-voice] entitlement read failed", error.message);
    row = (data as EntitlementRow | null) ?? null;
  }

  const decision = decidePhoneVoice(new URL(req.url).searchParams.get("voice"), row, { enforced, override });
  if (!decision.ok) return refuse(decision.status, decision.error);

  // The name is one of the list's own (decidePhoneVoice), never a path from the request.
  const file = await readFile(path.join(FILES, `${decision.voice}.bin`)).catch(() => null);
  if (!file) return refuse(404, "not_ready");

  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.byteLength),
      // The reader's own, and only while they have Plus: never kept by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
