"use client";

import { useId } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { HORIZON_STARS, HorizonDrawing } from "@/components/native/Horizon";
import { Cross } from "@/components/ui/icons/Cross";
import { BACKGROUND_PILLS, type Background } from "@/lib/onboarding/space";

import { PrimaryButton } from "./PrimaryButton";

/**
 * "Where are you coming from?" (1.8): the owner's pick "E + I · Pills that
 * answer" of 2026-10-28 (Homebase/boards/purify-master/r18/choose/
 * 1b-where-are-you-coming-from-EI.png, the right-hand phone; markup in
 * variants/15c-wayin-EI.html). "E as it is. The pill you tap says where
 * Purify will start you, in one line under them."
 *
 *   - E's night and horizon, carried on from the intro: the same stars and
 *     the same drawing (components/native/Horizon.tsx), its crest low on the
 *     screen as the design sets it (WhereFromSky).
 *   - The cross, lit; the question and its line; the answers as pills of
 *     light, and "Prefer not to say" under them, quieter.
 *   - Once a pill is tapped, one line under the pills says where Purify will
 *     start this reader, I's lines: "We'll start you with the Church Fathers
 *     and the early councils."
 *   - The design draws the moment after the tap and no way on. A reader has
 *     to read the line before the screen goes, so Continue rises at the foot
 *     once a pill is chosen; "Prefer not to say" is an answer and moves on at
 *     once.
 *
 * Lit is white with a soft white glow (the owner, 2026-10-28: never yellow),
 * and on Parchment, where white cannot glow, the ink with no glow. The motion
 * and the light are app/globals.css, "Where are you coming from?".
 */
export function WhereFrom({
  answer,
  onChoose,
  onContinue,
  onPreferNot,
}: {
  /** The answer given, if any: a pill, or "prefer-not". */
  answer: Background | null;
  onChoose: (background: Background) => void;
  onContinue: () => void;
  onPreferNot: () => void;
}) {
  const { t } = useTranslate();
  const id = useId();
  // The line answers a pill. "Prefer not to say" has none: it moves on.
  const says = answer && answer !== "prefer-not" ? answer : null;
  const [before, after = ""] = t("onboard.background.startWith").split("{what}");

  return (
    <div className="flex flex-1 flex-col items-center text-center md:flex-none">
      <span aria-hidden className="ob-wf-cross onboard-step-in mb-[22px] text-paper" style={{ animationDelay: "40ms" }}>
        <Cross size={30} strokeWidth={1.5} />
      </span>
      <h2
        id={`${id}q`}
        className="onboard-step-in text-balance text-[27px] font-bold leading-[1.15] text-paper"
        style={{ animationDelay: "100ms" }}
      >
        {t("onboard.background.title")}
      </h2>
      <p
        className="onboard-step-in mt-2.5 max-w-[270px] font-sans text-ui leading-[1.55] text-paper/65"
        style={{ animationDelay: "160ms" }}
      >
        {t("onboard.background.body")}
      </p>

      <div role="group" aria-labelledby={`${id}q`} className="mt-[26px] flex flex-wrap justify-center gap-[9px]">
        {BACKGROUND_PILLS.map((b, i) => (
          <button
            key={b}
            type="button"
            aria-pressed={answer === b}
            onClick={() => onChoose(b)}
            className={`ob-pill ob-rise inline-flex min-h-11 items-center rounded-pill border px-[17px] py-[11px] font-sans text-[14.5px] leading-tight ${
              answer === b
                ? "border-paper bg-paper font-semibold text-night"
                : "border-paper/20 bg-night/55 text-paper/90 backdrop-blur-[2px] hover:border-paper/40"
            }`}
            style={{ animationDelay: `${260 + i * 50}ms` }}
          >
            {t(`onboard.background.${b}`)}
          </button>
        ))}
      </div>

      {/* Where Purify starts them, read out as it changes. Keyed by the
          answer, so a new pick draws its line in again. */}
      <div aria-live="polite" className="w-full">
        {says ? (
          <p key={says} className="ob-says mx-auto mt-[18px] max-w-[280px] font-sans text-ui leading-[1.5] text-paper/80">
            <span aria-hidden className="ob-says-ln mx-auto mb-3 block h-[1.5px] w-[26px] bg-paper" />
            {before}
            <b className="font-semibold text-paper">{t(`onboard.background.start.${says}`)}</b>
            {after}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        aria-pressed={answer === "prefer-not"}
        onClick={onPreferNot}
        className={`onboard-step-in inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-caption transition-colors hover:text-paper ${
          says ? "mt-0.5" : "mt-2"
        } ${answer === "prefer-not" ? "text-paper" : "text-paper/50"}`}
        style={{ animationDelay: "560ms" }}
      >
        {t("onboard.background.prefer-not")}
      </button>

      {/* The way on, at the foot over the horizon, once there is a line to have read. */}
      <div className="mt-auto w-full pt-8 md:mt-8">
        {says ? (
          <div className="ob-rise">
            <PrimaryButton onClick={onContinue}>{t("onboard.continue")}</PrimaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The step's night: the intro's stars, and its horizon low on the screen, the
 * crest at 84% of its height and the curve a circle 3.24 screens wide, as the
 * design draws it (a 600 radius at 1290 on its 370 by 824 phone). Behind the
 * step and fixed to the screen, so it holds still if a long language makes
 * the step scroll. Rendered by the flow beside the step, not inside it: the
 * step slides in, and a slide would carry the sky with it.
 */
export function WhereFromSky() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-paper">
      <div className="ob-wf-stars">
        {HORIZON_STARS.map((s) => (
          <i
            key={`${s.left}${s.top}`}
            className="absolute rounded-full bg-paper"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDelay: `${s.delay}ms` }}
          />
        ))}
      </div>
      <div className="ob-wf-horizon absolute inset-x-0 top-[84%]">
        <HorizonDrawing id="ob-horizon" className="absolute left-1/2 top-0 h-[324vw] w-[324vw] -translate-x-1/2 overflow-visible" />
      </div>
    </div>
  );
}
