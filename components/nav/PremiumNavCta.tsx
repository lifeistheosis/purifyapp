"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The glowing "Premium" pill in the site header, shared by the marketing
 * Navbar and the in-app AppNav so the call-to-action is identical
 * everywhere. It replaced the old "Open Purify" CTA in both. Real gold
 * (#d4af37) rather than the monochrome white accent, with a soft breathing
 * halo (.premium-glow in globals.css) that ties it to the gold /premium
 * and /pricing surfaces. A resting box-shadow keeps the halo for
 * reduced-motion users.
 */
export function PremiumNavCta({
  active = false,
  fullWidth = false,
  onClick,
}: {
  active?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
}) {
  const { t } = useTranslate();
  return (
    <Link
      href="/premium"
      onClick={onClick}
      className={cn(
        "premium-glow inline-flex items-center justify-center gap-1.5 rounded-pill border font-sans text-ui font-semibold transition-colors duration-150",
        fullWidth ? "flex w-full px-5 py-3" : "px-5 py-2.5",
        active
          ? "border-[#d4af37] bg-[#d4af37]/20 text-[#f4d58a]"
          : "border-[#d4af37]/55 bg-[#d4af37]/[0.12] text-[#f0cf7a] hover:border-[#d4af37] hover:bg-[#d4af37]/20",
      )}
      style={{ boxShadow: "0 0 8px 0 rgba(212,175,55,0.32)" }}
    >
      <PremiumSparkle />
      {t("nav.premium")}
    </Link>
  );
}

// A small four-point gold star, matching the StarMark used across the
// pricing / premium surfaces so the nav CTA reads as their doorway.
function PremiumSparkle() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
        fill="#f0cf7a"
      />
    </svg>
  );
}
