"use client";

// The two optional email lists, both off until the reader turns them on.
// Beside PushOptIn on the account page, because the settings screen links to
// everything that needs an account rather than duplicating it.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";

type Prefs = { shopOffers: boolean; productUpdates: boolean };

type State =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "unavailable" }
  | { kind: "ready"; prefs: Prefs };

export function EmailPreferences() {
  const { t } = useTranslate();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch("/api/email/preferences")
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 401) return setState({ kind: "signed-out" });
        if (!res.ok) return setState({ kind: "unavailable" });
        setState({ kind: "ready", prefs: (await res.json()) as Prefs });
      })
      .catch(() => alive && setState({ kind: "unavailable" }));
    return () => {
      alive = false;
    };
  }, []);

  async function toggle(key: keyof Prefs) {
    if (state.kind !== "ready" || saving) return;
    const previous = state.prefs;
    const next = { ...previous, [key]: !previous[key] };
    setState({ kind: "ready", prefs: next });
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/email/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState({ kind: "ready", prefs: (await res.json()) as Prefs });
    } catch {
      setState({ kind: "ready", prefs: previous });
      setError(t("email.prefs.error"));
    } finally {
      setSaving(false);
    }
  }

  const rows: { key: keyof Prefs; label: string; hint: string }[] = [
    { key: "productUpdates", label: t("email.prefs.productUpdates"), hint: t("email.prefs.productUpdatesHint") },
    { key: "shopOffers", label: t("email.prefs.shopOffers"), hint: t("email.prefs.shopOffersHint") },
  ];

  return (
    <section id="email" className="rounded-md border border-paper/12 bg-paper/[0.03] p-5">
      <p className="mb-2 font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
        {t("email.prefs.title")}
      </p>
      <p className="mb-4 font-serif text-body leading-[1.6] text-paper/85">{t("email.prefs.hint")}</p>

      {state.kind === "loading" && <p className="font-sans text-detail italic text-paper/55">{t("ui.checking")}</p>}
      {state.kind === "signed-out" && <p className="font-sans text-detail text-paper/55">{t("email.prefs.signIn")}</p>}
      {state.kind === "unavailable" && (
        <p className="font-sans text-detail text-paper/55">{t("email.prefs.unavailable")}</p>
      )}

      {state.kind === "ready" && (
        <ul className="divide-y divide-paper/8">
          {rows.map((row) => {
            const on = state.prefs[row.key];
            return (
              <li key={row.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-sans text-ui text-paper">{row.label}</p>
                  <p className="mt-0.5 font-sans text-caption leading-[1.5] text-paper/55">{row.hint}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={row.label}
                  disabled={saving}
                  onClick={() => void toggle(row.key)}
                  className={
                    "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60 " +
                    (on ? "border-gold/50 bg-gold/40" : "border-paper/20 bg-paper/10")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-paper transition-[left] " +
                      (on ? "left-[22px]" : "left-[3px]")
                    }
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? <p className="mt-3 font-sans text-detail text-red-300">{error}</p> : null}
    </section>
  );
}
