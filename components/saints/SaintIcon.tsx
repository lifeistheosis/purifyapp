import Image from "next/image";
import type { Saint } from "@/lib/saints/saints";
import { cn } from "@/lib/cn";

// Renders a saint's icon as a small framed panel reminiscent of an Orthodox
// icon: dark wood ground, gold inner frame, halo, initials.
//
// The gradient + gold-frame + halo + initials always render as an instant
// CSS placeholder. When `iconUrl` is set, the real JPG layers on top — so
// while the file is loading, the user sees a stylized frame in place of empty
// space, and the JPG paints progressively over it instead of appearing to
// load "piece by piece."

type Size = "sm" | "md" | "lg";

const dims: Record<Size, { w: number; h: number; halo: number; text: number }> = {
  sm: { w: 72, h: 96, halo: 28, text: 16 },
  md: { w: 96, h: 128, halo: 40, text: 22 },
  lg: { w: 160, h: 216, halo: 68, text: 36 },
};

export function SaintIcon({
  saint,
  size = "md",
  priority = false,
  className,
}: {
  saint: Saint & { iconUrl?: string };
  size?: Size;
  /**
   * Mark the image as high-priority (hero use). Triggers Next.js preload and
   * fetchpriority=high so the file lands quickly. Default false; only the
   * lg/hero usage should set this true so we don't ship a wall of preloads.
   */
  priority?: boolean;
  className?: string;
}) {
  const d = dims[size];

  const initials = saint.name
    .replace(/^St\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div
      className={cn(
        "shrink-0 relative rounded-md overflow-hidden border border-[#8a6c2a]/40 shadow-md",
        className,
      )}
      style={{
        width: d.w,
        height: d.h,
        background:
          "linear-gradient(180deg, #2a1f10 0%, #3b2a14 38%, #5a3f1c 100%)",
      }}
      aria-label={`Icon of ${saint.name}`}
      role="img"
    >
      {/* Placeholder layer — always present underneath. Gold inner frame +
          halo + initials are pure CSS, so something stylized renders before
          the JPG arrives. */}
      <div
        aria-hidden
        className="absolute inset-1 rounded-sm border border-[#d4af37]/60 flex flex-col items-center justify-center pointer-events-none"
      >
        <div
          className="rounded-full border-2 border-[#d4af37]"
          style={{
            width: d.halo,
            height: d.halo,
            background:
              "radial-gradient(circle, rgba(212,175,55,0.35) 0%, rgba(212,175,55,0) 75%)",
            boxShadow: "0 0 12px rgba(212,175,55,0.35)",
          }}
        />
        <span
          className="font-serif text-[#f5e6d3] mt-2 tracking-[0.05em]"
          style={{ fontSize: d.text, lineHeight: 1 }}
        >
          {initials}
        </span>
      </div>

      {/* Real icon overlays the placeholder. Progressive JPEG (mozjpeg)
          means it paints blurry-to-sharp over the gold frame, never leaving
          empty space visible. */}
      {saint.iconUrl && (
        <Image
          src={saint.iconUrl}
          alt={`Icon of ${saint.name}`}
          fill
          sizes={`${d.w}px`}
          priority={priority}
          // object-top keeps the face in frame for tall full-body portraits
          // (Wikimedia icons are typically 1:3 bust/full-body crops where
          // the face sits in the top third).
          className="object-cover object-top relative z-10"
        />
      )}
    </div>
  );
}
