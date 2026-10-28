"use client";

import { useId } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ANSWER_PICTURES } from "@/lib/onboarding/pictures";
import { INTENTS, type Intent } from "@/lib/onboarding/space";

import { PrimaryButton } from "./PrimaryButton";

/**
 * "What are you looking for?" (1.8): the owner's pick B of round 14, picture
 * cards numbered in tap order, "one screen of many: the onboarding can have
 * as many steps as it needs" (Homebase/boards/purify-master/variants/
 * 14-onboarding.png and .html, his word of 2026-10-27).
 *
 *   - The question and its line, then the answers two across, each a picture
 *     with its name along the foot.
 *   - Pick as many as fit. Each pick shows its number in the order it was
 *     tapped; a second tap takes it out and the numbers after it close up
 *     (lib/onboarding/space.ts, togglePick).
 *   - A picked card is lit: a ring of the page's ink and a soft white glow,
 *     its number on a disc that glows the same (the owner, 2026-10-28: the
 *     accent is a glowing white, never yellow). One not picked rests a shade
 *     dimmer. The motion and the light are app/globals.css, "What are you
 *     looking for?".
 *   - "Continue with 3" holds the foot of the screen, and on a short phone
 *     the cards pass under it. With nothing picked it reads Continue and
 *     waits, as the one answer it replaces waited for a tap.
 *
 * The answers are the app's own four (lib/onboarding/space.ts, INTENTS), not
 * the mockup's eight: they are what is saved, counted, and read by the
 * admin's Onboarding view. The mockup's cards are short strips, eight to a
 * screen; four fill the same screen as 4:5 cards, the shape of the pictures
 * the owner is making for them (lib/onboarding/pictures.ts). The line each
 * answer had under its name (onboard.intent.*Sub) is not drawn, as the design
 * draws none; a screen reader says it after the name.
 */
export function LookingFor({
  picks,
  onToggle,
  onContinue,
}: {
  /** The answers picked, in the order they were tapped. */
  picks: readonly Intent[];
  onToggle: (intent: Intent) => void;
  onContinue: () => void;
}) {
  const { t } = useTranslate();
  const id = useId();
  const count = picks.length;

  return (
    <div className="flex flex-1 flex-col md:flex-none">
      <h2
        id={`${id}q`}
        className="onboard-step-in text-balance text-[26px] font-bold leading-[1.15] text-paper"
        style={{ animationDelay: "70ms" }}
      >
        {t("onboard.intent.lookingFor")}
      </h2>
      <p
        className="onboard-step-in mt-2 font-sans text-ui leading-[1.45] text-paper/60"
        style={{ animationDelay: "130ms" }}
      >
        {t("onboard.intent.lookingForSub")}
      </p>

      <ul aria-labelledby={`${id}q`} className="mt-6 grid grid-cols-2 gap-2.5">
        {INTENTS.map((intent, i) => {
          // Its place in the order tapped, from 1; 0 when it is not picked.
          const n = picks.indexOf(intent) + 1;
          const picture = ANSWER_PICTURES[intent];
          return (
            <li key={intent}>
              <button
                type="button"
                aria-pressed={n > 0}
                aria-describedby={`${id}${intent}`}
                onClick={() => onToggle(intent)}
                className="ob-pick ob-rise relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-night-soft text-start"
                style={{ animationDelay: `${300 + i * 60}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a static
                    export serves files as they are; next/image would add nothing. */}
                <img
                  src={picture.src}
                  alt=""
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: picture.focus }}
                />
                {/* The page's own ground, so on Parchment it is a wash of paper with the ink on it. */}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-night/90" />
                <span className="absolute inset-x-3 bottom-2.5 font-sans text-ui font-semibold leading-[1.2] text-paper">
                  {t(`onboard.intent.${intent}`)}
                </span>
                {n > 0 ? (
                  // Keyed by the number, so it drops in again when the order closes up.
                  <span
                    key={n}
                    className="ob-pick-n ob-pop absolute end-2 top-2 grid size-[26px] place-items-center rounded-full bg-paper font-sans text-detail font-bold text-night"
                  >
                    {n}
                  </span>
                ) : null}
              </button>
              <span id={`${id}${intent}`} hidden>
                {t(`onboard.intent.${intent}Sub`)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* The way on, held at the foot of a phone over a fade of the page's
          ground. A computer's window has the room: there it follows the cards. */}
      <div className="pointer-events-none sticky bottom-0 z-10 -mx-6 mt-auto bg-gradient-to-b from-transparent to-night to-45% px-6 pb-4 pt-10 md:static md:mx-0 md:mt-8 md:bg-none md:p-0">
        <div className="pointer-events-auto">
          <PrimaryButton onClick={onContinue} disabled={count === 0}>
            {count ? t("onboard.intent.continueWith", { count }) : t("onboard.continue")}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
