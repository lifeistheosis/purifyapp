"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { dateLocale } from "@/lib/i18n/deviceDates";

import { PILL } from "@/components/gifts/OrderGiftClient";

/** After the giver has paid: when it reaches them, and the receipt. The gift's own ticket, lit as given. */
export function GiveThanks({ on }: { on: string | null }) {
  const { t, locale } = useTranslate();
  const day = on ? new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${on}T12:00:00Z`)) : null;
  return (
    <section className="gift-page min-h-[calc(100dvh-72px)] bg-night pb-32 pt-20">
      <div className="relative mx-auto w-full max-w-md px-[18px]">
        <div className="set-panel">
          <div>
            <div id="gift-first" className="px-[18px] pb-4 pt-[18px]">
              <p className="gift-eyebrow text-paper/62">{t("giveGift.thanksTitle")}</p>
              <h1 id="gift-title" className="gift-title mt-[7px] font-serif text-[30px] font-bold leading-[1.05] text-paper">
                {t("orderGift.title")}
              </h1>
              <p className="mt-1 font-sans text-detail leading-[1.45] text-paper/60">{t("giveGift.meta")}</p>
            </div>
            <div className="gift-perf" aria-hidden />
            <div className="px-[18px] pb-4 pt-3.5">
              <p className="font-sans text-detail leading-[1.5] text-paper/70">{day ? t("giveGift.thanksOn", { day }) : t("giveGift.thanksNow")}</p>
              <p className="mt-2 font-sans text-detail leading-[1.5] text-paper/70">{t("giveGift.thanksReceipt")}</p>
            </div>
          </div>
        </div>
        <div className="gift-after mt-4">
          <Link href="/" className={PILL}>
            {t("giveGift.thanksBack")}
          </Link>
        </div>
      </div>
    </section>
  );
}
