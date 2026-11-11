// The note a moderator may send, by hand, to a writer whose words may mean
// they are in danger (the safety line, lib/campaigns/safety.ts; his yes to
// call 26, 2026-11-11). It stands in the writer's own inbox under "From
// Purify" and nowhere else: never a push, never public, never automatic.
//
// Its words are in every language (community.careNote, community.careSign),
// his English as he approved it. The help it names is the same in every
// language, and each is something a phone can open: 988 (call or text, the
// US and Canada), 116 123 (the UK and Ireland, Samaritans), and
// findahelpline.com for every other country. Each was read on its official
// page on 2026-11-10 (the Admin chat's check for call 26).

import { HELPLINES_SITE, HELPLINES_URL } from "@/lib/campaigns/safety";

/** The notice's kind, as community_notifications stores it. */
export const CARE_KIND = "care";

/** The help in the note, as it is written in every language, and what each opens. */
export const CARE_LINKS: readonly { text: string; href: string }[] = [
  { text: HELPLINES_SITE, href: HELPLINES_URL },
  { text: "116 123", href: "tel:116123" },
  { text: "988", href: "tel:988" },
];

export type CarePart = string | { text: string; href: string };

/**
 * The note's words, with each piece of help it names as something to open.
 * Longest first, so "116 123" is never cut by a shorter match, and only where
 * the piece stands on its own (not inside a longer number).
 */
export function careParts(text: string): CarePart[] {
  const escaped = CARE_LINKS.map((l) => l.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\d\\w])(${escaped.join("|")})(?![\\d])`, "g");
  const out: CarePart[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const link = CARE_LINKS.find((l) => l.text === m[1]);
    out.push(link ? { text: m[1], href: link.href } : m[1]);
    last = at + m[1].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
