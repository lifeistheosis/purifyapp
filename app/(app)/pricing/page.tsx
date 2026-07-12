import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { PlusPaywall } from "@/components/billing/PlusPaywall";
import { WebOnly, NativeOnly } from "@/components/platform/PlatformGate";
import { ClientErrorBoundary } from "@/components/ui/ClientErrorBoundary";
import { PLAY_STORE_URL } from "@/lib/site";
import {
  WebPlusCheckout,
  type WebCheckoutCopy,
} from "@/components/billing/WebPlusCheckout";

export const metadata = {
  title: "Pricing & Purify Plus",
  description:
    "The core spiritual treasury of Purify is free, always. Purify Plus is an optional subscription, available now in the Android app, that carries your reading across every device. What is free today stays free.",
};

type PricingCopy = {
  eyebrow: string;
  h1: string;
  lede: string;
  freeTitle: string;
  freeItems: string[];
  freeFoot: string;
  plusTitle: string;
  plusLede: string;
  plusItems: { title: string; sub: string }[];
  plusPriceMonthly: string;
  plusPriceYearly: string;
  plusPromise: string;
  web: WebCheckoutCopy;
  supportKicker: string;
  supportLine: string;
  supportCta: string;
  supportFoot: string;
};

const EN: Omit<PricingCopy, "eyebrow" | "h1"> = {
  lede: "The whole spiritual treasury of Purify is free, and it stays free. There is no tier to unlock the Scriptures, the saints, the prayers, or the calendar, and there never will be.",
  freeTitle: "Always free",
  freeItems: [
    "Every saint’s life, and the primary writings of the Fathers",
    "The Scriptures, with the Greek beside them",
    "The daily prayers, the hours, and the akathists",
    "The whole Church calendar, its fasts and its feasts",
  ],
  freeFoot: "No ads. No tracking. No surprise locks. For anyone who needs it.",
  plusTitle: "Purify Plus",
  plusLede:
    "An optional subscription, live now in the Android app. It exists only to pay for the work it requires (the servers, the production, the rights) and adds the gathered reading layer on top of the free core.",
  plusItems: [
    { title: "Cross-device sync", sub: "Your library on every device you sign in on" },
    { title: "Notes, highlights & bookmarks", sub: "Kept private, carried everywhere" },
    { title: "Custom collections & Florilegium", sub: "Build your own quote collections" },
    { title: "Free EIKON shop shipping", sub: "On every order while your subscription is active" },
    { title: "Immersive History", sub: "The story of the Church in full cinematic dress" },
  ],
  plusPriceMonthly: "$9.99 / month",
  plusPriceYearly: "$99 / year",
  plusPromise:
    "A promise already made stays made: pre-launch supporters keep lifetime cross-device sync, no subscription required. That promise covers sync itself; the wider Plus tools belong to the subscription.",
  web: {
    monthlyLabel: "$9.99 / month",
    yearlyLabel: "$99 / year",
    signedOut:
      "Purify Plus is tied to your account, so it follows you across every device. Sign in to subscribe.",
    signIn: "Sign in to subscribe",
    subscribeMonthly: "Subscribe monthly",
    subscribeYearly: "Subscribe yearly",
    processing: "Opening checkout…",
    billedNote:
      "Billed securely on the web, and it unlocks Plus in the Android app too. Cancel anytime.",
    errorNote: "That didn’t go through. Nothing was charged.",
    subscribedTitle: "You have Purify Plus.",
    subscribedSub:
      "Thank you for keeping the lamps lit. It is active on every device you sign in on.",
    manage: "Manage subscription",
    orGetInApp: "Prefer the app? Get Purify Plus on Google Play",
    getInApp: "Get Purify Plus in the app",
  },
  supportKicker: "Purify is kept by those it helps.",
  supportLine:
    "If the app has carried you, you can carry it a little in return. Beyond Plus, a freewill gift is always welcome and never required.",
  supportCta: "Light a lamp",
  supportFoot: "Entirely optional. Give once, or not at all.",
};

const DE: PricingCopy = {
  eyebrow: "Preise",
  h1: "Der Kern bleibt immer frei.",
  lede: "Der ganze geistliche Schatz von Purify ist frei und bleibt frei. Es gibt keine Stufe, um die Schriften, die Heiligen, die Gebete oder den Kalender freizuschalten, und wird es nie geben.",
  freeTitle: "Immer frei",
  freeItems: [
    "Jedes Leben eines Heiligen und die wichtigsten Schriften der Väter",
    "Die Schriften, mit dem Griechischen daneben",
    "Die täglichen Gebete, die Horen und die Akathiste",
    "Der ganze Kirchenkalender, seine Fasten und seine Feste",
  ],
  freeFoot:
    "Keine Werbung. Keine Verfolgung. Keine überraschenden Sperren. Für jeden, der sie braucht.",
  plusTitle: "Purify Plus",
  plusLede:
    "Ein freiwilliges Abonnement, jetzt in der Android-App verfügbar. Es ist nur dazu da, die Arbeit zu bezahlen, die es verlangt (die Server, die Produktion, die Rechte), und ergänzt die gesammelte Leseschicht über dem freien Kern.",
  plusItems: [
    { title: "Geräteübergreifende Synchronisierung", sub: "Deine Bibliothek auf jedem Gerät, auf dem du dich anmeldest" },
    { title: "Notizen, Markierungen & Lesezeichen", sub: "Privat gehalten, überallhin getragen" },
    { title: "Eigene Sammlungen & Florilegium", sub: "Erstelle deine eigenen Zitatsammlungen" },
    { title: "Kostenloser EIKON-Versand", sub: "Bei jeder Bestellung, solange dein Abonnement aktiv ist" },
    { title: "Immersive Kirchengeschichte", sub: "Die Geschichte der Kirche in vollem filmischem Gewand" },
  ],
  plusPriceMonthly: "9,99 $ / Monat",
  plusPriceYearly: "99 $ / Jahr",
  plusPromise:
    "Ein gegebenes Versprechen bleibt bestehen: Unterstützer aus der Zeit vor dem Start behalten die geräteübergreifende Synchronisierung auf Lebenszeit, ohne Abonnement. Dieses Versprechen gilt der Synchronisierung selbst; die weiteren Plus-Werkzeuge gehören zum Abonnement.",
  web: {
    monthlyLabel: "9,99 $ / Monat",
    yearlyLabel: "99 $ / Jahr",
    signedOut:
      "Purify Plus ist an dein Konto gebunden und folgt dir auf jedes Gerät. Melde dich an, um zu abonnieren.",
    signIn: "Zum Abonnieren anmelden",
    subscribeMonthly: "Monatlich abonnieren",
    subscribeYearly: "Jährlich abonnieren",
    processing: "Kasse wird geöffnet…",
    billedNote:
      "Sicher im Web abgerechnet, schaltet Plus auch in der Android-App frei. Jederzeit kündbar.",
    errorNote: "Das hat nicht geklappt. Es wurde nichts berechnet.",
    subscribedTitle: "Du hast Purify Plus.",
    subscribedSub:
      "Danke, dass du die Lampen am Brennen hältst. Es ist auf jedem Gerät aktiv, auf dem du dich anmeldest.",
    manage: "Abonnement verwalten",
    orGetInApp: "Lieber die App? Purify Plus bei Google Play holen",
    getInApp: "Purify Plus in der App holen",
  },
  supportKicker: "Purify wird von denen getragen, denen es hilft.",
  supportLine:
    "Wenn die App dich getragen hat, kannst du sie ein wenig zurücktragen. Über Plus hinaus ist eine freiwillige Gabe stets willkommen und nie erforderlich.",
  supportCta: "Eine Kerze anzünden",
  supportFoot: "Völlig freiwillig. Einmal geben, oder gar nicht.",
};

export default async function PricingPage() {
  const locale = await getServerLocale();
  let view: React.ReactNode;
  if (locale === "de") {
    view = <PricingView copy={DE} />;
  } else {
    const m = getMessages(locale);
    const copy: PricingCopy = {
      eyebrow: t(m, "pricing.eyebrow"),
      h1: t(m, "pricing.h1"),
      ...EN,
    };
    view = <PricingView copy={copy} />;
  }
  return (
    <>
      {/* Web (mobile + desktop): the quiet, price-free pricing page. */}
      <WebOnly>{view}</WebOnly>
      {/* Native app: the full-screen Purify Plus paywall (Play Billing).
          Wrapped so a billing/plugin failure shows a calm fallback instead
          of white-screening the WebView (the "Purify Plus crashes" report). */}
      <NativeOnly>
        <ClientErrorBoundary
          fallback={
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
              <p className="font-display-serif text-title text-paper">
                Purify Plus
              </p>
              <p className="mx-auto mt-3 max-w-[320px] font-sans text-ui leading-relaxed text-paper/60">
                Plus isn&rsquo;t available to open right now. The whole core of
                Purify stays free, and everything you&rsquo;ve gathered is safe
                on this device.
              </p>
            </div>
          }
        >
          <PlusPaywall />
        </ClientErrorBoundary>
      </NativeOnly>
    </>
  );
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

        {/* Purify Plus — live, priced, bought in the Android app */}
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-gold/25 p-6 md:mt-10 md:p-8"
          style={{
            background:
              "radial-gradient(130% 90% at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 58%), #0c0b09",
          }}
        >
          <div className="flex items-center gap-3">
            <p className="font-display-serif text-title text-paper">
              {copy.plusTitle}
            </p>
            <span className="rounded-pill border border-gold/40 bg-gold/[0.10] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-gold-pale">
              Available now
            </span>
          </div>
          <p className="mt-3 max-w-[560px] font-sans text-ui leading-relaxed text-paper/70">
            {copy.plusLede}
          </p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {copy.plusItems.map((item) => (
              <li key={item.title} className="flex gap-3">
                <StarMark />
                <span>
                  <span className="block font-sans text-ui font-semibold text-paper">
                    {item.title}
                  </span>
                  <span className="block font-sans text-caption text-paper/55">
                    {item.sub}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-paper/8 pt-6">
            <span className="font-display-serif text-title text-paper">
              {copy.plusPriceMonthly}
            </span>
            <span className="text-paper/30">·</span>
            <span className="font-display-serif text-title text-paper">
              {copy.plusPriceYearly}
            </span>
          </div>

          {/* The web purchase surface. Subscribes through RevenueCat Web
              Billing bound to the signed-in account, so it unlocks Plus on
              the phone too. Degrades to a Play Store link when web billing
              is not configured. */}
          <WebPlusCheckout copy={copy.web} playStoreUrl={PLAY_STORE_URL} />

          <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-caption leading-[1.6] text-paper/45">
            {copy.plusPromise}
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
