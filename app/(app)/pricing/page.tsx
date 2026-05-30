import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
  title: "Pricing",
  description:
    "The core spiritual treasury of Purify is free, always. An optional subscription layer is on the way for heavier infrastructure; what is free today will still be free then.",
};

export default async function PricingPage() {
  const locale = await getServerLocale();
  if (locale === "de") return <PricingDe />;
  const m = getMessages(locale);
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[720px] w-full text-center">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          {t(m, "pricing.eyebrow")}
        </p>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {t(m, "pricing.h1")}
        </h1>
        <p className="font-sans text-[17px] md:text-[18px] text-paper/75 mt-6 leading-relaxed">
          Every saint&rsquo;s life, every primary writing of the Fathers, the
          Scriptures with the Greek beside them, the daily prayers, and the
          calendar will remain free of charge to anyone who needs them. No
          ads, no tracking, no surprise locks.
        </p>
        <p className="font-sans text-[16px] text-paper/70 mt-6 leading-relaxed">
          A heavier infrastructure layer is on the way, and the licensing is
          being upgraded so that it can be offered honestly. When that
          optional, subscription-funded layer arrives, it will exist solely to
          pay for the work it requires, the servers, the production,
          the rights, and to keep the core forever open. What is free
          today will still be free then.
        </p>
        <p className="font-sans text-[15px] text-paper/60 mt-6 leading-relaxed">
          If the app has helped you and you would like to,{" "}
          <Link
            href="/support"
            className="text-gold hover:text-gold/80 underline underline-offset-4"
          >
            you can support it
          </Link>{" "}
          with a freewill gift. That remains the only way money is involved
          today, and it stays entirely optional.
        </p>
      </div>
    </section>
  );
}

function PricingDe() {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[720px] w-full text-center">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          Preise
        </p>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Der Kern bleibt immer frei.
        </h1>
        <p className="font-sans text-[17px] md:text-[18px] text-paper/75 mt-6 leading-relaxed">
          Jedes Leben eines Heiligen, jede wichtige Schrift der Väter, die
          Schriften mit dem Griechischen daneben, die täglichen Gebete und der
          Kalender bleiben unentgeltlich für jeden, der sie braucht. Keine
          Werbung, keine Verfolgung, keine überraschenden Sperren.
        </p>
        <p className="font-sans text-[16px] text-paper/70 mt-6 leading-relaxed">
          Eine schwerere Infrastrukturschicht ist im Werden, und die
          Lizenzierung wird verbessert, damit sie ehrlich angeboten werden
          kann. Wenn diese freiwillige, durch Abonnement getragene Schicht
          kommt, wird sie ausschließlich dazu da sein, die Arbeit zu bezahlen,
          die sie verlangt, die Server, die Produktion, die Rechte
         , und den Kern für immer offen zu halten. Was heute frei ist,
          wird dann noch frei sein.
        </p>
        <p className="font-sans text-[15px] text-paper/60 mt-6 leading-relaxed">
          Wenn die App dir geholfen hat und du möchtest,{" "}
          <Link
            href="/support"
            className="text-gold hover:text-gold/80 underline underline-offset-4"
          >
            kannst du sie unterstützen
          </Link>{" "}
          mit einer freiwilligen Gabe. Das bleibt heute der einzige Weg, auf
          dem Geld eine Rolle spielt, und es bleibt vollkommen freiwillig.
        </p>
      </div>
    </section>
  );
}
