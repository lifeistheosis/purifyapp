// The tour's look (1.8, the owner's note 49 of build 80): the pop-up, the lit
// hole and the dimmed page, a step's words, and the end card.
//
// THE LOOK ONLY. Every piece is drawn from what it is handed: the words
// already in the reader's language, the hole's box, where the words stand,
// and what each button does. Nothing here decides when to show, where to go
// or what to keep (that is lib/whatsNew/ and TourLayer.tsx), so the look the
// owner picks from sheet r3-14 replaces this file and the "tour-" rules in
// app/globals.css ("What's New: the tour"), and nothing else. Until then it is
// drawn in the app's own material: Settings' lit panels, the accent a glowing
// white (ink on Parchment, where white cannot glow), on the page's tokens so
// every palette carries it.
//
// No portal and no effect here, so react-dom/server draws every piece as it
// is (lib/whatsNew/__tests__/tourLook.test.ts).

import type { CSSProperties, Ref } from "react";

import { Lampada } from "@/components/ui/icons/Lampada";
import type { Hole } from "@/lib/whatsNew/tourDom";

/** The buttons' words, in the reader's language. */
export type TourWords = { see: string; skip: string; next: string; back: string; done: string };

/**
 * The pop-up: the release's name and its one line, two or three of what it
 * brings, See what's new and Skip. It rises in, its rows after it, and a band
 * of light crosses it once; with Purify's motion off it is simply there.
 */
export function TourOffer({
  name,
  line,
  highlights,
  words,
  titleId,
  leaving = false,
  seeRef,
  onSee,
  onSkip,
}: {
  name: string;
  line: string;
  highlights: readonly string[];
  words: Pick<TourWords, "see" | "skip">;
  titleId: string;
  leaving?: boolean;
  seeRef?: Ref<HTMLButtonElement>;
  onSee: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="tour-offer-layer safe-pb-edge" data-leaving={leaving ? "" : undefined}>
      {/* The dimmed page. A tap on it is Skip, as a tap behind any pop-up card closes it. */}
      <button type="button" tabIndex={-1} aria-label={words.skip} className="tour-scrim" onClick={onSkip} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="tour-card tour-offer" data-tour-offer="">
        <p className="tour-eyebrow">{name}</p>
        <h2 id={titleId} className="tour-title">
          {line}
        </h2>
        {highlights.length > 0 ? (
          <ul className="tour-highlights">
            {highlights.map((h, i) => (
              <li key={h} className="tour-highlight" style={{ "--i": i } as CSSProperties}>
                <span aria-hidden className="tour-light" />
                <span className="min-w-0">{h}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="tour-offer-actions">
          <button ref={seeRef} type="button" className="tour-primary" onClick={onSee}>
            {words.see}
          </button>
          <button type="button" className="tour-quiet" onClick={onSkip}>
            {words.skip}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The page dimmed, and the element a step lights left clear in a white-lit
 * ring. With no hole (the tour moving to the next screen, the end card) the
 * whole page is dimmed. The ring keeps to its element as the page brings it
 * into place; between two elements on one page (`glide`) it moves from one to
 * the other, and with Purify's motion off it is at the next at once.
 * Decoration: it takes no tap (TourLayer lays what does over it).
 */
export function TourSpotlight({ hole, glide = false }: { hole: Hole | null; glide?: boolean }) {
  return (
    <div aria-hidden className="tour-spot">
      <div className="tour-veil" data-on={hole ? undefined : ""} />
      {hole ? (
        <div
          className="tour-hole"
          data-glide={glide ? "" : undefined}
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, borderRadius: hole.radius }}
        />
      ) : null}
    </div>
  );
}

/**
 * A step's words: where it stands in the tour, Skip, its title and one line,
 * Back and Next. Under the lit element, or over it when there is no room
 * below (`place`). While the tour moves to the next step the card stays,
 * quieted, its words those of the step before, so a step passed over never
 * flashes its words.
 */
export function TourCaption({
  title,
  body,
  count,
  place,
  canBack,
  moving = false,
  words,
  stepKey,
  titleId,
  bodyId,
  nextRef,
  cardRef,
  onNext,
  onBack,
  onSkip,
}: {
  title: string;
  body: string;
  /** "2 of 8". */
  count: string;
  /** The same as numbers, for a look that draws the steps rather than saying them. */
  progress?: { at: number; of: number };
  place: "top" | "bottom";
  canBack: boolean;
  moving?: boolean;
  words: Pick<TourWords, "next" | "back" | "skip">;
  /** Changes with the step, so its words arrive anew. */
  stepKey: string;
  titleId: string;
  bodyId: string;
  nextRef?: Ref<HTMLButtonElement>;
  cardRef?: Ref<HTMLDivElement>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="tour-caption-layer safe-pb-edge" data-place={place}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="tour-card tour-caption"
        data-moving={moving ? "" : undefined}
      >
        <div className="tour-caption-head">
          <span className="tour-count">{count}</span>
          <button type="button" className="tour-quiet tour-skip" onClick={onSkip}>
            {words.skip}
          </button>
        </div>
        <div key={stepKey} className="tour-words" aria-live="polite">
          <h2 id={titleId} className="tour-step-title">
            {title}
          </h2>
          <p id={bodyId} className="tour-step-body">
            {body}
          </p>
        </div>
        <div className="tour-caption-foot">
          <button type="button" className="tour-secondary" onClick={onBack} disabled={!canBack || moving}>
            {words.back}
          </button>
          <button ref={nextRef} type="button" className="tour-primary" onClick={onNext} disabled={moving}>
            {words.next}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The end card: that was the tour, and where to take it again. */
export function TourEnd({
  title,
  body,
  words,
  titleId,
  doneRef,
  cardRef,
  onDone,
}: {
  title: string;
  body: string;
  words: Pick<TourWords, "done">;
  titleId: string;
  doneRef?: Ref<HTMLButtonElement>;
  cardRef?: Ref<HTMLDivElement>;
  onDone: () => void;
}) {
  return (
    <div className="tour-caption-layer safe-pb-edge" data-place="bottom">
      <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="tour-card tour-end">
        <span aria-hidden className="tour-mark">
          <Lampada size={22} />
        </span>
        <h2 id={titleId} className="tour-step-title">
          {title}
        </h2>
        <p className="tour-step-body">{body}</p>
        <div className="tour-caption-foot">
          <button ref={doneRef} type="button" className="tour-primary" onClick={onDone}>
            {words.done}
          </button>
        </div>
      </div>
    </div>
  );
}
