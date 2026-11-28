"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { NAME_FIELD } from "@/components/prayers/NameForm";
import { apiFetch } from "@/lib/api/client";
import { GIFT_CARD, type GiftWhen } from "@/lib/gifts/card";
import { dateLocale } from "@/lib/i18n/deviceDates";

import { GiftFeatures } from "@/components/gifts/GiftFeatures";
import { PILL } from "@/components/gifts/OrderGiftClient";

const LABEL = "block font-sans text-caption font-semibold text-paper/70";

/**
 * The giver's page: a year of Plus given by email (2.0, the Christmas gift).
 * As drawn and said yes to (docs/plans/gift/, his word 2026-11-28): the gift's
 * own ticket, who it is from and for, their email and a line, when it
 * arrives, one button with the price, and the terms in one line. The app's own
 * field (NAME_FIELD) and choice track (.set-track). The choices and the season
 * come from the server, which reads the day (app/(app)/give/page.tsx).
 */
export function GiveClient({ choices }: { choices: readonly GiftWhen[] }) {
  const { t, locale } = useTranslate();
  const season = choices.length > 1;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [email, setEmail] = useState("");
  const [line, setLine] = useState("");
  const [when, setWhen] = useState<GiftWhen>(season ? choices[1] : "now");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = new Intl.NumberFormat(dateLocale(locale), { style: "currency", currency: GIFT_CARD.currency.toUpperCase() }).format(GIFT_CARD.cents / 100);
  const dayName = (month: number, day: number) =>
    new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, month, day, 12)));
  const label = (w: GiftWhen) => (w === "now" ? t("giveGift.now") : w === "dec25" ? dayName(11, 25) : dayName(0, 7));

  async function give(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/gifts/card/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromName: from, toName: to, toEmail: email, message: line, when }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; code?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(
        res.status === 429 ? t("giveGift.errBusy") : data.code === "invalid" ? t("giveGift.errInvalid") : data.code === "when" ? t("giveGift.errWhen") : t("giveGift.errGeneric"),
      );
    } catch {
      setError(t("giveGift.errGeneric"));
    }
    setBusy(false);
  }

  return (
    <section className="gift-page min-h-[calc(100dvh-72px)] bg-night pb-32 pt-20">
      <div className="relative mx-auto w-full max-w-md px-[18px]">
        {/* The ticket: the gift itself, above its torn line. */}
        <div className="set-panel">
          <div>
            <div id="gift-first" className="px-[18px] pb-4 pt-[18px]">
              <p className="gift-eyebrow text-paper/62">{season ? t("giveGift.eyebrowChristmas") : t("giveGift.eyebrow")}</p>
              <h1 id="gift-title" className="gift-title mt-[7px] font-serif text-[30px] font-bold leading-[1.05] text-paper">
                {t("orderGift.title")}
              </h1>
              <p className="mt-1 font-sans text-detail leading-[1.45] text-paper/60">{t("giveGift.meta")}</p>
            </div>
            <div className="gift-perf" aria-hidden />
            <div className="px-[18px] pb-4 pt-3.5">
              <p className="font-sans text-detail leading-[1.5] text-paper/70">{season ? t("giveGift.whenLineChristmas", { jan7: dayName(0, 7) }) : t("giveGift.whenLine")}</p>
            </div>
          </div>
        </div>

        <form onSubmit={give} data-gift-form="" className="mt-6 px-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="give-from" className={LABEL}>
                {t("giveGift.from")}
              </label>
              <input id="give-from" dir="auto" required maxLength={60} autoComplete="name" value={from} onChange={(e) => setFrom(e.target.value)} className={`${NAME_FIELD} mt-1.5`} />
            </div>
            <div>
              <label htmlFor="give-to" className={LABEL}>
                {t("giveGift.to")}
              </label>
              <input id="give-to" dir="auto" required maxLength={60} autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} className={`${NAME_FIELD} mt-1.5`} />
            </div>
          </div>
          <label htmlFor="give-email" className={`mt-5 ${LABEL}`}>
            {t("giveGift.email")}
          </label>
          <input id="give-email" type="email" dir="auto" required maxLength={254} autoComplete="off" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${NAME_FIELD} mt-1.5`} />
          <label htmlFor="give-line" className={`mt-5 ${LABEL}`}>
            {t("giveGift.line")}
          </label>
          <textarea id="give-line" dir="auto" rows={3} maxLength={280} value={line} onChange={(e) => setLine(e.target.value)} className={`${NAME_FIELD} mt-1.5 resize-none`} />
          {choices.length > 1 ? (
            <>
              <p id="give-when" className={`mt-5 ${LABEL}`}>
                {t("giveGift.when")}
              </p>
              <div role="radiogroup" aria-labelledby="give-when" className="set-track mt-1.5" style={{ "--set-cols": choices.length } as CSSProperties}>
                {choices.map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={when === w}
                    onClick={() => setWhen(w)}
                    className="hit-44"
                    data-mock-allow={when === w ? "contrast" : undefined}
                    data-mock-why={when === w ? "the lit choice on its raised plate (::before), 11:1 or more, measured" : undefined}
                  >
                    {label(w)}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div className="gift-after mt-6">
            <button type="submit" disabled={busy} className={PILL}>
              {t("giveGift.give", { price })}
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-3 font-sans text-detail leading-[1.5] text-paper">
              {error}
            </p>
          ) : null}
          <p className="mt-3 font-sans text-detail leading-[1.5] text-paper/70">{t("giveGift.terms")}</p>
        </form>

        <GiftFeatures />
      </div>
    </section>
  );
}
