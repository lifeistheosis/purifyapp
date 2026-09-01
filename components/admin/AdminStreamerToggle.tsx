"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  applyStreamerAttribute,
  STREAMER_EVENT,
  STREAMER_KEY,
  setStreamer,
  streamerOn,
} from "@/lib/admin/streamer";

/**
 * Hides the figures an audience should not have: money and addresses.
 *
 * Same useSyncExternalStore shape as the three toggles beside it, for the same
 * reason: the store is localStorage, which an effect calling setState hydrates
 * wrong and which react-hooks/set-state-in-effect flags.
 *
 * The effect here is not that pattern. It reconciles the DOM attribute with
 * stored state on mount, because the attribute lives on <html> and a reload
 * would otherwise come back with the setting remembered and the blur gone. It
 * writes no React state.
 *
 * ON is the loud state. Every other toggle in this rail lights its accent when
 * active; this one goes amber, because "some of this screen is hidden from you"
 * is a thing the operator should notice on sight rather than infer from an icon.
 */

function subscribe(onChange: () => void) {
  const h = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STREAMER_KEY) {
      applyStreamerAttribute(e.newValue === "1");
      onChange();
    }
  };
  window.addEventListener(STREAMER_EVENT, h);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(STREAMER_EVENT, h);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  return streamerOn();
}

// The server cannot read localStorage and the default is off.
function getServerSnapshot(): boolean {
  return false;
}

export function AdminStreamerToggle() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // A reload restores the setting but not the attribute, so without this the
  // panel would come back remembering streamer mode and showing every figure.
  useEffect(() => {
    applyStreamerAttribute(streamerOn());
  }, []);

  const toggle = useCallback(() => setStreamer(!streamerOn()), []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Show money and addresses again" : "Hide money and addresses"}
      aria-label={on ? "Show money and addresses again" : "Hide money and addresses"}
      aria-pressed={on}
      className="adm-control flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] font-sans text-[11.5px]"
      style={
        {
          color: on ? "var(--adm-warn)" : "var(--adm-ink-2)",
          "--_bg": "transparent",
          "--_bg-hover": "var(--adm-hover)",
        } as React.CSSProperties
      }
    >
      {on ? (
        // Eye, struck through: things are being hidden.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3.2 10S5.9 5.2 10 5.2s6.8 4.8 6.8 4.8-2.7 4.8-6.8 4.8S3.2 10 3.2 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M4 4l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        // Plain eye: everything is visible.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3.2 10S5.9 5.2 10 5.2s6.8 4.8 6.8 4.8-2.7 4.8-6.8 4.8S3.2 10 3.2 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
      <span>Stream</span>
    </button>
  );
}
