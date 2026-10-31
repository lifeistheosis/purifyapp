// The tour's look: the owner's pick B of sheet r3-14, "The story of 1.8" (his
// words, 2026-10-31: "the story of 1.8 B."). Variants:
// Homebase/boards/purify-master/variants/r3-14-update-tour.html, direction B.
//
//   - The title page. On the first open after the update the apps' intro does
//     not lift away: the cross stays on the night with the horizon under it
//     (components/native/Horizon.tsx and LaunchFrame's cross), and the
//     release writes itself in beneath them: Purify, the release's number,
//     its line, three of what is new, See what's new and Skip. On the website,
//     with no intro before it, the night and the horizon arrive as their own
//     entrance.
//   - A page of the story for each new thing. The screen goes quiet, grey and
//     low; only the new thing keeps its colour, with a bloom of white behind
//     it. At the foot, a line of the story in Lora, the pages as a strip,
//     Skip, Back and Next.
//   - The close: the night again, where the story stays (What's new, under
//     the bell), and the signature.
//
// THE LOOK ONLY. Every piece is drawn from what it is handed: the words
// already in the reader's language, where the words stand, what each button
// does. Where the lit thing is, the engine writes on the tour's root as
// --tour-x, --tour-y, --tour-w, --tour-h (its box) and --tour-open (the light
// up or gone out), each frame of a move, so nothing here renders while the
// light glides (components/whats-new/tour/TourLayer.tsx). Its rules are the
// "tour-" block of app/globals.css ("What's New: the tour"), on the page's
// tokens: the bloom is white, ink on Parchment; never gold.
//
// No portal and no effect here, so react-dom/server draws every piece as it
// is (lib/whatsNew/__tests__/tourLook.test.ts).

import type { CSSProperties, ReactNode, Ref } from "react";

import { HORIZON_STARS, HorizonDrawing } from "@/components/native/Horizon";
import { Bell } from "@/components/ui/icons/Bell";

/** The buttons' words, in the reader's language. */
export type TourWords = { see: string; skip: string; next: string; back: string; done: string };

/** How the night comes: over the apps' intro, which it continues, or as its own entrance. */
export type NightEntrance = "intro" | "own";

/** The night of the title page and the close: the stars, the horizon and the cross, as the intro draws them. */
function Night({
  entrance,
  crossSrc,
  leaving,
  kind,
  children,
}: {
  entrance: NightEntrance;
  crossSrc: string;
  leaving: boolean;
  kind: "title" | "close";
  children: ReactNode;
}) {
  return (
    <div
      className="tour-night dark-island"
      data-night={kind}
      data-entrance={entrance}
      data-leaving={leaving ? "" : undefined}
    >
      <div aria-hidden className="tour-night-sky">
        <div className="tour-stars">
          {HORIZON_STARS.map((s) => (
            <i
              key={`${s.left}${s.top}`}
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, ["--star-at" as string]: `${s.delay}ms` }}
            />
          ))}
        </div>
        <div className="tour-horizon">
          <div className="tour-horizon-level">
            <HorizonDrawing id={`tour-${kind}`} className="absolute left-1/2 top-0 h-[168vw] w-[168vw] -translate-x-1/2 overflow-visible" />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- the intro's own cross, as it is in the document */}
        <img src={crossSrc} alt="" decoding="sync" className="tour-cross" />
      </div>
      {children}
    </div>
  );
}

/**
 * The title page: the release writes itself in under the cross. Purify, the
 * release's number large, its line, three of what it brings as quiet rows
 * with a short rule between them (never pills), See what's new and Skip.
 */
export function TourTitlePage({
  brand,
  version,
  line,
  highlights,
  words,
  titleId,
  entrance,
  crossSrc,
  leaving = false,
  seeRef,
  onSee,
  onSkip,
}: {
  brand: string;
  version: string;
  line: string;
  highlights: readonly string[];
  words: Pick<TourWords, "see" | "skip">;
  titleId: string;
  entrance: NightEntrance;
  crossSrc: string;
  leaving?: boolean;
  seeRef?: Ref<HTMLButtonElement>;
  onSee: () => void;
  onSkip: () => void;
}) {
  return (
    <Night entrance={entrance} crossSrc={crossSrc} leaving={leaving} kind="title">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="tour-night-words" data-tour-offer="">
        <p className="tour-brand" style={{ "--at": 0 } as CSSProperties}>
          {brand}
        </p>
        <p className="tour-version" style={{ "--at": 1 } as CSSProperties}>
          {version}
        </p>
        <h2 id={titleId} className="tour-release" style={{ "--at": 2 } as CSSProperties}>
          {line}
        </h2>
        {highlights.length > 0 ? (
          <ul className="tour-highlights">
            {highlights.map((h, i) => (
              <li key={h} className="tour-highlight" style={{ "--at": 3 + i * 0.5 } as CSSProperties}>
                {h}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="tour-night-actions" style={{ "--at": 5 } as CSSProperties}>
          <button ref={seeRef} type="button" className="tour-primary" onClick={onSee}>
            {words.see}
          </button>
          <button type="button" className="tour-quiet" onClick={onSkip}>
            {words.skip}
          </button>
        </div>
      </div>
    </Night>
  );
}

/**
 * The quiet over the page: grey and low everywhere but the lit thing, which
 * keeps its colour, with a bloom of white behind it. Where the lit thing is
 * comes from the engine's --tour-* on the root. Decoration: it takes no tap.
 */
export function TourHush({ shown }: { shown: boolean }) {
  return (
    <div aria-hidden className="tour-hush" data-shown={shown ? "" : undefined}>
      <div className="tour-hush-veil" />
      <div className="tour-bloom" />
    </div>
  );
}

/**
 * A page of the story, at the foot of the screen (or at its top, over a
 * thing held low on the screen): the pages as a strip, where this one stands
 * and its title, its line in Lora, then Skip, Back and Next. While the tour
 * moves on, the page stays, quieted, its words those of the page before, so a
 * stop passed over never shows its words.
 */
export function TourStoryFoot({
  title,
  story,
  count,
  progress,
  place,
  canBack,
  moving = false,
  words,
  stepKey,
  titleId,
  storyId,
  nextRef,
  footRef,
  onNext,
  onBack,
  onSkip,
}: {
  title: string;
  story: string;
  /** "2 of 8". */
  count: string;
  /** The same as numbers, for the strip. */
  progress: { at: number; of: number };
  place: "top" | "bottom";
  canBack: boolean;
  moving?: boolean;
  words: Pick<TourWords, "next" | "back" | "skip">;
  /** Changes with the page, so its words arrive anew. */
  stepKey: string;
  titleId: string;
  storyId: string;
  nextRef?: Ref<HTMLButtonElement>;
  /** The whole foot, which the engine keeps the light clear of. */
  footRef?: Ref<HTMLDivElement>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <div ref={footRef} className="tour-foot" data-place={place}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={storyId}
        className="tour-foot-body"
        data-moving={moving ? "" : undefined}
      >
        <div aria-hidden className="tour-strip">
          {Array.from({ length: progress.of }, (_, i) => (
            <i key={i} data-on={i < progress.at ? "" : undefined} />
          ))}
        </div>
        <div key={stepKey} className="tour-page" aria-live="polite">
          <p id={titleId} className="tour-page-k">
            {count} · {title}
          </p>
          <p id={storyId} className="tour-page-s">
            {story}
          </p>
        </div>
        <div className="tour-ctl">
          <button type="button" className="tour-quiet" onClick={onSkip}>
            {words.skip}
          </button>
          <span className="tour-ctl-way">
            <button type="button" className="tour-secondary" onClick={onBack} disabled={!canBack || moving}>
              {words.back}
            </button>
            <button ref={nextRef} type="button" className="tour-primary" onClick={onNext} disabled={moving}>
              {words.next}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * The close: the night again, the release's name, where the story stays (the
 * bell drawn where the line names it), the signature, and Done.
 */
export function TourClose({
  title,
  line,
  signature,
  words,
  titleId,
  crossSrc,
  leaving = false,
  doneRef,
  onDone,
}: {
  title: string;
  /** The line, with "{bell}" where the bell is drawn. */
  line: string;
  signature: string;
  words: Pick<TourWords, "done">;
  titleId: string;
  crossSrc: string;
  leaving?: boolean;
  doneRef?: Ref<HTMLButtonElement>;
  onDone: () => void;
}) {
  const [before, after] = splitBell(line);
  return (
    <Night entrance="own" crossSrc={crossSrc} leaving={leaving} kind="close">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="tour-night-words">
        <h2 id={titleId} className="tour-close-title" style={{ "--at": 0 } as CSSProperties}>
          {title}
        </h2>
        <p className="tour-close-line" style={{ "--at": 1 } as CSSProperties}>
          {before}
          {after !== null ? (
            <>
              <span className="tour-bell">
                <Bell size={17} filled />
              </span>
              {after}
            </>
          ) : null}
        </p>
        <p className="tour-signature" style={{ "--at": 2 } as CSSProperties}>
          {signature}
        </p>
        <div className="tour-night-actions" style={{ "--at": 3 } as CSSProperties}>
          <button ref={doneRef} type="button" className="tour-primary" onClick={onDone}>
            {words.done}
          </button>
        </div>
      </div>
    </Night>
  );
}

/** The close's line around its bell: the words before it and after it, or the whole line and null. */
export function splitBell(line: string): [string, string | null] {
  const at = line.indexOf("{bell}");
  if (at < 0) return [line, null];
  return [line.slice(0, at), line.slice(at + "{bell}".length)];
}
