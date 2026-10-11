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

function download(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

export async function shareImage(blob: Blob, fileName: string, text: string): Promise<ShareOutcome> {
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
    const file = new File([blob], fileName, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (e) {
    if (wasDismissed(e)) return "dismissed";
  }

  return download(blob, fileName) ? "saved" : "failed";
}
