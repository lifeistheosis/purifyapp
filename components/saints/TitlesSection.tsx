import { T } from "@/components/i18n/T";

/** The venerated titles (the Mother of God's: Theotokos, Ever-Virgin, Panagia...), as quiet pills. */
export function TitlesSection({ titles, pronoun }: { titles: string[]; pronoun?: "his" | "her" }) {
  return (
    <section aria-labelledby="saint-titles">
      <h2 id="saint-titles" className="text-title-sm leading-tight text-paper">
        <T k={pronoun === "her" ? "saints.herTitles" : "saints.hisTitles"} />
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {titles.map((title) => (
          <li key={title} className="rounded-pill border border-paper/15 px-3.5 py-1.5 font-sans text-detail text-paper/85">
            {title}
          </li>
        ))}
      </ul>
    </section>
  );
}
