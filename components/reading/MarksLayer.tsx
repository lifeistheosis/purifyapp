"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { highlightVars } from "@/lib/bible/highlightColors";
import { placeMarks, wholeSpan } from "@/lib/marks/anchor";
import { MARK_HOST, lineBoxes, textOf, type Box } from "@/lib/marks/dom";
import { parsePlace, readAt } from "@/lib/marks/place";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The reader's marks on a page that wrote its own text (./MarkHost.tsx):
 * painted behind the words, line by line, in the highlight's colour, with a
 * fine line under words that are only kept or only noted, and each note under
 * its paragraph.
 *
 * Painted, not drawn into the text: the page's words stay the server's, once,
 * and are never handed to the device a second time to be cut around a mark
 * (AGENTS.md, "A page carries what it shows"). A Father's work, which the
 * device draws itself, draws its marks in the text
 * (components/reading/MarkedText.tsx).
 *
 * Measured again whenever a mark changes, the page is laid out again (a new
 * width, a new type size, the fonts arriving) or its paragraphs change.
 */

type Painted = {
  host: HTMLElement;
  key: string;
  washes: { box: Box; color?: string; id: string }[];
  notes: { id: string; words?: string; note: string }[];
};

const HOSTS = `${MARK_HOST}[data-mk-layer]`;

function measure(): Painted[] {
  const out: Painted[] = [];
  for (const host of Array.from(document.querySelectorAll<HTMLElement>(HOSTS))) {
    const place = parsePlace(host.dataset.mk);
    if (!place) continue;
    const value = readAt(place);
    if (!value.highlighted && !value.note && !value.marks?.length) continue;
    const found = textOf(host);
    if (!found) continue;
    const origin = host.getBoundingClientRect();
    const ox = origin.left + window.scrollX;
    const oy = origin.top + window.scrollY;
    const local = (b: Box): Box => ({ left: b.left - ox, right: b.right - ox, top: b.top - oy, bottom: b.bottom - oy });
    const washes: Painted["washes"] = [];
    const notes: Painted["notes"] = [];
    if (value.highlighted) {
      for (const b of lineBoxes(found.el, wholeSpan(found.text))) washes.push({ box: local(b), color: value.color ?? "yellow", id: "all" });
    }
    if (value.note) notes.push({ id: "all", note: value.note });
    for (const p of placeMarks(found.text, value.marks)) {
      for (const b of lineBoxes(found.el, p)) washes.push({ box: local(b), color: p.mark.color, id: p.mark.id });
      if (p.mark.note) notes.push({ id: p.mark.id, words: p.mark.q, note: p.mark.note });
    }
    out.push({ host, key: host.dataset.mk ?? "", washes, notes });
  }
  return out;
}

const same = (a: Painted[], b: Painted[]) =>
  a.length === b.length && a.every((p, i) => p.host === b[i].host && JSON.stringify([p.washes, p.notes]) === JSON.stringify([b[i].washes, b[i].notes]));

export function MarksLayer() {
  const { t } = useTranslate();
  const [painted, setPainted] = useState<Painted[]>([]);
  const queued = useRef(0);

  useEffect(() => {
    const again = () => {
      if (queued.current) return;
      queued.current = window.requestAnimationFrame(() => {
        queued.current = 0;
        const next = measure();
        setPainted((prev) => (same(prev, next) ? prev : next));
      });
    };
    // Paragraphs arriving or leaving; what this layer itself adds is not news.
    const watch = new MutationObserver((changes) => {
      if (changes.some((c) => !(c.target instanceof Element && c.target.closest("[data-mk-paint]")) && ![...c.addedNodes, ...c.removedNodes].every((n) => n instanceof Element && n.hasAttribute("data-mk-paint")))) again();
    });
    watch.observe(document.body, { childList: true, subtree: true });
    // The reading column changing size (a new type size, a turned phone) lays every paragraph out again.
    const sized = new ResizeObserver(again);
    const column = document.querySelector(HOSTS)?.parentElement;
    if (column) sized.observe(column);
    window.addEventListener("purify:annotation", again);
    window.addEventListener("storage", again);
    window.addEventListener("resize", again);
    void document.fonts?.ready.then(again);
    again();
    return () => {
      watch.disconnect();
      sized.disconnect();
      window.removeEventListener("purify:annotation", again);
      window.removeEventListener("storage", again);
      window.removeEventListener("resize", again);
      if (queued.current) window.cancelAnimationFrame(queued.current);
      queued.current = 0;
    };
  }, []);

  return (
    <>
      {painted.map((p) =>
        p.host.isConnected
          ? createPortal(
              <>
                <div data-mk-paint="" aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                  {p.washes.map((w, i) => (
                    <div
                      key={`${w.id}-${i}`}
                      data-hl-color={w.color}
                      style={{ ...(w.color ? (highlightVars(w.color) as React.CSSProperties) : {}), left: w.box.left - 3, top: w.box.top, width: w.box.right - w.box.left + 6, height: w.box.bottom - w.box.top }}
                      className={w.color ? "absolute rounded-[4px] bg-[var(--hl-verse)]" : "absolute border-b border-paper/40"}
                    />
                  ))}
                </div>
                {p.notes.length ? (
                  // The notes are the reader's own words, not the text: a hold on one selects nothing.
                  <div data-mk-paint="" data-mk-ui="" className="mt-2 space-y-2">
                    {p.notes.map((n) => (
                      <div key={n.id} className="rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2">
                        {n.words ? (
                          <p className="mb-1 line-clamp-2 font-serif text-caption italic text-paper/55">{n.words}</p>
                        ) : (
                          <p className="mb-1 font-sans text-caption text-paper/55">{t("bible.yourNote")}</p>
                        )}
                        <p className="whitespace-pre-wrap font-sans text-detail leading-[1.55] text-paper/85">{n.note}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>,
              p.host,
              p.key,
            )
          : null,
      )}
    </>
  );
}
