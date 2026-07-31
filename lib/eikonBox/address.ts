// Shipping-address normalisation and validation for the EIKON Box claim.
//
// This is the first address form in the app: every address until now came
// from Stripe Checkout, which collected and validated it for us. A free
// monthly box has no payment step, so we collect it ourselves.
//
// Deliberately NOT zod. No client component in this repo imports zod today,
// and adding it to the app bundle for one form is not worth the kilobytes.
// The route wraps the request body in a thin zod schema first (it is on the
// server already, where zod is free) and then re-runs validateAddress as the
// authority, so the copy of the rules that ships to the device is a
// convenience for inline errors and never the thing that decides.

import type { ShippingAddress } from "./types";

/**
 * US states, DC, and the territories USPS delivers to. The form renders a
 * select from this, which is most of what stops a bad address: a typo in a
 * two-letter state code is otherwise invisible until a parcel comes back.
 */
export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "AS", name: "American Samoa" }, { code: "GU", name: "Guam" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "PR", name: "Puerto Rico" }, { code: "VI", name: "U.S. Virgin Islands" },
  { code: "AA", name: "Armed Forces Americas" },
  { code: "AE", name: "Armed Forces Europe" },
  { code: "AP", name: "Armed Forces Pacific" },
];

const STATE_CODES = new Set(US_STATES.map((s) => s.code));

/** The loose shape a form or a request body hands us. */
export type AddressInput = {
  name?: unknown;
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

/**
 * Coerce arbitrary input into the stored shape. Never throws and never
 * decides validity: run validateAddress on the result.
 *
 * Country is forced to US because that is what the shop ships to today
 * (lib/shop/checkout.ts sets allowed_countries: ["US"]) and what the Terms
 * commit to. Widening it is a Terms change, not a form change.
 */
export function normalizeAddress(input: AddressInput): ShippingAddress {
  const line2 = str(input.line2);
  return {
    name: str(input.name),
    address: {
      line1: str(input.line1),
      line2: line2 || null,
      city: str(input.city),
      state: str(input.state).toUpperCase(),
      postal_code: str(input.postalCode).replace(/[^0-9]/g, ""),
      country: "US",
    },
  };
}

/**
 * Field name -> message. Empty object means valid. Messages are the ones
 * shown next to the input, so they are written for the member.
 */
export function validateAddress(a: ShippingAddress): Record<string, string> {
  const errors: Record<string, string> = {};
  const { name, address } = a;

  if (name.length < 2 || name.length > 100)
    errors.name = "Please give the full name the box should be addressed to.";
  if (address.line1.length < 3 || address.line1.length > 100)
    errors.line1 = "Please give a street address.";
  if (address.line2 && address.line2.length > 100)
    errors.line2 = "This line is too long.";
  if (address.city.length < 2 || address.city.length > 60)
    errors.city = "Please give a city.";
  if (!STATE_CODES.has(address.state)) errors.state = "Please choose a state.";
  if (!/^\d{5}$|^\d{9}$/.test(address.postal_code))
    errors.postalCode = "Please give a 5 or 9 digit ZIP code.";

  return errors;
}

/** One-line rendering for confirmations, emails, and the roster export. */
export function formatAddress(a: ShippingAddress): string {
  const { name, address } = a;
  const zip =
    address.postal_code.length === 9
      ? `${address.postal_code.slice(0, 5)}-${address.postal_code.slice(5)}`
      : address.postal_code;
  return [
    name,
    address.line1,
    address.line2 || null,
    `${address.city}, ${address.state} ${zip}`,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Read a stored jsonb back into the typed shape, or null if it is not an
 * address. Used wherever we read shipping_address off a row, including the
 * shop_orders fallback, whose rows were written by Stripe and are not
 * guaranteed to carry every field.
 */
export function parseStoredAddress(v: unknown): ShippingAddress | null {
  if (!v || typeof v !== "object") return null;
  const row = v as { name?: unknown; address?: unknown };
  if (!row.address || typeof row.address !== "object") return null;
  const a = row.address as Record<string, unknown>;
  const out = normalizeAddress({
    name: row.name,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
  });
  // A Stripe address with no street line is not usable as a suggestion.
  return out.address.line1 ? out : null;
}
