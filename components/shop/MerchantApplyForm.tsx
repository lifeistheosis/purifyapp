"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";

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
          Application received.
        </p>
        <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
          Every application is reviewed by a person. We&rsquo;ll write to the
          email you gave, usually within a couple of weeks. Approval is not
          automatic and no store is created until review is complete.
        </p>
        <Link
          href="/shop/sell/application"
          className="mt-5 inline-flex font-sans text-detail font-medium text-gold"
        >
          View your application status →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelCls}>Proposed store name *</span>
          <input name="storeName" required minLength={2} maxLength={120} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Seller type *</span>
          <select name="sellerType" required defaultValue="" className={field}>
            <option value="" disabled>
              Choose…
            </option>
            {SELLER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Legal or personal name *</span>
          <input name="legalName" required minLength={2} maxLength={200} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Email *</span>
          <input name="email" type="email" required maxLength={320} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Phone</span>
          <input name="phone" maxLength={40} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Country *</span>
          <input name="country" required minLength={2} maxLength={100} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Shipping origin</span>
          <input
            name="shippingOrigin"
            maxLength={200}
            placeholder="City / region parcels ship from"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Website or portfolio</span>
          <input
            name="portfolioUrl"
            type="url"
            maxLength={500}
            placeholder="https://…"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Typical processing time</span>
          <input
            name="processingTime"
            maxLength={200}
            placeholder="e.g. ready-made ships in 3 days; commissions 6-10 weeks"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Countries served</span>
          <input
            name="countriesServed"
            maxLength={500}
            placeholder="e.g. United States and Canada"
            className={field}
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelCls}>What do you make or sell?</legend>
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
        <legend className={labelCls}>How do you sell?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="fulfillmentOfferings" value="ready_made" className={check} />
            <span className="font-sans text-detail text-paper/75">Ready-made</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="fulfillmentOfferings" value="made_to_order" className={check} />
            <span className="font-sans text-detail text-paper/75">Made to order</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="fulfillmentOfferings" value="commission" className={check} />
            <span className="font-sans text-detail text-paper/75">Commissions</span>
          </label>
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className={labelCls}>Your return policy</span>
        <textarea name="returnPolicy" rows={3} maxLength={2000} className={field} />
      </label>

      <label className="block space-y-1.5">
        <span className={labelCls}>About you or your workshop</span>
        <textarea
          name="sellerDescription"
          rows={4}
          maxLength={3000}
          placeholder="Training, tradition, years of practice, what you love to paint or carve…"
          className={field}
        />
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="rightsDeclaration" required className={check} />
        <span className="font-sans text-detail text-paper/70">
          I confirm that I hold the rights to reproduce and sell every work I
          would list, and that my listings will describe production methods
          truthfully. *
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="agreedStandards" required className={check} />
        <span className="font-sans text-detail text-paper/70">
          I agree to the Purify marketplace standards: honest description,
          reverent subject matter, reliable fulfillment, and responsive
          communication. *
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
        Applications are reviewed by hand and approval is not guaranteed.
        Submitting does not create a store.
      </p>
    </form>
  );
}
