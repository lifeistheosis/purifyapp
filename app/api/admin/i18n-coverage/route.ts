import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOCALES } from "@/lib/i18n/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-locale message-key coverage vs en.json. Uses the file system as the
// source of truth (matches authoring model); locale_status table tracks
// the operator's ship/stage decision.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const root = process.cwd();
  const msgRoot = path.join(root, "lib", "i18n", "messages");

  const enRaw = await fs.readFile(path.join(msgRoot, "en.json"), "utf8");
  const en = JSON.parse(enRaw) as Record<string, string>;
  const enKeys = Object.keys(en);
  const enTotal = enKeys.length;

  const supa = createAdminClient();
  const { data: statusRows } = await supa
    .from("locale_status")
    .select("locale, status, last_reviewed_at, reviewer_email, notes");
  const statusMap = new Map(
    (statusRows ?? []).map((r) => [r.locale as string, r]),
  );

  const rows = await Promise.all(
    LOCALES.map(async (loc) => {
      const localePath = path.join(msgRoot, `${loc.code}.json`);
      let localeJson: Record<string, string> = {};
      let fileExists = true;
      try {
        localeJson = JSON.parse(await fs.readFile(localePath, "utf8"));
      } catch {
        fileExists = false;
      }
      const present = enKeys.filter((k) => typeof localeJson[k] === "string" && localeJson[k].length > 0);
      const missing = enKeys.filter((k) => !(k in localeJson) || localeJson[k] === "");
      const extra = Object.keys(localeJson).filter((k) => !(k in en));
      const pct = enTotal > 0 ? Math.round((present.length / enTotal) * 100) : 0;
      const status = statusMap.get(loc.code);
      return {
        code: loc.code,
        nativeLabel: loc.nativeLabel,
        englishLabel: loc.englishLabel,
        registryReady: loc.ready,
        fileExists,
        totalKeys: enTotal,
        presentCount: present.length,
        missingCount: missing.length,
        extraCount: extra.length,
        coveragePct: pct,
        missingExamples: missing.slice(0, 25),
        status: (status?.status as string | undefined) ?? "draft",
        lastReviewedAt: (status?.last_reviewed_at as string | undefined) ?? null,
        reviewerEmail: (status?.reviewer_email as string | undefined) ?? null,
        notes: (status?.notes as string | undefined) ?? null,
      };
    }),
  );

  return NextResponse.json(
    {
      enTotalKeys: enTotal,
      locales: rows,
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
