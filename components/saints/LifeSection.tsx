"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";

export function LifeSection({
  paragraphs,
  pronoun,
}: {
  paragraphs: string[];
  pronoun?: "his" | "her";
}) {
  const { t } = useTranslate();
  const heading = pronoun === "her" ? t("saints.herLife") : t("saints.hisLife");
  return (
    <section className="py-14 border-b border-paper/8">
      <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        {heading}
      </p>
      <div className="max-w-[680px] space-y-5">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="font-serif text-lede text-paper/85 leading-[1.7]"
          >
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
