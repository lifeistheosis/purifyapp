import { Cross } from "@/components/ui/icons/Cross";
import type { Saint } from "@/lib/saints/saints";

/**
 * A quiet closing petition at the foot of a saint's page — the intercession
 * with which a service of commemoration ends, bookending the life and writings
 * above. This is a universal liturgical formula (freely-authored interface
 * copy), not hosted patristic text, so it carries no translation/PD concern.
 *
 * The Theotokos takes her proper petition ("save us"); every other saint takes
 * the common intercessory form ("pray to God for us").
 */
export function SaintIntercession({ saint }: { saint: Saint }) {
  const petition = saint.featured
    ? "Most Holy Theotokos, save us."
    : `Holy ${saint.name}, pray to God for us.`;

  return (
    <div className="mt-20 flex flex-col items-center gap-5 border-t border-paper/8 pt-14 pb-4 text-center">
      <Cross size={22} aria-hidden className="text-gold/70" />
      <p className="max-w-[30ch] font-display-serif text-title-sm md:text-title text-paper/85 leading-snug">
        {petition}
      </p>
    </div>
  );
}
