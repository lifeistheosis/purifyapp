"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/cn";

/**
 * The player's own controls, in one place for Now Playing and a chant's Sing
 * along (1.8, the owner's picks of 2026-10-27, rounds 8 and 9): where it is
 * and how far it has to go, then back 15, the white Play and forward 15.
 * Both screens play through the app's one player, so they wear one set of
 * controls.
 */

/** m:ss. */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Where it is, and how far it has to go. The slider's box is 44px tall for a
 * thumb, drawn where the 24px scrubber was. Without `onSeek` it only shows
 * the length: a version not yet in the player.
 */
export function PositionBar({
  current,
  duration,
  onSeek,
  className,
}: {
  current: number;
  duration: number;
  onSeek?: (at: number) => void;
  className?: string;
}) {
  const { t } = useTranslate();
  const max = duration > 0 ? duration : 0;
  return (
    <div className={className}>
      {onSeek ? (
        <Slider
          value={current}
          max={max}
          step={5}
          onChange={onSeek}
          label={t("player.position")}
          valueText={`${clock(current)} / ${clock(duration)}`}
          className="-mb-2.5"
        />
      ) : (
        // The same line, still: nothing is playing here to move it.
        <div aria-hidden className="relative -mb-2.5 h-11">
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-paper/15" />
        </div>
      )}
      <div className="mt-2 flex justify-between font-sans text-caption tabular-nums text-paper/55">
        <span>{clock(current)}</span>
        <span>-{clock(Math.max(0, duration - current))}</span>
      </div>
    </div>
  );
}

/**
 * Back 15, Play or Pause, forward 15. `size` is the white button's: 68px in
 * Now Playing, 64px on a chant's page, as the two were drawn.
 */
export function Transport({
  playing,
  onToggle,
  onSkip,
  canPlay = true,
  canSkip = true,
  busy = false,
  size = 68,
  className,
}: {
  playing: boolean;
  onToggle: () => void;
  onSkip: (seconds: number) => void;
  canPlay?: boolean;
  canSkip?: boolean;
  /** The list of recordings is still being read. */
  busy?: boolean;
  size?: number;
  className?: string;
}) {
  const { t } = useTranslate();
  return (
    <div className={cn("flex items-center justify-center gap-10", className)}>
      <button
        type="button"
        onClick={() => onSkip(-15)}
        disabled={!canSkip}
        aria-label={t("player.back15")}
        className="tap-press grid h-12 w-12 place-items-center rounded-full text-paper hover:bg-paper/[0.06] disabled:opacity-35"
      >
        <SkipGlyph back />
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={!canPlay && !playing}
        aria-busy={busy || undefined}
        aria-label={playing ? t("prayers.pause") : t("prayers.play")}
        className="tap-press grid shrink-0 place-items-center rounded-full bg-paper text-night shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] motion-safe:transition-opacity disabled:opacity-40"
        style={{ width: size, height: size }}
      >
        {playing ? (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="5.5" y="4" width="4.6" height="16" rx="1.3" />
            <rect x="13.9" y="4" width="4.6" height="16" rx="1.3" />
          </svg>
        ) : (
          <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor" className="translate-x-[2px]" aria-hidden>
            <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={() => onSkip(15)}
        disabled={!canSkip}
        aria-label={t("player.forward15")}
        className="tap-press grid h-12 w-12 place-items-center rounded-full text-paper hover:bg-paper/[0.06] disabled:opacity-35"
      >
        <SkipGlyph />
      </button>
    </div>
  );
}

/**
 * One of the choices under Now Playing's controls (round 8 A: "four choices
 * under it"): its mark over a small word, quiet until it is on, then white
 * with a soft white glow (the owner, 2026-10-28: a glowing white, never
 * yellow). Loop, Ambience and the sleep timer wear it.
 */
export function optionClass(on: boolean): string {
  return cn(
    "tap-press flex min-h-11 min-w-16 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-1 font-sans text-[11.5px] font-semibold leading-none motion-safe:transition-colors hover:bg-paper/[0.05]",
    on
      ? "text-paper [text-shadow:0_0_10px_rgba(255,255,255,0.45)] [&_svg]:[filter:drop-shadow(0_0_6px_rgba(255,255,255,0.5))]"
      : "text-paper/60 hover:text-paper",
  );
}

export function SkipGlyph({ back = false }: { back?: boolean }) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {back ? (
        <>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
          <path d="M4.5 3.5v4h4" />
        </>
      ) : (
        <>
          <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
          <path d="M19.5 3.5v4h-4" />
        </>
      )}
      <text x="12" y="15.4" fill="currentColor" stroke="none" fontSize="7.2" fontWeight="700" textAnchor="middle" fontFamily="var(--font-sans), sans-serif">
        15
      </text>
    </svg>
  );
}
