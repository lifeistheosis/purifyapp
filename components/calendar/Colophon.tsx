import { OrnamentRule } from "./OrnamentRule";

/**
 * The closing colophon — three centered display-serif italic lines with a
 * small gold cross between them. Replaces the bordered footnote section
 * with a treatment that reads as the foot of a printed service-book page.
 */
export function Colophon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <OrnamentRule className="mx-auto mb-6 max-w-[300px]" />
      <p className="font-display-serif italic text-[20px] md:text-[22px] text-paper/85 leading-[1.5]">
        Glory to God for all things.
      </p>
      <p aria-hidden className="my-3 text-gold/70 text-[14px]">
        ✦
      </p>
      <p className="font-display-serif italic text-[16px] md:text-[17px] text-paper/65 leading-[1.55]">
        Through the prayers of our holy fathers, Lord Jesus Christ our God,
        have mercy on us.
      </p>
      <p
        lang="grc"
        className="mt-3 font-serif italic text-[13px] md:text-[14px] text-paper/45 leading-[1.55]"
        style={{ fontFamily: "var(--font-greek), serif" }}
      >
        Δι&rsquo; εὐχῶν τῶν ἁγίων πατέρων ἡμῶν, Κύριε Ἰησοῦ Χριστὲ ὁ Θεός,
        ἐλέησον ἡμᾶς.
      </p>
    </div>
  );
}
