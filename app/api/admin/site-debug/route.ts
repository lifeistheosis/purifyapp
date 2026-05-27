import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only diagnostic for the auth redirect path. Reports the
 * resolved SITE_URL (the value our code passes to Supabase as the
 * `emailRedirectTo` / OAuth `redirectTo`), and the raw env vars it
 * was computed from. Useful when OAuth callbacks bounce to the wrong
 * host and you need to see which input is poisoning the result.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? null;
  const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL ?? null;

  const looksLikeLocalhost = (v: string | null) =>
    !!v && /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(v);

  return NextResponse.json(
    {
      ok: true,
      resolvedSiteUrl: SITE_URL,
      sources: {
        NEXT_PUBLIC_SITE_URL,
        RENDER_EXTERNAL_URL,
      },
      flags: {
        nextPublicLooksLikeLocalhost: looksLikeLocalhost(NEXT_PUBLIC_SITE_URL),
        renderExternalLooksLikeLocalhost: looksLikeLocalhost(RENDER_EXTERNAL_URL),
      },
      notes:
        looksLikeLocalhost(NEXT_PUBLIC_SITE_URL) ||
        looksLikeLocalhost(RENDER_EXTERNAL_URL)
          ? "An env var is set to a localhost URL. The deploy is rejecting it (the FALLBACK kicks in), but you should still clear that env var on Render so the source of truth is clean."
          : "SITE_URL looks healthy. Auth redirects should now resolve to this host.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
