import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cspReportSchema } from "@/lib/security/schemas";
import { rateLimited, ipKey } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Browsers POST CSP violations here (Content-Type:
// application/csp-report or application/reports+json). We persist a
// trimmed copy to public.csp_reports so we can review what would break
// before flipping the policy from Report-Only to enforcing.
export async function POST(req: NextRequest) {
  const ip = ipKey(req.headers);

  // Generous limit: a single page load can fire several reports if a
  // policy is broad. Anything past 1000/min/IP is abuse.
  if (await rateLimited(`csp:${ip}`, 60, 1000)) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const raw = await req.json();
    const parsed = cspReportSchema.safeParse(raw);
    if (!parsed.success) {
      return new NextResponse(null, { status: 204 });
    }
    const r = parsed.data["csp-report"];

    // sha256(ip || daily-salt) — bind to a stable-per-day pseudonym so we
    // can correlate bursts without retaining a raw IP.
    const day = new Date().toISOString().slice(0, 10);
    const enc = new TextEncoder().encode(`${ip}|${day}|csp`);
    const digest = await crypto.subtle.digest("SHA-256", enc);
    const ipHash = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);

    const supa = createAdminClient();
    await supa.from("csp_reports").insert({
      document_uri: r["document-uri"] ?? null,
      referrer: r.referrer ?? null,
      blocked_uri: r["blocked-uri"] ?? null,
      violated_directive: r["violated-directive"] ?? null,
      effective_directive: r["effective-directive"] ?? null,
      source_file: r["source-file"] ?? null,
      line_number: r["line-number"] ?? null,
      column_number: r["column-number"] ?? null,
      disposition: r.disposition ?? null,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      ip_hash: ipHash,
    });
  } catch {
    // Never error on a report write — that would itself become observable.
  }
  // Browsers ignore the response body.
  return new NextResponse(null, { status: 204 });
}
