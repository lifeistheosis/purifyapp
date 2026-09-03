import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketReplyEmail } from "@/lib/support/ticketEmails";
import {
  addStaffReply,
  listTickets,
  setMessageReaction,
  setTicketStatus,
} from "@/lib/support/tickets";

/** Admin support console: list every ticket, reply (emails the customer), or
 *  change status. Gated on the ADMIN_EMAILS allowlist; 404 to everyone else. */
export async function GET(req: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // ?summary=1: one HEAD count, for the attention strip, which polls this
  // every ten minutes and needs one number. The full list below carries up
  // to 200 tickets with every message body, which is the right answer for
  // the console and the wrong thing to ship six times an hour for a count.
  // A failed count is a 500, never { open: 0 }: an unread queue is not an
  // empty one.
  if (new URL(req.url).searchParams.get("summary") === "1") {
    const { count, error } = await createAdminClient()
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    if (error) {
      return NextResponse.json({ error: "Could not count open tickets." }, { status: 500 });
    }
    return NextResponse.json({ open: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ tickets: await listTickets() });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reply"),
    ticketId: z.string().uuid(),
    body: z.string().min(1).max(5000),
  }),
  z.object({
    action: z.literal("status"),
    ticketId: z.string().uuid(),
    status: z.enum(["open", "pending", "resolved", "closed"]),
  }),
  z.object({
    action: z.literal("react"),
    messageId: z.string().uuid(),
    // A short emoji, or empty string to clear.
    reaction: z.string().max(8),
  }),
]);

export async function POST(req: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (parsed.data.action === "reply") {
    const ticket = await addStaffReply(parsed.data.ticketId, parsed.data.body);
    if (!ticket) {
      return NextResponse.json({ error: "Reply failed." }, { status: 500 });
    }
    await sendTicketReplyEmail(ticket, parsed.data.body).catch((e) =>
      console.warn("[support] reply email failed", (e as Error).message),
    );
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "react") {
    const ok = await setMessageReaction(
      parsed.data.messageId,
      parsed.data.reaction || null,
    );
    return NextResponse.json({ ok });
  }

  const ok = await setTicketStatus(parsed.data.ticketId, parsed.data.status);
  return NextResponse.json({ ok });
}
