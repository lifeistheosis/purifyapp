import Image from "next/image";
import { getPrayerIcon } from "@/lib/prayers/icons";
import { cn } from "@/lib/cn";

/**
 * Renders a Byzantine theme icon inside an Orthodox-frame chrome:
 * outer warm-brown border, inner gold frame, the icon photo behind.
 * Same visual vocabulary as SaintIcon, scaled for prayer-section use.
 *
 * Sizes:
 *   sm    72 × 96    — thumbnail (Hours grid card top)
 *   md    120 × 160  — section anchor (rule cards, Akathists)
 *   lg    200 × 280  — Jesus Prayer card centerpiece
 *   hero  fills container with object-cover — used as a backdrop
 */

type Size = "sm" | "md" | "lg" | "hero";

const dims: Record<Exclude<Size, "hero">, { w: number; h: number }> = {
  sm: { w: 72, h: 96 },
  md: { w: 120, h: 160 },
  lg: { w: 200, h: 280 },
};

export function PrayerIcon({
  slug,
  size = "md",
  priority = false,
  className,
}: {
  slug: string;
  size?: Size;
  /** Set on the page's primary icon so Next preloads it. */
  priority?: boolean;
  className?: string;
}) {
  const icon = getPrayerIcon(slug);
  if (!icon) return null;

  if (size === "hero") {
    return (
      <div className={cn("absolute inset-0", className)} aria-hidden>
        <Image
          src={icon.src}
          alt={icon.alt}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover object-top"
        />
      </div>
    );
  }

  const d = dims[size];
  return (
    <div
      className={cn(
        "shrink-0 relative rounded-md overflow-hidden border border-[#8a6c2a]/45 shadow-md bg-[#1a1219]",
        className,
      )}
      style={{ width: d.w, height: d.h }}
      role="img"
      aria-label={icon.alt}
    >
      {/* Inner gold frame — the Orthodox icon-panel cue. */}
      <div
        aria-hidden
        className="absolute inset-1 rounded-sm border border-[#d4af37]/40 pointer-events-none z-10"
      />
      <Image
        src={icon.src}
        alt={icon.alt}
        fill
        priority={priority}
        sizes={`${d.w}px`}
        className="object-cover object-top"
      />
    </div>
  );
}
