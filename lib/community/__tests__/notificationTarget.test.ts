// Every notification a reader can be sent opens something. Before 1.5.2 a
// follow opened nothing and a reply only scrolled the page; the rule that
// replaced the links is in ../notificationTarget.ts.

import { describe, expect, it } from "vitest";

import type { CommunityNotification } from "../inbox";
import { campaignNoticeHref, notificationTarget } from "../notificationTarget";

type Kind = CommunityNotification["kind"];
const row = (
  kind: Kind,
  over: Partial<Pick<CommunityNotification, "post_id" | "reply_id" | "actor_handle">> = {},
) => ({ kind, post_id: null, reply_id: null, actor_handle: null, ...over });

const POST = "0b6f3c1e-2d5a-4c8e-9f10-3a7b5c9d1e2f";
const REPLY = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

describe("where a notification goes", () => {
  it("a follow opens the follower's profile", () => {
    expect(notificationTarget(row("follow", { actor_handle: "nina" }))).toEqual({
      kind: "profile",
      handle: "nina",
    });
  });

  it("a name day greeting and a gift open the giver's profile, even when a post is named", () => {
    for (const kind of ["name_day", "gift"] as Kind[]) {
      expect(notificationTarget(row(kind, { actor_handle: "seraphim", post_id: POST }))).toEqual({
        kind: "profile",
        handle: "seraphim",
      });
    }
  });

  it("a reply opens its post and names the reply to bring forward", () => {
    expect(
      notificationTarget(row("reply", { post_id: POST, reply_id: REPLY, actor_handle: "nina" })),
    ).toEqual({ kind: "post", postId: POST, replyId: REPLY });
  });

  it("a mention in a post has no reply to bring forward", () => {
    expect(notificationTarget(row("mention", { post_id: POST }))).toEqual({
      kind: "post",
      postId: POST,
      replyId: null,
    });
  });

  it("a question, an answer and an approval open what was written", () => {
    for (const kind of ["question", "answer", "approved"] as Kind[]) {
      expect(notificationTarget(row(kind, { post_id: POST, reply_id: REPLY })).kind).toBe("post");
    }
  });

  it("a prayer goes to the post prayed over, or to the person when there is none", () => {
    expect(notificationTarget(row("prayed", { post_id: POST, actor_handle: "nina" }))).toEqual({
      kind: "post",
      postId: POST,
      replyId: null,
    });
    expect(notificationTarget(row("prayed", { actor_handle: "nina" }))).toEqual({
      kind: "profile",
      handle: "nina",
    });
  });

  it("uses whatever is left on a row from before profiles", () => {
    // A follow with no @handle and no post: nothing to open.
    expect(notificationTarget(row("follow"))).toEqual({ kind: "none" });
    // A reply whose post is gone, from a reader with a profile: the reader.
    expect(notificationTarget(row("reply", { actor_handle: "nina" }))).toEqual({
      kind: "profile",
      handle: "nina",
    });
    // A greeting from before profiles that hangs on a post: the post.
    expect(notificationTarget(row("name_day", { post_id: POST })).kind).toBe("post");
  });

  it("every kind a reader can be sent goes somewhere when it has both a post and a person", () => {
    const kinds: Kind[] = ["reply", "mention", "follow", "name_day", "prayed", "gift", "question", "answer", "approved"];
    for (const kind of kinds) {
      expect(notificationTarget(row(kind, { post_id: POST, actor_handle: "nina" })).kind).not.toBe("none");
    }
  });

  it("an empty string is not a handle and not a post", () => {
    expect(notificationTarget(row("reply", { post_id: "", actor_handle: "" }))).toEqual({ kind: "none" });
  });
});

describe("a notice about a prayer campaign (phase 4, 2026-11-10)", () => {
  const CAMPAIGN = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
  it("a moderator's approval opens Your campaigns", () => {
    expect(campaignNoticeHref({ kind: "approved", target_kind: "campaign" })).toBe("/campaigns/mine");
  });

  it("an update opens that campaign's updates, or Your campaigns when its campaign is not known", () => {
    expect(campaignNoticeHref({ kind: "reply", target_kind: "campaign", campaign_id: CAMPAIGN })).toBe(`/campaigns/detail?id=${CAMPAIGN}#updates`);
    expect(campaignNoticeHref({ kind: "reply", target_kind: "campaign", campaign_id: null })).toBe("/campaigns/mine");
  });

  it("never opens the campaign's thread post as a Community post", () => {
    expect(notificationTarget({ ...row("reply", { post_id: POST, reply_id: REPLY }), target_kind: "campaign" })).toEqual({ kind: "none" });
    expect(notificationTarget({ ...row("approved"), target_kind: "campaign" })).toEqual({ kind: "none" });
  });

  it("leaves every other notice as it was", () => {
    expect(campaignNoticeHref({ kind: "reply", target_kind: null })).toBeNull();
    expect(campaignNoticeHref({ kind: "approved" })).toBeNull();
    expect(campaignNoticeHref({ kind: "removed", target_kind: "campaign" })).toBeNull();
    expect(notificationTarget(row("reply", { post_id: POST, reply_id: REPLY }))).toEqual({ kind: "post", postId: POST, replyId: REPLY });
  });
});
