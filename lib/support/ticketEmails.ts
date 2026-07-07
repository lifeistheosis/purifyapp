import "server-only";

import { emailLayout } from "@/lib/email/layout";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { adminEmails } from "@/lib/admin/access";
import { SITE_URL } from "@/lib/site";
import { ticketNumber, type Ticket } from "./ticketNumber";

function quote(body: string): string {
  return `<div style="margin:12px 0;padding:12px 16px;background:#f5f4f2;border-radius:8px;white-space:pre-wrap;color:#3a3540">${escapeHtml(body)}</div>`;
}

/** Sent to the customer when they open a ticket. */
export async function sendTicketReceivedEmail(ticket: Ticket, body: string) {
  const num = ticketNumber(ticket.id);
  const html = emailLayout({
    heading: "We got your message",
    bodyHtml: `
      <p style="margin:0 0 16px">Thanks for reaching out. Your support request is logged and we&rsquo;ll reply by email as soon as we can.</p>
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#8a8580">Ticket number</p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:22px;font-weight:bold;letter-spacing:1px;color:#1a1720">${num}</p>
      <p style="margin:0 0 6px;color:#8a8580">Subject: <strong style="color:#1a1720">${escapeHtml(ticket.subject)}</strong></p>
      ${quote(body)}
      <p style="margin:16px 0 0;font-size:14px;color:#8a8580">Just reply to this email to add to the conversation.</p>`,
  });
  return sendEmail({
    to: ticket.email,
    subject: `We got your message — ${num}`,
    html,
  });
}

/** Sent to the customer when staff replies. */
export async function sendTicketReplyEmail(ticket: Ticket, reply: string) {
  const num = ticketNumber(ticket.id);
  const html = emailLayout({
    heading: "A reply to your request",
    bodyHtml: `
      <p style="margin:0 0 6px;color:#8a8580">Ticket ${num} &middot; ${escapeHtml(ticket.subject)}</p>
      ${quote(reply)}
      <p style="margin:16px 0 0;font-size:14px;color:#8a8580">Reply to this email to continue the conversation.</p>`,
  });
  return sendEmail({
    to: ticket.email,
    subject: `Re: your request — ${num}`,
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
    bodyHtml: `
      <p style="margin:0 0 6px;color:#8a8580">${num} &middot; from ${escapeHtml(ticket.name || ticket.email)} (${escapeHtml(ticket.email)})</p>
      <p style="margin:0 0 6px;color:#1a1720"><strong>${escapeHtml(ticket.subject)}</strong></p>
      ${quote(body)}
      <p style="margin:16px 0 0"><a href="${SITE_URL}/admin/support" style="color:#b8892f;text-decoration:none">Open in the support console &rarr;</a></p>`,
    footer: "Operator notification &middot; Purify Shop support.",
  });
  return sendEmail({ to, subject: `New ticket ${num}: ${ticket.subject}`, html });
}
