import { describe, expect, it } from "vitest";

import { trackingLink } from "../trackingLink";

describe("trackingLink", () => {
  it("detects UPS 1Z numbers", () => {
    const l = trackingLink("1Z999AA10123456784");
    expect(l?.carrier).toBe("UPS");
    expect(l?.url).toContain("ups.com");
  });

  it("detects USPS 9x barcodes before FedEx digit-length rules", () => {
    const l = trackingLink("9400111899223197428490");
    expect(l?.carrier).toBe("USPS");
    expect(l?.url).toContain("usps.com");
  });

  it("detects USPS international format", () => {
    expect(trackingLink("EC123456789US")?.carrier).toBe("USPS");
  });

  it("detects FedEx and DHL digit formats", () => {
    expect(trackingLink("123456789012")?.carrier).toBe("FedEx");
    expect(trackingLink("1234567890")?.carrier).toBe("DHL");
  });

  it("ignores whitespace and lowercases", () => {
    const l = trackingLink("1z 999 aa1 0123 456 784");
    expect(l?.carrier).toBe("UPS");
    expect(l?.url).toContain("1Z999AA10123456784");
  });

  it("falls back to the universal tracker for supplier-routed formats", () => {
    const l = trackingLink("YT2521721272099999");
    expect(l?.carrier).toBeNull();
    expect(l?.url).toContain("t.17track.net");
  });

  it("returns null for empty input", () => {
    expect(trackingLink("   ")).toBeNull();
  });
});
