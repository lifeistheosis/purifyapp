import { describe, expect, it } from "vitest";

import { digestScore } from "../communityDigest";
import { checkEmailCopy } from "../doctrine";
import { LIST_LABEL } from "../lists";
import { renderMarketing } from "../marketing";
import { communityDigestBody, digestText } from "../templates/communityBodies";

const TOKEN = "3f1c2a9e-0000-4000-8000-000000000000";
const ADDRESS = "PO Box 123, Springfield";

describe("the weekly Community email", () => {
  const body = communityDigestBody({
    top: [
      { author: "Maria", text: "How do you keep the Jesus Prayer at work", label: "Discussion" },
      { author: "John", text: "For God so loved the world", label: "John 3:16" },
    ],
    following: [{ author: "Anna", text: "A question about the Nativity Fast", label: "Question for clergy" }],
    prayers: 12,
  });

  it("says only what Purify may say in an email", () => {
    const own = [body.subject, body.heading, ...body.paragraphs, ...(body.after ?? [])].join(" ");
    expect(checkEmailCopy({ subject: body.subject, body: own })).toEqual([]);
  });

  it("lists the week's conversations and counts the prayer requests", () => {
    expect(body.lines?.map((l) => l.name)).toEqual(["How do you keep the Jesus Prayer at work", "For God so loved the world"]);
    expect(body.after?.join(" ")).toContain("12 readers asked for prayers");
    expect(body.after?.join(" ")).toContain("Anna");
  });

  it("goes out with its own list's name, unsubscribe link and address", () => {
    const email = renderMarketing(body, "community_digest", TOKEN, ADDRESS);
    expect(email.text).toContain(LIST_LABEL.community_digest);
    expect(email.html).toContain("l=community_digest");
    expect(email.text).toContain(ADDRESS);
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("says nothing about prayers when nobody asked, and one when one did", () => {
    expect(communityDigestBody({ top: [], following: [], prayers: 0 }).after).toEqual([]);
    expect(communityDigestBody({ top: [], following: [], prayers: 1 }).after?.[0]).toMatch(/^One reader/);
  });
});

describe("digestScore and digestText", () => {
  it("counts a reply twice and every response once", () => {
    expect(digestScore({ like_count: 3, reply_count: 2, amen_count: 1, praying_count: null, glory_count: 2 })).toBe(10);
  });

  it("cuts a long post at a word", () => {
    const t = digestText(null, "word ".repeat(60), null);
    expect(t.length).toBeLessThanOrEqual(111);
    expect(t.endsWith("…")).toBe(true);
    expect(digestText("A title", "a body", null)).toBe("A title");
  });
});
