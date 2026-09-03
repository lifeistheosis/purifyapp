import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Probe = {
  service: string;
  status: "ok" | "fail" | "skipped";
  detail: string;
  latencyMs: number | null;
};

// On-demand probes for the services Purify depends on. Pure liveness check,
// nothing persisted. The Render row is optional and only runs when
// RENDER_API_KEY is set.
//
// ?scope=internal | outbound | (absent = all). The split exists because the
// two halves cost different things and are wanted at different rates. The
// attention strip (lib/admin/useAttention.ts) polls INTERNAL every five
// minutes: two RPCs against our own database, and the rate limiter probe is
// the one dependency that fails invisibly, so it is worth re-asking. OUTBOUND
// carries a live call to API.Bible, which is a licensed, metered API, so the
// strip reads it once per shell mount and again only on an explicit Retry.
// Polling it through the store would also re-read it on every tab focus,
// which is a licence cost nobody asked for. HealthTab asks for everything,
// as it always did.
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scope = new URL(req.url).searchParams.get("scope");
  const internal = [probeSupabase, probeRateLimiter];
  const outbound = [probeApiBible, probeBmc, probeIpwhois, probeRender];
  const list =
    scope === "internal" ? internal : scope === "outbound" ? outbound : [...internal, ...outbound];

  const probes = await Promise.all(list.map((probe) => probe()));

  return NextResponse.json(
    {
      probes,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; ms: number; error: string | null }> {
  const t0 = performance.now();
  try {
    const result = await fn();
    return { result, ms: Math.round(performance.now() - t0), error: null };
  } catch (e) {
    return { result: null, ms: Math.round(performance.now() - t0), error: String(e) };
  }
}

async function probeSupabase(): Promise<Probe> {
  const { result, ms, error } = await timed(async () => {
    const supa = createAdminClient();
    const r = await supa.from("profiles").select("id", { count: "exact", head: true });
    if (r.error) throw new Error(r.error.message);
    return r.count ?? 0;
  });
  return {
    service: "Supabase Postgres",
    status: error ? "fail" : "ok",
    detail: error ? error : `profiles table reachable (${result} rows)`,
    latencyMs: ms,
  };
}

/**
 * The rate limiter, which is the one dependency that fails INVISIBLY.
 *
 * lib/security/ratelimit.ts is fail-open by design: an RPC error logs a
 * console.warn and returns false, so the caller is treated as under budget.
 * That is the right trade (a limiter outage must not take the site down) and
 * it means every rate-limited write route, checkout and gift claim included,
 * opens silently with nothing on any screen saying so. Probing it here is what
 * turns that from invisible into a red card.
 *
 * Calls the RPC directly rather than through rateLimited(), because that
 * helper swallows the error this needs to see. The key is fixed and the budget
 * is absurd on purpose: the probe must never consume anything real and must
 * never itself report over-budget.
 */
async function probeRateLimiter(): Promise<Probe> {
  const { ms, error } = await timed(async () => {
    const supa = createAdminClient();
    const r = await supa.rpc("rate_limit_hit", {
      p_key: "health:probe",
      p_window_seconds: 60,
      p_max: 1_000_000_000,
    });
    if (r.error) throw new Error(r.error.message);
    return true;
  });
  return {
    service: "Rate limiter (rate_limit_hit)",
    status: error ? "fail" : "ok",
    detail: error
      ? `${error}. The limiter is FAIL-OPEN, so every rate-limited write route is currently unthrottled`
      : "rpc answered; write routes are being throttled",
    latencyMs: ms,
  };
}

async function probeApiBible(): Promise<Probe> {
  // BIBLE_API_KEY, which is what lib/bible/api-bible.ts actually reads and
  // what .env.local.example documents. This probed API_BIBLE_KEY, which
  // nothing sets, so the card reported "not configured" on a correctly
  // configured server and had done since it was written.
  //
  // The NEXT_PUBLIC_ fallback is gone with it, and that mattered more than the
  // typo: a fallback onto a public var is an invitation to satisfy this card
  // by setting one, which would ship a licensed key into the client bundle.
  const key = process.env.BIBLE_API_KEY;
  if (!key) {
    return {
      service: "API.Bible (licensed Scripture)",
      status: "skipped",
      detail: "BIBLE_API_KEY not set",
      latencyMs: null,
    };
  }
  const { result, ms, error } = await timed(async () => {
    const r = await fetch("https://api.scripture.api.bible/v1/bibles", {
      headers: { "api-key": key },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.status;
  });
  return {
    service: "API.Bible (licensed Scripture)",
    status: error ? "fail" : "ok",
    detail: error ? error : `HTTP ${result} from /v1/bibles`,
    latencyMs: ms,
  };
}

async function probeBmc(): Promise<Probe> {
  const token = process.env.BMC_ACCESS_TOKEN;
  if (!token) {
    return {
      service: "Buy Me a Coffee",
      status: "skipped",
      detail: "BMC_ACCESS_TOKEN not set",
      latencyMs: null,
    };
  }
  const { result, ms, error } = await timed(async () => {
    const r = await fetch("https://developers.buymeacoffee.com/api/v1/supporters?page=1", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.status;
  });
  return {
    service: "Buy Me a Coffee",
    status: error ? "fail" : "ok",
    detail: error ? error : `HTTP ${result} from /supporters`,
    latencyMs: ms,
  };
}

async function probeIpwhois(): Promise<Probe> {
  const { ms, error } = await timed(async () => {
    const r = await fetch("https://ipwho.is/8.8.8.8", {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { success?: boolean };
    if (j?.success === false) throw new Error("ipwho.is returned success:false");
    return true;
  });
  return {
    service: "ipwho.is (geo enrichment)",
    status: error ? "fail" : "ok",
    detail: error ? error : "8.8.8.8 lookup OK",
    latencyMs: ms,
  };
}

async function probeRender(): Promise<Probe> {
  const key = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!key || !serviceId) {
    return {
      service: "Render (deploys)",
      status: "skipped",
      detail: "RENDER_API_KEY / RENDER_SERVICE_ID not set",
      latencyMs: null,
    };
  }
  const { result, ms, error } = await timed(async () => {
    const r = await fetch(
      `https://api.render.com/v1/services/${serviceId}/deploys?limit=1`,
      {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = (await r.json()) as Array<{ deploy?: { status?: string; commit?: { id?: string } } }>;
    const latest = arr?.[0]?.deploy;
    return `${latest?.status ?? "?"} · ${latest?.commit?.id?.slice(0, 7) ?? "?"}`;
  });
  return {
    service: "Render (deploys)",
    status: error ? "fail" : "ok",
    detail: error ? error : `latest deploy: ${result}`,
    latencyMs: ms,
  };
}
