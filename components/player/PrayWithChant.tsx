"use client";

// Pray with chant (1.7): music under a prayer. The owner, 2026-10-15:
// "allow you to play it while you're praying ... if they're not listening to
// it while they're praying, have a small little pop-up ... would you like to
// listen to this with the chant ... they can choose which chants, and
// there's like previews, right? So you just click each chant and it previews
// like the best, most popular section".
//
// Three parts. A prayer screen mounts one thing, its Pray with control
// (components/player/PrayWith.tsx, 1.7), which brings in the two that live
// here:
//   - the way in, the Chant half of that control, always there;
//   - the question, a small card at the foot of the screen, once a day at
//     most, only while nothing plays, and not once the reader has opened the
//     picker (lib/player/chantAsk.ts); it follows the finger down to go away;
//   - the picker, a sheet: each chant with a preview of the part it is known
//     by, and "Play while I pray", which plays it on a loop with the mini
//     player above the tabs. Since 2026-10-16 its chants are the Chants
//     library's own (the owner: Pray with chant opens the same library).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PreviewButton } from "@/components/player/PreviewButton";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Note } from "@/components/ui/icons/Note";
import { cn } from "@/lib/cn";
import { useChantAvailability } from "@/lib/chants/live";
import { chantMediaUrl } from "@/lib/chants/media";
import { chantTitleKey } from "@/lib/chants/names";
import { playChant } from "@/lib/chants/play";
import type { ChantIndexRow } from "@/lib/chants/types";
import { useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { chantAskLater, setAskBeforePrayers, useAskBeforePrayers } from "@/lib/player/chantAsk";
import { choiceId, loadChantIndex, underPrayerChoices } from "@/lib/player/chants";
import { usePreview } from "@/lib/player/preview";
import { usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

/** How long the page is read before the question comes, and how long it waits. */
const ASK_AFTER_MS = 1600;
const ASK_FOR_MS = 15000;

/**
 * The picker: the same library as Chants (the owner, 2026-10-16), each
 * chant with the versions that may play under a prayer, a preview of each,
 * and "Play while I pray". It reads the library's index the first time it
 * opens (app/chants-index.json, in the apps' bundle). A version that cannot
 * play now says why where its preview would be.
 */
export function ChantPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslate();
  const ask = useAskBeforePrayers();
  const audio = usePersistentAudio();
  const availabilityFor = useChantAvailability();
  const prefs = useWordsPrefs();
  const [index, setIndex] = useState<ChantIndexRow[] | null>(null);
  const [chosen, setChosen] = useState<string>("");
  const { playingId, progress, start, stop } = usePreview();

  useEffect(() => {
    if (!open || index) return;
    let alive = true;
    void loadChantIndex().then((rows) => {
      if (alive && rows) setIndex(rows);
    });
    return () => {
      alive = false;
    };
  }, [open, index]);

  const choices = index ? underPrayerChoices(index) : [];
  const playable = choices.flatMap((c) =>
    c.variants.filter((v) => availabilityFor(c.chant.slug, v) === "playable").map((v) => ({ chant: c.chant, v })),
  );
  // The first that may play is chosen until the reader picks another.
  const selected = playable.find(({ chant, v }) => choiceId(chant, v) === chosen) ?? playable[0] ?? null;

  const close = () => {
    stop();
    onClose();
  };

  const playChosen = () => {
    if (!selected) return;
    stop();
    // Under a prayer it goes round until the reader stops it.
    playChant({
      slug: selected.chant.slug,
      title: t(chantTitleKey(selected.chant.key)),
      variant: selected.v,
      coverSrc: selected.chant.cover?.src,
      prefs,
      loop: true,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={t("chant.button")} openFull desktop>
      <p className="font-sans text-detail leading-snug text-paper/65">{t("chant.sheet.body")}</p>

      <div role="radiogroup" aria-label={t("chant.button")} className="mt-4 space-y-2">
        {choices.flatMap(({ chant, variants }) =>
          variants.map((v) => {
            const id = choiceId(chant, v);
            const availability = availabilityFor(chant.slug, v);
            const can = availability === "playable";
            const isSelected = can && selected != null && choiceId(selected.chant, selected.v) === id;
            const previewing = playingId === id;
            const src = chantMediaUrl(v.audio.src);
            const now = Boolean(audio.src && audio.src.endsWith(v.audio.src) && audio.playing);
            const title = t(chantTitleKey(chant.key));
            return (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-3 rounded-[16px] border p-2.5 motion-safe:transition-colors",
                  isSelected ? "border-paper/30 bg-paper/[0.07]" : "border-paper/10 bg-paper/[0.02]",
                )}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!can}
                  onClick={() => setChosen(id)}
                  className="tap-press flex min-h-11 min-w-0 flex-1 items-center gap-3 text-start disabled:cursor-default"
                >
                  {chant.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
                    <img src={chantMediaUrl(chant.cover.src)} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" />
                  ) : (
                    <span aria-hidden className="h-11 w-11 shrink-0 rounded-[10px] bg-paper/10" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-ui font-semibold text-paper">{title}</span>
                    <span className="mt-0.5 block truncate font-sans text-caption text-paper/55" dir="auto">
                      {v.label}
                      {now ? ` · ${t("prayers.nowPlaying")}` : ""}
                    </span>
                    {availability === "offline" || availability === "pulled" ? (
                      <span className="mt-0.5 block font-sans text-caption text-paper/50">
                        {availability === "offline" ? t("chants.needsConnection") : t("chants.unavailable")}
                      </span>
                    ) : null}
                  </span>
                  {/* The chosen one carries a check, drawn in as it is picked; the
                      rest carry nothing (1.7.1: the white dot in a white disc
                      read as stock UI). The slot stays, so nothing shifts. */}
                  {can ? (
                    <span aria-hidden className="grid size-5 shrink-0 place-items-center text-paper">
                      {isSelected ? <Check size={20} strokeWidth={2.2} className="check-draw" /> : null}
                    </span>
                  ) : null}
                </button>
                {can ? (
                  <PreviewButton
                    playing={previewing}
                    progress={progress}
                    label={previewing ? t("chant.stopPreview") : t("chant.preview", { title: `${title} (${v.label})` })}
                    onToggle={() => (previewing ? stop() : start({ id, src, ...v.preview }))}
                  />
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      <button
        type="button"
        onClick={playChosen}
        disabled={!selected}
        className="tap-press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper font-sans text-ui font-semibold text-night disabled:opacity-40"
      >
        <Note size={18} />
        {t("chant.play")}
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={ask}
        onClick={() => setAskBeforePrayers(!ask)}
        className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 text-start"
      >
        <span className="font-sans text-detail text-paper/75">{t("chant.askBefore")}</span>
        <span
          aria-hidden
          className={cn("relative h-6 w-10 shrink-0 rounded-full motion-safe:transition-colors", ask ? "bg-paper" : "bg-paper/20")}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full motion-safe:transition-transform",
              ask ? "translate-x-[18px] bg-night" : "translate-x-0.5 bg-paper/80",
            )}
          />
        </span>
      </button>

      {/* The whole library, one tap away. */}
      <Link
        href="/chants"
        onClick={close}
        className="tap-press mt-2 flex min-h-11 items-center justify-between gap-3 font-sans text-detail font-semibold text-paper/80 hover:text-paper"
      >
        {t("chants.row.all")}
        <ChevronRight size={15} className="text-paper/50 rtl:-scale-x-100" />
      </Link>
    </Sheet>
  );
}

/** The question at the foot of the screen. It follows the finger down. */
export function AskCard({ onChoose, onDismiss }: { onChoose: () => void; onDismiss: () => void }) {
  const { t } = useTranslate();
  const [shown, setShown] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const away = window.setTimeout(onDismiss, ASK_FOR_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(away);
    };
  }, [onDismiss]);

  const move = (dy: number) => {
    if (card.current) card.current.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };

  return (
    <div className="now-playing-lift pointer-events-none fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] md:pb-4">
      <div
        ref={card}
        role="dialog"
        aria-label={t("chant.ask.title")}
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, dy: 0 };
          if (card.current) card.current.style.transition = "none";
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          drag.current.dy = e.clientY - drag.current.y;
          move(drag.current.dy);
        }}
        onPointerUp={() => {
          const dy = drag.current?.dy ?? 0;
          drag.current = null;
          if (card.current) card.current.style.transition = "";
          if (dy > 56) onDismiss();
          else move(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          if (card.current) card.current.style.transition = "";
          move(0);
        }}
        className={cn(
          "pointer-events-auto mx-auto flex max-w-md touch-none items-center gap-3 rounded-[18px] bg-night-soft p-3 shadow-[0_14px_34px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-paper/10",
          "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [:where([data-motion=reduce])_&]:transition-none",
          shown ? "opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-paper/[0.08] text-paper">
          <Note size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-ui font-semibold leading-tight text-paper">{t("chant.ask.title")}</span>
          <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/60">{t("chant.ask.body")}</span>
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="tap-press min-h-11 shrink-0 px-2 font-sans text-caption font-semibold text-paper/60"
        >
          {t("chant.ask.notNow")}
        </button>
        <button
          type="button"
          onClick={onChoose}
          className="tap-press h-11 shrink-0 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night"
        >
          {t("chant.ask.choose")}
        </button>
      </div>
    </div>
  );
}

/**
 * When to ask (the question at the foot of the screen): once the prayer has
 * been on the screen a moment, once a day at most, never while something
 * already plays, and not at all once the reader has opened the picker
 * themselves (lib/player/chantAsk.ts, chantAskLater). Returns whether the
 * card is up and how to put it away. Mounted once per prayer screen, by its
 * Pray with control (components/player/PrayWith.tsx), which puts it away as
 * it opens the picker.
 */
export function useChantAsk(playing: boolean): { asking: boolean; dismiss: () => void } {
  const [asking, setAsking] = useState(false);
  const playingRef = useRef(playing);
  /** Calls the question off before it comes. */
  const callOff = useRef<() => void>(() => {});
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const off = chantAskLater(ASK_AFTER_MS, () => playingRef.current, () => setAsking(true));
    callOff.current = off;
    return off;
  }, []);

  // Put away, or answered before it came: it does not come on this screen.
  const dismiss = useCallback(() => {
    callOff.current();
    setAsking(false);
  }, []);
  return { asking: asking && !playing, dismiss };
}
