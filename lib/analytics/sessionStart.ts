import { DESKTOP_UA_TOKEN } from "@/lib/platform/token";

import { cleanTag, storedTag } from "./tag";

/**
 * What is written about where a session came from and what it is read on,
 * the one time it is written: when the session is first seen
 * (app/api/track/route.ts). Pure, so the rule can be held by a test and the
 * route has nothing to decide.
 *
 *   referrer    the link tag when the page handed one over, written as an
 *               address no browser sends (lib/analytics/tag.ts); otherwise
 *               what the browser said, or nothing.
 *   user_agent  what the request carried, cut to 300 characters as the
 *               privacy page says. When the page is inside the Windows app,
 *               which the request cannot show, one word is written after it
 *               (lib/platform/token.ts), inside the same 300.
 *
 * Whatever else the page sends is ignored. A word that is not a tag is
 * dropped and the referrer stands; an `app` this does not know changes
 * nothing.
 */
export const USER_AGENT_KEPT = 300;

export function sessionStart(seen: {
  referrer?: string | null;
  tag?: string | null;
  app?: string | null;
  userAgent?: string | null;
}): { referrer: string | null; user_agent: string } {
  const tag = cleanTag(seen.tag);
  const sent = seen.userAgent ?? "";
  const user_agent =
    seen.app === "desktop"
      ? `${sent.slice(0, USER_AGENT_KEPT - DESKTOP_UA_TOKEN.length - 1)} ${DESKTOP_UA_TOKEN}`
      : sent.slice(0, USER_AGENT_KEPT);
  return { referrer: tag ? storedTag(tag) : seen.referrer || null, user_agent };
}
