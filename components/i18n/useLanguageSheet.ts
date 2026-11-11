"use client";

import { useSyncExternalStore } from "react";

import { useIsNative } from "@/lib/platform/native";

/** The width at which the website's pickers become a computer's dropdowns (Tailwind's md). */
const WIDE = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the language opens the house's sheet from the foot of the screen
 * (1.9, build 93 note 6): on a phone, and in the apps at every width, as
 * every sheet there is (`native-md-block`, components/ui/Sheet.tsx). Only a
 * computer's window keeps the dropdown, LocaleMenu. On the server it says
 * yes, as a phone would, until the window is known.
 */
export function useLanguageSheet(): boolean {
  const narrow = useSyncExternalStore(subscribe, () => !window.matchMedia(WIDE).matches, () => true);
  const native = useIsNative();
  return native || narrow;
}
