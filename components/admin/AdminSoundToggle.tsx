"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  ADMIN_SOUND_KEY,
  adminSoundEnabled,
  chaChing,
  primeRegister,
  reelDemo,
  setAdminSoundEnabled,
} from "@/lib/admin/sound";

/**
 * Turns the panel's sound on and off: the register when money moves, a tick
 * when any other number does.
 *
 * Same shape as AdminThemeToggle next to it, and for the same reason. The
 * setting lives in localStorage, which is an external store, so this uses
 * useSyncExternalStore rather than an effect that calls setState. A second
 * admin tab flipping it lands here through the storage event, so two open
 * tabs cannot disagree about whether the room is about to make a noise.
 *
 * OFF is the default and the honest one. This panel gets opened on a phone in
 * public and on a laptop in a room with other people in it, so sound is
 * something the operator asks for, never something they discover.
 *
 * Turning it ON plays the register once, immediately, then the reel ratchet.
 * Two reasons: it is the only way to know the volume before a real number
 * moves, and the click is a user gesture, which is exactly what the autoplay
 * policy needs to let the AudioContext out of its suspended state. Without
 * that first gesture the next genuine ka-ching would be swallowed in silence.
 *
 * THE RATCHET IS AUDITIONED HERE FOR A REASON. It used to be the register
 * alone, so an operator could enable sound, hear the bell, reasonably conclude
 * the feature worked, and still never hear a single reel click: clicks only
 * fire on a spin, and the spin they would have heard is the one on page load
 * that the autoplay policy has already eaten. A ratchet mixed 23 dB too quiet
 * went unnoticed that way. If a sound cannot be heard on demand, nobody finds
 * out it is broken.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== ADMIN_SOUND_KEY) return;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  return adminSoundEnabled();
}

// The server cannot read localStorage, and the default is off, so this matches
// what a pre-hydration render should show.
function getServerSnapshot(): boolean {
  return false;
}

export function AdminSoundToggle() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !adminSoundEnabled();
    setAdminSoundEnabled(next);
    emit();
    // Inside the click, so the gesture unlocks the AudioContext.
    if (!next) return;
    // Fetched here, on the gesture that switches sound on, so the first real
    // sale plays the recording rather than the fallback bell while it loads.
    primeRegister();
    chaChing();
    // After the register's two strikes rather than under them, so the ratchet
    // is actually auditioned instead of masked. The context is already
    // unlocked by the chaChing above, so leaving the gesture is safe here.
    window.setTimeout(reelDemo, 380);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={on ? "Turn panel sound off" : "Turn panel sound on"}
      aria-label={on ? "Turn panel sound off" : "Turn panel sound on"}
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
        // Speaker with waves.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 7.6h2.6L10 4.6v10.8L6.6 12.4H4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M13.1 7.3a3.8 3.8 0 0 1 0 5.4M15.4 5a7 7 0 0 1 0 10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Speaker, struck through.
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 7.6h2.6L10 4.6v10.8L6.6 12.4H4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M13.4 8.2l3.6 3.6M17 8.2l-3.6 3.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span>Sound</span>
    </button>
  );
}
