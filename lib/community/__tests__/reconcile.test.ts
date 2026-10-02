import { describe, expect, it } from "vitest";

import { reconcilePosts, sameEntries, sameMembers } from "../reconcile";
import type { CommunityPost } from "../types";

function post(id: string, likes = 0): CommunityPost {
  return {
    id,
    kind: "discussion",
    title: null,
    body: `body ${id}`,
    quote_text: null,
    quote_source: null,
    quote_href: null,
    author_name: "Reader",
    author_avatar: null,
    reply_count: 0,
    like_count: likes,
    dislike_count: 0,
    created_at: "2026-10-01T00:00:00Z",
  };
}

describe("reconcilePosts", () => {
  it("hands back the previous array when a refresh brings nothing new", () => {
    const prev = [post("a"), post("b")];
    const next = [post("a"), post("b")];
    expect(reconcilePosts(prev, next)).toBe(prev);
  });

  it("keeps the unchanged posts and takes the changed one", () => {
    const prev = [post("a"), post("b", 1)];
    const next = [post("a"), post("b", 2)];
    const out = reconcilePosts(prev, next);
    expect(out).not.toBe(prev);
    expect(out[0]).toBe(prev[0]);
    expect(out[1]).toBe(next[1]);
  });

  it("follows a new post and a new order, reusing what it can", () => {
    const prev = [post("a"), post("b")];
    const next = [post("c"), post("b"), post("a")];
    const out = reconcilePosts(prev, next);
    expect(out.map((p) => p.id)).toEqual(["c", "b", "a"]);
    expect(out[1]).toBe(prev[1]);
    expect(out[2]).toBe(prev[0]);
  });

  it("notices a field that appears or disappears", () => {
    const prev = [post("a")];
    const next = [{ ...post("a"), pinned_at: "2026-10-01T00:00:00Z" }];
    expect(reconcilePosts(prev, next)[0]).toBe(next[0]);
  });
});

describe("sameEntries and sameMembers", () => {
  it("keep the previous value when nothing changed", () => {
    const m = { a: 1 as const };
    expect(sameEntries(m, { a: 1 })).toBe(m);
    expect(sameEntries(m, { a: -1 })).not.toBe(m);
    const s = new Set(["x"]);
    expect(sameMembers(s, ["x"])).toBe(s);
    expect(sameMembers(s, ["y"])).not.toBe(s);
  });
});
