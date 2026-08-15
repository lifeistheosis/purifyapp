import { afterEach, describe, expect, it, vi } from "vitest";

import { readLocalSessionUser } from "../localSession";
import { NATIVE_SESSION_KEY } from "../nativeStore";

// The vitest env is node (no DOM), so stub the two storage globals the reader
// touches: document.cookie and localStorage. Values are set per test.
function stubStorage(cookie: string, ls: Record<string, string> = {}) {
  vi.stubGlobal("document", { cookie });
  const store = new Map(Object.entries(ls));
  vi.stubGlobal("localStorage", {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
  });
}

const REF = "sb-abcdefghijklmno-auth-token";
const session = (id: string, email: string) => ({
  access_token: "a",
  refresh_token: "r",
  expires_at: 9999999999,
  user: { id, email, user_metadata: { display_name: "Reader" } },
});

/** Cookie serialization mirrors document.cookie: "name=urlEncodedValue; …". */
function cookie(pairs: Record<string, string>): string {
  return Object.entries(pairs)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");
}

function base64UrlPrefixed(obj: unknown): string {
  const b64 = Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return "base64-" + b64;
}

afterEach(() => vi.unstubAllGlobals());

describe("readLocalSessionUser", () => {
  it("returns null when no auth-token storage exists", () => {
    stubStorage("");
    expect(readLocalSessionUser()).toBeNull();
  });

  it("reads a plain-JSON cookie session", () => {
    stubStorage(cookie({ [REF]: JSON.stringify(session("u1", "a@b.co")) }));
    const user = readLocalSessionUser();
    expect(user?.id).toBe("u1");
    expect(user?.email).toBe("a@b.co");
  });

  it("reads a base64url-prefixed cookie session (@supabase/ssr default)", () => {
    stubStorage(cookie({ [REF]: base64UrlPrefixed(session("u2", "c@d.co")) }));
    expect(readLocalSessionUser()?.id).toBe("u2");
  });

  it("reassembles a chunked cookie in index order", () => {
    const full = base64UrlPrefixed(session("u3", "e@f.co"));
    const mid = Math.floor(full.length / 2);
    // Deliberately out of order to prove the sort.
    stubStorage(
      cookie({ [`${REF}.1`]: full.slice(mid), [`${REF}.0`]: full.slice(0, mid) }),
    );
    expect(readLocalSessionUser()?.id).toBe("u3");
  });

  it("reads a localStorage session (older web, cookie name as the key)", () => {
    stubStorage("", { [REF]: JSON.stringify(session("u4", "g@h.co")) });
    expect(readLocalSessionUser()?.id).toBe("u4");
  });

  // The native shells keep the whole set under ONE key holding a {name,value}[]
  // array, which looks nothing like sb-<ref>-auth-token. Scanning key names
  // alone missed it, so this read returned null for every signed-in native user
  // and Profile/Security fell back to the async path it exists to avoid.
  it("reads the native shell's single-key store", () => {
    stubStorage("", {
      [NATIVE_SESSION_KEY]: JSON.stringify([
        { name: REF, value: base64UrlPrefixed(session("u5", "i@j.co")) },
      ]),
    });
    expect(readLocalSessionUser()?.id).toBe("u5");
  });

  it("reassembles a chunked native store in index order", () => {
    const full = base64UrlPrefixed(session("u6", "k@l.co"));
    const mid = Math.floor(full.length / 2);
    stubStorage("", {
      [NATIVE_SESSION_KEY]: JSON.stringify([
        { name: `${REF}.1`, value: full.slice(mid) },
        { name: `${REF}.0`, value: full.slice(0, mid) },
      ]),
    });
    expect(readLocalSessionUser()?.id).toBe("u6");
  });

  it("ignores a native store that is not an array of {name, value}", () => {
    stubStorage("", { [NATIVE_SESSION_KEY]: JSON.stringify({ not: "an array" }) });
    expect(readLocalSessionUser()).toBeNull();
    stubStorage("", { [NATIVE_SESSION_KEY]: JSON.stringify([{ name: REF }]) });
    expect(readLocalSessionUser()).toBeNull();
    stubStorage("", { [NATIVE_SESSION_KEY]: "{not json" });
    expect(readLocalSessionUser()).toBeNull();
  });

  it("returns null for a session with no user id (not signed in)", () => {
    stubStorage(cookie({ [REF]: JSON.stringify({ access_token: "a", user: null }) }));
    expect(readLocalSessionUser()).toBeNull();
  });

  it("returns null for malformed storage (caller falls back to the SDK)", () => {
    stubStorage(cookie({ [REF]: "base64-@@notvalid@@" }));
    expect(readLocalSessionUser()).toBeNull();
    stubStorage(cookie({ [REF]: "{not json" }));
    expect(readLocalSessionUser()).toBeNull();
  });
});
