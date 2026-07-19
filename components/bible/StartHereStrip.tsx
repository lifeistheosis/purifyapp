"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type Pick = {
  name: string;
  subtitle: string;
  href: string;
};

const PICKS: Pick[] = [
  { name: "John", subtitle: "the spiritual gospel", href: "/bible/john/1" },
  { name: "Psalms", subtitle: "the prayer book of the Church", href: "/bible/psalms/1" },
  { name: "Genesis", subtitle: "in the beginning", href: "/bible/genesis/1" },
  { name: "Matthew", subtitle: "the kingdom of heaven", href: "/bible/matthew/1" },
  { name: "Romans", subtitle: "the gospel of grace", href: "/bible/romans/1" },
  { name: "1 Cor 13", subtitle: "love is patient", href: "/bible/1-corinthians/13" },
];

/**
 * "Begin where you stand": curated first doors into Scripture, shown above
 * the canon on the desktop Bible index (the page is md+ only; the mobile
 * shell has its own entries). House card language: serif names, quiet
 * night-soft surfaces, one gold hover.
 */
export function StartHereStrip() {
  const { t } = useTranslate();
  return (
    <section className="bg-night px-5 pb-12 pt-2 md:px-8 md:pb-16">
      <div className="mx-auto w-full max-w-[1080px]">
        <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
          {t("bible.beginWhereYouStand")}
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-6">
          {PICKS.map((p) => (
            <Link
              key={p.name}
              href={p.href}
              className="group rounded-lg border border-paper/10 bg-night-soft/40 px-4 py-3.5 transition-colors hover:border-gold/45 hover:bg-gold/[0.05]"
            >
              <span className="block font-display-serif text-lede text-paper leading-tight transition-colors group-hover:text-gold">
                {p.name}
              </span>
              <span className="mt-1 block font-serif italic text-caption text-paper/60 leading-tight">
                {p.subtitle}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
