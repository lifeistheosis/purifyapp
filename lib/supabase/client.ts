// Browser-side Supabase client.
// Safe to import from Client Components ("use client").
// Uses the anon (public) key, RLS policies determine what the user can read/write.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
