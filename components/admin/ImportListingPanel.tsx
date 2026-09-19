"use client";

import { useState, useSyncExternalStore } from "react";

import { draftAge } from "@/lib/admin/productDrafts";
import type { ParsedListing } from "@/lib/shop/importListing";
import { priceForMargin } from "@/lib/shop/pricing";
import { Pill, ToolbarButton } from "./primitives";

/**
 * Paste a distributor's product link, get a draft listing.
 *
 * The work happens in /api/admin/shop/import: it fetches the page, reads the
 * product out of it, and hands back what it found. This panel is the two steps
 * around that: the box you paste into, and the review card that opens the draft
 * in the product editor. Nothing is ever written to the shop from here; the
 * editor's Save is still the only thing that creates a listing.
 *
 * WHEN THE SHOP BLOCKS THE FETCH (Cloudflare, a CAPTCHA, a bot check) the
 * route says so instead of failing, and the panel opens the way through: open
 * the page in your own browser where you are already a person with a session,
 * copy the page source, paste it here, and the same reader runs on it. There is
 * no solver anywhere in this, by design.
 *
 * PHOTOS STAY ON THE DISTRIBUTOR'S SERVER unless the box is ticked, because
 * they are the distributor's photos. lib/shop/imageRights.ts keeps a listing
 * out of the storefront while its main picture is on a supplier CDN, and that
 * gate reads the host, so copying the file into our bucket would hide the
 * problem rather than solve it. Ticking the box is a claim that the supplier
 * allows reseller use, and it sets resaleRightsConfirmed on the sourcing row.
 */

export type ImportedListing = {
  listing: ParsedListing;
  images: { sourceUrl: string; url: string }[];
  slug: string;
  supplierHost: string;
  supplierUrl: string;
  warnings: string[];
};

export type ImportDraftRequest = {
  imported: ImportedListing;
  /** What the shop will charge, in cents. The owner sets it here. */
  retailCents: number;
  /** True when the pictures were copied into our bucket. */
  ownsImages: boolean;
};

type Blocked = { challenge: string; message: string };

// ── The last scan, kept on this device ────────────────────────────────────
// A scan is a network round trip, sometimes a CAPTCHA cleared by hand and a
// page source pasted in. It used to live in component state only, so a closed
// tab between "Scan page" and "Open as a draft" meant doing all of it again.
// It is kept here until it is opened as a draft (the editor's own draft takes
// over from there) or cleared. Offered back with a button rather than restored
// silently, because the admin renders on the server first and a restore
// during hydration would paint one thing and then another.
const SCAN_KEY = "purify:admin.importScan.v1";
const SCAN_EVENT = "purify:admin-import-scan";
type StoredScan = { url: string; result: ImportedListing; retail: string; copyImages: boolean; savedAt: number };

function readScanRaw(): string {
  try {
    return window.localStorage.getItem(SCAN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeScan(scan: StoredScan | null) {
  try {
    if (scan) window.localStorage.setItem(SCAN_KEY, JSON.stringify(scan));
    else window.localStorage.removeItem(SCAN_KEY);
  } catch {
    /* storage refused: the scan simply is not kept */
  }
  window.dispatchEvent(new CustomEvent(SCAN_EVENT));
}

function subscribeScan(cb: () => void) {
  window.addEventListener(SCAN_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SCAN_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function parseScan(raw: string): StoredScan | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredScan;
    return v && typeof v.url === "string" && v.result?.listing ? v : null;
  } catch {
    return null;
  }
}

const field =
  "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";
const label = "font-sans text-caption text-paper/55";

function money(cents: number | null | undefined): string {
  return cents == null ? "n/a" : `$${(cents / 100).toFixed(2)}`;
}

const SOURCE_LABEL: Record<string, string> = {
  "json-ld": "the shop's own product data",
  shopify: "Shopify's product feed",
  microdata: "page microdata",
  meta: "the page's share tags",
  html: "the bare page",
  none: "nothing reliable",
};

export function ImportListingPanel({
  onDraft,
  busyLabel,
}: {
  onDraft: (req: ImportDraftRequest) => void;
  /** Shown on the button while the parent is opening the editor. */
  busyLabel?: string;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [pasted, setPasted] = useState("");
  const [copyImages, setCopyImages] = useState(false);
  const [result, setResult] = useState<ImportedListing | null>(null);
  const [retail, setRetail] = useState<string>("");
  // The raw string is the store's snapshot (a stable primitive); parsed below.
  const storedRaw = useSyncExternalStore(subscribeScan, readScanRaw, () => "");
  const stored = result ? null : parseScan(storedRaw);

  function keep(next: Partial<StoredScan> & { result: ImportedListing }) {
    writeScan({ url, retail, copyImages, savedAt: Date.now(), ...next });
  }

  async function scan(html?: string) {
    if (!url.trim()) {
      setError("Paste the link first.");
      return;
    }
    setBusy(true);
    setError(null);
    setBlocked(null);
    try {
      const res = await fetch("/api/admin/shop/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), html, withImages: copyImages }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ImportedListing> & {
        ok?: boolean;
        blocked?: boolean;
        challenge?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `That did not work (${res.status}).`);
        return;
      }
      if (data.blocked) {
        setBlocked({
          challenge: data.challenge ?? "a check",
          message: data.message ?? "That shop is not letting the server read the page.",
        });
        return;
      }
      if (!data.ok || !data.listing) {
        setError(data.message ?? "Nothing on that page looked like a product.");
        return;
      }
      const imported = data as ImportedListing;
      setResult(imported);
      setBlocked(null);
      setPasted("");
      const cost = imported.listing.priceCents;
      const suggested = cost !== null ? (priceForMargin(cost, 0.5) ?? cost * 2) : null;
      const retailText = suggested !== null ? (suggested / 100).toFixed(2) : "";
      setRetail(retailText);
      keep({ result: imported, retail: retailText, url: url.trim() });
    } catch {
      setError("The network dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setBlocked(null);
    setPasted("");
    setError(null);
    setUrl("");
    setRetail("");
    writeScan(null);
  }

  function restoreScan(scan: StoredScan) {
    setUrl(scan.url);
    setResult(scan.result);
    setRetail(scan.retail);
    setCopyImages(scan.copyImages);
    setBlocked(null);
    setError(null);
  }

  const cost = result?.listing.priceCents ?? null;
  const retailCents = Math.round(Number.parseFloat(retail || "0") * 100);

  return (
    <div className="space-y-3">
      {stored ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--adm-radius-sm)] border border-gold/30 bg-gold/[0.05] p-3">
          <p className="min-w-0 font-sans text-detail text-paper">
            📥 Your last scan is kept on this device:{" "}
            <span className="font-semibold">{stored.result.listing.title ?? stored.result.supplierHost}</span>
            <span className="text-paper/50">, {draftAge(stored.savedAt)}</span>
          </p>
          <div className="flex gap-2">
            <ToolbarButton variant="primary" onClick={() => restoreScan(stored)}>
              Bring it back
            </ToolbarButton>
            <ToolbarButton onClick={() => writeScan(null)}>Dismiss</ToolbarButton>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1 space-y-1">
          <span className={label}>Distributor link</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) void scan();
            }}
            placeholder="https://distributor.example/products/brass-censer"
            className={field}
            spellCheck={false}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void scan()}
            className="rounded-pill border border-gold/40 bg-gold/[0.08] px-4 py-2 font-sans text-caption font-semibold text-gold-pale disabled:opacity-50"
          >
            {busy ? "Reading…" : "Scan page"}
          </button>
          {result || blocked ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-pill border border-paper/15 px-3 py-2 font-sans text-caption text-paper/70"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={copyImages}
          onChange={(e) => setCopyImages(e.target.checked)}
          className="mt-[3px] h-4 w-4 shrink-0"
        />
        <span className="font-sans text-caption text-paper/55">
          Copy the photos into our storage. Only tick this when the distributor allows resellers to
          use their pictures. Left unticked, the photos stay on their server and the shop keeps the
          listing hidden until you shoot your own.
        </span>
      </label>

      {error ? (
        <p className="font-sans text-detail text-[color:var(--adm-critical)]">{error}</p>
      ) : null}

      {blocked ? (
        <div className="space-y-2 rounded-[var(--adm-radius-sm)] border border-gold/30 bg-gold/[0.05] p-3">
          <p className="font-sans text-detail text-paper">
            {blocked.message} It is {blocked.challenge}, and clearing it is yours to do, not
            something this server will try.
          </p>
          <ol className="ml-4 list-decimal space-y-1 font-sans text-caption text-paper/70">
            <li>
              <a
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
              >
                Open the page in a tab
              </a>{" "}
              and clear the check.
            </li>
            <li>Press Ctrl+U for the page source, then Ctrl+A and Ctrl+C.</li>
            <li>Paste it below and carry on.</li>
          </ol>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder="Paste the page source here"
            className={`${field} font-mono text-[11px]`}
            spellCheck={false}
          />
          <button
            type="button"
            disabled={busy || pasted.trim().length < 50}
            onClick={() => void scan(pasted)}
            className="rounded-pill border border-gold/40 bg-gold/[0.08] px-4 py-2 font-sans text-caption font-semibold text-gold-pale disabled:opacity-50"
          >
            {busy ? "Reading…" : "Read the pasted page"}
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3 rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="emerald">{result.supplierHost}</Pill>
            <span className="font-sans text-caption text-paper/55">
              read from {SOURCE_LABEL[result.listing.source] ?? result.listing.source}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-[auto,1fr]">
            {result.listing.images.length ? (
              <div className="flex gap-2">
                {(result.images.length ? result.images.map((i) => i.url) : result.listing.images)
                  .slice(0, 3)
                  .map((src) => (
                    // A distributor's CDN is not in next.config remotePatterns and should not
                    // have to be: this is a preview of a picture we may never keep.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-20 w-20 rounded-[var(--adm-radius-sm)] border border-paper/10 object-cover"
                    />
                  ))}
              </div>
            ) : null}

            <div className="min-w-0 space-y-1">
              <p className="font-sans text-detail font-semibold text-paper">
                {result.listing.title ?? "No name found"}
              </p>
              <p className="font-sans text-caption text-paper/60">
                Their price {money(cost)}
                {result.listing.sku ? ` · SKU ${result.listing.sku}` : ""}
                {result.listing.brand ? ` · ${result.listing.brand}` : ""}
                {result.listing.availability ? ` · ${result.listing.availability}` : ""}
              </p>
              {result.listing.description ? (
                <p className="line-clamp-2 font-sans text-caption text-paper/50">
                  {result.listing.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className={label}>Our price</span>
              <input
                value={retail}
                onChange={(e) => {
                  setRetail(e.target.value);
                  keep({ result, retail: e.target.value });
                }}
                inputMode="decimal"
                className={`${field} w-28`}
              />
            </label>
            {cost !== null
              ? [0.4, 0.5, 0.6].map((m) => {
                  const p = priceForMargin(cost, m);
                  if (p === null) return null;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setRetail((p / 100).toFixed(2));
                        keep({ result, retail: (p / 100).toFixed(2) });
                      }}
                      className="rounded-pill border border-paper/15 px-3 py-2 font-sans text-caption text-paper/70"
                    >
                      {Math.round(m * 100)}% margin, {money(p)}
                    </button>
                  );
                })
              : null}
          </div>

          {result.warnings.length ? (
            <ul className="ml-4 list-disc space-y-1 font-sans text-caption text-paper/60">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            disabled={!result.listing.title || !Number.isFinite(retailCents) || retailCents <= 0}
            onClick={() => {
              onDraft({ imported: result, retailCents, ownsImages: result.images.length > 0 });
              // From here the editor keeps its own draft of this listing.
              writeScan(null);
            }}
            className="rounded-pill border border-gold/40 bg-gold/[0.12] px-4 py-2 font-sans text-caption font-semibold text-gold-pale disabled:opacity-50"
          >
            {busyLabel ?? "Open as a draft listing"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
