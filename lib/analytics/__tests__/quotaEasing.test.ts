import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 2026-11-21: with under four hundred readers a month the Supabase project
 * went past its free quota (egress, then log ingestion). Two callers did most
 * of it: the tracker's 20 second ping, answered with four calls to the
 * database and a row, and Community's eight second reload, answered with a
 * read of the whole feed for each reader. These hold the three mends in place
 * by reading the files that carry them.
 */

const ROOT = path.resolve(__dirname, "../../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("the tracker's ping", () => {
  const route = read("app/api/track/route.ts");

  it("is told from a page view before the burst guard's call to the database", () => {
    const told = route.indexOf("classifyTrack(");
    const guard = route.indexOf("rateLimited(`track:");
    expect(told).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(-1);
    expect(told).toBeLessThan(guard);
  });

  it("is answered without the page view's read, write and row", () => {
    const told = route.indexOf("classifyTrack(");
    const guard = route.indexOf("rateLimited(`track:");
    const early = route.slice(told, guard);
    expect(early).toContain('beat !== "pageview"');
    expect(early).toContain("last_seen");
    expect(early).not.toContain("analytics_pageviews");
    expect(early).not.toContain(".insert(");
  });

  it("reads only a small body before the guard", () => {
    expect(route).toMatch(/declared <= 4096/);
    expect(route).toContain("if (!small) raw = await req.json()");
  });
});

describe("Community's feed", () => {
  const route = read("app/api/community/posts/route.ts");
  const get = route.slice(route.indexOf("export async function GET("), route.indexOf("async function handlePOST("));
  const post = route.slice(route.indexOf("async function handlePOST("));

  it("answers from what is held before it reads the fifty posts", () => {
    const held = get.indexOf("heldFeed(memoKey");
    const listed = get.indexOf("await listPosts(POST_COLS_EDITED)");
    expect(held).toBeGreaterThan(-1);
    expect(listed).toBeGreaterThan(-1);
    expect(held).toBeLessThan(listed);
    expect(get).toContain("holdFeed(memoKey, posts, now)");
  });

  it("knows the reader's blocks and their group before any held answer", () => {
    const held = get.indexOf("heldFeed(memoKey");
    expect(get.indexOf("await hiddenAuthors(req, admin)")).toBeLessThan(held);
    expect(get.indexOf("scopedGroup = onePostGroup")).toBeLessThan(held);
    expect(get).toContain("blocked: blocked.length");
    expect(get).toContain("following: Boolean(followees)");
  });

  it("forgets what is held when a post is made", () => {
    expect(post).toContain("dropHeldFeeds();");
    expect(post.indexOf("dropHeldFeeds();")).toBeLessThan(post.lastIndexOf("return NextResponse.json({ ok: true, id: created.id });"));
  });
});

describe("Community's poll", () => {
  it("asks no more often than every fifteen seconds", () => {
    const found = /const POLL_MS = ([\d_]+);/.exec(read("components/community/CommunityClient.tsx"));
    expect(found).toBeTruthy();
    expect(Number(found![1].replaceAll("_", ""))).toBeGreaterThanOrEqual(15_000);
  });
});
