import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
  title: "Pricing",
  description:
    "The core spiritual treasury of Purify is free, always. An optional subscription layer is on the way for heavier infrastructure; what is free today will still be free then.",
};

type PricingCopy = {
  eyebrow: string;
  h1: string;
  lede: string;
  freeTitle: string;
  freeItems: string[];
  freeFoot: string;
  futureTitle: string;
  future: string;
  supportKicker: string;
  supportLine: string;
  supportCta: string;
  supportFoot: string;
};

const EN: Omit<PricingCopy, "eyebrow" | "h1"> = {
  lede: "The whole spiritual treasury of Purify is free, and it stays free. There is no tier to unlock, no plan to sell you, no lock to find later.",
  freeTitle: "Always free",
  freeItems: [
    "Every saint’s life, and the primary writings of the Fathers",
    "The Scriptures, with the Greek beside them",
    "The daily prayers, the hours, and the akathists",
    "The whole Church calendar, its fasts and its feasts",
  ],
  freeFoot: "No ads. No tracking. No surprise locks. For anyone who needs it.",
  futureTitle: "Purify Plus, when it arrives",
  future:
    "An optional layer called Purify Plus is planned for after the mobile launch. It will exist only to pay for the work it requires (the servers, the production, the rights) and will add enhanced tools: curated reading collections, custom florilegia, ambient soundscapes, and the future audio library. The core stays forever open; what is free today will still be free then. And a promise already made stays made: pre-launch supporters keep lifetime cross-device sync, no subscription required. That promise covers sync itself; the wider Plus tools belong to the subscription when it arrives.",
  supportKicker: "Purify is kept by those it helps.",
  supportLine:
    "If the app has carried you, you can carry it a little in return. A freewill gift is the only way money is involved today.",
  supportCta: "Light a lamp",
  supportFoot: "Entirely optional. Give once, or not at all.",
};

const DE: PricingCopy = {
  eyebrow: "Preise",
  h1: "Der Kern bleibt immer frei.",
  lede: "Der ganze geistliche Schatz von Purify ist frei und bleibt frei. Es gibt keine Stufe zum Freischalten, keinen Tarif, den wir dir verkaufen, keine Sperre, die du später findest.",
  freeTitle: "Immer frei",
  freeItems: [
    "Jedes Leben eines Heiligen und die wichtigsten Schriften der Väter",
    "Die Schriften, mit dem Griechischen daneben",
    "Die täglichen Gebete, die Horen und die Akathiste",
    "Der ganze Kirchenkalender, seine Fasten und seine Feste",
  ],
  freeFoot:
    "Keine Werbung. Keine Verfolgung. Keine überraschenden Sperren. Für jeden, der sie braucht.",
  futureTitle: "Purify Plus, wenn es kommt",
  future:
    "Eine freiwillige Schicht namens Purify Plus ist für die Zeit nach dem Mobil-Start geplant. Sie wird nur dazu da sein, die Arbeit zu bezahlen, die sie verlangt (die Server, die Produktion, die Rechte), und ergänzt erweiterte Werkzeuge: kuratierte Lesesammlungen, eigene Florilegien, Klanglandschaften und die künftige Audio-Bibliothek. Der Kern bleibt für immer offen; was heute frei ist, wird dann noch frei sein. Und ein gegebenes Versprechen bleibt bestehen: Unterstützer aus der Zeit vor dem Start behalten die geräteübergreifende Synchronisierung auf Lebenszeit, ohne Abonnement. Dieses Versprechen gilt der Synchronisierung selbst; die weiteren Plus-Werkzeuge gehören zum Abonnement, wenn es kommt.",
  supportKicker: "Purify wird von denen getragen, denen es hilft.",
  supportLine:
    "Wenn die App dich getragen hat, kannst du sie ein wenig zurücktragen. Eine freiwillige Gabe ist heute der einzige Weg, auf dem Geld eine Rolle spielt.",
  supportCta: "Eine Kerze anzünden",
  supportFoot: "Völlig freiwillig. Einmal geben, oder gar nicht.",
};

export default async function PricingPage() {
  const locale = await getServerLocale();
  if (locale === "de") return <PricingView copy={DE} />;
  const m = getMessages(locale);
  const copy: PricingCopy = {
    eyebrow: t(m, "pricing.eyebrow"),
    h1: t(m, "pricing.h1"),
    ...EN,
  };
  return <PricingView copy={copy} />;
}

function PricingView({ copy }: { copy: PricingCopy }) {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto w-full max-w-[760px]">
        {/* Masthead */}
        <div className="text-center">
          <p className="mb-4 font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60">
            {copy.eyebrow}
          </p>
          <h1 className="font-sans text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-lg">
            {copy.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] font-sans text-body leading-relaxed text-paper/75 md:text-lede">
            {copy.lede}
          </p>
        </div>

        {/* Always-free panel */}
        <div className="mt-12 rounded-2xl border border-paper/10 bg-black/30 p-6 md:mt-16 md:p-8">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
            {copy.freeTitle}
          </p>
          <ul className="mt-5 space-y-3.5">
            {copy.freeItems.map((item) => (
              <li key={item} className="flex gap-3">
                <StarMark />
                <span className="font-serif text-lede leading-snug text-paper/90">
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-ui text-paper/55">
            {copy.freeFoot}
          </p>
        </div>

        {/* Future layer — quiet */}
        <div className="mx-auto mt-8 max-w-[600px] text-center md:mt-10">
          <p className="mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/40">
            {copy.futureTitle}
          </p>
          <p className="font-sans text-ui leading-relaxed text-paper/55">
            {copy.future}
          </p>
        </div>

        {/* Support / lamp panel */}
        <div
          className="mt-12 rounded-2xl border border-paper/10 p-7 text-center md:mt-16 md:p-9"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%), #0c0a08",
          }}
        >
          <div className="flex justify-center">
            <LampMark />
          </div>
          <p className="mt-4 font-display-serif text-title text-paper">
            {copy.supportKicker}
          </p>
          <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
            {copy.supportLine}
          </p>
          <Link
            href="/support"
            className="mt-6 inline-flex items-center gap-2 rounded-pill border border-[#d4af37]/35 bg-[#d4af37]/[0.06] px-6 py-3 font-sans text-ui font-semibold text-[#d4af37] transition-colors hover:bg-[#d4af37]/[0.12]"
          >
            {copy.supportCta}
            <ArrowRight />
          </Link>
          <p className="mt-4 font-sans text-caption text-paper/40">
            {copy.supportFoot}
          </p>
        </div>
      </div>
    </section>
  );
}

function StarMark() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      aria-hidden
      className="mt-[6px] shrink-0"
    >
      <path
        d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
        fill="#d4af37"
        fillOpacity="0.7"
      />
    </svg>
  );
}

function LampMark() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3c2.5 3 4 5 4 7.5a4 4 0 1 1-8 0C8 8.5 9.5 6 12 3z"
        fill="#d4af37"
        fillOpacity="0.85"
      />
      <path
        d="M12 8.5c1 1.1 1.5 2 1.5 3a1.5 1.5 0 1 1-3 0c0-1 0.5-1.9 1.5-3z"
        fill="#0c0a08"
        fillOpacity="0.6"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
