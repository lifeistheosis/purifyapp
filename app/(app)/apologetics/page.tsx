import Link from "next/link";

import {
  APOLOGETICS_GROUP_ORDER,
  APOLOGETICS_GROUP_LABEL,
  apologeticsByGroup,
} from "@/lib/apologetics/topics";

export const metadata = {
  title: "Apologetics",
  description:
    "A reasoned Orthodox defense of the faith: the existence of God against atheism and deism, and the place of Scripture, Tradition, and the Church against sola scriptura.",
};

export const revalidate = 3600;

export default function ApologeticsHubPage() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Apologetics
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          A reason for the hope that is in you.
        </h1>
        <p className="mt-6 font-serif text-body text-paper/80 leading-[1.7]">
          Where the Topical Index and the Theology studies argue within the
          faith from the Fathers, Apologetics turns outward, to the questions an
          enquirer or an objector brings. The framing is in the Orthodox
          register and is honest about its scope; the verbatim patristic
          florilegia are being assembled and added as they are sourced.
        </p>

        <div className="mt-14 space-y-14">
          {APOLOGETICS_GROUP_ORDER.map((group) => {
            const list = apologeticsByGroup(group);
            if (list.length === 0) return null;
            const label = APOLOGETICS_GROUP_LABEL[group];
            return (
              <section key={group}>
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55">
                  {label.en}
                </p>
                <p className="mt-2 font-serif italic text-detail text-paper/55 leading-[1.6]">
                  {label.subtitle}
                </p>

                <ul className="mt-6 space-y-3">
                  {list.map((tp) => {
                    const inner = (
                      <>
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="font-sans text-lede font-semibold text-paper leading-tight">
                            {tp.title}
                          </p>
                          {tp.planned ? (
                            <p className="shrink-0 font-sans text-caption uppercase tracking-[1.2px] text-paper/40">
                              Planned
                            </p>
                          ) : tp.estimatedMinutes ? (
                            <p className="shrink-0 font-sans text-caption text-paper/40 tabular-nums">
                              ~{tp.estimatedMinutes} min
                            </p>
                          ) : null}
                        </div>
                        {tp.subtitle ? (
                          <p className="mt-1 font-serif italic text-detail text-paper/55 leading-[1.5]">
                            {tp.subtitle}
                          </p>
                        ) : null}
                        <p className="mt-3 font-serif text-ui text-paper/75 leading-[1.65] line-clamp-3">
                          {tp.summary}
                        </p>
                      </>
                    );
                    return (
                      <li key={tp.slug}>
                        {tp.planned ? (
                          <div className="block rounded-lg border border-paper/10 bg-paper/[0.02] p-5 opacity-70">
                            {inner}
                          </div>
                        ) : (
                          <Link
                            href={`/apologetics/${tp.slug}`}
                            className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 transition-all duration-200"
                          >
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-16 font-sans text-detail text-paper/50">
          For the doctrine argued from within, see{" "}
          <Link
            href="/theology"
            className="underline decoration-paper/30 underline-offset-4 hover:text-paper"
          >
            Theology
          </Link>
          .
        </p>
      </article>
    </section>
  );
}
