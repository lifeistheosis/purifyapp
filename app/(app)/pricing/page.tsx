import Link from "next/link";

export const metadata = {
  title: "Pricing",
  description:
    "Purify is free. Every part of it, for everyone, with no ads, no subscriptions, and no paywalls.",
};

export default function PricingPage() {
  return (
    <section className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[720px] w-full text-center">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          Pricing
        </p>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Free. All of it.
        </h1>
        <p className="font-sans text-[17px] md:text-[18px] text-paper/75 mt-6 leading-relaxed">
          Purify is free for everyone, and stays that way: the whole Bible, the
          saints, the prayers, and the calendar, with no ads, no subscriptions,
          no in-app purchases, and nothing hidden behind a paywall.
        </p>
        <p className="font-sans text-[15px] text-paper/60 mt-6 leading-relaxed">
          If the app has helped you and you would like to,{" "}
          <Link
            href="/support"
            className="text-gold hover:text-gold/80 underline underline-offset-4"
          >
            you can support it
          </Link>{" "}
          with a freewill gift. That is the only way money is ever involved, and
          it is entirely optional.
        </p>
      </div>
    </section>
  );
}
