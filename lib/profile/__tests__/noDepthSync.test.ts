import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The welcome answer "How familiar are you with Orthodox Christianity?" stays
 * on the device (his word, 2026-11-11, on the arbiter's rec). Its depth
 * ("inquirer" or "faithful") is a statement of the reader's faith, which the
 * law treats as sensitive; it went to the profiles row of every signed-in
 * account, and the Privacy page named it nowhere.
 *
 * What would go wrong if this broke: the faith answer back on the server,
 * beside the reader's email, without their asking.
 */

const world = vi.hoisted(() => ({
  updates: [] as Record<string, unknown>[],
  selects: [] as string[],
  row: { focus: ["prayer"], depth: "faithful" } as Record<string, unknown>,
  stored: new Map<string, string>(),
}));

vi.mock("@/lib/onboarding/testing", () => ({ isTesting: () => false }));
vi.mock("@/lib/onboarding/state", () => ({
  fillSpaceFromAccount: () => {},
  readFocus: () => JSON.parse(world.stored.get("focus") ?? "[]"),
  writeFocus: (f: string[]) => world.stored.set("focus", JSON.stringify(f)),
  readDepth: () => world.stored.get("depth") ?? null,
  writeDepth: (d: string | null) => (d ? world.stored.set("depth", d) : world.stored.delete("depth")),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u", user_metadata: {} } } }) },
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        world.updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
      select: (cols: string) => {
        world.selects.push(cols);
        return { eq: () => ({ maybeSingle: async () => ({ data: world.row, error: null }) }) };
      },
    }),
  }),
}));

import { pullProfilePrefs, pushProfilePrefs } from "@/lib/profile/preferences";

beforeEach(() => {
  world.updates = [];
  world.selects = [];
  world.stored = new Map();
});

describe("the welcome answers on the account", () => {
  it("sends the focus, never the depth", async () => {
    world.stored.set("focus", JSON.stringify(["scripture"]));
    world.stored.set("depth", "faithful");
    await pushProfilePrefs();
    expect(world.updates).toEqual([{ focus: ["scripture"] }]);
  });

  it("asks the account for the focus alone, and writes no depth from it", async () => {
    await pullProfilePrefs();
    expect(world.selects).toEqual(["focus"]);
    expect(world.stored.get("focus")).toBe(JSON.stringify(["prayer"]));
    expect(world.stored.has("depth")).toBe(false);
  });
});
