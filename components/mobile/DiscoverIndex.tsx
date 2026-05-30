import Link from "next/link";
import type { Cross } from "@/components/ui/icons/Cross";

export type DiscoverEntry = {
  label: string;
  href: string;
  blurb: string;
  Icon: typeof Cross;
};

/**
 * Mobile menologion list of the library's destinations. Mirrors the
 * desktop Discover list (glyph + display-serif name + italic blurb +
 * gold hairline per row), tuned for touch: full-width tap rows with
 * `active:` feedback instead of hover-only.
 */
export function DiscoverIndex({ entries }: { entries: DiscoverEntry[] }) {
  return (
    <ul className="divide-y divide-gold/20 border-y border-gold/20">
      {entries.map(({ label, href, blurb, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group flex items-start gap-4 py-4 px-1 active:bg-gold/[0.04] transition-colors"
          >
            <span className="shrink-0 inline-flex items-center justify-center h-8 w-8 text-gold/85 group-active:text-gold transition-colors">
              <Icon size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display-serif text-[19px] text-paper leading-tight group-active:text-gold transition-colors">
                {label}
              </p>
              <p className="mt-1 font-serif italic text-[13.5px] text-paper/65 leading-[1.5]">
                {blurb}
              </p>
            </div>
            <span
              aria-hidden
              className="shrink-0 self-center font-serif text-[17px] text-paper/30 group-active:text-gold transition-colors"
            >
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
