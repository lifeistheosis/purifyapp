"use client";

import { useRef, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { StoreRatings } from "@/lib/marketing/storeRatings";
import { PhoneFrame, PhoneStoreAsk } from "../storeBits";
import { useScrollProgress } from "./useScrollProgress";

/** 0 at the top of the page, 1 once three quarters of a screen has gone by. */
function heroProgress(_top: number, viewport: number, scrollY: number): number {
  return scrollY / (viewport * 0.75);
}

/**
 * The phone front page's first screen: what Purify is, the visitor's own
 * store with its rating, and the app itself below, Purify's Today screen in a
 * phone that the reader's first scroll lifts into the light.
 *
 * The phone is whole, not cut off at the foot of the screen as it was: the
 * first screen shows its top, and the page scrolls on into it, so nothing has
 * to fit one screen and nothing snaps. It rises a little faster than the page
 * and grows a touch while the light behind it opens, all from the scroll
 * position, and stands still with Purify's motion off.
 *
 * Decorative to assistive technology: the closing section shows the same
 * screen again with its description.
 */
export function PhoneHero({ ratings }: { ratings: StoreRatings }) {
  const { t } = useTranslate();
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  useScrollProgress(sectionRef, stageRef, heroProgress, 0);

  const phone: CSSProperties = {
    transform: "translate3d(0, calc(var(--p, 0) * -48px), 0) scale(calc(1 + var(--p, 0) * 0.04))",
    transformOrigin: "50% 15%",
  };
  // The light behind the phone, in the page's own ink: a glow on the dark
  // palettes, a soft shade on Light.
  const light: CSSProperties = {
    background:
      "radial-gradient(closest-side, color-mix(in srgb, var(--color-paper) 14%, transparent), color-mix(in srgb, var(--color-paper) 4%, transparent) 58%, transparent)",
    opacity: "calc(0.55 + var(--p, 0) * 0.45)",
    transform: "translate3d(-50%, calc(var(--p, 0) * -36px), 0) scale(calc(0.9 + var(--p, 0) * 0.16))",
  };

  return (
    <section ref={sectionRef} aria-labelledby="phone-hero-title" className="relative overflow-hidden px-5 pb-14 pt-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        style={{
          background:
            "radial-gradient(120% 75% at 12% 0%, color-mix(in srgb, var(--color-paper) 6%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <h1
          id="phone-hero-title"
          className="text-balance text-[clamp(30px,8.6vw,36px)] leading-[1.08] tracking-[-0.02em] text-paper"
        >
          {t("home.heroH1")}
        </h1>
        <p className="mt-4 max-w-[34ch] text-pretty font-sans text-body leading-[1.55] text-paper/72">
          {t("home.heroSubtitle")}
        </p>
        <PhoneStoreAsk className="mt-7" ratings={ratings} starTone="ink" />
      </div>
      <div
        ref={stageRef}
        aria-hidden
        className="relative mx-auto mt-11 w-[min(64vw,252px)]"
        style={{ "--p": 0 } as CSSProperties}
      >
        <div className="pointer-events-none absolute left-1/2 top-[4%] aspect-square w-[160%] rounded-full" style={light} />
        <div className="relative will-change-transform" style={phone}>
          <PhoneFrame src="/marketing/app-today.webp" alt="" priority />
        </div>
      </div>
    </section>
  );
}
