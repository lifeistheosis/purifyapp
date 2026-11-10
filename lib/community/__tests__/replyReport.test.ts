// Report on a reply (1.9, campaigns-fable.md section 9, item 5).
//
// No screen offered it: the report route took a reply's id and only a post's
// menu called it, so a hurtful reply under a good post could not be reported.
// A reply now has the ⋯ menu a post has (components/community/ReplyMenu.tsx),
// with the same words and the same behaviour: offered to a signed-in reader
// on someone else's reply, "Reported" at once, undone and said if it did not
// send.
//
// vitest runs in node with no DOM (vitest.config.ts); react-dom/server needs
// none, and the menu's button is all in the markup.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { ReplyMenu, replyMenuItems, replyReporter } from "@/components/community/ReplyMenu";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

const en = getMessages("en") as Record<string, string>;
const t = (key: string) => en[key] ?? key;

const items = (over: Partial<Parameters<typeof replyMenuItems>[0]> = {}) =>
  replyMenuItems({
    signedIn: true,
    mine: false,
    reported: false,
    canViewProfile: true,
    t,
    onReport: () => {},
    onViewProfile: () => {},
    ...over,
  });

describe("what a reply's menu holds", () => {
  it("offers Report on someone else's reply, beside their profile, as a post's menu does", () => {
    expect(items().map((i) => [i.label, Boolean(i.disabled)])).toEqual([
      ["View profile", false],
      ["Report", false],
    ]);
  });

  it("says Reported once sent, and cannot be sent twice", () => {
    const report = items({ reported: true }).at(-1)!;
    expect(report.label).toBe("Reported");
    expect(report.disabled).toBe(true);
  });

  it("offers nothing on the reader's own reply, or to a reader signed out", () => {
    expect(items({ mine: true })).toEqual([]);
    expect(items({ signedIn: false })).toEqual([]);
  });

  it("still offers Report on a reply with no @handle to open", () => {
    expect(items({ canViewProfile: false }).map((i) => i.label)).toEqual(["Report"]);
  });
});

describe("sending it", () => {
  it("sends the reply's id, and nothing else, to the report route", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const set = vi.fn();
    const fail = vi.fn();
    await replyReporter("reply-1", { set, fail }, send)();
    expect(send).toHaveBeenCalledWith({ replyId: "reply-1" });
    expect(set.mock.calls).toEqual([[true]]);
    expect(fail).not.toHaveBeenCalled();
  });

  it("goes back to Report, and says why, when it did not send", async () => {
    const send = vi.fn(async () => ({ ok: false, error: "Too many reports just now. Please try again shortly." }));
    const set = vi.fn();
    const fail = vi.fn();
    await replyReporter("reply-1", { set, fail }, send)();
    expect(set.mock.calls).toEqual([[true], [false]]);
    expect(fail).toHaveBeenCalledWith("Too many reports just now. Please try again shortly.");
  });

  it("the route takes a reply's id, one thing at a time", () => {
    const route = read("app/api/community/report/route.ts");
    expect(route).toMatch(/replyId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/);
    expect(route).toContain("reply_id: replyId ?? null");
  });
});

describe("the menu on the page", () => {
  const draw = (mine: boolean, signedIn = true) =>
    renderToStaticMarkup(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0],
        createElement(ReplyMenu, { replyId: "reply-1", signedIn, mine, onViewProfile: null, onFailed: () => {} }),
      ),
    );

  it("draws the ⋯ button, named, 44px to the touch, on someone else's reply", () => {
    const html = draw(false);
    expect(html).toContain('aria-label="More options"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("hit-44");
  });

  it("draws nothing on the reader's own reply, or signed out", () => {
    expect(draw(true)).toBe("");
    expect(draw(false, false)).toBe("");
  });

  it("every reply in a thread wears it, and the reader's own are known from the same call as their posts", () => {
    const src = read("components/community/CommunityClient.tsx");
    const row = src.slice(src.indexOf("orderedReplies.map((r) => {"), src.indexOf("{replyNotice ? ("));
    expect(row).toContain("<ReplyMenu");
    expect(row).toContain("replyId={r.id}");
    expect(row).toMatch(/mine=\{myReplyIds\.has\(r\.id\) \|\| sentReplyIds\.has\(r\.id\)\}/);
    expect(src).toContain("setMyReplyIds((prev) => sameMembers(prev, ids.replyIds));");
  });

  it("each item of the menu is 44px to the touch, and the reply's row turns in Arabic", () => {
    // checkMock on the export measured the items at 41.4px, and found the
    // writer's name and picture set with text-left, which stays left in Arabic.
    const menu = read("components/community/ActionMenu.tsx");
    expect(menu).toMatch(/"flex min-h-11 w-full items-center[^"]*text-start/);
    const src = read("components/community/CommunityClient.tsx");
    const author = src.slice(src.indexOf("function AuthorButton"), src.indexOf("function AuthorButton") + 2000);
    expect(author).toContain('className={cn("group text-start", className)}');
  });

  it("uses words every language already has, in its own file", () => {
    // Read from each language's own file, not through getMessages, which
    // fills a missing line with the English one.
    for (const { code } of LOCALES) {
      const m = JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;
      for (const key of ["community.report", "community.reported", "community.reportFailed", "community.viewProfile", "profile.moreActions"]) {
        expect(m[key], `${code}: ${key}`).toBeTruthy();
      }
    }
  });
});
