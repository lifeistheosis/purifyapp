"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";

export function TitlesSection({
  titles,
  pronoun,
}: {
  titles: string[];
  pronoun?: "his" | "her";
}) {
  const { t } = useTranslate();
  const heading = pronoun === "her" ? t("saints.herTitles") : t("saints.hisTitles");
  return (
    <section className="py-12 border-b border-paper/8">
      <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
        {heading}
      </p>
      <ul className="flex flex-wrap gap-2.5">
        {titles.map((tt) => (
          <li
            key={tt}
            className="rounded-pill border border-gold/30 bg-gold/[0.06] px-4 py-2 font-sans text-[14px] text-paper/85"
          >
            {tt}
          </li>
        ))}
      </ul>
    </section>
  );
}
