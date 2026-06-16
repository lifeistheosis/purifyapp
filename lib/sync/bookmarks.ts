"use client";

import { createClient } from "@/lib/supabase/client";
import { canSync } from "@/lib/entitlements/client";
import type { Bookmark } from "@/lib/bookmarks";

/**
 * Best-effort, eventually-consistent two-way sync of the bookmarks list
 * between localStorage (purify:bookmarks) and the public.bookmarks table.
 *
 * On every `purify:bookmark` event after sign-in, the listener pushes the
 * full local list up, duplicates are absorbed by the unique-per-locator
 * index, missing entries are inserted. On sign-in (or a force-sync call)
 * we also pull every server row down and merge into local. Local always
 * stays the source of truth on the device, so a network failure never
 * breaks the UI.
 */

const STORAGE_KEY = "purify:bookmarks";

function readLocal(): Bookmark[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
 } catch {
 return [];
 }
}

function writeLocal(items: Bookmark[]) {
 try {
 window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
 window.dispatchEvent(
 new CustomEvent("purify:bookmark", { detail: { items } }),
 );
 } catch {
 /* ignore */
 }
}

// Only these kinds carry a server-syncable locator. Prayer bookmarks
// (kind "prayer" / "prayer-rule") are device-local and skipped.
const SYNCABLE_KINDS = new Set(["bible-verse", "bible-chapter", "writing-section"]);

function locatorOf(b: Bookmark) {
 if (b.kind === "bible-verse")
 return { book: b.book, chapter: b.chapter, verse: b.verse };
 if (b.kind === "bible-chapter")
 return { book: b.book, chapter: b.chapter };
 if (b.kind === "writing-section")
 return {
 saintSlug: b.saintSlug,
 workSlug: b.workSlug,
 sectionN: b.sectionN,
 };
 return {};
}

/**
 * Order-independent key for a (kind, locator) pair. JSON.stringify alone is
 * unstable because the local locator and the server's jsonb column can carry
 * the same fields in a different key order, which silently defeated dedup and
 * re-appended every server row into localStorage on each sign-in. Sorting the
 * keys first makes both sides hash identically.
 */
function canonicalKey(kind: string, loc: Record<string, unknown>): string {
 const sorted = Object.keys(loc)
 .sort()
 .map((k) => `${k}:${String(loc[k])}`)
 .join("|");
 return `${kind}|${sorted}`;
}

/**
 * Push every local bookmark to the server (idempotent via the unique
 * locator index). Returns silently on auth/network errors.
 */
export async function pushAllLocalBookmarks() {
 try {
 // Cross-device sync is part of the Purify Plus layer. Native-aware:
 // open on web and on native until enforcement flips, then Plus-only.
 if (!(await canSync())) return;
 const supabase = createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) return;
 const items = readLocal().filter((b) => SYNCABLE_KINDS.has(b.kind));
 if (items.length === 0) return;
 const rows = items.map((b) => ({
 user_id: user.id,
 kind: b.kind,
 locator: locatorOf(b),
 label: b.label,
 added_at: new Date(b.addedAt).toISOString(),
 }));
 // ignoreDuplicates: true => ON CONFLICT DO NOTHING with no target, so
 // the unique-per-locator index quietly rejects rows that already exist
 // server-side. Adding a new bookmark client-side flows through the
 // bookmark hook, which fires `purify:bookmark`, which calls this push
 // again, so eventual consistency is two writes away in the worst case.
 await supabase.from("bookmarks").upsert(rows, { ignoreDuplicates: true });
 } catch {
 /* swallow */
 }
}

/**
 * Pull every server bookmark down and merge into local (server wins on
 * conflict by locator, since the server side carries the canonical row).
 * Newly-discovered server rows are added to local with a synthesised id.
 */
export async function pullServerBookmarks() {
 try {
 if (!(await canSync())) return;
 const supabase = createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) return;
 const { data, error } = await supabase
 .from("bookmarks")
 .select("id, kind, locator, label, added_at")
 .order("added_at", { ascending: false });
 if (error || !data) return;
 const local = readLocal();
 const localByLoc = new Map<string, Bookmark>();
 for (const b of local) {
 localByLoc.set(canonicalKey(b.kind, locatorOf(b)), b);
 }
 const merged: Bookmark[] = [...local];
 for (const row of data) {
 const key = canonicalKey(
 String(row.kind),
 (row.locator as Record<string, unknown>) ?? {},
 );
 if (localByLoc.has(key)) continue;
 // Guard against duplicate server rows within this same pull.
 localByLoc.set(key, {} as Bookmark);
 // Reconstruct the discriminated-union shape from the locator.
 const loc = row.locator as Record<string, unknown>;
 const base = {
 id: row.id as string,
 addedAt: new Date(row.added_at as string).getTime(),
 label: row.label as string,
 };
 let item: Bookmark | null = null;
 if (row.kind === "bible-verse") {
 item = {
 ...base,
 kind: "bible-verse",
 book: String(loc.book ?? ""),
 bookName: row.label?.toString().split(/\s+/)[0] ?? "",
 chapter: Number(loc.chapter ?? 0),
 verse: Number(loc.verse ?? 0),
 };
 } else if (row.kind === "bible-chapter") {
 item = {
 ...base,
 kind: "bible-chapter",
 book: String(loc.book ?? ""),
 bookName: row.label?.toString() ?? "",
 chapter: Number(loc.chapter ?? 0),
 };
 } else if (row.kind === "writing-section") {
 item = {
 ...base,
 kind: "writing-section",
 saintSlug: String(loc.saintSlug ?? ""),
 saintName: row.label?.toString().split(/ [, ,] /)[0] ?? "",
 workSlug: String(loc.workSlug ?? ""),
 workTitle: row.label?.toString().split(/ [, ,] /)[1] ?? "",
 sectionN: Number(loc.sectionN ?? 0),
 sectionTitle: row.label?.toString().split(/ [, ,] /)[2] ?? "",
 };
 }
 if (item) merged.push(item);
 }
 writeLocal(merged);
 } catch {
 /* swallow */
 }
}

/** Two-way sync. Call this on sign-in and from the "Sync now" button. */
export async function syncBookmarks() {
 await pushAllLocalBookmarks();
 await pullServerBookmarks();
}
