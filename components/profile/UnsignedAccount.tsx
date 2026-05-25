"use client";

import { useLocalAccount } from "@/lib/profile/localAccount";
import { AccountChoice } from "./AccountChoice";
import { LocalProfileHero } from "./LocalProfileHero";

/**
 * Client wrapper that decides between AccountChoice and
 * LocalProfileHero based on whether a local profile has been claimed.
 * The Supabase-signed-in branch is handled higher up in the server
 * component; this only fires when there's no Supabase user.
 *
 * Wrapped in a min-height container by the parent to avoid layout
 * shift between SSR (always renders AccountChoice) and post-mount
 * (may swap to LocalProfileHero if localStorage has a claim).
 */
export function UnsignedAccount() {
  const local = useLocalAccount();
  if (local) return <LocalProfileHero />;
  return <AccountChoice />;
}
