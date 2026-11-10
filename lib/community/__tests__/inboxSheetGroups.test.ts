import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommunityNotification, Inbox } from "@/lib/community/inbox";

/**
 * The bell's sheet (components/nav/NotificationsSheet.tsx) has two headings:
 * "From other readers" and "From Purify". A notice Purify's moderators send
 * (a post approved, or something taken down with its reason) stands under
 * "From Purify", above What's new, and never under "From other readers"
 * (the arbiter, 2026-11-10, from the removal notice's still, his call 18).
 *
 * What would go wrong if this broke: a reader reads that "other readers"
 * removed their post.
 */

let inboxNow: Inbox = { notifications: [], unread: 0, loaded: true };

vi.mock("@/lib/community/inbox", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/community/inbox")>();
  return { ...real, useInbox: () => inboxNow };
});

// The real sheet draws through a portal, which a render to a string has no
// document for; what is inside it is what is tried here.
vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => createElement("div", null, children),
}));

const { MessagesProvider } = await import("@/components/i18n/MessagesProvider");
const { NotificationsSheet } = await import("@/components/nav/NotificationsSheet");
const { getMessages } = await import("@/lib/i18n");

const en = getMessages("en") as Record<string, string>;
/** Words as React writes them into markup. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const READERS = esc(en["community.notifications"]);
const PURIFY = esc(en["notifications.fromPurify"]);
const WHATS_NEW = esc(en["nav.whatsNew"]);

function notice(id: string, kind: CommunityNotification["kind"], excerpt: string, more: Partial<CommunityNotification> = {}): CommunityNotification {
  return {
    id,
    kind,
    post_id: `post-${id}`,
    reply_id: null,
    actor_name: kind === "approved" || kind === "removed" ? "Purify" : "Anna",
    actor_handle: kind === "approved" || kind === "removed" ? null : "anna",
    excerpt,
    read_at: null,
    created_at: "2026-11-10T12:00:00.000Z",
    ...more,
  };
}

/** The sheet as a string, cut at its second heading: what stands under each. */
function draw(notifications: CommunityNotification[]): { readers: string; purify: string } {
  inboxNow = { notifications, unread: notifications.length, loaded: true };
  const html = renderToStaticMarkup(
    createElement(
      MessagesProvider,
      { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0],
      createElement(NotificationsSheet, { open: true, onClose: () => {}, signedIn: true, fresh: new Set<string>(), whatsNewFresh: false }),
    ),
  );
  const at = html.indexOf(`>${PURIFY}<`);
  expect(html.indexOf(`>${READERS}<`)).toBeGreaterThanOrEqual(0);
  expect(at).toBeGreaterThan(html.indexOf(`>${READERS}<`));
  return { readers: html.slice(0, at), purify: html.slice(at) };
}

afterEach(() => {
  inboxNow = { notifications: [], unread: 0, loaded: true };
});

describe("the bell's sheet: what Purify sent stands under From Purify", () => {
  it("puts a removal and an approval under From Purify, above What's new, and a reply under From other readers", () => {
    const { readers, purify } = draw([
      notice("r1", "reply", "A reader's reply"),
      notice("x1", "removed", "A removed post", { target_kind: "post", reason: "spam" }),
      notice("a1", "approved", "An approved post"),
    ]);
    expect(readers).toContain("A reader&#x27;s reply");
    expect(readers).not.toContain("A removed post");
    expect(readers).not.toContain("An approved post");
    expect(purify).toContain("A removed post");
    expect(purify).toContain("An approved post");
    expect(purify.indexOf("A removed post")).toBeLessThan(purify.indexOf(WHATS_NEW));
    expect(purify.indexOf("An approved post")).toBeLessThan(purify.indexOf(WHATS_NEW));
    // The removal still says where to write.
    expect(purify).toContain("support@purifyapp.net");
  });

  it("says nothing came from other readers when the only notice is Purify's", () => {
    const { readers, purify } = draw([notice("x2", "removed", "Only a removal", { target_kind: "reply", reason: "unkind" })]);
    expect(readers).toContain(esc(en["notifications.readersEmpty"]));
    expect(purify).toContain("Only a removal");
  });

  it("keeps What's new alone under From Purify when Purify sent nothing else", () => {
    const { readers, purify } = draw([notice("r2", "mention", "A mention")]);
    expect(readers).toContain("A mention");
    expect(purify).toContain(WHATS_NEW);
    expect(purify).not.toContain("A mention");
  });
});
