import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";

import { resolveUser } from "../resolveUser";

// The resolver classifies what getSession() returns (the LOCAL session, no
// network for a valid token — that is the whole point of the F-13 fix), so the
// client is a stub per test case.
const getSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: () => getSession() } }),
}));

const readLocalSessionUser = vi.fn();
vi.mock("@/lib/supabase/localSession", () => ({
  readLocalSessionUser: () => readLocalSessionUser(),
}));

describe("resolveUser", () => {
  // Default: no persisted local session, so the getSession-based tests below
  // fall through to their mocks. The fast-path test overrides this.
  beforeEach(() => {
    readLocalSessionUser.mockReturnValue(null);
  });

  it("returns signed-in from the persisted local session WITHOUT calling getSession (hang-proof fast path)", async () => {
    readLocalSessionUser.mockReturnValue({ id: "u0", email: "z@z.co" });
    const auth = await resolveUser(50);
    expect(auth).toEqual({ state: "signed-in", user: { id: "u0", email: "z@z.co" } });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("reports signed-in from a local session, with no network call", async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    const auth = await resolveUser(50);
    expect(auth).toEqual({ state: "signed-in", user: { id: "u1" } });
  });

  it("reports signed-out when there is no session", async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthSessionMissingError(),
    });
    expect(await resolveUser(50)).toEqual({ state: "signed-out" });
  });

  it("reports signed-out on a clean empty result (genuinely not signed in)", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await resolveUser(50)).toEqual({ state: "signed-out" });
  });

  it("reports unresolved on a retryable fetch failure (refresh could not reach the server), never signed-out", async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError("fetch failed", 0),
    });
    expect(await resolveUser(50)).toEqual({ state: "unresolved" });
  });

  it("reports unresolved when the session read hangs past the deadline (auth lock)", async () => {
    getSession.mockReturnValue(new Promise(() => {})); // never settles
    expect(await resolveUser(30)).toEqual({ state: "unresolved" });
  });

  it("reports unresolved when getSession throws", async () => {
    getSession.mockRejectedValue(new Error("boom"));
    expect(await resolveUser(50)).toEqual({ state: "unresolved" });
  });
});
