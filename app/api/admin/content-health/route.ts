import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SAINTS } from "@/lib/saints/saints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only content inventory. Walks the data/ tree and lib/saints registry,
// reports what's missing. The operator opens the file path to fix things in git.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const root = process.cwd();
  const supa = createAdminClient();

  const { data: overrides } = await supa
    .from("saint_overrides")
    .select("slug, complete");
  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.slug as string, o.complete as boolean | null]),
  );

  const saintRows = await Promise.all(
    SAINTS.map(async (s) => {
      const effectiveComplete =
        overrideMap.get(s.slug) ?? s.complete ?? false;
      const iconRelPath = s.iconUrl ?? null;
      let iconOk = false;
      if (iconRelPath) {
        const abs = path.join(root, "public", iconRelPath.replace(/^\//, ""));
        iconOk = await fileExists(abs);
      }
      const deI18nPath = path.join(
        root,
        "data",
        "saints",
        s.slug,
        "i18n",
        "de.json",
      );
      const hasDeI18n = await fileExists(deI18nPath);
      const licensedWorksPath = path.join(
        root,
        "data",
        "saints",
        s.slug,
        "licensed-works.json",
      );
      const hasLicensedWorks = await fileExists(licensedWorksPath);
      return {
        slug: s.slug,
        name: s.name,
        worksCount: s.works.length,
        complete: effectiveComplete,
        iconUrl: iconRelPath,
        iconOk,
        hasDeI18n,
        hasLicensedWorks,
        filePath: `lib/saints/saints.ts`,
      };
    }),
  );

  const incomplete = saintRows.filter((r) => !r.complete);
  const missingIcons = saintRows.filter((r) => r.iconUrl && !r.iconOk);
  const noIconAtAll = saintRows.filter((r) => !r.iconUrl);
  const missingDe = saintRows.filter((r) => !r.hasDeI18n);
  const missingLicensedWorks = saintRows.filter((r) => !r.hasLicensedWorks);

  // Calendar coverage.
  const calendarPath = path.join(
    root,
    "data",
    "calendar",
    "daily-saints.json",
  );
  let calendarDays = 0;
  let calendarMissing: string[] = [];
  try {
    const raw = JSON.parse(await fs.readFile(calendarPath, "utf8"));
    calendarDays = Object.keys(raw).length;
    calendarMissing = listMissingMmDd(Object.keys(raw)).slice(0, 25);
  } catch {
    /* file missing — surface as zero */
  }

  // Bible book coverage.
  const bibleRoot = path.join(root, "data", "bible");
  let bibleBooks: { book: string; chapters: number }[] = [];
  try {
    const entries = await fs.readdir(bibleRoot, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const chapters = await fs.readdir(path.join(bibleRoot, e.name));
      const count = chapters.filter((c) => c.endsWith(".json")).length;
      bibleBooks.push({ book: e.name, chapters: count });
    }
    bibleBooks.sort((a, b) => a.book.localeCompare(b.book));
  } catch {
    /* directory missing */
  }

  return NextResponse.json(
    {
      saints: {
        total: saintRows.length,
        incomplete: incomplete.length,
        missingIcons: missingIcons.length,
        noIconAtAll: noIconAtAll.length,
        missingDe: missingDe.length,
        missingLicensedWorks: missingLicensedWorks.length,
        rows: saintRows,
      },
      calendar: {
        days: calendarDays,
        missingExamples: calendarMissing,
        expectedDays: 366,
      },
      bible: {
        books: bibleBooks,
      },
      generatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function listMissingMmDd(present: string[]): string[] {
  const set = new Set(present);
  const out: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const days = new Date(2024, m, 0).getDate(); // leap year for Feb 29
    for (let d = 1; d <= days; d++) {
      const key = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (!set.has(key)) out.push(key);
    }
  }
  return out;
}
