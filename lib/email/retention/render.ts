import { LEGAL_NAME } from "@/lib/legal/entity";

import { buildEmail, siteUrl, type EmailContent } from "../templates/build";
import { unsubscribeUrl } from "../unsubscribe";

import { RETENTION_LABEL, type RetentionKind } from "./kinds";
import type { RetentionLetter } from "./letters";
import { retentionLook } from "./look";

/**
 * Drawing a retention letter for one reader: its look, its foot, its own
 * unsubscribe link and headers.
 *
 * TWO WAYS TO DRAW A LETTER, AND ONLY ONE IS EVER SENT.
 *
 *   standInEmail  the plain stand-in: the letter in the house's current
 *                 email shell (lib/email/templates/build.ts). For the tests,
 *                 and for showing Fable and the owner what each email holds.
 *                 Nothing that sends imports it; a test holds that.
 *   LOOKS         each email's approved look, one entry per email, added in
 *                 the same commit as his yes to its design
 *                 (switches.ts DESIGN_YES). The sender draws a letter only
 *                 through here, so with no approved look there is nothing it
 *                 can send, whatever a switch says. From his "yes to all" of
 *                 2026-11-13 (about 20:47 UTC) all three wear the kit's look
 *                 (look.ts); every switch stays off, so nothing is sent yet.
 *
 * A look takes the same letter and the same frame, so an approved design
 * drops in as one function and nothing about who gets what changes.
 */

/** What a look is given besides the letter: the line above the heading, the foot, this reader's link. */
export type Frame = { eyebrow: string; footer: string; unsubscribeHref: string };

export type Look = (letter: RetentionLetter, frame: Frame) => EmailContent;

/** The plain stand-in. Never sent: see the note above. */
export function standInEmail(letter: RetentionLetter, frame: Frame): EmailContent {
  return buildEmail({
    subject: letter.subject,
    heading: letter.heading,
    deck: letter.deck,
    paragraphs: letter.paragraphs,
    lines: letter.days,
    after: letter.after,
    action: letter.action,
    footer: frame.footer,
    unsubscribeHref: frame.unsubscribeHref,
    eyebrow: frame.eyebrow,
  });
}

/** Each approved look, by email: the kit's, his yes of 2026-11-13 (switches.ts DESIGN_YES). */
export const LOOKS: Partial<Record<RetentionKind, Look>> = {
  first_week: retentionLook,
  pick_up: retentionLook,
  fasting_companion: retentionLook,
};

let looks: Partial<Record<RetentionKind, Look>> = { ...LOOKS };

/** The look an email is sent in, or null while it has none. */
export function lookFor(kind: RetentionKind): Look | null {
  return looks[kind] ?? null;
}

/** Test seam: a look as a case needs it. Never called by the app. */
export function __setLook(kind: RetentionKind, look: Look | null): void {
  const next = { ...looks };
  if (look) next[kind] = look;
  else delete next[kind];
  looks = next;
}

/** Test seam: the looks back as LOOKS has them. */
export function __resetLooks(): void {
  looks = { ...LOOKS };
}

/**
 * Why the email came, who sent it and from where (CAN-SPAM asks a list email
 * for the sender and a postal address, lib/email/consent.ts). The owner's
 * first sends say why they reached him, since he did not turn the list on.
 */
export function retentionFooter(kind: RetentionKind, postalAddress: string, opts: { owner: boolean }): string {
  const why = opts.owner
    ? `You are getting this because your address is in ADMIN_EMAILS: each new email goes to you alone before any reader has it.`
    : `You are getting this because you turned on "${RETENTION_LABEL[kind]}" in your Purify settings.`;
  return `${why} ${LEGAL_NAME}, ${postalAddress.trim()}.`;
}

/**
 * RFC 8058 one-click unsubscribe for one retention list: the mail client's
 * own button POSTs here and stops that list alone
 * (app/api/email/unsubscribe/route.ts). A GET does nothing there.
 */
export function retentionUnsubscribeHeaders(token: string, kind: RetentionKind): Record<string, string> {
  const endpoint = siteUrl(`/api/email/unsubscribe?t=${encodeURIComponent(token)}&l=${kind}`);
  return { "List-Unsubscribe": `<${endpoint}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

/** The frame for one reader's copy. */
export function frameFor(kind: RetentionKind, token: string, postalAddress: string, opts: { owner: boolean }): Frame {
  return {
    eyebrow: RETENTION_LABEL[kind],
    footer: retentionFooter(kind, postalAddress, opts),
    unsubscribeHref: unsubscribeUrl(token, kind),
  };
}
