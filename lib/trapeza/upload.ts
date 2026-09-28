"use client";

// Kitchen photo uploads from the page: shrink on the device, then send.
//
// Phone photos run 3 to 8 MB and carry EXIF, including where they were taken.
// Redrawing through a canvas at 1600px on the long side brings a photo to a
// few hundred KB and writes a fresh JPEG with no EXIF at all, so a reader's
// location never reaches the public bucket. A browser that cannot decode the
// file (HEIC in some desktop browsers) sends it as it is, and the server's
// type and size checks decide.

import { apiFetch } from "@/lib/api/client";

const MAX_SIDE = 1600;
const QUALITY = 0.85;

async function shrink(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

export type UploadResult = { ok: true; url: string } | { ok: false; status: number };

/** Upload one photo for a review ("review") or a recipe submission ("recipe"). */
export async function uploadKitchenPhoto(
  file: File,
  kind: "review" | "recipe",
): Promise<UploadResult> {
  try {
    const blob = await shrink(file);
    const form = new FormData();
    const name = blob === file ? file.name : "photo.jpg";
    form.append("file", blob, name);
    const res = await apiFetch(`/api/trapeza/upload?kind=${kind}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { url?: string };
    return json.url ? { ok: true, url: json.url } : { ok: false, status: 500 };
  } catch {
    return { ok: false, status: 0 };
  }
}
