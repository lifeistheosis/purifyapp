"use client";

import { useRef, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PhoneFrame, PhoneStoreAsk } from "../storeBits";
import { useScrollProgress } from "./useScrollProgress";

/** 0 as the stage's top reaches the foot of the screen, 1 once it is seven tenths of the way up. */
function closingProgress(top: number, viewport: number): number {
  return (viewport - top) / (viewport * 0.7);
}

/**
 * The phone front page's last word before the footer: take it with you, the
 * visitor's store once more, and the two phones, iPhone and Android, rising
 * and settling as they come up the screen (the pair the owner kept from the
 * September page: "I like ... the pictures of the phones and how the phones
 * move"). Their feet fade into the page above the footer.
 *
 * The rise follows the scroll position, behind Purify's motion switch: with
 * motion off the phones stand in their resting pose.
 */
export function PhoneClosing() {
  const { t } = useTranslate();
  const stageRef = useRef<HTMLDivElement | null>(null);
  useScrollProgress(stageRef, stageRef, closingProgress, 1);

  const rest = "calc(1 - var(--p, 1))";
  const front: CSSProperties = {
    transform: `translate3d(0, calc(${rest} * 90px), 0) rotate(calc(-3deg - ${rest} * 6deg))`,
    opacity: `calc(0.35 + var(--p, 1) * 0.65)`,
  };
  const back: CSSProperties = {
    transform: `translate3d(calc(${rest} * -28px), calc(${rest} * 140px), 0) rotate(calc(5deg + ${rest} * 8deg))`,
    opacity: `calc(0.25 + var(--p, 1) * 0.75)`,
  };

  return (
    <section aria-labelledby="phone-closing-title" className="overflow-hidden px-5 pt-20">
      <h2
        id="phone-closing-title"
        className="text-balance text-[clamp(26px,7vw,30px)] leading-[1.12] tracking-[-0.02em] text-paper"
      >
        {t("home.apps.title")}
      </h2>
      <p className="mt-3 max-w-[34ch] text-pretty font-sans text-body leading-[1.55] text-paper/72">
        {t("home.apps.body")}
      </p>
      <PhoneStoreAsk className="mt-7" rating={false} />
      <div
        ref={stageRef}
        className="relative mx-auto mt-10 h-[min(112vw,440px)] w-full max-w-[400px] [-webkit-mask-image:linear-gradient(to_bottom,black_56%,transparent)] [mask-image:linear-gradient(to_bottom,black_56%,transparent)]"
        style={{ "--p": 1 } as CSSProperties}
      >
        <div className="absolute end-[3%] top-0 w-[54%] will-change-transform" style={back}>
          <PhoneFrame android src="/marketing/app-bible.webp" alt={t("home.apps.phoneAltBible")} />
        </div>
        <div className="absolute start-[3%] top-12 w-[58%] will-change-transform" style={front}>
          <PhoneFrame src="/marketing/app-today.webp" alt={t("home.apps.phoneAltToday")} />
        </div>
      </div>
    </section>
  );
}
