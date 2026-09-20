import "server-only";

import { bigValue, button, microLabel, note, p, pHtml, well } from "@/lib/email/blocks";
import { emailLayout } from "@/lib/email/layout";
import { sendLoggedEmail } from "@/lib/email/ledger";
import { escapeHtml } from "@/lib/email/send";
import { T } from "@/lib/email/theme";
import { adminEmails } from "@/lib/admin/access";
import { SITE_URL } from "@/lib/site";
import { ticketNumber, type Ticket } from "./ticketNumber";

/**
 * The three support emails.
 *
 * The two that go to a customer used to fall through to the layout's default
 * footer, which talks about EIKON inspecting and shipping icons. That is the
 * shop's footer, and it was on every support reply, including the ones about
 * the app. They carry the support footer now.
 */
const SUPPORT_FOOTER =
  "You are getting this because you wrote to Purify support. Reply to this email and it reaches a person.";

/** Sent to the customer when they open a ticket. */
export async function sendTicketReceivedEmail(ticket: Ticket, body: string) {
  const num = ticketNumber(ticket.id);
  const html = emailLayout({
    heading: "We got your message",
    eyebrow: "Support",
    bodyHtml:
      p("Thanks for reaching out. Your support request is logged and we’ll reply by email as soon as we can.") +
      microLabel("Ticket number") +
      bigValue(escapeHtml(num)) +
      pHtml(`Subject: <strong style="color:${T.heading}">${escapeHtml(ticket.subject)}</strong>`) +
      well(body) +
      note("Just reply to this email to add to the conversation."),
    footer: SUPPORT_FOOTER,
  });
  return sendLoggedEmail("ticket_received", {
    to: ticket.email,
    subject: `We got your message, ${num}`,
    html,
  });
}

/** Sent to the customer when staff replies. */
export async function sendTicketReplyEmail(ticket: Ticket, reply: string) {
  const num = ticketNumber(ticket.id);
  const html = emailLayout({
    heading: "A reply to your request",
    eyebrow: "Support",
    bodyHtml:
      pHtml(`Ticket ${escapeHtml(num)} &middot; ${escapeHtml(ticket.subject)}`, `color:${T.muted};font-size:15px;`) +
      well(reply) +
      note("Reply to this email to continue the conversation."),
    footer: SUPPORT_FOOTER,
  });
  return sendLoggedEmail("ticket_reply", {
    to: ticket.email,
    subject: `Re: your request ${num}`,
    html,
  });
}

/** Sent to the operator(s) when a new ticket arrives. */
export async function notifyAdminNewTicket(ticket: Ticket, body: string) {
  const to = adminEmails();
  if (to.length === 0) return { ok: false, skipped: true };
  const num = ticketNumber(ticket.id);
  const html = emailLayout({
    heading: "New support ticket",
    eyebrow: "Support &middot; operator",
    bodyHtml:
      pHtml(
        `${escapeHtml(num)} &middot; from ${escapeHtml(ticket.name || ticket.email)} (${escapeHtml(ticket.email)})`,
        `color:${T.muted};font-size:15px;`,
      ) +
      pHtml(`<strong style="color:${T.heading}">${escapeHtml(ticket.subject)}</strong>`) +
      well(body) +
      button({ label: "Open in the support console", href: `${SITE_URL}/admin/support` }),
    footer: "Operator notification &middot; Purify Shop support.",
  });
  return sendLoggedEmail("ticket_admin_notice", { to, subject: `New ticket ${num}: ${ticket.subject}`, html });
}
