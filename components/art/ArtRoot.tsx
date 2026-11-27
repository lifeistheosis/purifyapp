"use client";

// Silver Night's mark on the page (2.0, lib/art/art.ts): data-art on <html>
// while it is on, for the rule in app/globals.css that turns every picture
// still waiting for its own (the section heads, the old Discover pictures,
// Theology's subjects) black and white, so the whole app keeps one tone until
// each is made (his word, 2026-11-27: "make the rest black and white so it
// matches the aesthetic and we will make custom images for them"). Once
// ART_LIVE is on the server writes the mark itself (app/layout.tsx); this keeps
// it current for Testers mode.

import { useLayoutEffect } from "react";
import { useArt } from "@/lib/art/useArt";

export function ArtRoot() {
  const on = useArt();
  useLayoutEffect(() => {
    const html = document.documentElement;
    if (on) html.dataset.art = "";
    else delete html.dataset.art;
  }, [on]);
  return null;
}
