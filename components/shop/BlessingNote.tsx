"use client";

import { PolicyText } from "@/components/shop/PolicyText";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { formatPrice } from "@/lib/shop/format";
import type { ShopBlessingOffer } from "@/lib/shop/types";

/**
 * The blessing offer on a product page, from the one global config.
 *
 * Renders only when the API sent an offer, which it does only when the product
 * carries blessing_available and the owner has enabled the config. The
 * owner's copy comes first; the sentence after it is fixed here and not
 * editable from the panel, because it is the one thing the page must always
 * say: the blessing is offered freely by the cooperating parish, and any
 * charge is for handling. Steward voice, no urgency; the checkbox asks, it
 * does not push.
 */
export function BlessingNote({
  offer,
  checked,
  onChange,
  currency,
}: {
  offer: ShopBlessingOffer;
  checked: boolean;
  onChange: (next: boolean) => void;
  currency: string;
}) {
  const { t } = useTranslate();
  const parish = offer.parishName.trim();
  return (
    <section
      aria-label={t("shop.blessing.title")}
      className="mt-6 rounded-lg border border-gold/25 bg-gold/[0.04] p-5"
    >
      <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold">
        {t("shop.blessing.title")}
      </h2>
      {offer.copyMd.trim() ? (
        <div className="mt-3">
          <PolicyText text={offer.copyMd} />
        </div>
      ) : null}
      <p className="mt-3 font-serif text-detail text-paper/65 leading-[1.6]">
        {parish
          ? t("shop.blessing.freelyOffered", { parish })
          : t("shop.blessing.freelyOfferedNoParish")}
      </p>
      {offer.handlingCents > 0 ? (
        <p className="mt-1 font-sans text-caption text-paper/55">
          {t("shop.blessing.handling", { price: formatPrice(offer.handlingCents, currency) })}
        </p>
      ) : null}
      <label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-gold"
        />
        <span className="font-sans text-detail text-paper/85 leading-[1.5]">
          {t("shop.blessing.request")}
        </span>
      </label>
    </section>
  );
}
