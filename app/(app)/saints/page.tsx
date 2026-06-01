import { SAINTS } from "@/lib/saints/saints";
import { SaintsBrowser } from "@/components/saints/SaintsBrowser";
import { SaintSearch } from "@/components/saints/SaintSearch";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
  title: "Saints",
  description:
    "Lives and writings of the Eastern Orthodox saints.",
};

export default async function SaintsPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          {t(m, "saints.eyebrow")}
        </p>
        <h1 className="font-sans text-display-sm md:text-display-lg font-bold text-paper tracking-[-0.025em] leading-[1.05]">
          {t(m, "saints.h1")}
        </h1>
        <p className="mt-5 max-w-[640px] font-sans text-body text-paper/75">
          The teachers, ascetics, and wonderworkers of the Eastern Orthodox
          Church. Each profile gathers a brief life, a list of writings, and
          the works themselves.
        </p>

        <SaintSearch className="mt-8 max-w-[640px]" />

        <SaintsBrowser saints={SAINTS} />
      </div>
    </section>
  );
}
