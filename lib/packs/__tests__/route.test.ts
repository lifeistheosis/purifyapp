import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/whatsNew/boardLive", async () => {
  const { currentBoardMessage } = await import("@/lib/whatsNew/board");
  return { getBoardMessage: async () => ({ message: currentBoardMessage(), fromFallback: true }) };
});

import { GET, OPTIONS } from "@/app/api/packs/route";
import { readPacks } from "@/lib/packs/types";

const ask = (origin?: string) =>
  new Request("https://purifyapp.net/api/packs", { headers: origin ? { origin } : {} });

describe("/api/packs", () => {
  it("answers both phone shells across origins, and a website visitor without", async () => {
    for (const origin of ["https://localhost", "capacitor://localhost"]) {
      const res = await GET(ask(origin));
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin"), origin).toBe(origin);
      expect(res.headers.get("vary")).toMatch(/origin/i);
    }
    const web = await GET(ask("https://example.com"));
    expect(web.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers what the apps read whole, kept five minutes", async () => {
    const res = await GET(ask("https://localhost"));
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    const read = readPacks(await res.json());
    expect(read?.packs["verse-of-day"]).toBeDefined();
    expect(read?.packs.board).toBeDefined();
  });

  it("answers a preflight for the shells", async () => {
    const res = OPTIONS(new Request("https://purifyapp.net/api/packs", { method: "OPTIONS", headers: { origin: "https://localhost" } }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://localhost");
  });
});
