"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArtPlate } from "@/components/prayers/ArtPlate";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { serviceArt } from "@/lib/prayers/serviceArt";

import { PrimaryButton } from "./PrimaryButton";

/**
 * The moment reminders turn on (1.8): the owner's pick C of round 3, sheet
 * r3-08, "the reminders themselves as Purify's cards", for his note 33 on
 * build 80, "make the notifications turned on screen better with
 * animations". Until then it was one plain line in the gold token and a
 * faint Continue, and nothing moved.
 *
 * The instant Allow lands, the question's body and its busy button fade where
 * they stood while the heading glides to its new place (OnboardingFlow plays
 * that as a FLIP, lib/ui/flip.ts). The line comes in where the body was, then
 * the two reminders settle in one after the other as Purify's own cards on
 * the day's line, drawn as the prayers page draws its day (DayTimeline): the
 * rule's icon, the reminder's own words, the time it was set for. The line
 * runs down from the first mark to the second, each mark lit as its card
 * lands, and Continue rises as the full button. No app badge, no "now", no
 * lock-screen glass, so nobody takes a card for a real notification.
 *
 * The times are the ones just switched on, written as the reader's language
 * tells the time. The words are the pushes' own (lib/push/copy.ts), which are
 * English only: the catalogs carry them in every language, so outside English
 * a card says in the reader's words what the lock screen will say in English.
 * lib/onboarding/__tests__/remindersOn.test.ts holds the English to the
 * pushes, so the two cannot drift apart.
 *
 * The motion is CSS (app/globals.css, "The moment reminders turn on") on the
 * sheet's own clock, below. With Purify's motion off the finished screen
 * stands at once: no glide, nothing fading, every card in place.
 */

export type ReminderTimes = { morning: string; evening: string };

/** The sheet's clock, in milliseconds after Allow lands. */
export const GLIDE_MS = 560;
const LINE_AT = 180;
const CARD_AT = { morning: 380, evening: 880 } as const;
const MARK_AFTER = 160;
const DRAW_AT = 900;
const CONTINUE_AT = 1750;
/** What the question showed fades in 220 ms (.ob-on-leave), then it goes. */
const LEAVE_MS = 260;

/** "07:00" as the reader's language writes a time of day: 7:00 AM, 07:00. */
export function clockTime(hhmm: string, locale: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(dateLocale(locale), { hour: "numeric", minute: "2-digit" });
}

/** Fetch the two cards' icons while the question is still up, so each card
 *  settles in with its picture. */
export function preloadReminderArt(): void {
  for (const id of ["morning", "evening"]) new Image().src = serviceArt(id).src;
}

export function RemindersOn({
  times,
  fresh,
  onContinue,
}: {
  /** The times just switched on, as "HH:MM". */
  times: ReminderTimes;
  /** True the moment Allow lands on this screen; false when the reader comes
   *  back to it later, when it arrives as any step does. */
  fresh: boolean;
  onContinue: () => void;
}) {
  const { t, locale } = useTranslate();
  // What the question showed as Allow landed (its body, the busy button and
  // Not now), fading where it stood while the moment begins, then gone.
  const [leaving, setLeaving] = useState(fresh);
  useEffect(() => {
    if (!fresh) return;
    const id = window.setTimeout(() => setLeaving(false), LEAVE_MS);
    return () => window.clearTimeout(id);
  }, [fresh]);

  const reminders = [
    {
      id: "morning",
      at: CARD_AT.morning,
      time: times.morning,
      title: t("onboard.reminders.morningTitle"),
      body: t("onboard.reminders.morningBody"),
    },
    {
      id: "evening",
      at: CARD_AT.evening,
      time: times.evening,
      title: t("onboard.reminders.eveningTitle"),
      body: t("onboard.reminders.eveningBody"),
    },
  ];
  // The heading stays where the question had it, so only a reader coming back
  // to the screen sees it arrive, as every step's heading does.
  const enter = fresh ? "" : "onboard-step-in ";

  return (
    <div data-flip-key="reminders" className="flex flex-col">
      <p
        className={`${enter}mb-3 font-sans text-caption text-premium-ink/85`}
        style={fresh ? undefined : { animationDelay: "70ms" }}
      >
        {t("onboard.reminders.eyebrow")}
      </p>
      <h2
        className={`${enter}text-title font-bold leading-tight text-paper`}
        style={fresh ? undefined : { animationDelay: "130ms" }}
      >
        {t("onboard.reminders.title")}
      </h2>
      <div className="relative">
        {leaving ? (
          <div aria-hidden className="ob-on-leave pointer-events-none absolute inset-x-0 top-0 flex flex-col">
            <p className="mt-3 font-sans text-ui leading-[1.6] text-paper/70">{t("onboard.reminders.body")}</p>
            <div className="mt-7 flex flex-col">
              <PrimaryButton onClick={() => {}} disabled>
                …
              </PrimaryButton>
              <span className="mt-2 inline-flex min-h-11 items-center self-center px-4 font-sans text-caption text-paper/55">
                {t("onboard.reminders.notNow")}
              </span>
            </div>
          </div>
        ) : null}
        <p
          role="status"
          className="ob-on-fade mt-3 font-sans text-ui leading-[1.6] text-paper/90"
          style={{ animationDelay: `${LINE_AT}ms` }}
        >
          {t("onboard.reminders.done")}
        </p>
        <ol className="mt-6">
          {reminders.map((r, i) => (
            <li key={r.id} className={cn("relative ps-[26px]", i > 0 && "mt-4")}>
              {/* The day's line, from this mark down to the next. */}
              {i < reminders.length - 1 ? (
                <span
                  aria-hidden
                  className="ob-on-line absolute start-[7px] top-[11px] -bottom-[27px] w-px bg-paper/15"
                  style={{ animationDelay: `${DRAW_AT}ms` }}
                />
              ) : null}
              <span
                aria-hidden
                className="ob-on-mark absolute start-[3px] top-[6.5px] size-[9px] rounded-full bg-paper"
                style={{ animationDelay: `${r.at + MARK_AFTER}ms` }}
              />
              <time
                dateTime={r.time}
                className="ob-on-fade mb-2 flex h-[22px] items-center font-sans text-detail font-semibold tabular-nums text-paper"
                style={{ animationDelay: `${r.at}ms` }}
              >
                {clockTime(r.time, locale)}
              </time>
              <div
                className="ob-on-card lm-card flex items-center gap-3.5 rounded-[18px] bg-gradient-to-b from-paper/[0.06] to-paper/[0.03] py-3 ps-3 pe-3.5 shadow-[0_14px_28px_-16px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-paper/[0.085] inset-shadow-[0_1px_0_rgba(255,255,255,0.07)]"
                style={{ animationDelay: `${r.at}ms` }}
              >
                <ArtPlate id={r.id} size="sm" />
                <span className="min-w-0">
                  <span className="block font-serif text-body font-semibold leading-tight text-paper">{r.title}</span>
                  <span className="mt-1 block text-pretty font-sans text-detail leading-[1.45] text-paper/60">{r.body}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="ob-rise mt-6" style={{ animationDelay: `${CONTINUE_AT}ms` }}>
          <PrimaryButton onClick={onContinue}>{t("onboard.continue")}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
