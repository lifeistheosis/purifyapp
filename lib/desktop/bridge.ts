// The website's side of the desktop app's native bridge.
//
// The desktop app (desktop/) is a native window around purifyapp.net. It
// exposes three commands to this site and nothing else, through the global
// Tauri puts on the window (withGlobalTauri). In a browser, the iOS or Android
// app, or a server render there is no such global, every call below is a
// no-op, and nothing desktop-only renders. So the site needs no build flag and
// no dependency on Tauri's JS package.
//
// Detection is by capability, not by user agent: the question is "can I call
// the desktop app?", and only the presence of the bridge answers that.

import { useSyncExternalStore } from "react";

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

type TauriGlobal = { core?: { invoke?: Invoke } };

function invoker(): Invoke | null {
  if (typeof window === "undefined") return null;
  const tauri = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
  return typeof tauri?.core?.invoke === "function" ? tauri.core.invoke : null;
}

export function isDesktopApp(): boolean {
  return invoker() !== null;
}

/** What presence.rs accepts. Unknown fields are refused there. */
export type PresenceRequest = {
  details: string;
  state?: string;
  path?: string;
  buttonLabel?: string;
};

export type PresenceStatus = { configured: boolean; connected: boolean };

export async function setPresence(request: PresenceRequest): Promise<void> {
  const invoke = invoker();
  if (!invoke) return;
  try {
    await invoke("presence_set", { request });
  } catch {
    // Refused (nothing acceptable in it) or Discord absent: presence is a
    // courtesy, never an error the reader should see.
  }
}

export async function clearPresence(): Promise<void> {
  const invoke = invoker();
  if (!invoke) return;
  try {
    await invoke("presence_clear");
  } catch {
    /* as above */
  }
}

export async function presenceStatus(): Promise<PresenceStatus | null> {
  const invoke = invoker();
  if (!invoke) return null;
  try {
    const s = (await invoke("presence_status")) as Partial<PresenceStatus> | null;
    return { configured: s?.configured === true, connected: s?.connected === true };
  } catch {
    return null;
  }
}

const noSubscribe = () => () => {};
const onServer = () => false;

/**
 * isDesktopApp for render. The bridge is injected before the page runs and
 * never comes or goes, so there is nothing to subscribe to; the server
 * snapshot is simply "not the desktop app".
 */
export function useIsDesktopApp(): boolean {
  return useSyncExternalStore(noSubscribe, isDesktopApp, onServer);
}

/**
 * Open a Google or Apple sign-in in the reader's own browser. The desktop
 * app opens only a Supabase authorize URL that returns to it through
 * purify:// (desktop/src-tauri/src/auth.rs). False outside the desktop app,
 * or when the app refuses the URL.
 */
export async function openAuthInBrowser(url: string): Promise<boolean> {
  const invoke = invoker();
  if (!invoke) return false;
  try {
    await invoke("auth_open", { url });
    return true;
  } catch {
    return false;
  }
}
