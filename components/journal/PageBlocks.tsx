"use client";

// A journal page as it is written (1.9, docs/1.9-build/JOURNAL.md, "a page"):
// a title, the writer's words, Scripture as verse cards, quotes of one's own,
// and a paragraph highlighted in one of the seven colours. The blocks are
// lib/journal/page.ts's, held by components/journal/usePage.ts; this draws
// them, and the row of tools at the sheet's foot that adds to them.
//
// Drawn from the house's own parts: the journal's Lora words, the one search
// field (components/search/SearchField.tsx) to find a verse, the highlight
// picker the Bible uses (components/bible/HighlightPicker.tsx) and its wash,
// laid line by line behind the words and never a box; icons from
// components/ui/icons; every control 44px or more; nothing physical, so the
// page reads from the start in Arabic and Urdu.

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { HighlightPicker } from "@/components/bible/HighlightPicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchField } from "@/components/search/SearchField";
import { Book } from "@/components/ui/icons/Book";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Close } from "@/components/ui/icons/Close";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { highlightVars } from "@/lib/bible/highlightPalette";
import { localBookNames, searchBible } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { verseSpan } from "@/lib/journal/churchDay";
import { BY_MAX, TITLE_MAX, VERSE_CARD_MAX, verseBlock, type PageBlock } from "@/lib/journal/page";
import { useVerseWords } from "@/lib/saved/verseWords";

import type { PageEditor } from "./usePage";

type VerseCardBlock = Extract<PageBlock, { type: "verse" }>;

/** A verse card's name in the reader's language: "John 4:13-14". */
export function useVerseCardLabel() {
  const { t } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  return (b: Pick<VerseCardBlock, "book" | "chapter" | "from" | "to">) => `${books[b.book] ?? t(`bible.books.${b.book}`)} ${b.chapter}:${verseSpan(b.from, b.to)}`;
}

export function PageBlocks({ editor, placeholder }: { editor: PageEditor; placeholder: string }) {
  const { t } = useTranslate();
  const label = useVerseCardLabel();
  const { page } = editor;
  const onlyWords = !page.title && page.blocks.length === 1;

  return (
    <div className="mt-5">
      <label className="block">
        <span className="sr-only">{t("journal.page.title")}</span>
        <input
          type="text"
          value={page.title}
          maxLength={TITLE_MAX}
          enterKeyHint="next"
          data-journal-title=""
          onChange={(e) => editor.setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            document.querySelector<HTMLTextAreaElement>('[data-journal-composer] [data-page-text] textarea')?.focus();
          }}
          placeholder={t("journal.page.title")}
          className="block h-12 w-full bg-transparent font-serif text-[24px] font-semibold leading-[1.25] text-paper placeholder:text-paper/55 focus:outline-none"
        />
      </label>

      <div className="mt-2 space-y-4">
        {page.blocks.map((b, i) => {
          const last = i === page.blocks.length - 1;
          if (b.type === "text") {
            return (
              <TextBlock
                key={`${i}-text`}
                index={i}
                block={b}
                tall={last}
                placeholder={onlyWords ? placeholder : undefined}
                onText={(text) => editor.setBlock(i, { text })}
                onCursor={(start, end) => editor.setCursor({ index: i, start, end })}
              />
            );
          }
          if (b.type === "verse") return <VerseCard key={`${i}-verse`} index={i} block={b} label={label(b)} onRemove={() => editor.remove(i)} />;
          return (
            <QuoteCard
              key={`${i}-quote`}
              index={i}
              text={b.text}
              by={b.by}
              onText={(text) => editor.setBlock(i, { text })}
              onBy={(by) => editor.setBlock(i, { by })}
              onRemove={() => editor.remove(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

/** The writer's words. In a colour, the wash lies behind them line by line, as a verse's does. */
function TextBlock({
  index,
  block,
  tall,
  placeholder,
  onText,
  onCursor,
}: {
  index: number;
  block: Extract<PageBlock, { type: "text" }>;
  tall: boolean;
  placeholder?: string;
  onText: (text: string) => void;
  onCursor: (start: number, end: number) => void;
}) {
  const { t } = useTranslate();
  const area = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    // A field that was the last, and tall, is no longer once a card goes after it.
  }, [block.text, tall]);
  const note = (e: { currentTarget: HTMLTextAreaElement }) => onCursor(e.currentTarget.selectionStart, e.currentTarget.selectionEnd);
  const words = "block w-full whitespace-pre-wrap break-words font-serif text-body leading-[1.7]";

  return (
    <div data-page-block={index} data-page-text="" className="relative">
      {block.color ? (
        // The wash, behind the words: the same text, laid out the same way,
        // its letters clear, so only the colour shows under the field's own.
        <div aria-hidden data-hl-color={block.color} style={highlightVars(block.color)} className={cn(words, "pointer-events-none absolute inset-0 text-transparent")}>
          <span className="box-decoration-clone rounded-[4px] bg-[var(--hl-verse)] px-[3px] -mx-[3px] py-[0.1em]">{block.text}</span>
          {"​"}
        </div>
      ) : null}
      <label className="relative block">
        <span className="sr-only">{t("journal.composer.label")}</span>
        <textarea
          ref={area}
          value={block.text}
          rows={tall ? 6 : 1}
          onChange={(e) => {
            onText(e.target.value);
            note(e);
          }}
          onSelect={note}
          onFocus={note}
          onClick={note}
          onKeyUp={note}
          placeholder={placeholder}
          // A line to write on is a target too: 44px at the least (touchTargets.test.ts).
          className={cn(words, "resize-none overflow-hidden bg-transparent text-paper placeholder:text-paper/55 focus:outline-none", tall ? "min-h-[30vh]" : "min-h-11")}
        />
      </label>
    </div>
  );
}

/** Scripture as a card: the words from the app's own Bible, verbatim, and where they are. Never edited here. */
function VerseCard({ index, block, label, onRemove }: { index: number; block: VerseCardBlock; label: string; onRemove: () => void }) {
  const { t } = useTranslate();
  const verses = Array.from({ length: block.to - block.from + 1 }, (_, k) => block.from + k);
  return (
    <figure data-page-block={index} data-page-verse="" className="relative rounded-2xl border border-paper/10 bg-paper/[0.04] py-3 pe-12 ps-4">
      <blockquote className="font-serif text-body leading-[1.65] text-paper/90">
        {verses.map((v) => (
          <VerseWords key={v} book={block.book} chapter={block.chapter} verse={v} numbered={verses.length > 1} />
        ))}
      </blockquote>
      <figcaption className="mt-1.5 font-sans text-caption text-paper/70">{label}</figcaption>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </figure>
  );
}

function VerseWords({ book, chapter, verse, numbered }: { book: string; chapter: number; verse: number; numbered: boolean }) {
  const words = useVerseWords(book, chapter, verse, true);
  return (
    <span>
      {numbered ? <sup className="me-1 font-sans text-[11px] font-semibold text-paper/70">{verse}</sup> : null}
      {words.text ? `${words.text} ` : words.status === "loading" ? <span aria-hidden className="me-1 inline-block h-3.5 w-40 rounded bg-paper/10 align-middle" /> : null}
    </span>
  );
}

/** A quote of one's own: the writer's words for it, and who said it, as the writer gives it. Never the library's mark. */
function QuoteCard({
  index,
  text,
  by,
  onText,
  onBy,
  onRemove,
}: {
  index: number;
  text: string;
  by: string;
  onText: (text: string) => void;
  onBy: (by: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslate();
  const area = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  return (
    <figure data-page-block={index} data-page-quote="" className="relative rounded-2xl border border-paper/10 py-3 pe-12 ps-4">
      <label className="block">
        <span className="sr-only">{t("journal.page.quotePlaceholder")}</span>
        <textarea
          ref={area}
          value={text}
          rows={1}
          onChange={(e) => onText(e.target.value)}
          placeholder={t("journal.page.quotePlaceholder")}
          className="block min-h-11 w-full resize-none overflow-hidden bg-transparent font-serif text-body italic leading-[1.65] text-paper placeholder:text-paper/55 focus:outline-none"
        />
      </label>
      <label className="-mt-2 block">
        <span className="sr-only">{t("journal.page.quoteBy")}</span>
        <input
          type="text"
          value={by}
          maxLength={BY_MAX}
          onChange={(e) => onBy(e.target.value)}
          placeholder={t("journal.page.quoteBy")}
          className="block h-11 w-full bg-transparent font-sans text-[16px] text-paper/85 placeholder:text-paper/55 focus:outline-none"
        />
      </label>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </figure>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-press absolute end-0.5 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-paper/70 hover:text-paper"
    >
      <Close size={16} />
    </button>
  );
}

// ── The tools, at the sheet's foot ───────────────────────────────────────

type Panel = "verse" | "color" | null;

/**
 * The row under the page, above the keyboard: Verse finds a verse and lays
 * its card where the cursor is; Quote opens a quote of one's own there;
 * Highlight colours the paragraph the cursor is in. Verse and Highlight open
 * their panel over the row and close it again.
 */
export function PageToolbar({ editor }: { editor: PageEditor }) {
  const { t } = useTranslate();
  const [panel, setPanel] = useState<Panel>(null);
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  const target = panel === "color" ? editor.colorTarget() : null;
  const targetBlock = target !== null ? editor.page.blocks[target] : null;
  const active = targetBlock?.type === "text" ? (targetBlock.color ?? null) : null;

  return (
    <div data-page-toolbar="" className="border-t border-paper/10 bg-night">
      {panel === "verse" ? (
        <VerseFinder
          onPick={(b) => {
            editor.insert(b);
            setPanel(null);
          }}
        />
      ) : null}
      {panel === "color" && target !== null ? (
        <HighlightPicker
          className="px-2 pt-1"
          active={active}
          hint={t("journal.page.highlightHint")}
          onPick={(id) => {
            editor.setColor(target, id);
            setPanel(null);
          }}
          onRemove={() => {
            editor.setColor(target, null);
            setPanel(null);
          }}
          onNames={(id) => setNaming(id)}
        />
      ) : null}
      <div role="toolbar" aria-label={t("journal.page.tools")} className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-thin">
        <Tool icon={<Book size={18} />} label={t("journal.page.addVerse")} pressed={panel === "verse"} onClick={() => setPanel(panel === "verse" ? null : "verse")} />
        <Tool
          icon={<ChatBubble size={18} />}
          label={t("journal.page.addQuote")}
          onClick={() => {
            setPanel(null);
            editor.insert({ type: "quote", text: "", by: "" });
          }}
        />
        <Tool
          icon={<Sparkle size={18} />}
          label={t("journal.page.highlight")}
          pressed={panel === "color"}
          disabled={editor.colorTarget() === null}
          onClick={() => setPanel(panel === "color" ? null : "color")}
        />
      </div>
      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
    </div>
  );
}

function Tool({ icon, label, pressed, disabled, onClick }: { icon: ReactNode; label: string; pressed?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      // The keyboard stays up: a tool takes no focus from the words.
      onPointerDown={(e) => e.preventDefault()}
      className={cn(
        "tap-press inline-flex h-11 shrink-0 items-center gap-2 rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors disabled:opacity-40",
        pressed ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/85 hover:border-paper/35 hover:text-paper",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** Find a verse as the Bible's search does ("John 3:16", "Jn 3:16-18", in the reader's own language), and lay its card. */
function VerseFinder({ onPick }: { onPick: (block: PageBlock) => void }) {
  const { t } = useTranslate();
  const label = useVerseCardLabel();
  const books = useMemo(() => localBookNames(t), [t]);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const found = useMemo(() => {
    const out: VerseCardBlock[] = [];
    for (const h of searchBible(q, 6, {}, books)) {
      const b =
        h.kind === "verse"
          ? verseBlock(h.book.slug, h.chapter, h.verse)
          : h.kind === "range"
            ? verseBlock(h.book.slug, h.chapter, h.verseFrom, Math.min(h.verseTo, h.verseFrom + VERSE_CARD_MAX - 1))
            : null;
      if (b && b.type === "verse" && !out.some((o) => o.book === b.book && o.chapter === b.chapter && o.from === b.from && o.to === b.to)) out.push(b);
      if (out.length === 3) break;
    }
    return out;
  }, [q, books]);

  return (
    <div data-page-verse-finder="" className="px-3 pt-2">
      <SearchField value={q} onChange={setQ} inputRef={input} placeholder={t("journal.page.versePlaceholder")} onSubmit={() => (found[0] ? onPick(found[0]) : undefined)} />
      {found.length > 0 ? (
        <ul className="mt-1">
          {found.map((b) => (
            <li key={`${b.book}-${b.chapter}-${b.from}-${b.to}`}>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onPick(b)}
                className="tap-press flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-start font-sans text-ui text-paper hover:bg-paper/[0.06]"
              >
                <Book size={18} className="shrink-0 text-paper/70" />
                {label(b)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
