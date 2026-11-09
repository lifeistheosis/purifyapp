import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Where the app reports to the admin's two lists (A10, A11), wired by the
 * Updates chat: the errors list from the root frame, the error boundaries and
 * the API calls; the searches that found nothing from the one search.
 */

vi.mock("@/lib/errors/report", () => ({ reportError: vi.fn() }));

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the errors list's ears (A10)", () => {
  it("leaves out what no reader met", async () => {
    const { noise } = await import("@/components/errors/ErrorReportBridge");
    expect(noise("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(noise("ResizeObserver loop limit exceeded")).toBe(true);
    expect(noise("Script error.")).toBe(true);
    expect(noise("The user aborted a request.", "AbortError")).toBe(true);
    expect(noise("Cannot read properties of undefined (reading 'map')", "TypeError")).toBe(false);
    expect(noise(undefined)).toBe(false);
  });

  it("is mounted once, in the root frame", () => {
    const frame = source("components/layout/RootFrame.tsx");
    expect(frame.match(/<ErrorReportBridge \/>/g)?.length).toBe(1);
  });

  it("hears the error boundaries", () => {
    expect(source("app/error.tsx")).toMatch(/reportError\(\{ source: "screen", message: error \}\)/);
    expect(source("components/ui/ClientErrorBoundary.tsx")).toMatch(/reportError\(\{ source: "screen", message: error \}\)/);
  });

  it("reports an API call that fails on the server's side, by its route alone", async () => {
    const { reportError } = await import("@/lib/errors/report");
    const { apiFetch } = await import("@/lib/api/client");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const res = await apiFetch("/api/journal/share?words=private");
    expect(res.status).toBe(503);
    expect(reportError).toHaveBeenCalledWith({ source: "request", status: 503, message: "/api/journal/share" });
  });

  it("says nothing of a call that answers, or that the reader was refused", async () => {
    const { reportError } = await import("@/lib/errors/report");
    const { apiFetch } = await import("@/lib/api/client");
    for (const status of [200, 401, 404, 429]) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status })));
      await apiFetch("/api/anything");
    }
    expect(reportError).not.toHaveBeenCalled();
  });
});

describe("the searches that found nothing (A11)", () => {
  it("are reported from the one search, once the words have settled and the lists arrived", () => {
    const palette = source("components/search/CommandPalette.tsx");
    expect(palette).toMatch(/reportSearchMiss\(q, locale\)/);
    // Only when nothing at all was found, and never before the lists are in.
    expect(palette).toMatch(/if \(!open \|\| !q \|\| !lists \|\| found\.length > 0\) return;/);
    expect(palette).toMatch(/window\.setTimeout\(\(\) => reportSearchMiss\(q, locale\), 1500\)/);
  });
});
