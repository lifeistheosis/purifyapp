"use client";

// A reader's patron saint, for a short note on the morning of their feast.
// Beside the email lists, because the note rides the library list: without it
// switched on, choosing a patron sends nothing.
//
// The list is 270 saints long. It was a searchable dropdown of bare names
// (components/ui/SearchSelect.tsx) until build 95 note 17; it is the patron
// saint's chooser now, each saint with his icon and feast in the house's
// sheet, found by any part of his name ("egypt" finds St. Mary of Egypt) and
// lettered by his own (components/profile/PatronChooser.tsx).

import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PatronChooser } from "@/components/profile/PatronChooser";
import { apiFetch } from "@/lib/api/client";
import { PATRON_ANCHOR, announcePatron } from "@/lib/profile/patronEvent";
import { patronList, type Patron, type ServerPatron } from "@/lib/profile/patrons";
import { prefersReducedMotion } from "@/lib/ui/motion";

export type PatronChoice = {
  state: "loading" | "ready" | "signed-out" | "unavailable";
  /** The saints the website will save, as the chooser draws them. */
  patrons: Patron[];
  /** The chosen saint's slug, or "" for none. */
  value: string;
  /** The chosen saint's name as the website gave it, for one this build does not carry. */
  named: string | null;
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
  const [server, setServer] = useState<ServerPatron[] | null>(null);
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
        const { patrons: all } = (await list.json()) as { patrons: ServerPatron[] };
        const { slug: current } = (await mine.json()) as { slug: string | null };
        setServer(all);
        setSlug(current ?? "");
        setState("ready");
      })
      .catch(() => alive && setState("unavailable"));
    return () => {
      alive = false;
    };
  }, []);

  const patrons = useMemo(() => patronList(server ?? []), [server]);

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

  const named = server?.find((p) => p.slug === slug)?.name ?? null;

  return { state, patrons, value: slug, named, choose: (v) => void save(v), saved, error };
}

/** The chooser and the line that says it saved. */
export function PatronSelect({ choice }: { choice: PatronChoice }) {
  const { t } = useTranslate();
  return (
    <>
      <PatronChooser patrons={choice.patrons} value={choice.value} named={choice.named} onChoose={choice.choose} label={t("patron.title")} />
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
