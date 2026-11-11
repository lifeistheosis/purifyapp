import { T } from "@/components/i18n/T";
import { Cross } from "@/components/ui/icons/Cross";
import { nameCore } from "@/lib/saints/nameForms";
import { byPronoun, PAIRS } from "@/lib/saints/pronoun";
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
 *
 * The petition says "Holy" itself, so the name goes in without its own
 * honorific (nameCore): "Holy Apostle Paul", "Holy Basil the Great", "Holy
 * Prophet Zephaniah". It took the registry name whole until January's walk
 * (1.9) read "Holy Holy Apostle Paul" and "Holy St. Basil the Great" at the
 * foot of every page (lib/saints/__tests__/intercession.test.ts).
 *
 * A woman is prayed to as a woman and two or more saints as more than one, in
 * every language: each catalog has the petition's her, their and pair forms,
 * the adjective and the verb agreeing ("Святая ... моли", "Святии ...
 * молите"); the pair form differs only where the language has a dual
 * (Arabic). Whose the page is comes from the saint's `pronoun` and PAIRS
 * (lib/saints/pronoun.ts).
 */
export function SaintIntercession({ saint }: { saint: Pick<Saint, "slug" | "name" | "featured" | "pronoun"> }) {
  const name = nameCore(saint.name);
  return (
    <div className="mt-16 flex flex-col items-center gap-4 border-t border-paper/8 pt-12 pb-4 text-center">
      <Cross size={20} aria-hidden className="text-paper/40" />
      <p className="max-w-[30ch] font-serif text-title-sm italic leading-snug text-paper/85 md:text-title">
        {saint.featured ? (
          <T k="prayers.rope.lineTheotokos" />
        ) : saint.pronoun === "their" && PAIRS.has(saint.slug) ? (
          <T k="saints.intercessionPetitionPair" replacements={{ name }} />
        ) : (
          byPronoun(saint.pronoun, {
            his: <T k="saints.intercessionPetition" replacements={{ name }} />,
            her: <T k="saints.intercessionPetitionHer" replacements={{ name }} />,
            their: <T k="saints.intercessionPetitionTheir" replacements={{ name }} />,
          })
        )}
      </p>
    </div>
  );
}
