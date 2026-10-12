"use client";

import { useTranslate } from "./MessagesProvider";

/**
 * Inline translated text for SERVER components. A server component's own
 * string output is baked into the Android static export in English and
 * never re-renders when the native app switches language; this tiny
 * client island reads the live catalog instead, so the text follows the
 * locale switch. On the web it server-renders with the request's locale
 * like everything else. Use it for chrome strings inside server
 * components; client components keep calling useTranslate directly.
 */
export function T({
  k,
  replacements,
  count,
  dropTrailing,
}: {
  k: string;
  replacements?: Record<string, string | number>;
  /** When set, resolve k as a plural key base via tn(). */
  count?: number;
  /**
   * Leave this off the end of the words, when they end with it: the arrow of
   * a line whose place draws its own chevron, the full stop of a heading
   * used as a card's title. A server component used to do this with
   * `.replace()` on the string, which is exactly what froze the string in
   * English in the apps.
   */
  dropTrailing?: string;
}) {
  const { t, tn } = useTranslate();
  const words = count !== undefined ? tn(k, count, replacements) : t(k, replacements);
  return <>{dropTrailing ? withoutTrailing(words, dropTrailing) : words}</>;
}

/** The words without `mark` at their end, and without the space before it. */
export function withoutTrailing(words: string, mark: string): string {
  const trimmed = words.trimEnd();
  return mark && trimmed.endsWith(mark) ? trimmed.slice(0, -mark.length).trimEnd() : words;
}
