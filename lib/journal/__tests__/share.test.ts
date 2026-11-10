// Sharing a journal page (1.9, docs/1.9-build/JOURNAL.md, step 3, "sharing a
// page, one at a time, three a month" and "sharing, safely"). What a public
// copy keeps and leaves behind, the month's count made on the server, the
// page kept out of search engines until reviewed, the link set aside from the
// apps, and the SQL waiting for the owner's sign-off.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { libraryBlock, serializePage, verseBlock } from "../page";
import { monthStart, publicBody, publicPage, SHARE_DAILY_CAP, SHARE_LIMIT_FREE, SHARED_VERSE_CARDS, shareTitle, sharesLeft } from "../share";

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

  it("stops sharing only the reader's own, by deleting the copy (his yes to version B), and says so plainly before the table exists", () => {
    // One copy by its id, or every copy of a page by the page's id; the reader's own only.
    expect(route).toContain('const mine = who.admin.from("shared_pages").delete().eq("owner_id", who.user.id);');
    expect(route).toContain('const { error } = one ? await mine.eq("id", id) : await mine.eq("record_id", recordId);');
    expect(route).toMatch(/const one = id !== null && uuid\.safeParse\(id\)\.success;\s*const page = !one && recordId !== null && uuid\.safeParse\(recordId\)\.success;\s*if \(!one && !page\) return NextResponse\.json\(\{ error: "Invalid share\." \}, \{ status: 400 \}\);/);
    // Deleted, not marked withdrawn: the copy goes, and the reports on it by the table's cascade.
    expect(route).not.toContain("withdrawn_at: new Date()");
    expect(read("supabase/migrations/20261109180246_shared_pages.sql")).toMatch(/page_id uuid not null references public\.shared_pages on delete cascade/);
    expect(route).toContain("rateLimited(`journal-share-stop:");
    expect(route).toContain('return NextResponse.json({ ready: false });');
    expect(route).toContain('{ error: "Sharing is not ready yet." }, { status: 503 }');
  });

  it("says how many copies of a page are out, so the app can offer Stop sharing on it", () => {
    expect(route).toMatch(/\.eq\("owner_id", userId\)\s*\.eq\("record_id", recordId\)\s*\.is\("withdrawn_at", null\);/);
    expect(route).toContain("return NextResponse.json({ ready: true, left: who.limited ? sharesLeft(count ?? 0) : null, shared });");
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
    expect(button).toMatch(/if \(res\.status === 403\) \{\s*setReady\(\{ \.\.\.ready, left: 0 \}\);\s*upgrade\.open\("journal"\);/);
    expect(button).toContain("await shareText(");
    const composer = read("components/journal/JournalComposer.tsx");
    expect(composer).toContain("const shareable = open && !!draft.editing && !isNote && !empty;");
    expect(composer).toContain("{shareable ? <SharePageButton share={share} /> : null}");
  });

  it("Stop sharing: said under the composer's header while a copy is out, asked first, then deleted", () => {
    const composer = read("components/journal/JournalComposer.tsx");
    expect(composer).toContain("{shareable ? <SharedPageLine share={share} /> : null}");
    expect(button).toContain("if (!share.ready || share.ready.shared === 0) return null;");
    // A confirm step, in the reader's own words, because it deletes.
    expect(button).toMatch(/<ConfirmDialog\s+open=\{asking\}\s+title=\{t\("journal\.share\.stopTitle"\)\}\s+description=\{t\("journal\.share\.stopBody"\)\}\s+confirmLabel=\{t\("journal\.share\.stop"\)\}\s+cancelLabel=\{t\("common\.cancel"\)\}\s+destructive/);
    expect(button).toContain('apiFetch(`/api/journal/share?recordId=${encodeURIComponent(recordId)}`, { method: "DELETE" })');
    // Its control reaches 44px, as every control does.
    expect(button).toMatch(/data-journal-stop-sharing=""\s+className="tap-press ms-auto inline-flex min-h-11/);
    // Every language has its words.
    for (const lang of ["en", "ar", "bg", "de", "el", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"]) {
      const words = JSON.parse(read(`lib/i18n/messages/${lang}.json`)) as Record<string, string>;
      for (const key of ["journal.share.sharedLine", "journal.share.stop", "journal.share.stopTitle", "journal.share.stopBody"]) expect(words[key], `${lang} ${key}`).toBeTruthy();
    }
  });

  it("the privacy page says so, in English and in German (version B)", () => {
    const privacy = read("components/legal/PrivacyText.tsx");
    expect(privacy).toContain("Stop sharing deletes the\n copy at once, and any reports on it.");
    expect(privacy).toContain("Wenn du das Teilen\n beendest, wird die Kopie sofort gelöscht, mit allen Meldungen dazu.");
  });
});

// Fable's release check 1, M3: what keeps sharing from being turned against
// the server, without a limit any reader with Plus could meet.
describe("sharing, guarded", () => {
  const route = read("app/api/journal/share/route.ts");
  const reader = read("lib/journal/sharedPage.ts");

  it("a day's shares are capped for every account, far above a reader's use", () => {
    expect(SHARE_DAILY_CAP).toBe(50);
    expect(route).toContain('.gte("created_at", new Date(Date.now() - 86_400_000).toISOString())');
    expect(route).toMatch(/if \(\(today \?\? 0\) >= SHARE_DAILY_CAP\) \{\s*return NextResponse\.json\(\{ error: "That is a lot of sharing for one day\. Please try again tomorrow\." \}, \{ status: 429 \}\);/);
  });

  it("two shares sent at once cannot pass the month's limit: one after it is taken back", () => {
    expect(route).toContain('.order("created_at", { ascending: true })');
    expect(route).toMatch(/if \(place >= SHARE_LIMIT_FREE\) \{\s*await who\.admin\.from\("shared_pages"\)\.delete\(\)\.eq\("id", id\)\.eq\("owner_id", who\.user\.id\);/);
  });

  it("a view reads the page once, and the words of its first 20 verse cards only; no card is cut", () => {
    expect(SHARED_VERSE_CARDS).toBe(20);
    expect(reader).toContain("export const getSharedPage = cache(readSharedPage);");
    expect(reader).toContain("if (++cards > SHARED_VERSE_CARDS) break;");
    // The copy kept is the page as shared: nothing here trims it.
    expect(route).not.toMatch(/SHARED_VERSE_CARDS/);
  });

  it("a shared page is never served from the service worker's cache, so a withdrawn one is gone", () => {
    const sw = read("public/sw.js");
    const list = sw.slice(sw.indexOf("const NEVER_CACHE = ["), sw.indexOf("];", sw.indexOf("const NEVER_CACHE = [")));
    expect(list).toContain('"/p/",');
  });
});

describe("the SQL, signed off by the owner", () => {
  const sql = read("docs/1.9-build/sql/shared-pages.sql");
  const migration = read("supabase/migrations/20261109180246_shared_pages.sql");
  const statements = (text: string) => text.slice(text.indexOf("-- What it holds, and why:"));

  // Until 2026-11-09 it lived in docs alone, so no merge could run it. On his
  // yes (BRAINSTORM.md, the sheet's 4) it went into the migrations, and the
  // docs copy stays as the SQL to paste: the two must say the same.
  it("is in the migrations, word for word as the copy he signed off", () => {
    expect(migration).toContain("Signed off by the owner on 2026-11-09");
    expect(statements(migration)).toBe(statements(sql));
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
