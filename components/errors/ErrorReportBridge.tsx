"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/errors/report";

/**
 * The errors list's ears on every screen (admin item A10, lib/errors/report.ts):
 * a script that fails, or a promise that fails with nobody waiting on it, is
 * reported once, the same way the error boundaries and the API calls report
 * theirs. Mounted once, in the root frame.
 *
 * Left out, because they say nothing a reader met: the browser's
 * "ResizeObserver loop" notice, a cross-origin script's bare "Script error.",
 * and a request the page itself cancelled (AbortError) on its way elsewhere.
 */
export function noise(message: string | undefined, name?: string): boolean {
  if (name === "AbortError") return true;
  if (!message) return false;
  return /^ResizeObserver loop/.test(message) || message === "Script error." || message === "Script error";
}

export function ErrorReportBridge() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      const error = e.error instanceof Error ? e.error : null;
      if (noise(error?.message ?? e.message, error?.name)) return;
      reportError({ source: "screen", message: error ?? e.message });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason;
      const error = reason instanceof Error ? reason : null;
      const message = error ? error.message : typeof reason === "string" ? reason : undefined;
      if (noise(message, error?.name)) return;
      reportError({ source: "screen", message: error ?? message });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
