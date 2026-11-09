// Where an admin's account stands in Community (Fable's release check 1, M4;
// Edgar's item 64). With the switch off, the email alone counts, exactly as
// before; with it on, an admin's account moderates only once its session has
// passed the panel's own second step, and until then it moderates by nothing,
// not even a badge it holds. Readers who moderate by badge never change.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { access_token: string },
  serverUser: null as null | Record<string, unknown>,
  askedWith: [] as (string | undefined)[],
  throws: false,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: {
      getSession: async () => ({ data: { session: state.session }, error: null }),
      getUser: async (jwt?: string) => {
        state.askedWith.push(jwt);
        if (state.throws) throw new Error("auth server down");
        return { data: { user: state.serverUser }, error: null };
      },
    },
  }),
}));

// moderation.ts reaches far (names, banners, notifications); only moderatorFor is tried here.
vi.mock("@/lib/profile/server", () => ({ identity: async () => ({ name: "Owner" }) }));
vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => undefined }));
vi.mock("../notify", () => ({
  insertNotifications: async () => undefined,
  notifyClergyOfQuestion: async () => undefined,
  notifyMentions: async () => undefined,
  notifyOfReply: async () => undefined,
}));

import { __setCommunityAdminNeedsCode, COMMUNITY_ADMIN_NEEDS_CODE, requestStanding, standingOf } from "../adminStanding";
import { moderatorFor } from "../moderation";
import { isStaff } from "../trustServer";

const OWNER = { id: "u-owner", email: "owner@example.com" };
const READER = { id: "u-reader", email: "reader@example.com" };
const TOTP = { id: "f1", factor_type: "totp", status: "verified" };

const token = (aal: string, sub = OWNER.id) => ["e30", Buffer.from(JSON.stringify({ aal, sub })).toString("base64url"), "sig"].join(".");
const bearer = (jwt: string) => new Request("https://purifyapp.net/api/community/mine", { headers: { authorization: `Bearer ${jwt}` } });
const cookieRequest = () => new Request("https://purifyapp.net/api/community/mine");

/** A service-role client that holds badges and says which tables it was asked. */
function fakeAdmin(badges: Record<string, string[]>) {
  const asked: string[] = [];
  const client = {
    from(table: string) {
      asked.push(table);
      let userId = "";
      const q = {
        select: () => q,
        eq: (_col: string, v: string) => {
          userId = v;
          return q;
        },
        in: () => q,
        limit: async () => ({ data: (badges[userId] ?? []).map((badge) => ({ badge })), error: null }),
        maybeSingle: async () => ({ data: { id: userId, display_name: "Owner", avatar_url: null }, error: null }),
      };
      return q;
    },
  };
  return { client: client as never, asked };
}

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@example.com";
  delete process.env.ADMIN_MFA;
  state.session = null;
  state.serverUser = null;
  state.askedWith = [];
  state.throws = false;
});

afterEach(() => __setCommunityAdminNeedsCode(COMMUNITY_ADMIN_NEEDS_CODE));

describe("the switch", () => {
  it("is off until Edgar's word", () => {
    expect(COMMUNITY_ADMIN_NEEDS_CODE).toBe(false);
  });
});

describe("with the switch off: the email alone, as before", () => {
  beforeEach(() => __setCommunityAdminNeedsCode(false));

  it("counts an admin's account as admin whatever the session, and asks the auth server nothing", async () => {
    state.serverUser = { ...OWNER, factors: [TOTP] };
    expect(await requestStanding(bearer(token("aal1")), OWNER)).toBe("admin");
    expect(state.askedWith).toEqual([]);
    expect(standingOf({ email: OWNER.email })).toBe("admin");
    expect(standingOf({ email: OWNER.email, standing: "held" })).toBe("admin");
  });

  it("lets the admin moderate, and is staff, with no badge read", async () => {
    const { client, asked } = fakeAdmin({});
    expect(await moderatorFor(client, OWNER)).toMatchObject({ id: OWNER.id, admin: true });
    expect(await isStaff(client, OWNER)).toBe(true);
    expect(asked).not.toContain("user_badges");
  });

  it("leaves readers to their badges", async () => {
    const { client } = fakeAdmin({ [READER.id]: ["moderator"] });
    expect(await requestStanding(bearer(token("aal1", READER.id)), READER)).toBe("reader");
    expect(await moderatorFor(client, READER)).toMatchObject({ id: READER.id, admin: false });
    expect(await isStaff(client, READER)).toBe(true);
    expect(await moderatorFor(fakeAdmin({}).client, READER)).toBeNull();
  });
});

describe("with the switch on: the panel's own rule", () => {
  beforeEach(() => __setCommunityAdminNeedsCode(true));

  it("counts an admin who has typed the code (aal2), from the token the auth server accepted", async () => {
    const jwt = token("aal2");
    state.serverUser = { ...OWNER, factors: [TOTP] };
    expect(await requestStanding(bearer(jwt), OWNER)).toBe("admin");
    expect(state.askedWith).toEqual([jwt]);
  });

  it("holds an admin with a code whose session has not typed it (aal1)", async () => {
    state.serverUser = { ...OWNER, factors: [TOTP] };
    expect(await requestStanding(bearer(token("aal1")), OWNER)).toBe("held");
  });

  it("keeps today's access for an admin with no code yet, until ADMIN_MFA=required", async () => {
    state.serverUser = { ...OWNER, factors: [] };
    expect(await requestStanding(bearer(token("aal1")), OWNER)).toBe("admin");
    process.env.ADMIN_MFA = "required";
    expect(await requestStanding(bearer(token("aal1")), OWNER)).toBe("held");
  });

  it("reads the website's cookie session when there is no bearer header", async () => {
    const jwt = token("aal2");
    state.session = { access_token: jwt };
    state.serverUser = { ...OWNER, factors: [TOTP] };
    expect(await requestStanding(cookieRequest(), OWNER)).toBe("admin");
    expect(state.askedWith).toEqual([jwt]);
  });

  it("holds what cannot be checked: no token, another account, or the auth server down", async () => {
    expect(await requestStanding(cookieRequest(), OWNER)).toBe("held");
    state.serverUser = { ...READER, email: OWNER.email, factors: [] };
    expect(await requestStanding(bearer(token("aal2")), OWNER)).toBe("held");
    state.serverUser = { ...OWNER, factors: [] };
    state.throws = true;
    expect(await requestStanding(bearer(token("aal2")), OWNER)).toBe("held");
  });

  it("never makes a reader an admin, whatever standing is handed in", async () => {
    expect(standingOf({ email: READER.email, standing: "admin" })).toBe("reader");
    expect(await requestStanding(bearer(token("aal2", READER.id)), READER)).toBe("reader");
    expect(state.askedWith).toEqual([]);
  });

  it("holds an admin's account nobody checked, and a held account moderates by nothing, not even its badge", async () => {
    const { client, asked } = fakeAdmin({ [OWNER.id]: ["team"] });
    expect(standingOf({ email: OWNER.email })).toBe("held");
    expect(await moderatorFor(client, OWNER)).toBeNull();
    expect(await moderatorFor(client, { ...OWNER, standing: "held" })).toBeNull();
    expect(await isStaff(client, { ...OWNER, standing: "held" })).toBe(false);
    expect(asked).toEqual([]);
  });

  it("lets a checked admin moderate as admin, as the console's routes hand it in", async () => {
    const { client } = fakeAdmin({});
    expect(await moderatorFor(client, { ...OWNER, standing: "admin" })).toMatchObject({ id: OWNER.id, admin: true });
    expect(await isStaff(client, { ...OWNER, standing: "admin" })).toBe(true);
  });

  it("leaves readers who moderate by badge as they were", async () => {
    const { client } = fakeAdmin({ [READER.id]: ["moderator"] });
    expect(await moderatorFor(client, READER)).toMatchObject({ id: READER.id, admin: false });
    expect(await isStaff(client, READER)).toBe(true);
  });
});
