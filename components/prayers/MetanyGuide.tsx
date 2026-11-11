"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { citeOf, QUOTES, RULES, RULE_ORDER, SOURCES, WORDS } from "@/lib/prayers/metanies";
import { requestQuoteFocus } from "@/lib/reading/quoteFocus";

const quoted = (text: string) => `\u201c${text}\u201d`;

/**
 * Bows and prostrations (1.9): the three rules the guide can put a
 * public-domain quotation under, each in its source's words, and the plain
 * sentence for everything else. Every word is in lib/prayers/metanies.ts and
 * read through the catalogs on the device.
 */
export function MetanyGuide() {
  const { t, locale } = useTranslate();
  return (
    <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="metany-title">
      <div className="mx-auto w-full max-w-[640px]">
        <h1 id="metany-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
          {t(WORDS.title.key)}
        </h1>
        <p className="mt-4 max-w-[60ch] font-sans text-body leading-[1.65] text-paper/80">{t(WORDS.lead.key)}</p>
        <p className="mt-3 max-w-[60ch] font-sans text-ui leading-[1.65] text-paper/75">{t(WORDS.kinds.key)}</p>

        {RULE_ORDER.map((id) => {
          const rule = RULES[id];
          return (
            <section key={id} data-metany-rule={id} className="mt-10 border-t border-paper/10 pt-8" aria-labelledby={`metany-${id}`}>
              <h2 id={`metany-${id}`} className="font-sans text-subtitle font-semibold leading-[1.25] text-paper">
                {t(rule.name.key)}
              </h2>
              {rule.quotes.map((qid, i) => {
                const q = QUOTES[qid];
                const source = SOURCES[q.source];
                const lastFromSource = !rule.quotes.slice(i + 1).some((later) => QUOTES[later].source === q.source);
                return (
                  <figure key={qid} className="mt-5">
                    <blockquote lang="en" dir="ltr" className="font-serif text-body italic leading-[1.7] text-paper/90">
                      {quoted(q.text)}
                    </blockquote>
                    <figcaption lang="en" dir="ltr" className="mt-2 font-sans text-caption leading-[1.5] text-paper/65">
                      {citeOf(q)}
                    </figcaption>
                    {source.href && lastFromSource ? (
                      <Link
                        href={source.href}
                        className="tap-press mt-1 inline-flex min-h-11 items-center gap-1 font-sans text-ui font-semibold text-paper hover:underline hover:underline-offset-4"
                        onClick={() =>
                          requestQuoteFocus(
                            source.href as string,
                            rule.quotes.map((other) => QUOTES[other]).filter((other) => other.source === q.source).map((other) => other.text),
                          )
                        }
                      >
                        {t("start.liturgy.ui.read")}
                        <ChevronRight size={15} className="text-paper/60 rtl:-scale-x-100" />
                      </Link>
                    ) : null}
                  </figure>
                );
              })}
            </section>
          );
        })}

        <p data-metany-ask="" className="mt-10 border-t border-paper/10 pt-8 max-w-[60ch] font-sans text-body leading-[1.65] text-paper/80">
          {t(WORDS.ask.key)}
        </p>
        {locale !== "en" ? <p className="mt-6 font-sans text-caption text-paper/65">{t(WORDS.english.key)}</p> : null}
      </div>
    </section>
  );
}
