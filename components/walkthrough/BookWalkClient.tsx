"use client";

// A walked book's front page: the Living Tapestry, the totals it is
// "coupled with" (the owner's specification, 3.3), the streak he asked for in
// full, where to pick up, the movements with their chapters, and the
// reader's own ledger of sentences, kept on this device.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Lampada } from "@/components/ui/icons/Lampada";
import { cn } from "@/lib/cn";
import { todayKey } from "@/lib/rhythm/dayKey";
import { isDone, nextChapter, totals, walkStreak } from "@/lib/walkthroughs/progress";
import { useWalkProgress } from "@/lib/walkthroughs/useWalkProgress";
import { Tapestry } from "./Tapestry";

export type BookMeta = {
  book: string;
  bookName: string;
  title: string;
  intro: string;
  total: number;
  /** Chapters written so far, with their titles. */
  chapters: { n: number; title: string }[];
  movements: { id: string; title: string; from: number; to: number }[];
};

const TICK = "✓";
const SEP = " · ";

function Stat({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="lm-card rounded-2xl p-3.5 ring-1 ring-inset ring-paper/10" style={{ background: "linear-gradient(160deg, #202024 0%, #18181b 100%)" }}>
      <p className="flex items-center gap-1.5 font-heading text-title-sm font-bold leading-none text-paper">
        {icon}
        {value}
      </p>
      <p className="mt-1.5 font-sans text-caption leading-tight text-paper/55">{label}</p>
    </div>
  );
}

export function BookWalkClient({ meta }: { meta: BookMeta }) {
  const { t, tn, locale } = useTranslate();
  const p = useWalkProgress(meta.book);
  const sum = totals(p);
  const streak = walkStreak(p, todayKey());
  const written = meta.chapters.length;
  const next = nextChapter(p, meta.total);
  const resume = next != null && next <= written ? next : null;
  const done = new Set(Object.keys(p.done).map(Number));
  const titleOf = new Map(meta.chapters.map((c) => [c.n, c.title]));
  const ledger = Object.entries(p.ledger)
    .map(([n, l]) => ({ n: Number(n), ...l }))
    .sort((a, b) => a.n - b.n);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6 md:pt-10">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-premium-ink">{t("walk.eyebrow")}</p>
      <h1 className="mt-2 text-title font-bold leading-tight text-paper">{meta.title}</h1>
      <p className="mt-3 max-w-[60ch] font-sans text-ui leading-[1.6] text-paper/70">{meta.intro}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {resume ? (
          <Link
            href={`/walkthroughs/${meta.book}/${resume}`}
            className="inline-flex min-h-11 items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
          >
            {sum.chapters === 0 ? t("walk.begin") : t("walk.continueN", { n: resume })}
          </Link>
        ) : next == null ? (
          <p className="font-serif text-ui italic text-premium-ink">{t("walk.walkedInFull")}</p>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <div
          className="dark-island walk-tapestry-frame overflow-hidden rounded-[26px] p-3 ring-1 ring-inset ring-paper/10 md:sticky md:top-24"
          style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(201,162,90,0.08) 0%, transparent 60%), #141416" }}
        >
          <Tapestry book={meta.book} total={meta.total} written={written} done={done} next={resume} />
        </div>
        <div>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat value={`${sum.chapters}/${meta.total}`} label={t("walk.statChapters")} />
            <Stat value={String(sum.cards)} label={tn("walk.statCards", sum.cards)} />
            <Stat value={String(sum.reflections)} label={tn("walk.statReflections", sum.reflections)} />
            <Stat value={String(streak)} label={tn("walk.statStreak", streak)} icon={<Lampada size={16} />} />
          </div>

          <div className="mt-10 space-y-6 md:mt-8">
            {meta.movements.map((m) => (
              <section key={m.id} aria-labelledby={`mv-${m.id}`}>
                <h2 id={`mv-${m.id}`} className="font-heading text-ui font-bold text-paper">
                  {m.title}
                </h2>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {Array.from({ length: m.to - m.from + 1 }, (_, i) => m.from + i).map((n) => {
                    const open = n <= written;
                    const walked = isDone(p, n);
                    const chip = cn(
                      "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-pill border px-3 font-sans text-caption",
                      walked
                        ? "border-premium/50 bg-premium/12 font-semibold text-premium-ink"
                        : open
                          ? "border-paper/20 text-paper/80 hover:border-paper/40"
                          : "border-paper/10 text-paper/30",
                    );
                    return (
                      <li key={n}>
                        {open ? (
                          <Link href={`/walkthroughs/${meta.book}/${n}`} className={chip} title={titleOf.get(n)}>
                            {n}
                            {walked ? <span aria-hidden>{TICK}</span> : null}
                          </Link>
                        ) : (
                          <span className={chip} aria-disabled>
                            {n}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      {ledger.length > 0 ? (
        <section className="mt-12" aria-labelledby="walk-ledger-list">
          <h2 id="walk-ledger-list" className="text-title-sm font-bold text-paper">
            {t("walk.yourLedger")}
          </h2>
          <p className="mt-1 font-sans text-caption text-paper/50">{t("walk.ledgerPrivate")}</p>
          <ol className="mt-4 space-y-3">
            {ledger.map((l) => (
              <li key={l.n} className="rounded-2xl bg-paper/[0.03] p-4 ring-1 ring-inset ring-paper/10">
                <p className="font-sans text-caption text-paper/50">
                  {[
                    t("walk.chapterN", { n: l.n }),
                    titleOf.get(l.n),
                    new Date(l.at).toLocaleDateString(locale, { month: "short", day: "numeric" }),
                  ]
                    .filter(Boolean)
                    .join(SEP)}
                </p>
                <p className="mt-1.5 font-serif text-ui italic leading-[1.55] text-paper/90">{l.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
