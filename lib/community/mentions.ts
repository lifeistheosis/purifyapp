// @mentions in Community: finding them in what a reader wrote, and splitting
// a body into text and mentions to draw.
//
// A mention is "@" plus a handle (lib/profile/handle.ts: a-z 0-9 _ . and 3 to
// 24 characters), with no handle character right before the "@", so an
// email address in a post (name@example.com) is not a mention. A dot ending
// a sentence ("thank you @maria.p.") is not part of the handle.
//
// Pure: the routes that notify and the feed that draws agree on what a
// mention is.

const HANDLE_CHAR = /[a-z0-9_.]/i;
const MENTION = /@([a-z0-9_.]{3,32})/gi;

/** Trim sentence dots, and accept only the shapes a handle can take. */
function clean(raw: string): string | null {
  const h = raw.toLowerCase().replace(/\.+$/, "");
  if (h.length < 3 || h.length > 24) return null;
  if (h.startsWith(".") || h.includes("..")) return null;
  return h;
}

export type MentionPart = { text: string } | { handle: string; text: string };

/** The body as runs of plain text and mentions, in order. */
export function splitMentions(text: string): MentionPart[] {
  const out: MentionPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION)) {
    const at = m.index ?? 0;
    if (at > 0 && HANDLE_CHAR.test(text[at - 1])) continue;
    const handle = clean(m[1]);
    if (!handle) continue;
    // The matched run may carry trailing dots the handle does not: they stay
    // in the text after the mention.
    const length = 1 + handle.length;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ handle, text: text.slice(at, at + length) });
    last = at + length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The distinct handles mentioned across some texts, at most `max`. */
export function extractMentions(texts: (string | null | undefined)[], max = 5): string[] {
  const seen: string[] = [];
  for (const t of texts) {
    if (!t) continue;
    for (const part of splitMentions(t)) {
      if ("handle" in part && !seen.includes(part.handle)) {
        seen.push(part.handle);
        if (seen.length >= max) return seen;
      }
    }
  }
  return seen;
}

/** The handle being typed at the caret, for the composer's suggestions. */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const m = /(^|[^a-z0-9_.@])@([a-z0-9_.]{0,24})$/i.exec(before);
  if (!m) return null;
  return { start: caret - m[2].length - 1, query: m[2].toLowerCase() };
}
