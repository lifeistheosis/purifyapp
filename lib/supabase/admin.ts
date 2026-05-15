// ⚠️ ADMIN CLIENT — SERVER ONLY ⚠️
// Uses the service_role key, which BYPASSES Row Level Security.
//
// Import only from:
//   - Route Handlers (app/api/.../route.ts)
//   - Server Actions
//   - Background jobs / scripts
//
// NEVER import this file from a Client Component or any file that runs in the browser.
// The "server-only" import will throw a build error if this is accidentally pulled
// into client code.

import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
