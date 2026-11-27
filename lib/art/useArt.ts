"use client";

import { useTesting } from "@/lib/onboarding/useTesting";
import { ART_LIVE } from "./art";

/** Silver Night on this device: lit for readers, or walked in Testers mode. False on the server's render. */
export function useArt(): boolean {
  const testing = useTesting();
  return ART_LIVE || testing;
}
