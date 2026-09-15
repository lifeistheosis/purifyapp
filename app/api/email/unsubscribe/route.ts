import { NextResponse } from "next/server";

import { isMarketingList } from "@/lib/email/consent";
import { unsubscribeByToken } from "@/lib/email/preferences";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unsubscribe, with no sign-in.
 *
 * Two callers, one rule. A mail client's one-click button (RFC 8058) POSTs here
 * with the token and list in the URL and "List-Unsubscribe=One-Click" in a form
 * body. The /email/unsubscribe page POSTs JSON after the reader presses the
 * button. Either way it is a POST: there is deliberately no GET handler, because
 * mail security scanners fetch every link in a message, and an unsubscribe
 * that happened on a GET would unsubscribe readers who never clicked anything.
 *
 * The token can only ever stop email, so it is safe to act on without a
 * session. The answer is the same whether or not the token matched, so this
 * cannot be used to test which tokens exist.
 */
export async function POST(req: Request) {
  if (await rateLimited(`email-unsub:${ipKey(req.headers)}`, 60, 30)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(req.url);
  let token = url.searchParams.get("t");
  let list = url.searchParams.get("l");

  if (!token && (req.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await req.json().catch(() => null)) as { token?: unknown; list?: unknown } | null;
    token = typeof body?.token === "string" ? body.token : null;
    list = typeof body?.list === "string" ? body.list : list;
  }

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ ok: false, error: "That unsubscribe link is not complete." }, { status: 400 });
  }

  try {
    await unsubscribeByToken(createAdminClient(), token, isMarketingList(list) ? list : "all");
  } catch (e) {
    console.warn(`[email] unsubscribe failed: ${(e as Error).message}`);
    return NextResponse.json({ ok: false, error: "That did not go through. Try again in a moment." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
