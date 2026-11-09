/**
 * The apps' and the website's side of the errors list (admin item A10): tell
 * the website that something failed on this screen, or that a call came back
 * failed. The list is the admin's Services page; the route is
 * app/api/errors/route.ts.
 *
 * What it sends is what the privacy line Edgar approved says, and nothing
 * else: the page, what failed, the app version and the kind of device. Never
 * the reader: no token, no cookie (credentials "omit"), no account.
 *
 * Quiet by design: a report that cannot be sent is dropped, the same fault is
 * sent once per visit, and no more than ten go from one visit, so a screen
 * stuck in a loop cannot flood the list or the reader's data plan.
 *
 * Where it is called from (the Updates chat wires the app side): a window
 * "error" or "unhandledrejection", an error boundary's catch, and an API call
 * that answers 5xx.
 */

import { countPlatform } from "@/lib/onboarding/count";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

const MAX_PER_VISIT = 10;
const seen = new Set<string>();
let sent = 0;

export type ErrorReportInput = {
  source: "screen" | "request";
  /** An Error, or its message. */
  message?: unknown;
  /** A failed call's HTTP status. */
  status?: number;
  /** The page; this one's path by default. */
  page?: string;
};

export function reportError(input: ErrorReportInput): void {
  try {
    if (typeof window === "undefined") return;
    const page = input.page ?? window.location.pathname;
    const message =
      input.message instanceof Error ? input.message.message : typeof input.message === "string" ? input.message : undefined;
    const key = `${input.source}|${page}|${message ?? ""}|${input.status ?? ""}`;
    if (seen.has(key) || sent >= MAX_PER_VISIT) return;
    seen.add(key);
    sent += 1;
    const url = isNativeClient() ? `${SITE_URL}/api/errors` : "/api/errors";
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      keepalive: true,
      body: JSON.stringify({
        source: input.source,
        page: page.slice(0, 2000),
        ...(message ? { message: message.slice(0, 2000) } : {}),
        ...(typeof input.status === "number" ? { status: input.status } : {}),
        appVersion: CURRENT_VERSION,
        platform: countPlatform(),
      }),
    }).catch(() => {});
  } catch {
    // A report must never be the second failure.
  }
}

/** Test seam. */
export function __resetErrorReports() {
  seen.clear();
  sent = 0;
}
