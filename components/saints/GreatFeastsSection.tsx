"use client";

import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function GreatFeastsSection({
  feasts,
  pronoun,
}: {
  feasts: NonNullable<Saint["greatFeasts"]>;
  pronoun?: "his" | "her";
}) {
  const { t } = useTranslate();
  const heading =
    pronoun === "her" ? t("saints.herGreatFeasts") : t("saints.hisGreatFeasts");
  return (
    <section className="py-12 border-b border-paper/8">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            {t("saints.theChurchYear")}
          </p>
          <h2 className="font-sans text-title md:text-display-sm font-bold text-paper tracking-[-0.02em]">
            {heading}
          </h2>
        </div>
        <Link
          href="/prayers"
          className="font-sans text-ui font-medium text-gold hover:text-gold/80 transition-colors"
        >
          {t("saints.prayAkathist")} →
        </Link>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {feasts.map((f) => {
          const inner = (
            <>
              <span className="font-serif text-lede text-paper leading-tight">
                {f.name}
              </span>
              <span className="shrink-0 font-sans text-caption font-semibold uppercase tracking-[1.2px] text-gold/85">
                {f.date}
              </span>
            </>
          );
          const cls =
            "flex items-center justify-between gap-4 rounded-lg border border-paper/10 bg-night p-5";
          return (
            <li key={f.name}>
              {f.href ? (
                <Link
                  href={f.href}
                  className={cls + " hover:border-gold/40 transition-all duration-200"}
                >
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
