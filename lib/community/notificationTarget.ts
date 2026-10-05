/**
 * Where a notification takes the reader when they tap it.
 *
 * Until 1.5.2 every row was a link to an address inside the Community page
 * (`#post-<id>`, `#@handle`), and the page was meant to hear the address
 * change. It never did: Next changes an address on the same page with
 * `history.pushState`, which fires no `hashchange`, so "someone followed you"
 * did nothing at all, and a reply only scrolled the page to its post, because
 * the browser does that much for any `#id` (the owner, 2026-10-05: "it
 * doesn't do anything ... it's anticlimactic"). A notification is now asked
 * what it is about, here, and the page acts on the answer.
 *
 *   - About a person (a follow, a name day greeting, a gift): their profile.
 *   - About something said (a reply, a mention, a question, an answer, a post
 *     a moderator let through): that post, with the thread open and the reply
 *     itself brought forward when the row names one.
 *   - "Prayed for you": the post that was prayed over when there is one, the
 *     person otherwise.
 *
 * A row from before profiles has no @handle, and a row whose post is gone has
 * no post. Whatever is left is used; with nothing left the row is not a
 * button.
 *
 * Pure, so the rule can be tested without a page.
 */

import type { CommunityNotification } from "./inbox";

export type NotificationTarget =
  | { kind: "profile"; handle: string }
  | { kind: "post"; postId: string; replyId: string | null }
  | { kind: "none" };

type Row = Pick<CommunityNotification, "kind" | "post_id" | "reply_id" | "actor_handle">;

/** A row that is about the person who did it, not about something written. */
const PERSON_KINDS: ReadonlySet<string> = new Set(["follow", "name_day", "gift"]);

export function notificationTarget(n: Row): NotificationTarget {
  const handle = typeof n.actor_handle === "string" && n.actor_handle ? n.actor_handle : null;
  const post = typeof n.post_id === "string" && n.post_id ? n.post_id : null;
  const reply = typeof n.reply_id === "string" && n.reply_id ? n.reply_id : null;

  if (PERSON_KINDS.has(n.kind)) {
    if (handle) return { kind: "profile", handle };
    // A greeting or a gift can still hang on a post from before profiles.
    return post ? { kind: "post", postId: post, replyId: reply } : { kind: "none" };
  }
  if (post) return { kind: "post", postId: post, replyId: reply };
  if (handle) return { kind: "profile", handle };
  return { kind: "none" };
}
