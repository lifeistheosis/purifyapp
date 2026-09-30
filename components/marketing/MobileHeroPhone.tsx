"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { PhoneFrame } from "./storeBits";

/**
 * The phone that rises out of the bottom of the front page's first screen on
 * a phone: Purify's Today screen, so the first screen shows that this is an
 * app before a word of the pitch is read.
 *
 * It takes whatever height the first screen has left under the ask, so the
 * screen stays one screen tall on any phone: a tall phone shows the top of
 * the app, a short one a glimpse, the smallest nothing at all. Its foot fades
 * into the page, and it lifts a little as the reader scrolls, with the gold
 * light behind it warming. Driven by the scroll position through one CSS variable,
 * so it moves on the compositor and React never renders on scroll. Always on,
 * like the phones in the apps section, which the owner asked to keep moving
 * (components/marketing/AppsSection.tsx).
 *
 * Decorative: the screenshot is described where the apps section shows it
 * again, so here it is hidden from assistive technology.
 */
export function MobileHeroPhone() {
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.7)));
      stage.style.setProperty("--hp", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const phone: CSSProperties = {
    transform: "translate3d(-50%, calc(var(--hp, 0) * -56px), 0) rotate(calc(var(--hp, 0) * -1.5deg))",
  };
  const glow: CSSProperties = {
    background: "radial-gradient(closest-side, rgba(201,162,90,0.26), rgba(201,162,90,0.06) 60%, transparent)",
    opacity: "calc(0.55 + var(--hp, 0) * 0.45)",
  };

  return (
    <div
      ref={stageRef}
      aria-hidden
      className="relative mt-8 min-h-0 flex-1 overflow-hidden md:hidden"
      style={{
        maskImage: "linear-gradient(to bottom, black 45%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, black 45%, transparent)",
      } as CSSProperties}
    >
      <div className="absolute inset-x-0 top-10 mx-auto h-72 w-72 rounded-full blur-2xl" style={glow} />
      <div className="absolute left-1/2 top-[56px] w-[232px] will-change-transform" style={phone}>
        <PhoneFrame src="/marketing/app-today.webp" alt="" />
      </div>
    </div>
  );
}
