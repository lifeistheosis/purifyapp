import { T } from "@/components/i18n/T";
import { textDir } from "@/lib/i18n/textDir";
import { byPronoun, type Pronoun } from "@/lib/saints/pronoun";

/**
 * The venerated titles (the Mother of God's: Theotokos, Ever-Virgin, Panagia...), as quiet pills.
 * Each says the language it is written in (`lang`: English, or her life's own language where it
 * has them), under the reader's own heading (build 90 note 4).
 */
export function TitlesSection({ titles, pronoun, lang = "en" }: { titles: string[]; pronoun?: Pronoun; lang?: string }) {
  return (
    <section aria-labelledby="saint-titles">
      <h2 id="saint-titles" className="text-title-sm leading-tight text-paper">
        {byPronoun(pronoun, {
          his: <T k="saints.hisTitles" />,
          her: <T k="saints.herTitles" />,
          their: <T k="saints.theirTitles" />,
        })}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {titles.map((title) => (
          <li key={title} lang={lang} dir={textDir(lang)} className="rounded-pill border border-paper/15 px-3.5 py-1.5 font-sans text-detail text-paper/85">
            {title}
          </li>
        ))}
      </ul>
    </section>
  );
}
