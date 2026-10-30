"use client";

// Try Listen offline (r3-07 A): Now Playing at John 1, its cover, its title,
// and at the end of the title's line the player's own Save offline mark
// (components/player/SaveOffline.tsx, SaveOfflineMark), going through what it
// does when tapped: the ring filling chapter by chapter, "Saving 7 of 21",
// then the check and "John is saved to listen offline", with Remove.
//
// It shows the mark; it saves nothing. A book saved to a phone is the
// feature itself, so here the mark only walks through its three looks, and a
// tap on it walks through them again (lib/premium/plusTry.ts, TRY_SAVE_MS).

import { useEffect, useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { SaveOfflineMark } from "@/components/player/SaveOffline";
import { getBook } from "@/lib/bible/books";
import { readAloudCover } from "@/lib/readAloud/covers";
import { TRY_CHAPTER, TRY_SAVE_MS, savedSoFar } from "@/lib/premium/plusTry";

import { TryWindow } from "./TryKit";

/** How long the mark rests before it is "tapped", so the first look is seen. */
const REST_MS = 700;
const TICK_MS = 120;

type Phase = { look: "save" } | { look: "saving"; since: number; now: number } | { look: "saved"; open: boolean };

export default function TryOffline({ row }: TryProps) {
  const { t } = useTranslate();
  const book = TRY_CHAPTER.book;
  const name = t(`bible.books.${book}`);
  const total = getBook(book)?.chapters ?? 21;
  const cover = readAloudCover(book);
  const [phase, setPhase] = useState<Phase>({ look: "save" });

  // The first time, the mark is tapped by itself after a moment.
  useEffect(() => {
    const id = setTimeout(() => setPhase((p) => (p.look === "save" ? { look: "saving", since: Date.now(), now: Date.now() } : p)), REST_MS);
    return () => clearTimeout(id);
  }, []);

  // While saving, the chapters count up; at the end, the check and its line.
  const saving = phase.look === "saving";
  useEffect(() => {
    if (!saving) return;
    const id = setInterval(() => {
      setPhase((p) => {
        if (p.look !== "saving") return p;
        const now = Date.now();
        return now - p.since >= TRY_SAVE_MS ? { look: "saved", open: true } : { ...p, now };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [saving]);

  const done = phase.look === "saving" ? savedSoFar(phase.now - phase.since, total) : 0;
  const line =
    phase.look === "saving"
      ? t("player.offline.saving", { done, total })
      : phase.look === "saved" && phase.open
        ? t("player.offline.saved", { book: name })
        : null;

  return (
    <TryWindow label={t(row.name)} tall>
      <div className="flex min-h-full flex-col items-center px-5 pb-16 pt-6">
        <CoverArt
          src={cover.src}
          fallback={cover.fallback}
          size={168}
          className="h-[168px] w-[168px] rounded-[16px] object-cover object-[50%_18%] shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
        />
        <div className="mt-5 flex w-full max-w-[300px] items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[22px] font-bold leading-tight text-paper">{`${name} ${TRY_CHAPTER.chapter}`}</p>
            {cover.nameKey ? <p className="mt-1 truncate font-sans text-detail text-paper/55">{t(cover.nameKey)}</p> : null}
          </div>
          {phase.look === "saving" ? (
            <SaveOfflineMark look="saving" share={total ? done / total : 0} label={t("player.offline.saving", { done, total })} className="-mr-2.5" />
          ) : phase.look === "saved" ? (
            <SaveOfflineMark
              look="saved"
              expanded={phase.open}
              onClick={() => setPhase({ look: "saved", open: !phase.open })}
              label={t("player.offline.saved", { book: name })}
              className="-mr-2.5"
            />
          ) : (
            <SaveOfflineMark
              look="save"
              onClick={() => setPhase({ look: "saving", since: Date.now(), now: Date.now() })}
              label={t("player.offline.save", { book: name })}
              className="-mr-2.5"
            />
          )}
        </div>
        <p role="status" className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-x-2 text-center font-sans text-caption text-paper/60">
          {line ? <span>{line}</span> : null}
          {phase.look === "saved" && phase.open ? (
            <button
              type="button"
              onClick={() => setPhase({ look: "save" })}
              className="tap-press hit-44 px-1 font-semibold text-paper/85 underline-offset-4 hover:underline"
            >
              {t("player.offline.remove")}
            </button>
          ) : null}
        </p>
      </div>
    </TryWindow>
  );
}
