"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { isChosen, minutesLeft, setSleepTimer, useSleepTimer, type SleepChoice } from "@/lib/player/sleep";

/** The minutes the timer offers, between Off and the end of the track. */
export const SLEEP_MINUTES = [5, 10, 15, 30, 60] as const;

/**
 * The sleep timer as a sheet: Off, so many minutes, or the end of the track.
 * The one timer for the voice, a chant and the ambience (lib/player/sleep.ts).
 *
 * Its own file from 1.9, when the reader's dock (components/bible/ReaderDock.tsx,
 * the owner's pick for Listening) came to open it too. Inside Now Playing it
 * stands over the player (`layer="over-player"`); from the dock it is an
 * ordinary sheet over the page.
 */
export function SleepTimerSheet({ open, onClose, layer }: { open: boolean; onClose: () => void; layer?: "over-player" }) {
  const { t } = useTranslate();
  const sleep = useSleepTimer();
  const choices: { key: string; label: string; choice: SleepChoice }[] = [
    { key: "off", label: t("common.off"), choice: { kind: "off" } },
    ...SLEEP_MINUTES.map((m) => ({ key: String(m), label: t("today.minRead", { count: m }), choice: { kind: "minutes", minutes: m } as SleepChoice })),
    { key: "end", label: t("player.sleepEnd"), choice: { kind: "end" } },
  ];
  return (
    <Sheet open={open} onClose={onClose} title={t("player.sleep")} desktop layer={layer}>
      <div role="group" aria-label={t("player.sleep")} className="divide-y divide-paper/10">
        {choices.map((o) => {
          const on = isChosen(sleep, o.choice);
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setSleepTimer(o.choice);
                onClose();
              }}
              className={cn(
                "flex min-h-12 w-full items-center justify-between gap-3 text-start font-sans text-ui hover:text-paper",
                on ? "font-semibold text-paper" : "text-paper/75",
              )}
            >
              {o.label}
              {on ? <Check size={18} className="shrink-0" /> : null}
            </button>
          );
        })}
      </div>
      {sleep.kind === "minutes" ? (
        <p role="status" className="mt-3 font-sans text-caption text-paper/60">
          {t("player.sleepIn", { count: minutesLeft(sleep) })}
        </p>
      ) : null}
    </Sheet>
  );
}
