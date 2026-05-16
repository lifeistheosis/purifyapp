import Image from "next/image";
import type { Saint } from "@/lib/saints/saints";
import { cn } from "@/lib/cn";

// Renders a saint's icon as a small framed panel reminiscent of an Orthodox icon:
// dark wood ground, gold inner frame, halo, initials.
// If `iconUrl` is later added to the saint metadata (e.g. a PNG in /public/saints/...),
// the real image is used instead of the placeholder.

type Size = "sm" | "md" | "lg";

const dims: Record<Size, { w: number; h: number; halo: number; text: number }> = {
  sm: { w: 72, h: 96, halo: 28, text: 16 },
  md: { w: 96, h: 128, halo: 40, text: 22 },
  lg: { w: 160, h: 216, halo: 68, text: 36 },
};

export function SaintIcon({
  saint,
  size = "md",
  className,
}: {
  saint: Saint & { iconUrl?: string };
  size?: Size;
  className?: string;
}) {
  const d = dims[size];

  if (saint.iconUrl) {
    return (
      <div
        className={cn(
          "shrink-0 relative rounded-md overflow-hidden border border-[#8a6c2a]/40 shadow-md",
          className,
        )}
        style={{ width: d.w, height: d.h }}
      >
        <Image
          src={saint.iconUrl}
          alt={`Icon of ${saint.name}`}
          fill
          sizes={`${d.w}px`}
          className="object-cover"
        />
      </div>
    );
  }

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
      {/* Gold inner frame */}
      <div className="absolute inset-1 rounded-sm border border-[#d4af37]/60 flex flex-col items-center justify-center">
        {/* Halo */}
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
        {/* Initials below the halo */}
        <span
          className="font-serif text-[#f5e6d3] mt-2 tracking-[0.05em]"
          style={{ fontSize: d.text, lineHeight: 1 }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
