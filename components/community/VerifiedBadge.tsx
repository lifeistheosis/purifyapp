"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The blue check beside a verified reader's name.
 *
 * ── The mark ────────────────────────────────────────────────────────────
 *
 * A scalloped disc with a white tick, which is the convention every platform
 * now shares and every reader already understands. The path is drawn here
 * rather than lifted from X or Meta: their exact silhouettes are trademarks,
 * and copied brand marks are a listed App Store rejection reason. This reads
 * the same and belongs to Purify.
 *
 * ── Why the tooltip is desktop-only ─────────────────────────────────────
 *
 * The hover treatment lives behind `@media (hover: hover) and (pointer: fine)`
 * in globals.css. On a touch screen :hover fires on tap and then sticks, with
 * no pointer to move away, so a tooltip built this way opens and never closes.
 * Phones get the badge and the breathing glow; they do not get a label they
 * cannot dismiss.
 *
 * ── Accessibility ───────────────────────────────────────────────────────
 *
 * The badge carries its meaning as text, because a check that only means
 * something visually says nothing to a reader who cannot see it. The SVG is
 * aria-hidden so the label is announced once rather than twice.
 *
 * The wrapper is deliberately NOT a tab stop. It is a role="img", which is not
 * interactive, and making every badge in a feed focusable would put a row of
 * dead targets in the keyboard order. The tooltip only repeats the accessible
 * name, so nobody navigating by keyboard is missing information: they are told
 * the account is verified whether or not the label ever appears.
 */
export function VerifiedBadge({ size = 15 }: { size?: number }) {
  const { t } = useTranslate();
  const label = t("community.verifiedAccount");

  return (
    <span
      className="verified-badge-wrap relative inline-flex shrink-0 items-center align-middle"
      // NOT focusable. role="img" is not interactive, and making it a tab stop
      // puts a dead target in the keyboard order on every post in the feed.
      // Nothing is lost: the tooltip only ever repeats this element's own
      // accessible name, so a keyboard or screen-reader user is already told
      // the account is verified without needing the visual label.
      role="img"
      aria-label={label}
    >
      <svg
        className="verified-badge"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {/*
          The scalloped disc: a circle pushed out at eight points. Drawn as one
          path so the glow's border-radius clips to a round silhouette and the
          shape scales cleanly at 15px, which is the size it actually renders.
        */}
        <path
          fill="#3b82f6"
          d="M12 1.6l2.36 1.64 2.84-.44 1.2 2.62 2.6 1.24-.46 2.84L22.4 12l-1.86 2.46.46 2.84-2.6 1.24-1.2 2.62-2.84-.44L12 22.4l-2.36-1.64-2.84.44-1.2-2.62-2.6-1.24.46-2.84L1.6 12l1.86-2.46-.46-2.84 2.6-1.24 1.2-2.62 2.84.44L12 1.6z"
        />
        <path
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.6 12.3l2.9 2.9 5.9-6.1"
        />
      </svg>

      {/*
        aria-hidden because the wrapper already carries the same words as its
        label. Without that a screen reader announces "Verified Account"
        twice, once for the image and once for the tooltip text.
      */}
      <span
        aria-hidden="true"
        className="verified-tip absolute left-1/2 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-paper/15 bg-night-soft px-2.5 py-1 font-sans text-eyebrow font-medium text-paper shadow-lg"
      >
        {label}
      </span>
    </span>
  );
}
