import { describe, expect, it } from "vitest";

import { emailsByUserId, findUserByEmail } from "@/lib/admin/users";

type FakeUser = { id: string; email?: string; user_metadata?: unknown };

/**
 * Minimal stand-in for the service-role client. Only auth.admin.listUsers is
 * exercised, which is the whole surface these helpers touch.
 */
function fakeAdmin(pages: FakeUser[][], failOnPage?: number) {
  let calls = 0;
  const client = {
    auth: {
      admin: {
        listUsers: async ({ page }: { page: number; perPage: number }) => {
          calls += 1;
          if (failOnPage === page) {
            return { data: null, error: { message: "service role rejected" } };
          }
          return { data: { users: pages[page - 1] ?? [] }, error: null };
        },
      },
    },
  };
  return { client, calls: () => calls };
}

const u = (id: string, email: string, meta?: unknown): FakeUser => ({
  id,
  email,
  user_metadata: meta,
});

describe("findUserByEmail", () => {
  it("finds an account on the first page", async () => {
    const { client } = fakeAdmin([[u("a", "one@x.com"), u("b", "two@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await findUserByEmail(client as any, "two@x.com");
    expect(hit).toEqual({ id: "b", email: "two@x.com", name: null });
  });

  it("matches case-insensitively and trims the input", async () => {
    const { client } = fakeAdmin([[u("a", "Reader@Purify.app")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await findUserByEmail(client as any, "  READER@purify.app  ");
    expect(hit?.id).toBe("a");
  });

  it("pulls a display name out of user_metadata", async () => {
    const { client } = fakeAdmin([[u("a", "e@x.com", { full_name: "Reader One" })]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await findUserByEmail(client as any, "e@x.com");
    expect(hit?.name).toBe("Reader One");
  });

  it("pages until it finds the account", async () => {
    const full = Array.from({ length: 200 }, (_, i) => u(`p1-${i}`, `p1-${i}@x.com`));
    const { client, calls } = fakeAdmin([full, [u("target", "found@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await findUserByEmail(client as any, "found@x.com");
    expect(hit?.id).toBe("target");
    expect(calls()).toBe(2);
  });

  it("stops paging once a short page proves it reached the end", async () => {
    const { client, calls } = fakeAdmin([[u("a", "one@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hit = await findUserByEmail(client as any, "absent@x.com");
    expect(hit).toBeNull();
    expect(calls()).toBe(1);
  });

  it("returns null when no account matches", async () => {
    const { client } = fakeAdmin([[u("a", "one@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await findUserByEmail(client as any, "nobody@x.com")).toBeNull();
  });

  // The regression. The gift route used to query profiles.email, which does not
  // exist, then drop the PostgREST error and report "no such account" for every
  // address. A directory failure must be loud and distinguishable from a miss.
  it("throws rather than reporting a lookup failure as 'not found'", async () => {
    const { client } = fakeAdmin([[]], 1);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUserByEmail(client as any, "real@x.com"),
    ).rejects.toThrow(/service role rejected/);
  });
});

describe("emailsByUserId", () => {
  it("maps the requested ids to addresses", async () => {
    const { client } = fakeAdmin([[u("a", "one@x.com"), u("b", "two@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = await emailsByUserId(client as any, ["a", "b"]);
    expect(map.get("a")).toBe("one@x.com");
    expect(map.get("b")).toBe("two@x.com");
  });

  it("short-circuits on an empty id list without calling auth", async () => {
    const { client, calls } = fakeAdmin([[u("a", "one@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = await emailsByUserId(client as any, []);
    expect(map.size).toBe(0);
    expect(calls()).toBe(0);
  });

  it("stops paging as soon as every id is resolved", async () => {
    const full = Array.from({ length: 200 }, (_, i) => u(`p1-${i}`, `p1-${i}@x.com`));
    const { client, calls } = fakeAdmin([full, [u("late", "late@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = await emailsByUserId(client as any, ["p1-5"]);
    expect(map.get("p1-5")).toBe("p1-5@x.com");
    expect(calls()).toBe(1);
  });

  it("omits ids it never sees rather than inventing entries", async () => {
    const { client } = fakeAdmin([[u("a", "one@x.com")]]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = await emailsByUserId(client as any, ["a", "ghost"]);
    expect(map.has("ghost")).toBe(false);
    expect(map.size).toBe(1);
  });
});
