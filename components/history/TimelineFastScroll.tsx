"use client";

// Mobile fast-scroll: hold the vertical rail at the right edge of the
// timeline and drag, the page scrubs century by century while a floating
// bubble under the thumb names the century and its era. Releasing leaves
// the reader where the bubble said.
//
// Pointer-only enhancement: the rail is aria-hidden and the CenturyScrubber
// range input (in the page flow) remains the accessible, keyboard, and
// non-drag path. Hidden at lg+ where the sidebar scrubber takes over.
//
// Android back-gesture note: back is a *horizontal* edge swipe; this rail
// only claims vertical pans that start on it (touch-action: none), is inset
// from the physical edge by the safe area, and never intercepts pointers
// outside its own 36px column.

import { useCallback, useEffect, useRef, useState } from "react";

import { centuryLabelOf, eraForYear } from "@/lib/history/events";
import { isNativeClient } from "@/lib/platform/native";
import { cn } from "@/lib/cn";

// A quiet tick as the thumb crosses into a new century, the PrayerRope
// pattern: platform haptics inside the native shell, vibrate on the web.
function hapticTick() {
  if (isNativeClient()) {
    import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {});
  } else if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(8);
    } catch {
      /* ignore */
    }
  }
}

export function TimelineFastScroll({
  centuries,
  active,
  onJump,
}: {
  /** Centuries that actually contain events, ascending. */
  centuries: number[];
  /** Century currently in view (from the scroll spy). */
  active?: number;
  onJump: (century: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastIdx = useRef(-1);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  // The rail appears once the reader is into the timeline proper; over the
  // page intro it would only be clutter.
  useEffect(() => {
    let ticking = false;
    const check = () => {
      ticking = false;
      setVisible(window.scrollY > 320);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(check);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrub = useCallback(
    (clientY: number) => {
      const rail = railRef.current;
      if (!rail || centuries.length < 2) return;
      const r = rail.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      const idx = Math.round(frac * (centuries.length - 1));
      if (idx !== lastIdx.current) {
        lastIdx.current = idx;
        setDragIdx(idx);
        onJump(centuries[idx]);
        hapticTick();
      }
    },
    [centuries, onJump],
  );

  const endDrag = useCallback(() => {
    dragging.current = false;
    lastIdx.current = -1;
    setDragIdx(null);
  }, []);

  if (centuries.length < 2) return null;

  const activeIdx = Math.max(
    0,
    centuries.findIndex((c) => c === active),
  );
  const idx = dragIdx ?? activeIdx;
  const frac = idx / (centuries.length - 1);
  const century = centuries[idx] ?? centuries[0];
  // Mid-century year → era, for the bubble's second line.
  const era = eraForYear((century - 1) * 100 + 50);

  return (
    <div
      aria-hidden
      className={cn(
        "fixed right-[max(4px,env(safe-area-inset-right))] top-1/2 z-30 -translate-y-1/2 select-none lg:hidden",
        "transition-opacity duration-300",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div
        ref={railRef}
        onPointerDown={(e) => {
          dragging.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          scrub(e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging.current) scrub(e.clientY);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative flex h-[min(44vh,380px)] w-9 touch-none justify-center"
      >
        {/* Track */}
        <div
          className={cn(
            "w-[3px] rounded-full transition-colors",
            dragIdx !== null ? "bg-paper/30" : "bg-paper/15",
          )}
        />

        {/* Thumb, mirrors the .history-scrubber thumb */}
        <div
          className={cn(
            "absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border bg-night-soft",
            "shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-night)_80%,transparent)]",
            dragIdx !== null ? "scale-115 border-crimson" : "border-paper/35",
          )}
          style={{ top: `calc(${frac * 100}% - 10px)` }}
        />

        {/* Century bubble while scrubbing */}
        {dragIdx !== null ? (
          <div
            className="absolute right-full mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-paper/20 bg-night-soft px-3.5 py-2 text-right shadow-lg"
            style={{ top: `${frac * 100}%` }}
          >
            <p className="font-display-serif text-title-sm text-paper tabular-nums">
              {centuryLabelOf(century)}
            </p>
            <p className="mt-0.5 font-sans text-caption text-paper/60">{era.label}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
