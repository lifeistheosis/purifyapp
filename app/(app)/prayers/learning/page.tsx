import Link from "next/link";
import { lessonsFor } from "@/lib/prayers/learning";
import { getServerLocale } from "@/lib/i18n/server";
import { T } from "@/components/i18n/T";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerNote,
} from "@/components/prayers/PrayerBook";

export const metadata = {
  title: "Learn to pray",
  description:
    "An Orthodox beginner's path to prayer: the Sign of the Cross, the Jesus Prayer, the Trisagion, and a simple morning and evening rule.",
};

export default async function LearnToPrayPage() {
  const locale = await getServerLocale();
  const lessons = lessonsFor(locale);
  return (
    <PrayerPage width="reading">
      <PrayerMasthead
        eyebrow={<T k="prayers.learningEyebrow" />}
        title={<T k="ui.learnToPray" />}
        intro={
          <p>
            <T k="prayers.learningIntro" />
          </p>
        }
      />

      <ol className="border-t border-paper/10">
        {lessons.map((l) => (
          <li key={l.id} className="border-b border-paper/10">
            <Link
              href={`/prayers/learning/${l.id}`}
              className="group flex items-baseline gap-5 py-5 md:py-6"
            >
              <span className="w-6 shrink-0 text-right font-serif text-title-sm text-paper/30 leading-none tabular-nums">
                {l.order}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-title-sm text-paper/90 leading-snug transition-colors group-hover:text-paper">
                  {l.title}
                </h2>
                <p className="mt-1.5 font-sans text-detail text-paper/50 leading-[1.6]">
                  {l.summary}
                </p>
              </div>
              <span className="shrink-0 font-sans text-caption text-paper/35 tabular-nums">
                <T
                  k="today.minRead"
                  replacements={{ count: l.estimatedMinutes }}
                />
              </span>
              <span
                aria-hidden
                className="shrink-0 self-center font-serif text-lede text-paper/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gold/70"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <PrayerNote>
        <T k="prayers.learningMoreComing" />
      </PrayerNote>
    </PrayerPage>
  );
}
