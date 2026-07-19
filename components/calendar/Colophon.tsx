import { OrnamentRule } from "./OrnamentRule";
import { T } from "@/components/i18n/T";

// Deliberate Greek verbatim in every locale (lang="grc" below).
const GREEK_COLOPHON =
  "Δι’ εὐχῶν τῶν ἁγίων πατέρων ἡμῶν, Κύριε Ἰησοῦ Χριστὲ ὁ Θεός, ἐλέησον ἡμᾶς.";

/**
 * The closing colophon, three centered display-serif italic lines with a
 * small gold cross between them. Replaces the bordered footnote section
 * with a treatment that reads as the foot of a printed service-book page.
 * The Greek line stays verbatim in every locale (lang="grc").
 */
export function Colophon({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <OrnamentRule className="mx-auto mb-6 max-w-[300px]" />
      <p className="font-display-serif italic text-lede md:text-title-sm text-paper/85 leading-[1.5]">
        <T k="calendar.colophon.glory" />
      </p>
      <p aria-hidden className="my-3 text-gold/70 text-ui">
        ✦
      </p>
      <p className="font-display-serif italic text-body md:text-body text-paper/65 leading-[1.55]">
        <T k="calendar.colophon.prayers" />
      </p>
      <p
        lang="grc"
        className="mt-3 font-serif italic text-detail md:text-ui text-paper/45 leading-[1.55]"
        style={{ fontFamily: "var(--font-greek), serif" }}
      >
        {GREEK_COLOPHON}
      </p>
    </div>
  );
}
