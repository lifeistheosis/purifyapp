import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SAINTS } from "@/lib/saints/saints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAINT_SLUGS = new Set(SAINTS.map((s) => s.slug));

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("saint-complete"),
    slug: z.string().min(1).max(120),
    complete: z.boolean().nullable(), // null = clear override
  }),
  z.object({
    action: z.literal("csp-dismiss"),
    id: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("csp-bulk-dismiss"),
    ids: z.array(z.number().int().positive()).max(500),
  }),
  z.object({
    action: z.literal("cache-rebuild"),
    target: z.enum(["saints", "councils", "home", "all"]),
  }),
]);

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

  const supa = createAdminClient();
  const adminEmail = admin.email ?? "unknown";

  switch (parsed.action) {
    case "saint-complete": {
      if (!SAINT_SLUGS.has(parsed.slug)) {
        return NextResponse.json({ error: "Unknown saint" }, { status: 404 });
      }
      if (parsed.complete === null) {
        // Clear override entirely.
        await supa.from("saint_overrides").delete().eq("slug", parsed.slug);
      } else {
        await supa.from("saint_overrides").upsert(
          {
            slug: parsed.slug,
            complete: parsed.complete,
            updated_at: new Date().toISOString(),
            updated_by_email: adminEmail,
          },
          { onConflict: "slug" },
        );
      }
      revalidatePath(`/saints/${parsed.slug}`);
      revalidatePath("/saints");
      return NextResponse.json({ ok: true, slug: parsed.slug, complete: parsed.complete });
    }

    case "csp-dismiss": {
      await supa
        .from("csp_reports")
        .update({
          dismissed_at: new Date().toISOString(),
          dismissed_by_email: adminEmail,
        })
        .eq("id", parsed.id);
      return NextResponse.json({ ok: true, id: parsed.id });
    }

    case "csp-bulk-dismiss": {
      await supa
        .from("csp_reports")
        .update({
          dismissed_at: new Date().toISOString(),
          dismissed_by_email: adminEmail,
        })
        .in("id", parsed.ids);
      return NextResponse.json({ ok: true, count: parsed.ids.length });
    }

    case "cache-rebuild": {
      const map: Record<typeof parsed.target, string[]> = {
        saints: ["/saints", "/saints/[slug]"],
        councils: ["/councils", "/councils/[slug]"],
        home: ["/"],
        all: ["/", "/saints", "/councils", "/today", "/whats-new"],
      };
      for (const p of map[parsed.target]) {
        // Next 16 requires the "page" or "layout" type for dynamic routes.
        if (p.includes("[")) revalidatePath(p, "page");
        else revalidatePath(p);
      }
      return NextResponse.json({ ok: true, target: parsed.target });
    }
  }
}
