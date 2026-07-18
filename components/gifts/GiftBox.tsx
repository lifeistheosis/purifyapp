"use client";

// The claim experience for a gifted Plus/Pro period.
//
// Restraint is the brief: this is an Orthodox prayer app, not a loot crate.
// A sealed box, a seal that breaks, light welling up out of it, then a quiet
// card naming the gift. No countdown, no rarity, no noise.
//
// Palette note: `gold` in this codebase is #eaeaec, a near-white (see the
// @theme block in globals.css — the monochrome scheme kept the token name so
// existing utilities resolve). So the light here is pale, not amber, which is
// what keeps it consistent with every other surface.
//
// Performance rules, all learned the hard way in this repo:
//   * transform + opacity only, so nothing leaves the compositor.
//   * NO backdrop-filter. The Android WebView bleeds imagery through it and
//     drops frames; the shop sub-tab bar carries the same warning.
//   * Portaled to <body>, or this z-index lands inside whatever stacking
//     context the host page made — the bug that buried the chapter grid.
//   * prefers-reduced-motion skips straight to the reveal (globals.css).

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api/client";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

export type PendingGift = {
  id: string;
  tier: "plus" | "pro";
  days: number;
  message: string | null;
};

type Phase = "sealed" | "opening" | "revealed";

/** Lid travel + settle is 900ms; hold the reveal until the light has swelled. */
const OPEN_MS = 1150;

/** Embers drift outward on their own x offsets. Kept to eight: enough to read
 * as sparks, few enough that a low-end phone never feels it. */
const EMBERS = [-58, -40, -22, -8, 10, 26, 44, 60];

function tierName(tier: "plus" | "pro"): string {
  return tier === "pro" ? "Purify Pro" : "Purify Plus";
}

function lengthLabel(days: number): string {
  if (days % 365 === 0) {
    const y = days / 365;
    return y === 1 ? "a year" : `${y} years`;
  }
  if (days % 30 === 0) {
    const m = days / 30;
    return m === 1 ? "a month" : `${m} months`;
  }
  if (days === 7) return "a week";
  return `${days} days`;
}

export function GiftBox({
  gift,
  onDone,
}: {
  gift: PendingGift;
  /** Called when the box is finished with, claimed or dismissed. */
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [error, setError] = useState<string | null>(null);
  const claimBtn = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  // Focus the action so the dialog is reachable by keyboard from the moment
  // it appears.
  useEffect(() => {
    claimBtn.current?.focus();
  }, []);

  const claim = useCallback(async () => {
    if (phase !== "sealed") return;
    // Start the animation immediately: the network call runs underneath it, so
    // the box never waits on a round trip to feel responsive. The claim is
    // idempotent server-side, so an optimistic open is safe.
    setPhase("opening");
    timer.current = window.setTimeout(() => setPhase("revealed"), OPEN_MS);

    try {
      const res = await apiFetch("/api/gifts/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: gift.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // The grant did not land. Say so plainly rather than showing a reveal
      // for something they do not actually have.
      if (timer.current) window.clearTimeout(timer.current);
      setError(
        "The gift could not be opened just now. It is still yours, and it will be waiting next time you open Purify.",
      );
      setPhase("revealed");
    }
  }, [gift.id, phase]);

  const body = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-label="A gift for you"
      style={{
        // Solid base + a soft pool of light. A gradient costs nothing; a
        // backdrop-filter would cost frames.
        background:
          "radial-gradient(120% 70% at 50% 42%, rgba(234,234,236,0.10) 0%, transparent 62%), #101013",
      }}
    >
      <div className="w-full max-w-[340px] text-center">
        {phase !== "revealed" ? (
          <>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45">
              A gift for you
            </p>

            {/* Stage. Fixed height so the reveal swap cannot shift layout. */}
            <div className="relative mx-auto mt-8 h-[200px] w-[200px]">
              {/* Light welling up from inside the box. */}
              {phase === "opening" ? (
                <div
                  aria-hidden
                  className="gift-glow absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(244,244,245,0.85) 0%, rgba(234,234,236,0.35) 38%, transparent 70%)",
                  }}
                />
              ) : null}

              {/* Embers. */}
              {phase === "opening"
                ? EMBERS.map((x, i) => (
                    <span
                      key={x}
                      aria-hidden
                      className="gift-ember absolute left-1/2 top-[104px] h-1 w-1 rounded-full bg-gold-pale"
                      style={
                        {
                          "--ember-x": `${x}px`,
                          animationDelay: `${i * 55}ms`,
                        } as React.CSSProperties
                      }
                    />
                  ))
                : null}

              {/* Box body. */}
              <div
                className={
                  "absolute inset-x-[18px] bottom-[24px] top-[74px] rounded-xl border border-paper/20 " +
                  (phase === "opening" ? "gift-box-settle" : "gift-idle")
                }
                style={{
                  background:
                    "linear-gradient(160deg, #26262b 0%, #17171b 55%, #121216 100%)",
                  boxShadow:
                    "0 18px 42px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {/* Ribbon down the face. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 w-[10px] -translate-x-1/2 bg-paper/[0.07]"
                />
                {/* Seal. Breaks when the box opens. */}
                <span
                  aria-hidden
                  className={
                    "absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-paper/30 bg-night-soft " +
                    (phase === "opening" ? "gift-seal-break" : "")
                  }
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
                      fill="#eaeaec"
                      fillOpacity="0.85"
                    />
                  </svg>
                </span>
              </div>

              {/* Lid. Sits on top of the body and lifts away. */}
              <div
                className={
                  "absolute inset-x-[6px] top-[56px] h-[34px] rounded-lg border border-paper/25 " +
                  (phase === "opening" ? "gift-lid" : "gift-idle")
                }
                style={{
                  background:
                    "linear-gradient(160deg, #2e2e34 0%, #1c1c21 100%)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                }}
              />
            </div>

            <p className="mt-8 font-serif text-body leading-relaxed text-paper/70">
              Something has been set aside for you.
            </p>

            <button
              ref={claimBtn}
              type="button"
              onClick={() => void claim()}
              disabled={phase === "opening"}
              className="tap-press mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night transition-opacity disabled:opacity-70"
            >
              {phase === "opening" ? "Opening…" : "Claim gift"}
            </button>
            <button
              type="button"
              onClick={onDone}
              disabled={phase === "opening"}
              className="mt-3 font-sans text-caption text-paper/45 underline underline-offset-4 hover:text-paper/70 disabled:opacity-40"
            >
              Not now
            </button>
          </>
        ) : (
          <div className="gift-reveal">
            {error ? (
              <>
                <p className="font-display-serif text-title text-paper">
                  Not just now
                </p>
                <p className="mx-auto mt-4 max-w-[300px] font-serif text-ui leading-relaxed text-paper/70">
                  {error}
                </p>
              </>
            ) : (
              <>
                <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45">
                  Yours
                </p>
                <p className="mt-4 font-display-serif text-display-sm leading-tight text-paper">
                  {tierName(gift.tier)}
                </p>
                <p className="mt-1 font-sans text-lede text-gold-pale">
                  for {lengthLabel(gift.days)}
                </p>
                {gift.message ? (
                  <p className="mx-auto mt-6 max-w-[300px] border-t border-paper/10 pt-5 font-serif text-ui leading-relaxed text-paper/70">
                    {gift.message}
                  </p>
                ) : null}
              </>
            )}
            <button
              type="button"
              onClick={onDone}
              className="tap-press mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
}
