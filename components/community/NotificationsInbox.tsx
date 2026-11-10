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
//
// A row is a button, and what it opens is decided by
// lib/community/notificationTarget.ts (1.5.2). The rows were links to an
// address on this same page, and the page never heard the address change, so
// a follow opened nothing and a reply only scrolled the feed. The panel now
// hands the row to the page (`onOpen`), which opens the person's profile, or
// the post with its thread open and the reply lit.

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Hands } from "@/components/ui/icons/Hands";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import {
  fromPurify,
  getInbox,
  markInboxRead,
  refreshInbox,
  useInbox,
  type CommunityNotification,
} from "@/lib/community/inbox";
import { campaignNoticeHref, notificationTarget } from "@/lib/community/notificationTarget";
import { REMOVED_APPEAL_KEY, REMOVED_WHY_KEY, REMOVED_YOUR_KEY, isRemovalReason, isRemovalTarget } from "@/lib/community/removal";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";

export type { CommunityNotification };

/** How often the tab badge re-checks while the app is in the foreground. */
const BADGE_POLL_MS = 60_000;

/**
 * How many rows show before "See all". The list sits above the composer, and
 * fifty rows of it pushed the box a reader came to write in off the screen.
 */
const PREVIEW = 4;

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
  return new Date(iso).toLocaleDateString(deviceDateLocale(), {
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

  return <UnreadDot />;
}

/**
 * The dot alone, for a second place that points at the same inbox: the Chat
 * tile on Discover (1.6), now that Chat is a tile and the badge above sits on
 * Discover's tab. It asks the server nothing. The badge is on the tab bar,
 * on every screen, and does the asking; this reads what it found.
 */
export function UnreadDot() {
  const { unread } = useInbox();
  if (unread < 1) return null;
  return (
    <span
      aria-hidden
      className="absolute -right-0.5 -top-0.5 flex h-[9px] w-[9px] items-center justify-center rounded-full bg-crimson ring-2 ring-night-soft"
    />
  );
}

/** What happened, after the actor's name. Also read by the bell's sheet in
 *  the phone tab bar (components/nav/NotificationsSheet.tsx), so a row says
 *  the same thing in both places. */
export const KIND_KEYS: Record<string, string> = {
  reply: "community.repliedToYou",
  mention: "community.mentionedYou",
  follow: "community.followedYou",
  name_day: "community.greetedYou",
  prayed: "community.prayedForYou",
  gift: "community.giftedYou",
  // 20261005: Ask a Priest, and a held post put up by a moderator.
  question: "community.askedClergy",
  answer: "community.answeredYou",
  approved: "community.approvedYours",
};

/**
 * What a row says first, in the inbox and in the bell's sheet alike. A
 * removal notice (lib/community/removal.ts) has no actor: it says what was
 * removed and why, as the Terms promise ("When we remove something you
 * posted, we tell you why").
 */
export function NoticeLine({ n }: { n: Pick<CommunityNotification, "kind" | "actor_name" | "target_kind" | "reason"> }) {
  const { t } = useTranslate();
  // About a prayer campaign (phase 4): what happened, without a name. Asked
  // before the kind's own line, which would say "replied to your post".
  if (n.target_kind === "campaign" && n.kind === "approved") return <>{t("community.campaignApproved")}</>;
  if (n.target_kind === "campaign" && n.kind === "reply") return <>{t("community.campaignUpdate")}</>;
  if (n.kind === "removed") {
    const target = isRemovalTarget(n.target_kind) ? n.target_kind : "post";
    const reason = isRemovalReason(n.reason) ? n.reason : "rules";
    return <>{t(REMOVED_YOUR_KEY[target], { reason: t(REMOVED_WHY_KEY[reason]) })}</>;
  }
  return (
    <>
      <span className="font-semibold">{n.actor_name}</span> {t(KIND_KEYS[n.kind] ?? "community.repliedToYou")}
    </>
  );
}

/** Under a removal notice: where to write if they think we got it wrong. */
export function NoticeAppeal({ n }: { n: Pick<CommunityNotification, "kind"> }) {
  const { t } = useTranslate();
  if (n.kind !== "removed") return null;
  return <>{t(REMOVED_APPEAL_KEY, { email: SUPPORT_EMAIL })}</>;
}

/** One line glyph per kind, so the list can be read down its left edge. */
function KindGlyph({ kind }: { kind: string }) {
  if (kind === "prayed") return <Hands size={18} />;
  if (kind === "name_day") return <Sparkle size={17} />;
  if (kind === "approved") return <Check size={17} />;
  if (kind === "removed") {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden focusable={false}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12h7" />
      </svg>
    );
  }
  const stroke = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  if (kind === "follow") {
    return (
      <svg {...stroke}>
        <circle cx="9.5" cy="8" r="3.5" />
        <path d="M3 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
        <path d="M18.5 7.5v6M15.5 10.5h6" />
      </svg>
    );
  }
  if (kind === "mention") {
    return (
      <svg {...stroke}>
        <circle cx="12" cy="12" r="3.6" />
        <path d="M15.6 12v1.4a2.4 2.4 0 0 0 4.9 0V12a8.5 8.5 0 1 0-3.4 6.8" />
      </svg>
    );
  }
  if (kind === "gift") {
    return (
      <svg {...stroke}>
        <rect x="4" y="10" width="16" height="10" rx="1.5" />
        <path d="M12 10v10M3 10h18v-3H3z" />
        <path d="M12 7c-1.4-3-4.8-3.2-4.8-1.2S10 7 12 7Zm0 0c1.4-3 4.8-3.2 4.8-1.2S14 7 12 7Z" />
      </svg>
    );
  }
  if (kind === "question") {
    return (
      <svg {...stroke}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2.9-1.2 1.8M12 16.6h.01" />
      </svg>
    );
  }
  // A reply, an answer, and anything a newer server sends that this build
  // does not know: something was said to you.
  return (
    <svg {...stroke}>
      <path d="M20.5 11.6a8.2 8.2 0 0 1-11.9 7.3L4 20l1.1-4.4a8.2 8.2 0 1 1 15.4-4Z" />
    </svg>
  );
}

const ROW = "flex w-full items-center gap-3 px-3.5 py-3 text-left";

/**
 * A group's heading inside a bell's sheet ("From other readers", "From
 * Purify"): a heading to a screen reader, a small grey line to the eye, since
 * the global h1 to h6 rule would set it in Lora bold. Shared with the tab
 * bar's sheet (components/nav/NotificationsSheet.tsx).
 */
export function InboxHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="heading" aria-level={2} className={cn("mb-2 px-1 font-sans text-caption text-paper/45", className)}>
      {children}
    </p>
  );
}

export function NotificationsInbox({
  onOpen,
  whole = false,
}: {
  /** The page opens what the row is about (lib/community/notificationTarget). */
  onOpen: (n: CommunityNotification) => void;
  /**
   * The whole inbox, as the body of Community's bell (1.8, the owner's pick
   * of r3-02 B: the inbox left the top of the feed for the bell). Every row,
   * in two groups under their headings: what other readers sent, then what
   * Purify's moderators sent (fromPurify), and a line saying so when nothing
   * came from readers.
   */
  whole?: boolean;
}) {
  const { t, tn } = useTranslate();
  const inbox = useInbox();
  const [all, setAll] = useState(false);
  // The rows that were new when the reader opened the panel. Opening it marks
  // everything read at once (below), which used to put every dot out in the
  // same beat the list was drawn, so a reader could not tell which rows had
  // brought them here. These keep their mark for as long as the panel is up.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());

  // Load, then mark read. Marking read is optimistic inside the store, so
  // the tab's dot clears in the same beat the reader sees the list.
  useEffect(() => {
    let cancelled = false;
    void refreshInbox().then(() => {
      if (cancelled) return;
      const unread = getInbox()
        .notifications.filter((n) => !n.read_at)
        .map((n) => n.id);
      if (unread.length > 0) setFresh((prev) => new Set([...prev, ...unread]));
      void markInboxRead();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (whole) {
    // The bell was asked, so the sheet says what it found: rows while they
    // come, and a line when there is nothing.
    if (!inbox.loaded) {
      return (
        <div aria-busy aria-label={t("community.gathering")}>
          <SkeletonList rows={2} />
        </div>
      );
    }
    if (inbox.notifications.length === 0) {
      return <p className="px-1 py-3 font-sans text-detail text-paper/55">{t("notifications.readersEmpty")}</p>;
    }
  } else if (!inbox.loaded || inbox.notifications.length === 0) {
    // Nothing at all, including before the migration lands.
    return null;
  }

  // What other readers sent, and what Purify's moderators sent: never one list
  // under "From other readers" (the arbiter, 2026-11-10, his call 18).
  const readers = inbox.notifications.filter((n) => !fromPurify(n));
  const purify = inbox.notifications.filter(fromPurify);
  const shown = all || whole ? readers : readers.slice(0, PREVIEW);
  const hidden = whole ? 0 : readers.length - PREVIEW;

  const listOf = (rows: CommunityNotification[], className?: string) => (
    <ul className={cn("divide-y divide-paper/8 overflow-hidden rounded-2xl border border-paper/12 bg-paper/[0.02]", className)}>
      {rows.map((n) => {
        const isNew = fresh.has(n.id);
        // A notice about a prayer campaign opens the campaign's own pages.
        const campaignHref = campaignNoticeHref(n);
        const opens = Boolean(campaignHref) || notificationTarget(n).kind !== "none";
        const inner = (
          <>
            <span
              aria-hidden
              className={cn(
                "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                isNew
                  ? "bg-paper/[0.1] text-paper ring-paper/25"
                  : "bg-paper/[0.05] text-paper/60 ring-paper/10",
              )}
            >
              <KindGlyph kind={n.kind} />
              {/* New since the reader last looked: a white dot, softly lit
                  (the owner's accent, never a colour). */}
              {isNew ? (
                <span className="reader-lit absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-paper ring-2 ring-night" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block font-sans text-detail", isNew ? "text-paper" : "text-paper/85")}>
                <NoticeLine n={n} />
              </span>
              {n.excerpt ? (
                <span className="mt-0.5 block truncate font-serif text-caption italic text-paper/60">
                  {n.excerpt}
                </span>
              ) : null}
              {n.kind === "removed" ? (
                <span className="mt-0.5 block font-sans text-caption text-paper/60">
                  <NoticeAppeal n={n} />
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-sans text-caption tabular-nums text-paper/40">
              {when(n.created_at)}
            </span>
            {opens ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="shrink-0 text-paper/30 rtl:-scale-x-100"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            ) : null}
          </>
        );
        return (
          <li key={n.id}>
            {campaignHref ? (
              // A link, so the move is the house's page transition. The page
              // still hears of it, which closes the bell's sheet.
              <Link
                href={campaignHref}
                onClick={() => onOpen(n)}
                className={cn(ROW, "press-card transition-colors hover:bg-paper/[0.04]")}
              >
                {inner}
              </Link>
            ) : opens ? (
              <button
                type="button"
                onClick={() => onOpen(n)}
                className={cn(ROW, "press-card transition-colors hover:bg-paper/[0.04]")}
              >
                {inner}
              </button>
            ) : (
              // Nothing left to open (a row from before profiles whose post
              // is gone): said, but not offered as a button.
              <div className={ROW}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (whole) {
    return (
      <>
        <InboxHeading>{t("community.notifications")}</InboxHeading>
        {readers.length > 0 ? (
          listOf(readers)
        ) : (
          <p className="px-1 py-3 font-sans text-detail text-paper/55">{t("notifications.readersEmpty")}</p>
        )}
        {purify.length > 0 ? (
          <>
            <InboxHeading className="mt-6">{t("notifications.fromPurify")}</InboxHeading>
            {listOf(purify)}
          </>
        ) : null}
      </>
    );
  }

  const freshReaders = readers.filter((n) => fresh.has(n.id)).length;

  return (
    <section className="mb-8">
      {readers.length > 0 ? (
        <>
          <div className="flex items-baseline gap-2">
            <InboxHeading className="mb-0">{t("community.notifications")}</InboxHeading>
            {/* The count lives here, on a surface the reader opened, and never
                on the tab glyph. */}
            {freshReaders > 0 ? (
              <span className="font-sans text-eyebrow font-semibold text-crimson">
                {tn("community.unreadCount", freshReaders)}
              </span>
            ) : null}
          </div>
          {listOf(shown, "mt-3")}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              aria-expanded={all}
              className="hit-44 mt-2.5 px-1 font-sans text-detail font-semibold text-paper/65 transition-colors hover:text-paper"
            >
              {all ? t("community.showLess") : `${t("common.seeAll")} (${readers.length})`}
            </button>
          ) : null}
        </>
      ) : null}
      {/* What Purify's moderators sent is never folded behind "See all". */}
      {purify.length > 0 ? (
        <>
          <InboxHeading className={cn("mb-0", readers.length > 0 && "mt-6")}>{t("notifications.fromPurify")}</InboxHeading>
          {listOf(purify, "mt-3")}
        </>
      ) : null}
    </section>
  );
}
