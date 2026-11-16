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
//
// On the reader's own page the saint is a picture card (build 98 note 11,
// You and Profile as one design): his icon, his name, his feast, and Change.
// It is drawn from what the device keeps of the reader's card
// (lib/profile/myCard.ts) while the list is on its way, so it is there with
// the page and does not arrive under the reader's eyes; the sheet opens once
// the list has come.

import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PatronChooser } from "@/components/profile/PatronChooser";
import { apiFetch } from "@/lib/api/client";
import { useMyCard } from "@/lib/profile/myCard";
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

/** The chooser and the line that says it saved. `card`: the saint as a picture card; `waiting`: the list has not come. */
export function PatronSelect({ choice, card = false, waiting = false }: { choice: PatronChoice; card?: boolean; waiting?: boolean }) {
  const { t } = useTranslate();
  return (
    <>
      <PatronChooser patrons={choice.patrons} value={choice.value} named={choice.named} onChoose={choice.choose} label={t("patron.title")} card={card} waiting={waiting} />
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
  const card = useMyCard();
  const box = useRef<HTMLElement>(null);

  // Asked for by name (#patron, the My saint widget's tap with no saint
  // chosen): once the list is in, the picker comes into view, mid-screen.
  useEffect(() => {
    if (choice.state !== "ready" || window.location.hash !== `#${PATRON_ANCHOR}`) return;
    box.current?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [choice.state]);

  // What the device already knows of the reader's saint (one chosen, or
  // none), until the website has answered. Drawn for none too: the line
  // under the reader's name that invites them to choose leads here.
  const ready = choice.state === "ready";
  if (choice.state === "signed-out" || (!ready && !card)) return null;
  const kept = card?.patronSaint ?? null;
  const shown: PatronChoice = ready ? choice : { ...choice, value: kept?.slug ?? "", named: kept?.name ?? null };

  // The saint as a picture card on the page, and under it one quiet line on
  // what choosing him does. Until 1.9 it was a row of a form: the choice's
  // name, that line, then a field, all in one box.
  return (
    <section id={PATRON_ANCHOR} ref={box} className="scroll-mt-24">
      <PatronSelect choice={shown} card waiting={!ready} />
      <p className="mt-2.5 px-1 font-sans text-caption leading-[1.5] text-paper/55">{t("patron.hint")}</p>
    </section>
  );
}
