import { describe, expect, it, vi } from "vitest";

import { AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";

import { resolveUser } from "../resolveUser";

// The resolver's whole job is classifying what getUser() does, so the client
// is a stub per test case.
const getUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: () => getUser() } }),
}));

describe("resolveUser", () => {
  it("reports signed-in when getUser settles with a user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const auth = await resolveUser(50);
    expect(auth).toEqual({ state: "signed-in", user: { id: "u1" } });
  });

  it("reports signed-out when there is no session", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    expect(await resolveUser(50)).toEqual({ state: "signed-out" });
  });

  it("reports signed-out on a genuine auth failure (expired token)", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthApiError", message: "refresh_token_not_found" },
    });
    expect(await resolveUser(50)).toEqual({ state: "signed-out" });
  });

  it("reports unresolved on a retryable fetch failure, never signed-out", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError("fetch failed", 0),
    });
    expect(await resolveUser(50)).toEqual({ state: "unresolved" });
  });

  it("reports unresolved when getUser hangs past the deadline (auth lock)", async () => {
    getUser.mockReturnValue(new Promise(() => {})); // never settles
    expect(await resolveUser(30)).toEqual({ state: "unresolved" });
  });

  it("reports unresolved when getUser throws", async () => {
    getUser.mockRejectedValue(new Error("boom"));
    expect(await resolveUser(50)).toEqual({ state: "unresolved" });
  });
});
