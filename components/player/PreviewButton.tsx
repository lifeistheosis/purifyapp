"use client";

import { Play } from "@/components/ui/icons/Play";
import { Stop } from "@/components/ui/icons/Stop";
import { cn } from "@/lib/cn";

/**
 * The preview button (1.7): play on a soft round, or stop while the preview
 * plays, with a thin line running round the rim as it goes. Used by Pray
 * with chant's picker and by a chant's versions. The sound itself is
 * lib/player/preview.ts.
 *
 * 1.7.1, after the owner's "low-key looks unoptimized": the round is a fill,
 * not a grey ring at rest (a ring with nothing in it read as a heavy, muddy
 * outline), the glyph is larger and centred by its weight rather than pushed
 * a whole pixel right, and the progress line is drawn only while a preview
 * plays, with square ends, so an empty line never leaves a dot at the top.
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
  // The line sits on the rim: a 36px round, a 1.5px line centred 0.75px in.
  const r = 17.25;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "tap-press group relative grid h-11 w-11 shrink-0 place-items-center text-paper disabled:text-paper/30",
        className,
      )}
    >
      <span
        className={cn(
          "relative grid size-9 place-items-center rounded-full motion-safe:transition-colors",
          playing ? "bg-paper/[0.14]" : "bg-paper/10 group-hover:bg-paper/[0.14] group-disabled:bg-paper/[0.05]",
        )}
      >
        {playing ? (
          <svg width={36} height={36} viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray={c}
              strokeDashoffset={c * (1 - Math.min(Math.max(progress, 0), 1))}
            />
          </svg>
        ) : null}
        {playing ? <Stop size={16} /> : <Play size={16} className="translate-x-[0.5px]" />}
      </span>
    </button>
  );
}
