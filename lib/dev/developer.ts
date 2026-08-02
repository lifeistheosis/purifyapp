// Developer accounts and the test/preview options they may toggle.
//
// Identity is a hardcoded email allowlist — secure (no DB, no
// self-service) and trivial to extend: only these accounts ever see the
// Developer panel or receive the test-premium override. Server and client
// both import this; keep it free of DOM/Node specifics.

import type { Entitlements } from "@/lib/entitlements/entitlements";

/** The only accounts treated as developers. Add an email to grant access. */
export const DEVELOPER_EMAILS = ["lifeistheosis@gmail.com"] as const;

export function isDeveloperEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return DEVELOPER_EMAILS.some((d) => d.toLowerCase() === e);
}

// Cookie the Developer panel sets when "test premium" is on, so BOTH the
// server and client entitlement resolvers can honor it (the server can't
// read localStorage). Presence is only a *hint* — the resolvers still
// verify the signed-in account is an allowlisted developer before granting,
// so a forged cookie does nothing for a normal user.
export const DEV_PLUS_COOKIE = "pf_dev_plus";

/** Full Plus, returned when an allowlisted developer enables test premium. */
export const DEV_PLUS_ENTITLEMENTS: Entitlements = {
  supporter: false,
  plus: true,
  sync: true,
  plusFeatures: true,
};

// Feature flags a developer can preview ahead of release. Add real
// unreleased features here and gate their code with isDevFlagOn(); the
// panel renders one toggle per entry.
export const DEV_FEATURE_FLAGS = [
  {
    key: "exampleFeature",
    label: "Example feature",
    hint: "Placeholder flag — wire a new feature to isDevFlagOn('exampleFeature').",
  },
] as const;

export type DevFeatureKey = (typeof DEV_FEATURE_FLAGS)[number]["key"];
