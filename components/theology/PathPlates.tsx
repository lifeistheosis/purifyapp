"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { stepNumeral, type PathStep, type StepState } from "@/lib/theology/path";

import { WholeIcon } from "./WholeIcon";

/**
 * The nine as plates (1.8, round 3 r3-13): wherever all nine show at once,
 * the owner's "9 plates is also good". Each subject's icon whole in its own
 * light on a framed mat, its numeral and name under it, in the order of the
 * Creed, three to a row: the path, seen whole. The step in hand is ringed in
 * white light, a walked one carries a check, and every plate opens its step.
 */
export function PathPlates({
  steps,
  states,
  className,
}: {
  steps: readonly Pick<PathStep, "id" | "n" | "title" | "picture">[];
  states: readonly StepState[];
  className?: string;
}) {
  const { t } = useTranslate();
  return (
    <ol data-path-plates="" className={`grid grid-cols-3 gap-x-2.5 gap-y-3.5 ${className ?? ""}`}>
      {steps.map((s, i) => {
        const state = states[i] ?? "ahead";
        return (
          <li key={s.id}>
            <Link
              href={`/theology/path/${s.id}`}
              aria-current={state === "current" ? "step" : undefined}
              className="press-card block rounded-[8px]"
            >
              <span data-state={state} className="path-plate">
                <WholeIcon src={s.picture.src} eager={i < 6} className="aspect-[4/5] w-full rounded-[3px]" />
                {state === "walked" ? (
                  <span aria-hidden className="path-plate-check absolute end-[7px] top-[7px] grid size-5 place-items-center rounded-full bg-paper text-night">
                    <Check size={13} strokeWidth={2.4} />
                  </span>
                ) : null}
              </span>
              <span
                className={`mt-[7px] block font-serif text-[13.5px] font-semibold leading-[1.24] ${
                  state === "current" ? "text-paper" : state === "walked" ? "text-paper/60" : "text-paper/92"
                }`}
              >
                <span className="me-[3px] text-[11.5px] tracking-[0.06em] text-paper/45">{stepNumeral(s.n)}</span>
                {s.title}
              </span>
              {state === "walked" ? <span className="sr-only">{t("walk.walked")}</span> : null}
              {state === "current" ? <span className="sr-only">{t("prayers.today.whereYouLeftOff")}</span> : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
