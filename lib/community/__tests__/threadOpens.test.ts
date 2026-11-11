import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A thread opens near the size of what arrives, and a muted reply's row is a
 * row (1.9, 2026-11-11).
 *
 * Measured on the export, reading the main web, for the gate's tap walk on
 * "N replies": a thread waited for its replies with two grey rows whatever
 * the post's count. So a thread with no replies opened 254px tall and folded
 * back to 67px a moment later, and one with three opened at half its size
 * and went on under the tab bar when they came. It waits with as many rows
 * as the post says it has replies, three at most.
 *
 * The page going with a thread whose replies come late is not held here: the
 * part says it is busy while it waits (aria-busy), and the opening helper
 * follows a part that says so until it has arrived (lib/ui/showOpened.ts,
 * Fable Theology's, with its own test).
 *
 * And the row that stands for a reply from someone the reader has muted: it
 * stood 35px tall, made of its padding and one line, with a dashed edge on
 * four sides, which the pre-build gate fails as a placeholder box (build 93
 * note 4) and no walk reaches, since only a reader who has muted someone
 * sees it. It is 44 tall with a fine whole edge.
 *
 * What would go wrong if this broke: two grey rows that fold away under a
 * thread with nothing in it; a row a thumb misses.
 */

const ROOT = process.cwd();
const src = fs
  .readFileSync(path.join(ROOT, "components/community/CommunityClient.tsx"), "utf8")
  .replace(/\r\n/g, "\n")
  // The code without its comments, so a note is not read as the page.
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("a thread in Community", () => {
  it("waits with as many rows as the post has replies, three at most, and says it is busy", () => {
    expect(src).toContain("<SkeletonList rows={Math.min(Math.max(post.reply_count, 0), 3)} />");
    expect(src).toMatch(/<div aria-busy aria-label=\{t\("community\.loadingReplies"\)\}>\s*<SkeletonList /);
    expect(src).not.toContain("<SkeletonList rows={2} />");
    // The replies' control still names the part it opens, which is how the page finds it.
    expect(src).toMatch(/aria-expanded=\{open\}\s+aria-controls=\{`\$\{partsId\}-replies`\}/);
    expect(src).toContain("<div id={`${partsId}-replies`}");
  });

  it("draws a muted reply's row 44 tall with a whole edge, its words starting where the language does", () => {
    const at = src.indexOf('t("community.mutedReply")');
    expect(at).toBeGreaterThan(0);
    const button = src.slice(src.lastIndexOf("<button", at), at);
    expect(button).toContain("min-h-11");
    expect(button).toContain("text-start");
    expect(button).not.toMatch(/border-dashed|border-dotted|text-left\b/);
  });
});
