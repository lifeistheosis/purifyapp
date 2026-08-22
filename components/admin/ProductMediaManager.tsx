"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { isSupplierImageUrl } from "@/lib/shop/imageRights";

export type ProductMediaRow = { media_url: string; alt_text: string };

/**
 * Visual media editor for a product listing. The FIRST row is the cover the
 * storefront shows everywhere; "Make cover" reorders instead of asking the
 * admin to retype URLs. Images arrive by URL or by file upload (stored in
 * the public shop-media bucket via /api/admin/shop/media, so a swap needs
 * no deploy and reaches the storefront within seconds of saving). Covers
 * still on a supplier CDN are flagged inline, because the rights gate hides
 * those listings from shoppers.
 *
 * Thumbnails render unoptimized on purpose: supplier URLs come from
 * arbitrary hosts that are not in next/image's remotePatterns, and this is
 * an admin-only surface where optimization buys nothing.
 */
export function ProductMediaManager({
  rows,
  onChange,
}: {
  rows: ProductMediaRow[];
  onChange: (rows: ProductMediaRow[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const field =
    "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";
  const smallBtn =
    "rounded-pill border border-paper/20 px-3 py-1 font-sans text-eyebrow font-semibold text-paper/70 hover:text-paper disabled:opacity-50";

  const setRow = (i: number, patch: Partial<ProductMediaRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const makeCover = (i: number) =>
    onChange([rows[i], ...rows.filter((_, j) => j !== i)]);
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));

  function addByUrl() {
    const u = url.trim();
    if (!u) return;
    onChange([...rows, { media_url: u, alt_text: alt.trim() }]);
    setUrl("");
    setAlt("");
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    // try/finally: a thrown fetch (flaky network) must never strand the
    // manager on "Uploading…" with no visible error.
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/shop/media", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (res.ok && data.url) {
        const cleanAlt = file.name
          .replace(/\.[a-z0-9]+$/i, "")
          .replace(/[-_]+/g, " ")
          .trim();
        onChange([...rows, { media_url: data.url, alt_text: cleanAlt }]);
      } else {
        setError(data.error ?? `Upload failed (${res.status}). Try again.`);
      }
    } catch {
      setError("Upload failed: network dropped. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="font-sans text-caption text-paper/45">
          No images yet. Upload one or paste a URL below; the first image is
          the cover shoppers see.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((m, i) => (
            <li
              key={`${m.media_url}-${i}`}
              className="flex items-center gap-3 rounded-[var(--adm-radius)] border border-white/8 bg-night-soft/40 p-2.5"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/8 bg-night">
                <Image
                  src={m.media_url}
                  alt=""
                  fill
                  sizes="56px"
                  unoptimized
                  className="object-cover"
                />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {i === 0 ? (
                    <span className="rounded-full border border-gold/40 bg-gold/[0.08] px-2 py-0.5 font-sans text-caption font-medium tracking-[1px] text-gold">
                      Cover
                    </span>
                  ) : null}
                  {isSupplierImageUrl(m.media_url) ? (
                    <span
                      title="Supplier CDN image: while this is the cover, the rights gate hides the listing from shoppers."
                      className="rounded-full border border-[color-mix(in_oklab,var(--adm-warn),transparent_60%)] bg-[color-mix(in_oklab,var(--adm-warn),transparent_94%)] px-2 py-0.5 font-sans text-caption font-medium tracking-[1px] text-[color:var(--adm-warn)]"
                    >
                      Supplier image
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate font-sans text-eyebrow text-paper/45">
                    {m.media_url}
                  </span>
                </div>
                <input
                  value={m.alt_text}
                  onChange={(e) => setRow(i, { alt_text: e.target.value })}
                  placeholder="Alt text (what the image shows)"
                  aria-label={`Alt text for image ${i + 1}`}
                  className={field + " !py-1.5"}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {i > 0 ? (
                  <button
                    type="button"
                    onClick={() => makeCover(i)}
                    className={smallBtn}
                  >
                    Make cover
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className={
                    "rounded-pill border border-[color-mix(in_oklab,var(--adm-critical),transparent_60%)] bg-[color-mix(in_oklab,var(--adm-critical),transparent_94%)] px-3 py-1 font-sans text-eyebrow font-semibold text-[color:var(--adm-critical)] hover:bg-[color-mix(in_oklab,var(--adm-critical),transparent_88%)]"
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 space-y-1">
          <span className="font-sans text-caption text-paper/55">Image URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={field}
          />
        </label>
        <label className="min-w-[160px] flex-1 space-y-1">
          <span className="font-sans text-caption text-paper/55">Alt text</span>
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className={field}
          />
        </label>
        <button
          type="button"
          onClick={addByUrl}
          disabled={!url.trim()}
          className={smallBtn + " !py-2"}
        >
          Add URL
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-pill border border-gold/40 bg-gold/[0.08] px-3 py-2 font-sans text-eyebrow font-semibold text-gold disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload image"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p className="font-sans text-caption text-[color:var(--adm-critical)]">{error}</p>
      ) : null}
    </div>
  );
}
