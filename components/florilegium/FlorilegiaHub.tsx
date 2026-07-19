"use client";

import { useState } from "react";
import Link from "next/link";

import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The Florilegium hub: the reader's collections, newest first, plus a
 * quiet "begin a new gathering" affordance. Local-first; the list comes
 * straight from localStorage via useFlorilegia, so it is instant and
 * works offline. Sign-in (with Plus) syncs it across devices.
 */
export function FlorilegiaHub() {
  const { t } = useTranslate();
  const { florilegia, create } = useFlorilegia();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = create(title);
    setTitle("");
    setCreating(false);
    // Stay on the hub; the new collection appears at the top. The reader
    // can open it to begin gathering.
    void id;
  }

  return (
    <div className="mt-10">
      {creating ? (
        <form
          onSubmit={submit}
          className="mb-8 rounded-lg border border-paper/15 bg-paper/[0.03] p-5"
        >
          <label
            htmlFor="florilegium-title"
            className="block font-sans text-caption text-paper/65 mb-2"
          >
            {t("study.florilegium.nameThisGathering")}
          </label>
          <input
            id="florilegium-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("study.florilegium.hubPlaceholder")}
            maxLength={80}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/50 transition-colors"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              className="font-sans text-ui font-semibold rounded-pill px-5 py-2.5 bg-gold text-night hover:bg-gold-soft transition-colors"
            >
              {t("today.prayNow.begin")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setTitle("");
              }}
              className="font-sans text-ui font-medium rounded-pill px-5 py-2.5 border border-paper/25 text-paper/80 hover:border-paper/55 hover:text-paper transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mb-8 font-sans text-ui font-semibold rounded-pill px-5 py-3 border border-gold/40 text-paper hover:bg-gold/[0.06] hover:border-gold/60 transition-colors"
        >
          {t("study.florilegium.beginNewArrow")}
        </button>
      )}

      {florilegia.length === 0 ? (
        <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-10 text-center">
          <p className="font-serif italic text-lede text-paper/65 leading-[1.6]">
            {t("study.florilegium.definition")}
          </p>
          <p className="mt-3 font-sans text-detail text-paper/50 leading-[1.6] max-w-[46ch] mx-auto">
            {t("study.asYouReadKeepThe")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {florilegia.map((f) => (
            <li key={f.id}>
              <Link
                href={`/florilegium/${f.id}`}
                className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-serif text-lede md:text-title-sm text-paper leading-tight">
                    {f.title}
                  </p>
                  <p className="shrink-0 font-sans text-caption text-paper/40 tabular-nums">
                    {f.items.length}{" "}
                    {f.items.length === 1 ? "line" : "lines"}
                  </p>
                </div>
                {f.description ? (
                  <p className="mt-1 font-serif italic text-detail text-paper/55 leading-[1.5]">
                    {f.description}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
