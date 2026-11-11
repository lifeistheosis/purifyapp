"use client";

// Writing in the journal (1.7, the owner's note 23: "writing full screen with
// the verse or reading it came from attached on top").
//
// A sheet as tall as the screen the keyboard leaves (Sheet `fill`), so the
// line being written is never under the keyboard. Close on the start side
// (pulling the sheet down and Android's back do the same) keeps what is
// written as a draft, and Write goes on with it; Done keeps the entry. Above
// the words, what they are about: a verse with its words, a chapter, or a
// reading plan's day with its question. Then what kind of entry it is
// (Reflection, Prayer, Question), then the words, in Lora, as large as the
// reader's text.
//
// A note written on a verse is edited here too, and stays the verse's note:
// it is saved back onto its verse (lib/bible/annotations.ts) and keeps no
// kind of its own.
//
// An entry is a page (1.9, docs/1.9-build/JOURNAL.md): a title, the words,
// verse cards, quotes of one's own and highlights, with the tools that add
// them at the sheet's foot (components/journal/PageBlocks.tsx). A verse's
// note stays words alone, as it is kept on its verse.

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PageBlocks, PageToolbar } from "@/components/journal/PageBlocks";
import { SharedPageLine, SharePageButton, useJournalShare } from "@/components/journal/SharePageButton";
import { usePage } from "@/components/journal/usePage";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { JOURNAL_KINDS, MAX_BODY, type JournalDraft, type JournalKind, type JournalSource } from "@/lib/journal/entries";
import { pageIsEmpty } from "@/lib/journal/page";
import { useVerseWords } from "@/lib/saved/verseWords";

/** Each kind's name. A closed map, so every key is a literal the key test reads. */
export const KIND_KEY: Record<JournalKind, string> = {
  reflection: "journal.kind.reflection",
  prayer: "journal.kind.prayer",
  question: "journal.kind.question",
};

export function JournalComposer({
  open,
  draft,
  onChange,
  onClose,
  onDone,
  sourceLabel,
  openLink = true,
  notebooks,
}: {
  open: boolean;
  draft: JournalDraft;
  onChange: (next: JournalDraft) => void;
  /** Closes it and keeps the draft. */
  onClose: () => void;
  /** Keeps the entry. */
  onDone: () => void;
  /** What a source is called in the reader's language ("John 3:16"). */
  sourceLabel: (source: JournalSource) => string;
  /** The source's Open link; left out where the sheet was opened from the source itself (a verse's note, 1.9). */
  openLink?: boolean;
  /** Plus: the notebooks the journal's pages already name, to pick again. */
  notebooks?: readonly string[];
}) {
  const { t, locale } = useTranslate();
  const area = useRef<HTMLTextAreaElement | null>(null);
  const isNote = draft.editing?.startsWith("note:") ?? false;
  const editor = usePage(open, draft.body, (body) => onChange({ ...draft, body }));
  const { setCursor } = editor;
  const empty = isNote ? draft.body.trim().length === 0 : pageIsEmpty(editor.page);
  // A saved page may be shared (step 3), and its sharing stopped; a verse's note and a page not yet kept may not.
  const shareable = open && !!draft.editing && !isNote && !empty;
  const share = useJournalShare(shareable && draft.editing ? draft.editing : null, draft.body, editor.page.title);

  // The words grow the field, so the sheet scrolls as one page.
  const grow = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(() => {
    if (open) grow();
  }, [open, draft.body, grow]);

  // Keep the line being written in view when the keyboard comes up or the
  // words run past the bottom of the sheet.
  // A page's words run in several fields: whichever has the cursor, when it is
  // at the field's end, its last line is brought above the foot of the sheet.
  useEffect(() => {
    if (!open) return;
    const keepInView = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLTextAreaElement) || !el.closest("[data-journal-composer]")) return;
      const scroller = el.closest<HTMLElement>(".overflow-y-auto");
      if (!scroller) return;
      const atEnd = el.selectionEnd >= el.value.length - 1;
      if (!atEnd) return;
      const below = el.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom + 24;
      if (below > 0) scroller.scrollTop += below;
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", keepInView);
    document.addEventListener("focusin", keepInView);
    document.addEventListener("input", keepInView);
    return () => {
      vv?.removeEventListener("resize", keepInView);
      document.removeEventListener("focusin", keepInView);
      document.removeEventListener("input", keepInView);
    };
  }, [open]);

  // The words, ready to write, once the sheet is up: a note's field, or the
  // page's last words. A finger comes first. A reader who has put one down
  // since the sheet opened (on Title, on a kind, on a tool) keeps what they
  // chose, and nothing is moved. Until 2026-11-11 this ran whatever the
  // reader had done: Title tapped in the first third of a second took the
  // cursor, and lost it to the words when the timer came (build 93 note 8;
  // measured on the export at 140ms and at 240ms after the sheet's parts
  // stood).
  useEffect(() => {
    if (!open) return;
    let touched = false;
    const onDown = () => {
      touched = true;
    };
    document.addEventListener("pointerdown", onDown, true);
    const id = window.setTimeout(() => {
      document.removeEventListener("pointerdown", onDown, true);
      if (touched) return;
      const fields = document.querySelectorAll<HTMLTextAreaElement>("[data-journal-composer] [data-page-text] textarea");
      const el = isNote ? area.current : (fields[fields.length - 1] ?? null);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
      // The editor hears where the caret was put, so a card laid next goes
      // there, after the words, and not at the top (a caret moved by code
      // tells no one; found by the walk, reopening a kept page).
      if (!isNote) {
        const block = el.closest<HTMLElement>("[data-page-block]")?.dataset.pageBlock;
        if (block !== undefined) setCursor({ index: Number(block), start: el.value.length, end: el.value.length });
      }
    }, 320);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, isNote, setCursor]);

  const today = (() => {
    try {
      return new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long", month: "long", day: "numeric" }).format(new Date());
    } catch {
      return "";
    }
  })();

  const header = (
    <div className="flex items-center gap-2 px-3 pb-2">
      <button
        type="button"
        onClick={onClose}
        className="tap-press inline-flex min-h-11 shrink-0 items-center rounded-pill px-3 font-sans text-ui text-paper/70 hover:text-paper"
      >
        {t("common.close")}
      </button>
      <p className="min-w-0 flex-1 truncate text-center font-sans text-caption text-paper/50">{today}</p>
      {shareable ? <SharePageButton share={share} /> : null}
      <button
        type="button"
        onClick={onDone}
        disabled={empty && !draft.editing}
        data-journal-done=""
        className="tap-press inline-flex h-11 shrink-0 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-40"
      >
        {t("common.done")}
      </button>
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("journal.write")}
      fill
      // A centred panel on a computer and a tablet, the whole screen on a phone.
      desktop
      header={header}
      foot={isNote ? undefined : <PageToolbar editor={editor} notebooks={notebooks} />}
      panelClassName="md:max-w-[720px]"
      bodyClassName="pb-10"
    >
      {/* data-sheet-nodrag: a finger put down on the page (a field, a card, the
          room to write) never drags the sheet. It did: a pull of 60px that
          began on Title moved the whole sheet 42px (lib/ui/useDraggableSheet,
          the body's pull from its top). The sheet is still pulled down by its
          head, the handle and the row of Close and Done. */}
      <div data-journal-composer="" data-sheet-nodrag="">
        {shareable ? <SharedPageLine share={share} /> : null}
        {draft.source || draft.prompt ? <SourceCard source={draft.source} prompt={draft.prompt?.text} sourceLabel={sourceLabel} openLink={openLink} /> : null}

        {isNote ? null : (
          // The house's segmented switch (components/ui/SegmentedSwitch.tsx:
          // one rounded row, the chosen part filled, no word cut), as a group
          // of radios, which is what a kind is. They were three outlined
          // pills. A tap on one holds the cursor where it is, as a tool does:
          // the keyboard stays up and the words keep their place.
          <div
            role="radiogroup"
            aria-label={t("journal.kindLabel")}
            data-journal-kinds=""
            className="no-scrollbar mt-4 grid grid-flow-col auto-cols-[minmax(max-content,1fr)] gap-1 overflow-x-auto rounded-pill border border-paper/10 bg-paper/[0.03] p-1"
          >
            {JOURNAL_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={draft.kind === k}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onChange({ ...draft, kind: k })}
                className={cn(
                  "tap-press min-h-11 min-w-11 whitespace-nowrap rounded-pill px-1 font-sans text-detail font-semibold motion-safe:transition-colors",
                  draft.kind === k ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
                )}
              >
                {t(KIND_KEY[k])}
              </button>
            ))}
          </div>
        )}

        {isNote ? (
          <label className="mt-5 block">
            <span className="sr-only">{t("journal.composer.label")}</span>
            <textarea dir="auto"
              ref={area}
              value={draft.body}
              maxLength={MAX_BODY}
              rows={6}
              onChange={(e) => onChange({ ...draft, body: e.target.value })}
              // A verse's note asks for a note (1.9).
              // A note on words of another text says so (components/reading/WordsNoteSheet.tsx).
              placeholder={t(draft.editing?.startsWith("note:words:") ? "saints.words.note" : "bible.notePlaceholder")}
              // The placeholder at the house's caption share, legible on every
              // palette (55%; Light's own share in app/globals.css), not 35%.
              className="block min-h-[40vh] w-full resize-none bg-transparent font-serif text-body leading-[1.7] text-paper placeholder:text-paper/55 focus:outline-none"
            />
          </label>
        ) : (
          <PageBlocks editor={editor} placeholder={t("journal.composer.placeholder")} />
        )}
      </div>
    </Sheet>
  );
}

/** What the entry is about, above the words. */
function SourceCard({
  source,
  prompt,
  sourceLabel,
  openLink,
}: {
  source?: JournalSource;
  prompt?: string;
  sourceLabel: (source: JournalSource) => string;
  openLink: boolean;
}) {
  const { t } = useTranslate();
  const href =
    source?.type === "verse"
      ? `/bible/${source.book}/${source.chapter}#v${source.verse}`
      : source?.type === "chapter"
        ? `/bible/${source.book}/${source.chapter}`
        : source?.type === "reading"
          ? `/bible/${source.book}/${source.chapter}#v${source.from}`
          : source?.type === "plan-day"
            ? `/plans/${source.planId}`
            : null;
  return (
    <div className="border-b border-paper/10 pb-4">
      {source?.type === "verse" ? <VerseQuote book={source.book} chapter={source.chapter} verse={source.verse} /> : null}
      {prompt ? <p className="font-serif text-body leading-[1.6] text-paper">{prompt}</p> : null}
      {source ? (
        <p className="mt-1.5 flex min-w-0 items-center gap-3 font-sans text-caption text-paper/55">
          <span className="min-w-0 truncate">{sourceLabel(source)}</span>
          {href && openLink ? (
            <Link href={href} className="ms-auto inline-flex min-h-11 shrink-0 items-center px-3 font-semibold text-paper/75 underline underline-offset-4 hover:text-paper">
              {t("journal.composer.open")}
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function VerseQuote({ book, chapter, verse }: { book: string; chapter: number; verse: number }) {
  const words = useVerseWords(book, chapter, verse, true);
  if (!words.text) return null;
  return <p dir="auto" className="line-clamp-4 font-serif text-body leading-[1.6] text-paper/85">{words.text}</p>;
}
