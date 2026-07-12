// Browser-side Supabase client.
// Safe to import from Client Components ("use client").
// Uses the anon (public) key, RLS policies determine what the user can read/write.

import { createBrowserClient } from "@supabase/ssr";

import { resilientNavigatorLock } from "./resilientLock";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // F-13 root fix: a cross-tab auth lock jammed by a stuck tab must
        // degrade to running lockless, not brick every auth call in every
        // other tab. See lib/supabase/resilientLock.ts.
        lock: resilientNavigatorLock,
      },
    },
  );
}
