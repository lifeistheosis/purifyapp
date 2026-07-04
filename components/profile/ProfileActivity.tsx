"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

type Bookmark = {
  id: string;
  kind: "bible-verse" | "bible-chapter" | "writing-section" | "history-event";
  locator: {
    book?: string;
    chapter?: number;
    verse?: number;
    saintSlug?: string;
    workSlug?: string;
    sectionN?: number;
    eventSlug?: string;
  };
  addedAt: string;
  label?: string;
};

const STORAGE_KEY = "purify:bookmarks";
const EVENT = "purify:bookmark";
const EMPTY: Bookmark[] = [];

// Stable snapshot keyed by the raw string so identical reads return the same
// reference and useSyncExternalStore doesn't tear.
let lastRaw: string | null | undefined;
let lastValue: Bookmark[] = EMPTY;

function readTopThree(): Bookmark[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === lastRaw) return lastValue;
  lastRaw = raw;
  if (!raw) {
    lastValue = EMPTY;
    return lastValue;
  }
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) {
      lastValue = EMPTY;
      return lastValue;
    }
    lastValue = (arr as Bookmark[])
      .filter((b) => b && b.addedAt)
      .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
      .slice(0, 3);
  } catch {
    lastValue = EMPTY;
  }
  return lastValue;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function hrefFor(b: Bookmark): string {
  const l = b.locator ?? {};
  switch (b.kind) {
    case "bible-verse":
      return `/bible/${l.book}/${l.chapter}#v${l.verse}`;
    case "bible-chapter":
      return `/bible/${l.book}/${l.chapter}`;
    case "writing-section":
      return `/saints/${l.saintSlug}/${l.workSlug}#s${l.sectionN}`;
    case "history-event":
      return `/history/${l.eventSlug}`;
    default:
      return "/saved";
  }
}

function relativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "Just now";
  const m = Math.floor(diffMs / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * "Last saved" strip on the account dashboard, the three most recent
 * bookmarks, each a one-tap link back into its target. Reads from the same
 * `purify:bookmarks` localStorage key via useSyncExternalStore so it stays
 * in sync with the rest of the bookmark UI without a hydrate-in-effect.
 */
export function ProfileActivity() {
  const items = useSyncExternalStore(subscribe, readTopThree, () => EMPTY);
  // Distinct identity between SSR and the first client read tells us whether
  // we have hydrated client storage yet (without triggering a setState).
  const hydrated = items !== EMPTY || typeof window !== "undefined";

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
          Last saved
        </p>
        <Link
          href="/saved"
          className="font-sans text-caption text-paper/55 hover:text-paper transition-colors"
        >
          See all →
        </Link>
      </div>
      {hydrated && items.length === 0 ? (
        <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-6 font-serif italic text-ui text-paper/55 leading-[1.55]">
          Nothing saved yet. Bookmark a verse on any chapter, or a section in a
          saint&apos;s writing, and it will show up here.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((b) => (
            <li key={b.id}>
              <Link
                href={hrefFor(b)}
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
                  {b.label || hrefFor(b)}
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
