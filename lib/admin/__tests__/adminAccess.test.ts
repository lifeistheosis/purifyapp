// The admin gate with the second sign-in step (A4). Every admin and owner
// route goes through getAdminUser, so this is the one place the rule has to
// hold: an admin who has added the code app is refused until the session is
// at aal2, and the facts behind that come from the auth server, not from the
// browser's own copy of the session.

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { access_token: string; user: Record<string, unknown> },
  serverUser: null as null | Record<string, unknown>,
  askedWith: [] as (string | undefined)[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getSession: async () => ({ data: { session: state.session }, error: null }),
      getUser: async (jwt?: string) => {
        state.askedWith.push(jwt);
        return { data: { user: state.serverUser }, error: null };
      },
    },
  }),
}));

import { adminAccess, getAdminUser } from "../access";

const token = (aal: string) => ["e30", Buffer.from(JSON.stringify({ aal, sub: "u1" })).toString("base64url"), "sig"].join(".");

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@example.com";
  delete process.env.ADMIN_MFA;
  state.session = null;
  state.serverUser = null;
  state.askedWith = [];
});

describe("adminAccess", () => {
  it("is none without a session, and asks the auth server nothing", async () => {
    expect(await adminAccess()).toEqual({ state: "none" });
    expect(state.askedWith).toEqual([]);
  });

  it("is none for a signed-in reader who is not an admin", async () => {
    state.session = { access_token: token("aal2"), user: {} };
    state.serverUser = { email: "reader@example.com", factors: [] };
    expect((await adminAccess()).state).toBe("none");
  });

  it("checks the session's own token with the auth server", async () => {
    const jwt = token("aal1");
    state.session = { access_token: jwt, user: {} };
    state.serverUser = { email: "owner@example.com", factors: [] };
    await adminAccess();
    expect(state.askedWith).toEqual([jwt]);
  });

  it("asks for the code when the account has one and the session is at aal1", async () => {
    state.session = { access_token: token("aal1"), user: { email: "owner@example.com", factors: [] } };
    // The browser's copy says no factor; the server says there is one. The server wins.
    state.serverUser = { email: "owner@example.com", factors: [{ status: "verified", factor_type: "totp" }] };
    expect((await adminAccess()).state).toBe("verify");
    expect(await getAdminUser()).toBeNull();
  });

  it("opens at aal2", async () => {
    state.session = { access_token: token("aal2"), user: {} };
    state.serverUser = { email: "owner@example.com", factors: [{ status: "verified" }] };
    expect((await adminAccess()).state).toBe("ok");
    expect((await getAdminUser())?.email).toBe("owner@example.com");
  });

  it("keeps today's access before the code is added, and asks for setup first when the server requires it", async () => {
    state.session = { access_token: token("aal1"), user: {} };
    state.serverUser = { email: "owner@example.com", factors: [{ status: "unverified" }] };
    expect((await adminAccess()).state).toBe("ok");
    process.env.ADMIN_MFA = "required";
    expect((await adminAccess()).state).toBe("enroll");
    expect(await getAdminUser()).toBeNull();
  });
});
