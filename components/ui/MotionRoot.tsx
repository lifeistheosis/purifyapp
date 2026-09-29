"use client";

// Keeps `data-motion` on <html> current after the pre-paint script set it
// (lib/ui/motionPrepaint.ts), which is what app/globals.css keys every
// reduced-motion escape to. It moves when the OS setting changes, when the
// Windows or browser reader flips Animations in Settings, when a page crosses
// into or out of the admin panel, and, in the phone apps, when the device
// speed check (lib/ui/deviceSpeed.ts) returns its verdict.
//
// Written from an effect rather than from a hook's render value on purpose:
// a hook reads "motion on" during hydration by design, and writing that to
// the attribute would start every entrance on a device that asked for calm
// before the real answer landed a frame later.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { checkDeviceSpeed } from "@/lib/ui/deviceSpeed";
import { motionPlatform, prefersReducedMotion, subscribeReducedMotion } from "@/lib/ui/motion";
import { MOTION_EVENT } from "@/lib/ui/motionPreference";
import { MotionNotice } from "./MotionNotice";

function apply() {
  document.documentElement.setAttribute("data-motion", prefersReducedMotion() ? "reduce" : "full");
}

export function MotionRoot() {
  const pathname = usePathname();

  useEffect(() => {
    apply();
    return subscribeReducedMotion(apply);
  }, []);

  // The admin panel defaults to motion and the site does not.
  useEffect(() => {
    apply();
  }, [pathname]);

  // Phones only: measure once the app has settled, then re-resolve.
  useEffect(() => {
    if (motionPlatform() !== "native") return;
    return checkDeviceSpeed(() => window.dispatchEvent(new CustomEvent(MOTION_EVENT)));
  }, []);

  return <MotionNotice />;
}
