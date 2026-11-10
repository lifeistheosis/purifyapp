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
  Sheet: ({ title, children }: { title?: ReactNode; children: ReactNode }) =>
    createElement("div", null, createElement("h1", { "data-sheet-title": "" }, title), children),
}));

const { MessagesProvider } = await import("@/components/i18n/MessagesProvider");
const { NotificationsSheet } = await import("@/components/nav/NotificationsSheet");
const { CommunityBell } = await import("@/components/community/CommunityBell");
const { NotificationsInbox } = await import("@/components/community/NotificationsInbox");
const { fromPurify } = await import("@/lib/community/inbox");
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

/** Community's bell sheet as a string (Chat's whole inbox, and the desktop bell). */
function drawBell(notifications: CommunityNotification[]): string {
  inboxNow = { notifications, unread: notifications.length, loaded: true };
  return renderToStaticMarkup(
    createElement(
      MessagesProvider,
      { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0],
      createElement(CommunityBell, { onOpen: () => {}, onPicture: false }),
    ),
  );
}

describe("Community's bell: the same two groups", () => {
  it("is titled Notifications, and puts a removal and an approval under From Purify, after what readers sent", () => {
    const html = drawBell([
      notice("r3", "reply", "A reader's answer"),
      notice("x3", "removed", "A removed reply", { target_kind: "reply", reason: "unkind" }),
      notice("a3", "approved", "An approved reply"),
    ]);
    expect(html).toContain(`data-sheet-title="">${esc(en["settings.notifications"])}</h1>`);
    const readersAt = html.indexOf(`>${READERS}<`);
    const purifyAt = html.indexOf(`>${PURIFY}<`);
    expect(readersAt).toBeGreaterThan(0);
    expect(purifyAt).toBeGreaterThan(readersAt);
    const readers = html.slice(readersAt, purifyAt);
    const purify = html.slice(purifyAt);
    expect(readers).toContain("A reader&#x27;s answer");
    expect(readers).not.toContain("A removed reply");
    expect(readers).not.toContain("An approved reply");
    expect(purify).toContain("A removed reply");
    expect(purify).toContain("An approved reply");
    expect(purify).toContain("support@purifyapp.net");
  });

  it("says nothing came from readers, and shows no From Purify heading when Purify sent nothing", () => {
    const onlyPurify = drawBell([notice("x4", "removed", "Only this", { target_kind: "post", reason: "spam" })]);
    expect(onlyPurify).toContain(esc(en["notifications.readersEmpty"]));
    expect(onlyPurify.indexOf(`>${PURIFY}<`)).toBeLessThan(onlyPurify.indexOf("Only this"));
    const onlyReaders = drawBell([notice("r4", "follow", "")]);
    expect(onlyReaders).not.toContain(`>${PURIFY}<`);
  });

  it("never folds a removal behind See all in the list's short form", () => {
    const many = [1, 2, 3, 4, 5, 6].map((i) => notice(`r${10 + i}`, "reply", `Reply ${i}`));
    inboxNow = { notifications: [...many, notice("x5", "removed", "Taken down", { target_kind: "post", reason: "rules" })], unread: 7, loaded: true };
    const html = renderToStaticMarkup(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0],
        createElement(NotificationsInbox, { onOpen: () => {} }),
      ),
    );
    expect(html).toContain("Taken down");
    expect(html).not.toContain("Reply 6");
  });
});

describe("the one rule", () => {
  it("counts an approval and a removal as Purify's, and nothing a reader sends", () => {
    expect(fromPurify({ kind: "approved" })).toBe(true);
    expect(fromPurify({ kind: "removed" })).toBe(true);
    for (const kind of ["reply", "mention", "follow", "name_day", "prayed", "gift", "question", "answer"] as const) {
      expect(fromPurify({ kind })).toBe(false);
    }
  });
});

describe("a notice about a prayer campaign, in both inboxes", () => {
  const APPROVED = esc(en["community.campaignApproved"]);
  const UPDATE = esc(en["community.campaignUpdate"]);
  const CAMPAIGN = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
  const approved = () => notice("c1", "approved", "For my mother", { post_id: null, target_kind: "campaign" });
  const update = () => notice("c2", "reply", "", { excerpt: null, actor_name: "Purify", actor_handle: null, target_kind: "campaign", reply_id: "upd-1", campaign_id: CAMPAIGN });

  it("says what happened, never \"replied to your post\", and opens the campaign's pages", () => {
    const { readers, purify } = draw([approved(), update()]);
    expect(purify).toContain(APPROVED);
    expect(purify).toContain('href="/campaigns/mine"');
    expect(readers).toContain(UPDATE);
    expect(readers).toContain(`href="/campaigns/detail?id=${CAMPAIGN}#updates"`);
    expect(readers + purify).not.toContain(esc(en["community.repliedToYou"]));
    expect(readers + purify).not.toContain(esc(en["community.approvedYours"]));
  });

  it("Community's bell draws the same lines, as links", () => {
    inboxNow = { notifications: [approved(), update()], unread: 2, loaded: true };
    const html = renderToStaticMarkup(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0],
        createElement(NotificationsInbox, { whole: true, onOpen: () => {} }),
      ),
    );
    expect(html).toContain(APPROVED);
    expect(html).toContain(UPDATE);
    expect(html).toContain('href="/campaigns/mine"');
    expect(html).toContain(`href="/campaigns/detail?id=${CAMPAIGN}#updates"`);
  });

  it("is in all 21 languages, with no dash", () => {
    for (const code of ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"]) {
      const m = getMessages(code as Parameters<typeof getMessages>[0]) as Record<string, string>;
      for (const k of ["community.campaignApproved", "community.campaignUpdate"]) {
        expect(typeof m[k] === "string" && m[k].trim().length > 0, `${code} ${k}`).toBe(true);
        expect(m[k], `${code} ${k}`).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });
});
