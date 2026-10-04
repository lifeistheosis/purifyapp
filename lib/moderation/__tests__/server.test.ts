import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import { censorName, censorPost, customEntry, forgetFilter, handleIsBlocked, textHasListedWord } from "../server";

/**
 * A service client whose community_filter_terms holds `rows` (or is absent),
 * answering 1,000 rows a request as the real API does.
 */
function fakeAdmin(rows: { term: string; scope: "text" | "handle"; whole_word: boolean }[] | "absent"): SupabaseClient {
  return cappedApi(
    rows === "absent"
      ? { community_filter_terms: { error: { code: "42P01", message: 'relation "public.community_filter_terms" does not exist' } } }
      : { community_filter_terms: rows },
  ).client;
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

  // One request returns at most 1,000 rows. Read that way, a word the team
  // added after the thousandth was on the list and never filtered.
  it("filters a word that sits past the thousandth on the team's list", async () => {
    forgetFilter();
    const many = fakeAdmin([
      ...Array.from({ length: 1200 }, (_, i) => ({ term: `aaword${String(i).padStart(4, "0")}`, scope: "text" as const, whole_word: true })),
      { term: "zorbak", scope: "text" as const, whole_word: true },
    ]);
    expect((await censorPost(many, { body: "a zorbak" })).hits).toBe(1);
  });
});
