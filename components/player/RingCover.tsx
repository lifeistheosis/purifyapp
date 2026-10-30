import { CoverArt } from "@/components/player/CoverArt";
import { CrossPlate } from "@/components/ui/CrossPlate";
import { cn } from "@/lib/cn";

/**
 * The mini player's cover (1.8, the owner's pick B of r3-05, "the small
 * pill"): the picture as a disc in a ring, and the ring is how far it has
 * played. Lit white while it plays, grey while it waits; on Parchment the
 * ink, with no glow (app/globals.css, .mini-player-ring-lit). It took the
 * place of 1.7's thin line along the card's foot. Drawn for the eye: the
 * time is in Now Playing, and the title beside it names what plays.
 *
 * Two sizes, as the sheet draws them: the card's, and the pill's it draws in
 * to (components/prayers/NowPlayingBar.tsx).
 */

/** The ring's outer box and the disc in it, in CSS px. */
export const RING_SIZES = { card: { box: 44, disc: 36 }, pill: { box: 32, disc: 24 } } as const;

/** How thick the ring is drawn. */
export const RING_STROKE = 2;

/**
 * The ring's radius and whole length in a box this size, and how much of it
 * is lit for how far the track has played (0 to 1). Anything outside that,
 * or not a number (a stream with no length), lights none of it or all of it.
 */
export function ringArc(box: number, played: number): { r: number; length: number; lit: number } {
  const r = box / 2 - 1.5;
  const length = 2 * Math.PI * r;
  const share = Number.isFinite(played) ? Math.min(1, Math.max(0, played)) : 0;
  return { r, length, lit: share * length };
}

/** The disc in its ring. The ring starts at the top and runs clockwise. */
export function RingCover({
  art,
  fallback,
  played,
  lit,
  size,
}: {
  art: string | null;
  fallback?: string | null;
  /** How far it has played, 0 to 1. */
  played: number;
  /** Playing: the ring lit. */
  lit: boolean;
  size: keyof typeof RING_SIZES;
}) {
  const { box, disc } = RING_SIZES[size];
  const c = box / 2;
  const arc = ringArc(box, played);
  const discClass = cn("relative rounded-full", size === "card" ? "size-9" : "size-6");
  return (
    <span
      aria-hidden
      data-ring={lit ? "lit" : "waiting"}
      className={cn("relative grid shrink-0 place-items-center text-paper", size === "card" ? "size-11" : "size-8")}
    >
      <svg viewBox={`0 0 ${box} ${box}`} className="absolute inset-0 size-full">
        <circle cx={c} cy={c} r={arc.r} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={RING_STROKE} />
      </svg>
      {/* With nothing played yet there is no arc: a round cap on a dash of
          no length would draw a dot at the top. */}
      {arc.lit > 0 ? (
        <svg viewBox={`0 0 ${box} ${box}`} className={cn("absolute inset-0 size-full -rotate-90", lit && "mini-player-ring-lit")}>
          <circle
            cx={c}
            cy={c}
            r={arc.r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={lit ? 1 : 0.62}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arc.lit} ${arc.length}`}
          />
        </svg>
      ) : null}
      {/* Positioned, so it is drawn over the rings and not under them. */}
      {art ? (
        <CoverArt src={art} fallback={fallback} size={disc} className={cn(discClass, "object-[50%_18%]")} />
      ) : (
        // No picture (a chant with no cover): the plate's cross, never an empty disc.
        <CrossPlate size="disc" className={discClass} />
      )}
    </span>
  );
}
