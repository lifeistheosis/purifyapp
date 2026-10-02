"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { clergyLabelKey, type ClergyMark } from "@/lib/profile/clergy";

/**
 * The verified clergy seal beside a name: the scalloped disc every reader
 * already reads as "verified", in a deep wine red, carrying a three-bar
 * Orthodox cross instead of a tick, so it says WHO the person is to the
 * Church and not only that the account is real.
 *
 * Granted by hand by the team (app/api/admin/clergy), never by the reader,
 * and drawn from a rank word the feed carries (author_clergy), never an id.
 *
 * The colours are fixed rather than palette tokens: wine and pale gold read
 * on the dark ground and on Parchment alike, and a seal that changed colour
 * with the reading mode would read as two different seals.
 *
 * Same contract as the verified tick and the supporter mark: role="img"
 * with its meaning as the label, the SVG hidden so it is spoken once, not a
 * tab stop, and a tooltip on fine pointers only.
 */
export function ClergySeal({ mark, size = 15 }: { mark: ClergyMark | null | undefined; size?: number }) {
  const { t } = useTranslate();
  if (!mark) return null;
  const label = t(clergyLabelKey(mark));
  return (
    <span className="supporter-mark-wrap relative inline-flex shrink-0 items-center align-middle" role="img" aria-label={label}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="#8e1b2b"
          d="M12 1.6l2.36 1.64 2.84-.44 1.2 2.62 2.6 1.24-.46 2.84L22.4 12l-1.86 2.46.46 2.84-2.6 1.24-1.2 2.62-2.84-.44L12 22.4l-2.36-1.64-2.84.44-1.2-2.62-2.6-1.24.46-2.84L1.6 12l1.86-2.46-.46-2.84 2.6-1.24 1.2-2.62 2.84.44L12 1.6z"
        />
        <g fill="none" stroke="#f6e7b4" strokeWidth="1.7" strokeLinecap="round">
          <line x1="12" y1="5.6" x2="12" y2="18.4" />
          <line x1="9.9" y1="8" x2="14.1" y2="8" />
          <line x1="8.2" y1="10.4" x2="15.8" y2="10.4" />
          <line x1="9.6" y1="14.4" x2="14.4" y2="15.8" />
        </g>
      </svg>
      <span
        aria-hidden="true"
        className="supporter-tip absolute left-1/2 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-paper/15 bg-night-soft px-2.5 py-1 font-sans text-eyebrow font-medium text-paper shadow-lg"
      >
        {label}
      </span>
    </span>
  );
}
