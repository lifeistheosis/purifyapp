import Link from "next/link";

/**
 * Illuminated initial — the first letter of a saint's name renders as a
 * two-line-tall display-serif drop cap in rubric red, underlined in gold.
 * The remaining letters flow in the parent display-serif weight.
 *
 * Used by FeastPanel for the saint of the day. Skip when there is no
 * named saint (a plain weekday).
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
        className="float-left mr-2 text-[64px] md:text-[88px] leading-[0.78] mt-1 rubric"
        style={{
          textShadow: "0 0 18px rgba(196, 47, 36, 0.18)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.55)",
          paddingBottom: 1,
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
    <h1 className="mt-3 font-display-serif text-[30px] md:text-[42px] leading-[1.06] text-paper">
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
