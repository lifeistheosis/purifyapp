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
 * user when there is one. The record is written with the service role inside
 * lib/support/tickets.
 *
 * ── Why this route does not send a receipt to the address in the form ──────
 *
 * It used to. That made it an open mail relay: the route is unauthenticated,
 * it accepted an arbitrary `email`, `subject` and `body`, and it then sent
 * that attacker-supplied subject and body, as HTML, FROM Purify's verified
 * sending domain, TO an address the attacker chose. Its only guard was a
 * per-IP budget, and the IP key is taken from the leftmost X-Forwarded-For
 * entry (lib/security/ratelimit.ts), which the client controls. One rotating
 * header was unmetered outbound mail from purifyapp.net, which burns the
 * domain's sending reputation for every real member.
 *
 * The receipt is now sent ONLY when the request is authenticated and the
 * address in the form is the signed-in user's own account address. That is
 * the only case where the recipient is not attacker-chosen. Everyone else
 * gets their ticket number in the HTTP response and sees it on screen; the
 * ticket is still created and the operators are still notified, so no real
 * support request is lost.
 *
 * The operator notification goes to adminEmails() only, a fixed internal
 * destination that no request body can influence.
 */
const schema = z.object({
  email: z.string().email().max(200),
  name: z.string().max(120).optional(),
  // No CR/LF in either field. Both reach an email Subject header downstream,
  // where a newline is header injection, and neither is a multi-line value in
  // any legitimate submission.
  subject: z
    .string()
    .min(2)
    .max(200)
    .refine((s) => !/[\r\n]/.test(s), "Subject must be a single line."),
  body: z.string().min(2).max(5000),
  orderId: z.string().uuid().optional(),
});

/** Lowercased and trimmed, so budgets cannot be evaded by casing alone. */
function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** A fresh response each time: a Response body is a stream and can only be
 *  read once, so a module-level instance would break on the second caller. */
const tooMany = () =>
  NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 },
  );

export async function POST(req: Request) {
  // Layer 1, per IP. Kept, but deliberately not trusted on its own: the key
  // is client-influenced until the X-Forwarded-For trust boundary is
  // established and documented. The layers below do not depend on it.
  if (await rateLimited(`support-ticket:${ipKey(req.headers)}`, 3600, 10)) {
    return tooMany();
  }

  // Layer 2, a global ceiling for the whole endpoint. This is the backstop
  // that holds even against a distributed attack with forged headers: Purify
  // does not receive 200 genuine support tickets in an hour, and if it ever
  // does, a brief 429 is a far better failure than an unbounded send.
  if (await rateLimited("support-ticket:global", 3600, 200)) {
    return tooMany();
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

  const email = normaliseEmail(parsed.data.email);

  // Layer 3, per submitted address. This is the one that bounds the abuse the
  // receipt used to enable, and it is independent of any header.
  if (await rateLimited(`support-ticket-to:${email}`, 86_400, 10)) {
    return tooMany();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ticket = await createTicket({
    email,
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

  // The receipt goes out ONLY to a signed-in user's own verified account
  // address. Anywhere else it would be mail we send, from our domain, to a
  // recipient the request body chose. `user.email` is the authenticated
  // identity, not the form field, so the comparison cannot be spoofed.
  const ownAddress =
    !!user?.email && normaliseEmail(user.email) === email;

  await Promise.allSettled([
    ...(ownAddress ? [sendTicketReceivedEmail(ticket, parsed.data.body)] : []),
    // Fixed internal destination (adminEmails()); nothing in the request body
    // can redirect it.
    notifyAdminNewTicket(ticket, parsed.data.body),
  ]);

  return NextResponse.json({ ok: true, ticketNumber: ticketNumber(ticket.id) });
}
