// The rule behind PUT /api/account/theme, as a pure function.
//
// Applying a paid palette is enforced here, on the server, at the write:
// the client gate (components/reader/usePlusReadingModes.ts) is the fast
// path that decides what to offer, and this is what decides what is
// recorded. Same entitlement model as every other Plus surface,
// deriveEntitlements under the surface's PLUS_ENFORCED_* flag, so a
// collection palette behaves exactly like Candlelight and Monastery: open
// everywhere while the flags are off, Plus and Pro only once a surface's
// flag flips. Light and Dark are free and always answer 200.

import {
  deriveEntitlements,
  type EntitlementRow,
  type Entitlements,
} from "@/lib/entitlements/entitlements";

import { coerceReadingTheme, isFreeTheme, type ReadingTheme } from "./readingModes";

export type ThemeDecision =
  | { ok: true; status: 200; theme: ReadingTheme }
  | { ok: false; status: 400 | 403; error: string };

export function decideThemeWrite(
  raw: unknown,
  row: EntitlementRow | null | undefined,
  opts: {
    /** plusEnforcedFor(surface) for the request's surface. */
    enforced: boolean;
    now?: Date;
    /** A resolved model to use instead of the row (the developer override). */
    override?: Entitlements;
  },
): ThemeDecision {
  if (typeof raw !== "string" || coerceReadingTheme(raw) !== raw) {
    return { ok: false, status: 400, error: "unknown palette" };
  }
  const theme = raw as ReadingTheme;
  if (isFreeTheme(theme)) return { ok: true, status: 200, theme };
  const e = opts.override ?? deriveEntitlements(row, { enforced: opts.enforced, now: opts.now });
  if (!e.plusFeatures) return { ok: false, status: 403, error: "purify plus" };
  return { ok: true, status: 200, theme };
}
