import { SAINTS } from "@/lib/saints/saints";
import { SaintsBrowser } from "@/components/saints/SaintsBrowser";

export const metadata = {
  title: "Saints - Purify",
  description:
    "Lives and writings of the Eastern Orthodox saints.",
};

export default function SaintsPage() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          Saints
        </p>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
          Lives and writings of the saints
        </h1>
        <p className="mt-5 max-w-[640px] font-sans text-[17px] text-paper/75">
          The teachers, ascetics, and wonderworkers of the Eastern Orthodox
          Church. Each profile gathers a brief life, a list of writings, and
          the works themselves.
        </p>

        <SaintsBrowser saints={SAINTS} />
      </div>
    </section>
  );
}
