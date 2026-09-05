// The catechism's two product events, fire and forget.
//
// Through apiFetch so the native shell reaches purifyapp.net rather than its
// own https://localhost, where nothing answers. The names and props are the
// closed list in lib/security/schemas.ts (trackEventSchema); anything else is
// a 400 on the server, which is the point. No session id, no reader.

import { apiFetch } from "@/lib/api/client";
import type { Reckoning } from "@/lib/catechism/types";

type CatechismEvent =
  | { name: "catechism_started"; props: { reckoning: Reckoning } }
  | { name: "catechism_completed"; props: { score: number; total: number; reckoning: Reckoning } };

export function trackCatechism(event: CatechismEvent): void {
  void apiFetch("/api/track/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}
