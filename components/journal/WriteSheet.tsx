"use client";

// The writing page's one sheet (1.9, Fable round 3, build 97 note 2 and build
// 98 notes 4 and 5): everything that is not the day, the kind, the title and
// the words. It was a toolbar of four tools at the sheet's foot with a tray
// opening on top of it (the cover's tray standing on Verse, Quote, Highlight
// and More, in the owner's screenshot), a second Done in each tray, and More
// as a long panel.
//
// One sheet, the app's own (components/ui/Sheet.tsx), opened by the page's
// one round button. Rows in one tray, each a name, one line and the chevron,
// a hairline between: Verse, Quote, Cover, Highlight, More. Then the page's
// own settings in a second tray: its notebook (the one it is in, in the row),
// its tags, and its font and alignment each as the house's track inside its
// row. A row does its job in this same sheet, whose content changes and gains
// a way back, or closes the sheet and acts on the page. Never a second tray
// on the first, and no Done: a choice made is kept as it is made.
//
// Plus shown, never hidden: what is Plus's wears the mark for a reader
// without it, and opens the upgrade sheet named for the journal.

import { useCallback, useState, type CSSProperties, type ReactNode } from "react";

import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { HighlightPicker } from "@/components/bible/HighlightPicker";
import { PlusLock, PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { LibraryQuote } from "@/components/journal/LibraryQuote";
import { useVerseCardLabel, VerseFinder } from "@/components/journal/PageBlocks";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Close } from "@/components/ui/icons/Close";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { COVERS, coverById } from "@/lib/journal/covers";
import { notebookChoices } from "@/lib/journal/gatherings";
import { cleanNotebook, cleanTags, emptyQuoteAt, NOTEBOOK_MAX, TAG_MAX, TAGS_MAX, verseAt, type PageBlock } from "@/lib/journal/page";
import { cn } from "@/lib/cn";

import type { JournalShare } from "./SharePageButton";
import type { PageEditor } from "./usePage";

export type WriteSheetView = "menu" | "verse" | "quote" | "cover" | "highlight" | "more" | "notebook" | "tags";

const TRAY = "theology-tray overflow-hidden rounded-[18px] px-1.5 py-1";
const ROW = "theology-row tap-press flex min-h-[56px] w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-start";
/** A field with no box: the words on the sheet's own ground, a hairline under them. */
const FIELD = "block h-12 w-full border-b border-paper/15 bg-transparent font-sans text-[16px] text-paper placeholder:text-paper/55 focus:outline-none";

export function WriteSheet({
  open,
  start = "menu",
  onClose,
  editor,
  notebooks,
  locked,
  share = null,
}: {
  open: boolean;
  /** The view it opens on: the rows, or one row's own (the page's notebook line opens Notebook). */
  start?: WriteSheetView;
  onClose: () => void;
  editor: PageEditor;
  /** The notebooks the journal's pages already name, to pick again. */
  notebooks: readonly string[];
  /** The reader has no Plus. */
  locked: boolean;
  /** A saved page's sharing (components/journal/SharePageButton.tsx), where it can be shared. */
  share?: JournalShare | null;
}) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const verseLabel = useVerseCardLabel();
  const [view, setView] = useState<WriteSheetView>(start);
  // Each opening begins where it was asked to, set during the render that
  // opens it (React's way to follow a prop), not in an effect after it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView(start);
  }
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  // Quote has a step of its own inside it (a page's passages): the sheet's one way back takes that step first.
  const [stepBack, setStepBack] = useState<(() => void) | null>(null);
  const onStep = useCallback((back: (() => void) | null) => setStepBack(() => back), []);
  const { page } = editor;

  /** What is Plus's, for a reader without it: the sheet closes and the upgrade sheet opens. */
  const plus = (act: () => void) => () => {
    if (!locked) return act();
    onClose();
    upgrade.open("journal");
  };
  const add = (block: PageBlock) => {
    editor.insert(block);
    onClose();
  };

  const NAMES: Record<WriteSheetView, string> = {
    menu: t("journal.page.tools"),
    verse: t("journal.page.addVerse"),
    quote: t("journal.page.addQuote"),
    cover: t("journal.page.cover"),
    highlight: t("journal.page.highlight"),
    more: t("journal.page.more"),
    notebook: t("journal.page.notebook"),
    tags: t("journal.page.tags"),
  };

  const cover = coverById(page.cover);
  const tags = page.tags ?? [];
  const font = page.style?.font ?? "serif";
  const align = page.style?.align ?? "start";
  const target = editor.colorTarget();
  const targetBlock = target !== null ? page.blocks[target] : null;
  const active = targetBlock?.type === "text" ? (targetBlock.color ?? null) : null;

  // The sheet's head: the view's name, with the way back to the rows from a
  // row's own view, and the close. The handle over it drags the sheet.
  const header = (
    <div className="flex items-center gap-1 px-2 pb-2">
      {view !== "menu" ? (
        <button
          type="button"
          data-write-sheet-back=""
          aria-label={t("common.back")}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => (stepBack ? stepBack() : setView("menu"))}
          className="tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/80 hover:text-paper"
        >
          <ChevronLeft size={20} strokeWidth={1.8} className="rtl:-scale-x-100" />
        </button>
      ) : null}
      <p className={cn("min-w-0 flex-1 truncate font-sans text-ui font-semibold text-paper", view === "menu" && "ps-2")}>{NAMES[view]}</p>
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/65 hover:text-paper">
        <Close size={16} />
      </button>
    </div>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title={NAMES[view]} header={header} keyboard desktop openFull panelClassName="md:max-w-[520px]">
        {/* data-page-toolbar: a field of the sheet is a place the reader
            writes (lib/journal/writing.ts), so what it lays on the page hands
            the cursor on, and the keyboard stays as it is. */}
        <div data-page-toolbar="" data-write-sheet={view} data-sheet-nodrag="">
          {view === "menu" ? (
            <div className="space-y-3">
              <ul className={TRAY}>
                <Row name={NAMES.verse} line={t("journal.page.versePlaceholder")} onClick={() => setView("verse")} />
                <Row name={NAMES.quote} line={t("study.theology.searchLibrary")} onClick={() => setView("quote")} />
                <Row name={NAMES.cover} line={cover ? cover.alt : t("journal.page.noCover")} cut={!!cover} mark={locked} onClick={plus(() => setView("cover"))} />
                <Row name={NAMES.highlight} line={t("journal.page.highlightHint")} onClick={() => setView("highlight")} />
                <Row
                  name={NAMES.more}
                  line={[t("journal.page.heading"), t("journal.page.checklist"), t("journal.page.divider"), t("journal.page.callout")].join(" · ")}
                  mark={locked}
                  onClick={plus(() => setView("more"))}
                />
              </ul>
              {/* The page's own: where it is kept and how it looks. */}
              <ul data-write-sheet-page="" className={TRAY}>
                {/* Share this page (step 3), where the server can make its link: it was a button in the sheet's head. */}
                {share?.ready ? (
                  <Row
                    name={t("journal.share.action")}
                    line={share.ready.left === null ? undefined : t("journal.share.left", { count: share.ready.left })}
                    onClick={() => {
                      void share.share();
                      onClose();
                    }}
                  />
                ) : null}
                <Row name={NAMES.notebook} line={page.notebook || t("journal.page.noNotebook")} mark={locked} cut={!!page.notebook} onClick={plus(() => setView("notebook"))} />
                <Row name={NAMES.tags} line={tags.length ? tags.map((x) => `#${x}`).join(" · ") : t("journal.page.addTag")} mark={locked} cut={tags.length > 0} onClick={plus(() => setView("tags"))} />
                <TrackRow
                  name={t("bible.fontLabel")}
                  mark={locked}
                  value={font}
                  options={[
                    { value: "serif", label: t("bible.fontSerif"), className: "font-serif" },
                    { value: "sans", label: t("settings.fontSans") },
                  ]}
                  onChange={(v) => plus(() => editor.setStyle({ font: v as "serif" | "sans" }))()}
                />
                <TrackRow
                  name={t("picture.align")}
                  mark={locked}
                  value={align}
                  options={[
                    { value: "start", label: t("journal.page.alignStart") },
                    { value: "center", label: t("picture.centre") },
                  ]}
                  onChange={(v) => plus(() => editor.setStyle({ align: v as "start" | "center" }))()}
                />
              </ul>
            </div>
          ) : null}

          {view === "verse" ? (
            <VerseFinder
              bare
              onPick={(b) => {
                // A verse is laid once: asked for again, its card is shown.
                const at = verseAt(page.blocks, b);
                if (at >= 0) editor.show(at);
                else editor.insert(b);
                onClose();
              }}
            />
          ) : null}

          {view === "quote" ? (
            // The editor's Quote, searching Purify's library (build 98 note 5;
            // components/journal/LibraryQuote.tsx, Updates 98c's), in this
            // sheet's own layout.
            <LibraryQuote
              inSheet
              onStep={onStep}
              locked={locked}
              verseLabel={verseLabel}
              onLocked={plus(() => undefined)}
              onPick={(b) => {
                // A verse is laid once, as from Verse; a passage where the cursor is.
                const at = verseAt(page.blocks, b);
                if (at >= 0) editor.show(at);
                else editor.insert(b);
                onClose();
              }}
              onOwn={() => {
                // One empty quote at a time: a second ask goes to the one waiting.
                const at = emptyQuoteAt(page.blocks);
                if (at >= 0) editor.focusBlock(at);
                else editor.insert({ type: "quote", text: "", by: "" });
                onClose();
              }}
            />
          ) : null}

          {view === "cover" ? (
            <div data-page-cover-choices="">
              {cover ? (
                <button
                  type="button"
                  onClick={() => {
                    editor.setCover(undefined);
                    onClose();
                  }}
                  className="tap-press mb-1 inline-flex min-h-11 items-center px-1 font-sans text-detail font-semibold text-paper/70 underline underline-offset-4 hover:text-paper"
                >
                  {t("journal.page.noCover")}
                </button>
              ) : null}
              {/* The verified artwork the apps carry (lib/journal/covers.ts),
                  each large enough to be told from the next, the chosen one
                  edged. A picture chosen is on the page at once. */}
              <div role="radiogroup" aria-label={t("journal.page.cover")} className="grid grid-cols-3 gap-2">
                {COVERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={page.cover === c.id}
                    aria-label={c.alt}
                    onClick={() => {
                      editor.setCover(c.id);
                      onClose();
                    }}
                    className={cn("tap-press aspect-[4/5] overflow-hidden rounded-[14px] border-2", page.cover === c.id ? "border-paper" : "border-transparent")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- a file the apps carry */}
                    <img src={c.src} alt="" loading="lazy" className="h-full w-full object-cover object-[50%_22%]" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {view === "highlight" ? (
            target !== null ? (
              <div data-page-colors="" onPointerDown={(e) => e.preventDefault()}>
                <HighlightPicker
                  active={active}
                  hint={t("journal.page.highlightHint")}
                  onPick={(id) => {
                    editor.setColor(target, id);
                    onClose();
                  }}
                  onRemove={() => {
                    editor.setColor(target, null);
                    onClose();
                  }}
                  onNames={(id) => setNaming(id)}
                />
              </div>
            ) : (
              // Nothing written to mark yet: the row says so where its colours would open.
              <p data-page-highlight-none="" aria-live="polite" className="flex min-h-11 items-center px-1 font-sans text-detail font-semibold leading-[1.5] text-paper/85">
                {t("journal.page.highlightNone")}
              </p>
            )
          ) : null}

          {view === "more" ? (
            <ul data-page-more="" className={TRAY}>
              <Row name={t("journal.page.heading")} onClick={() => add({ type: "heading", text: "" })} />
              <Row name={t("journal.page.checklist")} onClick={() => add({ type: "check", items: [{ text: "", done: false }] })} />
              <Row name={t("journal.page.divider")} onClick={() => add({ type: "divider", style: "line" })} />
              <Row name={t("journal.page.callout")} onClick={() => add({ type: "callout", icon: "candle", text: "" })} />
            </ul>
          ) : null}

          {view === "notebook" ? <NotebookView editor={editor} notebooks={notebooks} /> : null}
          {view === "tags" ? <TagsView editor={editor} /> : null}
        </div>
      </Sheet>
      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
    </>
  );
}

/** A row: its name, one line under it, the Plus mark where it is Plus's, and the chevron. */
function Row({
  name,
  line,
  mark = false,
  cut = false,
  onClick,
}: {
  name: string;
  line?: string;
  mark?: boolean;
  /** The line says what is chosen now (the notebook's name, the tags, what the cover shows): kept to one line. */
  cut?: boolean;
  onClick: () => void;
}) {
  return (
    <li className="theology-rule">
      <button
        type="button"
        // The keyboard stays as it is: a row takes no cursor from the words.
        onPointerDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={ROW}
      >
        <span className="min-w-0 flex-1">
          {/* The mark stands beside the name, so the line under it keeps the row's whole width. */}
          <span className="flex min-w-0 items-center gap-2 font-sans text-ui font-semibold text-paper">
            <span className="min-w-0">{name}</span>
            {mark ? <PlusMark className="shrink-0" /> : null}
          </span>
          {line ? (
            <span
              dir="auto"
              data-mock-allow={cut ? "cut" : undefined}
              data-mock-why={cut ? "what is chosen now (a notebook's name, the tags, what the cover shows), kept to one line in a row" : undefined}
              className={cn("mt-0.5 block font-sans text-caption text-paper/60", cut && "truncate")}
            >
              {line}
            </span>
          ) : null}
        </span>
        <ChevronRight aria-hidden size={14} className="shrink-0 text-paper/50 rtl:-scale-x-100" />
      </button>
    </li>
  );
}

/** A row that is a small choice: its name, and the house's track (.set-track) in the row itself. */
function TrackRow({
  name,
  mark,
  value,
  options,
  onChange,
}: {
  name: string;
  mark: boolean;
  value: string;
  options: readonly { value: string; label: string; className?: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <li className="theology-rule">
      <div className="flex min-h-[56px] items-center gap-3 px-2.5 py-2">
        <span className="flex min-w-0 flex-1 items-center gap-2 font-sans text-ui font-semibold text-paper">
          <span className="min-w-0">{name}</span>
          {/* The mark's padlock alone: beside a track there is no room for its words, and the rows over it say them. */}
          {mark ? <PlusLock size={13} className="text-paper/60" /> : null}
        </span>
        <div role="radiogroup" aria-label={name} className="set-track !mt-0 w-[168px] shrink-0" style={{ "--set-cols": options.length } as CSSProperties}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onChange(o.value)}
              className={cn("hit-44", o.className)}
              // The lit choice stands on its raised plate (::before), which
              // checkMock cannot read as a ground (components/settings/LitPanel.tsx, Track).
              data-mock-allow={value === o.value ? "contrast" : undefined}
              data-mock-why={value === o.value ? "the lit choice on its raised plate (::before), 11:1 or more, measured" : undefined}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

/**
 * The page's notebook. A notebook is the pages that name it, so the ones
 * already named are offered to pick again, the reader's gatherings first
 * (lib/journal/gatherings.ts): one answer from a list, the chosen row marked.
 * A new one is named in the field.
 */
function NotebookView({ editor, notebooks }: { editor: PageEditor; notebooks: readonly string[] }) {
  const { t } = useTranslate();
  const current = editor.page.notebook ?? "";
  const { florilegia } = useFlorilegia();
  const offered = notebookChoices(
    florilegia.map((f) => f.title),
    notebooks,
    current,
  );
  const choice = (name: string, label: ReactNode, on: boolean) => (
    <li key={name || "none"} className="theology-rule">
      <button type="button" role="radio" aria-checked={on} data-page-notebook-choice="" onClick={() => editor.setNotebook(name)} className={cn(ROW, "min-h-12")}>
        <span dir="auto" data-mock-allow="cut" data-mock-why="a reader's own name for a notebook or a gathering, cut to one line in a row" className="min-w-0 flex-1 truncate font-sans text-ui font-semibold text-paper">
          {label}
        </span>
        {on ? <Check aria-hidden size={18} className="shrink-0 text-paper" /> : null}
      </button>
    </li>
  );
  return (
    <div data-page-props-panel="">
      <label className="block px-1">
        <span className="sr-only">{t("journal.page.notebook")}</span>
        <input dir="auto"
          type="text"
          value={current}
          maxLength={NOTEBOOK_MAX}
          onChange={(e) => editor.setNotebook(cleanNotebook(e.target.value) ? e.target.value : "")}
          placeholder={t("journal.page.notebookPlaceholder")}
          className={FIELD}
        />
      </label>
      {offered.length > 0 || current ? (
        <ul role="radiogroup" aria-label={t("journal.page.notebook")} data-page-notebook-choices="" className={cn(TRAY, "mt-3")}>
          {offered.map((n) => choice(n.name, n.name, n.name === current))}
          {current && !offered.some((n) => n.name === current) ? choice(current, current, true) : null}
          {choice("", t("journal.page.noNotebook"), !current)}
        </ul>
      ) : null}
    </div>
  );
}

/** The page's tags: one goes on with Enter and comes off with a tap. */
function TagsView({ editor }: { editor: PageEditor }) {
  const { t } = useTranslate();
  const [tag, setTag] = useState("");
  const tags = editor.page.tags ?? [];
  const addTag = () => {
    const next = cleanTags([...tags, tag]);
    if (next.length !== tags.length) editor.setTags(next);
    setTag("");
  };
  return (
    <div data-page-tags-panel="">
      {tags.length < TAGS_MAX ? (
        <label className="block px-1">
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
            className={FIELD}
          />
        </label>
      ) : null}
      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 px-1">
          {tags.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => editor.setTags(tags.filter((y) => y !== x))}
              aria-label={t("journal.page.removeTag", { tag: x })}
              className="tap-press inline-flex h-11 max-w-full items-center gap-1.5 rounded-pill border border-paper/25 px-3.5 font-sans text-detail font-semibold text-paper"
            >
              <span dir="auto" data-mock-allow="cut" data-mock-why="a reader's own tag, cut to one line in a chip" className="min-w-0 truncate">{`#${x}`}</span>
              <Close size={12} className="shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
