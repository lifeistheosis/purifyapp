import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCALES } from "@/lib/i18n/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCALE_CODES = new Set(LOCALES.map((l) => l.code));

const Body = z.object({
  action: z.literal("locale-status-set"),
  locale: z.string().min(2).max(8),
  status: z.enum(["draft", "staged", "shipped"]),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: String(err) },
      { status: 400 },
    );
  }

  if (!LOCALE_CODES.has(parsed.locale as never)) {
    return NextResponse.json({ error: "Unknown locale" }, { status: 404 });
  }

  const supa = createAdminClient();
  await supa.from("locale_status").upsert(
    {
      locale: parsed.locale,
      status: parsed.status,
      notes: parsed.notes ?? null,
      last_reviewed_at: new Date().toISOString(),
      reviewer_email: admin.email ?? "unknown",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "locale" },
  );

  return NextResponse.json({ ok: true });
}
