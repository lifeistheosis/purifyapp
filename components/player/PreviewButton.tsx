"use client";

import { Play } from "@/components/ui/icons/Play";
import { Stop } from "@/components/ui/icons/Stop";
import { cn } from "@/lib/cn";

/**
 * The preview button (1.7): a ring that fills as the preview plays, with
 * play in it, or stop while it plays. Used by Pray with chant's picker and
 * by a chant's versions. The sound itself is lib/player/preview.ts.
 */
export function PreviewButton({
  playing,
  progress,
  onToggle,
  label,
  disabled = false,
  className,
}: {
  playing: boolean;
  progress: number;
  onToggle: () => void;
  /** What a screen reader hears: "Hear part of ..." or "Stop". */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "tap-press relative grid h-11 w-11 shrink-0 place-items-center text-paper disabled:text-paper/30",
        className,
      )}
    >
      <span className="relative grid size-10 place-items-center">
        <svg width={40} height={40} viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={2.5} />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - (playing ? progress : 0))}
            strokeLinecap="round"
          />
        </svg>
        {playing ? <Stop size={14} /> : <Play size={15} className="translate-x-[1px]" />}
      </span>
    </button>
  );
}
