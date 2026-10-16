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

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { JOURNAL_KINDS, MAX_BODY, type JournalDraft, type JournalKind, type JournalSource } from "@/lib/journal/entries";
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
}) {
  const { t, locale } = useTranslate();
  const area = useRef<HTMLTextAreaElement | null>(null);
  const isNote = draft.editing?.startsWith("note:") ?? false;
  const empty = draft.body.trim().length === 0;

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
  useEffect(() => {
    if (!open) return;
    const keepInView = () => {
      const el = area.current;
      if (!el || document.activeElement !== el) return;
      const scroller = el.closest<HTMLElement>(".overflow-y-auto");
      if (!scroller) return;
      const atEnd = el.selectionEnd >= el.value.length - 1;
      if (atEnd) scroller.scrollTop = scroller.scrollHeight;
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", keepInView);
    const el = area.current;
    el?.addEventListener("focusin", keepInView);
    el?.addEventListener("input", keepInView);
    return () => {
      vv?.removeEventListener("resize", keepInView);
      el?.removeEventListener("focusin", keepInView);
      el?.removeEventListener("input", keepInView);
    };
  }, [open]);

  // The words, ready to write, once the sheet is up.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const el = area.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }, 320);
    return () => window.clearTimeout(id);
  }, [open]);

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
      panelClassName="md:max-w-[720px]"
      bodyClassName="pb-10"
    >
      <div data-journal-composer="">
        {draft.source || draft.prompt ? <SourceCard source={draft.source} prompt={draft.prompt?.text} sourceLabel={sourceLabel} /> : null}

        {isNote ? null : (
          <div role="radiogroup" aria-label={t("journal.kindLabel")} className="mt-4 flex flex-wrap gap-2">
            {JOURNAL_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={draft.kind === k}
                onClick={() => onChange({ ...draft, kind: k })}
                className={cn(
                  "tap-press hit-44 inline-flex min-h-9 items-center rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
                  draft.kind === k ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
                )}
              >
                {t(KIND_KEY[k])}
              </button>
            ))}
          </div>
        )}

        <label className="mt-5 block">
          <span className="sr-only">{t("journal.composer.label")}</span>
          <textarea
            ref={area}
            value={draft.body}
            maxLength={MAX_BODY}
            rows={6}
            onChange={(e) => onChange({ ...draft, body: e.target.value })}
            placeholder={t("journal.composer.placeholder")}
            className="block min-h-[40vh] w-full resize-none bg-transparent font-serif text-body leading-[1.7] text-paper placeholder:text-paper/35 focus:outline-none"
          />
        </label>
      </div>
    </Sheet>
  );
}

/** What the entry is about, above the words. */
function SourceCard({
  source,
  prompt,
  sourceLabel,
}: {
  source?: JournalSource;
  prompt?: string;
  sourceLabel: (source: JournalSource) => string;
}) {
  const { t } = useTranslate();
  const href =
    source?.type === "verse"
      ? `/bible/${source.book}/${source.chapter}#v${source.verse}`
      : source?.type === "chapter"
        ? `/bible/${source.book}/${source.chapter}`
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
          {href ? (
            <Link href={href} className="ms-auto inline-flex min-h-11 shrink-0 items-center px-1 font-semibold text-paper/75 underline underline-offset-4 hover:text-paper">
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
  return <p className="line-clamp-4 font-serif text-body leading-[1.6] text-paper/85">{words.text}</p>;
}
