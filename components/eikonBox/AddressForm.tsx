"use client";

import { US_STATES } from "@/lib/eikonBox/address";
import type { ShippingAddress } from "@/lib/eikonBox/types";

export type AddressFields = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export const EMPTY_ADDRESS: AddressFields = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

/** Turn a stored address back into form fields. */
export function toFields(a: ShippingAddress | null): AddressFields {
  if (!a) return EMPTY_ADDRESS;
  return {
    name: a.name,
    line1: a.address.line1,
    line2: a.address.line2 ?? "",
    city: a.address.city,
    state: a.address.state,
    postalCode: a.address.postal_code,
  };
}

const INPUT =
  "w-full rounded-md border border-paper/15 bg-paper/[0.04] px-3 py-2.5 font-sans text-ui text-paper placeholder:text-paper/30 focus:outline-none focus:ring-2 focus:ring-gold/40";
const LABEL =
  "block font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/55 mb-1.5";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error && (
        <p
          role="alert"
          className="mt-1 font-sans text-caption text-crimson leading-[1.4]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The shipping-address form for an EIKON Box claim.
 *
 * The first address form in the app: every address before this came from
 * Stripe Checkout, which collected it for us. A free box has no payment
 * step, so we collect it ourselves.
 *
 * The state field is a select rather than a text input on purpose. A typo in
 * a two-letter state code is invisible until a parcel comes back, and the
 * owner is paying for that parcel out of one month's subscription.
 *
 * `errors` are the SERVER's field errors; validation here is only for the
 * inline hints. lib/eikonBox/address.ts holds the one rule set both use.
 */
export function AddressForm({
  value,
  onChange,
  errors = {},
  disabled = false,
}: {
  value: AddressFields;
  onChange: (next: AddressFields) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const set = (k: keyof AddressFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <div className="space-y-3.5">
      <Field id="eb-name" label="Full name" error={errors.name}>
        <input
          id="eb-name"
          className={INPUT}
          value={value.name}
          onChange={set("name")}
          autoComplete="name"
          disabled={disabled}
          placeholder="The name on the parcel"
        />
      </Field>

      <Field id="eb-line1" label="Street address" error={errors.line1}>
        <input
          id="eb-line1"
          className={INPUT}
          value={value.line1}
          onChange={set("line1")}
          autoComplete="address-line1"
          disabled={disabled}
        />
      </Field>

      <Field id="eb-line2" label="Apartment, suite (optional)" error={errors.line2}>
        <input
          id="eb-line2"
          className={INPUT}
          value={value.line2}
          onChange={set("line2")}
          autoComplete="address-line2"
          disabled={disabled}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="eb-city" label="City" error={errors.city}>
          <input
            id="eb-city"
            className={INPUT}
            value={value.city}
            onChange={set("city")}
            autoComplete="address-level2"
            disabled={disabled}
          />
        </Field>
        <Field id="eb-state" label="State" error={errors.state}>
          <select
            id="eb-state"
            className={INPUT}
            value={value.state}
            onChange={set("state")}
            autoComplete="address-level1"
            disabled={disabled}
          >
            <option value="">Choose…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="eb-zip" label="ZIP code" error={errors.postalCode}>
        <input
          id="eb-zip"
          className={INPUT}
          value={value.postalCode}
          onChange={set("postalCode")}
          autoComplete="postal-code"
          inputMode="numeric"
          disabled={disabled}
        />
      </Field>

      <p className="font-sans text-caption text-paper/45 leading-[1.55]">
        We ship to United States addresses at present.
      </p>
    </div>
  );
}
