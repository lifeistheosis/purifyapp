import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";
import { addCustomerReply } from "@/lib/support/tickets";

/**
 * A reader answers their own support ticket from the shop's Messages (1.8,
 * the owner's pick A of r3-19: his replies from the console come into the
 * reader's inbox, where until now they arrived by email only). The answer
 * joins the ticket and reopens it, exactly as an emailed reply does
 * (lib/support/tickets.ts, addCustomerReply).
 *
 * The guards, in the order they run:
 *   - signed in, by cookie on the website or bearer token in the apps;
 *   - the body is zod-checked: one ticket id and up to 5,000 characters;
 *   - a budget per reader, so a stuck send button cannot flood the console;
 *   - the ticket must be the caller's own. It is read with the service role
 *     and its owner compared to the signed-in reader; anyone else's ticket
 *     answers 404, the same as one that does not exist, so a ticket's
 *     existence is never confirmed to a stranger.
 * Only then is anything written, with the service role, as every privileged
 * write in the shop is. No email goes out from here: the console shows the
 * reopened ticket, as it does for an emailed reply.
 */
const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

async function handlePOST(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (await rateLimited(`support-reply:${user.id}`, 3600, 30)) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, user_id")
    .eq("id", parsed.data.ticketId)
    .maybeSingle();
  if (!ticket || (ticket as { user_id: string | null }).user_id !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const saved = await addCustomerReply((ticket as { id: string }).id, parsed.data.body, "app");
  if (!saved) {
    return NextResponse.json({ error: "Couldn't send the message. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
