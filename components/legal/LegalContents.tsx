"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { WAY_FACT } from "@/components/theology/wayStyle";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { textDir } from "@/lib/i18n/textDir";
import { movePage } from "@/lib/ui/inPageMove";
import { scrollBehavior } from "@/lib/ui/motion";

/**
 * A legal text's contents (1.9; his word of 2026-11-10, "can you revamp the
 * TOS design?"): the text's own headings, in its own order, each a way to
 * its section. The Terms run to nineteen screens of a phone and had no way
 * through them but the thumb.
 *
 * The list is read from the page itself, the headings the text draws, so it
 * can never say different words from them, in English, in German or in the
 * shop's policy in the reader's own language, and no second copy of a
 * heading is kept anywhere.
 *
 * Two forms:
 *
 *  - folded, inside the text under its opening words (a phone, and the
 *    sheet): one row, "Contents" and how many, which opens the list in its
 *    place;
 *  - a rail beside the text on a wide page (`rail`), open, the section being
 *    read in the full ink.
 *
 * Every row is 44px tall, the rail's under a mouse too: the app's floor for
 * anything pressed has no smaller size for a pointer
 * (lib/ui/__tests__/touchTargets.test.ts). The Terms have seventeen
 * sections, so on a short window the rail scrolls inside itself, and keeps
 * the row of the section being read in sight.
 *
 * A tap brings the section up inside whatever scrolls, the page or the
 * sheet's own scroll, and changes no address: in the sheet the phone's Back
 * still closes it in one press (lib/platform/useAndroidBack.ts). With motion
 * off it is simply there (lib/ui/motion.ts).
 */

type Section = { el: HTMLElement; name: string; lang?: string };

const same = (a: Section[], b: Section[]) => a.length === b.length && a.every((s, i) => s.el === b[i].el && s.name === b[i].name);

/** The headings of the text a node stands in or beside, kept level with the page as it changes (a German reader's text arrives on the device). */
function useSections(anchor: React.RefObject<HTMLElement | null>, rail: boolean): Section[] {
  const [sections, setSections] = useState<Section[]>([]);
  useEffect(() => {
    const at = anchor.current;
    const root = rail ? at?.closest("[data-legal-page]")?.querySelector<HTMLElement>("[data-legal-text]") : at?.closest<HTMLElement>("[data-legal-text], [data-legal-sheet]");
    if (!root) return;
    const read = () => {
      const next = [...root.querySelectorAll<HTMLElement>("h2")].map((el) => ({
        el,
        name: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
        lang: el.closest<HTMLElement>("[lang]")?.lang || undefined,
      }));
      setSections((was) => (same(was, next) ? was : next));
    };
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [anchor, rail]);
  return sections;
}

/** Bring a section up, and hand it the keyboard's place, so the next Tab goes on from there. */
function goTo(section: Section) {
  section.el.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  if (!section.el.hasAttribute("tabindex")) section.el.setAttribute("tabindex", "-1");
  section.el.focus({ preventScroll: true });
}

export function LegalContents({ rail = false }: { rail?: boolean }) {
  const { t, locale } = useTranslate();
  const anchor = useRef<HTMLDivElement>(null);
  const sections = useSections(anchor, rail);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(0);
  const list = useId();

  // The rail: the section being read is the last whose heading has come up into the top third of the
  // screen. A heading a tap brought up stops under the bar, well inside that, whatever the bar's height.
  useEffect(() => {
    if (!rail || sections.length === 0) return;
    let frame = 0;
    const mark = () => {
      frame = 0;
      const line = Math.max(200, window.innerHeight * 0.3);
      let at = 0;
      for (const [i, s] of sections.entries()) if (s.el.getBoundingClientRect().top <= line) at = i;
      setReading(at);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(mark);
    };
    mark();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rail, sections]);

  // On a short window the rail scrolls inside itself. The row of the section being read is kept in sight
  // by moving the rail alone, never the page (scrollIntoView would move both).
  useEffect(() => {
    if (!rail) return;
    const nav = anchor.current;
    const row = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !row) return;
    const box = nav.getBoundingClientRect();
    const at = row.getBoundingClientRect();
    if (at.top < box.top) nav.scrollTop -= box.top - at.top + 8;
    else if (at.bottom > box.bottom) nav.scrollTop += at.bottom - box.bottom + 8;
  }, [rail, reading, sections]);

  // A heading's words keep the language and direction the text gave them. Under Arabic an English
  // name still reads left to right, and stands at the row's start as every row's name does (build 90
  // note 4, the rows: rtl:text-right on the element that says dir="ltr").
  const name = (s: Section) => (
    <span lang={s.lang} dir={textDir(s.lang)} className="min-w-0 flex-1 rtl:text-right">
      {s.name}
    </span>
  );

  if (rail) {
    return (
      <nav ref={anchor} data-legal-contents="rail" aria-label={t("saints.contents")} className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto scrollbar-thin">
        <p className="flex items-center gap-2.5 px-2 font-sans text-caption font-semibold text-paper/55">
          {t("saints.contents")}
          <span aria-hidden className="h-px flex-1 bg-paper/10" />
        </p>
        <ul className="mt-2">
          {sections.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                aria-current={i === reading ? "true" : undefined}
                onClick={() => goTo(s)}
                className="theology-row flex min-h-11 w-full items-center rounded-[12px] px-2 py-2 text-start font-sans text-[13.5px] leading-[1.3] text-paper/65 aria-[current]:font-semibold aria-[current]:text-paper"
              >
                {name(s)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    // The reader's own language for the list's name, whatever language the text around it is in. In the
    // apps it stays on a tablet too, where a wide page of the website has the rail (native-md-block).
    <div ref={anchor} data-legal-contents="fold" lang={locale} dir={textDir(locale)} className="theology-tray mt-7 overflow-hidden rounded-[18px] px-1.5 py-1 native-md-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={list}
        // The list is let down under the row and what follows glides, as a
        // change inside the page (lib/ui/inPageMove.ts), where it was cut (Gate 2.0).
        onClick={() => movePage(() => setOpen((was) => !was), { grows: [anchor.current] })}
        className="theology-row flex min-h-[52px] w-full items-center gap-3 rounded-[14px] px-2.5 text-start"
      >
        <span className="min-w-0 flex-1 font-serif text-[16px] font-semibold leading-tight text-paper">{t("saints.contents")}</span>
        {sections.length > 0 ? <span className={WAY_FACT}>{sections.length}</span> : null}
        <ChevronDown size={16} className={`shrink-0 text-paper/55 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      <ul id={list} hidden={!open}>
        {sections.map((s, i) => (
          <li key={i} className="theology-rule">
            <button
              type="button"
              onClick={() => goTo(s)}
              className="theology-row flex min-h-11 w-full items-center rounded-[12px] px-2.5 py-2 text-start font-serif text-[15px] leading-[1.3] text-paper/88"
            >
              {name(s)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
