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

// On-demand probes for the outbound services Purify depends on. Pure
// liveness check — nothing persisted. The Render row is optional and
// only runs when RENDER_API_KEY is set.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const probes = await Promise.all([
    probeSupabase(),
    probeApiBible(),
    probeBmc(),
    probeIpwhois(),
    probeRender(),
  ]);

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

async function probeApiBible(): Promise<Probe> {
  const key = process.env.API_BIBLE_KEY ?? process.env.NEXT_PUBLIC_API_BIBLE_KEY;
  if (!key) {
    return {
      service: "API.Bible (licensed Scripture)",
      status: "skipped",
      detail: "API_BIBLE_KEY not set",
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
