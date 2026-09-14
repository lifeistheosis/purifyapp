import { describe, expect, it } from "vitest";

import { isPrivateHost, safeOutboundUrl } from "../outboundUrl";

describe("isPrivateHost", () => {
  it("refuses the machine itself and its neighbours", () => {
    for (const h of [
      "localhost",
      "api.localhost",
      "printer.local",
      "db.internal",
      "127.0.0.1",
      "0.0.0.0",
      "10.0.0.7",
      "192.168.1.4",
      "172.16.9.9",
      "172.31.255.255",
      "100.100.0.1",
      "::1",
      "fd00:1234::1",
      "fe80::1",
    ]) {
      expect(isPrivateHost(h), h).toBe(true);
    }
  });

  it("refuses the cloud metadata address, which is the one that hurts", () => {
    expect(isPrivateHost("169.254.169.254")).toBe(true);
  });

  it("allows an ordinary public host", () => {
    for (const h of ["distributor.example", "shop.co.uk", "8.8.8.8", "172.32.0.1", "192.169.0.1"]) {
      expect(isPrivateHost(h), h).toBe(false);
    }
  });
});

describe("safeOutboundUrl", () => {
  it("takes a link with or without the scheme", () => {
    const bare = safeOutboundUrl("distributor.example/products/censer");
    expect("url" in bare && bare.url.toString()).toBe("https://distributor.example/products/censer");
    const full = safeOutboundUrl("http://distributor.example/x");
    expect("url" in full && full.url.protocol).toBe("http:");
  });

  it("turns away everything that is not an outward web fetch", () => {
    expect(safeOutboundUrl("")).toEqual({ error: "Paste a link first." });
    expect(safeOutboundUrl("file:///c:/windows/system32")).toHaveProperty("error");
    expect(safeOutboundUrl("javascript:alert(1)")).toHaveProperty("error");
    expect(safeOutboundUrl("http://localhost:3022/admin")).toHaveProperty("error");
    expect(safeOutboundUrl("https://distributor.example:8080/x")).toHaveProperty("error");
    expect(safeOutboundUrl("https://user:pass@distributor.example/x")).toHaveProperty("error");
    expect(safeOutboundUrl("http://169.254.169.254/latest/meta-data/")).toHaveProperty("error");
  });
});
