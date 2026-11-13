import { NextResponse } from "next/server";
import { z } from "zod";

import { signatureMatches, turnOnFirstWeek } from "@/lib/email/retention/firstWeekAsk";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The welcome email's "Send it to me": the first-week guide turned on for one
 * account, with no sign-in (lib/email/retention/firstWeekAsk.ts).
 *
 * The /email/first-week page POSTs here when the reader presses its one
 * button. There is deliberately no GET handler, as for unsubscribe: mail
 * security scanners fetch every link in a message, and a list turned on by a
 * fetch would be consent nobody gave.
 *
 * The link's signature is the authority: it binds this one account to this
 * one use, so it can turn on the first-week guide for that account and
 * nothing else. The write goes through the service role; the table lets a
 * reader read their own row and nothing more.
 */

const Body = z.object({
  u: z.string().uuid(),
  // An HMAC-SHA256 in base64url: 43 characters.
  s: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

const SAID = {
  on: "The guide is on its way.",
  past: "This guide is for an account's first days, and yours are past them. Nothing was turned on.",
  paused: "The guide is not being sent just now. Nothing was turned on.",
  unknown: "That link does not lead to an account we can find. Nothing was turned on.",
} as const;

export async function POST(req: Request) {
  if (await rateLimited(`email-first-week:${ipKey(req.headers)}`, 60, 20)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again in a minute." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !signatureMatches(parsed.data.u, parsed.data.s)) {
    return NextResponse.json({ ok: false, error: "That link is not complete. Open it again from the welcome email." }, { status: 400 });
  }
  try {
    const answer = await turnOnFirstWeek(createAdminClient(), parsed.data.u);
    return NextResponse.json({ ok: answer === "on", answer, said: SAID[answer] });
  } catch (e) {
    console.warn(`[email] first-week ask failed: ${(e as Error).message}`);
    return NextResponse.json({ ok: false, error: "That did not go through. Try again in a moment." }, { status: 503 });
  }
}
