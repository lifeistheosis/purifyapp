"use client";

import { useCallback, useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { listMutedReaders, unmuteCommunityAuthor, type MutedReader } from "@/lib/community/client";

/**
 * The readers this account has muted in Community, and a way back. Beside
 * the blocked list, because it answers the same question, quieter.
 *
 * Unmuting does not ask first, unlike unblocking: a mute only folds someone's
 * posts away from this reader, and putting them back is as small as hiding
 * them was. Names only, never ids, like the blocked list.
 */
export function MutedReadersCard() {
  const { t, tn } = useTranslate();
  const [mutes, setMutes] = useState<MutedReader[] | "error" | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listMutedReaders();
    setMutes(list ?? "error");
  }, []);

  useEffect(() => {
    let alive = true;
    void listMutedReaders().then((list) => {
      if (alive) setMutes(list ?? "error");
    });
    return () => {
      alive = false;
    };
  }, []);

  async function unmute(reader: MutedReader) {
    setPending(reader.id);
    setError(null);
    const res = await unmuteCommunityAuthor({ id: reader.id });
    setPending(null);
    if (res.ok) setMutes((prev) => (Array.isArray(prev) ? prev.filter((m) => m.id !== reader.id) : prev));
    else setError(res.error ?? t("community.unmuteFailed"));
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="mb-1 font-sans text-body font-semibold text-paper">{t("community.mutedTitle")}</h2>
      <p className="mb-5 font-sans text-detail leading-[1.55] text-paper/60">{t("community.mutedHint")}</p>

      {mutes === null ? (
        <p className="font-sans text-detail text-paper/45">{t("community.blockedLoading")}</p>
      ) : mutes === "error" ? (
        <div>
          <p className="font-sans text-detail text-crimson-soft">{t("community.mutedLoadFailed")}</p>
          <button
            type="button"
            onClick={() => {
              setMutes(null);
              void load();
            }}
            className="mt-2 font-sans text-detail font-semibold text-gold-pale hover:text-paper"
          >
            {t("community.tryAgain")}
          </button>
        </div>
      ) : mutes.length === 0 ? (
        <p className="font-sans text-detail text-paper/45">{t("community.mutedNone")}</p>
      ) : (
        <>
          <p className="mb-3 font-sans text-caption text-paper/45">{tn("community.mutedCount", mutes.length)}</p>
          <ul className="divide-y divide-paper/8 rounded-md border border-paper/10">
            {mutes.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <p className="min-w-0 truncate font-sans text-detail font-semibold text-paper">{m.muted_name}</p>
                <button
                  type="button"
                  onClick={() => void unmute(m)}
                  disabled={pending === m.id}
                  aria-label={t("community.unmuteAria", { name: m.muted_name })}
                  className="hit-44 shrink-0 rounded-pill border border-paper/20 px-3.5 py-1.5 font-sans text-caption font-medium text-paper/80 transition-colors hover:border-paper/40 hover:bg-paper/[0.06] hover:text-paper disabled:opacity-50"
                >
                  {t("community.unmute")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}
    </section>
  );
}
