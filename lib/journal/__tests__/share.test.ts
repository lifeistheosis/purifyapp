// Sharing a journal page (1.9, docs/1.9-build/JOURNAL.md, step 3, "sharing a
// page, one at a time, three a month" and "sharing, safely"). What a public
// copy keeps and leaves behind, the month's count made on the server, the
// page kept out of search engines until reviewed, the link set aside from the
// apps, and the SQL waiting for the owner's sign-off.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { libraryBlock, serializePage, verseBlock } from "../page";
import { monthStart, publicBody, publicPage, SHARE_LIMIT_FREE, shareTitle, sharesLeft } from "../share";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("what a shared copy keeps", () => {
  const body = serializePage({
    title: "My page",
    notebook: "Private notebook",
    tags: ["private-tag"],
    style: { font: "sans" },
    cover: "john-chrysostom.v2.jpg",
    blocks: [
      { type: "text", text: "My words." },
      verseBlock("john", 4, 14)!,
      libraryBlock("Lord, have mercy.", "The Jesus Prayer", "/prayers/")!,
    ],
  });

  it("keeps the title, the words, Scripture's cards, the style and the cover; never the notebook or the tags", () => {
    const page = publicPage(body)!;
    expect(page.title).toBe("My page");
    expect(page.style).toEqual({ font: "sans" });
    expect(page.cover).toBe("john-chrysostom.v2.jpg");
    expect(page).not.toHaveProperty("notebook");
    expect(page).not.toHaveProperty("tags");
    expect(publicBody(body)).not.toContain("Private notebook");
    expect(publicBody(body)).not.toContain("private-tag");
  });

  it("a library quote goes as a plain quote, cited, without the library's mark", () => {
    const page = publicPage(body)!;
    expect(page.blocks.some((b) => b.type === "library")).toBe(false);
    expect(page.blocks).toContainEqual({ type: "quote", text: "Lord, have mercy.", by: "The Jesus Prayer" });
    expect(publicBody(body)).not.toContain("[[library");
  });

  it("an empty page is not shared, and a page is named by its title or first words", () => {
    expect(publicPage("[[notebook Only a notebook]]")).toBeNull();
    expect(shareTitle({ title: "", blocks: [{ type: "text", text: "First words\nand more" }] })).toBe("First words and more");
  });

  it("counts by the calendar month, three for a reader without Plus, never below none", () => {
    expect(monthStart(new Date("2026-11-08T23:30:00Z")).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(SHARE_LIMIT_FREE).toBe(3);
    expect(sharesLeft(0)).toBe(3);
    expect(sharesLeft(2)).toBe(1);
    expect(sharesLeft(7)).toBe(0);
  });
});

describe("the server makes the copy, and the count", () => {
  const route = read("app/api/journal/share/route.ts");
  const report = read("app/api/journal/share/report/route.ts");

  it("signed in, behind zod and a rate limit, written with the service role", () => {
    expect(route).toContain('rateLimited(`journal-share:${ipKey(req.headers)}`');
    expect(route).toContain("postSchema.safeParse(raw)");
    expect(route).toContain("z.string().min(1).max(MAX_BODY)");
    expect(route).toContain('{ error: "Sign in to share a page." }, { status: 401 }');
    expect(route).toContain("createAdminClient()");
  });

  it("stores only the public copy, never the body as sent", () => {
    expect(route).toContain("const body = publicBody(parsed.data.body);");
    expect(route).toMatch(/\.insert\(\{ owner_id: who\.user\.id, record_id: parsed\.data\.recordId \?\? null, title: shareTitle\(parsePage\(body\)\), body \}\)/);
  });

  it("counts this month's shares from the table, and refuses a reader without Plus who has none left", () => {
    expect(route).toContain('.gte("created_at", monthStart(new Date()).toISOString())');
    expect(route).toContain('.eq("owner_id", userId)');
    expect(route).toMatch(/if \(who\.limited && sharesLeft\(count \?\? 0\) === 0\) \{\s*return NextResponse\.json\(\{ error: "No shares left this month\.", left: 0 \}, \{ status: 403 \}\);/);
    // Plus is asked of the server's own table, where Plus is enforced.
    expect(route).toContain("deriveEntitlements(data as EntitlementRow | null, { enforced: true }).plusFeatures");
  });

  it("stops sharing only the reader's own, and says so plainly before the table exists", () => {
    expect(route).toMatch(/update\(\{ withdrawn_at: new Date\(\)\.toISOString\(\) \}\)\.eq\("id", id\)\.eq\("owner_id", who\.user\.id\)/);
    expect(route).toContain('return NextResponse.json({ ready: false });');
    expect(route).toContain('{ error: "Sharing is not ready yet." }, { status: 503 }');
  });

  it("a report: signed in, once per reader, rate limited", () => {
    expect(report).toContain('{ error: "Sign in to report something." }, { status: 401 }');
    expect(report).toContain('error.code !== "23505"');
    expect(report).toContain("rateLimited(`journal-share-report:");
  });
});

describe("the shared page", () => {
  const page = read("app/(app)/p/[id]/page.tsx");
  const reader = read("lib/journal/sharedPage.ts");
  const view = read("components/journal/SharedPageView.tsx");
  const button = read("components/journal/SharePageButton.tsx");

  it("is kept out of search engines until reviewed, and is gone when withdrawn or hidden", () => {
    expect(page).toContain("robots: { index: shared.reviewed, follow: false }");
    expect(page).toContain("if (!shared) notFound();");
    expect(reader).toContain("if (!row || row.withdrawn_at || row.hidden_at) return null;");
    // Made safe again on the way out, whatever the row holds.
    expect(reader).toContain("const page = publicPage(row.body);");
  });

  it("says it is a reader's page made with Purify, with Report on it", () => {
    expect(view).toContain('t("journal.share.made")');
    expect(view).toContain('"/api/journal/share/report"');
    expect(view).not.toContain("journal.page.fromLibrary");
  });

  it("is the website's: the apps open the link", () => {
    expect(read("scripts/native-build.mjs")).toContain('["app", "(app)", "p"],');
  });

  it("the Share button: only where it works; with none left, the upgrade sheet named for the journal", () => {
    expect(button).toContain("if (!ready) return null;");
    expect(button).toMatch(/if \(res\.status === 403\) \{\s*setReady\(\{ left: 0 \}\);\s*upgrade\.open\("journal"\);/);
    expect(button).toContain("await shareText(");
    expect(read("components/journal/JournalComposer.tsx")).toContain("{open && draft.editing && !isNote && !empty ? <SharePageButton");
  });
});

describe("the SQL waits for the owner", () => {
  const sql = read("docs/1.9-build/sql/shared-pages.sql");

  it("lives in docs, not in the migrations a merge runs", () => {
    expect(sql).toContain("NOT APPLIED. NOT A MIGRATION YET.");
  });

  it("runs twice, keeps RLS on, and lets nobody write from the app", () => {
    expect(sql).toContain("create table if not exists public.shared_pages");
    expect(sql).toContain("create table if not exists public.shared_page_reports");
    expect(sql).toMatch(/drop policy if exists "shared_pages_owner_select" on public\.shared_pages;\s*create policy "shared_pages_owner_select"/);
    expect(sql).toContain("alter table public.shared_pages enable row level security;");
    expect(sql).toContain("alter table public.shared_page_reports enable row level security;");
    expect(sql).not.toMatch(/for insert|for update|for delete/i);
  });
});
