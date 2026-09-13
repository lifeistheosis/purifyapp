import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { readBlessingConfigWith, type BlessingConfig } from "@/lib/shop/blessing";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The one blessing config, read and written with the service role.
 *
 * GET answers { config, tableAbsent }. The service role sees a disabled row
 * (the public policy would hide it), so the owner can edit a config that is
 * switched off. tableAbsent is true until 20260905_shop_simple.sql lands, and
 * the card says so rather than offering a save that cannot land.
 *
 * POST upserts row 1. Em dashes are refused here, before the storefront has
 * to carry one (docs/editorial-standards.md).
 */

const bodySchema = z.object({
  enabled: z.boolean(),
  parishName: z.string().max(200),
  copyMd: z.string().max(4000),
  handlingCents: z.number().int().min(0).max(100_000),
});

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  // One raw read to learn whether the table exists; readBlessingConfig folds
  // that answer into "disabled", which is right for the storefront and wrong
  // for a card that has to say why it is read-only.
  const probe = await admin.from("shop_blessing_config").select("id").limit(1);
  const tableAbsent = Boolean(probe.error && isTableAbsent(probe.error));
  const config: BlessingConfig = tableAbsent
    ? { enabled: false, parishName: "", copyMd: "", handlingCents: 0, updatedAt: null }
    : await readBlessingConfigWith(admin);
  return NextResponse.json({ config, tableAbsent });
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid config.", field: issue?.path[0] },
      { status: 400 },
    );
  }
  const c = parsed.data;
  if (/—/.test(c.copyMd) || /—/.test(c.parishName)) {
    return NextResponse.json(
      { error: "No em dashes in storefront copy. Use a comma, a colon or a full stop.", field: "copyMd" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("shop_blessing_config").upsert({
    id: 1,
    enabled: c.enabled,
    parish_name: c.parishName.trim(),
    copy_md: c.copyMd,
    handling_cents: c.handlingCents,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (isTableAbsent(error)) {
      return NextResponse.json(
        {
          error:
            "The blessing config needs the shop_simple migration (supabase/migrations/20260905_shop_simple.sql).",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
