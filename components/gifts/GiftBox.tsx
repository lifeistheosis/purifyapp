"use client";

// The claim experience for a gifted Plus/Pro period.
//
// Restraint is the brief: this is an Orthodox prayer app, not a loot crate.
// A sealed reliquary strains against its beeswax seal, the seal gives, the lid
// lifts, light floods out, and a quiet card names the gift. No countdown, no
// rarity tiers, no confetti.
//
// Palette note: `gold` in this codebase is #eaeaec, a near-white (see the
// @theme block in globals.css — the monochrome scheme kept the token name so
// existing utilities resolve). The light here is pale with a cream core, never
// amber, which is what keeps it consistent with every other surface.
//
// Performance rules, all learned the hard way in this repo:
//   * transform + opacity only, so nothing leaves the compositor.
//   * NO backdrop-filter. The Android WebView bleeds imagery through it and
//     drops frames; the shop sub-tab bar carries the same warning.
//   * Portaled to <body>, or this z-index lands inside whatever stacking
//     context the host page made — the bug that buried the chapter grid.
//   * prefers-reduced-motion collapses the whole thing to a cross-fade.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api/client";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";
import { emberOffsets, giftPresentation } from "@/lib/gifts/presentation";
import {
  giftSoundEnabled,
  playGiftChime,
  setGiftSoundEnabled,
} from "@/lib/gifts/chime";
import { Reliquary } from "./Reliquary";

export type PendingGift = {
  id: string;
  tier: "plus" | "pro";
  days: number;
  message: string | null;
};

type Phase = "sealed" | "opening" | "revealed";

function SpeakerMark({ on }: { on: boolean }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3v6h3l5 4z" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      ) : (
        <path d="M17 9l4 6M21 9l-4 6" />
      )}
    </svg>
  );
}

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
  // Off unless the reader has turned it on before. Read after mount so SSR and
  // the first client render agree.
  const [sound, setSound] = useState(false);
  const claimBtn = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<number | null>(null);

  // How grand this particular gift gets to be. Drives the casket's ornament,
  // the length of the ceremony, and how much light comes out.
  const pres = giftPresentation(gift.tier, gift.days);
  const { motion, light } = pres;
  /** Everything after the lid starts moving is timed off this. */
  const burstAt = motion.strainMs + motion.beatMs;

  useEffect(() => {
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    claimBtn.current?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSound(giftSoundEnabled());
  }, []);

  const claim = useCallback(async () => {
    if (phase !== "sealed") return;
    // Start the animation immediately: the network call runs underneath it, so
    // the casket never waits on a round trip to feel responsive. The claim is
    // idempotent server-side, so an optimistic open is safe.
    setPhase("opening");
    // Synchronously inside the tap, or autoplay policy blocks the context.
    // Lined up with the seal giving way; a no-op unless sound is opted in.
    playGiftChime(pres.level, motion.strainMs / 1000);
    timer.current = window.setTimeout(
      () => setPhase("revealed"),
      motion.openTotalMs,
    );

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
  }, [gift.id, phase, motion.openTotalMs, motion.strainMs, pres.level]);

  const opening = phase === "opening";

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
          "radial-gradient(120% 70% at 50% 44%, rgba(234,234,236,0.10) 0%, transparent 62%), #101013",
      }}
    >
      <div className="w-full max-w-[340px] text-center">
        {phase !== "revealed" ? (
          <>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45">
              A gift for you
            </p>

            {/* Stage. Fixed size so the reveal swap cannot shift layout. */}
            <div className="relative mx-auto mt-8 h-[212px] w-[212px]">
              {/* Rays of glory, turning as they swell. The grandest casket
                  gets a second layer turning the other way. */}
              {opening && light.rays > 0
                ? Array.from({ length: light.rays }, (_, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className="gift-rays absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{
                        height: i === 0 ? 300 : 240,
                        width: i === 0 ? 300 : 240,
                        animationDelay: `${burstAt + 20}ms`,
                        // The counter layer is finer and turns the other way.
                        background: `repeating-conic-gradient(from ${
                          i === 0 ? 0 : 7
                        }deg at 50% 50%, rgba(244,244,245,${
                          i === 0 ? 0.5 : 0.32
                        }) 0deg ${i === 0 ? 3 : 1.6}deg, transparent ${
                          i === 0 ? 3 : 1.6
                        }deg ${i === 0 ? 15 : 9}deg)`,
                        maskImage:
                          "radial-gradient(circle, rgba(0,0,0,0.95) 12%, transparent 66%)",
                        WebkitMaskImage:
                          "radial-gradient(circle, rgba(0,0,0,0.95) 12%, transparent 66%)",
                        ...(i === 1 ? { animationDirection: "reverse" } : {}),
                      }}
                    />
                  ))
                : null}

              {/* Light flooding out of the opened casket. */}
              {opening ? (
                <div
                  aria-hidden
                  className="gift-flood absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    animationDelay: `${burstAt}ms`,
                    // Higher levels throw more light, and throw it further.
                    ["--gift-flood-scale" as string]: String(light.floodScale),
                    background: `radial-gradient(circle, rgba(247,236,217,${
                      0.55 + light.floodScale * 0.18
                    }) 0%, rgba(234,234,236,0.42) 34%, transparent 70%)`,
                  }}
                />
              ) : null}

              {/* Embers, staggered to start as the lid clears. */}
              {opening
                ? emberOffsets(light.embers).map((x, i) => (
                    <span
                      key={`${x}-${i}`}
                      aria-hidden
                      className="gift-ember absolute left-1/2 top-[112px] h-1 w-1 rounded-full bg-gold-pale"
                      style={
                        {
                          "--ember-x": `${x}px`,
                          animationDelay: `${burstAt + 120 + i * 42}ms`,
                        } as React.CSSProperties
                      }
                    />
                  ))
                : null}

              {/* The casket itself. */}
              <div className="absolute inset-0">
                <Reliquary
                  presentation={pres}
                  phase={opening ? "opening" : "sealed"}
                />
              </div>
            </div>

            <p className="mt-7 font-serif text-body leading-relaxed text-paper/70">
              Something has been set aside for you.
            </p>

            <button
              ref={claimBtn}
              type="button"
              onClick={() => void claim()}
              disabled={opening}
              className="tap-press mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night transition-opacity disabled:opacity-70"
            >
              {opening ? "Opening…" : "Claim gift"}
            </button>
            <div className="mt-3 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={onDone}
                disabled={opening}
                className="font-sans text-caption text-paper/45 underline underline-offset-4 hover:text-paper/70 disabled:opacity-40"
              >
                Not now
              </button>
              {/* Sound is off unless asked for, and the ask lives here rather
                  than in a settings page nobody visits — this is the one
                  moment it matters. */}
              <button
                type="button"
                onClick={() => {
                  const next = !sound;
                  setSound(next);
                  setGiftSoundEnabled(next);
                }}
                disabled={opening}
                aria-pressed={sound}
                className="inline-flex items-center gap-1.5 font-sans text-caption text-paper/45 hover:text-paper/70 disabled:opacity-40"
              >
                <SpeakerMark on={sound} />
                {sound ? "Sound on" : "Sound off"}
              </button>
            </div>
          </>
        ) : (
          <div className="relative">
            {error ? (
              <div className="gift-fade-up">
                <p className="font-display-serif text-title text-paper">
                  Not just now
                </p>
                <p className="mx-auto mt-4 max-w-[300px] font-serif text-ui leading-relaxed text-paper/70">
                  {error}
                </p>
              </div>
            ) : (
              <>
                {/* Mandorla: the almond of radiance behind an icon's Christ.
                    Only from level 3 up, and it grows with the gift. */}
                {light.mandorla ? (
                  <div
                    aria-hidden
                    className="gift-mandorla pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      height: Math.round(280 * light.mandorlaScale),
                      width: Math.round(280 * light.mandorlaScale),
                      background:
                        "radial-gradient(circle, rgba(247,236,217,0.55) 0%, rgba(234,234,236,0.18) 40%, transparent 68%)",
                    }}
                  />
                ) : null}
                <div className="relative">
                  <p
                    className="gift-fade-up font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45"
                    style={{ animationDelay: "60ms" }}
                  >
                    Yours
                  </p>
                  <p
                    className="gift-name mt-4 font-display-serif text-display-sm leading-tight text-paper"
                    style={{ animationDelay: "120ms" }}
                  >
                    {tierName(gift.tier)}
                  </p>
                  <p
                    className="gift-fade-up mt-1 font-sans text-lede text-gold-pale"
                    style={{ animationDelay: "260ms" }}
                  >
                    for {lengthLabel(gift.days)}
                  </p>
                  {gift.message ? (
                    <p
                      className="gift-fade-up mx-auto mt-6 max-w-[300px] border-t border-paper/10 pt-5 font-serif text-ui leading-relaxed text-paper/70"
                      style={{ animationDelay: "380ms" }}
                    >
                      {gift.message}
                    </p>
                  ) : null}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={onDone}
              className="gift-fade-up tap-press relative mt-8 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night"
              style={{ animationDelay: error ? "120ms" : "500ms" }}
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
