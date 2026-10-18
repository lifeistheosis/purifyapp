"use client";

// A walk's detail, in the shared movable sheet (components/ui/Sheet.tsx, the
// kind the owner asked for on every pop-up card): a verse's note, and the
// book's chapters to go to. On every width, since the walk is the website's
// too.
//
// A note (1.7, the owner's note 24 of 2026-10-16) is words and nothing else:
// where it stands, the line that draws the reader in, the note, a Father's own
// line when it has one, the question to carry, and Keep. No drawing, no
// box, no stripe. The notes and the Father's line are English for now, and say
// so to a reader's screen reader (lang). From 1.8 a note that introduces
// someone the Church honours, or a place, also says who or what they are to
// the Church, with the person's icon, in the reader's language
// (./NoteFigures.tsx).

import { SourceLine } from "@/components/citations/SourceLine";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { useBookmarks } from "@/lib/bookmarks";
import type { ShownCite } from "@/lib/citations/cite";
import { cn } from "@/lib/cn";
import { softTick } from "@/lib/ui/softTick";
import type { ContextCard } from "@/lib/walkthroughs/types";

import { ChapterList, type WalkChapter, type WalkMovement } from "./ChapterList";
import { NoteFigures } from "./NoteFigures";

const QUOTE_OPEN = "“";
const QUOTE_CLOSE = "”";

/**
 * A verse's note. `note` stays set while the sheet slides away, so the sheet
 * leaves with its words.
 */
export function NoteSheet({
  open,
  note,
  book,
  bookName,
  bookLabel,
  chapter,
  fatherSource,
  fatherCite,
  onClose,
}: {
  open: boolean;
  note: ContextCard | null;
  book: string;
  /** The book's name as the walk's data has it, kept with the saved note. */
  bookName: string;
  /** The book's name in the reader's language, for the eye. */
  bookLabel: string;
  chapter: number;
  fatherSource: string;
  /** Where the note's Father's line stands, exactly (1.8). */
  fatherCite?: ShownCite;
  onClose: () => void;
}) {
  return (
    <Sheet open={open && note !== null} onClose={onClose} title={note?.title ?? ""} desktop>
      {note ? (
        <NoteBody note={note} book={book} bookName={bookName} bookLabel={bookLabel} chapter={chapter} fatherSource={fatherSource} fatherCite={fatherCite} />
      ) : null}
    </Sheet>
  );
}

/** What a note says, under the sheet's title (its name), and Keep. */
export function NoteBody({
  note,
  book,
  bookName,
  bookLabel,
  chapter,
  fatherSource,
  fatherCite,
}: {
  note: ContextCard;
  book: string;
  bookName: string;
  bookLabel: string;
  chapter: number;
  fatherSource: string;
  fatherCite?: ShownCite;
}) {
  const { t } = useTranslate();
  const { toggle, isBookmarked } = useBookmarks();
  const kept = isBookmarked({ kind: "walkthrough-card", cardId: note.id });

  const keep = () => {
    toggle({ kind: "walkthrough-card", book, bookName, chapter, cardId: note.id, label: note.title });
    // A note kept is felt in the phone apps, as a verse saved is. Taking it back is not.
    if (!kept) softTick();
  };

  return (
    <div data-walk-note-sheet className="pb-2">
      <p className="font-sans text-caption text-paper/55">{t("walk.verseRef", { book: bookLabel, chapter, verse: note.verse })}</p>
      <p lang="en" className="mt-2 font-serif text-lede leading-[1.4] text-paper">
        {note.hook}
      </p>
      <p lang="en" className="mt-3 font-sans text-body leading-[1.6] text-paper/80">
        {note.body}
      </p>
      <NoteFigures cardId={note.id} />

      {note.father ? (
        <figure className="mt-6">
          <blockquote lang="en" className="font-serif text-body italic leading-[1.65] text-paper/90">
            {QUOTE_OPEN}
            {note.father.excerpt}
            {QUOTE_CLOSE}
          </blockquote>
          <figcaption lang="en" className="mt-2 font-sans text-caption leading-[1.5] text-paper/55">
            {/* The line's exact place, the book and its paragraph, which it
                opens (1.8); the walk's own credit where it has none. */}
            {fatherCite ? <SourceLine cite={fatherCite} /> : fatherSource}
          </figcaption>
        </figure>
      ) : null}

      <p className="mt-6 font-sans text-caption font-semibold text-paper/55">{t("walk.carry")}</p>
      <p lang="en" className="mt-1 font-serif text-body leading-[1.5] text-paper">
        {note.question}
      </p>

      <button
        type="button"
        aria-pressed={kept}
        onClick={keep}
        className={cn(
          "tap-press mt-6 inline-flex min-h-11 items-center gap-2 rounded-pill px-5 font-sans text-ui font-semibold",
          kept ? "text-paper ring-1 ring-inset ring-paper/25" : "bg-paper text-night",
        )}
      >
        <Bookmark size={16} filled={kept} />
        {kept ? t("walk.kept") : t("walk.keep")}
      </button>
    </div>
  );
}

/** Every chapter of the walk, to go straight to one; the open one is marked. */
export function ChaptersSheet({
  open,
  onClose,
  book,
  movements,
  chapters,
  walked,
  next,
  current,
}: {
  open: boolean;
  onClose: () => void;
  book: string;
  movements: WalkMovement[];
  chapters: WalkChapter[];
  walked: ReadonlySet<number>;
  next: number | null;
  current: number;
}) {
  const { t } = useTranslate();
  return (
    <Sheet open={open} onClose={onClose} title={t("walk.chapterNav")} desktop>
      <ChapterList
        book={book}
        movements={movements}
        chapters={chapters}
        walked={walked}
        next={next}
        current={current}
        inSheet
        onPick={onClose}
      />
    </Sheet>
  );
}
