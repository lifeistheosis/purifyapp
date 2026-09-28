"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { KIND_LABEL_KEY, KindIcon, savedSource, savedTitle, shortDate } from "@/components/saved/kinds";
import { CARD, CARD_BG, CTA, Eyebrow, ICON_TILE_SM, PILL } from "@/components/ui/Graphite";
import { bookmarkHref, useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";

/**
 * "Last saved" strip on the account dashboard, the three most recent
 * bookmarks, each a one-tap link back into its target.
 *
 * Reads through lib/bookmarks.ts, the same store the rest of the bookmark
 * UI uses. It used to keep its own copy of the type and its own reader,
 * and that copy described the SERVER's row shape, with the locating fields
 * nested under `locator`. lib/sync/bookmarks.ts flattens that shape before
 * it reaches localStorage, so every card on this strip linked to
 * /bible/undefined/undefined.
 *
 * Redrawn 2026-09-28 as graphite cards with the kind's own mark. Kinds come
 * from components/saved/kinds.tsx: this strip used to call everything that
 * was not a verse or a chapter "Writing", saints and prayers included, and
 * three sections of one epistle all showed the epistle's name, so they read
 * as one card three times. Each now shows its section, with the saint and
 * the work beneath.
 */
export function ProfileActivity() {
  const { t, locale } = useTranslate();
  const { bookmarks } = useBookmarks();
  const items = useMemo(
    () => [...bookmarks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3),
    [bookmarks],
  );
  // The store returns a stable empty list until localStorage is read, so an
  // empty list on the server is "not yet known" rather than "nothing saved".
  const hydrated = typeof window !== "undefined";

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow level={2}>{t("ui.lastSaved")}</Eyebrow>
        {/* ui.seeAll carries its own arrow in every language. */}
        <Link href="/saved" className={cn(PILL, "px-4 py-1.5 text-detail")}>
          {t("ui.seeAll")}
        </Link>
      </div>
      {hydrated && items.length === 0 ? (
        <div className={cn(CARD, "mt-5 rounded-[22px] p-6 hover:translate-y-0 md:p-7")} style={CARD_BG}>
          <p className="max-w-[60ch] font-serif text-ui leading-[1.6] text-paper/70">
            {t("ui.nothingSavedYetBookmarkA")}
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {items.map((b) => {
            const source = savedSource(b);
            return (
              <li key={b.id} className="min-w-0">
                <Link
                  href={bookmarkHref(b)}
                  className={cn(CARD, "h-full rounded-[22px] p-6 md:p-6")}
                  style={CARD_BG}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span aria-hidden className={ICON_TILE_SM}>
                      <KindIcon kind={b.kind} />
                    </span>
                    <span className="font-sans text-caption tabular-nums text-paper/50">
                      {shortDate(b.addedAt, locale)}
                    </span>
                  </div>
                  <p className="mt-5 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
                    {t(KIND_LABEL_KEY[b.kind] ?? "ui.savedKindWriting")}
                  </p>
                  <p className="mt-1.5 line-clamp-2 font-heading text-lede font-bold leading-snug text-paper">
                    {savedTitle(b) || bookmarkHref(b)}
                  </p>
                  {source ? (
                    <p className="mt-1.5 line-clamp-1 font-sans text-detail text-paper/55">{source}</p>
                  ) : null}
                  <p className={cn(CTA, "mt-auto pt-5")}>
                    <span aria-hidden>→</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
