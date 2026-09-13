"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import Image from "next/image";

import { IMAGE_ACCEPT_ATTR } from "@/lib/shop/imageAccept";
import { isSupplierImageUrl } from "@/lib/shop/imageRights";

export type ProductMediaRow = {
  media_url: string;
  alt_text: string;
  /** The 400px copy the media route writes beside the full image. */
  thumb_url?: string | null;
};

/**
 * Visual media editor for a product listing. The FIRST row is the cover the
 * storefront shows everywhere. Images arrive by file upload (stored in the
 * public shop-media bucket via /api/admin/shop/media, which re-encodes them
 * and makes a thumbnail, so a swap needs no deploy and reaches the storefront
 * within seconds of saving) or by URL. Covers still on a supplier CDN are
 * flagged inline, because the rights gate hides those listings from shoppers.
 *
 * ORDER. Drag a row on a desktop (plain HTML5 drag and drop, no library) or
 * use the up and down arrows, which are what a thumb can operate. Both write
 * the same array, so there is one path to be right. "Make cover" is the
 * arrows' shortcut to the top.
 *
 * MANY AT ONCE. The file input takes several; they upload one after another
 * rather than in parallel, so a phone on a slow link gets a steady queue
 * instead of six timeouts, and the rows land in the order chosen.
 *
 * Thumbnails render unoptimized on purpose: supplier URLs come from
 * arbitrary hosts that are not in next/image's remotePatterns, and this is
 * an admin-only surface where optimization buys nothing.
 */
export function ProductMediaManager({
  rows,
  onChange,
  max,
}: {
  rows: ProductMediaRow[];
  onChange: (rows: ProductMediaRow[]) => void;
  /** Cap on rows; the picker refuses more and says so. */
  max?: number;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // The latest rows, for a sequential upload loop that outlives several
  // renders: each landed file appends to whatever is there NOW, not to the
  // array the loop started with.
  // Synced in its own effect rather than assigned during render
  // (react-hooks/refs); the loop only reads it after an await, by which time
  // the commit that carried the new rows has run it.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const field =
    "w-full rounded-[var(--adm-radius-sm)] border border-paper/15 bg-night px-3 py-2 font-sans text-detail text-paper placeholder:text-paper/30 focus:outline-none focus:border-paper/40";
  const smallBtn =
    "inline-flex min-h-[44px] items-center rounded-pill border border-paper/20 px-3 font-sans text-eyebrow font-semibold text-paper/70 hover:text-paper disabled:opacity-40";
  const iconBtn =
    "inline-flex h-11 w-11 items-center justify-center rounded-[var(--adm-radius-sm)] border border-paper/15 font-sans text-detail text-paper/70 hover:text-paper disabled:opacity-30";

  const full = max !== undefined && rows.length >= max;

  const setRow = (i: number, patch: Partial<ProductMediaRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= rows.length) return;
    const next = rows.slice();
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  function addByUrl() {
    const u = url.trim();
    if (!u || full) return;
    onChange([...rows, { media_url: u, alt_text: alt.trim() }]);
    setUrl("");
    setAlt("");
  }

  async function uploadAll(files: File[]) {
    setError(null);
    const room = max === undefined ? files.length : Math.max(0, max - rowsRef.current.length);
    const queue = files.slice(0, room);
    if (queue.length < files.length) {
      setError(`Up to ${max} photos per product. The first ${room} were uploaded.`);
    }
    for (let i = 0; i < queue.length; i++) {
      const file = queue[i];
      setBusy(queue.length > 1 ? `Uploading ${i + 1} of ${queue.length}` : "Uploading");
      // try/finally: a thrown fetch (flaky network) must never strand the
      // manager on "Uploading" with no visible error.
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/shop/media", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          thumbUrl?: string;
          error?: string;
        };
        if (res.ok && data.url) {
          const cleanAlt = file.name
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[-_]+/g, " ")
            .trim();
          onChange([
            ...rowsRef.current,
            { media_url: data.url, alt_text: cleanAlt, thumb_url: data.thumbUrl ?? null },
          ]);
        } else {
          setError(data.error ?? `Upload failed (${res.status}). Try again.`);
          break;
        }
      } catch {
        setError("Upload failed: network dropped. Try again.");
        break;
      } finally {
        setBusy(null);
      }
    }
  }

  function onDragStart(i: number, e: DragEvent<HTMLLIElement>) {
    setDragFrom(i);
    e.dataTransfer.effectAllowed = "move";
    // Firefox needs data set for a drag to begin at all.
    e.dataTransfer.setData("text/plain", String(i));
  }
  function onDrop(i: number, e: DragEvent<HTMLLIElement>) {
    e.preventDefault();
    if (dragFrom !== null) move(dragFrom, i);
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="font-sans text-caption text-paper/45">
          No photos yet. Upload one or more, or paste a URL below; the first is
          the cover shoppers see.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((m, i) => (
            <li
              key={`${m.media_url}-${i}`}
              draggable
              onDragStart={(e) => onDragStart(i, e)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOver !== i) setDragOver(i);
              }}
              onDragLeave={() => setDragOver((o) => (o === i ? null : o))}
              onDrop={(e) => onDrop(i, e)}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              className={
                "flex items-center gap-3 rounded-[var(--adm-radius)] border bg-night-soft/40 p-2.5 " +
                (dragOver === i && dragFrom !== null && dragFrom !== i
                  ? "border-gold/60"
                  : "border-white/8") +
                (dragFrom === i ? " opacity-50" : "")
              }
            >
              <span
                aria-hidden
                title="Drag to reorder"
                className="hidden cursor-grab select-none font-sans text-detail text-paper/30 md:block"
              >
                ⋮⋮
              </span>
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--adm-radius-sm)] border border-white/8 bg-night">
                <Image
                  src={m.thumb_url || m.media_url}
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
                    <span className="rounded-full border border-gold/40 px-2 py-0.5 font-sans text-caption font-medium tracking-[1px] text-gold-pale">
                      Cover
                    </span>
                  ) : null}
                  {isSupplierImageUrl(m.media_url) ? (
                    <span
                      title="Supplier CDN image: while this is the cover, the rights gate hides the listing from shoppers."
                      className="rounded-full border border-[color-mix(in_oklab,var(--adm-warn),transparent_60%)] px-2 py-0.5 font-sans text-caption font-medium tracking-[1px] text-[color:var(--adm-warn)]"
                    >
                      Supplier image
                    </span>
                  ) : null}
                  <span className="hidden min-w-0 truncate font-sans text-eyebrow text-paper/45 sm:block">
                    {m.media_url}
                  </span>
                </div>
                <input
                  value={m.alt_text}
                  onChange={(e) => setRow(i, { alt_text: e.target.value })}
                  placeholder="Alt text (what the photo shows)"
                  aria-label={`Alt text for photo ${i + 1}`}
                  className={field + " !py-1.5"}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move photo ${i + 1} up`}
                    className={iconBtn}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === rows.length - 1}
                    aria-label={`Move photo ${i + 1} down`}
                    className={iconBtn}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-pill border border-[color-mix(in_oklab,var(--adm-critical),transparent_60%)] px-3 font-sans text-eyebrow font-semibold text-[color:var(--adm-critical)]"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null || full}
          className="inline-flex min-h-[44px] items-center rounded-pill border border-gold/40 px-4 font-sans text-eyebrow font-semibold text-gold-pale disabled:opacity-50"
        >
          {busy ?? (rows.length === 0 ? "Add photos" : "Add more photos")}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={IMAGE_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void uploadAll(files);
            e.target.value = "";
          }}
        />
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer list-none font-sans text-caption text-paper/45 [&::-webkit-details-marker]:hidden">
            Or paste an image URL
          </summary>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1 space-y-1">
              <span className="font-sans text-caption text-paper/55">Image URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                className={field}
              />
            </label>
            <label className="min-w-[140px] flex-1 space-y-1">
              <span className="font-sans text-caption text-paper/55">Alt text</span>
              <input value={alt} onChange={(e) => setAlt(e.target.value)} className={field} />
            </label>
            <button
              type="button"
              onClick={addByUrl}
              disabled={!url.trim() || full}
              className={smallBtn}
            >
              Add URL
            </button>
          </div>
        </details>
      </div>
      {max !== undefined ? (
        <p className="font-sans text-caption text-paper/40">
          {rows.length} of {max} photos. HEIC from an iPhone is fine; each is
          resized on the way in.
        </p>
      ) : null}
      {error ? (
        <p className="font-sans text-caption text-[color:var(--adm-critical)]">{error}</p>
      ) : null}
    </div>
  );
}
