/**
 * Unsaved product listings, kept on this device until they are saved.
 *
 * WHY. A listing read off a distributor's page, or typed from scratch, lived
 * only in React state. Closing the tab, a browser crash, a phone locking with
 * the admin open, or a mis-click on the dialog's backdrop threw away the scan
 * and every field typed after it. Now every change lands here within a second,
 * and the Products panel offers the draft back.
 *
 * ON THE DEVICE, NOT THE SERVER, on purpose. A draft is half-typed work that
 * has not been checked by anyone, and the products table is what the
 * storefront reads; a server-side draft would be one wrong status away from
 * being public. localStorage also survives the tab closing, which is the whole
 * requirement, with no migration and no write path to secure.
 *
 * Pure over a Storage-shaped object, so the rules are tested in node.
 */

export type ProductDraftKind = "import" | "custom" | "edit";

export type ProductDraft<P = unknown, S = unknown> = {
  /** "edit:<productId>" for an existing product, "new:<random>" otherwise. */
  id: string;
  kind: ProductDraftKind;
  productId: string | null;
  title: string;
  /** Where an import came from, for the list ("temu.com"). */
  supplierHost: string | null;
  savedAt: number;
  product: P;
  sourcing: S;
  supplierName: string;
};

export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

export const DRAFTS_KEY = "purify:admin.productDrafts.v1";
/** Enough for a week of imports; the oldest falls off first. */
export const MAX_DRAFTS = 20;
/** A month-old half-listing is not work anyone is coming back to. */
export const DRAFT_TTL_MS = 30 * 86_400_000;

function readAll(storage: DraftStorage): ProductDraft[] {
  try {
    const raw = storage.getItem(DRAFTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is ProductDraft =>
        !!d &&
        typeof (d as ProductDraft).id === "string" &&
        typeof (d as ProductDraft).savedAt === "number" &&
        typeof (d as ProductDraft).kind === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(storage: DraftStorage, drafts: ProductDraft[]): boolean {
  try {
    storage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    return true;
  } catch {
    // Quota or a locked-down browser. The editor says the draft could not be
    // kept rather than claiming it was.
    return false;
  }
}

/** Every live draft, newest first. Expired ones are dropped on the way out. */
export function listDrafts(storage: DraftStorage, now: number = Date.now()): ProductDraft[] {
  return readAll(storage)
    .filter((d) => now - d.savedAt < DRAFT_TTL_MS)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function getDraft(storage: DraftStorage, id: string, now: number = Date.now()): ProductDraft | null {
  return listDrafts(storage, now).find((d) => d.id === id) ?? null;
}

/** Insert or replace by id. Returns false when the browser would not store it. */
export function saveDraft(storage: DraftStorage, draft: ProductDraft, now: number = Date.now()): boolean {
  const rest = listDrafts(storage, now).filter((d) => d.id !== draft.id);
  return writeAll(storage, [draft, ...rest].slice(0, MAX_DRAFTS));
}

export function deleteDraft(storage: DraftStorage, id: string, now: number = Date.now()): void {
  const all = listDrafts(storage, now);
  const next = all.filter((d) => d.id !== id);
  if (next.length !== all.length) writeAll(storage, next);
}

/** A fresh id for a listing that has no product row yet. */
export function newDraftId(random: () => string = () => Math.random().toString(36).slice(2, 10)): string {
  return `new:${Date.now().toString(36)}${random()}`;
}

/** "just now", "4 min ago", "3 h ago", "2 d ago". */
export function draftAge(savedAt: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - savedAt) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
