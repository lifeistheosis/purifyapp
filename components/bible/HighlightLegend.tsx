"use client";

import { useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useHighlightLegend } from "@/lib/bible/highlightColors";

/**
 * The highlight key shown beneath a chapter: a swatch + meaning for each
 * color. "Edit" turns each meaning into an input so the reader can name what
 * their colors stand for (e.g. yellow = "Key verse", blue = "A teaching").
 * Definitions persist in localStorage and apply everywhere highlights show.
 */
export function HighlightLegend() {
  const { t } = useTranslate();
  const { colors, labelFor, setLabel, reset } = useHighlightLegend();
  const [editing, setEditing] = useState(false);

  return (
    <section
      aria-label={t("bible.highlightColors")}
      className="mt-10 rounded-xl border border-paper/10 bg-paper/[0.03] px-4 py-3.5"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
          {t("bible.highlightColors")}
        </h2>
        <div className="flex items-center gap-3">
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="font-sans text-caption text-paper/55 hover:text-paper/80 transition-colors"
            >
              {t("prayers.rope.reset")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="font-sans text-caption text-[#f2594e] hover:text-[#ff7a6e] transition-colors"
          >
            {editing ? "Done" : "Edit meanings"}
          </button>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
        {colors.map((c) => (
          <li key={c.id} className="inline-flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: c.swatch }}
            />
            {editing ? (
              <input
                type="text"
                defaultValue={labelFor(c.id)}
                maxLength={28}
                aria-label={`Meaning for ${c.id} highlight`}
                onBlur={(e) => setLabel(c.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-32 bg-transparent border-b border-paper/25 focus:border-accent outline-none font-sans text-caption text-paper/90 leading-tight pb-0.5 transition-colors"
              />
            ) : (
              <span className="font-sans text-caption text-paper/75 truncate">
                {labelFor(c.id)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <p className="mt-3 font-sans text-eyebrow text-paper/40 leading-relaxed">
          {t("bible.highlightLegendNote")}
        </p>
      )}
    </section>
  );
}
