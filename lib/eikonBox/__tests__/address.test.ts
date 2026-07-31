import { describe, expect, it } from "vitest";
import {
  formatAddress,
  normalizeAddress,
  parseStoredAddress,
  validateAddress,
} from "@/lib/eikonBox/address";

const good = {
  name: "  Leona  Edgar ",
  line1: "123 Elm St",
  line2: "",
  city: "Austin",
  state: "tx",
  postalCode: "78701",
};

describe("normalizeAddress", () => {
  it("trims, collapses whitespace, and uppercases the state", () => {
    const a = normalizeAddress(good);
    expect(a.name).toBe("Leona Edgar");
    expect(a.address.state).toBe("TX");
  });

  it("stores an empty second line as null, not an empty string", () => {
    expect(normalizeAddress(good).address.line2).toBeNull();
  });

  it("strips punctuation out of the ZIP so 78701-1234 validates", () => {
    const a = normalizeAddress({ ...good, postalCode: "78701-1234" });
    expect(a.address.postal_code).toBe("787011234");
    expect(validateAddress(a)).toEqual({});
  });

  it("forces country to US, whatever it is handed", () => {
    expect(normalizeAddress(good).address.country).toBe("US");
  });

  it("does not throw on junk", () => {
    const a = normalizeAddress({ name: 42, line1: null, city: undefined });
    expect(a.name).toBe("");
    expect(Object.keys(validateAddress(a)).length).toBeGreaterThan(0);
  });
});

describe("validateAddress", () => {
  it("accepts a complete address", () => {
    expect(validateAddress(normalizeAddress(good))).toEqual({});
  });

  it("rejects a state that is not a real code", () => {
    const e = validateAddress(normalizeAddress({ ...good, state: "ZZ" }));
    expect(e.state).toBeDefined();
  });

  it("rejects a 4 digit ZIP", () => {
    const e = validateAddress(normalizeAddress({ ...good, postalCode: "7870" }));
    expect(e.postalCode).toBeDefined();
  });

  it("rejects a missing street line", () => {
    const e = validateAddress(normalizeAddress({ ...good, line1: "" }));
    expect(e.line1).toBeDefined();
  });

  it("names every bad field at once, so the form fills in one pass", () => {
    const e = validateAddress(
      normalizeAddress({ name: "", line1: "", city: "", state: "", postalCode: "" }),
    );
    expect(Object.keys(e).sort()).toEqual([
      "city",
      "line1",
      "name",
      "postalCode",
      "state",
    ]);
  });
});

describe("formatAddress", () => {
  it("renders one line and hyphenates a ZIP+4", () => {
    const a = normalizeAddress({ ...good, postalCode: "787011234" });
    expect(formatAddress(a)).toBe("Leona Edgar, 123 Elm St, Austin, TX 78701-1234");
  });

  it("omits an absent second line rather than leaving a gap", () => {
    expect(formatAddress(normalizeAddress(good))).not.toContain(", ,");
  });
});

describe("parseStoredAddress", () => {
  it("reads back what Stripe's webhook wrote onto a shop order", () => {
    const stripe = {
      name: "Leona Edgar",
      address: {
        line1: "123 Elm St",
        line2: null,
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        country: "US",
      },
    };
    const a = parseStoredAddress(stripe);
    expect(a).not.toBeNull();
    expect(validateAddress(a!)).toEqual({});
  });

  it("returns null for an address with no street line, so it is never suggested", () => {
    expect(
      parseStoredAddress({ name: "X", address: { city: "Austin", state: "TX" } }),
    ).toBeNull();
  });

  it("returns null for junk", () => {
    expect(parseStoredAddress(null)).toBeNull();
    expect(parseStoredAddress("nope")).toBeNull();
    expect(parseStoredAddress({})).toBeNull();
  });
});
