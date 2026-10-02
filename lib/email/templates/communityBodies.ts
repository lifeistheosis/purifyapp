import { siteUrl, type EmailDay } from "./build";
import type { MarketingBody } from "./marketingBodies";

/**
 * The weekly Community email's words (lib/email/communityDigest.ts): the
 * week's most answered conversations, what the people a reader follows
 * wrote, and how many asked for prayers. Only the words live here; the
 * footer, unsubscribe and address are added by lib/email/marketing.ts, which
 * sends it only to readers who turned "The week in Community" on.
 *
 * The readers' own words are quoted as they appear in the feed, already
 * through the word filter, and only from the public feed: nothing from a
 * parish group, nothing held for review.
 */

export type DigestPost = {
  /** "Maria", the name the feed shows. */
  author: string;
  /** A title, or the opening of the post, or the shared line's source. */
  text: string;
  /** "Discussion", "Question for clergy", "John 3:16". */
  label: string;
};

function line(p: DigestPost): EmailDay {
  // Reuses the week-ahead row: a small label over a line of serif. "saint"
  // is the row's plain style; only a feast is marked.
  return { day: `${p.label} · ${p.author}`, name: p.text, kind: "saint" };
}

export function communityDigestBody(opts: {
  top: readonly DigestPost[];
  following: readonly DigestPost[];
  prayers: number;
}): MarketingBody {
  const paragraphs = ["Here is what readers talked about in Community this week."];
  const after: string[] = [];
  if (opts.following.length > 0) {
    after.push(
      `From the people you follow: ${opts.following
        .map((p) => `${p.author}, "${p.text}"`)
        .join("; ")}.`,
    );
  }
  if (opts.prayers > 0) {
    after.push(
      opts.prayers === 1
        ? "One reader asked for prayers this week. The prayer wall is in Community."
        : `${opts.prayers} readers asked for prayers this week. The prayer wall is in Community.`,
    );
  }
  return {
    subject: "The week in Community",
    heading: "The week in Community",
    paragraphs,
    lines: opts.top.map(line),
    after,
    action: { label: "Open Community", href: siteUrl("/community#conversations") },
  };
}

/** A post's text for one line: its title, else its first words, cut at a word. */
export function digestText(title: string | null, body: string | null, quote: string | null, max = 110): string {
  const raw = (title || body || quote || "").replace(/\s+/g, " ").trim();
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
