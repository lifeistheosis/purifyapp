"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { INDEX_LIST_LOOK } from "@/components/mobile/IndexRows";
import { Check } from "@/components/ui/icons/Check";
import { Sheet } from "@/components/ui/Sheet";
import { readLastRead } from "@/lib/bible/lastRead";
import { cn } from "@/lib/cn";
import { ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { TIER_NAME, tierLadder, tierLevel, type LadderStep } from "@/lib/streak/tiers";
import { useStreak, type StreakView } from "@/lib/streak/useStreak";
import { FlameStage, StreakFlame } from "./StreakFlame";
import { WeekStrip } from "./WeekStrip";

/**
 * Where "Pray" and "Read" go: the rule of the hour, and the chapter left open.
 *
 * The rule of the hour is the one Today's Pray now card names. This split at
 * noon on its own, so an afternoon reader was offered the Morning Rule on
 * Today and sent to the Evening Rule from here.
 */
export function keepDayLinks(): { pray: string; read: string } {
  const last = typeof window === "undefined" ? null : readLastRead();
  return {
    pray: ruleIdForHour(new Date().getHours()) === "evening" ? "/prayers/evening" : "/prayers/morning",
    read: last ? `/bible/${last.book}/${last.chapter}` : "/bible",
  };
}

/** The big flame, in the streak's own design, and the count. */
export function StreakHero({ view, size = 84 }: { view: StreakView; size?: number }) {
  const { tn } = useTranslate();
  const state = view.current === 0 ? "out" : view.keptToday ? "lit" : "pending";
  return (
    <div className="flex flex-col items-center text-center">
      {/* The glow sits inside the stage's own box, so a sheet's scrolling
          body has nothing to cut (FlameStage). */}
      <FlameStage size={size} glow={state === "lit"}>
        <span className={cn("relative", view.atRisk && "streak-pulse", state === "out" && "text-paper")}>
          <StreakFlame size={size} state={state} tier={tierLevel(view.current)} flicker={state === "lit"} />
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

/**
 * One flame on the way: lit once the streak has reached it, the next one
 * with the days left and how far along the streak is, the ones after it
 * dim, so the reader sees every design before it is theirs.
 */
function Step({ step, first }: { step: LadderStep; first: boolean }) {
  const { t, tn } = useTranslate();
  const lit = step.state === "lit";
  const next = step.state === "next";
  const at = step.tier.at;
  const done = next && step.left !== null ? at - step.left : 0;
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", !first && "border-t border-paper/[0.06]")}>
      <span
        aria-hidden
        className={cn("inline-flex w-7 shrink-0 justify-center", next && "opacity-60", step.state === "later" && "opacity-25")}
      >
        <StreakFlame size={30} tier={step.level} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-sans text-ui font-semibold leading-tight",
            step.current ? "text-streak" : lit || next ? "text-paper" : "text-paper/45",
          )}
        >
          {t(TIER_NAME[step.tier.id])}
        </p>
        <p className={cn("mt-0.5 font-sans text-caption tabular-nums", lit || next ? "text-paper/55" : "text-paper/35")}>
          {tn("streak.days", at)}
          {step.current ? ` · ${t("streak.tierNow")}` : null}
        </p>
        {next ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/10" aria-hidden>
            <div className="h-full rounded-full bg-streak" style={{ width: `${Math.max(4, Math.round((done / at) * 100))}%` }} />
          </div>
        ) : null}
      </div>
      {lit ? (
        <span className="inline-flex shrink-0 text-streak">
          <Check size={18} strokeWidth={2.2} />
          <span className="sr-only">{t("streak.tierLit")}</span>
        </span>
      ) : next && step.left !== null ? (
        <p className="shrink-0 self-start pt-px font-sans text-caption font-semibold text-streak tabular-nums">
          {tn("streak.toGo", step.left)}
        </p>
      ) : null}
    </li>
  );
}

/** Every flame a streak grows through (lib/streak/tiers.ts), and the best run beside them. */
function FlameLadder({ current, best }: { current: number; best: number }) {
  const { t, tn } = useTranslate();
  const steps = tierLadder(current);
  return (
    <section aria-labelledby="streak-flames" className="mt-7">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
        <h3 id="streak-flames" className="text-body leading-tight text-paper">
          {t("streak.tiersTitle")}
        </h3>
        {best > 0 ? (
          <p className="font-sans text-caption text-paper/50">
            {t("streak.bestLabel")}{" "}
            <span className="font-semibold text-paper/80 tabular-nums">{tn("streak.days", best)}</span>
          </p>
        ) : null}
      </div>
      <ol className={INDEX_LIST_LOOK}>
        {steps.map((step, i) => (
          <Step key={step.tier.id} step={step} first={i === 0} />
        ))}
      </ol>
      {steps.every((s) => s.state === "lit") ? (
        <p className="mt-2.5 px-1 font-sans text-detail text-paper/60">{t("streak.allBadges")}</p>
      ) : null}
    </section>
  );
}

export function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslate();
  const view = useStreak();
  const status = view.keptToday ? t("streak.keptToday") : view.current > 0 ? t("streak.notYet") : t("streak.start");
  const links = open && !view.keptToday ? keepDayLinks() : null;

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

        {links ? (
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
        ) : null}

        <FlameLadder current={view.current} best={view.best} />

        {view.signedIn ? null : (
          <p className="mt-5 text-center font-sans text-detail text-paper/60">
            <Link href="/signin?next=/" onClick={onClose} className="underline decoration-paper/30 underline-offset-2 hover:text-paper">
              {t("streak.signIn")}
            </Link>
          </p>
        )}
      </div>
    </Sheet>
  );
}
