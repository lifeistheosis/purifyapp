import { T } from "@/components/i18n/T";
import { Cross } from "@/components/ui/icons/Cross";
import type { Saint } from "@/lib/saints/saints";

/**
 * A quiet closing petition at the foot of a saint's page: the intercession
 * with which a service of commemoration ends, bookending the life and writings
 * above. This is a universal liturgical formula (freely-authored interface
 * copy), not hosted patristic text, so it carries no translation/PD concern.
 *
 * The Theotokos takes her proper petition ("save us"); every other saint takes
 * the common intercessory form ("pray to God for us"). Set in Lora's italic,
 * the page's own serif (1.7: it was the display face the owner retired).
 */
export function SaintIntercession({ saint }: { saint: Pick<Saint, "name" | "featured"> }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 border-t border-paper/8 pt-12 pb-4 text-center">
      <Cross size={20} aria-hidden className="text-paper/40" />
      <p className="max-w-[30ch] font-serif text-title-sm italic leading-snug text-paper/85 md:text-title">
        {saint.featured ? (
          <T k="prayers.rope.lineTheotokos" />
        ) : (
          <T k="saints.intercessionPetition" replacements={{ name: saint.name }} />
        )}
      </p>
    </div>
  );
}
