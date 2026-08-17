"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Flips the admin between its two palettes.
 *
 * The source of truth is the data-adm-theme attribute on <html>, which
 * app/admin/layout.tsx already set before first paint. Reading the attribute
 * rather than localStorage means the two can never disagree.
 *
 * That attribute is an external store, so this uses useSyncExternalStore
 * rather than an effect that calls setState. The effect version hydrates
 * mismatched (the server cannot know the theme) and trips
 * react-hooks/set-state-in-effect; this hook exists for exactly this shape,
 * and its getServerSnapshot leg is what makes hydration quiet.
 *
 * Two states, not three. A single operator uses this panel, and an explicit
 * "match my system" option only earns its place once someone has to share it.
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "purify.admin.theme";

// Module-level fanout. The attribute can change from two directions: this
// button, and a storage event from a second admin tab. Both land here.
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    document.documentElement.setAttribute(
      "data-adm-theme",
      e.newValue === "light" ? "light" : "dark",
    );
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-adm-theme") === "light"
    ? "light"
    : "dark";
}

// The server never knows. Dark matches the pre-paint fallback, so a
// JS-blocked or pre-hydration render shows the theme the CSS actually paints.
function getServerSnapshot(): Theme {
  return "dark";
}

export function AdminThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-adm-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked. The attribute still flipped, so the choice holds for
      // this page view and simply does not survive a reload.
    }
    emit();
  }, []);

  const goingTo = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to the ${goingTo} theme`}
      aria-label={`Switch to the ${goingTo} theme`}
      className="adm-control flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] font-sans text-[11.5px]"
      style={
        {
          color: "var(--adm-ink-2)",
          "--_bg": "transparent",
          "--_bg-hover": "var(--adm-hover)",
        } as React.CSSProperties
      }
    >
      {theme === "light" ? (
        // Moon: the destination is dark.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M17 12.3A7.5 7.5 0 0 1 7.7 3a7.5 7.5 0 1 0 9.3 9.3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // Sun: the destination is light.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 2.2v1.6M10 16.2v1.6M17.8 10h-1.6M3.8 10H2.2M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1M15.5 15.5l-1.1-1.1M5.6 5.6 4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span>Theme</span>
    </button>
  );
}
