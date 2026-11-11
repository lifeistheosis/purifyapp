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

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { HighlightPicker } from "@/components/bible/HighlightPicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchField } from "@/components/search/SearchField";
import { Book } from "@/components/ui/icons/Book";
import { Candle } from "@/components/ui/icons/Candle";
import { ChatBubble } from "@/components/ui/icons/ChatBubble";
import { Check } from "@/components/ui/icons/Check";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Close } from "@/components/ui/icons/Close";
import { Cross } from "@/components/ui/icons/Cross";
import { Heart } from "@/components/ui/icons/Heart";
import { Info } from "@/components/ui/icons/Info";
import { Minus } from "@/components/ui/icons/Minus";
import { Heading } from "@/components/ui/icons/Heading";
import { Plus } from "@/components/ui/icons/Plus";
import { Highlighter } from "@/components/ui/icons/Highlighter";
import { Quill } from "@/components/ui/icons/Quill";
import { Star } from "@/components/ui/icons/Star";
import { highlightVars } from "@/lib/bible/highlightPalette";
import { localBookNames, searchBible } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { COVERS, coverById } from "@/lib/journal/covers";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { verseSpan } from "@/lib/journal/churchDay";
import {
  BY_MAX,
  CALLOUT_ICONS,
  cleanNotebook,
  cleanTags,
  NOTEBOOK_MAX,
  TAG_MAX,
  TAGS_MAX,
  DIVIDER_STYLES,
  emptyQuoteAt,
  HEADING_MAX,
  ITEM_MAX,
  TITLE_MAX,
  VERSE_CARD_MAX,
  verseAt,
  verseBlock,
  type CalloutIcon,
  type CheckItem,
  type PageBlock,
} from "@/lib/journal/page";
import { useVerseRangeWords } from "@/lib/saved/verseWords";

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
  const locked = usePlusFeatures() === false;
  const upgrade = useUpgradeModal();
  // Plus: the page's style, from the house's own (lib/journal/page.ts): the
  // writer's words in Lora or DM Sans, at the start or the centre. Scripture
  // and the library keep the house's Lora: they are not the writer's words.
  const font = page.style?.font === "sans" ? "font-sans" : "font-serif";
  const align = page.style?.align === "center" ? "text-center" : "text-start";

  const cover = coverById(page.cover);
  const hasProps = !!page.notebook || (page.tags?.length ?? 0) > 0;
  return (
    <div className="mt-5">
      {/* Plus: the page's cover, edge to edge, credited under it (lib/journal/covers.ts). */}
      {cover ? (
        <figure data-page-cover="" className="-mx-4 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a file the apps carry; the export has no image server */}
          <img src={cover.src} alt={cover.alt} className="block h-40 w-full object-cover" />
          <figcaption className="mt-1 px-4 font-sans text-[12px] text-paper/70">{cover.credit}</figcaption>
        </figure>
      ) : null}
      <label className="block">
        <span className="sr-only">{t("journal.page.title")}</span>
        <input dir="auto"
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
          className={cn("block h-12 w-full bg-transparent text-[24px] font-semibold leading-[1.25] text-paper placeholder:text-paper/55 focus:outline-none", font, align)}
        />
      </label>

      {/* Plus: the page's notebook and tags, one quiet line under the title
          once the page has them; a tap opens them at the sheet's foot. With
          none, nothing stands here. Until 2026-11-11 "Add to a notebook" stood
          under every title, touching it: a door to Plus in the first place a
          thumb goes, which a reader without Plus met when they meant Title
          (build 93 note 8). The door is in More now, with Plus's other
          choices (PageToolbar). */}
      {hasProps ? (
        <button
          type="button"
          data-page-props=""
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            if (locked) upgrade.open("journal");
            else editor.setPanel(editor.panel === "props" ? null : "props");
          }}
          className="tap-press flex min-h-11 w-full min-w-0 items-center gap-2 text-start font-sans text-caption text-paper/70 hover:text-paper"
        >
          <ClosedBook size={16} className="shrink-0" />
          <span className="min-w-0 truncate">{[page.notebook, ...(page.tags ?? []).map((tag) => `#${tag}`)].filter(Boolean).join(" · ")}</span>
          {locked ? <PlusMark className="ms-auto shrink-0" /> : null}
        </button>
      ) : null}

      <div className="mt-2 space-y-4">
        {page.blocks.map((b, i) => {
          const last = i === page.blocks.length - 1;
          if (b.type === "text") {
            return (
              <TextBlock
                key={`${i}-text`}
                index={i}
                block={b}
                look={cn(font, align)}
                tall={last}
                // The place to write always says so. Until 2026-11-11 it said so
                // only on a page with nothing else: once a card was laid, the
                // words after it were an empty field with no word in it.
                placeholder={last ? placeholder : undefined}
                onText={(text) => editor.setBlock(i, { text })}
                onCursor={(start, end) => editor.setCursor({ index: i, start, end })}
              />
            );
          }
          if (b.type === "verse") return <VerseCard key={`${i}-verse`} index={i} block={b} label={label(b)} noticed={editor.noticed === i} onRemove={() => editor.remove(i)} />;
          if (b.type === "library") return <LibraryCard key={`${i}-library`} index={i} block={b} onRemove={() => editor.remove(i)} />;
          if (b.type === "heading")
            return <HeadingBlock key={`${i}-heading`} index={i} text={b.text} look={cn(font, align)} onText={(text) => editor.setBlock(i, { text })} onRemove={() => editor.remove(i)} />;
          if (b.type === "check") return <CheckBlock key={`${i}-check`} index={i} items={b.items} onItems={(items) => (items.length ? editor.setBlock(i, { items }) : editor.remove(i))} />;
          if (b.type === "divider") return <DividerBlock key={`${i}-divider`} index={i} style={b.style} onStyle={(style) => editor.setBlock(i, { style })} onRemove={() => editor.remove(i)} />;
          if (b.type === "callout")
            return <CalloutBlock key={`${i}-callout`} index={i} icon={b.icon} text={b.text} onIcon={(icon) => editor.setBlock(i, { icon })} onText={(text) => editor.setBlock(i, { text })} onRemove={() => editor.remove(i)} />;
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
  look,
  tall,
  placeholder,
  onText,
  onCursor,
}: {
  index: number;
  block: Extract<PageBlock, { type: "text" }>;
  /** The page's style: its font and where its words stand. */
  look: string;
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
  const words = cn("block w-full whitespace-pre-wrap break-words text-body leading-[1.7]", look);

  return (
    <div data-page-block={index} data-page-text="" className="relative">
      {block.color ? (
        // The wash, behind the words: the same text, laid out the same way,
        // its letters clear, so only the colour shows under the field's own.
        <div aria-hidden dir="auto" data-hl-color={block.color} style={highlightVars(block.color)} className={cn(words, "pointer-events-none absolute inset-0 text-transparent")}>
          <span className="box-decoration-clone rounded-[4px] bg-[var(--hl-verse)] px-[3px] -mx-[3px] py-[0.1em]">{block.text}</span>
          {"​"}
        </div>
      ) : null}
      <label className="relative block">
        <span className="sr-only">{t("journal.composer.label")}</span>
        <textarea dir="auto"
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

/**
 * What each block is from, in one line: its mark and its name. The mark is
 * its tool's own glyph, so a reader tells the three apart at a glance: the
 * Book for Scripture, the Quill for the Fathers, the speech mark for a quote
 * of one's own. The line the Florilegium's gathered lines carry
 * (components/florilegium/FlorilegiumDetail.tsx, ItemCard).
 */
const BLOCK_SOURCE = "inline-flex min-w-0 items-center gap-2 font-sans text-caption font-semibold text-paper/65";
/**
 * Where a block's words begin: under its name, past its mark (15px and the
 * 8px after it). So the marks hang in the margin and everything brought onto
 * the page is set in from the writer's own words, which alone stand at the
 * margin: what is set in is not mine. An indent, never a rule.
 */
const BLOCK_INSET = "ps-[23px]";

/**
 * Scripture on the page: its place as its heading, which opens the passage at
 * the verse, and under it the words from the app's own Bible, verbatim, in the
 * size the app reads at. Never edited here.
 *
 * Until 2026-11-11 a verse, a quote of one's own and a quote from the library
 * were three boxes alike, the verse's place a small line at its foot (build 93
 * note 8, the owner: "I want all of them to actually be unique in their
 * context and their use"). Now none is in a box and none stands beside a rule
 * (CLAUDE.md, "No side stripes"): each is told by its mark and its own shape.
 */
function VerseCard({ index, block, label, noticed, onRemove }: { index: number; block: VerseCardBlock; label: string; noticed: boolean; onRemove: () => void }) {
  const { t } = useTranslate();
  const verses = Array.from({ length: block.to - block.from + 1 }, (_, k) => block.from + k);
  return (
    <figure
      data-page-block={index}
      data-page-verse=""
      data-page-noticed={noticed ? "" : undefined}
      // Asked for a second time, the verse is not laid again: it is brought
      // into view and lit for a moment (usePage, show).
      className={cn("relative -mx-2 rounded-2xl pb-1.5 pe-12 ps-2 motion-safe:transition-colors motion-safe:duration-500", noticed ? "bg-paper/[0.09]" : "bg-paper/0")}
    >
      <figcaption>
        <Link href={`/bible/${block.book}/${block.chapter}#v${block.from}`} data-page-verse-place="" className={cn(BLOCK_SOURCE, "min-h-11 hover:text-paper")}>
          <Book size={15} aria-hidden className="shrink-0 text-paper/55" />
          <span className="min-w-0">{label}</span>
        </Link>
      </figcaption>
      <VerseCardWords block={block} verses={verses} />
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </figure>
  );
}

/**
 * The card's words, from the app's own Bible: kept on the device, or asked
 * for once and kept (lib/saved/verseWords.ts). With no signal and nothing
 * kept, the card says so and opens the passage, which the apps carry, as a
 * saved verse does: never a row of bare verse numbers.
 */
function VerseCardWords({ block, verses }: { block: VerseCardBlock; verses: number[] }) {
  const { t } = useTranslate();
  const words = useVerseRangeWords(block.book, block.chapter, block.from, block.to, true);
  const states = verses.map((v, i) => ({ v, words: words[i] ?? { text: null, status: "loading" as const } }));
  if (states.every((s) => s.words.status === "missing")) {
    return (
      <span className={cn("block", BLOCK_INSET)}>
        <Link href={`/bible/${block.book}/${block.chapter}#v${block.from}`} className="-mt-1.5 inline-flex min-h-11 items-center font-sans text-detail text-paper/70 underline underline-offset-4 hover:text-paper">
          {t("saved.openToRead")}
        </Link>
      </span>
    );
  }
  return (
    <blockquote dir="auto" className={cn("font-serif text-body leading-[1.7] text-paper/90", BLOCK_INSET)}>
      {states.map(({ v, words }) =>
        words.text ? (
          <span key={v}>
            {verses.length > 1 ? <sup className="me-1 font-sans text-[11px] font-semibold text-paper/70">{v}</sup> : null}
            {`${words.text} `}
          </span>
        ) : words.status === "loading" ? (
          <span key={v} aria-hidden className="me-1 inline-block h-3.5 w-40 rounded bg-paper/10 align-middle" />
        ) : null,
      )}
    </blockquote>
  );
}

/**
 * A quote from Purify's library (Quote in journal): the words as the page has
 * them, never edited here as the source's; then the library's mark, which
 * only these wear, with the page they are from as the way back to it. The
 * shape a Father's line has in the Florilegium.
 */
function LibraryCard({ index, block, onRemove }: { index: number; block: Extract<PageBlock, { type: "library" }>; onRemove: () => void }) {
  const { t } = useTranslate();
  return (
    <figure data-page-block={index} data-page-library="" className="relative pe-12">
      <blockquote dir="auto" className={cn("whitespace-pre-line font-serif text-body leading-[1.7] text-paper/90", BLOCK_INSET)}>
        {block.text}
      </blockquote>
      <figcaption>
        <Link href={block.href} data-page-library-source="" className={cn(BLOCK_SOURCE, "min-h-11 hover:text-paper")}>
          <Quill size={15} aria-hidden className="shrink-0 text-paper/55" />
          <span dir="auto" className="min-w-0">
            {block.cite || t("journal.page.fromLibrary")}
          </span>
        </Link>
        {/* Under a source's name, what kind of quote this is, where the name begins. */}
        {block.cite ? <p className={cn("-mt-2 pb-1 font-sans text-caption text-paper/60", BLOCK_INSET)}>{t("journal.page.fromLibrary")}</p> : null}
      </figcaption>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </figure>
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
    <figure data-page-block={index} data-page-quote="" className="relative pe-12">
      <label className="block">
        <span className="sr-only">{t("journal.page.quotePlaceholder")}</span>
        <textarea dir="auto"
          ref={area}
          value={text}
          rows={1}
          onChange={(e) => onText(e.target.value)}
          placeholder={t("journal.page.quotePlaceholder")}
          className={cn("block min-h-11 w-full resize-none overflow-hidden bg-transparent font-serif text-body italic leading-[1.7] text-paper placeholder:text-paper/55 focus:outline-none", BLOCK_INSET)}
        />
      </label>
      {/* Who said it, behind the speech mark: the writer's own word for it, typed here. */}
      <label className="-mt-1 flex items-center gap-2">
        <ChatBubble size={15} aria-hidden className="shrink-0 text-paper/55" />
        <span className="sr-only">{t("journal.page.quoteBy")}</span>
        <input dir="auto"
          type="text"
          value={by}
          maxLength={BY_MAX}
          onChange={(e) => onBy(e.target.value)}
          placeholder={t("journal.page.quoteBy")}
          className="block h-11 min-w-0 flex-1 bg-transparent font-sans text-[16px] text-paper/85 placeholder:text-paper/55 focus:outline-none"
        />
      </label>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </figure>
  );
}

// ── Plus's blocks (step 2) ───────────────────────────────────────────────

/** A heading inside the page, in Lora. */
function HeadingBlock({ index, text, look, onText, onRemove }: { index: number; text: string; look: string; onText: (text: string) => void; onRemove: () => void }) {
  const { t } = useTranslate();
  return (
    <div data-page-block={index} data-page-heading-block="" className="relative pe-12">
      <label className="block">
        <span className="sr-only">{t("journal.page.heading")}</span>
        <input dir="auto"
          type="text"
          value={text}
          maxLength={HEADING_MAX}
          data-page-heading=""
          onChange={(e) => onText(e.target.value)}
          placeholder={t("journal.page.headingPlaceholder")}
          className={cn("block min-h-11 w-full bg-transparent text-[20px] font-semibold leading-[1.3] text-paper placeholder:text-paper/55 focus:outline-none", look)}
        />
      </label>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </div>
  );
}

/**
 * A checklist: each line with its box, 44px to tap. Enter makes a new line
 * under it; Backspace on an empty line takes it away, and the list goes with
 * its last line.
 */
function CheckBlock({ index, items, onItems }: { index: number; items: CheckItem[]; onItems: (items: CheckItem[]) => void }) {
  const { t } = useTranslate();
  const root = useRef<HTMLUListElement | null>(null);
  // The new line is drawn at once and takes the cursor in the same keystroke,
  // so the next letter typed goes to it, however fast the writer types (found
  // on the built app: with the cursor moved a frame later, the first letter
  // landed on the line above).
  const change = (next: CheckItem[], focusAt: number | null) => {
    flushSync(() => onItems(next));
    if (focusAt === null) return;
    const el = root.current?.querySelectorAll<HTMLInputElement>("input")[focusAt];
    el?.focus({ preventScroll: true });
    el?.setSelectionRange(el.value.length, el.value.length);
  };
  return (
    <ul data-page-block={index} data-page-check="" ref={root} className="space-y-0.5">
      {items.map((item, k) => (
        <li key={k} className="flex items-center gap-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            aria-label={item.text || t("journal.page.itemPlaceholder")}
            onClick={() => onItems(items.map((x, j) => (j === k ? { ...x, done: !x.done } : x)))}
            className="tap-press -ms-2.5 grid h-11 w-11 shrink-0 place-items-center"
          >
            <span
              aria-hidden
              className={cn(
                "grid h-[22px] w-[22px] place-items-center rounded-md border motion-safe:transition-colors",
                item.done ? "border-paper bg-paper text-night" : "border-paper/45 text-transparent",
              )}
            >
              <Check size={15} strokeWidth={2.6} />
            </span>
          </button>
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("journal.page.itemPlaceholder")}</span>
            <input dir="auto"
              type="text"
              value={item.text}
              maxLength={ITEM_MAX}
              enterKeyHint="next"
              onChange={(e) => onItems(items.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  change([...items.slice(0, k + 1), { text: "", done: false }, ...items.slice(k + 1)], k + 1);
                } else if (e.key === "Backspace" && !item.text) {
                  e.preventDefault();
                  change(
                    items.filter((_, j) => j !== k),
                    k > 0 ? k - 1 : null,
                  );
                }
              }}
              placeholder={t("journal.page.itemPlaceholder")}
              className={cn(
                "block h-11 w-full bg-transparent font-serif text-body leading-[1.5] placeholder:text-paper/55 focus:outline-none",
                item.done ? "text-paper/70 line-through decoration-paper/45" : "text-paper",
              )}
            />
          </label>
        </li>
      ))}
    </ul>
  );
}

/** A divider from the house's three: a plain line, three dots, or a space. A tap gives the next. */
function DividerBlock({ index, style, onStyle, onRemove }: { index: number; style: (typeof DIVIDER_STYLES)[number]; onStyle: (style: (typeof DIVIDER_STYLES)[number]) => void; onRemove: () => void }) {
  const { t } = useTranslate();
  const next = DIVIDER_STYLES[(DIVIDER_STYLES.indexOf(style) + 1) % DIVIDER_STYLES.length];
  return (
    <div data-page-block={index} data-page-divider={style} className="relative flex items-center pe-12">
      <button type="button" onClick={() => onStyle(next)} aria-label={t("journal.page.dividerChange")} className="tap-press grid h-11 min-w-0 flex-1 place-items-center">
        {style === "line" ? (
          <span aria-hidden className="block h-px w-full bg-paper/25" />
        ) : style === "dots" ? (
          <span aria-hidden className="flex gap-3">
            {[0, 1, 2].map((d) => (
              <span key={d} className="block size-1 rounded-full bg-paper/60" />
            ))}
          </span>
        ) : (
          <span aria-hidden className="block h-px w-full" />
        )}
      </button>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </div>
  );
}

const CALLOUT_ICON: Record<CalloutIcon, (p: { size?: number }) => ReactNode> = {
  candle: (p) => <Candle {...p} />,
  cross: (p) => <Cross {...p} />,
  info: (p) => <Info {...p} />,
  heart: (p) => <Heart {...p} />,
  star: (p) => <Star {...p} />,
};

/** Words set apart: a soft box, never a side stripe, with an icon from the house's set; a tap on the icon gives the next. */
function CalloutBlock({
  index,
  icon,
  text,
  onIcon,
  onText,
  onRemove,
}: {
  index: number;
  icon: CalloutIcon;
  text: string;
  onIcon: (icon: CalloutIcon) => void;
  onText: (text: string) => void;
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
  const next = CALLOUT_ICONS[(CALLOUT_ICONS.indexOf(icon) + 1) % CALLOUT_ICONS.length];
  return (
    <div data-page-block={index} data-page-callout={icon} className="relative flex items-start gap-1 rounded-2xl bg-paper/[0.07] py-1.5 pe-12 ps-1.5">
      <button type="button" onClick={() => onIcon(next)} aria-label={t("journal.page.calloutIcon")} className="tap-press grid h-11 w-11 shrink-0 place-items-center text-paper/85">
        {CALLOUT_ICON[icon]({ size: 20 })}
      </button>
      <label className="min-w-0 flex-1 py-1.5">
        <span className="sr-only">{t("journal.page.callout")}</span>
        <textarea dir="auto"
          ref={area}
          value={text}
          rows={1}
          onChange={(e) => onText(e.target.value)}
          placeholder={t("journal.page.calloutPlaceholder")}
          className="block min-h-11 w-full resize-none overflow-hidden bg-transparent font-serif text-body leading-[1.65] text-paper placeholder:text-paper/55 focus:outline-none"
        />
      </label>
      <RemoveButton onClick={onRemove} label={t("common.remove")} />
    </div>
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


/**
 * The row under the page, above the keyboard: Verse finds a verse and lays
 * its card where the cursor is; Quote opens a quote of one's own there;
 * Highlight colours the paragraph the cursor is in, and with nothing written
 * says so. Verse and Highlight open their panel over the row and close it
 * again. No tool is ever dim: each one tapped does or says something.
 */
export function PageToolbar({ editor, notebooks = [] }: { editor: PageEditor; notebooks?: readonly string[] }) {
  const { t } = useTranslate();
  const { panel, setPanel } = editor;
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  const target = panel === "color" ? editor.colorTarget() : null;
  // Plus's blocks are shown, never hidden: without Plus each wears the mark
  // and opens the upgrade sheet named for the journal.
  const locked = usePlusFeatures() === false;
  const upgrade = useUpgradeModal();
  const addPlus = (block: PageBlock) => {
    setPanel(null);
    if (locked) upgrade.open("journal");
    else editor.insert(block);
  };
  const targetBlock = target !== null ? editor.page.blocks[target] : null;
  const active = targetBlock?.type === "text" ? (targetBlock.color ?? null) : null;

  return (
    <div data-page-toolbar="" className="border-t border-paper/10 bg-night">
      {panel === "verse" ? (
        <VerseFinder
          onPick={(b) => {
            // A verse is laid once: asked for again, its card is shown.
            const at = verseAt(editor.page.blocks, b);
            if (at >= 0) editor.show(at);
            else editor.insert(b);
            setPanel(null);
          }}
        />
      ) : null}
      {panel === "color" && target !== null ? (
        // The colours take no cursor from the words, as the tools do not: a
        // colour chosen, the writer goes on writing. Until 2026-11-11 a tap on
        // a colour left the cursor nowhere, and on a phone the keyboard fell.
        <div data-page-colors="" onPointerDown={(e) => e.preventDefault()}>
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
        </div>
      ) : null}
      {panel === "color" && target === null ? (
        // Nothing written to mark yet. The tool is lit all the same, and says
        // so where its colours would open; until 2026-11-11 it went dim with no
        // word of why. Once there are words the colours take this line's place.
        <p data-page-highlight-none="" aria-live="polite" className="flex min-h-11 items-center px-5 pt-1 font-sans text-caption font-semibold text-paper/85">
          {t("journal.page.highlightNone")}
        </p>
      ) : null}
      {panel === "props" ? <PropsPanel editor={editor} notebooks={notebooks} onDone={() => setPanel(null)} /> : null}
      {panel === "more" ? (
        // Rows, one under another, each with its whole name, as the rows on You
        // are drawn (components/you/YouRows.tsx). Until 2026-11-11 they were
        // tiles two across, and for a reader without Plus the mark left only
        // "H...", "C...", "D..." and "C..." to choose between (the walk on an
        // export that sells Plus). The padlock alone did not mend it: on a
        // 360px phone five languages still lost a word.
        <div data-page-more="" className="max-h-[45vh] space-y-2 overflow-y-auto px-3 pt-2">
          <ul className={MORE_TRAY}>
            <MoreChoice icon={<Heading size={18} />} label={t("journal.page.heading")} locked={locked} onClick={() => addPlus({ type: "heading", text: "" })} />
            <MoreChoice icon={<Check size={18} />} label={t("journal.page.checklist")} locked={locked} onClick={() => addPlus({ type: "check", items: [{ text: "", done: false }] })} />
            <MoreChoice icon={<Minus size={18} />} label={t("journal.page.divider")} locked={locked} onClick={() => addPlus({ type: "divider", style: "line" })} />
            <MoreChoice icon={<Candle size={18} />} label={t("journal.page.callout")} locked={locked} onClick={() => addPlus({ type: "callout", icon: "candle", text: "" })} />
          </ul>
          {/* The page's own: its notebook, its tags, its look. A tray of its own, under the blocks. */}
          <ul className={MORE_TRAY}>
            <MoreChoice
              page
              icon={<ClosedBook size={18} />}
              label={editor.page.notebook || t("journal.page.addToNotebook")}
              locked={locked}
              onClick={() => {
                if (locked) {
                  setPanel(null);
                  upgrade.open("journal");
                } else setPanel("props");
              }}
            />
          </ul>
        </div>
      ) : null}
      {/* Four tiles, each a quarter of the row, the icon over its name: the row
          fits a 360px phone in every language, and never scrolls sideways. */}
      <div role="toolbar" aria-label={t("journal.page.tools")} className="grid grid-cols-4 gap-1 px-2 py-1.5">
        <Tool icon={<Book size={18} />} label={t("journal.page.addVerse")} pressed={panel === "verse"} onClick={() => setPanel(panel === "verse" ? null : "verse")} />
        <Tool
          icon={<ChatBubble size={18} />}
          label={t("journal.page.addQuote")}
          onClick={() => {
            setPanel(null);
            // One empty quote at a time: a second tap goes to the one waiting.
            const at = emptyQuoteAt(editor.page.blocks);
            if (at >= 0) editor.focusBlock(at);
            else editor.insert({ type: "quote", text: "", by: "" });
          }}
        />
        <Tool
          icon={<Highlighter size={18} />}
          label={t("journal.page.highlight")}
          pressed={panel === "color"}
          onClick={() => setPanel(panel === "color" ? null : "color")}
        />
        <Tool icon={<Plus size={18} />} label={t("journal.page.more")} pressed={panel === "more"} onClick={() => setPanel(panel === "more" ? null : "more")} />
      </div>
      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
    </div>
  );
}

/**
 * Plus: the page's notebook and tags. A notebook is the pages that name it,
 * so the ones already named are offered to pick again; a tag goes on with
 * Enter and comes off with a tap.
 */
function PropsPanel({ editor, notebooks, onDone }: { editor: PageEditor; notebooks: readonly string[]; onDone: () => void }) {
  const { t } = useTranslate();
  const [tag, setTag] = useState("");
  const tags = editor.page.tags ?? [];
  const current = editor.page.notebook ?? "";
  const addTag = () => {
    const next = cleanTags([...tags, tag]);
    if (next.length !== tags.length) editor.setTags(next);
    setTag("");
  };
  const chip = "tap-press inline-flex h-11 max-w-full items-center gap-1.5 rounded-pill border px-3.5 font-sans text-detail font-semibold";
  return (
    <div data-page-props-panel="" className="max-h-[45vh] overflow-y-auto px-3 pt-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-caption font-semibold text-paper/70">{t("journal.page.notebook")}</p>
        <button type="button" onClick={onDone} className="tap-press inline-flex h-11 shrink-0 items-center rounded-pill px-3 font-sans text-detail font-semibold text-paper/85">
          {t("common.done")}
        </button>
      </div>
      <label className="block">
        <span className="sr-only">{t("journal.page.notebook")}</span>
        <input dir="auto"
          type="text"
          value={current}
          maxLength={NOTEBOOK_MAX}
          onChange={(e) => editor.setNotebook(cleanNotebook(e.target.value) ? e.target.value : "")}
          placeholder={t("journal.page.notebookPlaceholder")}
          className="block h-11 w-full rounded-xl border border-paper/15 bg-transparent px-3 font-sans text-[16px] text-paper placeholder:text-paper/55 focus:border-paper/40 focus:outline-none"
        />
      </label>
      {notebooks.length > 0 || current ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {notebooks
            .filter((n) => n !== current)
            .slice(0, 6)
            .map((n) => (
              <button key={n} type="button" onClick={() => editor.setNotebook(n)} className={cn(chip, "border-paper/15 text-paper/85")}>
                <ClosedBook size={14} className="shrink-0" />
                <span className="min-w-0 truncate">{n}</span>
              </button>
            ))}
          {current ? (
            <button type="button" onClick={() => editor.setNotebook("")} className={cn(chip, "border-paper/15 text-paper/70")}>
              {t("journal.page.noNotebook")}
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 font-sans text-caption font-semibold text-paper/70">{t("journal.page.tags")}</p>
      {tags.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {tags.map((x) => (
            <button key={x} type="button" onClick={() => editor.setTags(tags.filter((y) => y !== x))} aria-label={t("journal.page.removeTag", { tag: x })} className={cn(chip, "border-paper/25 text-paper")}>
              <span className="min-w-0 truncate">{`#${x}`}</span>
              <Close size={12} className="shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
      {tags.length < TAGS_MAX ? (
        <label className="mt-2 block">
          <span className="sr-only">{t("journal.page.addTag")}</span>
          <input dir="auto"
            type="text"
            value={tag}
            maxLength={TAG_MAX}
            enterKeyHint="done"
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={() => (tag.trim() ? addTag() : undefined)}
            placeholder={t("journal.page.addTag")}
            className="block h-11 w-full rounded-xl border border-paper/15 bg-transparent px-3 font-sans text-[16px] text-paper placeholder:text-paper/55 focus:border-paper/40 focus:outline-none"
          />
        </label>
      ) : null}
      <StyleRows editor={editor} />
      <CoverRow editor={editor} />
    </div>
  );
}

/** Plus: a cover from the verified artwork the apps carry, or none. */
function CoverRow({ editor }: { editor: PageEditor }) {
  const { t } = useTranslate();
  const current = editor.page.cover;
  return (
    <div data-page-cover-choices="" className="mt-4 pb-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-caption font-semibold text-paper/70">{t("journal.page.cover")}</p>
        {current ? (
          <button type="button" onClick={() => editor.setCover(undefined)} className="tap-press inline-flex h-11 shrink-0 items-center rounded-pill px-3 font-sans text-detail font-semibold text-paper/85">
            {t("journal.page.noCover")}
          </button>
        ) : null}
      </div>
      <div role="radiogroup" aria-label={t("journal.page.cover")} className="mt-1 grid grid-cols-5 gap-2">
        {COVERS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={current === c.id}
            aria-label={c.alt}
            onClick={() => editor.setCover(c.id)}
            className={cn("tap-press aspect-square min-h-11 overflow-hidden rounded-xl border-2", current === c.id ? "border-paper" : "border-transparent")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a file the apps carry */}
            <img src={c.src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Plus: the page's font and where its words stand, two choices each, from the house's own. */
function StyleRows({ editor }: { editor: PageEditor }) {
  const { t } = useTranslate();
  const font = editor.page.style?.font ?? "serif";
  const align = editor.page.style?.align ?? "start";
  const seg = (on: boolean) =>
    cn(
      "tap-press inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-pill px-3 font-sans text-detail font-semibold motion-safe:transition-colors",
      on ? "bg-paper text-night" : "text-paper/85 hover:text-paper",
    );
  return (
    <div data-page-style="" className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 pb-2">
      <p className="font-sans text-caption font-semibold text-paper/70">{t("bible.fontLabel")}</p>
      <p className="font-sans text-caption font-semibold text-paper/70">{t("picture.align")}</p>
      <div role="radiogroup" aria-label={t("bible.fontLabel")} className="flex rounded-pill border border-paper/15 p-0.5">
        <button type="button" role="radio" aria-checked={font === "serif"} onClick={() => editor.setStyle({ font: "serif" })} className={cn(seg(font === "serif"), "font-serif")}>
          {t("bible.fontSerif")}
        </button>
        <button type="button" role="radio" aria-checked={font === "sans"} onClick={() => editor.setStyle({ font: "sans" })} className={seg(font === "sans")}>
          {t("settings.fontSans")}
        </button>
      </div>
      <div role="radiogroup" aria-label={t("picture.align")} className="flex rounded-pill border border-paper/15 p-0.5">
        <button type="button" role="radio" aria-checked={align === "start"} onClick={() => editor.setStyle({ align: "start" })} className={seg(align === "start")}>
          {t("journal.page.alignStart")}
        </button>
        <button type="button" role="radio" aria-checked={align === "center"} onClick={() => editor.setStyle({ align: "center" })} className={seg(align === "center")}>
          {t("picture.centre")}
        </button>
      </div>
    </div>
  );
}

/** One of Plus's blocks in the More panel: its icon, its name, and the Plus mark without Plus. */
/** The tray More's rows lie in: the faint list the rows on You are (components/you/YouRows.tsx). */
const MORE_TRAY = "overflow-hidden rounded-[18px] bg-paper/[0.03] ring-1 ring-inset ring-paper/[0.08]";

/** One of More's rows: its glyph, its whole name on as many lines as it needs, and without Plus the mark. */
function MoreChoice({ icon, label, locked, page = false, onClick }: { icon: ReactNode; label: string; locked: boolean; page?: boolean; onClick: () => void }) {
  return (
    <li className="relative">
      {/* The hairline between rows begins where the words do; the first row has none over it. */}
      <span aria-hidden className="absolute inset-x-0 top-0 ms-[41px] h-px bg-paper/[0.065] [li:first-child>&]:hidden" />
      <button
        type="button"
        onClick={onClick}
        onPointerDown={(e) => e.preventDefault()}
        data-page-more-props={page ? "" : undefined}
        className="tap-press flex min-h-12 w-full min-w-0 items-center gap-2.5 px-3 py-1.5 text-start font-sans text-detail font-semibold text-paper/90 hover:bg-paper/[0.04]"
      >
        <span className="shrink-0 text-paper/80">{icon}</span>
        <span className="min-w-0 flex-1 leading-tight">{label}</span>
        {locked ? <PlusMark className="shrink-0" /> : null}
      </button>
    </li>
  );
}

function Tool({ icon, label, pressed, onClick }: { icon: ReactNode; label: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      // The keyboard stays up: a tool takes no focus from the words.
      onPointerDown={(e) => e.preventDefault()}
      className={cn(
        "tap-press flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 font-sans text-[12px] font-semibold leading-none motion-safe:transition-colors",
        pressed ? "bg-paper text-night" : "text-paper/85 hover:bg-paper/[0.06] hover:text-paper",
      )}
    >
      {icon}
      {/* A line of its own height: at the tile's leading of 1 the box was a pixel
          shorter than the letters, and cut them at the foot (checkMock, "cut"). */}
      <span className="max-w-full truncate leading-[1.35]">{label}</span>
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
