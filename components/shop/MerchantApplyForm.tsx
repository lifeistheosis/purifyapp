"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";
const labelCls = "font-sans text-caption font-semibold text-paper/60";
const check = "mt-1 h-4 w-4 rounded border-paper/30 bg-night accent-[#c9a961]";

const SELLER_TYPES = [
  { value: "independent_iconographer", label: "Independent iconographer" },
  { value: "monastery", label: "Monastery" },
  { value: "workshop", label: "Workshop" },
  { value: "retailer", label: "Retailer" },
];

const PRODUCT_METHODS = [
  "Hand-painted icons",
  "Hand-finished reproductions",
  "Printed & mounted icons",
  "Laminated icons",
  "Wooden icons",
  "Carved work",
  "Other",
];

/**
 * Merchant application. Submitting never creates a store: every
 * application is reviewed by a person, and the form says so plainly.
 */
export function MerchantApplyForm() {
  const { t } = useTranslate();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      proposedStoreName: String(form.get("storeName") ?? "").trim(),
      sellerType: String(form.get("sellerType") ?? ""),
      legalName: String(form.get("legalName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "") || null,
      country: String(form.get("country") ?? "").trim(),
      shippingOrigin: String(form.get("shippingOrigin") ?? "") || null,
      portfolioUrl: String(form.get("portfolioUrl") ?? "") || null,
      productMethods: form.getAll("productMethods").map(String),
      fulfillmentOfferings: form.getAll("fulfillmentOfferings").map(String),
      processingTime: String(form.get("processingTime") ?? "") || null,
      countriesServed: String(form.get("countriesServed") ?? "") || null,
      returnPolicy: String(form.get("returnPolicy") ?? "") || null,
      rightsDeclaration: form.get("rightsDeclaration") === "on",
      sellerDescription: String(form.get("sellerDescription") ?? "") || null,
      agreedStandards: form.get("agreedStandards") === "on",
    };
    setState("busy");
    try {
      const res = await apiFetch("/api/shop/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("done");
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
      setState("idle");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-8">
        <p className="font-display-serif text-title text-paper">
          {t("shop.applicationReceived")}
        </p>
        <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
          {t("shop.everyApplicationIsReviewedBy")}
        </p>
        <Link
          href="/shop/sell/application"
          className="mt-5 inline-flex font-sans text-detail font-medium text-gold"
        >
          {t("shop.viewYourApplicationStatus")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.proposedStoreName")}</span>
          <input name="storeName" required minLength={2} maxLength={120} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.sellerTypeX")}</span>
          <select name="sellerType" required defaultValue="" className={field}>
            <option value="" disabled>
              {t("shop.choose")}
            </option>
            {SELLER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.legalOrPersonalName")}</span>
          <input name="legalName" required minLength={2} maxLength={200} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.email")}</span>
          <input name="email" type="email" required maxLength={320} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.phone")}</span>
          <input name="phone" maxLength={40} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.countryX")}</span>
          <input name="country" required minLength={2} maxLength={100} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.shippingOrigin")}</span>
          <input
            name="shippingOrigin"
            maxLength={200}
            placeholder={t("shop.cityRegionParcelsShipFrom")}
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.websiteOrPortfolio")}</span>
          <input
            name="portfolioUrl"
            type="url"
            maxLength={500}
            placeholder={t("shop.https")}
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.typicalProcessingTime")}</span>
          <input
            name="processingTime"
            maxLength={200}
            placeholder={t("shop.eGReadyMadeShips")}
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>{t("shop.countriesServed")}</span>
          <input
            name="countriesServed"
            maxLength={500}
            placeholder={t("shop.eGUnitedStatesAnd")}
            className={field}
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelCls}>{t("shop.whatDoYouMakeOr")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRODUCT_METHODS.map((m) => (
            <label key={m} className="flex items-start gap-3">
              <input type="checkbox" name="productMethods" value={m} className={check} />
              <span className="font-sans text-detail text-paper/75">{m}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={labelCls}>{t("shop.howDoYouSell")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="fulfillmentOfferings" value="ready_made" className={check} />
            <span className="font-sans text-detail text-paper/75">{t("shop.readyMade")}</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="fulfillmentOfferings" value="made_to_order" className={check} />
            <span className="font-sans text-detail text-paper/75">{t("shop.madeToOrder")}</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="fulfillmentOfferings" value="commission" className={check} />
            <span className="font-sans text-detail text-paper/75">{t("shop.commissions")}</span>
          </label>
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className={labelCls}>{t("shop.yourReturnPolicy")}</span>
        <textarea name="returnPolicy" rows={3} maxLength={2000} className={field} />
      </label>

      <label className="block space-y-1.5">
        <span className={labelCls}>{t("shop.aboutYouOrYourWorkshop")}</span>
        <textarea
          name="sellerDescription"
          rows={4}
          maxLength={3000}
          placeholder={t("shop.trainingTraditionYearsOfPractice")}
          className={field}
        />
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="rightsDeclaration" required className={check} />
        <span className="font-sans text-detail text-paper/70">
          {t("shop.iConfirmThatIHold")}
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="agreedStandards" required className={check} />
        <span className="font-sans text-detail text-paper/70">
          {t("shop.iAgreeToThePurify")}
        </span>
      </label>

      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "busy"}
        className="tap-press inline-flex min-h-[48px] items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
      >
        {state === "busy" ? "Submitting…" : "Submit application"}
      </button>
      <p className="font-sans text-caption text-paper/60">
        {t("shop.applicationsAreReviewedByHandX")}
      </p>
    </form>
  );
}
