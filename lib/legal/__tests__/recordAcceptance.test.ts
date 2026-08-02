// Acceptance recording must fail loudly, and no sign-up path may swallow it.
//
// The original was `void fetch(...).catch(() => {})`: relative path the native
// shell cannot reach, not awaited, empty catch. Every account created in the
// Android app has no terms_acceptances row and nothing reported it.
//
// Two things are pinned. First the helper's own contract, which is that only
// an explicit `{ ok: true }` counts. Second, by reading source, that neither
// sign-up path has quietly gone back to fire-and-forget, because that is the
// change that would silently reopen the hole.

import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CALL_SITES = [
  "components/onboarding/OnboardingFlow.tsx",
  "components/auth/SignUpForm.tsx",
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** Load the helper with apiFetch stubbed to a given response or rejection. */
async function withApiFetch(impl: () => Promise<Response>) {
  vi.doMock("@/lib/api/client", () => ({ apiFetch: impl }));
  return await import("../recordAcceptance");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("recordAcceptance", () => {
  it("resolves only when the server confirms with ok: true", async () => {
    const { recordAcceptance } = await withApiFetch(async () =>
      json({ ok: true }),
    );
    await expect(
      recordAcceptance("signup", "a@example.com"),
    ).resolves.toBeUndefined();
  });

  it("throws when the write failed, even though the status is 200", async () => {
    // The route answers 200 { ok: false } on an insert failure, which is
    // exactly the case a status-only check would call success.
    const { recordAcceptance, AcceptanceNotRecordedError } =
      await withApiFetch(async () => json({ ok: false }));
    await expect(
      recordAcceptance("signup", "a@example.com"),
    ).rejects.toBeInstanceOf(AcceptanceNotRecordedError);
  });

  it("throws when the shell answers with something that is not JSON", async () => {
    const { recordAcceptance, AcceptanceNotRecordedError } =
      await withApiFetch(
        async () =>
          new Response("<!doctype html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      );
    await expect(
      recordAcceptance("signup", "a@example.com"),
    ).rejects.toBeInstanceOf(AcceptanceNotRecordedError);
  });

  it("throws when the request itself fails", async () => {
    const { recordAcceptance, AcceptanceNotRecordedError } =
      await withApiFetch(async () => {
        throw new TypeError("network down");
      });
    await expect(
      recordAcceptance("signup", "a@example.com"),
    ).rejects.toBeInstanceOf(AcceptanceNotRecordedError);
  });

  it("throws on a 4xx/5xx even if the body says ok", async () => {
    const { recordAcceptance, AcceptanceNotRecordedError } =
      await withApiFetch(async () => json({ ok: true }, 429));
    await expect(
      recordAcceptance("signup", "a@example.com"),
    ).rejects.toBeInstanceOf(AcceptanceNotRecordedError);
  });
});

describe("sign-up call sites", () => {
  it("never fire-and-forget the acceptance", () => {
    const offenders: string[] = [];
    for (const rel of CALL_SITES) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      if (/void\s+fetch\(\s*["'`]\/api\/legal\/accept/.test(src)) {
        offenders.push(`${rel}: void fetch to /api/legal/accept`);
      }
      if (/legal\/accept[\s\S]{0,200}?\.catch\(\(\)\s*=>\s*\{\s*\}\)/.test(src)) {
        offenders.push(`${rel}: empty catch around the acceptance call`);
      }
      if (!/recordAcceptance/.test(src)) {
        offenders.push(`${rel}: does not use recordAcceptance`);
      }
    }
    expect(
      offenders,
      `An account must never be created without its acceptance recorded.\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("awaits the acceptance before creating the account", () => {
    for (const rel of CALL_SITES) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      const accept = src.indexOf("recordAcceptance(");
      const signUp = src.indexOf("auth.signUp(");
      expect(accept, `${rel}: no recordAcceptance call`).toBeGreaterThan(-1);
      expect(signUp, `${rel}: no signUp call`).toBeGreaterThan(-1);
      expect(
        accept,
        `${rel}: acceptance must be recorded before the account exists`,
      ).toBeLessThan(signUp);
      expect(src).toMatch(/await\s+recordAcceptance\(/);
    }
  });
});
