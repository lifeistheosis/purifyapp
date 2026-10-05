"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { readLastRead } from "@/lib/bible/lastRead";
import { cn } from "@/lib/cn";
import { nextMilestone } from "@/lib/streak/compute";
import { useStreak, type StreakView } from "@/lib/streak/useStreak";
import { FlameStage, StreakFlame } from "./StreakFlame";
import { WeekStrip } from "./WeekStrip";

/** Where "Pray" and "Read" go: the rule of the hour, and the chapter left open. */
export function keepDayLinks(): { pray: string; read: string } {
  const last = typeof window === "undefined" ? null : readLastRead();
  return {
    pray: new Date().getHours() < 12 ? "/prayers/morning" : "/prayers/evening",
    read: last ? `/bible/${last.book}/${last.chapter}` : "/bible",
  };
}

/** The big flame and the count, shared by the sheet and the You card. */
export function StreakHero({ view, size = 84 }: { view: StreakView; size?: number }) {
  const { tn } = useTranslate();
  const state = view.current === 0 ? "out" : view.keptToday ? "lit" : "pending";
  return (
    <div className="flex flex-col items-center text-center">
      {/* The glow sits inside the stage's own box, so a sheet's scrolling
          body has nothing to cut (FlameStage). */}
      <FlameStage size={size} glow={state === "lit"}>
        <span className={cn("relative", view.atRisk && "streak-pulse", state === "out" && "text-paper")}>
          <StreakFlame size={size} state={state} flicker={state === "lit"} />
        </span>
      </FlameStage>
      {/* relative: the number and its label are drawn over the glow's lower
          edge, never under it. */}
      <p
        className={cn(
          "relative mt-3 font-sans text-display-sm font-bold leading-none tabular-nums",
          view.current > 0 ? "text-streak" : "text-paper/45",
        )}
      >
        {view.current}
      </p>
      <p className="relative mt-1.5 font-sans text-ui font-semibold text-paper">{tn("streak.daysInARow", view.current)}</p>
    </div>
  );
}

export function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, tn } = useTranslate();
  const view = useStreak();
  const next = nextMilestone(view.current);
  const links = keepDayLinks();
  const status = view.keptToday ? t("streak.keptToday") : view.current > 0 ? t("streak.notYet") : t("streak.start");

  return (
    <Sheet open={open} onClose={onClose} title={t("streak.title")} desktop openFull>
      <div className="pt-1">
        <StreakHero view={view} />
        <p
          className={cn(
            "mx-auto mt-3 max-w-[320px] text-center font-sans text-detail leading-snug",
            view.atRisk ? "font-semibold text-streak" : "text-paper/70",
          )}
        >
          {status}
        </p>

        <WeekStrip strip={view.strip} className="mt-5" />

        <div className="mt-4 grid grid-cols-2 items-start gap-2">
          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3">
            <p className="font-sans text-caption uppercase tracking-[1.2px] text-paper/50">{t("streak.bestLabel")}</p>
            <p className="mt-1 font-sans text-ui font-bold text-paper">{tn("streak.days", view.best)}</p>
          </div>
          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3">
            <p className="font-sans text-caption uppercase tracking-[1.2px] text-paper/50">{t("streak.nextLabel")}</p>
            {next ? (
              <>
                <p className="mt-1 font-sans text-ui font-bold text-paper">{tn("streak.days", next.at)}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/10" aria-hidden>
                  <div
                    className="h-full rounded-full bg-streak"
                    style={{ width: `${Math.max(4, Math.round(((next.at - next.left) / next.at) * 100))}%` }}
                  />
                </div>
                <p className="mt-1.5 font-sans text-caption text-paper/55">{tn("streak.toGo", next.left)}</p>
              </>
            ) : (
              <p className="mt-1 font-sans text-detail font-semibold text-paper">{t("streak.allBadges")}</p>
            )}
          </div>
        </div>

        {view.keptToday ? null : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href={links.pray}
              onClick={onClose}
              className="inline-flex min-h-12 items-center justify-center rounded-pill bg-crimson px-4 font-sans text-ui font-semibold text-white"
            >
              {t("streak.pray")}
            </Link>
            <Link
              href={links.read}
              onClick={onClose}
              className="inline-flex min-h-12 items-center justify-center rounded-pill border border-paper/20 px-4 font-sans text-ui font-semibold text-paper hover:border-paper/40"
            >
              {t("streak.read")}
            </Link>
          </div>
        )}

        {view.signedIn ? null : (
          <p className="mt-4 text-center font-sans text-detail text-paper/60">
            <Link href="/signin?next=/" onClick={onClose} className="underline decoration-paper/30 underline-offset-2 hover:text-paper">
              {t("streak.signIn")}
            </Link>
          </p>
        )}
      </div>
    </Sheet>
  );
}
