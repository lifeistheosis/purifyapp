import type { CSSProperties } from "react";

/**
 * The placeholder a reader sees when they have no photo: their initials on a
 * plain disc. ONE component for every place that draws it.
 *
 * ── Why it exists (2026-09-25) ───────────────────────────────────────────
 *
 * Three files each drew their own disc, and two of them read as yellow: the
 * account hero (64px) and the desktop nav (36px) filled theirs with an inline
 * brown to olive-gold gradient, #2a1f10 to #5a3f1c, with cream letters, and
 * the hero added a 2px ring and a 24px glow. None of that answered to the
 * theme; it was three hexes typed into each component. The Today tab's disc
 * had already been made neutral, so the same avatar looked different one tab
 * apart. The owner asked for "not yellow and minimal".
 *
 * So: the Today tab's neutral fill, a hairline instead of a ring, no glow,
 * and the letters in the reader's own text colour. The saint icon fallback
 * (components/saints/SaintIcon.tsx) is NOT this and keeps its gilding on
 * purpose: it stands in for an icon, and an icon is gilded.
 *
 * ── One letter or two ────────────────────────────────────────────────────
 *
 * Two letters when the name has two words ("Edgar Augustin" gives EA), one
 * when it has one. The old rule took the first two characters of a one-word
 * name, which turned "Ven" into "VE" and "Purify" into "PU": abbreviations of
 * nothing. A single letter is calmer at every size and cannot misread.
 */
export function avatarInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "?";
  if (parts.length === 1) return first.toUpperCase();
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return (first + last).toUpperCase();
}

/** The neutral fill, the Today tab's since before this component existed.
 * On Light, .lm-avatar in globals.css swaps it for paper. */
const FILL = "linear-gradient(155deg, #2a2a2f 0%, #1f1f22 50%, #18181b 100%)";

export function InitialsAvatar({
  name,
  size,
  className,
  style,
}: {
  name: string | null | undefined;
  /** Diameter in px. The letters scale with it. */
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const letters = avatarInitials(name);
  return (
    <span
      aria-hidden="true"
      className={
        "lm-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full border border-paper/15 font-display-serif leading-none text-paper/90" +
        (className ? ` ${className}` : "")
      }
      style={{
        width: size,
        height: size,
        // One letter can stand larger than two in the same disc.
        fontSize: Math.round(size * (letters.length === 1 ? 0.44 : 0.36)),
        background: FILL,
        ...style,
      }}
    >
      {letters}
    </span>
  );
}
