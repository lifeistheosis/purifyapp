"use client";

// Your first Liturgy (1.7): the guide, one card at a time.
//
// The owner's note 27 of 2026-10-16 and his additions to it (Homebase/boards/
// purify-master/r17/BRAINSTORM.md), and his pattern 4 across the notes: a
// guided flow has a start, a sense of where you are, a finish, and what comes
// next. So the reader is asked whether they are going and to which kind of
// church, then walks four short parts and the customs of that kind of parish,
// and ends on a page that keeps their checklist and their day. The words are
// all in lib/start/firstLiturgy.ts; the reader's plan is on the device
// (lib/start/liturgyPlan.ts), so the guide opens where they left it.
//
// Phone first, one column at every width. The bar under the page's top bar
// says where the reader is: its line fills as the card is read, moved by the
// scroll and nothing else, so it carries meaning and asks for no switch.
// Detail opens in the shared movable sheet (components/ui/Sheet.tsx).

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { PARTS, WORDS, type Why } from "@/lib/start/firstLiturgy";
import {
  STEP_IDS,
  goToStep,
  pathFor,
  readPlan,
  stepAfter,
  stepBefore,
  updatePlan,
  useLiturgyPlan,
  type StepId,
} from "@/lib/start/liturgyPlan";
import { useMounted } from "@/lib/useMounted";

import { PartsSheet, SourcesSheet, WhySheet } from "./GuideSheets";
import { StepCustoms, StepIntro, StepKind, StepPart, StepReady, StepWhen } from "./GuideSteps";
import { stepName, type OpenWhy } from "./names";

function stepFromHash(hash: string): StepId | null {
  const id = hash.replace(/^#/, "");
  return (STEP_IDS as readonly string[]).includes(id) ? (id as StepId) : null;
}

export function FirstLiturgyGuide() {
  const { t } = useTranslate();
  const mounted = useMounted();
  const plan = useLiturgyPlan();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const [why, setWhy] = useState<OpenWhy | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // The card to open on, once, when the page arrives: the one the address
  // names (a door from Today or a checklist line), else the overview for a
  // reader who has finished, else where they left off.
  useEffect(() => {
    const named = stepFromHash(window.location.hash);
    const current = readPlan();
    if (named) goToStep(named);
    else if (current.done && current.step !== "ready") goToStep("ready");
  }, []);

  const step: StepId = mounted ? plan.step : "intro";

  // A new card starts at its top, with its heading in focus for a screen
  // reader, and its name in the address so a reload opens it again.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const go = useCallback((next: StepId) => {
    moved.current = true;
    goToStep(next);
    const hash = next === "intro" ? "" : `#${next}`;
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + hash);
  }, []);

  const openWhy = useCallback((title: string, w: Why) => {
    setWhy({ title, why: w });
    setWhyOpen(true);
  }, []);

  const path: StepId[] = pathFor(plan).filter((s) => s !== "intro");
  const at = path.indexOf(step);
  const next = stepAfter(plan, step);
  const back = stepBefore(plan, step);

  return (
    <section className="bg-night px-5 pb-16 md:px-8" aria-labelledby="liturgy-step-title">
      <div className="mx-auto w-full max-w-[640px]">
        {/* The page's own name for a computer's screen reader, where the
            phone's top bar (and its h1) is hidden; the card's heading leads
            for the eye. The apps keep the bar at every width. */}
        <h1 className="sr-only hidden md:block native-md-hidden">{t(WORDS.title.key)}</h1>

        {step !== "intro" && at >= 0 ? (
          <GuideProgress
            key={step}
            index={at}
            total={path.length}
            label={stepName(step, t)}
            onParts={() => setPartsOpen(true)}
          />
        ) : null}

        <div className={cn(step === "intro" ? "pt-8 md:pt-14" : "pt-6")}>
          {step === "intro" ? (
            <StepIntro
              headingRef={headingRef}
              onAnswer={(going) => {
                updatePlan((p) => ({ ...p, going }));
                go("kind");
              }}
            />
          ) : step === "kind" ? (
            <StepKind headingRef={headingRef} plan={plan} />
          ) : step === "when" ? (
            <StepWhen headingRef={headingRef} plan={plan} />
          ) : step === "customs" ? (
            <StepCustoms headingRef={headingRef} plan={plan} onWhy={openWhy} onChange={() => go("kind")} />
          ) : step === "ready" ? (
            <StepReady
              headingRef={headingRef}
              plan={plan}
              onGo={go}
              onSources={() => setSourcesOpen(true)}
            />
          ) : (
            <StepPart headingRef={headingRef} part={PARTS[step]} onWhy={openWhy} />
          )}
        </div>

        {step !== "intro" && step !== "ready" ? (
          <GuideFooter
            back={back}
            next={next}
            nextLabel={next ? t(WORDS.ui.nextTo.key, { part: stepName(next, t) }) : ""}
            disabled={step === "kind" && !plan.kind}
            onGo={go}
          />
        ) : null}
      </div>

      <WhySheet open={whyOpen} shown={why} onClose={() => setWhyOpen(false)} />
      <PartsSheet
        open={partsOpen}
        onClose={() => setPartsOpen(false)}
        plan={plan}
        current={step}
        onGo={(s) => {
          setPartsOpen(false);
          go(s);
        }}
        onSources={() => {
          setPartsOpen(false);
          setSourcesOpen(true);
        }}
      />
      <SourcesSheet open={sourcesOpen} onClose={() => setSourcesOpen(false)} />
    </section>
  );
}

/**
 * Where the reader is: "3 of 8", and a line that fills as the card is read.
 * The line is the scroll's: its transform is written once a frame from the
 * page's scroll position, never through React, never eased (lib/ui/
 * useScrollFill.ts has the reasons). A card short enough to show whole counts
 * as read. The card's name joins the count only once the card's own heading
 * has gone up under this row, so it is never a label over that heading (one
 * observer and an attribute, as MobileTopBar's slim title does).
 */
function GuideProgress({
  index,
  total,
  label,
  onParts,
}: {
  index: number;
  total: number;
  label: string;
  onParts: () => void;
}) {
  const { t } = useTranslate();
  const fill = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = row.current;
    const heading = document.getElementById("liturgy-step-title");
    if (!strip || !heading || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? 0;
        const gone = !entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1;
        if (gone) strip.setAttribute("data-named", "");
        else strip.removeAttribute("data-named");
      },
      { rootMargin: `-${Math.round(strip.getBoundingClientRect().bottom)}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(heading);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let max = 0;
    let frame = 0;
    let ticking = false;
    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
    };
    const draw = () => {
      ticking = false;
      const read = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      if (fill.current) fill.current.style.transform = `scaleX(${(index + read) / total})`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = requestAnimationFrame(draw);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    draw();
    const grows = typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
    grows?.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      grows?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [index, total]);

  return (
    <div
      ref={row}
      data-guide-progress
      className="group sticky top-12 below-topbar z-20 -mx-5 bg-night px-5 pb-2 pt-3 md:top-[72px] md:-mx-8 md:px-8"
    >
      <div aria-hidden className="h-[3px] w-full overflow-hidden rounded-full bg-paper/10">
        <div
          ref={fill}
          className="h-full w-full origin-left rounded-full bg-paper/80 rtl:origin-right"
          style={{ transform: `scaleX(${index / total})` }}
        />
      </div>
      <div className="mt-1.5 flex min-h-11 items-center justify-between gap-3">
        <p className="min-w-0 truncate font-sans text-caption text-paper/60">
          <span className="font-semibold text-paper/80">
            {t(WORDS.ui.progress.key, { n: index + 1, total })}
          </span>
          <span className="opacity-0 group-data-[named]:opacity-100 motion-safe:transition-opacity motion-safe:duration-200">
            {" · "}
            {label}
          </span>
        </p>
        <button
          type="button"
          onClick={onParts}
          aria-haspopup="dialog"
          className="tap-press -me-2 inline-flex min-h-11 shrink-0 items-center rounded-pill px-3 font-sans text-caption font-semibold text-paper/75 hover:text-paper"
        >
          {t(WORDS.ui.parts.key)}
        </button>
      </div>
    </div>
  );
}

/** Back and Next at the foot of a card, Next naming the card it opens. */
function GuideFooter({
  back,
  next,
  nextLabel,
  disabled,
  onGo,
}: {
  back: StepId | null;
  next: StepId | null;
  nextLabel: string;
  disabled: boolean;
  onGo: (step: StepId) => void;
}) {
  const { t } = useTranslate();
  return (
    <div className="mt-10 flex items-center justify-between gap-3 border-t border-paper/[0.08] pt-5">
      {back ? (
        <button
          type="button"
          onClick={() => onGo(back)}
          className="tap-press -ms-2 inline-flex min-h-11 items-center gap-1 rounded-pill px-3 font-sans text-ui font-semibold text-paper/70 hover:text-paper"
        >
          <ChevronLeft size={16} className="rtl:-scale-x-100" />
          {t("common.back")}
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          type="button"
          onClick={() => onGo(next)}
          disabled={disabled}
          className="tap-press inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night disabled:opacity-40"
        >
          <span className="truncate">{nextLabel}</span>
          <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
        </button>
      ) : null}
    </div>
  );
}
