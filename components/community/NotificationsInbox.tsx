"use client";

// The inbox, and the badge that tells you there is something in it.
//
// Before this, a reply reached nobody: you found out by reopening the tab
// and scrolling to your own post. The audit called this the single
// highest-leverage addition to Community.
//
// It fails quiet by design. The route answers an empty inbox when the
// notifications table is absent, so before the migration is applied the
// badge simply never appears and this renders nothing. Nobody sees an
// error for a feature that is not switched on yet.
//
// Both views read one module store (lib/community/inbox.ts). They used to
// hold separate copies of the count, which is why the tab dot never lit
// mid-session and never went out after the list was read.

import Link from "next/link";
import { useEffect } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  markInboxRead,
  refreshInbox,
  useInbox,
  type CommunityNotification,
} from "@/lib/community/inbox";

export type { CommunityNotification };

/** How often the tab badge re-checks while the app is in the foreground. */
const BADGE_POLL_MS = 60_000;

function when(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * The unread dot for the Community tab. Renders nothing when there is
 * nothing.
 *
 * A dot and not a number, deliberately. This sits on a tab the reader has
 * not opened, and CONTRIBUTING's bar on reminders forbids using a count to
 * make someone look. The number belongs inside the panel, where the reader
 * has already chosen to be. The dot only says "there is something here".
 */
export function NotificationsBadge() {
  const { unread } = useInbox();

  useEffect(() => {
    void refreshInbox();
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(() => void refreshInbox(), BADGE_POLL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshInbox();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (unread < 1) return null;
  return (
    <span
      aria-hidden
      className="absolute -right-0.5 -top-0.5 flex h-[9px] w-[9px] items-center justify-center rounded-full bg-crimson ring-2 ring-night-soft"
    />
  );
}

export function NotificationsInbox() {
  const { t, tn } = useTranslate();
  const inbox = useInbox();

  // Load, then mark read. Marking read is optimistic inside the store, so
  // the dot clears in the same beat the reader sees the list.
  useEffect(() => {
    let cancelled = false;
    void refreshInbox().then(() => {
      if (!cancelled) void markInboxRead();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing at all, including before the migration lands.
  if (!inbox.loaded || inbox.notifications.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2">
        <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
          {t("community.notifications")}
        </h2>
        {/* The count lives here, on a surface the reader opened, and never
            on the tab glyph. */}
        {inbox.unread > 0 ? (
          <span className="font-sans text-eyebrow font-semibold text-crimson">
            {tn("community.unreadCount", inbox.unread)}
          </span>
        ) : null}
      </div>
      <ul className="mt-3 divide-y divide-paper/8 overflow-hidden rounded-xl border border-paper/12 bg-paper/[0.02]">
        {inbox.notifications.map((n) => (
          <li key={n.id}>
            <Link
              // The anchor this points at is rendered by PostCard, and the
              // #post- hash also selects the Conversations panel. Both were
              // missing, so every notification landed on the Campaigns panel
              // with nothing to scroll to.
              href={`/community#post-${n.post_id}`}
              className="tap-press flex items-start gap-3 px-4 py-3 transition-colors hover:bg-paper/[0.04]"
            >
              <span
                aria-hidden
                className={
                  n.read_at
                    ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent"
                    : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson"
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-detail text-paper">
                  <span className="font-semibold">{n.actor_name}</span>{" "}
                  {t("community.repliedToYou")}
                </span>
                {n.excerpt ? (
                  <span className="mt-0.5 block truncate font-serif italic text-caption text-paper/60">
                    {n.excerpt}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-sans text-caption text-paper/40">
                {when(n.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
