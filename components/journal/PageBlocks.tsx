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
import { Close } from "@/components/ui/icons/Close";
import { Cross } from "@/components/ui/icons/Cross";
import { Heart } from "@/components/ui/icons/Heart";
import { Info } from "@/components/ui/icons/Info";
import { Minus } from "@/components/ui/icons/Minus";
import { Note } from "@/components/ui/icons/Note";
import { Plus } from "@/components/ui/icons/Plus";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { Star } from "@/components/ui/icons/Star";
import { highlightVars } from "@/lib/bible/highlightPalette";
import { localBookNames, searchBible } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { verseSpan } from "@/lib/journal/churchDay";
import {
  BY_MAX,
  CALLOUT_ICONS,
  DIVIDER_STYLES,
  HEADING_MAX,
  ITEM_MAX,
  TITLE_MAX,
  VERSE_CARD_MAX,
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
          if (b.type === "library") return <LibraryCard key={`${i}-library`} index={i} block={b} onRemove={() => editor.remove(i)} />;
          if (b.type === "heading") return <HeadingBlock key={`${i}-heading`} index={i} text={b.text} onText={(text) => editor.setBlock(i, { text })} onRemove={() => editor.remove(i)} />;
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
      <VerseCardWords block={block} verses={verses} />
      <figcaption className="mt-1.5 font-sans text-caption text-paper/70">{label}</figcaption>
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
      <Link href={`/bible/${block.book}/${block.chapter}#v${block.from}`} className="inline-flex min-h-11 items-center font-sans text-detail text-paper/70 underline underline-offset-4 hover:text-paper">
        {t("saved.openToRead")}
      </Link>
    );
  }
  return (
    <blockquote className="font-serif text-body leading-[1.65] text-paper/90">
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
 * them, never edited here as the source's; the page they are from; the
 * library's mark, which only these wear; and the way back to the page.
 */
function LibraryCard({ index, block, onRemove }: { index: number; block: Extract<PageBlock, { type: "library" }>; onRemove: () => void }) {
  const { t } = useTranslate();
  return (
    <figure data-page-block={index} data-page-library="" className="relative rounded-2xl border border-paper/10 bg-paper/[0.04] py-3 pe-12 ps-4">
      <blockquote className="whitespace-pre-line font-serif text-body leading-[1.65] text-paper/90">{block.text}</blockquote>
      <figcaption className="mt-1.5 flex min-w-0 items-center gap-3 font-sans text-caption text-paper/70">
        <span className="min-w-0 flex-1">
          {block.cite ? <span className="block">{block.cite}</span> : null}
          <span className="block">{t("journal.page.fromLibrary")}</span>
        </span>
        <Link href={block.href} className="inline-flex min-h-11 shrink-0 items-center px-3 font-semibold text-paper/75 underline underline-offset-4 hover:text-paper">
          {t("journal.composer.open")}
        </Link>
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

// ── Plus's blocks (step 2) ───────────────────────────────────────────────

/** A heading inside the page, in Lora. */
function HeadingBlock({ index, text, onText, onRemove }: { index: number; text: string; onText: (text: string) => void; onRemove: () => void }) {
  const { t } = useTranslate();
  return (
    <div data-page-block={index} data-page-heading-block="" className="relative pe-12">
      <label className="block">
        <span className="sr-only">{t("journal.page.heading")}</span>
        <input
          type="text"
          value={text}
          maxLength={HEADING_MAX}
          data-page-heading=""
          onChange={(e) => onText(e.target.value)}
          placeholder={t("journal.page.headingPlaceholder")}
          className="block min-h-11 w-full bg-transparent font-serif text-[20px] font-semibold leading-[1.3] text-paper placeholder:text-paper/55 focus:outline-none"
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
  const focusLine = (at: number) =>
    window.requestAnimationFrame(() => {
      const el = root.current?.querySelectorAll<HTMLInputElement>("input")[at];
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(el.value.length, el.value.length);
    });
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
            <input
              type="text"
              value={item.text}
              maxLength={ITEM_MAX}
              enterKeyHint="next"
              onChange={(e) => onItems(items.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onItems([...items.slice(0, k + 1), { text: "", done: false }, ...items.slice(k + 1)]);
                  focusLine(k + 1);
                } else if (e.key === "Backspace" && !item.text) {
                  e.preventDefault();
                  onItems(items.filter((_, j) => j !== k));
                  if (k > 0) focusLine(k - 1);
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
        <textarea
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

type Panel = "verse" | "color" | "more" | null;

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
      {panel === "more" ? (
        <div data-page-more="" className="grid grid-cols-2 gap-2 px-3 pt-2">
          <MoreChoice icon={<Note size={18} />} label={t("journal.page.heading")} locked={locked} onClick={() => addPlus({ type: "heading", text: "" })} />
          <MoreChoice icon={<Check size={18} />} label={t("journal.page.checklist")} locked={locked} onClick={() => addPlus({ type: "check", items: [{ text: "", done: false }] })} />
          <MoreChoice icon={<Minus size={18} />} label={t("journal.page.divider")} locked={locked} onClick={() => addPlus({ type: "divider", style: "line" })} />
          <MoreChoice icon={<Candle size={18} />} label={t("journal.page.callout")} locked={locked} onClick={() => addPlus({ type: "callout", icon: "candle", text: "" })} />
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
        <Tool icon={<Plus size={18} />} label={t("journal.page.more")} pressed={panel === "more"} onClick={() => setPanel(panel === "more" ? null : "more")} />
      </div>
      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
    </div>
  );
}

/** One of Plus's blocks in the More panel: its icon, its name, and the Plus mark without Plus. */
function MoreChoice({ icon, label, locked, onClick }: { icon: ReactNode; label: string; locked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.preventDefault()}
      className="tap-press flex min-h-12 min-w-0 items-center gap-2.5 rounded-2xl border border-paper/12 px-3 text-start font-sans text-detail font-semibold text-paper/90 hover:border-paper/30"
    >
      <span className="shrink-0 text-paper/80">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {locked ? <PlusMark className="shrink-0" /> : null}
    </button>
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
        "tap-press flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 font-sans text-[12px] font-semibold leading-none motion-safe:transition-colors disabled:opacity-40",
        pressed ? "bg-paper text-night" : "text-paper/85 hover:bg-paper/[0.06] hover:text-paper",
      )}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
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
