"use client";

// First focus in Settings (1.8, the owner's pick A of round 3, "Lit
// panels"): onboarding's own picture cards in a row (components/onboarding/
// LookingFor.tsx, .ob-pick), and under them the Day 1 the answer gives. His
// note 9 of build 80: "what are you looking for", drawn here as a block of
// eleven buttons, "reads as sporadic".
//
// One answer, as the sheet draws it. "What are you looking for?" keeps as
// many as the reader tapped, in order (purify:intents); the first is the
// intent (purify:intent), the one answer the rest of Purify reads. This row
// shows and sets that first one. A tap writes the intent alone
// (lib/onboarding/state.ts, writeIntent): the other picks stay behind it in
// their order, and readIntents puts the new one first, which is also what
// the account's copy keeps (accountSync.ts).

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Sun } from "@/components/ui/icons/Sun";
import { ANSWER_PICTURES } from "@/lib/onboarding/pictures";
import { INTENTS, dayOneFor, type Intent, type Level } from "@/lib/onboarding/space";
import { ONBOARDING_EVENT, wasOnboardedAgain } from "@/lib/onboarding/state";
import { useArrivingImage } from "@/lib/ui/useArrivingImage";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The reader was back when they answered: their first step is their next step, as Today's card calls it. */
export function useOnboardedAgain(): boolean {
  return useSyncExternalStore(subscribe, wasOnboardedAgain, () => false);
}

export function FirstFocus({
  intent,
  level,
  again,
  label,
  onPick,
}: {
  intent: Intent | null;
  level: Level | null;
  again: boolean;
  label: string;
  onPick: (intent: Intent) => void;
}) {
  const { t } = useTranslate();
  const row = useRef<HTMLDivElement>(null);
  const placed = useRef(false);

  // The chosen card in sight when the screen opens, without moving the page:
  // the row alone scrolls, once, and only if the card is out of it.
  useLayoutEffect(() => {
    const box = row.current;
    if (placed.current || !intent || !box) return;
    placed.current = true;
    const card = box.querySelector<HTMLElement>(`[data-intent="${intent}"]`);
    if (!card) return;
    const b = box.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    if (c.left >= b.left && c.right <= b.right) return;
    // To where the first card rests: the row's own padding in from its edge.
    const style = getComputedStyle(box);
    const rest = parseFloat(style.paddingInlineStart) || 0;
    box.scrollBy({ left: style.direction === "rtl" ? c.right - b.right + rest : c.left - b.left - rest });
  }, [intent]);

  const step = intent ? dayOneFor(level, intent) : null;

  return (
    <>
      <div ref={row} role="group" aria-label={label} className="set-focus">
        {INTENTS.map((i) => (
          <FocusCard key={i} intent={i} on={intent === i} onPick={onPick} />
        ))}
      </div>
      {step ? (
        <div className="set-day">
          <Sun size={18} strokeWidth={1.7} className="set-day-sun" />
          <span className="min-w-0">
            <span className="set-day-eyebrow">{again ? t("onboard.returning.nextEyebrow") : t("onboard.day1.eyebrow")}</span>
            <span className="set-day-title">{t(`onboard.day1.${step.key}.title`)}</span>
          </span>
        </div>
      ) : null}
    </>
  );
}

/** One answer, its picture as onboarding wears it, lit when it is the reader's. */
function FocusCard({ intent, on, onPick }: { intent: Intent; on: boolean; onPick: (intent: Intent) => void }) {
  const { t } = useTranslate();
  const picture = ANSWER_PICTURES[intent];
  const { ref, onArrive } = useArrivingImage(picture.src);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-describedby={`set-focus-${intent}`}
      data-intent={intent}
      onClick={() => onPick(intent)}
      className="ob-pick set-focus-card relative overflow-hidden bg-night-soft text-start"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a static
          export serves files as they are; next/image would add nothing. */}
      <img
        ref={ref}
        src={picture.src}
        alt=""
        decoding="async"
        loading="lazy"
        draggable={false}
        onLoad={onArrive}
        className="img-arrive absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: picture.focus }}
      />
      {/* The page's own ground, so on Parchment it is a wash of paper with the ink on it. */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-night/90" />
      <span className="absolute inset-x-2.5 bottom-2 font-sans text-caption font-semibold leading-[1.2] text-paper">
        {t(`onboard.intent.${intent}`)}
      </span>
      {on ? (
        <span aria-hidden className="set-check set-focus-check">
          <Check size={11} strokeWidth={2.6} />
        </span>
      ) : null}
      <span id={`set-focus-${intent}`} hidden>
        {t(`onboard.intent.${intent}Sub`)}
      </span>
    </button>
  );
}
