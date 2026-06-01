"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { getBook, getOldTestament, getNewTestament } from "@/lib/bible/books";

/**
 * Bottom-sheet book + chapter picker for the mobile Bible reader.
 * Step 1: pick a book (OT / NT toggle, scrollable list).
 * Step 2: tap a chapter number from a grid.
 *
 * Routing closes the sheet and navigates to `/bible/{slug}/{chapter}`.
 * The sheet primitive handles backdrop / Escape / overlay-flag wiring.
 */
export function MobileChapterSheet({
  open,
  onClose,
  currentSlug,
  currentChapter,
}: {
  open: boolean;
  onClose: () => void;
  currentSlug: string;
  currentChapter: number;
}) {
  const router = useRouter();
  const currentBook = getBook(currentSlug);
  const initialTestament = (currentBook?.testament ?? "OT") as "OT" | "NT";

  // Two-step picker: book first, then chapter. Default to the currently-
  // open book so a reader landing here can just hit a chapter and go.
  const [testament, setTestament] = useState<"OT" | "NT">(initialTestament);
  const [pickedBookSlug, setPickedBookSlug] = useState<string>(currentSlug);

  const books = testament === "OT" ? getOldTestament() : getNewTestament();
  const pickedBook = getBook(pickedBookSlug);

  function go(slug: string, chapter: number) {
    onClose();
    router.push(`/bible/${slug}/${chapter}`);
  }

  // Reset to current book whenever the sheet re-opens.
  function handleClose() {
    setPickedBookSlug(currentSlug);
    setTestament(initialTestament);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={pickedBook ? pickedBook.name : "Pick a book"}
    >
      {/* OT / NT toggle */}
      <div className="mb-3 inline-flex rounded-pill border border-paper/15 bg-paper/[0.03] p-0.5 text-caption font-medium">
        {(["OT", "NT"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTestament(t)}
            className={
              "px-4 h-8 inline-flex items-center rounded-pill transition-colors " +
              (testament === t
                ? "bg-gold text-night"
                : "text-paper/70 hover:text-paper")
            }
          >
            {t === "OT" ? "Old" : "New"} Testament
          </button>
        ))}
      </div>

      {/* Step 1: book list */}
      <div className="mb-5">
        <ul className="grid grid-cols-2 gap-1">
          {books.map((b) => {
            const isPicked = b.slug === pickedBookSlug;
            return (
              <li key={b.slug}>
                <button
                  type="button"
                  onClick={() => setPickedBookSlug(b.slug)}
                  className={
                    "w-full text-left rounded-md px-3 py-2 font-sans text-detail truncate " +
                    (isPicked
                      ? "bg-gold/15 text-paper border border-gold/45"
                      : "text-paper/75 hover:bg-paper/[0.04] border border-transparent")
                  }
                >
                  {b.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Step 2: chapter grid for the picked book */}
      {pickedBook ? (
        <div>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
            Chapter
          </p>
          <ul className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {Array.from({ length: pickedBook.chapters }, (_, i) => i + 1).map(
              (n) => {
                const isCurrent =
                  pickedBookSlug === currentSlug && n === currentChapter;
                return (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => go(pickedBookSlug, n)}
                      className={
                        "w-full aspect-square inline-flex items-center justify-center rounded-md font-sans text-detail font-semibold tabular-nums transition-colors " +
                        (isCurrent
                          ? "bg-gold text-night"
                          : "bg-paper/[0.04] text-paper/85 hover:bg-paper/10 border border-paper/10")
                      }
                    >
                      {n}
                    </button>
                  </li>
                );
              },
            )}
          </ul>
        </div>
      ) : null}
    </Sheet>
  );
}
