"use client";

// A reader's patron saint, for a short note on the morning of their feast.
// Beside the email lists, because the note rides the library list: without it
// switched on, choosing a patron sends nothing.
//
// The list is 158 saints long, so it is a searchable picker, not a bare
// <select>: the native list could not be searched, and on a phone it opened
// the operating system's wheel in the operating system's colours. "egypt"
// finds St. Mary of Egypt; see components/ui/SearchSelect.tsx.

import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/SearchSelect";
import { apiFetch } from "@/lib/api/client";
import { PATRON_ANCHOR, announcePatron } from "@/lib/profile/patronEvent";
import { prefersReducedMotion } from "@/lib/ui/motion";

type Patron = { slug: string; name: string };

/** The "none" row. Not a slug any saint can have. */
const NONE = "__none__";

export type PatronChoice = {
  state: "loading" | "ready" | "signed-out" | "unavailable";
  options: SearchSelectOption[];
  value: string;
  choose: (next: string) => void;
  saved: boolean;
  error: boolean;
};

/**
 * The reader's patron saint: the list, their choice, and saving it. One for
 * each place that offers the choice: the reader's own page (below) and
 * Settings' row (components/settings/PatronRow.tsx, note 17), each of which
 * tells the widget at once when a saint is saved.
 */
export function usePatronChoice(): PatronChoice {
  const { t } = useTranslate();
  const [patrons, setPatrons] = useState<Patron[] | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [state, setState] = useState<PatronChoice["state"]>("loading");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([apiFetch("/api/saints/patrons"), apiFetch("/api/profile/patron-saint")])
      .then(async ([list, mine]) => {
        if (!alive) return;
        if (mine.status === 401) return setState("signed-out");
        if (!list.ok || !mine.ok) return setState("unavailable");
        const { patrons: all } = (await list.json()) as { patrons: Patron[] };
        const { slug: current } = (await mine.json()) as { slug: string | null };
        setPatrons(all);
        setSlug(current ?? "");
        setState("ready");
      })
      .catch(() => alive && setState("unavailable"));
    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo<SearchSelectOption[]>(
    () => [{ value: NONE, label: t("patron.none") }, ...(patrons ?? []).map((p) => ({ value: p.slug, label: p.name }))],
    [patrons, t],
  );

  async function save(next: string) {
    const previous = slug;
    setSlug(next);
    setSaved(false);
    setError(false);
    const res = await apiFetch("/api/profile/patron-saint", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: next || null }),
    }).catch(() => null);
    if (res?.ok) {
      setSaved(true);
      // The My saint widget shows the saint now, not after the app's next
      // return to the front (note 85, lib/profile/patronEvent.ts).
      announcePatron(next || null);
    } else {
      setSlug(previous);
      setError(true);
    }
  }

  return { state, options, value: slug || NONE, choose: (v) => void save(v === NONE ? "" : v), saved, error };
}

/** The searchable picker and the line that says it saved. */
export function PatronSelect({ choice }: { choice: PatronChoice }) {
  const { t } = useTranslate();
  return (
    <>
      <SearchSelect
        value={choice.value}
        onChange={choice.choose}
        options={choice.options}
        placeholder={t("patron.none")}
        ariaLabel={t("patron.title")}
        searchPlaceholder={t("patron.search")}
        emptyLabel={t("patron.noMatch")}
      />
      <p aria-live="polite" className="font-sans text-caption">
        {choice.saved ? <span className="mt-2 block text-paper/55">{t("patron.saved")}</span> : null}
        {choice.error ? <span className="mt-2 block text-red-300">{t("email.prefs.error")}</span> : null}
      </p>
    </>
  );
}

export function PatronSaintPicker() {
  const { t } = useTranslate();
  const choice = usePatronChoice();
  const box = useRef<HTMLElement>(null);

  // Asked for by name (#patron, the My saint widget's tap with no saint
  // chosen): once the list is in, the picker comes into view, mid-screen.
  useEffect(() => {
    if (choice.state !== "ready" || window.location.hash !== `#${PATRON_ANCHOR}`) return;
    box.current?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [choice.state]);

  if (choice.state !== "ready") return null;

  // Drawn as a row of Settings is (1.8): its name, one line on what it does,
  // then the picker, in the rounded list every phone screen under You uses.
  return (
    <section id={PATRON_ANCHOR} ref={box} className="scroll-mt-24 rounded-2xl border border-paper/10 bg-paper/[0.03] px-4 py-4">
      <p className="font-sans text-ui text-paper">{t("patron.title")}</p>
      <p className="mb-3 mt-0.5 font-sans text-caption leading-[1.5] text-paper/55">{t("patron.hint")}</p>
      <PatronSelect choice={choice} />
    </section>
  );
}
