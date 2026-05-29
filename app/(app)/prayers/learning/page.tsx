import Link from "next/link";
import { lessonsFor } from "@/lib/prayers/learning";
import { Badge } from "@/components/ui/Badge";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Learn to pray",
  description:
    "An Orthodox beginner's path to prayer: the Sign of the Cross, the Jesus Prayer, the Trisagion, and a simple morning and evening rule.",
};

export default async function LearnToPrayPage() {
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const lessons = lessonsFor(locale);
  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-20">
      <div className="mx-auto max-w-[920px] w-full">
        <div className="flex items-center gap-3 mb-4">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60">
            {isDe ? "Gebet" : "Prayer"}
          </p>
          <Badge variant="free">{isDe ? "Frei" : "Free"}</Badge>
        </div>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {isDe ? "Beten lernen" : "Learn to pray"}
        </h1>
        <p className="mt-5 max-w-[640px] font-sans text-[16px] text-paper/75">
          {isDe
            ? "Ein orthodoxer Einsteiger-Weg. Jede Lektion ist kurz, mit ein oder zwei Gebeten, die man auswendig lernt. Geh in der Reihenfolge — oder spring zu dem, was du brauchst. Die meisten dieser Gebete haben Christen seit über tausend Jahren getragen."
            : "An Orthodox beginner’s path. Each lesson is short, with one or two prayers to learn by heart. Go in order, or jump to what you need. Most of these have carried Christians for over a thousand years."}
        </p>

        <ol className="mt-12 space-y-3">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/prayers/learning/${l.id}`}
                className="block rounded-lg border border-paper/10 bg-paper/[0.03] p-5 hover:bg-paper/[0.06] hover:border-paper/25 transition-colors"
              >
                <div className="flex items-start gap-5">
                  <span className="font-serif text-[28px] text-paper/45 leading-none shrink-0 w-8 text-right">
                    {l.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-sans text-[18px] font-semibold text-paper">
                      {l.title}
                    </h2>
                    <p className="mt-1 font-sans text-[14px] text-paper/65 leading-[1.55]">
                      {l.summary}
                    </p>
                    <p className="mt-2 font-sans text-[11px] uppercase tracking-[1.2px] text-paper/35">
                      {l.estimatedMinutes} {isDe ? "Min." : "min"}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="self-center text-paper/35 text-[16px]"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>

        <p className="mt-10 font-sans text-[12px] text-paper/40 leading-[1.6] max-w-[640px]">
          {isDe
            ? "Weitere Lektionen kommen: das Gebetsseil, deine Ikonenecke, Gebete vor den Mahlzeiten, das Beten mit den Heiligen und die Zeiten des Kirchenjahres."
            : "More lessons coming: the Prayer Rope, your icon corner, prayers before meals, praying with the saints, and the seasons of the Church year."}
        </p>
      </div>
    </section>
  );
}
