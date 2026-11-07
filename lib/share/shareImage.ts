"use client";

// Hand a picture to the phone's own share sheet, or save it where there is
// none.
//
// Three ways, tried in this order:
//   1. Inside the apps, the Capacitor Share plugin. The WebView has no Web
//      Share API of its own, so `navigator.share` is not there to ask. The
//      plugin shares a FILE, so the picture is written to the app's cache
//      first.
//   2. In a browser that can share files (phones, mostly), the Web Share API.
//   3. Anywhere else, a download, which on a computer is what a reader wants
//      anyway.
// A reader who closes the share sheet has not hit an error, and is told
// nothing.

import { isNativeClient } from "@/lib/platform/native";
import { downloadFile } from "@/lib/ui/downloadFile";

export type ShareOutcome = "shared" | "saved" | "dismissed" | "failed";

/** A share sheet closed without choosing anything is not a failure. */
function wasDismissed(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name ?? "";
  const message = (e as { message?: string } | null)?.message ?? "";
  return name === "AbortError" || /cancel/i.test(message);
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("could not read the picture"));
    reader.onload = () => {
      const url = String(reader.result ?? "");
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

const download = downloadFile;

export async function shareImage(blob: Blob, fileName: string, text: string): Promise<ShareOutcome> {
  return shareFile(blob, fileName, text, "image/png");
}

/**
 * Any file, the same three ways (1.9: Export your library, whose downloads
 * the apps' WebView does not save; a file handed to the share sheet can be
 * kept in Files, sent, or saved to a drive).
 */
export async function shareFile(blob: Blob, fileName: string, text: string, type: string): Promise<ShareOutcome> {
  if (isNativeClient()) {
    try {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const written = await Filesystem.writeFile({
        path: fileName,
        data: await toBase64(blob),
        directory: Directory.Cache,
      });
      await Share.share({ files: [written.uri], text });
      return "shared";
    } catch (e) {
      if (wasDismissed(e)) return "dismissed";
      // No plugin behind the bridge, or it refused: try what a browser can do.
    }
  }

  try {
    const file = new File([blob], fileName, { type });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (e) {
    if (wasDismissed(e)) return "dismissed";
  }

  return download(blob, fileName) ? "saved" : "failed";
}

/**
 * Keep a picture on this device (1.8, Save in the verse picture's sheet). In
 * a browser, a download. The apps carry no plugin that writes into the
 * phone's photos, so there Save opens the phone's own share sheet, where its
 * "Save image" is (the iOS app already asks leave to add to the photos for
 * exactly that, in Info.plist).
 */
export async function saveImage(blob: Blob, fileName: string, text: string): Promise<ShareOutcome> {
  if (isNativeClient()) return shareImage(blob, fileName, text);
  return download(blob, fileName) ? "saved" : "failed";
}

/**
 * Words, to the share sheet (1.9: a florilegium handed on as text, s5-05; a
 * verse from its strip, with its address). In the apps the Share plugin; in
 * a browser that can share, the Web Share API. Says whether it reached one,
 * so a page can offer something else.
 */
export async function shareText(title: string, text: string, url?: string): Promise<ShareOutcome> {
  if (isNativeClient()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, ...(url ? { url } : {}), dialogTitle: title });
      return "shared";
    } catch (e) {
      if (wasDismissed(e)) return "dismissed";
    }
  }
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share({ title, text, ...(url ? { url } : {}) });
      return "shared";
    }
  } catch (e) {
    if (wasDismissed(e)) return "dismissed";
  }
  return "failed";
}
