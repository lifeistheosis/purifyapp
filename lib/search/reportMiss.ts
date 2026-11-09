/**
 * The app's side of "searched and not found" (admin item A11): tell the
 * website the words of a search that found nothing, so the admin can see what
 * readers look for that Purify does not have.
 *
 * Under the limits Edgar approved: the words are scrubbed here first
 * (lib/search/missWords.ts: no email, no phone number, no address) and again
 * on the server; nothing names the reader (credentials "omit", no token).
 *
 * Call it once per search the reader settled on, not on every key: when they
 * submit, or when typing has stopped and the results are empty. The same
 * words go once per visit, and no more than twenty searches from one visit.
 * The Updates chat wires the app's search to it.
 */

import { countPlatform } from "@/lib/onboarding/count";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

import { missWords } from "./missWords";

const MAX_PER_VISIT = 20;
const sent = new Set<string>();

export function reportSearchMiss(raw: string, locale?: string): void {
  try {
    if (typeof window === "undefined") return;
    const words = missWords(raw);
    if (!words || sent.has(words) || sent.size >= MAX_PER_VISIT) return;
    sent.add(words);
    const url = isNativeClient() ? `${SITE_URL}/api/search/miss` : "/api/search/miss";
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      keepalive: true,
      body: JSON.stringify({
        words,
        ...(locale && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(locale) ? { locale } : {}),
        platform: countPlatform(),
      }),
    }).catch(() => {});
  } catch {
    // Never the reader's problem.
  }
}

/** Test seam. */
export function __resetSearchMisses() {
  sent.clear();
}
