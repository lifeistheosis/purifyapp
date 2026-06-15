import Link from "next/link";

/**
 * Shared mobile design-language primitives for the Figma-style rework:
 * large soft rounded "doors" (SoftTile) and a gradient feature band
 * (FeatureBand). Grayscale scheme — tone variants are graded neutrals so
 * a grid of tiles reads as a calm set without colour. Used on the Today,
 * Prayers, Bible, and Calendar mobile surfaces so they share one look.
 */

const TONES = {
  a: "linear-gradient(155deg, #303034 0%, #1f1f22 100%)",
  b: "linear-gradient(155deg, #28282c 0%, #18181b 100%)",
  c: "linear-gradient(155deg, #343438 0%, #232326 100%)",
  d: "linear-gradient(155deg, #2b2b30 0%, #1c1c1f 100%)",
} as const;

export type Tone = keyof typeof TONES;

export function SoftTileGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`grid grid-cols-2 gap-3 ${className}`}>{children}</div>;
}

export function SoftTile({
  href,
  label,
  sub,
  icon,
  tone = "a",
}: {
  href: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[22px] p-4 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-paper/10 transition-transform active:scale-[0.98]"
      style={{ background: TONES[tone] }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-5 -bottom-6 h-24 w-24 rounded-full bg-paper/10 blur-xl"
      />
      <span
        aria-hidden
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/12 text-gold-pale ring-1 ring-inset ring-paper/15"
      >
        {icon}
      </span>
      <h3 className="relative mt-3 font-serif text-title-sm leading-tight text-paper">
        {label}
      </h3>
      {sub ? (
        <p className="relative mt-0.5 font-sans text-caption text-paper/60">
          {sub}
        </p>
      ) : null}
    </Link>
  );
}

/**
 * A featured gradient call-to-action band — the meditation-app "Daily
 * Calm" idiom. An icon disc on the left (a play triangle by default),
 * eyebrow + serif title + optional subtitle, and an optional pill CTA.
 */
export function FeatureBand({
  href,
  eyebrow,
  title,
  sub,
  cta,
  icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  sub?: string;
  cta?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[28px] p-5 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.99]"
      style={{
        background:
          "radial-gradient(115% 90% at 88% 12%, rgba(255,255,255,0.16) 0%, transparent 55%), linear-gradient(150deg, #34343a 0%, #232327 60%, #1a1a1d 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-paper/15 blur-2xl"
      />
      <div className="relative flex items-start gap-4">
        <span
          aria-hidden
          className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-night shadow-[0_6px_16px_-6px_rgba(0,0,0,0.6)]"
        >
          {icon ?? <PlayGlyph />}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold-pale/80">
            {eyebrow}
          </p>
          <h3 className="mt-1 font-serif text-title-sm leading-[1.15] text-paper">
            {title}
          </h3>
          {sub ? (
            <p className="mt-1.5 font-sans text-caption text-paper/65 leading-[1.5]">
              {sub}
            </p>
          ) : null}
        </div>
      </div>
      {cta ? (
        <div className="relative mt-4 flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-gold px-5 py-2 font-sans text-ui font-semibold text-night shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] transition-colors group-hover:bg-gold-soft">
            {cta}
            <ChevronGlyph />
          </span>
        </div>
      ) : null}
    </Link>
  );
}

function PlayGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]" aria-hidden>
      <path d="M7 5.5v13l11-6.5L7 5.5z" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
