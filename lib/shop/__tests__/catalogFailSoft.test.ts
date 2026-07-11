import { describe, expect, it, vi } from "vitest";

// supabase-js THROWS (TypeError: fetch failed) when the host is unreachable —
// it does not return an error object. The public catalog reads must swallow
// that and return their empty values: an uncaught throw inside
// generateMetadata 500s the page shell before the shop layout's flag gate can
// 404 it (CI #318, /shop/eikon).
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    const reject = () => Promise.reject(new TypeError("fetch failed"));
    // Thenable query builder: every chained filter returns the builder, and
    // awaiting it (or .maybeSingle()) surfaces the network failure.
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "range", "limit"]) {
      builder[m] = () => builder;
    }
    builder.maybeSingle = reject;
    builder.then = (_: unknown, onRejected?: (e: unknown) => unknown) =>
      reject().catch(onRejected);
    return { from: () => builder };
  },
}));

import { getProduct, getStore, listProducts } from "../catalog";

describe("catalog reads when the database host is unreachable", () => {
  it("getStore returns null instead of throwing", async () => {
    await expect(getStore("eikon")).resolves.toBeNull();
  });

  it("getProduct returns null instead of throwing", async () => {
    await expect(getProduct("some-icon")).resolves.toBeNull();
  });

  it("listProducts returns [] instead of throwing", async () => {
    await expect(listProducts({ storeSlug: "eikon" })).resolves.toEqual([]);
  });
});
