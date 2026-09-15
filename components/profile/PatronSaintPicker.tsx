"use client";

// A reader's patron saint, for a short note on the morning of their feast.
// Beside the email lists, because the note rides the library list: without it
// switched on, choosing a patron sends nothing.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";

type Patron = { slug: string; name: string };

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
      <label className="block">
        <span className="sr-only">{t("patron.title")}</span>
        <select
          value={slug}
          onChange={(e) => void choose(e.target.value)}
          className="w-full rounded-md border border-paper/20 bg-night px-3 py-2.5 font-sans text-ui text-paper"
        >
          <option value="">{t("patron.none")}</option>
          {(patrons ?? []).map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {saved ? <p className="mt-2 font-sans text-caption text-paper/55">{t("patron.saved")}</p> : null}
      {error ? <p className="mt-2 font-sans text-caption text-red-300">{t("email.prefs.error")}</p> : null}
    </section>
  );
}
