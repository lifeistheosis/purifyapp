"use client";

// The handoff: a three-second slate that shows the space being set up from
// the reader's answers, then gives way to it (the owner's specification,
// Adaptive Onboarding Engine, step 4).
//
// A ring fills round the Purify cross while the settings arrive one line at a
// time, each ticked as it lands, and the heading turns from "Setting up" to
// "ready" as the ring closes. The timing is JavaScript, so the handoff always
// takes the same three seconds; the motion is CSS (app/globals.css,
// "Onboarding handoff"), so a reader who asked their system for less motion
// sees the same slate, still, for the same moment.

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PurifyMark } from "@/components/ui/PurifyMark";

export type SlateLine = { label: string; value: string };

const DURATION_MS = 3000;
const READY_AT_MS = 2600;
const LINE_STEP_MS = 520;
const LINE_FIRST_MS = 380;

export function HandoffSlate({
  lines,
  onFinish,
}: {
  lines: SlateLine[];
  onFinish: () => void;
}) {
  const { t } = useTranslate();
  const [ready, setReady] = useState(false);
  // The parent hands a fresh callback on every render. Timing off the latest
  // one through a ref keeps the three seconds counting from the mount, where
  // restarting the timers on each render could hold the slate up.
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setReady(true), READY_AT_MS);
    const doneTimer = window.setTimeout(() => finishRef.current(), DURATION_MS + 450);
    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
      <div className={`ob-slate-mark relative h-36 w-36 ${ready ? "is-ready" : ""}`}>
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r="54" fill="none" className="stroke-paper/10" strokeWidth="3" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            pathLength={100}
            strokeWidth="3"
            strokeLinecap="round"
            className="ob-slate-ring stroke-premium"
            style={{ animationDuration: `${DURATION_MS - 250}ms` }}
          />
        </svg>
        <span className="ob-slate-glow absolute inset-6 rounded-full" aria-hidden />
        <span className="absolute inset-0 flex items-center justify-center text-paper" aria-hidden>
          <span className="ob-slate-cross">
            <PurifyMark size={44} />
          </span>
        </span>
      </div>

      <h2 className="mt-8 text-title font-bold leading-tight text-paper">
        <span key={ready ? "ready" : "setting"} className="ob-slate-title inline-block">
          {ready ? t("onboard.handoff.ready") : t("onboard.handoff.setting")}
        </span>
      </h2>

      <ul className="mt-7 w-full max-w-[320px] space-y-2.5 text-left">
        {lines.map((line, i) => (
          <li
            key={line.label}
            className="ob-slate-line flex items-center gap-3 rounded-2xl bg-paper/[0.04] px-4 py-3 ring-1 ring-inset ring-paper/10"
            style={{ animationDelay: `${LINE_FIRST_MS + i * LINE_STEP_MS}ms` }}
          >
            <span
              aria-hidden
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-premium/15 text-premium-ink"
            >
              <svg viewBox="0 0 16 16" width="12" height="12">
                <path
                  d="M3.5 8.5l3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className="ob-slate-tick"
                  style={{ animationDelay: `${LINE_FIRST_MS + i * LINE_STEP_MS + 220}ms` }}
                />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-caption uppercase tracking-[1.2px] text-paper/45">
                {line.label}
              </span>
              <span className="block truncate font-sans text-ui font-semibold text-paper">{line.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
