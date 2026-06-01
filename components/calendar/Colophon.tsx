import { OrnamentRule } from "./OrnamentRule";

/**
 * The closing colophon, three centered display-serif italic lines with a
 * small gold cross between them. Replaces the bordered footnote section
 * with a treatment that reads as the foot of a printed service-book page.
 */
export function Colophon({
 className = "",
 locale = "en",
}: {
 className?: string;
 locale?: string;
}) {
 const isDe = locale === "de";
 return (
 <div className={`text-center ${className}`}>
 <OrnamentRule className="mx-auto mb-6 max-w-[300px]" />
 <p className="font-display-serif italic text-lede md:text-title-sm text-paper/85 leading-[1.5]">
 {isDe ? "Ehre sei Gott für alles." : "Glory to God for all things."}
 </p>
 <p aria-hidden className="my-3 text-gold/70 text-ui">
 ✦
 </p>
 <p className="font-display-serif italic text-body md:text-body text-paper/65 leading-[1.55]">
 {isDe
 ? "Auf die Gebete unserer heiligen Väter, Herr Jesus Christus, unser Gott, erbarme Dich unser."
 : "Through the prayers of our holy fathers, Lord Jesus Christ our God, have mercy on us."}
 </p>
 <p
 lang="grc"
 className="mt-3 font-serif italic text-detail md:text-ui text-paper/45 leading-[1.55]"
 style={{ fontFamily: "var(--font-greek), serif" }}
 >
 Δι&rsquo; εὐχῶν τῶν ἁγίων πατέρων ἡμῶν, Κύριε Ἰησοῦ Χριστὲ ὁ Θεός,
 ἐλέησον ἡμᾶς.
 </p>
 </div>
 );
}
