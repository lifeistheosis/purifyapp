// Content package manifest + transactional import.
//
// A content package is a JSON document: a manifest (versions + per-type counts
// + a SHA-256 over the records) and the records themselves. The starter
// package shipped in the APK and any downloaded update share this format, so
// one importer handles both.
//
// Safety contract (acceptance: "never leave the library corrupted"):
//   - the whole import runs in ONE transaction,
//   - existing content is replaced inside that transaction,
//   - so an interrupted or failing import rolls back and the prior version
//     stays intact. The new content_version is only written on success.

import {
  SCHEMA_SQL,
  SCHEMA_VERSION,
  META,
  CONTENT_TYPES,
  type ContentType,
  type ContentRecord,
} from "./schema";
import type { ContentStore } from "./storage/types";

/** A package record is a content row plus the searchable body text the
 *  packager extracted (kept out of `json` so the verbatim record is untouched). */
export type PackageRecord = ContentRecord & { search?: string };

export type ManifestItem = { type: ContentType; count: number };

export type ContentManifest = {
  /** Human-orderable content version, e.g. "2026.06.30-1". */
  contentVersion: string;
  schemaVersion: number;
  generatedAt: string;
  items: ManifestItem[];
  recordCount: number;
  /** SHA-256 (hex) over the canonical JSON of `records`. */
  sha256: string;
};

export type ContentPackage = {
  manifest: ContentManifest;
  records: PackageRecord[];
};

const enc = new TextEncoder();

/** SHA-256 hex via Web Crypto — available in Node 20+ and the device WebView,
 *  so the same checksum runs at package time, in tests, and on device. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Canonical serialization the checksum is computed over (stable across
 *  packager and verifier). Records are sorted by (type, ref_id). */
export function canonicalRecords(records: PackageRecord[]): string {
  const sorted = [...records].sort((a, b) =>
    a.type === b.type
      ? a.ref_id < b.ref_id
        ? -1
        : a.ref_id > b.ref_id
          ? 1
          : 0
      : a.type < b.type
        ? -1
        : 1,
  );
  return JSON.stringify(
    sorted.map((r) => [r.type, r.ref_id, r.title, r.key ?? "", r.json]),
  );
}

export function buildManifest(
  contentVersion: string,
  records: PackageRecord[],
  sha256: string,
): ContentManifest {
  const counts = new Map<ContentType, number>();
  for (const r of records) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  return {
    contentVersion,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    items: [...counts.entries()].map(([type, count]) => ({ type, count })),
    recordCount: records.length,
    sha256,
  };
}

/** Structural checks (cheap, no hashing). Returns the first problem or null. */
export function validateManifest(m: ContentManifest): string | null {
  if (m.schemaVersion !== SCHEMA_VERSION)
    return `schema ${m.schemaVersion} != app schema ${SCHEMA_VERSION}`;
  if (!Array.isArray(m.items)) return "items missing";
  for (const it of m.items) {
    if (!CONTENT_TYPES.includes(it.type)) return `unknown content type ${it.type}`;
    if (!(it.count >= 0)) return `bad count for ${it.type}`;
  }
  const sum = m.items.reduce((n, it) => n + it.count, 0);
  if (sum !== m.recordCount)
    return `item counts (${sum}) != recordCount (${m.recordCount})`;
  return null;
}

/** Full integrity check: structure, record count, and checksum match. */
export async function verifyPackage(pkg: ContentPackage): Promise<string | null> {
  const structural = validateManifest(pkg.manifest);
  if (structural) return structural;
  if (pkg.records.length !== pkg.manifest.recordCount)
    return `records (${pkg.records.length}) != manifest (${pkg.manifest.recordCount})`;
  const got = await sha256Hex(canonicalRecords(pkg.records));
  if (got !== pkg.manifest.sha256) return "checksum mismatch";
  return null;
}

/** Apply the schema if needed (idempotent). */
export async function ensureSchema(store: ContentStore): Promise<void> {
  await store.exec(SCHEMA_SQL);
  await store.run(
    "INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)",
    [META.schemaVersion, String(SCHEMA_VERSION)],
  );
}

export class PackageImportError extends Error {}

/**
 * Import a package transactionally. On any failure (bad checksum, interrupted
 * write) the transaction rolls back and the prior library + content_version
 * are untouched. Returns the newly installed contentVersion.
 */
export async function importPackage(
  store: ContentStore,
  pkg: ContentPackage,
  opts: { verify?: boolean } = {},
): Promise<string> {
  await ensureSchema(store);

  if (opts.verify !== false) {
    const problem = await verifyPackage(pkg);
    if (problem) throw new PackageImportError(`package invalid: ${problem}`);
  }

  await store.transaction(async (tx) => {
    // Replace content + its search index atomically.
    await tx.run("DELETE FROM content");
    await tx.run("DELETE FROM search_index");
    for (const r of pkg.records) {
      await tx.run(
        "INSERT INTO content (type, ref_id, title, key, json) VALUES (?, ?, ?, ?, ?)",
        [r.type, r.ref_id, r.title, r.key ?? null, r.json],
      );
      await tx.run(
        "INSERT INTO search_index (type, ref_id, title, body) VALUES (?, ?, ?, ?)",
        [r.type, r.ref_id, r.title.toLowerCase(), (r.search ?? r.title).toLowerCase()],
      );
    }
    await tx.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [
      META.contentVersion,
      pkg.manifest.contentVersion,
    ]);
    await tx.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [
      META.lastUpdateAt,
      new Date().toISOString(),
    ]);
  });

  return pkg.manifest.contentVersion;
}

/** The installed content version, or null before the first import. */
export async function installedContentVersion(
  store: ContentStore,
): Promise<string | null> {
  const row = await store.get<{ value: string }>(
    "SELECT value FROM meta WHERE key = ?",
    [META.contentVersion],
  );
  return row?.value ?? null;
}
