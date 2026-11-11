"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { HighlightNamesSheet } from "@/components/bible/HighlightNamesSheet";
import { HighlightPicker } from "@/components/bible/HighlightPicker";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Copy } from "@/components/ui/icons/Copy";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Picture } from "@/components/ui/icons/Picture";
import { Star } from "@/components/ui/icons/Star";
import { rememberHighlightColor } from "@/lib/bible/highlightColors";
import { cn } from "@/lib/cn";
import { coversAll, isBare, locate, makeMark, sentenceAround, snapToWords, wholeSpan, withMark, withoutMark, type Mark, type Span } from "@/lib/marks/anchor";
import { MARK_HOST, MARK_TEXT, lineBoxes, measureWords, offsetIn, wordAt, type Box, type WordBoxes } from "@/lib/marks/dom";
import { parsePlace, readAt, writeAt, type MarkPlace } from "@/lib/marks/place";
import { shareLink } from "@/lib/site";
import { copyText } from "@/lib/ui/copyText";
import { createLiftGuard } from "@/lib/ui/liftGuard";

const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/**
 * Any words of a text, selected and marked (build 93 note 13, the owner's
 * word of 2026-11-11: "allow you to quote sentences and highlight whichever
 * section or whichever word you want in the actual work itself, so it doesn't
 * just highlight the whole paragraph").
 *
 * One of these stands on each page that has paragraphs to mark
 * (./SelectionToolsLazy.tsx) and serves every paragraph that says where its
 * marks are kept (`data-mk`, lib/marks/place.ts): a Father's work, a saint's
 * life, a council's documents, theology, history.
 *
 * With a finger: a hold on a word selects it, and the finger runs it on
 * across the lines before it lifts; after, two handles move its ends, and one
 * tap widens it to its sentence or the whole paragraph. The apps select
 * nothing by themselves (app/globals.css), so this selection is Purify's own,
 * drawn the way a held verse is (the ghost wash, no box). With a mouse on
 * the website, the browser's own selection is the selection.
 *
 * Either way one card serves it: the colours, the words copied with whose
 * they are, the link, the picture, keep, and a note. A tap on words already
 * marked opens the card on that mark.
 */

type Sel = {
  host: HTMLElement;
  textEl: HTMLElement;
  place: MarkPlace;
  text: string;
  s: number;
  e: number;
  /** The mark these words already are, when a mark was tapped or has just been made. */
  markId?: string;
  /** The browser's own selection (a mouse on the website): nothing is drawn over it. */
  native?: boolean;
  /** Made with a finger: its ends have handles. */
  touch?: boolean;
};

const NO_BOXES: Box[] = [];
const HOLD_MS = 400;
const SLOP_PX = 8;
/** A touch is echoed as mouse events for about this long. */
const TOUCH_ECHO_MS = 700;
const TOOL = "tap-press grid h-11 w-11 min-w-0 shrink place-items-center rounded-full text-paper/80 motion-safe:transition-colors active:bg-paper/10 hover:bg-paper/10";

function hostOf(target: EventTarget | null): { host: HTMLElement; textEl: HTMLElement; place: MarkPlace } | null {
  const el = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  // The paragraph, not only its letters: a finger lands between two lines as often as on one.
  const host = el?.closest<HTMLElement>(MARK_HOST);
  const textEl = host?.querySelector<HTMLElement>(MARK_TEXT);
  const place = parsePlace(host?.dataset.mk);
  return textEl && host && place ? { host, textEl, place } : null;
}

export function SelectionTools() {
  const { t } = useTranslate();
  const [sel, setSel] = useState<Sel | null>(null);
  const selRef = useRef<Sel | null>(null);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);
  const [lift] = useState(createLiftGuard);

  // What the finger is doing: holding still on a word, or dragging an end.
  const gesture = useRef<{
    hold?: { target: ReturnType<typeof hostOf> & object; x: number; y: number; timer: number };
    drag?: { measured: WordBoxes; anchor?: Span; end?: "s" | "e" };
    outside?: { x: number; y: number; moved: boolean };
    lastTouch: number;
    edge?: number;
  }>({ lastTouch: 0 });

  // ── The card's own state ───────────────────────────────────────────────
  const [mode, setMode] = useState<"tools" | "note">("tools");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState<"words" | "link" | null>(null);
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  const [picture, setPicture] = useState<{ text: string; name: string; work: string } | null>(null);

  const close = useCallback(() => {
    setSel(null);
    setMode("tools");
    setCopied(null);
  }, []);

  // The note opens ready to be written.
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (mode === "note") noteRef.current?.focus();
  }, [mode]);

  // ── A finger ───────────────────────────────────────────────────────────
  useEffect(() => {
    const g = gesture.current;
    const clearHold = () => {
      if (g.hold) window.clearTimeout(g.hold.timer);
      g.hold = undefined;
    };
    const stopEdge = () => {
      if (g.edge) window.cancelAnimationFrame(g.edge);
      g.edge = undefined;
    };

    function onTouchStart(e: TouchEvent) {
      g.lastTouch = performance.now();
      const p = e.touches[0];
      const target = e.target as Element | null;
      if (!p || e.touches.length > 1) {
        clearHold();
        return;
      }
      // The card and the handles are the selection's own.
      if (target?.closest("[data-mk-ui]")) return;
      const found = target?.closest("a, button, textarea, input") ? null : hostOf(target);
      g.outside = { x: p.clientX, y: p.clientY, moved: false };
      if (!found) return;
      clearHold();
      const x = p.clientX;
      const y = p.clientY;
      g.hold = {
        target: found,
        x,
        y,
        timer: window.setTimeout(() => {
          g.hold = undefined;
          const measured = measureWords(found.textEl);
          const word = wordAt(measured, x, y);
          if (!word) return;
          g.drag = { measured, anchor: word };
          g.outside = undefined;
          lift.reset();
          setMode("tools");
          setCopied(null);
          setSel({ ...found, text: found.textEl.textContent ?? "", s: word.s, e: word.e, touch: true });
          try {
            navigator.vibrate?.(15);
          } catch {
            /* no-op */
          }
        }, HOLD_MS),
      };
    }

    function extend(x: number, y: number) {
      const d = g.drag;
      const cur = selRef.current;
      if (!d || !cur) return;
      const word = wordAt(d.measured, x, y);
      if (!word) return;
      let s = cur.s;
      let e = cur.e;
      if (d.anchor) {
        s = Math.min(d.anchor.s, word.s);
        e = Math.max(d.anchor.e, word.e);
      } else if (d.end === "s") {
        s = Math.min(word.s, cur.e - 1);
        if (word.s >= cur.e) {
          // The start dragged past the end: the ends change hands.
          s = snapToWords(cur.text, cur.e - 1, cur.e - 1)?.s ?? cur.s;
          e = word.e;
          d.end = "e";
        }
      } else if (d.end === "e") {
        e = Math.max(word.e, cur.s + 1);
        if (word.e <= cur.s) {
          e = snapToWords(cur.text, cur.s, cur.s)?.e ?? cur.e;
          s = word.s;
          d.end = "s";
        }
      }
      if (s !== cur.s || e !== cur.e) setSel({ ...cur, s, e, markId: undefined });
    }

    // A finger dragging near the top or the foot of the screen moves the page under it.
    function edgeScroll(x: number, y: number) {
      stopEdge();
      const band = 72;
      const speed = y < band ? -Math.ceil((band - y) / 8) : y > window.innerHeight - band ? Math.ceil((y - (window.innerHeight - band)) / 8) : 0;
      if (!speed) return;
      const step = () => {
        if (!g.drag) return;
        window.scrollBy(0, speed);
        extend(x, y);
        g.edge = window.requestAnimationFrame(step);
      };
      g.edge = window.requestAnimationFrame(step);
    }

    function onTouchMove(e: TouchEvent) {
      const p = e.touches[0];
      if (!p) return;
      if (g.drag) {
        // The finger is running the selection on: the page stays where it is.
        if (e.cancelable) e.preventDefault();
        extend(p.clientX, p.clientY);
        edgeScroll(p.clientX, p.clientY);
        return;
      }
      if (g.hold && (Math.abs(p.clientY - g.hold.y) > SLOP_PX || Math.abs(p.clientX - g.hold.x) > SLOP_PX * 2)) clearHold();
      if (g.outside && (Math.abs(p.clientY - g.outside.y) > SLOP_PX || Math.abs(p.clientX - g.outside.x) > SLOP_PX)) g.outside.moved = true;
    }

    function onTouchEnd() {
      g.lastTouch = performance.now();
      clearHold();
      stopEdge();
      if (g.drag) {
        g.drag = undefined;
        lift.noteLift();
        return;
      }
      // A tap anywhere else puts the selection away; a scroll of the page does not.
      const cur = selRef.current;
      if (cur && !cur.native && g.outside && !g.outside.moved) close();
      g.outside = undefined;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      clearHold();
      stopEdge();
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [close, lift]);

  // ── A mouse, and a tap on words already marked ──────────────────────────
  useEffect(() => {
    const g = gesture.current;
    const fromTouch = () => performance.now() - g.lastTouch < TOUCH_ECHO_MS;

    function fromBrowserSelection() {
      const picked = window.getSelection();
      if (!picked || picked.isCollapsed || !picked.rangeCount) return;
      const range = picked.getRangeAt(0);
      const found = hostOf(range.startContainer);
      if (!found) return;
      const text = found.textEl.textContent ?? "";
      const s = offsetIn(found.textEl, range.startContainer, range.startOffset);
      // A selection that runs past the paragraph is taken to the paragraph's end.
      const e = found.textEl.contains(range.endContainer) ? offsetIn(found.textEl, range.endContainer, range.endOffset) : text.length;
      if (s === null || e === null || e <= s || !text.slice(s, e).trim()) return;
      setMode("tools");
      setCopied(null);
      // Whole words, as a finger's selection is: half a word is never what was meant.
      const words = snapToWords(text, s, e) ?? { s, e };
      setSel({ ...found, text, s: words.s, e: words.e, native: true });
    }

    function onMouseUp(e: MouseEvent) {
      if (fromTouch() || (e.target as Element | null)?.closest("[data-mk-ui]")) return;
      // The browser settles its selection after the button lifts.
      window.setTimeout(fromBrowserSelection, 0);
    }

    function onMouseDown(e: MouseEvent) {
      if (fromTouch()) return;
      const cur = selRef.current;
      const target = e.target as Element | null;
      if (target?.closest("[data-mk-ui]")) {
        // Nothing on the card takes the browser's selection away from the words it is for.
        if (!target.closest("textarea")) e.preventDefault();
        return;
      }
      if (cur) close();
    }

    function onSelectionChange() {
      const cur = selRef.current;
      if (!cur?.native) return;
      const picked = window.getSelection();
      if (!picked || picked.isCollapsed) close();
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const markEl = target?.closest<HTMLElement>("[data-mk-id]");
      if (!markEl || target?.closest("a, button")) return;
      const picked = window.getSelection();
      if (picked && !picked.isCollapsed) return;
      const found = hostOf(markEl);
      const id = markEl.dataset.mkId;
      if (!found || !id) return;
      const text = found.textEl.textContent ?? "";
      const mark = readAt(found.place).marks?.find((m) => m.id === id);
      const at = mark ? locate(text, mark) : null;
      if (!mark || !at) return;
      lift.reset();
      setMode("tools");
      setCopied(null);
      setSel({ ...found, text, s: at.s, e: at.e, markId: id, touch: fromTouch() });
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && selRef.current) close();
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [close, lift]);

  // The paragraph left the page (another chapter, another page): so does the selection.
  useEffect(() => {
    if (!sel) return;
    const gone = () => {
      if (!sel.host.isConnected) close();
    };
    const watch = new MutationObserver(gone);
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [sel, close]);

  // ── Where it is drawn ──────────────────────────────────────────────────
  const [measured, setBoxes] = useState<Box[]>([]);
  // Nothing selected, nothing drawn, whatever was measured last.
  const boxes = sel ? measured : NO_BOXES;
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    if (!sel) return;
    const measure = () => {
      setBoxes(lineBoxes(sel.textEl, sel));
      setWide(window.matchMedia("(min-width: 768px)").matches && !document.documentElement.classList.contains("is-native"));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [sel]);

  // A selection made under where the card will stand is brought up above it.
  const cardRef = useRef<HTMLDivElement>(null);
  const liftedFor = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!sel || wide || !boxes.length || gesture.current.drag) return;
    if (liftedFor.current === sel.host) return;
    const card = cardRef.current?.getBoundingClientRect();
    if (!card) return;
    liftedFor.current = sel.host;
    const foot = boxes[boxes.length - 1].bottom - window.scrollY;
    const over = foot + 28 - card.top;
    if (over > 0) window.scrollBy({ top: over, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [sel, boxes, wide]);
  useEffect(() => {
    if (!sel) liftedFor.current = null;
  }, [sel]);

  // ── What is on these words now ─────────────────────────────────────────
  const whole = !!sel && coversAll(sel.text, sel);
  const value = sel ? readAt(sel.place) : null;
  const mark = sel?.markId ? value?.marks?.find((m) => m.id === sel.markId) : undefined;
  // The whole paragraph, with no mark of its own, speaks for the paragraph's highlight and note.
  const asParagraph = whole && !mark;
  const color = mark ? (mark.color ?? null) : asParagraph && value?.highlighted ? (value.color ?? "yellow") : null;
  const note = mark ? mark.note : asParagraph ? value?.note : undefined;
  const kept = !!mark?.kept;
  const words = sel ? sel.text.slice(sel.s, sel.e) : "";
  const cite = sel?.host.dataset.mkCite ?? "";

  /** The mark for these words, changed by `change`: made if there is none, taken away if nothing is left on it. */
  function writeMark(change: (m: Mark) => Mark) {
    const cur = sel;
    if (!cur) return;
    const now = readAt(cur.place);
    const existing = cur.markId ? now.marks?.find((m) => m.id === cur.markId) : undefined;
    const base = existing ?? makeMark(cur.text, cur.s, cur.e);
    if (!base) return;
    const next = { ...change(base), at: new Date().toISOString() };
    const marks = isBare(next) ? withoutMark(now.marks, next.id) : withMark(now.marks, next);
    writeAt(cur.place, { ...now, marks });
    setSel({ ...cur, s: base.s, e: base.e, native: cur.native && isBare(next), markId: isBare(next) ? undefined : next.id });
  }

  function pickColor(id: string) {
    if (!sel) return;
    rememberHighlightColor(id);
    if (asParagraph) writeAt(sel.place, { ...readAt(sel.place), highlighted: true, color: id });
    else writeMark((m) => ({ ...m, color: id }));
    // The words now wear the colour: the browser's own selection would hide it.
    if (sel.native) {
      window.getSelection()?.removeAllRanges();
      if (asParagraph) setSel({ ...sel, native: false });
    }
  }
  function removeColor() {
    if (!sel) return;
    if (asParagraph) writeAt(sel.place, { ...readAt(sel.place), highlighted: undefined, color: undefined });
    else writeMark((m) => ({ ...m, color: undefined }));
    close();
  }
  function toggleKeep() {
    writeMark((m) => ({ ...m, kept: m.kept ? undefined : true }));
  }
  function saveNote() {
    if (!sel) return;
    const body = draft.trim();
    if (asParagraph) writeAt(sel.place, { ...readAt(sel.place), note: body || undefined });
    else writeMark((m) => ({ ...m, note: body || undefined }));
    setMode("tools");
  }
  async function copyWords() {
    if (!sel) return;
    if (await copyText(cite ? `${words}\n${cite}` : words)) {
      setCopied("words");
      window.setTimeout(() => setCopied((c) => (c === "words" ? null : c)), 1400);
    }
  }
  async function copyLink() {
    const path = sel?.host.dataset.mkLink;
    if (!path) return;
    if (await copyText(shareLink(path))) {
      setCopied("link");
      window.setTimeout(() => setCopied((c) => (c === "link" ? null : c)), 1400);
    }
  }
  function widen(to: Span) {
    if (!sel) return;
    if (sel.native) window.getSelection()?.removeAllRanges();
    setSel({ ...sel, s: to.s, e: to.e, markId: undefined, native: false });
  }
  function startHandle(end: "s" | "e") {
    if (!sel) return;
    gesture.current.drag = { measured: measureWords(sel.textEl), end };
  }

  const pictureWords = useMemo(
    () => (picture ? { text: picture.text, reference: picture.name, lang: "en", ...(picture.work ? { note: picture.work } : {}) } : null),
    [picture],
  );

  if (typeof document === "undefined") return null;
  const guard = () => lift.isLift();
  const act = (fn: () => void) => () => {
    if (!guard()) fn();
  };
  const sentence = sel ? sentenceAround(sel.text, sel.s, sel.e) : null;
  const canSentence = !!sel && !!sentence && (sentence.s !== sel.s || sentence.e !== sel.e) && !coversAll(sel.text, sentence);
  const first = boxes[0];
  const last = boxes[boxes.length - 1];

  return (
    <>
      {sel &&
        createPortal(
          <div data-mk-ui="" className="pointer-events-none absolute left-0 top-0 z-[54] h-0 w-0">
            {/* The selected words, washed the way a held verse is: line by line, no box. */}
            {!sel.native &&
              boxes.map((b, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="verse-ghost absolute rounded-[5px]"
                  style={{ left: b.left - 3, top: b.top, width: b.right - b.left + 6, height: b.bottom - b.top }}
                />
              ))}
            {/* Its two ends, for a finger. */}
            {sel.touch && !sel.native && first && last && mode === "tools" && (
              <>
                <button
                  type="button"
                  aria-label={t("saints.words.moveStart")}
                  onTouchStart={() => startHandle("s")}
                  className="pointer-events-auto absolute grid h-11 w-11 touch-none place-items-end"
                  style={{ left: first.left - 3 - 22, top: first.top - 30 }}
                >
                  <span aria-hidden className="mx-auto flex h-[30px] w-11 flex-col items-center">
                    <span className="h-3 w-3 rounded-full bg-paper shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
                    <span className="w-0.5 flex-1 bg-paper" />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t("saints.words.moveEnd")}
                  onTouchStart={() => startHandle("e")}
                  className="pointer-events-auto absolute grid h-11 w-11 touch-none place-items-start"
                  style={{ left: last.right + 3 - 22, top: last.bottom - 14 }}
                >
                  <span aria-hidden className="mx-auto flex h-[30px] w-11 flex-col items-center">
                    <span className="w-0.5 flex-1 bg-paper" />
                    <span className="h-3 w-3 rounded-full bg-paper shadow-[0_1px_4px_rgba(0,0,0,0.4)]" />
                  </span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

      {sel &&
        createPortal(
          <div
            data-mk-ui=""
            className={cn("pointer-events-none z-[55] flex justify-center px-4", wide ? "absolute" : "fixed inset-x-0")}
            style={
              wide && last
                ? { top: last.bottom + 10, left: Math.max(8, Math.min(last.left, window.innerWidth + window.scrollX - 336)), paddingLeft: 0, paddingRight: 0 }
                : { bottom: "calc(var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)" }
            }
          >
            <div
              ref={cardRef}
              role="dialog"
              aria-modal="false"
              aria-label={t("saints.words.tools")}
              data-screen-edge={wide ? undefined : "bottom"}
              className="press-pill-in pointer-events-auto w-full max-w-[20rem] rounded-[26px] border border-paper/15 bg-night/95 px-1.5 pb-1.5 pt-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur"
            >
              {mode === "note" ? (
                <div className="px-2.5 pb-1.5 pt-2">
                  <p lang="en" dir="ltr" className="mb-2 line-clamp-2 font-serif text-detail italic leading-[1.5] text-paper/60">
                    {words}
                  </p>
                  <textarea
                    dir="auto"
                    ref={noteRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        saveNote();
                      }
                    }}
                    placeholder={t("saints.words.note")}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-paper/10 bg-paper/[0.05] px-3 py-2 font-sans text-ui leading-[1.55] text-paper outline-none placeholder:text-paper/55"
                  />
                  <div className="mt-1.5 flex items-center justify-end gap-1">
                    {note ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft("");
                          if (asParagraph && sel) writeAt(sel.place, { ...readAt(sel.place), note: undefined });
                          else writeMark((m) => ({ ...m, note: undefined }));
                          setMode("tools");
                        }}
                        className="me-auto min-h-11 px-3 font-sans text-caption text-paper/60 hover:text-paper"
                      >
                        {t("common.delete")}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setMode("tools")} className="min-h-11 px-3 font-sans text-caption text-paper/60 hover:text-paper">
                      {t("common.cancel")}
                    </button>
                    <button type="button" onClick={saveNote} className="min-h-11 rounded-pill bg-paper px-4 font-sans text-caption font-medium text-night">
                      {t("common.save")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <HighlightPicker
                    active={color}
                    onPick={pickColor}
                    onRemove={removeColor}
                    onNames={(id) => setNaming(id)}
                    hint={t(asParagraph ? "saints.highlightParagraph" : "saints.words.highlight")}
                    guard={guard}
                  />
                  {!whole && !mark ? (
                    <div className="flex items-center justify-center gap-1 px-2 pt-0.5">
                      {canSentence && sentence ? (
                        <button type="button" onClick={act(() => widen(sentence))} className="min-h-11 rounded-pill px-3 font-sans text-caption text-paper/70 hover:text-paper active:bg-paper/10">
                          {t("saints.words.sentence")}
                        </button>
                      ) : null}
                      <button type="button" onClick={act(() => sel && widen(wholeSpan(sel.text)))} className="min-h-11 rounded-pill px-3 font-sans text-caption text-paper/70 hover:text-paper active:bg-paper/10">
                        {t("saints.words.paragraph")}
                      </button>
                    </div>
                  ) : null}
                  <div aria-hidden className="mx-3 my-1.5 h-px bg-paper/10" />
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={act(copyWords)} aria-label={copied === "words" ? t("common.copied") : t("bible.copyAsQuote")} className={cn(TOOL, copied === "words" && "text-emerald-300")}>
                      {copied === "words" ? <Check size={19} /> : <Copy size={19} />}
                    </button>
                    {sel.host.dataset.mkLink ? (
                      <button type="button" onClick={act(copyLink)} aria-label={copied === "link" ? t("common.linkCopied") : t("saints.copyParagraphLink")} className={cn(TOOL, copied === "link" && "text-emerald-300")}>
                        {copied === "link" ? <Check size={19} /> : <LinkChain size={19} />}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={act(() => setPicture({ text: words, name: sel.host.dataset.mkName || cite, work: sel.host.dataset.mkWork ?? "" }))}
                      aria-label={t("today.verse.shareAsPicture")}
                      className={TOOL}
                    >
                      <Picture size={19} />
                    </button>
                    <button type="button" onClick={act(toggleKeep)} aria-label={kept ? t("saints.words.unkeep") : t("saints.words.keep")} aria-pressed={kept} className={cn(TOOL, kept && "text-paper")}>
                      <Star size={19} filled={kept} />
                    </button>
                    <button
                      type="button"
                      onClick={act(() => {
                        setDraft(note ?? "");
                        setMode("note");
                      })}
                      aria-label={note ? t("bible.editNote") : t("bible.addNote")}
                      aria-pressed={!!note}
                      className={cn(TOOL, note && "bg-paper/12 text-paper")}
                    >
                      <Pen size={19} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
      {picture && pictureWords ? (
        <PictureSheet
          open
          onClose={() => setPicture(null)}
          words={pictureWords}
          title={picture.name}
          name={picture.name}
          caption={picture.work ? `${picture.name}\n${picture.work}` : picture.name}
          referenceLabel={picture.name}
        />
      ) : null}
    </>
  );
}
