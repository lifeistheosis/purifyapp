/**
 * The words of a search that found nothing, as they may be kept (admin item
 * A11, supabase/migrations/20261110002923_search_misses.sql).
 *
 * The privacy line Edgar approved on 2026-11-09: "When a search finds
 * nothing, we keep the words you searched, never who you are, for 90 days, so
 * we can add what readers are looking for. Anything that looks like an email
 * address or a phone number is removed before it is kept." A search can hold a
 * name, an address or a prayer intention, so this runs twice: on the device
 * before anything is sent (lib/search/reportMiss.ts), and on the server before
 * anything is kept (app/api/search/miss/route.ts).
 *
 * What it does: lower case, one space between words, the email addresses,
 * phone-like numbers, web addresses and anything shaped like an account's id
 * taken out; and nothing kept unless 2 to 80 characters with a letter remain.
 *
 * Pure. Tested in lib/search/__tests__/missWords.test.ts.
 */

const MIN = 2;
const MAX = 80;

export function missWords(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw
    .normalize("NFKC")
    .toLowerCase()
    // A whole address, an email, an account-shaped id, a run of digits.
    .replace(/\b(?:https?:\/\/|www\.)\S+/g, " ")
    .replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu, " ")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, " ")
    // Six or more digits, with up to two of " ().-" between any two of them.
    .replace(/\+?\(?\d(?:[\s().-]{0,2}\d){5,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < MIN || text.length > MAX) return null;
  // Something a person could look for: at least one letter, in any script.
  if (!/\p{L}/u.test(text)) return null;
  return text;
}
