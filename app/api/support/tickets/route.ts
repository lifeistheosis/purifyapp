import { NextResponse } from "next/server";
import { z } from "zod";

import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createClient } from "@/lib/supabase/server";
import {
  notifyAdminNewTicket,
  sendTicketReceivedEmail,
} from "@/lib/support/ticketEmails";
import { createTicket, ticketNumber } from "@/lib/support/tickets";

/**
 * Open a support ticket. Anonymous allowed; associated with the signed-in
 * user when there is one. Rate-limited, zod-validated, and the record is
 * written with the service role inside lib/support/tickets. Emails (customer
 * receipt + operator notification) are best-effort and never fail the request.
 */
const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().max(120).optional(),
  subject: z.string().min(2).max(200),
  body: z.string().min(2).max(5000),
  orderId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  if (await rateLimited(`support-ticket:${ipKey(req.headers)}`, 3600, 10)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form and try again." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ticket = await createTicket({
    email: parsed.data.email,
    name: parsed.data.name ?? null,
    subject: parsed.data.subject,
    body: parsed.data.body,
    userId: user?.id ?? null,
    orderId: parsed.data.orderId ?? null,
  });
  if (!ticket) {
    return NextResponse.json(
      { error: "Couldn't submit your request. Please try again." },
      { status: 500 },
    );
  }

  await Promise.allSettled([
    sendTicketReceivedEmail(ticket, parsed.data.body),
    notifyAdminNewTicket(ticket, parsed.data.body),
  ]);

  return NextResponse.json({ ok: true, ticketNumber: ticketNumber(ticket.id) });
}
