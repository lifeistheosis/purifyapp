import { describe, expect, it } from "vitest";

import { STAND_INS, standInFor, stoodIn } from "../../../scripts/lib/main-web.mjs";

/**
 * The walks draw a part the main web feeds only now and then (2026-11-13,
 * routed by the arbiter; found by Updates 16). The chapter's discussions
 * (components/bible/ChapterDiscussions.tsx) are drawn only where the main web
 * has posts about the chapter, and the walks' chapters had none, so no gate
 * run drew or measured the card: a reader's name and the post's age stood at
 * 4.24:1 on Light. With --online the guardrail walk now answers an empty
 * answer for a chapter's posts with one post in plain sample words, and says
 * so in its report.
 *
 * What it cannot see: the walk itself (scripts/guardrail-walk.mjs reads
 * standInFor in its main-web reader).
 */

const answer = (status: number, json: unknown) => ({ status, headers: { "x-kept": "1" }, body: Buffer.from(JSON.stringify(json)) });
const posts = (r: { body: Buffer }) => (JSON.parse(r.body.toString("utf8")) as { posts: { chapter_ref: string; title: string; author_name: string }[] }).posts;

describe("the walks' stand-ins for parts the main web feeds only now and then", () => {
  it("a chapter's posts that come back empty are answered with one post about that chapter, in plain words", () => {
    const r = standInFor("https://purifyapp.net/api/community/posts?chapter=genesis%2F1", answer(200, { posts: [] }));
    expect(r).not.toBeNull();
    expect(r!.status).toBe(200);
    expect(r!.headers["content-type"]).toBe("application/json");
    const [post] = posts(r!);
    expect(post.chapter_ref).toBe("genesis/1");
    expect(post.author_name).toBe("A reader");
    expect(stoodIn.has(STAND_INS[0].name)).toBe(true);
  });

  it("the main web's own posts are shown as they are", () => {
    expect(standInFor("https://purifyapp.net/api/community/posts?chapter=john%2F1", answer(200, { posts: [{ id: "x" }] }))).toBeNull();
  });

  it("a part switched off stays off, and no other address is touched", () => {
    expect(standInFor("https://purifyapp.net/api/community/posts?chapter=john%2F1", answer(404, {}))).toBeNull();
    expect(standInFor("https://purifyapp.net/api/community/posts", answer(200, { posts: [] }))).toBeNull();
    expect(standInFor("https://purifyapp.net/api/shop/home", answer(200, { posts: [] }))).toBeNull();
  });
});
