"use client";

import Link from "next/link";
import { useBookmarks, type Bookmark } from "@/lib/bookmarks";

/**
 * Live list of everything the user has bookmarked. Groups by kind, sorts
 * newest first within each group, and links each row back to its location.
 */
export function SavedList() {
  const { bookmarks, remove } = useBookmarks();

  const verses = bookmarks.filter((b) => b.kind === "bible-verse");
  const chapters = bookmarks.filter((b) => b.kind === "bible-chapter");
  const writings = bookmarks.filter((b) => b.kind === "writing-section");

  if (bookmarks.length === 0) {
    return (
      <div className="mt-12 rounded-lg border border-paper/10 bg-paper/[0.02] p-8 md:p-10">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
          Nothing saved yet
        </p>
        <p className="font-serif text-[18px] text-paper/80 leading-[1.65] max-w-[560px]">
          Open a Bible chapter and tap the ☆ on a verse, or right-click and
          choose <em className="not-italic text-paper">Bookmark verse</em>. The
          same on any saint writing section. What you save lands here.
        </p>
        <p className="mt-4 font-sans text-[13.5px] text-paper/55 leading-[1.55]">
          Bookmarks live in your browser. When you sign in, they sync across
          devices.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      {verses.length > 0 && (
        <Group title="Verses" count={verses.length}>
          {verses.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => remove(b.id)} />
          ))}
        </Group>
      )}
      {chapters.length > 0 && (
        <Group title="Chapters" count={chapters.length}>
          {chapters.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => remove(b.id)} />
          ))}
        </Group>
      )}
      {writings.length > 0 && (
        <Group title="Saint writings" count={writings.length}>
          {writings.map((b) => (
            <Row key={b.id} bookmark={b} onRemove={() => remove(b.id)} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55">
          {title}
        </p>
        <p className="font-sans text-[12px] text-paper/40 tabular-nums">
          {count}
        </p>
      </div>
      <ul className="divide-y divide-paper/8 border border-paper/12 rounded-md overflow-hidden">
        {children}
      </ul>
    </section>
  );
}

function hrefFor(b: Bookmark): string {
  if (b.kind === "bible-verse")
    return `/bible/${b.book}/${b.chapter}#v${b.verse}`;
  if (b.kind === "bible-chapter") return `/bible/${b.book}/${b.chapter}`;
  return `/saints/${b.saintSlug}/${b.workSlug}#s${b.sectionN}`;
}

function dateLabel(ms: number): string {
  try {
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function Row({
  bookmark,
  onRemove,
}: {
  bookmark: Bookmark;
  onRemove: () => void;
}) {
  const sub =
    bookmark.kind === "writing-section"
      ? `${bookmark.saintName} · ${bookmark.workTitle}`
      : bookmark.kind === "bible-verse"
        ? "Verse"
        : "Chapter";
  return (
    <li className="px-5 py-4 bg-paper/[0.02] flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <Link
          href={hrefFor(bookmark)}
          className="block group"
        >
          <p className="font-sans text-[15.5px] font-semibold text-paper group-hover:text-paper transition-colors truncate">
            {bookmark.kind === "writing-section"
              ? bookmark.sectionTitle
              : bookmark.label}
          </p>
          <p className="mt-1 font-sans text-[12.5px] text-paper/55 truncate">
            {sub} · added {dateLabel(bookmark.addedAt)}
          </p>
        </Link>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove bookmark"
        title="Remove bookmark"
        className="shrink-0 h-9 w-9 rounded-full border border-paper/15 text-paper/55 hover:bg-[#c1272d]/20 hover:border-[#c1272d]/40 hover:text-[#f8cac7] flex items-center justify-center text-[14px] transition-colors duration-150"
      >
        ×
      </button>
    </li>
  );
}
