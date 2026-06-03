import Link from "next/link";
import { HERESIES } from "@/lib/heresies/heresies";

export const metadata = {
  title: "The Heresies",
  description:
    "The chief errors condemned by the seven Ecumenical Councils, each defined in plain English, cross-linked to the council that condemned it, the orthodox teaching it denied, and the Fathers who refuted it.",
};

export default function HeresiesPage() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          The errors the Church condemned
        </p>
        <h1 className="font-sans text-display-sm md:text-display-lg font-bold text-paper tracking-[-0.025em] leading-[1.05]">
          The Heresies
        </h1>
        <p className="mt-5 max-w-[720px] font-serif text-lede md:text-lede text-paper/80 leading-[1.65]">
          Every Ecumenical Council is defined as much by the error it
          condemned as by the doctrine it confessed. Here are the seven chief
          heresies, one for each of the seven councils &mdash; each defined in
          plain English, linked to the council that condemned it and the
          orthodox teaching it denied, and answered, where the corpus holds
          them, in the Fathers&rsquo; own words.
        </p>

        <p className="mt-3 max-w-[720px] font-sans text-detail text-paper/55 leading-[1.6]">
          Posture: these profiles describe the errors honestly so that the
          Faith may be understood. No heretical text is hosted; every quotation
          is a deep-link into a Father&rsquo;s verbatim refutation. See{" "}
          <Link
            href="/councils"
            className="underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            the Councils
          </Link>{" "}
          for the doctrine each error called forth.
        </p>

        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {HERESIES.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/heresies/${h.slug}`}
                className="group block h-full rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-6 py-6"
              >
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/75 font-semibold">
                  {h.era}
                </p>
                <h2 className="mt-2 font-display-serif text-title-sm md:text-title-sm text-paper leading-tight">
                  {h.name}
                </h2>
                <p className="mt-1 font-sans text-caption text-paper/55">
                  {h.heresiarch}
                </p>
                <p className="mt-3 font-serif text-ui text-paper/80 leading-[1.6]">
                  {h.shortBio}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
