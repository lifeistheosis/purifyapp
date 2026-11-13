"use client";

import { InboxHeading as Heading } from "@/components/community/NotificationsInbox";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { SaveOfflineMark } from "@/components/player/SaveOffline";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/community/relativeTime";
import { isEnded, useDownloads, type Download } from "@/lib/downloads/log";
import { lineOf } from "@/lib/downloads/watch";

/**
 * The bell's sheet's first part (1.9, build 95 note 23; the owner: "show up
 * on your notifications in the app (its status and when it finishes)"):
 * every download on this phone, what it is doing and how it ended, from
 * lib/downloads/log.ts. Shown only when there is one, so a new reader meets
 * no empty list. A row is said, not a link: its state is the news. Running,
 * it wears the player's own ring (SaveOfflineMark), dimmed while it waits;
 * done, the check a chosen translation wears; failed, its words alone.
 */
export function DownloadsSection({ fresh }: { fresh: ReadonlySet<string> }) {
  const { t } = useTranslate();
  const downloads = useDownloads();
  if (downloads.length === 0) return null;
  return (
    <section className="mb-6" data-downloads="">
      <Heading>{t("notifications.downloads")}</Heading>
      <ul className={INDEX_LIST_LOOK}>
        {downloads.map((d, i) => (
          <DownloadRow key={d.key} d={d} first={i === 0} bright={!isEnded(d) || fresh.has(d.key)} />
        ))}
      </ul>
    </section>
  );
}

/** One download: its name, its state or its end and when, and its mark. */
function DownloadRow({ d, first, bright }: { d: Download; first: boolean; bright: boolean }) {
  const { t, locale } = useTranslate();
  const line = lineOf(d);
  const said = t(line.key, line.vars);
  const ended = isEnded(d);
  return (
    <li data-download={d.state} className={cn("flex items-center gap-3 px-4 py-3", !first && "border-t border-paper/[0.06]")}>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-sans text-detail leading-snug", bright ? "text-paper" : "text-paper/70")}>
          {/* A Bible's own title keeps its own direction (an Arabic title in an English list). */}
          <span dir="auto">{d.name}</span>
        </span>
        <span aria-live={ended ? undefined : "polite"} className="mt-0.5 block font-sans text-caption leading-snug text-paper/60">
          {said}
          {ended ? ` · ${relativeTime(d.ended ?? d.at, locale)}` : null}
        </span>
      </span>
      {ended ? (
        d.state === "done" ? <Check size={18} className="me-1 shrink-0 text-paper/70" /> : null
      ) : (
        <SaveOfflineMark look={d.state === "waiting" ? "waiting" : "saving"} share={d.share} label={said} className="-me-2" />
      )}
    </li>
  );
}
