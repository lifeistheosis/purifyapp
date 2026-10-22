import { NextResponse } from "next/server";

import { DEFAULT_REPLY_TO } from "@/lib/email/send";
import { bareAddress, recordDeliveryEvent, type DeliveryEvent } from "@/lib/email/suppression";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdminNewTicket } from "@/lib/support/ticketEmails";
import { addCustomerReplyByNumber, createTicket } from "@/lib/support/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What Resend tells Purify about its email (1.8).
 *
 * Bounces, complaints and Resend's own suppressions go to the "do not send"
 * list (lib/email/suppression.ts), which every send checks first. Mail that
 * arrives at the support inbox (support@purifyapp.net, the Reply-To on every
 * email) becomes a support ticket in the admin's Messages, or joins its ticket
 * when the subject names one, so a reader's answer never sits in a dashboard
 * nobody opens.
 *
 * Signed: Resend signs each delivery (Standard Webhooks); anything without a
 * valid signature under RESEND_WEBHOOK_SECRET is refused. Each delivery id is
 * written before it is acted on, so Resend's retries cannot count a bounce
 * twice. A 500 asks Resend to try again later.
 *
 * Set up in Resend under Webhooks: this URL, the events email.bounced,
 * email.complained, email.suppressed and email.received, and its signing
 * secret in RESEND_WEBHOOK_SECRET on Render.
 */

type Event = {
  type: string;
  data: {
    email_id: string;
    to?: string[];
    from?: string;
    subject?: string;
    received_for?: string[];
    bounce?: { type?: string; subType?: string; message?: string };
    suppressed?: { type?: string; message?: string };
  };
};

const SUPPORT = DEFAULT_REPLY_TO;

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const key = process.env.RESEND_API_KEY;
  if (!secret || !key) return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });

  const payload = await req.text();
  const id = req.headers.get("svix-id") ?? req.headers.get("webhook-id") ?? "";
  let event: Event;
  try {
    const { Resend } = await import("resend");
    event = new Resend(key).webhooks.verify({
      payload,
      headers: {
        id,
        timestamp: req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? req.headers.get("webhook-signature") ?? "",
      },
      webhookSecret: secret,
    }) as unknown as Event;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 401 });
  }

  const admin = createAdminClient();
  // Once per delivery: a retry of one already handled is answered and dropped.
  const { error: seenError } = await admin.from("email_webhook_events").insert({ id, type: event.type });
  if (seenError) {
    if (seenError.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ ok: false, error: "Log unavailable." }, { status: 500 });
  }

  try {
    await handle(admin, event, key);
  } catch (e) {
    // Let Resend try again: forget this delivery so the retry is not dropped.
    await admin.from("email_webhook_events").delete().eq("id", id);
    console.warn(`[email] webhook ${event.type} failed: ${(e as Error).message}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

async function handle(admin: ReturnType<typeof createAdminClient>, event: Event, key: string) {
  const to = event.data.to ?? [];
  const delivery = (ev: (email: string) => DeliveryEvent) => Promise.all(to.map((e) => recordDeliveryEvent(admin, ev(e))));

  switch (event.type) {
    case "email.bounced": {
      const b = event.data.bounce ?? {};
      await delivery((email) => ({
        kind: "bounce",
        email,
        permanent: (b.type ?? "").toLowerCase() === "permanent",
        detail: [b.type, b.subType, b.message].filter(Boolean).join(": "),
      }));
      return;
    }
    case "email.complained":
      await delivery((email) => ({ kind: "complaint", email, detail: event.data.subject ?? "" }));
      return;
    case "email.suppressed": {
      const s = event.data.suppressed ?? {};
      await delivery((email) => ({ kind: "suppressed", email, detail: [s.type, s.message].filter(Boolean).join(": ") }));
      return;
    }
    case "email.received":
      await received(event, key);
      return;
    default:
      return;
  }
}

/** Mail to the support inbox, into Messages. */
async function received(event: Event, key: string) {
  const forSupport = (event.data.received_for ?? event.data.to ?? []).some((a) => bareAddress(a) === SUPPORT);
  if (!forSupport) return;
  const from = event.data.from ? bareAddress(event.data.from) : "";
  // Never a loop with ourselves, and no flood from one sender.
  if (!from || from.endsWith("@purifyapp.net")) return;
  if (await rateLimited(`support-inbound:${from}`, 86_400, 20)) return;

  const { Resend } = await import("resend");
  const { data, error } = await new Resend(key).emails.receiving.get(event.data.email_id);
  if (error || !data) throw new Error(error?.message ?? "received email not found");
  const headers = Object.fromEntries(Object.entries(data.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  // An out-of-office answering our own mail is not a ticket.
  if ((headers["auto-submitted"] ?? "no").toLowerCase() !== "no") return;

  const body = (data.text ?? stripHtml(data.html ?? "")).trim().slice(0, 20_000) || "(no text)";
  const subject = (data.subject || "(no subject)").slice(0, 200);
  const name = /^\s*"?([^"<]+?)"?\s*</.exec(data.from ?? "")?.[1]?.trim() || null;

  const num = /\bTKT-[0-9A-F]{8}\b/i.exec(subject)?.[0];
  if (num && (await addCustomerReplyByNumber(num.toUpperCase(), body))) return;

  const ticket = await createTicket({ email: from, name, subject, body });
  if (!ticket) throw new Error("ticket insert failed");
  await notifyAdminNewTicket(ticket, body);
}

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n");
}
