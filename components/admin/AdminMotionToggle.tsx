"use client";

import { useCallback, useSyncExternalStore } from "react";

import { motionPreference, setMotionPreference } from "@/lib/ui/motion";
import { MOTION_EVENT, MOTION_KEY } from "@/lib/ui/motionPreference";

/**
 * Silences the panel's motion, or gives it back.
 *
 * The panel animates by default even when the OS asks for reduced motion, which
 * lib/ui/motionPreference.ts argues at length: on a dashboard the movement IS
 * the information, and the operator opened it deliberately. This is the way out
 * of that default for the times it is wrong, which are real. Screen sharing, a
 * long day, a migraine.
 *
 * Two states, writing "os" and "off". It deliberately cannot write "on", the
 * third value, because "on" would force motion onto the public site as well and
 * that is a reader's decision rather than an operator's. The value exists for a
 * reader-facing control that is not built yet.
 *
 * Same useSyncExternalStore shape as the Theme and Sound toggles beside it, and
 * for the same reason: the store is localStorage, which an effect calling
 * setState hydrates wrong and which react-hooks/set-state-in-effect flags.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onPref = () => emit();
  const onStorage = (e: StorageEvent) => {
    if (e.key === MOTION_KEY) emit();
  };
  window.addEventListener(MOTION_EVENT, onPref);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener(MOTION_EVENT, onPref);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  return motionPreference() !== "off";
}

// The server cannot read localStorage, and the panel's default is motion, so
// true is what a pre-hydration render should assume.
function getServerSnapshot(): boolean {
  return true;
}

export function AdminMotionToggle() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    setMotionPreference(motionPreference() === "off" ? "os" : "off");
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Stop the numbers moving" : "Let the numbers move again"}
      aria-label={on ? "Stop the numbers moving" : "Let the numbers move again"}
      aria-pressed={on}
      className="adm-control flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--adm-radius-sm)] font-sans text-[11.5px]"
      style={
        {
          color: on ? "var(--adm-accent)" : "var(--adm-ink-2)",
          "--_bg": "transparent",
          "--_bg-hover": "var(--adm-hover)",
        } as React.CSSProperties
      }
    >
      {on ? (
        // A wheel mid-turn: two arcs with motion lines.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 5.6V10l2.9 1.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        // The same wheel, struck through.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="6.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5.6 5.6l8.8 8.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span>Motion</span>
    </button>
  );
}
