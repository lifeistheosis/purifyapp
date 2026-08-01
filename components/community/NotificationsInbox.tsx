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

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export type CommunityNotification = {
  id: string;
  kind: "reply";
  post_id: string;
  reply_id: string | null;
  actor_name: string;
  excerpt: string | null;
  read_at: string | null;
  created_at: string;
};

type Inbox = { notifications: CommunityNotification[]; unread: number };

/** Shared fetch so the badge and the list cannot disagree about the count. */
async function loadInbox(): Promise<Inbox> {
  try {
    const res = await apiFetch("/api/community/notifications");
    if (!res.ok) return { notifications: [], unread: 0 };
    const json = (await res.json()) as Partial<Inbox>;
    return {
      notifications: Array.isArray(json.notifications) ? json.notifications : [],
      unread: typeof json.unread === "number" ? json.unread : 0,
    };
  } catch {
    // Signed out, offline, or the table is not there yet. All the same
    // thing to a reader: nothing to show.
    return { notifications: [], unread: 0 };
  }
}

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

/** The unread dot for the Community tab. Renders nothing when there is nothing. */
export function NotificationsBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadInbox().then((i) => {
      if (!cancelled) setUnread(i.unread);
    });
    return () => {
      cancelled = true;
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
  const { t } = useTranslate();
  const [inbox, setInbox] = useState<Inbox | null>(null);

  const markRead = useCallback(() => {
    // Fire and forget: the list is already on screen and correct, and a
    // failed mark-read only means the badge lingers until next time.
    apiFetch("/api/community/notifications", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadInbox().then((i) => {
      if (cancelled) return;
      setInbox(i);
      if (i.unread > 0) markRead();
    });
    return () => {
      cancelled = true;
    };
  }, [markRead]);

  // Nothing at all, including before the migration lands.
  if (!inbox || inbox.notifications.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
        {t("community.notifications")}
      </h2>
      <ul className="mt-3 divide-y divide-paper/8 overflow-hidden rounded-xl border border-paper/12 bg-paper/[0.02]">
        {inbox.notifications.map((n) => (
          <li key={n.id}>
            <Link
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
