"use client";

// A reader's patron saint, for a short note on the morning of their feast.
// Beside the email lists, because the note rides the library list: without it
// switched on, choosing a patron sends nothing.
//
// The list is 158 saints long, so it is a searchable picker, not a bare
// <select>: the native list could not be searched, and on a phone it opened
// the operating system's wheel in the operating system's colours. "egypt"
// finds St. Mary of Egypt; see components/ui/SearchSelect.tsx.

import { useEffect, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/SearchSelect";
import { apiFetch } from "@/lib/api/client";

type Patron = { slug: string; name: string };

/** The "none" row. Not a slug any saint can have. */
const NONE = "__none__";

export function PatronSaintPicker() {
  const { t } = useTranslate();
  const [patrons, setPatrons] = useState<Patron[] | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [state, setState] = useState<"loading" | "ready" | "signed-out" | "unavailable">("loading");
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

  async function choose(next: string) {
    const previous = slug;
    setSlug(next);
    setSaved(false);
    setError(false);
    const res = await apiFetch("/api/profile/patron-saint", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: next || null }),
    }).catch(() => null);
    if (res?.ok) setSaved(true);
    else {
      setSlug(previous);
      setError(true);
    }
  }

  if (state === "loading" || state === "signed-out" || state === "unavailable") return null;

  return (
    <section className="rounded-md border border-paper/12 bg-paper/[0.03] p-5">
      <p className="mb-2 font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
        {t("patron.title")}
      </p>
      <p className="mb-4 font-serif text-body leading-[1.6] text-paper/85">{t("patron.hint")}</p>
      <SearchSelect
        value={slug || NONE}
        onChange={(v) => void choose(v === NONE ? "" : v)}
        options={options}
        placeholder={t("patron.none")}
        ariaLabel={t("patron.title")}
        searchPlaceholder={t("patron.search")}
        emptyLabel={t("patron.noMatch")}
      />
      <p aria-live="polite" className="font-sans text-caption">
        {saved ? <span className="mt-2 block text-paper/55">{t("patron.saved")}</span> : null}
        {error ? <span className="mt-2 block text-red-300">{t("email.prefs.error")}</span> : null}
      </p>
    </section>
  );
}
