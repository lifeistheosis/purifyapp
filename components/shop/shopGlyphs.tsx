import type { ReactNode, SVGProps } from "react";

/**
 * The few drawings the shop's own pages need that the family
 * (components/ui/icons) did not have yet, on its 24-grid with its 1.6 stroke
 * and round joins (r3-19: the order's three tiles, the parcel's tracking
 * link, the composer's send, the email a request was answered in). Each
 * inherits `currentColor` and is decoration beside its own words.
 */
type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

function Glyph({ size = 20, strokeWidth = 1.6, children, ...props }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** A question in a ring: Something wrong. */
export function HelpGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6" />
      <path d="M12 17.1v.1" />
    </Glyph>
  );
}

/** An arrow turning back: Returns. */
export function ReturnsGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M9 7H15a4.5 4.5 0 0 1 0 9H7" />
      <path d="M11.6 4 8.6 7l3 3" />
    </Glyph>
  );
}

/** Out to another site: the carrier's tracking. */
export function ExternalGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M17 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7h5" />
    </Glyph>
  );
}

/** Up and away: send. */
export function SendGlyph(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2} {...props}>
      <path d="M12 19V5.5" />
      <path d="M6.5 11 12 5.5 17.5 11" />
    </Glyph>
  );
}

/** A letter: the answer went to your email. */
export function MailGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="m4.2 7 7.8 6 7.8-6" />
    </Glyph>
  );
}
