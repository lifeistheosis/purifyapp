"use client";

// The patron saint's chooser, wherever a patron is chosen: Settings' row, the
// reader's own page, the computer's Data tab and the Community profile's
// editor (build 95 note 17; the owner's word of 2026-11-13: "patron saint
// chooser design needs a rework").
//
// It was the generic searchable dropdown (components/ui/SearchSelect.tsx): a
// field over a list of bare names, opened over the Language section below it
// and running to the foot of the screen with the page's own words under its
// last row, the apostles all under H. Now it is the app's own pieces:
//
//   - the saint as his row: his icon in its own shape (SaintIcon, as the
//     Saints list draws him, the house's plate under it, so a saint whose
//     picture waits on a permission stands on the lit cross), his name and
//     his feast;
//   - the house's sheet (components/ui/Sheet.tsx), opening and closing in the
//     house's motion, still with reduced motion, closed by Back, Escape, its
//     scrim and its close button. `fill`: it is as tall as the screen the
//     keyboard leaves, so with the keyboard up the field and the list are
//     whole above it and nothing runs under the page;
//   - the app's one search field (components/search/SearchField.tsx) standing
//     still over the list, finding any part of a name (lib/profile/patrons.ts);
//   - the saints by their own names under their letters, the reader's own lit
//     with its check and in the middle of the sheet as it opens.
//
// Choosing is one tap: the sheet closes, the row shows the saint, and the
// place that holds the chooser saves or keeps it (`onChoose`).

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FeastDays } from "@/components/saints/FeastDays";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { SearchField } from "@/components/search/SearchField";
import { FacePlate } from "@/components/ui/CrossPlate";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { textDir } from "@/lib/i18n/textDir";
import { byLetter, findPatrons, patronFor, type Patron } from "@/lib/profile/patrons";

/**
 * A row of the list, and the reader's own lit as the house's other choosers
 * light it: the language (components/i18n/LanguageSheetList.tsx) and the
 * Bible's translation (components/bible/TranslationList.tsx), a fine edge and
 * the house's fill, with its check.
 */
const ROW = "flex w-full items-center gap-3 rounded-md border p-2 text-start motion-safe:transition-colors";
const LIT = "border-gold/45 bg-gold/15";
const QUIET = "border-transparent hover:bg-paper/[0.04] active:bg-paper/[0.04]";

/** A list's scroller (the sheet's body, the list's parent) back at its top. */
function toTop(list: HTMLElement | null) {
  const scroller = list?.parentElement;
  if (scroller) scroller.scrollTop = 0;
}

/** The words beside a picture: the name, and the feast under it. */
function Words({ name, feast, quiet = false }: { name: string; feast: string | null; quiet?: boolean }) {
  const { t } = useTranslate();
  // A saint's name is English, as the registry writes it (the Saints list's
  // cards); "No patron saint chosen" is the reader's own language.
  const lang = quiet ? undefined : "en";
  return (
    <span className="min-w-0 flex-1">
      <span
        lang={lang}
        dir={textDir(lang)}
        className={cn("block font-sans text-ui font-semibold leading-snug rtl:text-right", quiet ? "text-paper/80" : "text-paper")}
      >
        {name}
      </span>
      {feast ? (
        <span className="mt-1 block font-sans text-caption text-paper/60">
          {t("saints.feastLabel")} <FeastDays days={[feast]} />
        </span>
      ) : null}
    </span>
  );
}

/**
 * The house's plate where no saint is chosen, in a saint's frame (SaintIcon's
 * "xs", in pixels as SaintIcon sets it, since a rem follows the reader's text
 * size), so the row keeps one height chosen or not.
 */
function NonePlate() {
  return (
    <span aria-hidden className="dark-island relative block shrink-0 overflow-hidden rounded-md border border-paper/20" style={{ width: 48, height: 64 }}>
      <FacePlate size="thumb" />
    </span>
  );
}

export function PatronChooser({
  patrons,
  value,
  onChoose,
  label,
  named,
}: {
  /** The saints to offer, in the list's order (lib/profile/patrons.ts, patronList). */
  patrons: readonly Patron[];
  /** The chosen saint's slug, or "" for none. */
  value: string;
  /** The reader chose: a saint's slug, or "" for none. */
  onChoose: (slug: string) => void;
  /** The sheet's name, the place's own words for the choice ("Patron saint"). */
  label: string;
  /** The chosen saint's name as the website gave it, for one this build does not carry. */
  named?: string | null;
}) {
  const { t } = useTranslate();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const results = useRef<HTMLUListElement | null>(null);

  const chosen = useMemo(() => patrons.find((p) => p.slug === value) ?? patronFor(value, named), [patrons, value, named]);
  const found = useMemo(() => findPatrons(patrons, query), [patrons, query]);
  const letters = useMemo(() => byLetter(patrons), [patrons]);
  const searching = query.trim().length > 0;

  // A search starts empty each time the sheet opens. It is not emptied as the
  // sheet closes: the list would be drawn again under the finger, all of it,
  // while the sheet slides away.
  function openSheet() {
    setQuery("");
    setOpen(true);
  }

  const close = useCallback(() => {
    setOpen(false);
    // Back on the row that opened it, for a keyboard; the page stays where it was.
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }, []);

  function pick(slug: string) {
    if (slug !== value) onChoose(slug);
    close();
  }

  // A computer's keys type into the search at once. A phone's keyboard stays
  // down until the field is tapped, so the saints have the screen.
  useEffect(() => {
    if (!open || !window.matchMedia?.("(pointer: fine)").matches) return;
    const frame = requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // A search reads from its first match: the list under the field starts at
  // its top as the results come, and again with each letter typed, wherever
  // the full list had been scrolled to (the sheet's body is what scrolls).
  const resultsRef = useCallback((el: HTMLUListElement | null) => {
    results.current = el;
    toTop(el);
  }, []);
  function type(next: string) {
    setQuery(next);
    toTop(results.current);
  }

  // As the sheet opens, the reader's own saint in the middle of what it shows,
  // once per opening (the sheet's body, the list's parent, is what scrolls; the
  // language sheet places the reader's language the same way).
  const placeList = useCallback((el: HTMLDivElement | null) => {
    const scroller = el?.parentElement;
    const row = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!scroller || !row) return;
    const s = scroller.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    scroller.scrollTop = Math.max(0, r.top - s.top + scroller.scrollTop - Math.max(0, (s.height - r.height) / 2));
  }, []);

  const row = (p: Patron) => {
    const on = p.slug === value;
    return (
      <li key={p.slug}>
        <button
          type="button"
          data-patron-row={p.slug}
          aria-current={on ? "true" : undefined}
          onClick={() => pick(p.slug)}
          className={cn(ROW, on ? LIT : QUIET)}
        >
          <SaintIcon saint={{ name: p.name, iconUrl: p.icon ?? undefined }} size="xs" />
          <Words name={p.name} feast={p.feast} />
          {on ? <Check size={18} aria-hidden className="shrink-0 text-paper" /> : null}
        </button>
      </li>
    );
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-patron-choose={value || "none"}
        onClick={openSheet}
        className="tap-press flex w-full items-center gap-3 rounded-[14px] border border-paper/10 bg-paper/[0.04] p-2 pe-3 text-start hover:border-paper/20"
      >
        {chosen ? <SaintIcon saint={{ name: chosen.name, iconUrl: chosen.icon ?? undefined }} size="xs" /> : <NonePlate />}
        {chosen ? <Words name={chosen.name} feast={chosen.feast} /> : <Words name={t("patron.none")} feast={null} quiet />}
        <ChevronRight size={15} aria-hidden className="shrink-0 text-paper/45 rtl:-scale-x-100" />
      </button>

      <Sheet
        open={open}
        onClose={close}
        title={label}
        fill
        desktop
        lead={
          <div className="pb-3 pt-1">
            <SearchField value={query} onChange={type} placeholder={t("patron.search")} inputRef={field} />
          </div>
        }
      >
        {searching ? (
          found.length ? (
            <ul ref={resultsRef} data-patron-found="" aria-label={label} className="space-y-0.5">
              {found.map(row)}
            </ul>
          ) : (
            <p aria-live="polite" className="px-2 py-6 font-sans text-detail text-paper/60">
              {t("patron.noMatch")}
            </p>
          )
        ) : (
          <div ref={placeList} data-patron-list="">
            <ul aria-label={label}>
              <li>
                <button
                  type="button"
                  data-patron-row=""
                  aria-current={!value ? "true" : undefined}
                  onClick={() => pick("")}
                  className={cn(ROW, !value ? LIT : QUIET)}
                >
                  <NonePlate />
                  <Words name={t("patron.none")} feast={null} quiet />
                  {!value ? <Check size={18} aria-hidden className="shrink-0 text-paper" /> : null}
                </button>
              </li>
            </ul>
            {letters.map(([letter, group]) => (
              <section key={letter} aria-labelledby={`${id}-${letter}`}>
                <h3 id={`${id}-${letter}`} className="px-2 pb-1 pt-4 font-sans text-caption font-semibold text-paper/60">
                  {letter}
                </h3>
                <ul className="space-y-0.5">{group.map(row)}</ul>
              </section>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}
