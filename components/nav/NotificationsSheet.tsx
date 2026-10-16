"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { KIND_KEYS } from "@/components/community/NotificationsInbox";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { useInbox, type CommunityNotification } from "@/lib/community/inbox";
import { notificationTarget } from "@/lib/community/notificationTarget";
import { relativeTime } from "@/lib/community/relativeTime";

/** Rows shown here; the whole inbox is in Chat. */
const SHOWN = 20;

const ROW = "flex items-center gap-3 px-4 py-3";

/** Where a row opens: the person, or what was said. Chat opens either on load. */
function hrefOf(n: CommunityNotification): string | null {
  const target = notificationTarget(n);
  if (target.kind === "profile") return `/community#@${target.handle}`;
  if (target.kind === "post") return `/community#post-${target.postId}`;
  return null;
}

function Heading({ children, className }: { children: React.ReactNode; className?: string }) {
  // A heading to a screen reader, a small grey line to the eye: the global
  // h1 to h6 rule would set it in Lora bold.
  return (
    <p role="heading" aria-level={2} className={cn("mb-2 px-1 font-sans text-caption text-paper/45", className)}>
      {children}
    </p>
  );
}

function Forward() {
  return <ChevronLeft size={16} className="shrink-0 rotate-180 text-paper/35 rtl:rotate-0" />;
}

/**
 * The bell's sheet, from the phone tab bar (NotificationsButton): what other
 * readers sent (replies, mentions, follows, prayers), then what Purify sent
 * (What's new). One place for both, where the bell used to open the patch
 * notes and the inbox could only be found inside Chat.
 *
 * Rows that came in since the reader last looked are written brighter. No
 * dot, and no count: the sheet is already the place the reader chose to look.
 * The inbox itself is lib/community/inbox.ts, the one store the Chat list and
 * the tab bar read too.
 */
export function NotificationsSheet({
  open,
  onClose,
  signedIn,
  fresh,
  whatsNewFresh,
}: {
  open: boolean;
  onClose: () => void;
  /** Read from the device as the sheet opened (there is no inbox without an account). */
  signedIn: boolean;
  /** The rows that were unread as the sheet opened. Opening marks them read. */
  fresh: ReadonlySet<string>;
  /** Whether this release's notes were new to the device as the sheet opened. */
  whatsNewFresh: boolean;
}) {
  const { t, locale } = useTranslate();
  const pathname = usePathname() ?? "/";
  const inbox = useInbox();
  const rows = inbox.notifications.slice(0, SHOWN);

  return (
    <Sheet open={open} onClose={onClose} title={t("settings.notifications")} bodyClassName="pt-1">
      <section>
        <Heading>{t("community.notifications")}</Heading>
        {!signedIn ? (
          <div className={cn(INDEX_LIST_LOOK, "px-4 pt-3 pb-1")}>
            <p className="font-sans text-detail leading-snug text-paper/70">{t("notifications.signInForReaders")}</p>
            <Link
              href={`/signin?next=${pathname}`}
              onClick={onClose}
              className="inline-flex min-h-11 items-center font-sans text-detail font-semibold text-paper"
            >
              {t("common.signIn")}
            </Link>
          </div>
        ) : !inbox.loaded ? (
          <ul aria-hidden className={INDEX_LIST_LOOK}>
            {[0, 1].map((i) => (
              <li key={i} className={cn("px-4 py-3", i > 0 && "border-t border-paper/[0.06]")}>
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" weight="faint" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className={cn(INDEX_LIST_LOOK, "px-4 py-3 font-sans text-detail text-paper/55")}>{t("notifications.readersEmpty")}</p>
        ) : (
          <ul className={INDEX_LIST_LOOK}>
            {rows.map((n, i) => {
              const href = hrefOf(n);
              const isNew = fresh.has(n.id) || !n.read_at;
              const body = (
                <>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-sans text-detail leading-snug", isNew ? "text-paper" : "text-paper/70")}>
                      <span className="font-semibold">{n.actor_name}</span> {t(KIND_KEYS[n.kind] ?? "community.repliedToYou")}
                    </span>
                    <span className="mt-0.5 block truncate font-sans text-caption text-paper/45">
                      {relativeTime(n.created_at, locale)}
                      {n.excerpt ? (
                        <>
                          {" · "}
                          <span className="font-serif italic">{n.excerpt}</span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  {href ? <Forward /> : null}
                </>
              );
              return (
                <li key={n.id} className={i > 0 ? "border-t border-paper/[0.06]" : undefined}>
                  {href ? (
                    <Link href={href} onClick={onClose} className={cn(ROW, "transition-colors active:bg-paper/[0.04]")}>
                      {body}
                    </Link>
                  ) : (
                    // Nothing left to open (a row from before profiles whose
                    // post is gone): said, but not offered as a link.
                    <div className={ROW}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <Heading>{t("notifications.fromPurify")}</Heading>
        <ul className={INDEX_LIST_LOOK}>
          <li>
            <Link href="/whats-new" onClick={onClose} className={cn(ROW, "transition-colors active:bg-paper/[0.04]")}>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-heading text-ui font-semibold leading-tight", whatsNewFresh ? "text-paper" : "text-paper/75")}>
                  {t("nav.whatsNew")}
                </span>
                <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">{t("whatsnew.highlights.title")}</span>
              </span>
              <Forward />
            </Link>
          </li>
        </ul>
      </section>
    </Sheet>
  );
}
