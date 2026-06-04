import Link from "next/link";

/**
 * Illuminated initial, the first letter of a saint's name renders as a
 * slightly-larger display-serif drop cap, set in gold with a fine
 * underline. The remaining letters flow in the parent display-serif
 * weight. Restrained so it reads as a typographic accent, not a
 * decorative flourish.
 *
 * Used by FeastPanel for the saint of the day. Skip when there is no
 * named Latin-letter saint (a plain weekday).
 */
export function DropCap({
 name,
 href,
}: {
 name: string;
 href?: string;
}) {
 const first = name.charAt(0);
 const rest = name.slice(1);
 const inner = (
 <>
 <span
 aria-hidden
 className="text-gold mr-[2px]"
 style={{
 fontSize: "1.25em",
 lineHeight: 0.95,
 textShadow: "0 0 14px rgba(183, 176, 163, 0.18)",
 }}
 >
 {first}
 </span>
 <span aria-hidden="false" className="sr-only">
 {first}
 </span>
 {rest}
 </>
 );
 return (
 <h1 className="mt-3 font-display-serif text-heading md:text-display-sm leading-[1.08] text-paper">
 {href ? (
 <Link href={href} className="hover:text-gold transition-colors">
 {inner}
 </Link>
 ) : (
 inner
 )}
 </h1>
 );
}
