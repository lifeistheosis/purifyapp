// The origin Supabase is told to put in a confirmation email.
//
// Inside the Capacitor shell `window.location.origin` is `https://localhost`.
// A confirmation link pointing there resolves nowhere, on any device, forever
// — so every account created through in-app onboarding with email confirmation
// enabled was unconfirmable. `authOrigin()` (lib/site.ts) exists to prevent
// exactly that, and OnboardingFlow was the one auth call site not using it.
//
// Two things are pinned here:
//   1. authOrigin's branching, including the https://localhost case that is
//      the native shell and NOT local development.
//   2. A source guard: `emailRedirectTo` must never be built from
//      window.location.origin.
//
// The guard is deliberately narrower than "no auth redirect may use
// window.location.origin", because OAuth's `redirectTo` legitimately must
// (components/auth/OAuthButtons.tsx:54-62 — PKCE stores its verifier on the
// origin that starts the flow, so the callback has to return to that same
// origin). An emailed confirmation link has no such constraint: it is opened
// later, often on another device, so it must always carry the canonical host.

import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { SITE_URL, authOrigin } from "@/lib/site";

const ROOT = process.cwd();

function withOrigin(origin: string | null, fn: () => void) {
  const had = "window" in globalThis;
  const prev = (globalThis as { window?: unknown }).window;
  if (origin === null) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = { location: { origin } };
  }
  try {
    fn();
  } finally {
    if (had) (globalThis as { window?: unknown }).window = prev;
    else delete (globalThis as { window?: unknown }).window;
  }
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("authOrigin", () => {
  it("returns the canonical host inside the Android shell (the bug this fixes)", () => {
    withOrigin("https://localhost", () => {
      expect(authOrigin()).toBe(SITE_URL);
      expect(authOrigin()).not.toBe("https://localhost");
      expect(authOrigin().startsWith("https://localhost")).toBe(false);
    });
  });

  it("returns the canonical host inside the iOS shell", () => {
    withOrigin("capacitor://localhost", () => {
      expect(authOrigin()).toBe(SITE_URL);
    });
  });

  it("returns the canonical host on a deployed web origin", () => {
    withOrigin("https://purifyapp.net", () => {
      expect(authOrigin()).toBe(SITE_URL);
    });
  });

  it("keeps local web development self-contained", () => {
    withOrigin("http://localhost:3000", () => {
      expect(authOrigin()).toBe("http://localhost:3000");
    });
    withOrigin("http://127.0.0.1:3000", () => {
      expect(authOrigin()).toBe("http://127.0.0.1:3000");
    });
  });

  it("returns the canonical host on the server, where there is no window", () => {
    withOrigin(null, () => {
      expect(authOrigin()).toBe(SITE_URL);
    });
  });

  it("never resolves to a localhost host in any shell case", () => {
    for (const origin of ["https://localhost", "capacitor://localhost", "ionic://localhost"]) {
      withOrigin(origin, () => {
        expect(/^https?:\/\/localhost/.test(authOrigin()), origin).toBe(false);
      });
    }
  });
});

describe("emailRedirectTo source guard", () => {
  it("is never built from window.location.origin", () => {
    const offenders: string[] = [];
    const stack = ["components", "app", "lib"];
    while (stack.length) {
      const cur = stack.pop()!;
      const abs = path.join(ROOT, cur);
      if (!fs.existsSync(abs)) continue;
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = path.posix.join(cur, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          stack.push(rel);
        } else if (/\.tsx?$/.test(entry.name)) {
          const src = fs
            .readFileSync(path.join(ROOT, rel), "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
          // The whole template literal assigned to emailRedirectTo.
          const m = /emailRedirectTo\s*:\s*`([^`]*)`/g;
          let hit: RegExpExecArray | null;
          while ((hit = m.exec(src))) {
            if (/window\.location\.origin/.test(hit[1])) offenders.push(rel);
          }
          // …and the indirect form, where a local `origin` was assigned from it.
          if (
            /emailRedirectTo/.test(src) &&
            /const\s+origin\s*=\s*window\.location\.origin/.test(src)
          ) {
            offenders.push(rel);
          }
        }
      }
    }
    expect(
      [...new Set(offenders)],
      `A confirmation email is opened later, often on another device, so its ` +
        `link must carry the canonical host. Inside the Capacitor shell ` +
        `window.location.origin is https://localhost and the link is dead on ` +
        `arrival. Use authOrigin() from lib/site.ts.`,
    ).toEqual([]);
  });
});
