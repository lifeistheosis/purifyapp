import { describe, expect, it } from "vitest";

import { buildPayload, DATA_SLOT, injectPayload, scriptSafeJson } from "../payload";
import { pageAll } from "@/lib/supabase/pageAll";

describe("scriptSafeJson", () => {
  const tricky = {
    close: "</script><script>alert(1)</script>",
    comment: "<!-- -->",
    amp: "a & b",
    separators: `line${String.fromCharCode(0x2028)}para${String.fromCharCode(0x2029)}`,
  };

  it("leaves nothing that can end or break the script element", () => {
    const out = scriptSafeJson(tricky);
    expect(out).not.toMatch(/[<>&]/);
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(out).not.toContain(String.fromCharCode(0x2029));
  });

  it("round-trips through JSON.parse unchanged", () => {
    expect(JSON.parse(scriptSafeJson(tricky))).toEqual(tricky);
  });
});

describe("injectPayload", () => {
  it("fills the slot with the payload", () => {
    const html = `<main></main>${DATA_SLOT}<script></script>`;
    const out = injectPayload(html, buildPayload(null));
    expect(out).not.toContain(DATA_SLOT);
    const json = out.slice(out.indexOf('type="application/json">') + 24, out.indexOf("</script>"));
    const parsed = JSON.parse(json);
    expect(parsed.live).toBeNull();
    expect(parsed.pace).toBeNull();
    expect(parsed.plan.years.map((y: { total: number }) => y.total)).toEqual([102_000, 250_000, 500_000]);
  });

  it("leaves a page without the slot untouched", () => {
    expect(injectPayload("<p>no slot</p>", buildPayload(null))).toBe("<p>no slot</p>");
  });
});

describe("pageAll", () => {
  it("keeps asking until a page comes back short", async () => {
    const rows = Array.from({ length: 2_345 }, (_, i) => i);
    const asked: [number, number][] = [];
    const out = await pageAll<number>(async (from, to) => {
      asked.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });
    expect(out).toEqual(rows);
    expect(asked).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("surfaces an error instead of returning a short list", async () => {
    await expect(
      pageAll(async () => ({ data: null, error: { message: "boom" } })),
    ).rejects.toThrow("boom");
  });
});
