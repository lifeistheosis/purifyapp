"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { bookmarkHref, useBookmarks } from "@/lib/bookmarks";

function relativeShort(then: number): string {
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "Just now";
  const m = Math.floor(diffMs / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

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
 */
export function ProfileActivity() {
  const { t } = useTranslate();
  const { bookmarks } = useBookmarks();
  const items = useMemo(
    () => [...bookmarks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 3),
    [bookmarks],
  );
  // The store returns a stable empty list until localStorage is read, so an
  // empty list on the server is "not yet known" rather than "nothing saved".
  const hydrated = typeof window !== "undefined";

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
          {t("ui.lastSaved")}
        </p>
        <Link
          href="/saved"
          className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
        >
          {t("ui.seeAll")}
        </Link>
      </div>
      {hydrated && items.length === 0 ? (
        <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-6 font-serif italic text-ui text-paper/55 leading-[1.55]">
          {t("ui.nothingSavedYetBookmarkA")}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={bookmarkHref(b)}
                className="group block h-full rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-4 py-4"
              >
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/75 font-semibold">
                  {b.kind === "bible-verse"
                    ? "Verse"
                    : b.kind === "bible-chapter"
                      ? "Chapter"
                      : "Writing"}
                </p>
                <p className="mt-1.5 font-display-serif text-body text-paper leading-tight line-clamp-2">
                  {b.label || bookmarkHref(b)}
                </p>
                <p className="mt-2 font-sans text-caption text-paper/45">
                  {relativeShort(b.addedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
