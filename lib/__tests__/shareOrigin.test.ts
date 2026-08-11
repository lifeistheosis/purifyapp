// The origin of a link the reader copies out of the app.
//
// Reported on Android 2026-08-11: every "copy link" and every share sheet
// handed back `https://localhost/...`. The Capacitor shell serves the bundled
// export from `https://localhost` (Android) and `capacitor://localhost` (iOS),
// so any link built from `window.location` resolves nowhere on the recipient's
// device, and nowhere on the sender's either once the app is closed. iOS was
// never exempt: same code, same shell.
//
// This is the confirmation-email bug of lib/__tests__/authOrigin.test.ts one
// surface over. `authOrigin()` was written for it in July; the copy-link and
// share call sites were never moved onto the same footing, and the source
// guard there is scoped to `emailRedirectTo`, so nothing caught them.
//
// Two things are pinned here:
//   1. shareOrigin()/shareLink() branching, including the https://localhost
//      case that is the native shell and NOT local development.
//   2. A source guard: no component that copies or shares a link may build it
//      from window.location.
//
// The guard exempts components/auth. OAuth's `redirectTo` legitimately reads
// window.location.origin, because PKCE stores its verifier on the origin that
// starts the flow and the callback has to come back to that same origin. See
// the same carve-out in authOrigin.test.ts.

import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { SITE_URL, shareCurrentLink, shareLink, shareOrigin } from "@/lib/site";

const ROOT = process.cwd();

function withLocation(
  origin: string | null,
  fn: () => void,
  href?: string,
) {
  const had = "window" in globalThis;
  const prev = (globalThis as { window?: unknown }).window;
  if (origin === null) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = {
      location: { origin, href: href ?? `${origin}/` },
    };
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
  vi.unstubAllEnvs();
});

describe("shareOrigin", () => {
  it("returns the canonical host inside the Android shell (the bug this fixes)", () => {
    withLocation("https://localhost", () => {
      expect(shareOrigin()).toBe(SITE_URL);
      expect(shareOrigin().startsWith("https://localhost")).toBe(false);
    });
  });

  it("returns the canonical host inside the iOS shell", () => {
    withLocation("capacitor://localhost", () => {
      expect(shareOrigin()).toBe(SITE_URL);
    });
  });

  it("stays canonical in the shell even on a development build", () => {
    // The hardening over authOrigin(): a dev build running inside the shell
    // still reports https://localhost, and that must not read as "local web
    // development". Both conditions have to hold, not either one.
    vi.stubEnv("NODE_ENV", "development");
    for (const origin of ["https://localhost", "capacitor://localhost", "ionic://localhost"]) {
      withLocation(origin, () => {
        expect(shareOrigin(), origin).toBe(SITE_URL);
      });
    }
  });

  it("returns the canonical host on a deployed web origin", () => {
    withLocation("https://purifyapp.net", () => {
      expect(shareOrigin()).toBe(SITE_URL);
    });
  });

  it("returns the canonical host on the server, where there is no window", () => {
    withLocation(null, () => {
      expect(shareOrigin()).toBe(SITE_URL);
    });
  });

  it("keeps local web development self-contained", () => {
    vi.stubEnv("NODE_ENV", "development");
    withLocation("http://localhost:3022", () => {
      expect(shareOrigin()).toBe("http://localhost:3022");
    });
    withLocation("http://127.0.0.1:3000", () => {
      expect(shareOrigin()).toBe("http://127.0.0.1:3000");
    });
  });

  it("honors the force-native escape hatch so a dev browser can walk the flow", () => {
    // Without this, `purify:force-native` simulates the shell everywhere
    // except the one place the bug lived, and the only way to verify a copy
    // link is to install an APK.
    vi.stubEnv("NODE_ENV", "development");
    withLocation("http://localhost:3022", () => {
      const w = (globalThis as { window?: { localStorage?: unknown } }).window!;
      w.localStorage = { getItem: (k: string) => (k === "purify:force-native" ? "1" : null) };
      expect(shareOrigin()).toBe(SITE_URL);
      w.localStorage = { getItem: () => null };
      expect(shareOrigin()).toBe("http://localhost:3022");
    });
  });

  it("never resolves to a localhost host outside development", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const origin of ["http://localhost:3022", "https://localhost", "capacitor://localhost"]) {
      withLocation(origin, () => {
        expect(/localhost|127\./.test(shareOrigin()), origin).toBe(false);
      });
    }
  });
});

describe("shareLink", () => {
  it("builds a canonical absolute URL from a root-relative path", () => {
    withLocation("https://localhost", () => {
      expect(shareLink("/bible/genesis/1#v3")).toBe(`${SITE_URL}/bible/genesis/1#v3`);
      expect(shareLink("/saints/basil/on-the-holy-spirit#p-2-4")).toBe(
        `${SITE_URL}/saints/basil/on-the-holy-spirit#p-2-4`,
      );
    });
  });

  it("strips the host off an absolute shell URL instead of trusting it", () => {
    withLocation("https://localhost", () => {
      expect(shareLink("https://localhost/history/nicaea/")).toBe(
        `${SITE_URL}/history/nicaea`,
      );
      expect(shareLink("capacitor://localhost/history/nicaea/")).toBe(
        `${SITE_URL}/history/nicaea`,
      );
    });
  });

  it("normalizes what trailingSlash:true and on-disk serving produce", () => {
    // The native export is built with trailingSlash:true, so the shell's
    // pathname carries a trailing slash and can resolve to index.html.
    // purifyapp.net serves neither form as canonical.
    withLocation("https://localhost", () => {
      expect(shareLink("/history/nicaea/")).toBe(`${SITE_URL}/history/nicaea`);
      expect(shareLink("/history/nicaea/index.html")).toBe(`${SITE_URL}/history/nicaea`);
      expect(shareLink("/")).toBe(`${SITE_URL}/`);
    });
  });

  it("preserves query and hash", () => {
    withLocation("https://localhost", () => {
      expect(shareLink("/bible/genesis/1/?translation=kjv#v3")).toBe(
        `${SITE_URL}/bible/genesis/1?translation=kjv#v3`,
      );
    });
  });
});

describe("shareCurrentLink", () => {
  it("rewrites the shell's own href onto the canonical host", () => {
    withLocation(
      "https://localhost",
      () => {
        expect(shareCurrentLink()).toBe(`${SITE_URL}/prayers/anthem`);
      },
      "https://localhost/prayers/anthem/",
    );
  });

  it("is unchanged on the deployed site", () => {
    withLocation(
      "https://purifyapp.net",
      () => {
        expect(shareCurrentLink()).toBe(`${SITE_URL}/prayers/anthem`);
      },
      "https://purifyapp.net/prayers/anthem",
    );
  });
});

describe("share link source guard", () => {
  it("is never built from window.location", () => {
    const SINK = /navigator\s*\.\s*(clipboard\s*\.\s*writeText|share)\s*\(/;
    // A read, not the navigation assignment `window.location.href = "/x"`,
    // which is a different thing and legitimate.
    const READ = /window\s*\.\s*location\s*\.\s*(origin|href)\s*(?!=[^=])/;
    const offenders: string[] = [];
    const stack = ["components", "app"];
    while (stack.length) {
      const cur = stack.pop()!;
      const abs = path.join(ROOT, cur);
      if (!fs.existsSync(abs)) continue;
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = path.posix.join(cur, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") continue;
          // PKCE: see the header note.
          if (rel === "components/auth") continue;
          stack.push(rel);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const src = fs
          .readFileSync(path.join(ROOT, rel), "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "");
        if (SINK.test(src) && READ.test(src)) offenders.push(rel);
      }
    }
    expect(
      [...new Set(offenders)],
      `A copied or shared link only exists to leave the device. Inside the ` +
        `Capacitor shell window.location is https://localhost (Android) or ` +
        `capacitor://localhost (iOS), so a link built from it is dead on ` +
        `arrival for the person you sent it to. Use shareLink() or ` +
        `shareCurrentLink() from lib/site.ts.`,
    ).toEqual([]);
  });
});
