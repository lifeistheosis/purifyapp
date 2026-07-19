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
}: {
  k: string;
  replacements?: Record<string, string | number>;
  /** When set, resolve k as a plural key base via tn(). */
  count?: number;
}) {
  const { t, tn } = useTranslate();
  if (count !== undefined) return <>{tn(k, count, replacements)}</>;
  return <>{t(k, replacements)}</>;
}
