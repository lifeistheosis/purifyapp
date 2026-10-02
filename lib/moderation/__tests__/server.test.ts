import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";

import { censorName, censorPost, customEntry, forgetFilter, handleIsBlocked, textHasListedWord } from "../server";

/** A service client whose community_filter_terms holds `rows` (or is absent). */
function fakeAdmin(rows: { term: string; scope: "text" | "handle"; whole_word: boolean }[] | "absent"): SupabaseClient {
  const answer =
    rows === "absent"
      ? { data: null, error: { code: "42P01", message: 'relation "public.community_filter_terms" does not exist' } }
      : { data: rows, error: null };
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.limit = () => Promise.resolve(answer);
  return { from: () => q } as unknown as SupabaseClient;
}

beforeEach(() => forgetFilter());

describe("customEntry", () => {
  it("turns the team's words into list entries", () => {
    expect(customEntry({ term: "zorbak", scope: "text", whole_word: true })).toEqual(["zorbak", "twa"]);
    expect(customEntry({ term: "zorbak", scope: "text", whole_word: false })).toEqual(["zorbak", "tpa"]);
    expect(customEntry({ term: "quizzle", scope: "handle", whole_word: true })).toEqual(["quizzle", "h-k"]);
    expect(customEntry({ term: "quizzle", scope: "handle", whole_word: false })).toEqual(["quizzle", "h-a"]);
  });
});

describe("the filter as the routes use it", () => {
  const admin = fakeAdmin([
    { term: "zorbak", scope: "text", whole_word: true },
    { term: "quizzle", scope: "handle", whole_word: false },
  ]);

  it("masks the team's own words in a post, title and body, and counts them", async () => {
    const out = await censorPost(admin, { title: "zorbak!", body: "a zorbak and a Zorbak" });
    expect(out).toEqual({ title: "******!", body: "a ****** and a ******", hits: 3 });
  });

  it("leaves a clean post exactly as written", async () => {
    expect(await censorPost(admin, { title: null, body: "Lord, have mercy." })).toEqual({ title: null, body: "Lord, have mercy.", hits: 0 });
  });

  it("refuses handles with a handle word, but lets it pass in writing", async () => {
    expect(await handleIsBlocked(admin, "the_quizzle_one")).toBe(true);
    expect(await handleIsBlocked(admin, "maria.p")).toBe(false);
    expect((await censorPost(admin, { body: "quizzle" })).hits).toBe(0);
  });

  it("checks profile text and masks names", async () => {
    expect(await textHasListedWord(admin, null, "fine words", "and zorbak")).toBe(true);
    expect(await textHasListedWord(admin, "nothing here", undefined)).toBe(false);
    expect(await censorName(admin, "Zorbak the Great")).toBe("****** the Great");
  });

  it("works on the built-in list alone before the table exists", async () => {
    const before = fakeAdmin("absent");
    expect((await censorPost(before, { body: "Lord, have mercy." })).hits).toBe(0);
    expect((await censorPost(before, { body: "zorbak" })).hits).toBe(0);
  });
});
