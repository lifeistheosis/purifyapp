"use client";

// The walkthroughs, one card per book, each showing how far the reader has
// walked it and where to pick up.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { nextChapter, totals } from "@/lib/walkthroughs/progress";
import { useWalkProgress } from "@/lib/walkthroughs/useWalkProgress";
import { WalkArt } from "./art";

type Book = { book: string; title: string; intro: string; total: number };

function BookCard({ b }: { b: Book }) {
  const { t } = useTranslate();
  const p = useWalkProgress(b.book);
  const sum = totals(p);
  const next = nextChapter(p, b.total);
  return (
    <Link
      href={`/walkthroughs/${b.book}`}
      className="lm-card group block overflow-hidden rounded-[26px] ring-1 ring-inset ring-paper/10 transition-transform duration-300 hover:-translate-y-0.5"
      style={CARD_BG}
    >
      <div className="dark-island text-paper/60" style={{ background: "#141416" }}>
        <WalkArt id="uz" className="walk-art block aspect-[16/7] w-full" />
      </div>
      <div className="p-5">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-premium-ink">
          {sum.chapters > 0 ? t("walk.progressOf", { done: sum.chapters, total: b.total }) : t("walk.free")}
        </p>
        <h2 className="mt-1.5 text-title-sm font-bold leading-tight text-paper">{b.title}</h2>
        <p className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">{b.intro}</p>
        <p className="mt-4 inline-flex min-h-11 items-center rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night">
          {sum.chapters === 0 ? t("walk.begin") : next ? t("walk.continueN", { n: next }) : t("walk.walkedInFull")}
        </p>
      </div>
    </Link>
  );
}

export function WalkthroughsHub({ books }: { books: Book[] }) {
  const { t } = useTranslate();
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6 md:pt-10">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-premium-ink">{t("walk.eyebrow")}</p>
      <h1 className="mt-2 text-title font-bold leading-tight text-paper">{t("walk.hubTitle")}</h1>
      <p className="mt-3 max-w-[60ch] font-sans text-ui leading-[1.6] text-paper/70">{t("walk.hubIntro")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {books.map((b) => (
          <BookCard key={b.book} b={b} />
        ))}
      </div>
    </div>
  );
}
