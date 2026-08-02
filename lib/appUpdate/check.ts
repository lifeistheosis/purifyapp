"use client";

// Is the installed app behind the store?
//
// Answered by comparing the versionCode the shell reports against the one the
// site declares (lib/appUpdate/release.ts, served by /api/app/release).
//
// versionCode, never versionName. The code is a monotonically increasing
// integer that CI derives from the workflow run number, so it compares with
// `<`. versionName is a marketing string, and "2.9" vs "2.10" sorts the wrong
// way under every comparison anyone reaches for first.
//
// Everything here fails silent. A reader with no network, a stale cache, a
// shell that will not report its own build, or a malformed answer gets no
// prompt, which is the correct outcome in all four cases: this feature is a
// courtesy, and there is no version of it worth putting between someone and
// their prayers.

import { apiFetch } from "@/lib/api/client";
import { isNativeClient } from "@/lib/platform/native";
import type { ReleaseInfo } from "./release";

export type UpdateStatus = {
  /** The version the reader is running, for the copy. */
  installed: string;
  latest: ReleaseInfo;
};

/** The build the shell is running, or null if it will not say. */
async function installedVersionCode(): Promise<{
  code: number;
  name: string;
} | null> {
  try {
    // Dynamic, like lib/platform/useAndroidBack.ts, so the plugin never
    // enters the web bundle.
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    const code = Number.parseInt(String(info.build), 10);
    if (!Number.isFinite(code)) return null;
    return { code, name: info.version };
  } catch {
    return null;
  }
}

/**
 * Null when there is nothing to say: on the web, when the shell will not
 * report itself, when the site declares no release yet (versionCode 0), or
 * when the installed build is already current.
 */
export async function checkForUpdate(): Promise<UpdateStatus | null> {
  if (!isNativeClient()) return null;

  const installed = await installedVersionCode();
  if (!installed) return null;

  let latest: ReleaseInfo;
  try {
    const res = await apiFetch("/api/app/release");
    if (!res.ok) return null;
    latest = (await res.json()) as ReleaseInfo;
  } catch {
    return null;
  }

  const declared = Number(latest?.androidVersionCode);
  // 0 is the deliberate "no release declared" state, and anything
  // non-numeric is a malformed answer. Neither prompts.
  if (!Number.isFinite(declared) || declared <= 0) return null;
  if (declared <= installed.code) return null;

  return { installed: installed.name, latest };
}
