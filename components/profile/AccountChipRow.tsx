import Link from "next/link";
import { Cross } from "@/components/ui/icons/Cross";
import { Halo } from "@/components/ui/icons/Halo";
import { Compass } from "@/components/ui/icons/Compass";

/**
 * Mobile-priority chip row on the "You" surface, mirrors the
 * Saved / Prayer / Giving pattern from the YouVersion profile tab.
 *
 *  - Saved → bookmarks page.
 *  - Saints → the saints index, the "lives" they're following.
 *  - Discover → the wider library, for jumping out of the profile view.
 *
 * A fourth chip, "Prayer", pointed at /prayers/today. That page is the
 * web's Today surface and is no longer reached from inside the app, where
 * the Today tab is one tap away in the bar below this row.
 *
 * Server component, all links are static.
 */
const CHIPS: { label: string; href: string; Icon: typeof Cross; tint: string }[] = [
  { label: "Saved", href: "/saved", Icon: Cross, tint: "text-gold" },
  { label: "Saints", href: "/saints", Icon: Halo, tint: "text-gold-pale" },
  { label: "Discover", href: "/discover", Icon: Compass, tint: "text-sage-soft" },
];

export function AccountChipRow() {
  return (
    <ul className="md:hidden grid grid-cols-3 gap-2 mb-6">
      {CHIPS.map(({ label, href, Icon, tint }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex flex-col items-center justify-center gap-1.5 h-[68px] rounded-2xl border border-paper/12 bg-paper/[0.04] hover:bg-paper/[0.08] hover:border-paper/25 transition-colors"
          >
            <span className={tint}>
              <Icon size={20} />
            </span>
            <span className="font-sans text-eyebrow text-paper/85">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
