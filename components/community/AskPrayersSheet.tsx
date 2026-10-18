"use client";

import { useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { saveMyProfile } from "@/lib/profile/client";
import { WALL_INTENTION_MAX } from "@/lib/prayers/wallNames";

/**
 * Asking for prayers, and what for (1.7.1). The owner, 2026-10-18: "when you
 * click ask for prayers, right? You should be able to put why, right? Ask a
 * prayer for what?"
 *
 * One short field, optional, with the limit the column keeps (120). The words
 * go through the word filter as a post does (app/api/profile/me): a listed
 * word would be masked, so the reader is asked first, in the post's own words,
 * and a moderator sees what was written. A link is refused. The sheet takes
 * typing, so it stands above the keyboard (Sheet `fill`) at its own height.
 */
export function AskPrayersSheet({
  open,
  onClose,
  onAsked,
}: {
  open: boolean;
  onClose: () => void;
  /** The request is up. */
  onAsked: () => void;
}) {
  const { t } = useTranslate();
  const field = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtered, setFiltered] = useState(false);
  const left = WALL_INTENTION_MAX - text.length;

  async function ask(confirmFiltered = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const words = text.trim();
    const res = await saveMyProfile({ prayerRequest: true, prayerIntention: words || null, confirmFiltered });
    setBusy(false);
    if (res.ok) {
      setText("");
      setFiltered(false);
      onAsked();
      return;
    }
    if (res.code === "filtered") {
      setFiltered(true);
      return;
    }
    setError(
      res.code === "intention_link"
        ? t("community.wallNoLinks")
        : res.code === "unavailable"
          ? t("profile.notOpenYet")
          : t("profile.err.saveFailed"),
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("community.wallAsk")} desktop fill panelClassName="h-auto">
      <div className="space-y-4 pt-1">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="wall-intention" className="font-sans text-detail font-semibold text-paper/80">
              {t("community.wallIntentionLabel")}
            </label>
            <span className={cn("shrink-0 font-sans text-caption tabular-nums", left < 10 ? "text-paper/70" : "text-paper/40")}>
              {t("profile.charsLeft", { count: left })}
            </span>
          </div>
          <textarea
            ref={field}
            id="wall-intention"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFiltered(false);
            }}
            maxLength={WALL_INTENTION_MAX}
            rows={3}
            placeholder={t("community.wallIntentionPlaceholder")}
            aria-describedby="wall-intention-hint"
            className="block w-full resize-none rounded-lg border border-paper/15 bg-night px-3.5 py-2.5 font-sans text-ui leading-relaxed text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none"
          />
          <p id="wall-intention-hint" className="mt-1.5 font-sans text-caption leading-relaxed text-paper/50">
            {t("community.wallIntentionHint")}
          </p>
        </div>

        {error ? (
          <p role="alert" className="font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}

        {filtered ? (
          // The word filter's question, in the words a post is asked it with.
          <div role="alert">
            <p className="font-sans text-detail font-semibold text-paper">{t("community.filteredTitle")}</p>
            <p className="mt-1 font-sans text-detail leading-relaxed text-paper/70">{t("community.filteredBody")}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pb-1">
          {filtered ? (
            <>
              <button
                type="button"
                onClick={() => void ask(true)}
                disabled={busy}
                className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-60"
              >
                {t("community.filteredPost")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltered(false);
                  field.current?.focus();
                }}
                className="inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-5 font-sans text-detail font-semibold text-paper/85 transition-colors hover:border-paper/45"
              >
                {t("community.filteredEdit")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void ask()}
              disabled={busy}
              className="inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-60"
            >
              {t("community.wallAsk")}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
