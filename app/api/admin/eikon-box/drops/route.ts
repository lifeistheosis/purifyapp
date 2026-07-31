import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { canMoveDrop } from "@/lib/eikonBox/status";
import type { DropStatus } from "@/lib/eikonBox/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin CRUD for monthly drops.
 *
 * NOT gated on eikonBoxEnabled(): the owner has to be able to build and
 * inspect August's drop while the member side is still dark. The email
 * allowlist in getAdminUser() is the gate.
 */

const DROP_COLUMNS =
  "id, title, period_month, teaser, image_url, status, claims_open_at, claims_close_at, sourcing_notes, created_by_email, created_at, updated_at";

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("eikon_drops")
    .select(DROP_COLUMNS)
    .order("period_month", { ascending: false })
    .limit(24);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const drops = data ?? [];

  // Claim counts per drop. Two head-only counts each, which is cheap and
  // avoids pulling every claim row just to size the sourcing run.
  const withCounts = await Promise.all(
    drops.map(async (d) => {
      const [{ count: claims }, { count: outstanding }] = await Promise.all([
        admin
          .from("eikon_drop_claims")
          .select("id", { count: "exact", head: true })
          .eq("drop_id", d.id)
          .neq("status", "cancelled"),
        admin
          .from("eikon_drop_claims")
          .select("id", { count: "exact", head: true })
          .eq("drop_id", d.id)
          .in("status", ["claimed", "packed"]),
      ]);
      return { ...d, claimsCount: claims ?? 0, notShippedCount: outstanding ?? 0 };
    }),
  );

  // How many members could claim right now, so the owner can read take-up
  // rather than a bare number.
  const { count: activePro } = await admin
    .from("entitlements")
    .select("user_id", { count: "exact", head: true })
    .gt("pro_until", new Date().toISOString());

  return NextResponse.json({ drops: withCounts, activeProCount: activePro ?? 0 });
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Use the first of the month"),
  teaser: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  claimsOpenAt: z.string().datetime().optional().nullable(),
  claimsCloseAt: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid drop." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Always born as a draft. Opening a drop is a separate, deliberate act.
  const { data, error } = await admin
    .from("eikon_drops")
    .insert({
      title: parsed.data.title,
      period_month: parsed.data.periodMonth,
      teaser: parsed.data.teaser ?? null,
      image_url: parsed.data.imageUrl ?? null,
      claims_open_at: parsed.data.claimsOpenAt ?? null,
      claims_close_at: parsed.data.claimsCloseAt ?? null,
      status: "draft",
      created_by_email: adminUser.email ?? null,
    })
    .select(DROP_COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A live drop already exists for that month." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, drop: data });
}

const patchSchema = z.object({
  dropId: z.string().uuid(),
  title: z.string().min(1).max(120).optional(),
  teaser: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  claimsOpenAt: z.string().datetime().optional().nullable(),
  claimsCloseAt: z.string().datetime().optional().nullable(),
  sourcingNotes: z.string().max(4000).optional().nullable(),
  status: z
    .enum(["draft", "open", "closed", "fulfilling", "shipped", "cancelled"])
    .optional(),
});

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  const p = parsed.data;

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("eikon_drops")
    .select("id, status, claims_close_at")
    .eq("id", p.dropId)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "Drop not found." }, { status: 404 });

  if (p.status && p.status !== current.status) {
    if (!canMoveDrop(current.status as DropStatus, p.status)) {
      return NextResponse.json(
        { error: `A ${current.status} drop cannot move to ${p.status}.` },
        { status: 409 },
      );
    }
    // An open drop with no deadline makes "an unclaimed box is not carried
    // over" unenforceable, and that rule is the whole economic model. Refuse
    // to open one.
    if (p.status === "open") {
      const close = p.claimsCloseAt ?? current.claims_close_at;
      if (!close || new Date(close).getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error:
              "Set a claim deadline in the future before opening this drop.",
          },
          { status: 409 },
        );
      }
    }
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("eikon_drops")
    .update({
      ...(p.title !== undefined ? { title: p.title } : {}),
      ...(p.teaser !== undefined ? { teaser: p.teaser } : {}),
      ...(p.imageUrl !== undefined ? { image_url: p.imageUrl } : {}),
      ...(p.claimsOpenAt !== undefined ? { claims_open_at: p.claimsOpenAt } : {}),
      ...(p.claimsCloseAt !== undefined ? { claims_close_at: p.claimsCloseAt } : {}),
      ...(p.sourcingNotes !== undefined ? { sourcing_notes: p.sourcingNotes } : {}),
      ...(p.status ? { status: p.status } : {}),
      updated_at: now,
    })
    .eq("id", p.dropId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cancelling the drop cancels every box that has not already gone out.
  // A shipped claim is left alone: the parcel exists.
  if (p.status === "cancelled") {
    const { error: cascade } = await admin
      .from("eikon_drop_claims")
      .update({
        status: "cancelled",
        cancel_reason: "Drop cancelled",
        updated_at: now,
      })
      .eq("drop_id", p.dropId)
      .in("status", ["claimed", "packed"]);
    if (cascade) {
      console.error("[eikon-box] cancel cascade failed", cascade.message);
      return NextResponse.json(
        { error: "Drop cancelled, but some claims could not be updated." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
