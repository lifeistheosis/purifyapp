import type { CSSProperties } from "react";
import { notFound } from "next/navigation";

import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { StepView } from "@/components/theology/StepView";
import { WholeIcon } from "@/components/theology/WholeIcon";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { stepNumeral } from "@/lib/theology/path";
import { pathSteps } from "@/lib/theology/pathSteps";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";

export const dynamicParams = false;

export function generateStaticParams() {
  return THEOLOGY_SUBJECTS.map((s) => ({ subject: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const s = THEOLOGY_SUBJECTS.find((x) => x.id === subject);
  return s ? { title: s.title, description: s.line } : { title: "Theology" };
}

/**
 * A step of Theology's path (1.8, round 3 r3-13): the owner's hybrid of B
 * and C, "Subjects room looks good. A step looks good." B's room: the
 * subject's icon whole in its own light, behind the page as it scrolls on a
 * phone, the bar clear over it until the name has gone up under it (as a
 * saint's page does), the name and its line over the icon's foot. C's step,
 * on the page that rises over it: the question and its short answer first,
 * then the studies, the errors and the councils, the next read lit, Up next
 * at the end (components/theology/StepView.tsx).
 */
export default async function TheologyStepPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  const steps = await pathSteps(IS_STATIC_EXPORT);
  const at = steps.findIndex((s) => s.id === subject);
  if (at < 0) notFound();
  const step = steps[at];
  const next = steps[at + 1];

  return (
    <>
      <MobileTopBar title={step.title} back backFallback="/theology" revealTitleOn="step-title" overlay searchPlace="theology" />
      <article className="relative bg-night px-5 pb-12 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[640px]">
          {/* B's room: the icon whole, in its light, behind the page. */}
          <div aria-hidden data-step-room="" className="step-room saint-icon-in">
            <WholeIcon src={step.picture.src} eager className="h-full w-full" />
          </div>
          <div aria-hidden className="step-room-gap" />

          <header className="relative z-[1] pb-6 md:mt-6">
            <p
              className="doctrine-shadow saint-head-in font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-paper/70"
              style={{ "--i": 1 } as CSSProperties}
            >
              {stepNumeral(step.n)} · <T k="study.theology.byFaith" />
            </p>
            <h1
              id="step-title"
              className="doctrine-shadow saint-head-in mt-[7px] font-serif text-[30px] font-bold leading-[1.1] text-balance text-paper md:text-display-sm"
              style={{ "--i": 1 } as CSSProperties}
            >
              {step.title}
            </h1>
            <p
              className="doctrine-shadow saint-head-in mt-[7px] max-w-[52ch] font-sans text-[14.5px] leading-[1.45] text-paper/78"
              style={{ "--i": 2 } as CSSProperties}
            >
              {step.line}
            </p>
          </header>

          {/* C's step, on the page that rises over the room. */}
          <div className="step-body relative z-[1] -mx-5 px-5 pt-1 md:mx-0 md:px-0">
            <StepView step={step} next={next ? { id: next.id, n: next.n, title: next.title, picture: next.picture } : null} />
          </div>
        </div>
      </article>
    </>
  );
}
