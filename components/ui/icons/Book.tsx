import type { SVGProps } from "react";

/**
 * Minimal open book. Used as the "Bible" tab icon in the mobile tab bar.
 * Inherits `currentColor`.
 */
export function Book({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Open book on the family's 1.6 stroke (was a heavier 2.2 outlier).
          A centre spine and two leaves curling up, with a hint of text on
          each page so it reads as a book of study, not a bird. */}
      <path d="M12 6v13.2" />
      <path d="M12 6C10.2 4.9 7.7 4.5 4.4 4.7v12.9c3.3-.2 5.8.2 7.6 1.3" />
      <path d="M12 6c1.8-1.1 4.3-1.5 7.6-1.3v12.9c-3.3-.2-5.8.2-7.6 1.3" />
      <line x1="6.4" y1="8.3" x2="9.6" y2="8.6" strokeOpacity="0.55" />
      <line x1="14.4" y1="8.6" x2="17.6" y2="8.3" strokeOpacity="0.55" />
    </svg>
  );
}
